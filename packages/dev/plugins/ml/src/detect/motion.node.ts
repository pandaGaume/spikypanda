import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, ITensor, Nullable } from "spikypanda-core";
import { MotionWatch } from "./motion.js";

/**
 * Alarm message published on the `alarm` output when an element makes
 * an abnormally large step (topic "REGIME_JUMP") or when its rolling
 * path collapses below the frozen baseline (topic "REGIME_FREEZE").
 * Shape-compatible with the Logic Alert Bus ingest contract
 * (`IAlertMessage`: string topic + severity + payload), so the output
 * wires straight into `Logic.Event:alert-bus`. The severity grammar
 * recognised by the bus is "info" | "warn" | "error"; we use "warn"
 * (anything else would be normalised down to "info" on ingest).
 */
export interface IMotionAlarm {
    topic: string;
    severity: "warn";
    payload: {
        message: string;
        /** Index of the vector component that fired. */
        element: number;
        /** REGIME_JUMP: z_e = |delta_e| / s_e. REGIME_FREEZE: the path
         *  ratio L_e / P_e at the event. */
        score: number;
    };
}

/**
 * Per-element motion watch node (freeze / jump signatures).
 *
 * Wraps `MotionWatch`: each incoming vector advances the per-element
 * step statistics. The first `warmup` vectors freeze a HEALTHY
 * reference (per-element typical step s_e and baseline window path
 * P_e); afterwards every element is tested for an abnormal step
 * (z_e = |delta_e| / s_e above `z_jump`) and for a path collapse
 * (rolling |delta| sum over `window` steps below `freeze_ratio` of
 * P_e). Both signatures are rising-edge latched with hysteresis, so a
 * persistent condition fires exactly ONCE per element; a single fire
 * CAN still emit several alarms for different elements (hence the
 * alarm port's capacity 4).
 *
 * POSITION vs MOVEMENT: this node complements `ML.Cluster:online`. The
 * clusterer detects by position (cosine distance to centroids: sharp
 * regime changes mint profiles, slow drift climbs the anchor
 * staircase); this node detects by movement (dynamics breaks that
 * leave the position continuous) and localizes the fault to a vector
 * component. Run both for full coverage.
 *
 * Elements are the vector components: the caller decides what an
 * element is (a physical channel from a mux or a latent dimension from
 * an encoder); the representation is upstream's job.
 *
 * TOPOLOGY BREAK (documented, pinned by tests): the library throws on
 * a vector length change (fixed topology contract); the node catches
 * it, console.warns ONCE per reset, and re-baselines on the offending
 * vector (it seeds the new warmup). Counters keep their totals.
 *
 * Inputs:
 *   vector       tensor [E], required. One motion step per token.
 *
 * Control inputs:
 *   _rebaseline  any. Any token re-enters warmup at the end of the
 *                next fire (deliberate re-baselining after a known
 *                intervention; control-plane trigger, same pattern as
 *                the clusterer's _recluster: it never gates firing).
 *
 * Outputs:
 *   alarm   any    Alert-Bus-compatible message (severity "warn"):
 *                  topic "REGIME_JUMP" or "REGIME_FREEZE", payload
 *                  { message, element, score }. Burst-capable:
 *                  capacity 4 (several elements can fire in one
 *                  drained burst).
 *   moving  float  optional: published on each processed vector, the
 *                  count of currently NOT-frozen elements (cheap
 *                  liveness signal).
 *
 * Editables: warmup, window (changing either RE-BASELINES: the lib
 * consumes them during warmup, so a clean re-entry is the only honest
 * semantic; totals are kept), freeze_ratio (0 = freeze detection off),
 * z_jump (0 = jump detection off; both retune live like drift_thr).
 * Viewables: jump_count, freeze_count (totals since reset), elements,
 * warmup_done.
 *
 * reset() recreates the watch from the current editables and zeroes
 * the counters: nothing learned survives a session reset.
 */
