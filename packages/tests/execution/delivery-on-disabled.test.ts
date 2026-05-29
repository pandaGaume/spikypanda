/**
 * Validates the deliverLinkRef change: tokens delivered to a disabled
 * destination must be silently dropped, AND tokens delivered to an
 * enabled destination must flow normally (Clock → Plot pattern).
 *
 * Reproduces the user-observed scenario where the Viz.Plot tile stopped
 * receiving data after the enabled-check was added to deliverLinkRef.
 */
import { Channel, IChannel, ISession, RuntimeGraph, RuntimeNode, Session, inSlotOf, type IDeclaresPorts, type IPortDescriptor } from "spikypanda-core";

class ClockNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "t", optional: false, type: "float" },
    ];
    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "t" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, t);
        }
    }
}

class SinkNode extends RuntimeNode implements IDeclaresPorts {
    public received: number[] = [];
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "value", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];
    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (inSlotOf(link) !== "value" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const v = session.consume(idx);
            if (typeof v === "number") this.received.push(v);
        }
    }
}

describe("deliverLinkRef + enabled flag", () => {
    test("Clock → Sink (both enabled) flows data on every tick", () => {
        const clock = new ClockNode();
        const sink = new SinkNode();
        const link = new Channel(clock, sink, "t", false, undefined, true, "value");
        const graph = new RuntimeGraph<RuntimeNode, Channel>([clock, sink], [link], "dynamic");
        const session = new Session(graph);

        session.run(0.0);
        session.run(0.1);
        session.run(0.2);

        expect(sink.received).toEqual([0.0, 0.1, 0.2]);
    });

    test("disabled sink drops tokens (no overflow throw)", () => {
        const clock = new ClockNode();
        const sink = new SinkNode();
        sink.enabled = false;
        const link = new Channel(clock, sink, "t", false, undefined, true, "value");
        const graph = new RuntimeGraph<RuntimeNode, Channel>([clock, sink], [link], "dynamic");
        const session = new Session(graph);

        // Three ticks: with the fix, no overflow throw, sink receives nothing.
        expect(() => {
            session.run(0.0);
            session.run(0.1);
            session.run(0.2);
        }).not.toThrow();
        expect(sink.received).toEqual([]);
    });

    test("disable → enable resumes data flow on next upstream publish", () => {
        const clock = new ClockNode();
        const sink = new SinkNode();
        const link = new Channel(clock, sink, "t", false, undefined, true, "value");
        const graph = new RuntimeGraph<RuntimeNode, Channel>([clock, sink], [link], "dynamic");
        const session = new Session(graph);

        session.run(0.0);
        sink.enabled = false;
        session.run(0.1);  // dropped
        session.run(0.2);  // dropped
        sink.enabled = true;
        session.run(0.3);  // resumes

        expect(sink.received).toEqual([0.0, 0.3]);
    });
});
