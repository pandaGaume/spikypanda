/**
 * Tests for the ML.Detect:motion node and its MotionWatch library
 * (@spikypanda/plugin-ml): per-element movement watching, the second
 * detection channel next to the open-set clusterer.
 *
 *   - silence: warmup then benign jitter never fires over 2000 steps;
 *   - jump: a sharp per-element step fires exactly one REGIME_JUMP
 *     naming the element at the right step, the latch suppresses
 *     repeats while displaced, and the hysteresis re-arm is pinned at
 *     the z_jump / 2 boundary;
 *   - freeze: a stilled element fires REGIME_FREEZE after exactly the
 *     window-fill delay, jittering neighbours stay silent, and the
 *     freeze latch re-arms through motion resumption;
 *   - anti-false-freeze: an oscillating element that doubles back keeps
 *     a large PATH even though its net displacement sits below the
 *     freeze threshold the whole time (path, not displacement);
 *   - control plane: a _rebaseline token re-enters warmup through a
 *     real Session while the counters keep their totals;
 *   - wire contract: REGIME_JUMP and REGIME_FREEZE pass a real Logic
 *     Alert Bus at "warn" severity (not normalised down to "info");
 *   - topology: the lib throws on a vector length change; the node
 *     catches, console.warns ONCE per reset, and re-baselines on the
 *     offending vector (pinned recovery behavior).
 */
import type { IChannel, IPortDescriptor, ISession } from "spikypanda-core";
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import { MotionWatch, MotionWatchNode } from "../../dev/plugins/ml/src/index";
import type { IMotionAlarm } from "../../dev/plugins/ml/src/index";
import { AlertBusNode } from "../../dev/plugins/logic/src/event/alert-bus.node";

// ---------------------------------------------------------------------------
// Harness: a node wired through real Channels to dummy endpoints, driven
// by a mock session whose linkStates mirror per-link FIFO queues (same
// rig as online-cluster.test.ts).
// ---------------------------------------------------------------------------

interface IRig<N extends RuntimeNode> {
    node: N;
    session: ISession;
    /** Queue a token on the input channel bound to `slot`. */
    push(slot: string, value: unknown): void;
    /** Everything published, keyed by output slot name. */
    published: Record<string, unknown[]>;
}

function makeRig<N extends RuntimeNode>(node: N, inputSlots: string[], outputSlots: string[]): IRig<N> {
    const src = new RuntimeNode();
    const sink = new RuntimeNode();
    const inLinks = inputSlots.map((slot) => new Channel(src, node, slot));
    const outLinks = outputSlots.map((slot) => new Channel(node, sink, slot));
    const links: IChannel[] = [...inLinks, ...outLinks];
    const queues: unknown[][] = links.map(() => []);
    const published: Record<string, unknown[]> = {};
    for (const slot of outputSlots) published[slot] = [];
    const session = {
        graph: { links },
        linkStates: links.map((_, i) => ({
            get ready() {
                return queues[i].length > 0;
            },
        })),
        consume: (idx: number) => queues[idx].shift(),
        publish: (idx: number, value: unknown) => {
            published[String((links[idx] as Channel).slot)].push(value);
        },
        peek: (idx: number) => queues[idx][0],
    } as unknown as ISession;
    const push = (slot: string, value: unknown): void => {
        const i = inputSlots.indexOf(slot);
        queues[i].push(value);
    };
    return { node, session, push, published };
}

function makeMotionRig(): IRig<MotionWatchNode> {
    return makeRig(new MotionWatchNode(), ["vector", "_rebaseline"], ["alarm", "moving"]);
}

function tensorOf(vec: number[]): { data: Float32Array; shape: number[] } {
    return { data: Float32Array.from(vec), shape: [vec.length] };
}

// ---------------------------------------------------------------------------
// Deterministic jitter (same LCG family as the cluster tests): rand()
// is uniform in [-0.5, 0.5), so base + 0.02 * rand() jitters +/- 0.01
// and the per-step |delta| is triangular on [0, 0.02] (median ~ 0.0059,
// max 0.02): the benign z ceiling is 0.02 / 0.0059 ~ 3.4, comfortably
// below the default z_jump 6.
// ---------------------------------------------------------------------------

function makeLcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000 - 0.5;
    };
}

function jittered(bases: number[], rand: () => number): number[] {
    return bases.map((b) => b + 0.02 * rand());
}

