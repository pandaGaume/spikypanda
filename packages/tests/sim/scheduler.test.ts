import { SimGraph, SimLink, SimNode, SimPhase } from "spikypanda-core";

class TrackingNode extends SimNode {
    public resets: number = 0;

    public constructor(public name: string, public log: string[], phases: ReadonlyArray<SimPhase> = [SimPhase.Step]) {
        super(null, null, undefined, phases);
    }

    public override advance(t: number, phase: SimPhase): void {
        this.log.push(`${this.name}:${SimPhase[phase]}:${t}`);
    }

    public override reset(): void {
        this.resets++;
        this.log.push(`${this.name}:reset`);
    }
}

describe("SimGraph scheduler", () => {
    test("single-phase advance runs children in topological order", () => {
        const log: string[] = [];
        const a = new TrackingNode("A", log);
        const b = new TrackingNode("B", log);
        const c = new TrackingNode("C", log);
        const ab = new SimLink(a, b);
        const bc = new SimLink(b, c);

        const g = new SimGraph([a, b, c], [ab, bc]);
        g.advance(1, SimPhase.Step);

        expect(log).toEqual(["A:Step:1", "B:Step:1", "C:Step:1"]);
    });

    test("tick iterates self.phases in declaration order", () => {
        const log: string[] = [];
        const a = new TrackingNode("A", log, [SimPhase.PreStep, SimPhase.Step, SimPhase.PostStep]);

        const g = new SimGraph(
            [a],
            [],
            null,
            null,
            null,
            null,
            null,
            undefined,
            [SimPhase.PreStep, SimPhase.Step, SimPhase.PostStep]
        );
        g.tick(2);

        expect(log).toEqual(["A:PreStep:2", "A:Step:2", "A:PostStep:2"]);
    });

    test("a node is skipped in phases it does not declare", () => {
        const log: string[] = [];
        const a = new TrackingNode("A", log, [SimPhase.PreStep]);
        const b = new TrackingNode("B", log, [SimPhase.Step]);

        const g = new SimGraph(
            [a, b],
            [],
            null,
            null,
            null,
            null,
            null,
            undefined,
            [SimPhase.PreStep, SimPhase.Step]
        );
        g.tick(0);

        expect(log).toEqual(["A:PreStep:0", "B:Step:0"]);
    });

    test("advance with a phase not in graph.phases is a no-op", () => {
        const log: string[] = [];
        const a = new TrackingNode("A", log, [SimPhase.PreStep, SimPhase.Step]);
        const g = new SimGraph([a], [], null, null, null, null, null, undefined, [SimPhase.Step]);

        g.advance(0, SimPhase.PreStep);
        g.advance(0, SimPhase.Step);

        expect(log).toEqual(["A:Step:0"]);
    });

    test("disabled node is skipped, downstream still runs", () => {
        const log: string[] = [];
        const a = new TrackingNode("A", log);
        const b = new TrackingNode("B", log);
        const c = new TrackingNode("C", log);
        b.enabled = false;
        const ab = new SimLink(a, b);
        const bc = new SimLink(b, c);

        const g = new SimGraph([a, b, c], [ab, bc]);
        g.advance(0, SimPhase.Step);

        expect(log).toEqual(["A:Step:0", "C:Step:0"]);
    });

    test("disabled link removes its dependency edge", () => {
        const log: string[] = [];
        const a = new TrackingNode("A", log);
        const b = new TrackingNode("B", log);
        const ab = new SimLink(a, b);
        ab.enabled = false;

        const g = new SimGraph([a, b], [ab]);
        g.advance(0, SimPhase.Step);

        expect(log).toHaveLength(2);
        expect(log).toContain("A:Step:0");
        expect(log).toContain("B:Step:0");
    });

    test("delayed link breaks a feedback cycle without throwing", () => {
        const log: string[] = [];
        const a = new TrackingNode("A", log);
        const b = new TrackingNode("B", log);
        const ab = new SimLink(a, b);
        const ba = new SimLink(b, a, 0, true);

        const g = new SimGraph([a, b], [ab, ba]);
        expect(() => g.advance(0, SimPhase.Step)).not.toThrow();
        expect(log).toEqual(["A:Step:0", "B:Step:0"]);
    });

    test("cycle without a delayed link throws", () => {
        const log: string[] = [];
        const a = new TrackingNode("A", log);
        const b = new TrackingNode("B", log);
        const ab = new SimLink(a, b);
        const ba = new SimLink(b, a);

        const g = new SimGraph([a, b], [ab, ba]);
        expect(() => g.advance(0, SimPhase.Step)).toThrow(/Cycle/);
    });

    test("reset cascades to all children", () => {
        const log: string[] = [];
        const a = new TrackingNode("A", log);
        const b = new TrackingNode("B", log);
        const g = new SimGraph([a, b]);

        g.reset();

        expect(a.resets).toBe(1);
        expect(b.resets).toBe(1);
    });

    test("disabled graph runs no children", () => {
        const log: string[] = [];
        const a = new TrackingNode("A", log);
        const g = new SimGraph([a]);
        g.enabled = false;

        g.advance(0, SimPhase.Step);
        g.tick(0);

        expect(log).toEqual([]);
    });

    test("empty graph runs without error", () => {
        const g = new SimGraph<SimNode, SimLink>([], []);
        expect(() => g.advance(0, SimPhase.Step)).not.toThrow();
        expect(() => g.tick(0)).not.toThrow();
    });
});
