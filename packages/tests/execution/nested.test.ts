import { Channel, RuntimeGraph, RuntimeNode, SchedulingMode, Session } from "spikypanda-core";
import { AddNode, ConsumerNode, ProducerNode } from "./poc-nodes";

/**
 * Build an Add sub-graph: the "a" / "b" input ports and "sum" output
 * port are simply dangling channels (oini = undefined for inputs,
 * ofin = undefined for outputs). The embedding mechanism matches them
 * to parent channels by slot name automatically.
 */
function buildAddSubgraph(mode: SchedulingMode): RuntimeGraph<RuntimeNode, Channel> {
    const add = new AddNode();
    const inA = new Channel<number>(undefined, add, "a");
    const inB = new Channel<number>(undefined, add, "b");
    const out = new Channel<number>(add, undefined, "sum");
    return new RuntimeGraph<RuntimeNode, Channel>([add], [inA, inB, out], mode);
}

describe("Nested sub-graph (fractal composition)", () => {
    test("parent dynamic + sub-graph dynamic computes a+b", () => {
        const pa = new ProducerNode(10);
        const pb = new ProducerNode(32);
        const sub = buildAddSubgraph("dynamic");
        const c = new ConsumerNode();
        const lAtoSub = new Channel(pa, sub, "a");
        const lBtoSub = new Channel(pb, sub, "b");
        const lSubtoC = new Channel(sub, c, "sum");
        const parent = new RuntimeGraph<RuntimeNode, Channel>([pa, pb, sub, c], [lAtoSub, lBtoSub, lSubtoC], "dynamic");
        const s = new Session(parent);

        s.run(0);

        expect(c.received).toEqual([42]);
    });

    test("parent static + sub-graph static computes a+b", () => {
        const pa = new ProducerNode(7);
        const pb = new ProducerNode(8);
        const sub = buildAddSubgraph("static");
        const c = new ConsumerNode();
        const lAtoSub = new Channel(pa, sub, "a");
        const lBtoSub = new Channel(pb, sub, "b");
        const lSubtoC = new Channel(sub, c, "sum");
        const parent = new RuntimeGraph<RuntimeNode, Channel>([pa, pb, sub, c], [lAtoSub, lBtoSub, lSubtoC], "static");
        const s = new Session(parent);

        s.run(0);

        expect(c.received).toEqual([15]);
    });

    test("two cycles: sub-graph internal state stays clean between runs", () => {
        const pa = new ProducerNode(1);
        const pb = new ProducerNode(2);
        const sub = buildAddSubgraph("dynamic");
        const c = new ConsumerNode();
        const lAtoSub = new Channel(pa, sub, "a");
        const lBtoSub = new Channel(pb, sub, "b");
        const lSubtoC = new Channel(sub, c, "sum");
        const parent = new RuntimeGraph<RuntimeNode, Channel>([pa, pb, sub, c], [lAtoSub, lBtoSub, lSubtoC], "dynamic");
        const s = new Session(parent);

        s.run(0);
        s.run(1);

        expect(c.received).toEqual([3, 3]);
    });

    test("mixed mode: dynamic parent, static sub-graph", () => {
        const pa = new ProducerNode(100);
        const pb = new ProducerNode(23);
        const sub = buildAddSubgraph("static");
        const c = new ConsumerNode();
        const lAtoSub = new Channel(pa, sub, "a");
        const lBtoSub = new Channel(pb, sub, "b");
        const lSubtoC = new Channel(sub, c, "sum");
        const parent = new RuntimeGraph<RuntimeNode, Channel>([pa, pb, sub, c], [lAtoSub, lBtoSub, lSubtoC], "dynamic");
        const s = new Session(parent);

        s.run(0);

        expect(c.received).toEqual([123]);
    });

    test("mixed mode: static parent, dynamic sub-graph", () => {
        const pa = new ProducerNode(50);
        const pb = new ProducerNode(50);
        const sub = buildAddSubgraph("dynamic");
        const c = new ConsumerNode();
        const lAtoSub = new Channel(pa, sub, "a");
        const lBtoSub = new Channel(pb, sub, "b");
        const lSubtoC = new Channel(sub, c, "sum");
        const parent = new RuntimeGraph<RuntimeNode, Channel>([pa, pb, sub, c], [lAtoSub, lBtoSub, lSubtoC], "static");
        const s = new Session(parent);

        s.run(0);

        expect(c.received).toEqual([100]);
    });

    test("disabled sub-graph: parent skips it, consumer never reads", () => {
        const pa = new ProducerNode(1);
        const pb = new ProducerNode(2);
        const sub = buildAddSubgraph("dynamic");
        const c = new ConsumerNode();
        const lAtoSub = new Channel(pa, sub, "a");
        const lBtoSub = new Channel(pb, sub, "b");
        const lSubtoC = new Channel(sub, c, "sum");
        const parent = new RuntimeGraph<RuntimeNode, Channel>([pa, pb, sub, c], [lAtoSub, lBtoSub, lSubtoC], "dynamic");
        const s = new Session(parent);

        sub.enabled = false;
        s.run(0);

        expect(c.received).toEqual([]);
    });

    test("parent reset cascades to sub-graph internal session", () => {
        const pa = new ProducerNode(1);
        const pb = new ProducerNode(2);
        const sub = buildAddSubgraph("dynamic");
        const c = new ConsumerNode();
        const lAtoSub = new Channel(pa, sub, "a");
        const lBtoSub = new Channel(pb, sub, "b");
        const lSubtoC = new Channel(sub, c, "sum");
        const parent = new RuntimeGraph<RuntimeNode, Channel>([pa, pb, sub, c], [lAtoSub, lBtoSub, lSubtoC], "dynamic");
        const s = new Session(parent);

        s.run(0);
        s.reset();
        s.run(1);

        // After reset, the consumer's history was cleared and the second
        // run produces the sum from scratch.
        expect(c.received).toEqual([3]);
    });

    test("one sub-graph instance, two parents, isolated internal state per parent session", () => {
        // The same RuntimeGraph instance is embedded as a node in two
        // distinct parent topologies, each driven by its own Session.
        // The internalSession now lives in each parent session's
        // IGraphNodeState, so the two sessions cannot collide.
        const sub = buildAddSubgraph("dynamic");

        const pa1 = new ProducerNode(10);
        const pb1 = new ProducerNode(20);
        const c1 = new ConsumerNode();
        const parent1 = new RuntimeGraph<RuntimeNode, Channel>(
            [pa1, pb1, sub, c1],
            [new Channel(pa1, sub, "a"), new Channel(pb1, sub, "b"), new Channel(sub, c1, "sum")],
            "dynamic"
        );
        const s1 = new Session(parent1);

        const pa2 = new ProducerNode(100);
        const pb2 = new ProducerNode(200);
        const c2 = new ConsumerNode();
        const parent2 = new RuntimeGraph<RuntimeNode, Channel>(
            [pa2, pb2, sub, c2],
            [new Channel(pa2, sub, "a"), new Channel(pb2, sub, "b"), new Channel(sub, c2, "sum")],
            "dynamic"
        );
        const s2 = new Session(parent2);

        s1.run(0);
        s2.run(0);
        s1.run(1);

        expect(c1.received).toEqual([30, 30]);
        expect(c2.received).toEqual([300]);
    });
});
