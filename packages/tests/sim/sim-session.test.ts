import {
    Channel,
    IChannel,
    ISession,
    isSimSession,
    PhasedNode,
    RuntimeGraph,
    RuntimeNode,
    SimPhase,
    SimSession,
} from "spikypanda-core";
import { ConsumerNode, ProducerNode } from "../execution/poc-nodes";

/**
 * Phased tracking node: declares which phases it participates in, and
 * records `${name}:${PhaseName}:${t}` on every fire. No data inputs/
 * outputs, just a logger for ordering assertions.
 */
class PhasedTracker extends PhasedNode {
    public constructor(public readonly name: string, public readonly log: string[], phases: ReadonlyArray<SimPhase>) {
        super(phases);
    }
    public override fire(session: ISession, t: number): void {
        if (!isSimSession(session)) {
            throw new Error("PhasedTracker requires a SimSession");
        }
        const phaseName = SimPhase[session.currentPhase];
        this.log.push(`${this.name}:${phaseName}:${t}`);
    }
}

describe("SimSession + PhasedNode", () => {
    test("run iterates phases in declaration order", () => {
        const log: string[] = [];
        const a = new PhasedTracker("A", log, [SimPhase.PreStep, SimPhase.Step, SimPhase.PostStep]);
        const g = new RuntimeGraph<RuntimeNode, Channel>([a], [], "dynamic");
        const s = new SimSession(g, [SimPhase.PreStep, SimPhase.Step, SimPhase.PostStep]);

        s.run(0);

        expect(log).toEqual(["A:PreStep:0", "A:Step:0", "A:PostStep:0"]);
    });

    test("phased node only fires in its declared phases", () => {
        const log: string[] = [];
        const onlyPreStep = new PhasedTracker("Pre", log, [SimPhase.PreStep]);
        const onlyStep = new PhasedTracker("Step", log, [SimPhase.Step]);
        const onlyPostStep = new PhasedTracker("Post", log, [SimPhase.PostStep]);
        const g = new RuntimeGraph<RuntimeNode, Channel>([onlyPreStep, onlyStep, onlyPostStep], [], "dynamic");
        const s = new SimSession(g, [SimPhase.PreStep, SimPhase.Step, SimPhase.PostStep]);

        s.run(0);

        expect(log).toEqual(["Pre:PreStep:0", "Step:Step:0", "Post:PostStep:0"]);
    });

    test("phased node with multiple phases fires in each of them, skips others", () => {
        const log: string[] = [];
        const node = new PhasedTracker("X", log, [SimPhase.PreStep, SimPhase.PostStep]);
        const g = new RuntimeGraph<RuntimeNode, Channel>([node], [], "dynamic");
        const s = new SimSession(g, [SimPhase.PreStep, SimPhase.Step, SimPhase.PostStep]);

        s.run(0);

        expect(log).toEqual(["X:PreStep:0", "X:PostStep:0"]);
    });

    test("non-phased node fires in every phase its data is ready", () => {
        // ProducerNode + ConsumerNode are plain RuntimeNodes (no
        // ISupportsPhasing), so they fire every cycle the scheduler
        // dispatches.
        const p = new ProducerNode(1);
        const c = new ConsumerNode();
        const link = new Channel(p, c);
        const g = new RuntimeGraph<RuntimeNode, Channel>([p, c], [link], "dynamic");
        const s = new SimSession(g, [SimPhase.PreStep, SimPhase.Step, SimPhase.PostStep]);

        s.run(0);

        expect(c.received).toEqual([1, 1, 1]);
    });

    test("phased consumer with data ready but wrong phase: skips, data retained", () => {
        // Producer fires every phase, phased consumer only in PreStep.
        // First phase the consumer drains; subsequent phases the
        // producer overwrites the slot but the consumer doesn't fire.
        const p = new ProducerNode(42);
        class PhasedConsumer extends PhasedNode {
            public received: number[] = [];
            public constructor(phases: ReadonlyArray<SimPhase>) {
                super(phases);
            }
            public override fire(session: ISession, _t: number): void {
                const inc = this.opsc<IChannel>()[0];
                const idx = (session.graph.links as ReadonlyArray<IChannel>).indexOf(inc);
                this.received.push(session.consume(idx) as number);
            }
        }
        const c = new PhasedConsumer([SimPhase.PreStep]);
        const link = new Channel(p, c);
        const g = new RuntimeGraph<RuntimeNode, Channel>([p, c], [link], "dynamic");
        const s = new SimSession(g, [SimPhase.PreStep, SimPhase.Step, SimPhase.PostStep]);

        s.run(0);

        // Consumer fired exactly once: during PreStep.
        expect(c.received).toEqual([42]);
    });

    test("default phases = [Step]", () => {
        const log: string[] = [];
        const a = new PhasedTracker("A", log, [SimPhase.Step]);
        const g = new RuntimeGraph<RuntimeNode, Channel>([a], [], "dynamic");
        const s = new SimSession(g);

        s.run(0);

        expect(log).toEqual(["A:Step:0"]);
        expect(s.phases).toEqual([SimPhase.Step]);
    });

    test("runPhase executes a single named phase", () => {
        const log: string[] = [];
        const a = new PhasedTracker("A", log, [SimPhase.PreStep, SimPhase.Step, SimPhase.PostStep]);
        const g = new RuntimeGraph<RuntimeNode, Channel>([a], [], "dynamic");
        const s = new SimSession(g, [SimPhase.PreStep, SimPhase.Step, SimPhase.PostStep]);

        s.runPhase(SimPhase.PostStep, 5);

        expect(log).toEqual(["A:PostStep:5"]);
        expect(s.currentPhase).toBe(SimPhase.PostStep);
    });

    test("static mode + multi-phase: isReady is honored, phase gating works", () => {
        const log: string[] = [];
        const a = new PhasedTracker("A", log, [SimPhase.PreStep, SimPhase.Step]);
        const b = new PhasedTracker("B", log, [SimPhase.Step, SimPhase.PostStep]);
        const g = new RuntimeGraph<RuntimeNode, Channel>([a, b], [], "static");
        const s = new SimSession(g, [SimPhase.PreStep, SimPhase.Step, SimPhase.PostStep]);

        s.run(0);

        // The static scheduler visits every node in topo order but
        // respects isReady() exactly like the dynamic scheduler.
        // PreStep: only A is phase-eligible.
        // Step: both A and B.
        // PostStep: only B.
        expect(log).toEqual(["A:PreStep:0", "A:Step:0", "B:Step:0", "B:PostStep:0"]);
    });

    test("multiple ticks: phases reset to first on every run", () => {
        const log: string[] = [];
        const a = new PhasedTracker("A", log, [SimPhase.PreStep, SimPhase.PostStep]);
        const g = new RuntimeGraph<RuntimeNode, Channel>([a], [], "dynamic");
        const s = new SimSession(g, [SimPhase.PreStep, SimPhase.Step, SimPhase.PostStep]);

        s.run(0);
        s.run(1);

        expect(log).toEqual(["A:PreStep:0", "A:PostStep:0", "A:PreStep:1", "A:PostStep:1"]);
    });
});
