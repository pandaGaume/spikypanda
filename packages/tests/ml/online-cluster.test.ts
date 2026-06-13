/**
 * Tests for the ML plugin (@spikypanda/plugin-ml): the ported open-set
 * clustering library and the ML.Cluster:online editor node.
 *
 *   - emergence: three well-separated embedding families produce exactly
 *     3 profiles (is_new fires exactly 3 times);
 *   - stability: a tight single family never over-segments online;
 *   - recovery: a recluster token merges an artificially over-segmented
 *     history back to the true k, and k_max bounds the merge;
 *   - boundedness: the history ring respects history_max;
 *   - privacy: reset() erases every learned profile;
 *   - parity: the pure lib keeps the driverv2 assign semantics;
 *   - wire contract: the alarm output is accepted verbatim by the Logic
 *     Alert Bus at "warn" severity (not normalised down to "info");
 *   - drift anchors: the boiling-frog regression pin (drift_thr 0 keeps
 *     the old EMA-following silence), the REGIME_DRIFT staircase on a
 *     slow derangement, step changes and benign jitter never drifting,
 *     and recluster re-baselining the anchors.
 */
import type { IChannel, IPortDescriptor, ISession } from "spikypanda-core";
import { Channel, RuntimeGraphBuilder, RuntimeNode, Session } from "spikypanda-core";
import { OnlineClusterNode, OnlineClusterer, cosDist, l2norm, recluster } from "../../dev/plugins/ml/src/index";
import type { IClusterAlarm } from "../../dev/plugins/ml/src/index";
import { AlertBusNode } from "../../dev/plugins/logic/src/event/alert-bus.node";

// ---------------------------------------------------------------------------
// Harness: a node wired through real Channels to dummy endpoints, driven
// by a mock session whose linkStates mirror per-link FIFO queues.
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

function makeClusterRig(): IRig<OnlineClusterNode> {
    return makeRig(new OnlineClusterNode(), ["embedding", "_recluster"], ["label", "is_new", "distance", "k", "alarm"]);
}

function tensorOf(vec: number[]): { data: Float32Array; shape: number[] } {
    return { data: Float32Array.from(vec), shape: [vec.length] };
}

// ---------------------------------------------------------------------------
// Synthetic 16-d embeddings: three near-orthogonal block prototypes plus
// deterministic LCG noise (reproducible across runs).
// ---------------------------------------------------------------------------

const DIM = 16;

function blockProto(from: number, to: number): number[] {
    return Array.from({ length: DIM }, (_, i) => (i >= from && i < to ? 1 : 0));
}

const PROTO_A = blockProto(0, 5);
const PROTO_B = blockProto(5, 11);
const PROTO_C = blockProto(11, 16);

function makeLcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000 - 0.5;
    };
}

function noisy(proto: number[], eps: number, rand: () => number): number[] {
    return proto.map((v) => v + eps * rand());
}

function oneHot(dim: number): number[] {
    const v = new Array(DIM).fill(0);
    v[dim] = 1;
    return v;
}

/** Unit-norm direction rotated by `theta` (radians) in the plane
 *  spanned by normalized PROTO_A (dims 0..4) and the orthogonal one-hot
 *  dim 8: a deterministic model of a slowly deranging machine. The
 *  cosine distance between two points on the path is 1 - cos(dTheta),
 *  i.e. QUADRATIC in angle for small steps, which is exactly why a slow
 *  drift stays under update_thr forever while the total excursion grows
 *  without bound. */
function rotated(theta: number): number[] {
    const v = new Array(DIM).fill(0);
    const u0 = 1 / Math.sqrt(5);
    for (let i = 0; i < 5; i++) v[i] = Math.cos(theta) * u0;
    v[8] = Math.sin(theta);
    return v;
}

// ---------------------------------------------------------------------------
// Pure library parity with the driverv2 semantics
// ---------------------------------------------------------------------------

