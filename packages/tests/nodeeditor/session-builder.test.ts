/**
 * buildSessionFromViewer robustness: a connection endpoint whose node
 * is LAYOUT-ONLY (its data is a raw JSON blob because the typeId was
 * missing from the registry at load) must be skipped with a warning,
 * not wired. Wiring it crashed Play with the cryptic
 * "this._ofin.opsc is not a function" from the Channel constructor
 * (reported on motorwatch-r385.spikypanda when the editor page did not
 * load the onnx plugin, leaving spk.onnx:model unresolved).
 *
 * The viewer is duck-typed by the builder (nodes / connections only),
 * so a plain object stands in: no DOM required.
 */
import { buildDefaultStateView, RuntimeNode } from "spikypanda-core";
import type { IChannel, ISession, SceneStateView } from "spikypanda-core";
import { buildSessionFromViewer } from "../../dev/nodeeditor/src/graph-session-builder";
import type { GraphViewer } from "../../dev/nodeeditor/src/components/graph-viewer";

class ProducerNode extends RuntimeNode {
    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            const idx = links.indexOf(link);
            if (idx >= 0) session.publish(idx, 42);
        }
    }
}

class ConsumerNode extends RuntimeNode {
    public received: unknown[] = [];

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                this.received.push(session.consume(idx));
            }
        }
    }
}

interface IFakePort {
    name: string;
    type: string;
}

function fakeNode(id: string, label: string, typeId: string | undefined, data: unknown, inputs: IFakePort[], outputs: IFakePort[]) {
    return { id, label, typeId, item: { data }, inputs, outputs, controlInputs: [] as IFakePort[], controlOutputs: [] as IFakePort[] };
}

describe("buildSessionFromViewer: layout-only endpoints", () => {
    test("wires runtime pairs, skips layout-only endpoints with a warning instead of crashing", () => {
        const producer = new ProducerNode();
        const consumer = new ConsumerNode();

        const pOut = { name: "out", type: "float" };
        const cIn = { name: "in", type: "float" };
        const blobIn = { name: "current_window", type: "tensor" };
        const blobOut = { name: "embedding", type: "tensor" };

        const producerUi = fakeNode("n1", "Producer", "Test:producer", producer, [], [pOut]);
        const consumerUi = fakeNode("n2", "Consumer", "Test:consumer", consumer, [cIn], []);
        // The reported scenario: a model node whose typeId was not in
        // the registry at load, left with its saved raw data ({}).
        const layoutOnlyUi = fakeNode("n3", "Encoder", "spk.onnx:model", {}, [blobIn], [blobOut]);

        const viewer = {
            nodes: [producerUi, consumerUi, layoutOnlyUi],
            connections: [
                { linkKind: "data", from: pOut, to: cIn },
                { linkKind: "data", from: pOut, to: blobIn },
                { linkKind: "data", from: blobOut, to: cIn },
            ],
        } as unknown as GraphViewer;

        const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
        try {
            const { session } = buildSessionFromViewer(viewer);
            // Only the producer -> consumer wire survives.
            expect(session.graph.links).toHaveLength(1);
            session.run(0);
            session.run(1);
            expect(consumer.received).toEqual([42, 42]);
            expect(warn.mock.calls.some((args) => String(args[0]).includes("layout-only"))).toBe(true);
        } finally {
            warn.mockRestore();
        }
    });
});

describe("buildSessionFromViewer: root scene binding", () => {
    function viewWithGravity(id: string, g: { x: number; y: number; z: number }): SceneStateView {
        const base = buildDefaultStateView(id);
        return new Proxy(base, {
            get(target, prop) {
                return prop === "gravity" ? g : Reflect.get(target, prop);
            },
        });
    }

    test("materialises the root Scene's view onto session.sceneStateView", () => {
        const view = viewWithGravity("orbital", { x: 0, y: 0, z: 0 });
        // A SceneItem is duck-typed by `buildStateView`; it has no fire()
        // so it is excluded from the runtime node collection.
        const sceneData = { buildStateView: () => view };
        const sceneUi = fakeNode("scene", "Scene", "Physics.Scene:scene", sceneData, [], []);

        const viewer = { nodes: [sceneUi], connections: [] } as unknown as GraphViewer;
        const { session } = buildSessionFromViewer(viewer);

        expect(session.sceneStateView).toBe(view);
        expect(session.sceneStateView?.gravity).toEqual({ x: 0, y: 0, z: 0 });
    });

    test("leaves sceneStateView unset when no Scene is present (per-node Earth fallback)", () => {
        const producer = new ProducerNode();
        const producerUi = fakeNode("n1", "Producer", "Test:producer", producer, [], []);
        const viewer = { nodes: [producerUi], connections: [] } as unknown as GraphViewer;
        const { session } = buildSessionFromViewer(viewer);
        expect(session.sceneStateView).toBeFalsy();
    });

    test("per-node override: wiring a Scene to a node's `scene` port binds that scene", () => {
        const view = viewWithGravity("moon", { x: 0, y: 0, z: -1.62 });
        const sceneData = { buildStateView: () => view };
        const sceneUi = fakeNode("scene", "Scene", "Physics.Scene:scene", sceneData, [], [{ name: "scene_out", type: "scene" }]);

        // A real RuntimeNode (the builder calls .build() on non-nodes) that
        // carries the per-node-scene seam (sceneItemId + setBoundSceneView).
        class FakeMotor extends RuntimeNode {
            public sceneItemId = "";
            public bound: SceneStateView | null | undefined = undefined;
            public setBoundSceneView(v: SceneStateView | null): void {
                this.bound = v;
            }
            public override fire(): void {
                /* no-op */
            }
        }
        const motor = new FakeMotor();
        const motorUi = fakeNode("m", "Motor", "X:motor", motor, [{ name: "scene", type: "scene" }], []);

        const viewer = {
            nodes: [sceneUi, motorUi],
            connections: [{ linkKind: "config", from: sceneUi.outputs[0], to: motorUi.inputs[0] }],
        } as unknown as GraphViewer;

        buildSessionFromViewer(viewer);

        expect(motor.sceneItemId).toBe("scene");
        expect(motor.bound).toBe(view);
    });

    test("first Scene wins and the rest are warned about", () => {
        const a = { buildStateView: () => viewWithGravity("a", { x: 0, y: 0, z: -9.81 }) };
        const b = { buildStateView: () => viewWithGravity("b", { x: 0, y: 0, z: -1.62 }) };
        const aUi = fakeNode("a", "SceneA", "Physics.Scene:scene", a, [], []);
        const bUi = fakeNode("b", "SceneB", "Physics.Scene:scene", b, [], []);
        const viewer = { nodes: [aUi, bUi], connections: [] } as unknown as GraphViewer;

        const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
        try {
            const { session } = buildSessionFromViewer(viewer);
            expect(session.sceneStateView?.gravity).toEqual({ x: 0, y: 0, z: -9.81 });
            expect(warn.mock.calls.some((args) => String(args[0]).includes("root Scenes"))).toBe(true);
        } finally {
            warn.mockRestore();
        }
    });
});
