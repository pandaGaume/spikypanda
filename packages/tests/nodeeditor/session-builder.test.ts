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
import { RuntimeNode } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
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