/** Bounded benign jitter for the SHORT-warmup node tests: alternating
 *  sign with magnitude uniform in [0.005, 0.01], so every per-step
 *  |delta| lies in [0.01, 0.02] by construction. The warmup median
 *  then sits in that same band whatever the warmup length (a 7-sample
 *  median of plain uniform jitter is noisy enough to push benign z
 *  past 6), so z stays <= 2 and the rolling path stays >= half the
 *  baseline, deterministically. */
function makeBoundedJitter(seed: number): (bases: number[]) => number[] {
    const rand = makeLcg(seed);
    let sign = 1;
    return (bases: number[]) => {
        sign = -sign;
        return bases.map((b) => b + sign * (0.0075 + 0.005 * rand()));
    };
}

// ---------------------------------------------------------------------------
// 1. Silence: warmup then benign jitter
// ---------------------------------------------------------------------------

describe("MotionWatch (lib): benign jitter", () => {
    it("zero events over 2000 steps of seeded jitter; the reference freezes after warmup", () => {
        const mw = new MotionWatch(); // warmup 64, window 16, freezeRatio 0.1, zJump 6
        const rand = makeLcg(42);
        const bases = [1, -2, 0.5, 0, 3];
        let events = 0;
        for (let t = 0; t < 2000; t++) {
            const r = mw.step(jittered(bases, rand));
            events += r.events.length;
            expect(r.warmupDone).toBe(t >= 63); // 64th call freezes the reference
        }
        expect(events).toBe(0);
        expect(mw.warmupDone).toBe(true);
        expect(mw.elementCount).toBe(5);
        const scales = mw.stepScales;
        expect(scales).toHaveLength(5);
        for (const s of scales) {
            expect(s).toBeGreaterThan(0);
            expect(s).toBeLessThan(0.02); // a per-step jitter scale, not a level
        }
        expect(mw.movingCount).toBe(5);
    });
});

// ---------------------------------------------------------------------------
// 2. Jump: sharp step, latch, hysteresis
// ---------------------------------------------------------------------------

describe("MotionWatchNode: jump signature", () => {
    it("one element stepping sharply fires exactly one REGIME_JUMP naming it, with no repeat while displaced", () => {
        const rig = makeMotionRig();
        rig.node.reset(rig.session);
        rig.node.warmup = 8;
        const jitter = makeBoundedJitter(7);
        const bases = [0, 10, -5, 2];
        const alarmAtFire: number[] = [];
        for (let t = 1; t <= 60; t++) {
            if (t === 20) bases[2] += 1; // the sharp step, then it STAYS displaced
            rig.push("vector", tensorOf(jitter(bases)));
            rig.node.fire(rig.session, t);
            alarmAtFire.push(rig.published.alarm.length);
        }
        expect(rig.published.alarm).toHaveLength(1);
        // The alarm count crossed 0 -> 1 exactly at fire 20 (index 19).
        expect(alarmAtFire[18]).toBe(0);
        expect(alarmAtFire[19]).toBe(1);
        const alarm = rig.published.alarm[0] as IMotionAlarm;
        expect(alarm.topic).toBe("REGIME_JUMP");
        expect(alarm.severity).toBe("warn");
        expect(alarm.payload.element).toBe(2);
        expect(alarm.payload.score).toBeGreaterThan(6);
        expect(alarm.payload.message).toBe(`REGIME_JUMP element=2 z=${alarm.payload.score.toFixed(2)}`);
        expect(rig.node.jump_count).toBe(1);
        expect(rig.node.freeze_count).toBe(0);
        expect(rig.node.elements).toBe(4);
        expect(rig.node.warmup_done).toBe(true);
    });

    it("LIB: the latch holds in the hysteresis band (z_jump / 2 .. z_jump) and re-arms below it", () => {
        // Single element, fully controlled deltas. Warmup alternates
        // 0 / 1 so all 7 warmup deltas are exactly 1: s = 1 and z IS
        // the raw delta.
        const mw = new MotionWatch({ warmup: 8, window: 16 }); // zJump 6 default
        const series = [0, 1, 0, 1, 0, 1, 0, 1, /* warmup ends */ 11, 15, 19, 23, 24, 34];
        // post-warmup deltas:                   10  4   4   4   1   10
        // expected:                             FIRE -  in band -  REARM FIRE
        const eventsAt: number[] = [];
        series.forEach((x, i) => {
            const r = mw.step([x]);
            if (r.events.length > 0) eventsAt.push(i + 1); // 1-based call index
        });
        expect(mw.stepScales[0]).toBe(1);
        expect(eventsAt).toEqual([9, 14]); // once on each rising edge, silent in between
    });
});