export class MotionWatchNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "vector", optional: false, type: "tensor" }];
    public override readonly controlInputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "_enable", optional: true, type: "boolean" },
        { slot: "_rebaseline", optional: true, type: "any" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        // alarm bursts: one step can fire several elements (and both
        // signatures), so the default capacity-1 slot would overflow
        // mid-fire; 4 absorbs a realistic burst, mirroring the
        // clusterer's alarm port.
        { slot: "alarm", optional: false, type: "any", capacity: 4 },
        { slot: "moving", optional: true, type: "float" },
    ];

    // Defaults mirror the MotionWatch library defaults (see motion.ts).
    @cloneable private _warmup: number = 64;
    @cloneable private _window: number = 16;
    @cloneable private _freezeRatio: number = 0.1;
    @cloneable private _zJump: number = 6;

    // Viewable-backing fields, mutated via setField so the LiveBinder
    // propagates each change to the property panel.
    @cloneable private _jumpCount: number = 0;
    @cloneable private _freezeCount: number = 0;
    @cloneable private _elements: number = 0;
    @cloneable private _warmupDone: boolean = false;

    // Runtime state: rebuilt from the editables on reset(). The
    // freeze_ratio / z_jump setters push into the live instance
    // (threshold retune must not erase the baseline); the warmup /
    // window setters re-baseline instead (documented above).
    private _watch: MotionWatch = new MotionWatch();

    // Latched by processControlInputs when a _rebaseline token arrives;
    // honoured (and cleared) by fire() AFTER the tick's steps.
    private _pendingRebaseline: boolean = false;

    // One console.warn per reset for the topology-break recovery path
    // (the re-baseline itself happens on every break).
    private _topologyWarned: boolean = false;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /** Vectors consumed before the reference freezes. Changing it
     *  RE-BASELINES (re-enters warmup); counter totals are kept. */
    @editable("number", { unit: "samples" })
    public get warmup(): number {
        return this._warmup;
    }
    public set warmup(v: number) {
        const next = Math.max(8, Math.floor(v));
        this.setField("warmup", this._warmup, next, (n) => {
            this._warmup = n;
            this._watch.warmup = n;
            this._rebaseline();
        });
    }

    /** Rolling path window, in steps. Changing it RE-BASELINES
     *  (re-enters warmup); counter totals are kept. */
    @editable("number", { unit: "steps" })
    public get window(): number {
        return this._window;
    }
    public set window(v: number) {
        const next = Math.max(2, Math.floor(v));
        this.setField("window", this._window, next, (n) => {
            this._window = n;
            this._watch.window = n;
            this._rebaseline();
        });
    }

    /** Freeze fires when an element's rolling path drops below
     *  freeze_ratio * P_e. 0 disables freeze detection. Live retune,
     *  like the clusterer's thresholds (no baseline erasure). */
    @editable("number")
    public get freeze_ratio(): number {
        return this._freezeRatio;
    }
    public set freeze_ratio(v: number) {
        const next = Math.max(0, v);
        this.setField("freeze_ratio", this._freezeRatio, next, (n) => {
            this._freezeRatio = n;
            this._watch.freezeRatio = n;
        });
    }

    /** Jump fires when an element's z = |delta| / s_e exceeds this.
     *  0 disables jump detection. Live retune. */
    @editable("number")
    public get z_jump(): number {
        return this._zJump;
    }
    public set z_jump(v: number) {
        const next = Math.max(0, v);
        this.setField("z_jump", this._zJump, next, (n) => {
            this._zJump = n;
            this._watch.zJump = n;
        });
    }

    /** Total REGIME_JUMP events since the last reset. */
    @viewable("number")
    public get jump_count(): number {
        return this._jumpCount;
    }

    /** Total REGIME_FREEZE events since the last reset. */
    @viewable("number")
    public get freeze_count(): number {
        return this._freezeCount;
    }

    /** Current element count (0 before the first vector). */
    @viewable("number")
    public get elements(): number {
        return this._elements;
    }

    /** True once the reference froze (false during any warmup). */
    @viewable("boolean")
    public get warmup_done(): boolean {
        return this._warmupDone;
    }

    /** Diagnostics seam: the live watch (scales, latches). Replaced
     *  wholesale by reset(); re-read after a reset. */
    public get watch(): MotionWatch {
        return this._watch;
    }

    public override reset(_session: ISession): void {
        // Erase the watch state entirely (reference + rings). Rebuilt
        // from the current editables so a tuned graph resumes with its
        // tuning. Counters are zeroed: only reset() does that.
        this._watch = new MotionWatch({
            warmup: this._warmup,
            window: this._window,
            freezeRatio: this._freezeRatio,
            zJump: this._zJump,
        });
        this._pendingRebaseline = false;
        this._topologyWarned = false;
        this.setField("jump_count", this._jumpCount, 0, (n) => {
            this._jumpCount = n;
        });
        this.setField("freeze_count", this._freezeCount, 0, (n) => {
            this._freezeCount = n;
        });
        this.setField("elements", this._elements, 0, (n) => {
            this._elements = n;
        });
        this.setField("warmup_done", this._warmupDone, false, (n) => {
            this._warmupDone = n;
        });
    }

    /** Drains the _rebaseline control input (state-mutating trigger,
     *  control-plane convention: it must never gate the firing) into
     *  the pending flag fire() honours. */
    public override processControlInputs(session: ISession): void {
        super.processControlInputs(session);
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (inSlotOf(link) !== "_rebaseline") continue;
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                session.consume(idx);
                this._pendingRebaseline = true;
            }
        }
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Vectors are stepped in arrival order, then a single pending
        // re-baseline runs AFTER the steps (mirroring the clusterer's
        // recluster ordering: the intervention token closes the tick).
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            if (inSlotOf(link) !== "vector") continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                const v = vectorOf(session.consume(idx));
                if (v === null) continue;
                this._stepOne(session, v);
            }
        }
        if (this._pendingRebaseline) {
            this._pendingRebaseline = false;
            this._rebaseline();
        }
    }

    /** Step one vector through the watch and publish the per-step
     *  outputs. Alarm objects are only allocated on the rare event
     *  paths; the latches in the lib guarantee at most one token per
     *  (element, signature) rising edge.
     *
     *  Topology break recovery (pinned by tests): a length change makes
     *  the lib throw; the node catches, warns once per reset, and
     *  re-baselines with the offending vector seeding the new warmup. */
    private _stepOne(session: ISession, vector: ArrayLike<number>): void {
        let r;
        try {
            r = this._watch.step(vector);
        } catch (err) {
            if (!this._topologyWarned) {
                this._topologyWarned = true;
                // eslint-disable-next-line no-console
                console.warn(`MotionWatchNode: ${err instanceof Error ? err.message : String(err)}; re-baselining on the new shape`);
            }
            this._watch.reset();
            r = this._watch.step(vector);
        }

        for (const ev of r.events) {
            if (ev.kind === "jump") {
                const alarm: IMotionAlarm = {
                    topic: "REGIME_JUMP",
                    severity: "warn",
                    payload: {
                        message: `REGIME_JUMP element=${ev.element} z=${ev.score.toFixed(2)}`,
                        element: ev.element,
                        score: ev.score,
                    },
                };
                this._publishOn(session, "alarm", alarm);
                this.setField("jump_count", this._jumpCount, this._jumpCount + 1, (n) => {
                    this._jumpCount = n;
                });
            } else {
                const alarm: IMotionAlarm = {
                    topic: "REGIME_FREEZE",
                    severity: "warn",
                    payload: {
                        message: `REGIME_FREEZE element=${ev.element} ratio=${ev.score.toFixed(4)}`,
                        element: ev.element,
                        score: ev.score,
                    },
                };
                this._publishOn(session, "alarm", alarm);
                this.setField("freeze_count", this._freezeCount, this._freezeCount + 1, (n) => {
                    this._freezeCount = n;
                });
            }
        }

        this._publishOn(session, "moving", this._watch.movingCount);
        this.setField("elements", this._elements, this._watch.elementCount, (n) => {
            this._elements = n;
        });
        this.setField("warmup_done", this._warmupDone, this._watch.warmupDone, (n) => {
            this._warmupDone = n;
        });
    }

    /** Re-enter warmup on the live watch (deliberate re-baselining:
     *  after a known intervention or a structural retune). Counters
     *  keep their totals; only reset() zeroes them. */
    private _rebaseline(): void {
        this._watch.reset();
        this.setField("warmup_done", this._warmupDone, false, (n) => {
            this._warmupDone = n;
        });
    }

    /** Broadcast `value` on every enabled output channel bound to `slot`. */
    private _publishOn(session: ISession, slot: string, value: unknown): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== slot || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, value);
        }
    }
}

/** Lenient vector reader (replicates the clusterer's embeddingOf, which
 *  is module-private there): accepts an ITensor (canonical, with any
 *  numeric array-like `data`: typed array or plain number[]), a bare
 *  typed array, or a plain number[]. Returns null for anything else so
 *  a stray token cannot corrupt the baseline. The token is already
 *  consumed when we get here, so silently dropping e.g. a
 *  Float64Array-backed tensor would make a miswired pipeline look
 *  dead; accept every numeric layout instead. */
function vectorOf(raw: unknown): Nullable<ArrayLike<number>> {
    if (raw === null || raw === undefined) return null;
    if (raw instanceof Float32Array || raw instanceof Float64Array) return raw;
    if (Array.isArray(raw)) return raw as number[];
    const t = raw as ITensor;
    if (ArrayBuffer.isView(t.data) || Array.isArray(t.data)) return t.data as ArrayLike<number>;
    return null;
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createMotionWatchNode(): MotionWatchNode {
    return new MotionWatchNode();
}
