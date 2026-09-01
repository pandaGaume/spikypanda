/**
 * The graph controller against a stand-in studio.
 *
 * These cover the four places the adapter makes a promise the layers below do
 * not keep on their own:
 *
 * 1. `UIItemBase.setProperty` writes to a read-only property anyway, through
 *    its reflective fallback. The adapter has to refuse first.
 * 2. A batch has to be validated whole, or a rejected entry leaves a node half
 *    configured and a sweep cell silently means something else.
 * 3. A capture has to stay index-aligned even when a sample is missing, since
 *    a shortened series misaligns every later point against its timestamp.
 * 4. Every mutation has to emit a change, because that signal is the only
 *    reason the view can remain a view.
 *
 * The viewer and runner are duck-typed, as `session-builder.test.ts` already
 * does: the controller only reads `nodes`, `serialize` and the registries, so no
 * DOM is needed. Testing the controller rather than the adapter is deliberate:
 * the logic is what these assert, and it carries no transport.
 */
import { GraphController, type ControllerResult } from "spikypanda-mcp/graph.controller";
import { UIItemBase } from "spikypanda-nodeeditor";
import type { GraphRunner } from "spikypanda-nodeeditor";

/** A node whose properties are reflected from public fields, like every real one. */
class MotorStub {
    public gravity = 9.81;
    public yawDeg = 0;
    public current = 0;
    /** Advanced by the fake session so captures have something to record. */
    public tick = 0;
}

/** A node that declares its own properties, one of them read-only with a hint. */
class DeclaredStub {
    private _severity = 0;
    public getDisplayName(): string {
        return "Declared";
    }
    public getProperties() {
        return [
            { key: "severity", value: this._severity, editable: true, type: "number" as const },
            { key: "airGap", value: 5e-4, editable: false, type: "number" as const, hint: "fixed by the machine geometry" },
        ];
    }
    public setProperty(key: string, value: unknown): void {
        if (key === "severity") this._severity = Number(value);
    }
}

function makeNode(id: string, data: object) {
    return { id, label: id, typeId: `Test.${id}`, item: new UIItemBase(data), inputs: [], outputs: [] };
}

function makeRunner() {
    const motor = new MotorStub();
    const declared = new DeclaredStub();
    const nodes = [makeNode("motor", motor), makeNode("fault", declared)];
    const session = {
        tickIndex: 0,
        simRate: 0,
        run(_t: number) {
            motor.tick += 1;
            // A signal with a value that changes every tick, so a capture is
            // distinguishable from a constant.
            motor.current = motor.gravity * motor.tick;
        },
    };
    const viewer = {
        nodes,
        connections: [] as unknown[],
        getNodeRegistry: () => null,
        getLinkRegistry: () => null,
        serialize: () => ({ nodes: nodes.map((n) => ({ id: n.id })), connections: [] }),
    };
    const runner = { viewer, session, t: 0, state: "paused", stop() {}, pause() {} };
    return { runner: runner as unknown as GraphRunner, motor, declared };
}

/** Unwrap a successful result's body, failing loudly on an unexpected error. */
function payload(result: ControllerResult): Record<string, unknown> {
    if (!result.ok) throw new Error(`expected success, got: ${result.error}`);
    return result.data as Record<string, unknown>;
}

describe("node configuration", () => {
    it("reports reflected properties as such, so their metadata is not over-trusted", async () => {
        const { runner } = makeRunner();
        const controller = new GraphController(runner);
        const out = payload(await controller.executeToolAsync("", "node_describe", { nodeId: "motor" }));
        expect(out.propertySource).toBe("reflected");
        expect(out.inspectable).toBe(false);
        expect((out.properties as Array<{ key: string }>).map((p) => p.key)).toEqual(expect.arrayContaining(["gravity", "yawDeg"]));
    });

    it("refuses a read-only property and hands back the node's own hint", async () => {
        const { runner, declared } = makeRunner();
        const controller = new GraphController(runner);
        const result = await controller.executeToolAsync("", "node_set_property", { nodeId: "fault", key: "airGap", value: 1 });
        expect(result.ok).toBe(false);
        expect(result.ok === false && result.error).toContain("fixed by the machine geometry");
        // The refusal must be real: UIItemBase alone would have written it.
        expect(declared.getProperties().find((p) => p.key === "airGap")?.value).toBeCloseTo(5e-4);
    });

    it("applies a batch only when every entry is valid", async () => {
        const { runner, motor } = makeRunner();
        const controller = new GraphController(runner);
        const result = await controller.executeToolAsync("", "node_set_properties", {
            nodeId: "motor",
            properties: { gravity: 1.62, nonexistent: 3 },
        });
        expect(result.ok).toBe(false);
        // Nothing applied: a half-configured node is a different experiment.
        expect(motor.gravity).toBeCloseTo(9.81);
    });

    it("writes a valid batch as a unit", async () => {
        const { runner, motor } = makeRunner();
        const controller = new GraphController(runner);
        await controller.executeToolAsync("", "node_set_properties", { nodeId: "motor", properties: { gravity: 0, yawDeg: 90 } });
        expect(motor.gravity).toBe(0);
        expect(motor.yawDeg).toBe(90);
    });
});