// ---------------------------------------------------------------------------
// 3. Freeze: window-fill delay, localization, latch + re-arm
// ---------------------------------------------------------------------------

describe("MotionWatchNode: freeze signature", () => {
    it("a stilled element fires REGIME_FREEZE after exactly the window-fill delay; jittering neighbours stay silent", () => {
        const rig = makeMotionRig();
        rig.node.reset(rig.session);
        rig.node.warmup = 8;
        rig.node.window = 8;
        const jitter = makeBoundedJitter(13);
        const bases = [0, 5, -5];
        const alarmAtFire: number[] = [];
        for (let t = 1; t <= 100; t++) {
            const v = jitter(bases);
            // Element 1 stands still AT ITS BASE from the last warmup
            // sample on (call 8), so every post-warmup delta is exactly
            // 0 and the freeze timing is pinned to the window fill.
            if (t >= 8 && t <= 60) v[1] = 5;
            // Motion resumes over t = 61..78 (same base: the resume
            // delta is jitter-scale, far below the jump threshold),
            // then it freezes AGAIN from its t = 79 sample on.
            if (t >= 79) v[1] = 5;
            rig.push("vector", tensorOf(v));
            rig.node.fire(rig.session, t);
            alarmAtFire.push(rig.published.alarm.length);
        }
        const alarms = rig.published.alarm as IMotionAlarm[];
        // Exactly two freezes, both naming element 1, nothing else.
        expect(alarms).toHaveLength(2);
        for (const a of alarms) {
            expect(a.topic).toBe("REGIME_FREEZE");
            expect(a.severity).toBe("warn");
            expect(a.payload.element).toBe(1);
            expect(a.payload.score).toBeLessThan(0.1);
            expect(a.payload.message).toBe(`REGIME_FREEZE element=1 ratio=${a.payload.score.toFixed(4)}`);
        }
        // First fire at EXACTLY warmup + window (call 16): the stand-still
        // started at warmup end, so the post-warmup ring fills with zeros
        // and the very first freeze evaluation trips. Latched: no repeat
        // through 44 more frozen steps.
        expect(alarmAtFire[14]).toBe(0);
        expect(alarmAtFire[15]).toBe(1);
        expect(alarmAtFire[59]).toBe(1);
        // The resumption re-armed the latch (path back above 2x the
        // threshold), so the second stand-still fires again once its
        // zeros drain the rolling window.
        const second = alarmAtFire.findIndex((n) => n === 2) + 1;
        expect(second).toBeGreaterThanOrEqual(80);
        expect(second).toBeLessThanOrEqual(80 + 8 + 1);
        expect(rig.node.freeze_count).toBe(2);
        expect(rig.node.jump_count).toBe(0);
        // moving = NOT-frozen count: 3 while healthy, 2 while element 1
        // is latched frozen.
        const moving = rig.published.moving as number[];
        expect(moving[14]).toBe(3);
        expect(moving[15]).toBe(2);
        expect(moving[moving.length - 1]).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// 4. Anti-false-freeze: path length, not net displacement
// ---------------------------------------------------------------------------

describe("MotionWatch (lib): oscillation does not read as frozen", () => {
    it("a sine that doubles back keeps a large path even though its NET displacement stays under the freeze threshold", () => {
        const mw = new MotionWatch(); // warmup 64, window 16, freezeRatio 0.1
        const rand = makeLcg(23);
        const x0: number[] = [];
        let events = 0;
        for (let t = 0; t < 600; t++) {
            const s = Math.sin(0.8 * t); // 0.8 rad/step: ~7.9 steps per period
            x0.push(s);
            events += mw.step([s, 0.02 * rand()]).events.length;
        }
        expect(events).toBe(0); // neither freeze nor jump, ever

        // The trap this design dodges: over any 16-step window the sine
        // nearly returns to its start (0.8 * 16 = 12.8 rad, only 0.23 rad
        // past two full turns), so its NET displacement sits below the
        // freeze threshold for EVERY post-warmup window. A detector
        // comparing net displacement (or instantaneous velocity) to the
        // baseline would have latched "frozen" immediately; the rolling
        // PATH (sum of |delta|) stays large because the motion doubles
        // back, which is exactly why path length is the freeze metric.
        const freezeThr = 0.1 * mw.stepScales[0] * 16;
        let maxNet = 0;
        for (let t = 80; t < 600; t++) {
            maxNet = Math.max(maxNet, Math.abs(x0[t] - x0[t - 16]));
        }
        expect(maxNet).toBeLessThan(freezeThr);
    });
});

// ---------------------------------------------------------------------------
// Real-Session wiring: control-plane _rebaseline (same source/trigger/
// sink trio as the cluster's real-Session tests).
// ---------------------------------------------------------------------------

/** Emits one queued token per fire() on every outgoing channel. */
class TokenSource extends RuntimeNode {
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "out", optional: false, type: "any" }];

    private readonly _tokens: unknown[];
    private _cursor = 0;

    public constructor(tokens: unknown[]) {
        super();
        this._tokens = tokens;
    }

    public override isReady(_s: ISession): boolean {
        return this.enabled && this._cursor < this._tokens.length;
    }

    public override fire(session: ISession, _t: number): void {
        const token = this._tokens[this._cursor++];
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx >= 0) session.publish(idx, token);
        }
    }
}

