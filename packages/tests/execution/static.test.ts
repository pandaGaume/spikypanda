import {
    Channel,
    IChannel,
    IRuntimeGraph,
    ISession,
    RuntimeGraph,
    RuntimeNode,
    Scheduler,
    Session,
} from "spikypanda-core";

class ProducerNode extends RuntimeNode {
    public constructor(public readonly value: number) {
        super();
    }
    public override isReady(_s: ISession): boolean {
        return this.enabled;
    }
    public override fire(session: ISession, _t: number): void {
        const out = this.onsc<IChannel>()[0];
        const idx = (session.graph.links as ReadonlyArray<IChannel>).indexOf(out);
        const state = session.linkStates[idx];
        state.payload = this.value;
        state.ready = true;
    }
}

class ConsumerNode extends RuntimeNode {
    public received: number[] = [];
    public override fire(session: ISession, _t: number): void {
        const inc = this.opsc<IChannel>()[0];
        const idx = (session.graph.links as ReadonlyArray<IChannel>).indexOf(inc);
        const state = session.linkStates[idx];
        this.received.push(state.payload as number);
        state.payload = undefined;
        state.ready = false;
    }
    public override reset(_s: ISession): void {
        this.received = [];
    }
}

class AddNode extends RuntimeNode {
    public override fire(session: ISession, _t: number): void {
        const ins = this.opsc<IChannel>();
        const links = session.graph.links as ReadonlyArray<IChannel>;
        const a = session.linkStates[links.indexOf(ins[0])];
        const b = session.linkStates[links.indexOf(ins[1])];
        const sum = (a.payload as number) + (b.payload as number);
        a.ready = false;
        a.payload = undefined;
        b.ready = false;
        b.payload = undefined;
        const out = this.onsc<IChannel>()[0];
        const o = session.linkStates[links.indexOf(out)];
        o.payload = sum;
        o.ready = true;
    }
}

describe("Static scheduler (Kahn topo)", () => {
    test("fires nodes in topological order in one cycle", () => {
        const p = new ProducerNode(42);
        const c = new ConsumerNode();
        const link = new Channel(p, c);
        const g = new RuntimeGraph<RuntimeNode, Channel>([p, c], [link], "static");
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
        const g = new RuntimeGraph<RuntimeNode, Channel>([pa, pb, add, c], [lAtoAdd, lBtoAdd, lAddtoC], "static");
        const s = new Session(g);

        s.run(0);

        expect(c.received).toEqual([42]);
    });

    test("disabled node is skipped in static mode", () => {
        const p = new ProducerNode(1);
        const c = new ConsumerNode();
        const link = new Channel(p, c);
        const g = new RuntimeGraph<RuntimeNode, Channel>([p, c], [link], "static");
        const s = new Session(g);

        p.enabled = false;
        s.run(0);

        // Producer skipped, payload never written, consumer reads
        // undefined and pushes it through. The static scheduler does
        // not gate on isReady(); the consumer fires regardless.
        expect(c.received).toEqual([undefined as unknown as number]);
    });

    test("throws when the non-delayed subgraph has a cycle", () => {
        const a = new ProducerNode(1);
        const b = new ProducerNode(2);
        const lAB = new Channel(a, b);
        const lBA = new Channel(b, a);
        const g = new RuntimeGraph<RuntimeNode, Channel>([a, b], [lAB, lBA], "static");
        const s = new Session(g);

        expect(() => s.run(0)).toThrow(/not statically schedulable/);
    });

    test("a cycle with a delayed channel is statically schedulable", () => {
        const a = new ProducerNode(1);
        const b = new ProducerNode(2);
        const lAB = new Channel(a, b);
        const lBA = new Channel<number>(b, a, 0, true, 0);
        const g = new RuntimeGraph<RuntimeNode, Channel>([a, b], [lAB, lBA], "static");
        const s = new Session(g);

        expect(() => s.run(0)).not.toThrow();
    });
});

describe("Scheduler.CheckStaticEligible", () => {
    test("reports eligible for an acyclic DAG", () => {
        const p = new ProducerNode(1);
        const c = new ConsumerNode();
        const link = new Channel(p, c);
        const g: IRuntimeGraph = new RuntimeGraph<RuntimeNode, Channel>([p, c], [link], "static");

        const r = Scheduler.CheckStaticEligible(g);

        expect(r.eligible).toBe(true);
        expect(r.reasons).toEqual([]);
    });

    test("reports ineligible for a cycle without delayed", () => {
        const a = new ProducerNode(1);
        const b = new ProducerNode(2);
        const lAB = new Channel(a, b);
        const lBA = new Channel(b, a);
        const g: IRuntimeGraph = new RuntimeGraph<RuntimeNode, Channel>([a, b], [lAB, lBA], "static");

        const r = Scheduler.CheckStaticEligible(g);

        expect(r.eligible).toBe(false);
        expect(r.reasons.length).toBe(1);
        expect(r.reasons[0]).toMatch(/cycle/);
    });

    test("reports eligible when a cycle is broken by a delayed channel", () => {
        const a = new ProducerNode(1);
        const b = new ProducerNode(2);
        const lAB = new Channel(a, b);
        const lBA = new Channel<number>(b, a, 0, true, 0);
        const g: IRuntimeGraph = new RuntimeGraph<RuntimeNode, Channel>([a, b], [lAB, lBA], "static");

        const r = Scheduler.CheckStaticEligible(g);

        expect(r.eligible).toBe(true);
        expect(r.reasons).toEqual([]);
    });

    test("a disabled channel does not contribute to cycle detection", () => {
        const a = new ProducerNode(1);
        const b = new ProducerNode(2);
        const lAB = new Channel(a, b);
        const lBA = new Channel(b, a);
        lBA.enabled = false;
        const g: IRuntimeGraph = new RuntimeGraph<RuntimeNode, Channel>([a, b], [lAB, lBA], "static");

        const r = Scheduler.CheckStaticEligible(g);

        expect(r.eligible).toBe(true);
    });
});