describe("OnlineClusterer (ported lib)", () => {
    it("defaults to the calibrated V2 trip-profile thresholds", () => {
        const oc = new OnlineClusterer();
        expect(oc.assignThr).toBe(0.05);
        expect(oc.updateThr).toBe(0.02);
        expect(oc.alpha).toBe(0.15);
        expect(oc.historyMax).toBe(512);
        expect(oc.driftThr).toBe(0.1); // 2x assignThr: anchor staircase step
    });

    it("first assign matches driverv2 semantics: label 0, isNew true, distance 0", () => {
        const oc = new OnlineClusterer();
        const r = oc.assign(PROTO_A);
        expect(r.label).toBe(0);
        expect(r.isNew).toBe(true);
        expect(r.distance).toBe(0);
        expect(oc.centroids.length).toBe(1);
        expect(oc.history.length).toBe(1);
    });

    it("bounds the history as a ring: oldest entries dropped first", () => {
        const oc = new OnlineClusterer({ assignThr: 0.05, historyMax: 5 });
        // 12 mutually orthogonal one-hots: each spawns its own label i,
        // so the surviving history labels reveal which entries were kept.
        for (let i = 0; i < 12; i++) {
            oc.assign(oneHot(i));
        }
        expect(oc.history.length).toBe(5);
        expect(oc.history.map((h) => h.label)).toEqual([7, 8, 9, 10, 11]);
        // Centroids are NOT bounded by historyMax (profiles persist).
        expect(oc.centroids.length).toBe(12);
    });

    it("reclusterHistory remaps labels and rebuilds centroids in place", () => {
        const rand = makeLcg(7);
        const oc = new OnlineClusterer({ assignThr: 1e-6 });
        for (let i = 0; i < 10; i++) {
            oc.assign(noisy(PROTO_A, 0.02, rand));
        }
        expect(oc.centroids.length).toBeGreaterThan(3); // over-segmented
        const { labels, k } = oc.reclusterHistory();
        expect(k).toBe(1);
        expect(labels.every((l) => l === 0)).toBe(true);
        expect(oc.centroids.length).toBe(1);
        expect(oc.history.every((h) => h.label === 0)).toBe(true);
    });

    it("recluster respects kMax even below the link threshold", () => {
        const X = Array.from({ length: 10 }, (_, i) => oneHot(i));
        const { k } = recluster(X, { linkThr: 1e-9, kMax: 4 });
        expect(k).toBe(4);
    });
});

// ---------------------------------------------------------------------------
// Node: open-set emergence
// ---------------------------------------------------------------------------

