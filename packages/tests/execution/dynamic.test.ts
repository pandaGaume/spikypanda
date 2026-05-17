import { Channel, IChannel, RuntimeGraph, RuntimeNode, Session } from "spikypanda-core";
import { AddNode, ConsumerNode, ProducerNode } from "./poc-nodes";

describe("Dynamic scheduler POC", () => {
    test("producer feeds consumer in one cycle", () => {
        const p = new ProducerNode(42);
        const c = new ConsumerNode();
        const link = new Channel(p, c);
        const g = new RuntimeGraph<RuntimeNode, Channel>([p, c], [link], "dynamic");
        const s = new Session(g);

        s.run(0);

        expect(c.received).toEqual([42]);
    });

    test("three-node chain propagates in one cycle (a + b -> sum)", () => {
        const pa = new ProducerNode(10);
        const pb = new ProducerNode(32);
        const add = new AddNode();
        const c = new ConsumerNode();
        const lAtoAdd = new Channel(pa, add, "a");
        const lBtoAdd = new Channel(pb, add, "b");
        const lAddtoC = new Channel(add, c, "in");
        const g = new RuntimeGraph<RuntimeNode, Channel>([pa, pb, add, c], [lAtoAdd, lBtoAdd, lAddtoC], "dynamic");
        const s = new Session(g);

        s.run(0);

        expect(c.received).toEqual([42]);
    });

    test("two cycles produce two consumer reads", () => {
        const p = new ProducerNode(7);
        const c = new ConsumerNode();
        const link = new Channel(p, c);
        const g = new RuntimeGraph<RuntimeNode, Channel>([p, c], [link], "dynamic");
        const s = new Session(g);

        s.run(0);
        s.run(1);

        expect(c.received).toEqual([7, 7]);
    });

    test("delayed channel pre-seeds initial value on reset", () => {
        const p = new ProducerNode(99);
        const c = new ConsumerNode();
        // Delayed channel seeded with 5; consumer reads 5 on the first
        // cycle before producer has had any effect on this run.
        const link = new Channel<number>(p, c, 0, true, 5);
        const g = new RuntimeGraph<RuntimeNode, Channel>([p, c], [link], "dynamic");
        const s = new Session(g);

        // After construction the session reset has seeded the link with 5.
        // We do NOT run yet; just verify the initial seed.
        const linkIdx = (g.links as ReadonlyArray<IChannel>).indexOf(link);
        expect(s.linkStates[linkIdx].ready).toBe(true);
        expect(s.linkStates[linkIdx].payload).toBe(5);
    });

    test("disabled node is skipped, others still fire", () => {
        const p = new ProducerNode(1);
        const c = new ConsumerNode();
        const link = new Channel(p, c);
        const g = new RuntimeGraph<RuntimeNode, Channel>([p, c], [link], "dynamic");
        const s = new Session(g);

        p.enabled = false;
        s.run(0);

        // Producer did not fire, link stays not-ready, consumer never gates.
        expect(c.received).toEqual([]);
    });

    test("disabled channel does not gate the consumer", () => {
        const p = new ProducerNode(1);
        const c = new ConsumerNode();
        const link = new Channel(p, c);
        link.enabled = false;
        const g = new RuntimeGraph<RuntimeNode, Channel>([p, c], [link], "dynamic");
        const s = new Session(g);

        s.run(0);

        // Producer fires, writes to the (disabled) link. Consumer's
        // default isReady ignores disabled links, so the consumer is
        // ready (no other inputs) and fires. It reads whatever the
        // payload is, which the producer wrote (the disabled flag
        // controls gating, not data transfer).
        expect(c.received).toEqual([1]);
    });

    test("reset re-seeds delayed and clears non-delayed", () => {
        const p = new ProducerNode(99);
        const c = new ConsumerNode();
        const delayed = new Channel<number>(p, c, "delayed", true, 5);
        const plain = new Channel<number>(p, c, "plain");
        const g = new RuntimeGraph<RuntimeNode, Channel>([p, c], [delayed, plain], "dynamic");
        const s = new Session(g);

        s.run(0);
        // The consumer fired with the seeded delayed payload (5) plus
        // whatever the producer wrote on plain (99). The exact behaviour
        // depends on the consumer reading both inputs; here ConsumerNode
        // only reads one channel, so we focus on reset semantics below.

        s.reset();

        const links = g.links as ReadonlyArray<IChannel>;
        const dIdx = links.indexOf(delayed);
        const pIdx = links.indexOf(plain);
        expect(s.linkStates[dIdx].ready).toBe(true);
        expect(s.linkStates[dIdx].payload).toBe(5);
        expect(s.linkStates[pIdx].ready).toBe(false);
        expect(s.linkStates[pIdx].payload).toBeUndefined();
        expect(c.received).toEqual([]); // reset() also reset the consumer
    });
});
