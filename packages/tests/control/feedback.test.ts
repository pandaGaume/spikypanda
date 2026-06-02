/**
 * Unit tests for FeedbackChannelNode (Control.Feedback:channel).
 *
 * Coverage:
 *   - delay = 0 → passthrough
 *   - delay = 1 → Z^-1 (publishes initial first, then input[t-1])
 *   - delay = N → Z^-N over a longer window
 *   - reset() rebuilds the buffer and re-seeds with initial
 *   - any-typed payloads (numbers, objects, vectors)
 *   - changing delay at runtime triggers a buffer rebuild
 *
 * Tests use a real Session driving a Producer → Feedback → Consumer
 * chain so the publish/consume plumbing is exercised end-to-end. The
 * pattern follows packages/tests/execution/dynamic.test.ts and reuses
 * the same poc-nodes (ProducerNode / ConsumerNode).
 */
import { Channel, IChannel, RuntimeGraph, RuntimeNode, Session } from "spikypanda-core";
import { ConsumerNode, ProducerNode } from "../execution/poc-nodes";
import { FeedbackChannelNode } from "../../dev/plugins/control/src/feedback/channel.node";

function buildChain(node: FeedbackChannelNode, producerValue: number): { session: Session; consumer: ConsumerNode } {
    const p = new ProducerNode(producerValue);
    const c = new ConsumerNode();
    const pToFb = new Channel(p, node, "input");
    const fbToC = new Channel(node, c, "in");
    const graph = new RuntimeGraph<RuntimeNode, Channel>([p, node, c], [pToFb, fbToC], "dynamic");
    const session = new Session(graph);
    return { session, consumer: c };
}