/** True source publishing one trigger token on the listed ticks only. */
class TickTrigger extends RuntimeNode {
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "out", optional: false, type: "any" }];

    private readonly _at: ReadonlySet<number>;

    public constructor(ticks: number[]) {
        super();
        this._at = new Set(ticks);
    }

    public override fire(session: ISession, t: number): void {
        if (!this._at.has(t)) return;
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx >= 0) session.publish(idx, true);
        }
    }
}

/** Single-input sink draining every queued token. */
class TokenSink extends RuntimeNode {
    public readonly tokens: unknown[] = [];

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                this.tokens.push(session.consume(idx));
            }
        }
    }
}

describe("MotionWatchNode: real-Session control-plane _rebaseline", () => {
    test("a _rebaseline token re-enters warmup; counters keep their totals across it", () => {
        const jitter = makeBoundedJitter(99);
        const bases = [0, 0, 0];
        const vectors: { data: Float32Array; shape: number[] }[] = [];
        for (let t = 0; t < 30; t++) {
            if (t === 12) bases[1] += 1; // sharp step well after warmup
            vectors.push(tensorOf(jitter(bases)));
        }
        const source = new TokenSource(vectors);
        const trigger = new TickTrigger([18]);
        const node = new MotionWatchNode();
        node.warmup = 8;
        node.window = 4;
        const alarmSink = new TokenSink();
        const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>()
            .withMode("dynamic")
            .withNodes(source, trigger, node, alarmSink)
            .withChannel(source, node, "out", "vector")
            .withChannel(trigger, node, "out", "_rebaseline")
            .withChannel(node, alarmSink, "alarm", "alarm")
            .build();
        const session = new Session(graph);

        const warmupDoneAt: boolean[] = [];
        for (let t = 0; t < 30; t++) {
            session.run(t);
            warmupDoneAt.push(node.warmup_done);
        }

        // One REGIME_JUMP on the pre-rebaseline step, nothing else: the
        // re-warmup itself is silent and bakes the displaced level into
        // the new baseline.
        const alarms = alarmSink.tokens as IMotionAlarm[];
        expect(alarms).toHaveLength(1);
        expect(alarms[0].topic).toBe("REGIME_JUMP");
        expect(alarms[0].payload.element).toBe(1);

        // Warmup timeline: done at tick 7 (8 vectors), back to warmup
        // right after the tick-18 trigger (honoured AFTER that tick's
        // step, mirroring the clusterer's recluster ordering), done
        // again at tick 26 (8 more vectors).
        expect(warmupDoneAt[7]).toBe(true);
        expect(warmupDoneAt[17]).toBe(true);
        expect(warmupDoneAt.slice(18, 26)).toEqual([false, false, false, false, false, false, false, false]);
        expect(warmupDoneAt[26]).toBe(true);

        // Counters keep their totals across a re-baseline: only a
        // session reset zeroes them.
        expect(node.jump_count).toBe(1);
        expect(node.freeze_count).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// 6. Alert Bus wire compatibility
// ---------------------------------------------------------------------------

describe("MotionWatchNode: alarm output on the Logic Alert Bus", () => {
    function busAccepts(alarm: unknown, topic: string): void {
        const bus = makeRig(new AlertBusNode(), ["publish"], ["subscribe"]);
        bus.node.reset(bus.session);
        bus.push("publish", alarm);
        bus.node.fire(bus.session, 0);
        expect(bus.published.subscribe).toHaveLength(1);
        const forwarded = bus.published.subscribe[0] as IMotionAlarm;
        expect(forwarded.topic).toBe(topic);
        expect(forwarded.severity).toBe("warn");
        expect(bus.node.lastTopic).toBe(topic);
        expect(bus.node.lastSeverity).toBe("warn");
    }

    it("REGIME_JUMP passes the bus verbatim at warn severity", () => {
        const rig = makeMotionRig();
        rig.node.reset(rig.session);
        rig.node.warmup = 8;
        const jitter = makeBoundedJitter(5);
        const bases = [0, 0];
        for (let t = 1; t <= 12; t++) {
            if (t === 12) bases[0] += 1;
            rig.push("vector", tensorOf(jitter(bases)));
            rig.node.fire(rig.session, t);
        }
        expect(rig.published.alarm).toHaveLength(1);
        busAccepts(rig.published.alarm[0], "REGIME_JUMP");
    });

    it("REGIME_FREEZE passes the bus verbatim at warn severity", () => {
        const rig = makeMotionRig();
        rig.node.reset(rig.session);
        rig.node.warmup = 8;
        rig.node.window = 4;
        const jitter = makeBoundedJitter(31);
        for (let t = 1; t <= 12; t++) {
            const v = jitter([0, 0]);
            if (t >= 8) v[1] = 0; // stands still at its base from the last warmup sample on
            rig.push("vector", tensorOf(v));
            rig.node.fire(rig.session, t);
        }
        expect(rig.published.alarm).toHaveLength(1);
        busAccepts(rig.published.alarm[0], "REGIME_FREEZE");
    });
});

// ---------------------------------------------------------------------------
// 7. Fixed topology contract
// ---------------------------------------------------------------------------

describe("MotionWatch: vector length change", () => {
    it("LIB: throws an explicit error (fixed topology contract)", () => {
        const mw = new MotionWatch();
        mw.step([1, 2, 3]);
        expect(() => mw.step([1, 2])).toThrow(/length changed from 3 to 2/);
    });

    it("NODE: catches, console.warns once per reset, and re-baselines on the offending vector (pinned)", () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
        try {
            const rig = makeMotionRig();
            rig.node.reset(rig.session);
            rig.node.warmup = 8;
            const rand = makeLcg(77);
            for (let t = 1; t <= 10; t++) {
                rig.push("vector", tensorOf(jittered([0, 1, 2], rand)));
                rig.node.fire(rig.session, t);
            }
            expect(rig.node.warmup_done).toBe(true);
            expect(rig.node.elements).toBe(3);

            // Topology break: dim 3 -> dim 5. The node survives, warns
            // once, and the offending vector seeds the new warmup.
            rig.push("vector", tensorOf(jittered([0, 1, 2, 3, 4], rand)));
            expect(() => rig.node.fire(rig.session, 11)).not.toThrow();
            expect(warn).toHaveBeenCalledTimes(1);
            expect(rig.node.warmup_done).toBe(false);
            expect(rig.node.elements).toBe(5);

            // The new shape warms up normally (8 calls including the seed).
            for (let t = 12; t <= 18; t++) {
                rig.push("vector", tensorOf(jittered([0, 1, 2, 3, 4], rand)));
                rig.node.fire(rig.session, t);
            }
            expect(rig.node.warmup_done).toBe(true);

            // A SECOND break still re-baselines but stays quiet: the
            // warn is once per reset, not once per break.
            rig.push("vector", tensorOf(jittered([0, 1], rand)));
            expect(() => rig.node.fire(rig.session, 19)).not.toThrow();
            expect(warn).toHaveBeenCalledTimes(1);
            expect(rig.node.elements).toBe(2);

            // reset() re-arms the warn.
            rig.node.reset(rig.session);
            rig.push("vector", tensorOf(jittered([0, 1], rand)));
            rig.node.fire(rig.session, 20);
            rig.push("vector", tensorOf(jittered([0, 1, 2], rand)));
            rig.node.fire(rig.session, 21);
            expect(warn).toHaveBeenCalledTimes(2);
        } finally {
            warn.mockRestore();
        }
    });
});
