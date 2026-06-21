/**
 * RS-385 gravity-signature EDITABLE graph (Phase 4, Part B deliverable).
 *
 * Produces `rs385-gravity.spikypanda` by AUGMENTING the real, editor-generated
 * `motor-r385.spikypanda` with the explicit fault chain: a rotor-sag CAUSE node
 * linked to the motor by an `applyTo` structural connection. No JSON is
 * hand-rolled — the new node's ports come from `registry.meta()` and its data
 * from the real `instance.serialize()`; only the v3 envelope (already real) is
 * extended. The result is a graph a user opens + edits + runs in node-editor-v2.
 *
 * Then it VERIFIES the deliverable headlessly: the loader (graphs.loader, which
 * turns a `fault`-typed connection into a core ApplyTo link) reconstructs the
 * link, and with the Earth scene bound the sag contributes an air-gap
 * eccentricity the motor turns into a non-zero UMP radial force. This is the
 * load -> run round-trip of the editable graph.
 */
import * as fs from "fs";
import * as path from "path";
import { ApplyTo } from "spikypanda-core";
import type { NodeRegistry } from "spikypanda-core";
import { DcMotorDynamicNode } from "spikypanda-plugin-physics";
import { SceneItem } from "../../dev/plugins/physics/src/scene/index";
import { buildHeadlessRegistry, findInstance, GRAPHS_DIR, loadGraphHeadless, runTicks } from "./graphs.loader";

const SRC = "motor-r385.spikypanda";
const OUT = "rs385-gravity.spikypanda";
const MOTOR_TYPE = "Physics.Electric.Motor.DC:dynamic";
const SAG_TYPE = "Physics.Mechanical.Fault:rotor-sag";

interface LayoutPort {
    name: string;
    type: string;
    direction: "input" | "output";
}
interface SavedDoc {
    version: number;
    layout: { nodes: Array<{ id: string; typeId?: string; x: number; y: number; inputs: LayoutPort[]; outputs: LayoutPort[] }>; connections: unknown[] };
    model: { nodes: Array<{ id: string; typeId?: string; label?: string; data?: Record<string, unknown> }>; connections: unknown[] };
}

/** Augment the real RS-385 graph with the rotor-sag applyTo cause. Ports from
 *  registry meta, data from the real serialize(); the rest is the real file. */
function generateGravityGraph(registry: NodeRegistry): string {
    const doc = JSON.parse(fs.readFileSync(path.join(GRAPHS_DIR, SRC), "utf8")) as SavedDoc;
    const sagMeta = registry.meta(SAG_TYPE);
    if (!sagMeta) throw new Error(`registry missing ${SAG_TYPE}`);
    const sagInstance = registry.create(SAG_TYPE) as { serialize?: () => Record<string, unknown> } | undefined;
    const sagData = typeof sagInstance?.serialize === "function" ? sagInstance.serialize() : { enabled: true };

    const motorLayout = doc.layout.nodes.find((n) => n.typeId === MOTOR_TYPE);
    const motorModel = doc.model.nodes.find((n) => n.typeId === MOTOR_TYPE);
    if (!motorLayout || !motorModel) throw new Error("RS-385 motor not found in base graph");
    const motorId = motorLayout.id;
    const faultIdx = motorLayout.inputs.findIndex((p) => p.name === "fault_0");
    if (faultIdx < 0) throw new Error("motor has no fault_0 input");

    const sagId = "node_sag";
    doc.layout.nodes.push({
        id: sagId,
        typeId: SAG_TYPE,
        x: motorLayout.x - 260,
        y: motorLayout.y + 320,
        inputs: (sagMeta.inputPorts ?? []).map((p) => ({ name: String(p.slot), type: p.type ?? "any", direction: "input" })),
        outputs: (sagMeta.outputPorts ?? []).map((p) => ({ name: String(p.slot), type: p.type ?? "any", direction: "output" })),
    });
    doc.model.nodes.push({ id: sagId, label: sagMeta.label ?? "Rotor Sag", typeId: SAG_TYPE, data: sagData });

    const connId = `${sagId}:applyTo->${motorId}:fault_0`;
    doc.layout.connections.push({ id: connId, fromNodeId: sagId, fromPortIndex: 0, toNodeId: motorId, toPortIndex: faultIdx });
    doc.model.connections.push({ id: connId, from: { node: sagId, port: "applyTo" }, to: { node: motorId, port: "fault_0" } });

    // Enable the UMP radial force so the sag's air-gap eccentricity is observable
    // on the housing/vibration channel (default is 0 = UMP off).
    motorModel.data = { ...(motorModel.data ?? {}), _umpRadialStiffness: 4000 };
    return JSON.stringify(doc, null, 2);
}

/** Minimal SceneSourceResolver: every dynamic source resolves to null so the
 *  SceneItem serves its static gravity editable (Earth = (0,0,-9.81)). */
const RESOLVER = {
    resolveNumberSource: () => null,
    resolveCartesian3Source: () => null,
    resolveQuaternionSource: () => null,
    resolveAtmosphere: () => null,
    aggregateEffectiveHz: () => 1000,
};

describe("RS-385 gravity-signature editable graph (.spikypanda round-trip)", () => {
    const registry = buildHeadlessRegistry();

    it("generates rs385-gravity.spikypanda from the real RS-385 graph + the rotor-sag applyTo cause", () => {
        const json = generateGravityGraph(registry);
        const doc = JSON.parse(json) as SavedDoc;
        // The applyTo connection is present in BOTH the model (names) and layout.
        const applyConn = doc.model.connections.find((c) => (c as { to?: { port?: string } }).to?.port === "fault_0");
        expect(applyConn).toBeDefined();
        expect((applyConn as { from: { port: string } }).from.port).toBe("applyTo");
        fs.writeFileSync(path.join(GRAPHS_DIR, OUT), json);
        expect(fs.existsSync(path.join(GRAPHS_DIR, OUT))).toBe(true);
    });

    it("loads + reconstructs the ApplyTo link, and the sag applies under gravity", () => {
        // Ensure the file exists (test isolation: regenerate if run alone).
        if (!fs.existsSync(path.join(GRAPHS_DIR, OUT))) fs.writeFileSync(path.join(GRAPHS_DIR, OUT), generateGravityGraph(registry));

        const loaded = loadGraphHeadless(OUT, registry);
        expect(loaded.missingTypeIds).toEqual([]); // the rotor-sag typeId resolved

        const motor = findInstance(loaded, DcMotorDynamicNode);
        // The `fault`-typed connection became a core ApplyTo link on the motor.
        const applyLinks = (motor as unknown as { opsc<L>(f?: (l: unknown) => boolean): L[] }).opsc((l) => l instanceof ApplyTo);
        expect(applyLinks.length).toBe(1);

        // Bind the Earth scene (what the editor's session-builder does) so the
        // sag sees gravity, then run a few ticks.
        const scene = findInstance(loaded, SceneItem);
        (loaded.session as unknown as { sceneStateView: unknown }).sceneStateView = (scene as unknown as { buildStateView: (r: unknown) => unknown }).buildStateView(RESOLVER);
        runTicks(loaded.session, 50, 1e-4);

        // The sag contributed an air-gap eccentricity; the motor turned it into a
        // non-zero UMP radial force (the vibration channel) -> the applyTo chain
        // survived serialize -> load -> run.
        expect(Math.hypot(motor.umpForceY, motor.umpForceZ)).toBeGreaterThan(0);
    });
});