describe("FeedbackChannelNode", () => {
    describe("delay = 0 (passthrough)", () => {
        it("publishes the input value unchanged within the same tick", () => {
            const fb = new FeedbackChannelNode();
            fb.delay = 0;
            const { session, consumer } = buildChain(fb, 42);

            session.run(0);
            session.run(1);

            expect(consumer.received).toEqual([42, 42]);
        });

        it("falls back to initial when no input is wired/ready", () => {
            const fb = new FeedbackChannelNode();
            fb.delay = 0;
            fb.initial = 7;
            const c = new ConsumerNode();
            const fbToC = new Channel(fb, c, "in");
            const graph = new RuntimeGraph<RuntimeNode, Channel>([fb, c], [fbToC], "dynamic");
            const session = new Session(graph);

            session.run(0);

            expect(c.received).toEqual([7]);
        });
    });

    describe("delay = 1 (Z^-1)", () => {
        it("publishes `initial` on the first tick, then input[t-1] thereafter", () => {
            const fb = new FeedbackChannelNode();
            fb.delay = 1;
            fb.initial = 99;
            const { session, consumer } = buildChain(fb, 42);

            session.run(0); // sees buffer[0] = 99 (initial), buffers 42
            session.run(1); // sees buffer[0] = 42 (from tick 0), buffers 42 again
            session.run(2);

            expect(consumer.received).toEqual([99, 42, 42]);
        });

        it("default delay is 1 and default initial is 0", () => {
            const fb = new FeedbackChannelNode();
            expect(fb.delay).toBe(1);
            expect(fb.initial).toBe(0);

            const { session, consumer } = buildChain(fb, 5);
            session.run(0);
            session.run(1);

            expect(consumer.received).toEqual([0, 5]);
        });
    });

    describe("delay = N", () => {
        it("publishes `initial` for N ticks, then input[t-N]", () => {
            const fb = new FeedbackChannelNode();
            fb.delay = 3;
            fb.initial = -1;
            const { session, consumer } = buildChain(fb, 8);

            for (let t = 0; t < 6; t++) session.run(t);

            // Ticks 0,1,2: still draining the initial-filled ring (size 3).
            // Tick 3: sees what was buffered at tick 0 (= 8).
            // Ticks 4,5: same.
            expect(consumer.received).toEqual([-1, -1, -1, 8, 8, 8]);
        });
    });

    describe("any-typed payloads", () => {
        it("propagates objects unchanged", () => {
            const fb = new FeedbackChannelNode();
            fb.delay = 0;
            const payload = { x: 1, y: 2, z: 3 };

            class ObjectProducer extends RuntimeNode {
                public override fire(s: Session, _t: number): void {
                    const out = this.onsc<IChannel>()[0];
                    const idx = (s.graph.links as ReadonlyArray<IChannel>).indexOf(out);
                    s.publish(idx, payload);
                }
            }
            class ObjectConsumer extends RuntimeNode {
                public received: unknown[] = [];
                public override fire(s: Session, _t: number): void {
                    const inc = this.opsc<IChannel>()[0];
                    const idx = (s.graph.links as ReadonlyArray<IChannel>).indexOf(inc);
                    this.received.push(s.consume(idx));
                }
            }

            const p = new ObjectProducer();
            const c = new ObjectConsumer();
            const pToFb = new Channel(p, fb, "input");
            const fbToC = new Channel(fb, c, "in");
            const g = new RuntimeGraph<RuntimeNode, Channel>([p, fb, c], [pToFb, fbToC], "dynamic");
            const s = new Session(g);

            s.run(0);

            expect(c.received).toEqual([payload]);
            // Same reference: the channel must NOT clone the payload.
            expect(c.received[0]).toBe(payload);
        });
    });

    describe("reset / rebuild behavior", () => {
        it("changing `delay` mid-life keeps in-flight events; reset() applies the new depth", () => {
            // The validAtTick mechanism stores no per-node ring buffer:
            // in-flight events live in Session.deferred, each stamped
            // with an absolute future tick. So setting `delay` in
            // isolation does NOT rebuild anything — events scheduled
            // before the change keep their original validAtTick and are
            // still delivered when their tick arrives. To apply a new
            // delay depth to the bootstrap window, call reset() so the
            // FB re-seeds fresh events at currentTick+1..delay.
            const fb = new FeedbackChannelNode();
            fb.delay = 2;
            fb.initial = 0;
            const { session, consumer } = buildChain(fb, 7);

            // First two ticks see the initial-bootstrap seeds (0, 0).
            session.run(0);
            session.run(1);
            expect(consumer.received).toEqual([0, 0]);

            // Mid-life delay change. Already-scheduled events at
            // validAtTick=2 (from run(0)) and validAtTick=3 (from run(1))
            // remain queued with value=7 (the input the producer sent).
            fb.delay = 5;
            fb.initial = -1;
            // Without a reset, the next two ticks still deliver those
            // in-flight 7s.
            session.run(2);
            session.run(3);
            expect(consumer.received).toEqual([0, 0, 7, 7]);

            // After explicit reset at currentTick=3, fresh seeds are
            // scheduled at validAtTick=4..8 with the new initial=-1.
            // In-flight events targeting FB's output channel are
            // cancelled, so the consumer sees five new -1s before the
            // next post-reset publish (at validAtTick=3+5=8 if FB had
            // fired this tick — but reset() runs before run(4), so the
            // first post-reset FB.fire is at t=4 → validAt=9, well after
            // our window).
            fb.reset(session);
            for (let t = 4; t < 9; t++) session.run(t);
            expect(consumer.received).toEqual([0, 0, 7, 7, -1, -1, -1, -1, -1]);
        });

        it("clamps a fractional / negative delay to a non-negative integer", () => {
            const fb = new FeedbackChannelNode();
            fb.delay = -3;
            expect(fb.delay).toBe(0);

            fb.delay = 2.7;
            expect(fb.delay).toBe(2);
        });

        it("fb.reset() mid-session cancels in-flight events and re-seeds with the current `initial`", () => {
            const fb = new FeedbackChannelNode();
            fb.delay = 2;
            fb.initial = 5;

            const { session, consumer } = buildChain(fb, 100);

            session.run(0);
            session.run(1);
            session.run(2);
            // Ticks 0,1 see the bootstrap seeds (5, 5). Tick 2 sees the
            // first real input (100, scheduled by FB.fire at t=0).
            expect(consumer.received).toEqual([5, 5, 100]);

            // Re-seed with new initial. The in-flight 100 (scheduled at
            // validAt=3 from FB.fire at t=1) and 100 (at validAt=4 from
            // FB.fire at t=2) get cancelled by fb.reset(); fresh seeds
            // go in at validAt=3,4 with value=99.
            fb.initial = 99;
            fb.reset(session);
            consumer.received = [];

            session.run(3);
            session.run(4);
            session.run(5);
            // Ticks 3,4: new bootstrap seeds (99, 99). Tick 5: first
            // FB.fire after the reset published at validAt=3+2=5 with
            // value=100 (producer was still sending 100 at t=3).
            expect(consumer.received).toEqual([99, 99, 100]);
        });
    });
});