describe("OnlineClusterNode: open-set emergence", () => {
    it("three well-separated families produce 3 labels and is_new exactly 3 times", () => {
        const rig = makeClusterRig();
        rig.node.reset(rig.session);
        const rand = makeLcg(42);
        const protos = [PROTO_A, PROTO_B, PROTO_C];
        let t = 0;
        for (const proto of protos) {
            for (let i = 0; i < 8; i++) {
                rig.push("embedding", tensorOf(noisy(proto, 0.02, rand)));
                rig.node.fire(rig.session, t++);
            }
        }
        expect(rig.published.is_new).toHaveLength(24);
        expect(rig.published.is_new.filter((v) => v === true)).toHaveLength(3);
        expect(new Set(rig.published.label)).toEqual(new Set([0, 1, 2]));
        expect(rig.node.k).toBe(3);
        expect(rig.published.k[rig.published.k.length - 1]).toBe(3);
        // One alarm per discovered regime, none for re-assignments.
        expect(rig.published.alarm).toHaveLength(3);
    });

    it("a tight single family keeps k at 1", () => {
        const rig = makeClusterRig();
        rig.node.reset(rig.session);
        const rand = makeLcg(99);
        for (let i = 0; i < 20; i++) {
            rig.push("embedding", tensorOf(noisy(PROTO_A, 0.02, rand)));
            rig.node.fire(rig.session, i);
        }
        expect(rig.node.k).toBe(1);
        expect(rig.published.is_new.filter((v) => v === true)).toHaveLength(1);
        expect(rig.published.alarm).toHaveLength(1);
        expect(rig.node.last_label).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Node: batch recluster recovery + k_max
// ---------------------------------------------------------------------------

describe("OnlineClusterNode: recluster", () => {
    it("merges an over-segmented history back to k=1 (default link_thr)", () => {
        const rig = makeClusterRig();
        rig.node.reset(rig.session);
        // Artificially low assign_thr: every noisy duplicate spawns a
        // new profile, the canonical online over-segmentation failure.
        rig.node.assign_thr = 1e-6;
        const rand = makeLcg(3);
        for (let i = 0; i < 10; i++) {
            rig.push("embedding", tensorOf(noisy(PROTO_A, 0.02, rand)));
            rig.node.fire(rig.session, i);
        }
        expect(rig.node.k).toBeGreaterThan(3);

        // Control-plane trigger: drained by processControlInputs (the
        // scheduler calls it before the ready-check), honoured by the
        // next fire().
        rig.push("_recluster", 1);
        rig.node.processControlInputs(rig.session);
        rig.node.fire(rig.session, 10);
        expect(rig.node.k).toBe(1);
        expect(rig.published.k[rig.published.k.length - 1]).toBe(1);
        expect(rig.node.clusterer.history.every((h) => h.label === 0)).toBe(true);
        expect(rig.node.last_label).toBe(0);
    });

    it("respects k_max when the link threshold alone would not merge", () => {
        const rig = makeClusterRig();
        rig.node.reset(rig.session);
        rig.node.link_thr = 1e-9;
        rig.node.k_max = 4;
        for (let i = 0; i < 10; i++) {
            rig.push("embedding", tensorOf(oneHot(i))); // pairwise cos dist 1
            rig.node.fire(rig.session, i);
        }
        expect(rig.node.k).toBe(10);

        rig.push("_recluster", "go");
        rig.node.processControlInputs(rig.session);
        rig.node.fire(rig.session, 10);
        expect(rig.node.k).toBe(4);
        expect(rig.node.clusterer.centroids.length).toBe(4);
    });
});

// ---------------------------------------------------------------------------
// Node: bounded history + reset
// ---------------------------------------------------------------------------

describe("OnlineClusterNode: bounded state and reset", () => {
    it("history never exceeds history_max", () => {
        const rig = makeClusterRig();
        rig.node.reset(rig.session);
        rig.node.history_max = 8;
        const rand = makeLcg(5);
        for (let i = 0; i < 20; i++) {
            rig.push("embedding", tensorOf(noisy(PROTO_A, 0.02, rand)));
            rig.node.fire(rig.session, i);
        }
        expect(rig.node.clusterer.history.length).toBe(8);
    });

    it("reset erases every profile: the next assignment is new again", () => {
        const rig = makeClusterRig();
        rig.node.reset(rig.session);
        const rand = makeLcg(11);
        for (let i = 0; i < 5; i++) {
            rig.push("embedding", tensorOf(noisy(PROTO_A, 0.02, rand)));
            rig.node.fire(rig.session, i);
        }
        expect(rig.node.k).toBe(1);

        rig.node.reset(rig.session);
        expect(rig.node.k).toBe(0);
        expect(rig.node.last_label).toBe(-1);
        expect(rig.node.clusterer.history.length).toBe(0);
        expect(rig.node.clusterer.centroids.length).toBe(0);

        rig.push("embedding", tensorOf(noisy(PROTO_A, 0.02, rand)));
        rig.node.fire(rig.session, 5);
        const isNew = rig.published.is_new;
        expect(isNew[isNew.length - 1]).toBe(true);
        expect(rig.node.k).toBe(1);
    });
});

// ---------------------------------------------------------------------------
// Real-Session wiring: the node driven by the actual scheduler
// (RuntimeGraphBuilder + Session), not the mock rig above. Covers the
// control-plane recluster trigger, the once-per-fire k publication on
// the coincident assignment + recluster tick, and the lenient tensor
// data acceptance (any numeric array-like, not just Float32Array).
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

/** Single-input sink draining every queued token (capacity-1 slot). */
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

describe("OnlineClusterNode: real-Session control-plane recluster", () => {
    test("embeddings flow every tick with the recluster trigger wired; the trigger reclusters once and k publishes once on the coincident tick", () => {
        const rand = makeLcg(21);
        const embeddings = Array.from({ length: 10 }, () => tensorOf(noisy(PROTO_A, 0.02, rand)));
        const source = new TokenSource(embeddings);
        const trigger = new TickTrigger([5]);
        const node = new OnlineClusterNode();
        node.assign_thr = 1e-6; // every noisy duplicate spawns a profile
        const labelSink = new TokenSink();
        const kSink = new TokenSink();
        const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>()
            .withMode("dynamic")
            .withNodes(source, trigger, node, labelSink, kSink)
            .withChannel(source, node, "out", "embedding")
            .withChannel(trigger, node, "out", "_recluster")
            .withChannel(node, labelSink, "label", "label")
            .withChannel(node, kSink, "k", "k")
            .build();
        const session = new Session(graph);

        const kSeries: number[] = [];
        for (let t = 0; t < 10; t++) {
            session.run(t);
            kSeries.push(node.k);
        }

        // No deadlock: one assignment per tick made it through even on
        // the nine embedding-only ticks (the trigger gates nothing).
        expect(labelSink.tokens).toHaveLength(10);
        // Online over-segmentation grows k until the trigger tick...
        expect(kSeries.slice(0, 5)).toEqual([1, 2, 3, 4, 5]);
        // ...then the recluster runs exactly once, after tick-5's
        // assignment, merging the history back to a single profile.
        expect(kSeries[5]).toBe(1);
        expect(kSeries.slice(6)).toEqual([2, 3, 4, 5]);
        // k is published AT MOST ONCE per fire: the coincident tick
        // delivered a single token carrying the FINAL (post-recluster)
        // value, so the capacity-1 kSink slot never overflowed.
        expect(kSink.tokens).toEqual([1, 2, 3, 4, 5, 1, 2, 3, 4, 5]);
    });

    test("accepts tensors whose data is any numeric array-like, not just Float32Array", () => {
        const embeddings = [
            { data: Float64Array.from(PROTO_A), shape: [DIM] },
            { data: PROTO_B.slice(), shape: [DIM] },
            { data: Float32Array.from(PROTO_C), shape: [DIM] },
        ];
        const source = new TokenSource(embeddings);
        const node = new OnlineClusterNode();
        const labelSink = new TokenSink();
        const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>()
            .withMode("dynamic")
            .withNodes(source, node, labelSink)
            .withChannel(source, node, "out", "embedding")
            .withChannel(node, labelSink, "label", "label")
            .build();
        const session = new Session(graph);
        for (let t = 0; t < 3; t++) session.run(t);

        // A Float64Array- or number[]-backed tensor must assign like the
        // canonical Float32Array one (the token is consumed either way;
        // dropping it silently makes a miswired pipeline look dead).
        expect(labelSink.tokens).toEqual([0, 1, 2]);
        expect(node.k).toBe(3);
    });
});

// ---------------------------------------------------------------------------
// Alarm: shape + Alert Bus wire compatibility
// ---------------------------------------------------------------------------

describe("OnlineClusterNode: alarm output", () => {
    it("publishes a NEW_REGIME message with warn severity and the k/label payload", () => {
        const rig = makeClusterRig();
        rig.node.reset(rig.session);
        rig.push("embedding", tensorOf(PROTO_A));
        rig.node.fire(rig.session, 0);
        expect(rig.published.alarm).toHaveLength(1);
        const alarm = rig.published.alarm[0] as IClusterAlarm;
        expect(alarm.topic).toBe("NEW_REGIME");
        expect(alarm.severity).toBe("warn");
        expect(alarm.payload.message).toBe("NEW_REGIME k=1 label=0");
        expect(alarm.payload.k).toBe(1);
        expect(alarm.payload.label).toBe(0);
        expect(alarm.payload.distance).toBe(0);
    });

    it("is accepted verbatim by the Logic Alert Bus at warn severity", () => {
        // Produce a real alarm with the cluster node...
        const cluster = makeClusterRig();
        cluster.node.reset(cluster.session);
        cluster.push("embedding", tensorOf(PROTO_B));
        cluster.node.fire(cluster.session, 0);
        const alarm = cluster.published.alarm[0];

        // ...and feed it to a real AlertBusNode: it must pass the bus
        // normaliser unchanged (severity NOT clamped down to "info").
        const bus = makeRig(new AlertBusNode(), ["publish"], ["subscribe"]);
        bus.node.reset(bus.session);
        bus.push("publish", alarm);
        bus.node.fire(bus.session, 0);
        expect(bus.published.subscribe).toHaveLength(1);
        const forwarded = bus.published.subscribe[0] as IClusterAlarm;
        expect(forwarded.topic).toBe("NEW_REGIME");
        expect(forwarded.severity).toBe("warn");
        expect(bus.node.lastSeverity).toBe("warn");
        expect(bus.node.lastTopic).toBe("NEW_REGIME");
    });
});

// ---------------------------------------------------------------------------
// Drift anchors: the boiling-frog blind spot and its staircase fix.
//
// Geometry note used throughout: cosine distance is QUADRATIC in angle
// (1 - cos(x) ~ x^2 / 2), so cosine distances along a path do NOT add
// up. One staircase stair spans an ANGLE of acos(1 - drift_thr) from
// the last anchor, hence the expected stair count for a total rotation
// THETA is floor(THETA / acos(1 - drift_thr)), not totalDist/drift_thr.
// ---------------------------------------------------------------------------

/** Per-step rotation used by the drift feeds: small enough that the
 *  EMA-lagged centroid stays FAR below update_thr of each embedding
 *  (steady-state lag ~ dTheta / alpha ~ 0.014 rad ~ 1e-4 cosine), so
 *  the centroid silently follows: the boiling-frog regime. */
const DRIFT_DTHETA = Math.PI / 1500;

describe("OnlineClusterer / OnlineClusterNode: drift anchors", () => {
    it("REGRESSION PIN: drift_thr 0 reproduces the blind spot: a slow ramp far past assign_thr stays silent at k=1", () => {
        const rig = makeClusterRig();
        rig.node.reset(rig.session);
        rig.node.drift_thr = 0; // the pre-anchor behavior, pinned
        const STEPS = 500; // total rotation PI/3: cos distance 0.5 from start
        for (let i = 0; i <= STEPS; i++) {
            rig.push("embedding", tensorOf(rotated(i * DRIFT_DTHETA)));
            rig.node.fire(rig.session, i);
        }
        // The feed really is a boiling frog: every per-assignment
        // distance stayed under update_thr (the EMA absorbed each step)...
        const distances = rig.published.distance.slice(1) as number[];
        expect(Math.max(...distances)).toBeLessThan(0.02);
        // ...while the total excursion left assign_thr far behind.
        const total = cosDist(l2norm(Float64Array.from(rotated(0))), l2norm(Float64Array.from(rotated(STEPS * DRIFT_DTHETA))));
        expect(total).toBeGreaterThan(0.4);
        // Documented OLD behavior: no regime change is ever detected.
        expect(rig.node.k).toBe(1);
        expect(rig.published.alarm).toHaveLength(1); // profile-0 creation only
        expect((rig.published.alarm[0] as IClusterAlarm).topic).toBe("NEW_REGIME");
        expect(rig.node.drift_count).toBe(0);
    });

    test("real Session: the default drift_thr turns the same slow derangement into a REGIME_DRIFT staircase, k stays 1", () => {
        const STEPS = 1000; // total rotation 2*PI/3 ~ 2.094 rad
        const embeddings = Array.from({ length: STEPS + 1 }, (_, i) => tensorOf(rotated(i * DRIFT_DTHETA)));
        const source = new TokenSource(embeddings);
        const node = new OnlineClusterNode(); // drift_thr default 0.1
        const alarmSink = new TokenSink();
        const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>()
            .withMode("dynamic")
            .withNodes(source, node, alarmSink)
            .withChannel(source, node, "out", "embedding")
            .withChannel(node, alarmSink, "alarm", "alarm")
            .build();
        const session = new Session(graph);
        for (let t = 0; t <= STEPS; t++) session.run(t);

        // No false NEW_REGIME: the drift is too slow for the open set.
        expect(node.k).toBe(1);
        const alarms = alarmSink.tokens as IClusterAlarm[];
        expect(alarms.filter((a) => a.topic === "NEW_REGIME")).toHaveLength(1); // profile 0
        const drifts = alarms.filter((a) => a.topic === "REGIME_DRIFT");

        // Staircase: one stair per acos(1 - 0.1) ~ 0.451 rad of rotation
        // (see the geometry note above), i.e. 4 expected for 2.094 rad;
        // the EMA lag may shave the last partial stair.
        const expected = Math.floor((STEPS * DRIFT_DTHETA) / Math.acos(1 - 0.1));
        expect(drifts.length).toBeGreaterThanOrEqual(expected - 1);
        expect(drifts.length).toBeLessThanOrEqual(expected + 1);
        expect(drifts.length).toBeGreaterThanOrEqual(2); // a trail, not a one-off

        // Each stair re-anchored: driftSteps increments 1, 2, 3, ... and
        // every event distance just crossed the threshold.
        expect(drifts.map((a) => a.payload.driftSteps)).toEqual(drifts.map((_, i) => i + 1));
        for (const a of drifts) {
            expect(a.severity).toBe("warn");
            expect(a.payload.label).toBe(0);
            expect(a.payload.k).toBe(1);
            expect(a.payload.distance).toBeGreaterThan(0.1);
            expect(a.payload.distance).toBeLessThan(0.12); // staircase, not a backlog
            expect(a.payload.message).toBe(`REGIME_DRIFT label=0 step=${a.payload.driftSteps} distance=${a.payload.distance.toFixed(4)}`);
        }
        expect(node.drift_count).toBe(drifts.length);
    });

    it("a clean STEP change still mints NEW_REGIME with no drift alarm", () => {
        const rig = makeClusterRig();
        rig.node.reset(rig.session);
        const rand = makeLcg(17);
        let t = 0;
        for (const proto of [PROTO_A, PROTO_B]) {
            for (let i = 0; i < 30; i++) {
                rig.push("embedding", tensorOf(noisy(proto, 0.02, rand)));
                rig.node.fire(rig.session, t++);
            }
        }
        const topics = (rig.published.alarm as IClusterAlarm[]).map((a) => a.topic);
        expect(topics).toEqual(["NEW_REGIME", "NEW_REGIME"]); // profile 0 + the step
        expect(rig.node.k).toBe(2);
        expect(rig.node.drift_count).toBe(0);
    });

    it("benign jitter around a fixed direction never fires drift over thousands of steps", () => {
        const oc = new OnlineClusterer(); // driftThr default 0.1
        const rand = makeLcg(31);
        let driftEvents = 0;
        for (let i = 0; i < 4000; i++) {
            const r = oc.assign(noisy(PROTO_A, 0.02, rand));
            if (r.drift) driftEvents++;
        }
        expect(oc.centroids.length).toBe(1);
        expect(driftEvents).toBe(0);
        expect(oc.driftSteps[0]).toBe(0);
        // The EMA did its job (absorbed the jitter, centroid near the
        // anchor) without the anchor ever alarming.
        expect(cosDist(oc.centroids[0], oc.anchors[0])).toBeLessThan(0.01);
    });

    it("reclusterHistory re-baselines: fresh anchors, zeroed counters, no drift alarm right after", () => {
        // Bound the history so the recluster runs on the recent arc tail
        // only (pairwise distances within link_thr: merges back to k=1).
        const oc = new OnlineClusterer({ historyMax: 64 });
        let driftEvents = 0;
        const STEPS = 600; // ~1.26 rad: at least two staircase events
        for (let i = 0; i <= STEPS; i++) {
            const r = oc.assign(rotated(i * DRIFT_DTHETA));
            if (r.drift) driftEvents++;
        }
        expect(driftEvents).toBeGreaterThanOrEqual(1);
        expect(oc.driftSteps[0]).toBe(driftEvents);

        const { k } = oc.reclusterHistory();
        expect(k).toBe(1);
        // A recluster is a deliberate re-baselining: the rebuilt cluster
        // anchors at its NEW centroid (own copy) with a zeroed counter.
        expect(oc.driftSteps).toEqual([0]);
        expect(oc.anchors[0]).not.toBe(oc.centroids[0]);
        // Exact copy modulo the l2norm epsilon (1e-9 on the norm makes
        // even a vector's SELF cosine distance ~2e-9, never exactly 0).
        expect(cosDist(oc.centroids[0], oc.anchors[0])).toBeLessThan(1e-6);

        // Resuming the same slow derangement does not fire immediately:
        // the staircase restarts from the fresh anchor.
        for (let i = 1; i <= 20; i++) {
            const r = oc.assign(rotated((STEPS + i) * DRIFT_DTHETA));
            expect(r.drift).toBeUndefined();
        }
    });

    it("REGIME_DRIFT alarms pass the Logic Alert Bus verbatim at warn severity", () => {
        // Produce a real drift alarm with the node...
        const cluster = makeClusterRig();
        cluster.node.reset(cluster.session);
        for (let i = 0; i <= 300; i++) {
            cluster.push("embedding", tensorOf(rotated(i * DRIFT_DTHETA)));
            cluster.node.fire(cluster.session, i);
        }
        const drift = (cluster.published.alarm as IClusterAlarm[]).find((a) => a.topic === "REGIME_DRIFT");
        expect(drift).toBeDefined();

        // ...and feed it to a real AlertBusNode: severity must survive.
        const bus = makeRig(new AlertBusNode(), ["publish"], ["subscribe"]);
        bus.node.reset(bus.session);
        bus.push("publish", drift);
        bus.node.fire(bus.session, 0);
        expect(bus.published.subscribe).toHaveLength(1);
        expect(bus.node.lastTopic).toBe("REGIME_DRIFT");
        expect(bus.node.lastSeverity).toBe("warn");
    });
});
