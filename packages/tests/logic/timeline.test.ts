/**
 * Logic.Time:timeline: a piecewise-constant source edited as JSON.
 */
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import type { IChannel, ISession } from "spikypanda-core";
import { TimelineNode } from "../../dev/plugins/logic/src/nodes/timeline";

class Sink extends RuntimeNode {
    public seen: unknown[] = [];
    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            const idx = links.indexOf(link);
            if (idx >= 0 && session.linkStates[idx].ready) this.seen.push(session.consume(idx));
        }
    }
}

describe("Timeline", () => {
    it("publishes the value of the segment that contains t, and the default outside", () => {
        const tl = new TimelineNode();
        tl.defaultValue = -1;
        tl.setSegments([
            { from: 0, to: 100, value: 4 },
            { from: 100, to: 160, value: "heavy_work" },
        ]);
        expect(tl.valueAt(0)).toBe(4);
        expect(tl.valueAt(99.9)).toBe(4);
        expect(tl.valueAt(100)).toBe("heavy_work");
        expect(tl.valueAt(160)).toBe(-1);
        const sink = new Sink();
        const builder = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic").withNodes(tl, sink);
        builder.withChannel(tl, sink, "value", "in");
        const session = new Session(builder.build());
        tl.reset(session);
        for (const t of [0, 50, 100, 200]) session.run(t);
        expect(sink.seen).toEqual([4, 4, "heavy_work", -1]);
    });

    it("refuses overlaps, bad shapes and non JSON, and keeps the previous list", () => {
        const tl = new TimelineNode();
        tl.setSegments([{ from: 0, to: 10, value: 1 }]);
        expect(() =>
            tl.setSegments([
                { from: 0, to: 10, value: 1 },
                { from: 5, to: 20, value: 2 },
            ])
        ).toThrow(/overlap/);
        expect(() => tl.setSegments([{ from: 10, to: 10, value: 1 }])).toThrow(/end after it starts/);
        expect(() => (tl.segments = "not json")).toThrow(/not JSON/);
        expect(() => (tl.segments = JSON.stringify([{ from: 0, to: 1, value: { a: 1 } }]))).toThrow(/number or a string/);
        expect(tl.segmentList).toEqual([{ from: 0, to: 10, value: 1 }]);
    });

    it("round-trips through serialize and deserialize with the parsed list restored", () => {
        const tl = new TimelineNode();
        tl.setSegments([
            { from: 60, to: 120, value: 2 },
            { from: 0, to: 60, value: 1 },
        ]);
        const blob = tl.serialize();
        const copy = new TimelineNode();
        copy.deserialize(blob);
        expect(copy.valueAt(30)).toBe(1);
        expect(copy.valueAt(90)).toBe(2);
        expect(copy.segmentList[0].from).toBe(0); // sorted on parse
    });
});
