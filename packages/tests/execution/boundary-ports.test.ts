/**
 * Boundary-port channels under the EDITOR wiring convention.
 *
 * The node editor (graph-session-builder) creates every channel with
 * `withChannel(from, to, fromSlot, toSlot)`: `slot` names the OUTPUT
 * port on the source node, `toSlot` names the INPUT port on the
 * destination. For a channel INTO an embedded sub-graph the public
 * input-port name therefore lives in `toSlot`, not `slot`; the
 * embedding boundary must match the DESTINATION slot against its
 * dangling input-port channels. nested.test.ts covers the legacy
 * single-name convention (toSlot omitted); this file covers:
 *
 *   - dual-name channels routed into / out of a sub-graph built with
 *     RuntimeGraphBuilder.withInputPort / withOutputPort,
 *   - named port descriptors derived from the boundary channels
 *     (the editor renders these as wirable ports),
 *   - positional descriptors kept as the fallback when a graph
 *     declares no boundary channels,
 *   - tokens addressed to a slot matching no internal port are
 *     consumed and dropped (no dispatch livelock, the unloaded-model
 *     case),
 *   - multi-tick streaming across the boundary.
 */
import { Channel, IChannel, IRuntimeNode, RuntimeGraph, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import { AddNode, ConsumerNode, ProducerNode } from "./poc-nodes";

/**
 * Build an Add sub-graph through the builder API: "a" / "b" input
 * ports and a "sum" output port declared as dangling channels.
 */
function buildAddSubgraph(): RuntimeGraph<RuntimeNode, Channel> {
    const add = new AddNode();
    return new RuntimeGraphBuilder<RuntimeNode, Channel>().withNodes(add).withInputPort(add, "a").withInputPort(add, "b").withOutputPort(add, "sum").withMode("dynamic").build();
}

function buildParent(sub: IRuntimeNode, wiring: { toA: string | number; toB: string | number; fromSum: string | number }): { session: Session; consumer: ConsumerNode } {
    const pa = new ProducerNode(10);
    const pb = new ProducerNode(32);
    const consumer = new ConsumerNode();
    const parent = new RuntimeGraphBuilder<IRuntimeNode, IChannel>()
        .withNodes(pa, pb, sub, consumer)
        .withChannel(pa, sub, "value", wiring.toA)
        .withChannel(pb, sub, "value", wiring.toB)
        .withChannel(sub, consumer, wiring.fromSum, "in")
        .withMode("dynamic")
        .build();
    return { session: new Session(parent), consumer };
}

describe("Boundary ports under the editor wiring convention", () => {
    test("toSlot is matched against the sub-graph input ports (slot names the SOURCE port)", () => {
        const sub = buildAddSubgraph();
        const { session, consumer } = buildParent(sub, { toA: "a", toB: "b", fromSum: "sum" });

        session.run(0);

        expect(consumer.received).toEqual([42]);
    });

    test("multi-tick streaming: one output token per tick of published inputs", () => {
        const sub = buildAddSubgraph();
        const { session, consumer } = buildParent(sub, { toA: "a", toB: "b", fromSum: "sum" });

        session.run(0);
        session.run(1);
        session.run(2);

        expect(consumer.received).toEqual([42, 42, 42]);
    });

    test("boundary channels expose NAMED port descriptors to the editor", () => {
        const sub = buildAddSubgraph();
        expect(sub.inputPorts.map((p) => p.slot)).toEqual(["a", "b"]);
        expect(sub.outputPorts.map((p) => p.slot)).toEqual(["sum"]);
    });

    test("a graph without boundary channels keeps positional descriptors", () => {
        const p = new ProducerNode(1);
        const c = new ConsumerNode();
        const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>().withNodes(p, c).withChannel(p, c, "value").withMode("dynamic").build();

        expect(graph.inputPorts.map((d) => d.slot)).toEqual([0]);
        expect(graph.outputPorts.map((d) => d.slot)).toEqual([0]);
    });

    test("output fan-out: ONE sub-graph output port feeds TWO parent consumers, both receive the token", () => {
        const sub = buildAddSubgraph();
        const pa = new ProducerNode(10);
        const pb = new ProducerNode(32);
        const c1 = new ConsumerNode();
        const c2 = new ConsumerNode();
        const parent = new RuntimeGraphBuilder<IRuntimeNode, IChannel>()
            .withNodes(pa, pb, sub, c1, c2)
            .withChannel(pa, sub, "value", "a")
            .withChannel(pb, sub, "value", "b")
            .withChannel(sub, c1, "sum", "in")
            .withChannel(sub, c2, "sum", "in")
            .withMode("dynamic")
            .build();
        const session = new Session(parent);

        session.run(0);

        expect(c1.received).toEqual([42]);
        expect(c2.received).toEqual([42]);

        // And it stays correct across ticks (the port store is cleared
        // exactly once per fire, not once per fan-out edge).
        session.run(1);
        expect(c1.received).toEqual([42, 42]);
        expect(c2.received).toEqual([42, 42]);
    });

    test("tokens addressed to an unmatched slot are consumed and dropped (no livelock)", () => {
        const sub = buildAddSubgraph();
        // Both producers target a slot the sub-graph does not declare.
        const { session, consumer } = buildParent(sub, { toA: "nope", toB: "nada", fromSum: "sum" });

        // A run with un-consumable tokens must terminate (the dynamic
        // scheduler would otherwise re-queue the sub-graph forever) and
        // produce nothing downstream.
        session.run(0);
        session.run(1);

        expect(consumer.received).toEqual([]);
    });
});