describe("reflected values that are not transport material", () => {
    /**
     * Found against the live studio, not here: real nodes hold live objects in
     * public fields (link observers, parent references, scene views) and those
     * form cycles. `JSON.stringify` throws on the first one and takes the whole
     * tool call down. The stand-in nodes above are too tidy to reproduce it,
     * which is exactly why this case is pinned.
     */
    it("survives a property whose value is a cyclic object", async () => {
        const { runner } = makeRunner();
        const cyclic: Record<string, unknown> = { name: "observer" };
        cyclic.self = cyclic; // the cycle
        const node = makeNode("cyclic", { gain: 2, observers: cyclic });
        (runner.viewer.nodes as unknown as Array<unknown>).push(node);

        const controller = new GraphController(runner);
        const out = payload(await controller.executeToolAsync("", "node_describe", { nodeId: "cyclic" }));

        // The call must succeed, and the result must be serializable.
        expect(() => JSON.stringify(out)).not.toThrow();

        const properties = out.properties as Array<{ key: string; value: unknown; editable?: boolean }>;
        const scalar = properties.find((p) => p.key === "gain");
        const object = properties.find((p) => p.key === "observers");
        // The scalar is untouched; the object is tagged, kept visible, and
        // marked non-editable rather than dropped.
        expect(scalar?.value).toBe(2);
        expect(typeof object?.value).toBe("string");
        expect(object?.editable).toBe(false);
    });

    it("keeps arrays of primitives, which are genuinely useful", async () => {
        const { runner } = makeRunner();
        const node = makeNode("coeffs", { taps: [0.1, 0.2, 0.3] });
        (runner.viewer.nodes as unknown as Array<unknown>).push(node);

        const controller = new GraphController(runner);
        const out = payload(await controller.executeToolAsync("", "node_describe", { nodeId: "coeffs" }));
        const taps = (out.properties as Array<{ key: string; value: unknown }>).find((p) => p.key === "taps");
        expect(taps?.value).toEqual([0.1, 0.2, 0.3]);
    });
});

describe("capture", () => {
    it("records one aligned sample per tick", async () => {
        const { runner } = makeRunner();
        const controller = new GraphController(runner);
        await controller.executeToolAsync("", "capture_arm", { signals: [{ nodeId: "motor", property: "current" }] });
        await controller.executeToolAsync("", "sim_run", { steps: 5, dt: 0.1 });
        const out = payload(await controller.executeToolAsync("", "capture_read", {}));

        expect(out.samples).toBe(5);
        expect((out.t as number[]).length).toBe(5);
        const values = (out.signals as Array<{ values: number[] }>)[0].values;
        expect(values.length).toBe(5);
        // 9.81 * tick, so strictly increasing and never constant.
        expect(values[4]).toBeGreaterThan(values[0]);
    });

    it("re-arming resets rather than appending two spans of time", async () => {
        const { runner } = makeRunner();
        const controller = new GraphController(runner);
        await controller.executeToolAsync("", "capture_arm", { signals: [{ nodeId: "motor", property: "current" }] });
        await controller.executeToolAsync("", "sim_run", { steps: 3, dt: 0.1 });
        await controller.executeToolAsync("", "capture_arm", { signals: [{ nodeId: "motor", property: "current" }] });
        await controller.executeToolAsync("", "sim_run", { steps: 2, dt: 0.1 });
        expect(payload(await controller.executeToolAsync("", "capture_read", {})).samples).toBe(2);
    });

    it("refuses to arm on a property the node does not have", async () => {
        const { runner } = makeRunner();
        const controller = new GraphController(runner);
        const result = await controller.executeToolAsync("", "capture_arm", { signals: [{ nodeId: "motor", property: "nope" }] });
        expect(result.ok).toBe(false);
    });
});

describe("sweep", () => {
    it("returns one window per cell and never records the settle phase", async () => {
        const { runner } = makeRunner();
        const controller = new GraphController(runner);
        const out = payload(
            await controller.executeToolAsync("", "sweep_run", {
                cells: [
                    { label: "earth", nodes: [{ nodeId: "motor", properties: { gravity: 9.81 } }] },
                    { label: "orbital", nodes: [{ nodeId: "motor", properties: { gravity: 0 } }] },
                ],
                signals: [{ nodeId: "motor", property: "current" }],
                dt: 0.1,
                settleSteps: 4,
                captureSteps: 3,
            }),
        );

        const results = out.results as Array<{ label: string; t: number[]; signals: Array<{ values: number[] }> }>;
        expect(results.length).toBe(2);
        expect(results.map((r) => r.label)).toEqual(["earth", "orbital"]);
        // captureSteps only: the four settle ticks are run but not recorded.
        for (const cell of results) expect(cell.t.length).toBe(3);
        // Gravity 0 in the second cell drives the signal to zero, which is the
        // whole point of sweeping the property rather than restarting.
        expect(results[1].signals[0].values.every((v) => v === 0)).toBe(true);
    });

    it("rejects a grid with no capture window", async () => {
        const { runner } = makeRunner();
        const controller = new GraphController(runner);
        const result = await controller.executeToolAsync("", "sweep_run", {
            cells: [{ nodes: [] }],
            signals: [{ nodeId: "motor", property: "current" }],
            dt: 0.1,
            captureSteps: 0,
        });
        expect(result.ok).toBe(false);
    });
});

describe("change notification", () => {
    it("emits on every mutation, which is what lets the view stay a view", async () => {
        const { runner } = makeRunner();
        const controller = new GraphController(runner);
        const seen: string[] = [];
        controller.onChanged = (uri: string) => seen.push(uri);

        await controller.executeToolAsync("", "node_set_property", { nodeId: "motor", key: "gravity", value: 1.62 });
        await controller.executeToolAsync("", "sim_run", { steps: 1, dt: 0.1 });

        expect(seen).toContain("spk://graph/node/motor");
        expect(seen).toContain("spk://graph");
        expect(seen).toContain("spk://graph/state");
    });

    it("stays silent when a mutation is refused", async () => {
        const { runner } = makeRunner();
        const controller = new GraphController(runner);
        const seen: string[] = [];
        controller.onChanged = (uri: string) => seen.push(uri);

        await controller.executeToolAsync("", "node_set_property", { nodeId: "fault", key: "airGap", value: 1 });
        expect(seen).toEqual([]);
    });
});
