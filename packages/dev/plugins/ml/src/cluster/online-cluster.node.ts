import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, ITensor, Nullable } from "spikypanda-core";
import { OnlineClusterer } from "./clustering.js";

/**
 * Alarm message published on the `alarm` output when a NEW regime is
 * discovered (topic "NEW_REGIME") or when a tracked profile drifted
 * past `drift_thr` from its anchor (topic "REGIME_DRIFT"). Shape-
 * compatible with the Logic Alert Bus ingest contract (`IAlertMessage`:
 * string topic + severity + payload), so the output wires straight into
 * `Logic.Event:alert-bus`. The severity grammar recognised by the bus
 * is "info" | "warn" | "error"; we use "warn" (anything else would be
 * normalised down to "info" on ingest).
 */
export interface IClusterAlarm {
    topic: string;
    severity: "warn";
    payload: {
        message: string;
        k: number;
        label: number;
        distance: number;
        /** REGIME_DRIFT only: the cluster's drift events since its
         *  anchor was first laid down (staircase step number). */
        driftSteps?: number;
    };
}

/**
 * Open-set online clustering node.
 *
 * Wraps the ported driverv2 `OnlineClusterer`: each incoming embedding
 * tensor is assigned to the nearest cosine centroid; above `assign_thr`
 * a NEW profile is created (open-set: k is unbounded online), below
 * `update_thr` the matched centroid is EMA-updated (jitter absorption).
 * A token on the `_recluster` control input runs the batch agglomerative
 * merge over the retained history (absolute `link_thr` cut, bounded by
 * `k_max`) to recover from online over-segmentation.
 *
 * DRIFT ANCHORS (boiling-frog detection): the EMA update follows a
 * slow derangement step by step, so wear never grows the assign
 * distance. Each profile keeps an anchor snapshot of its centroid;
 * when the tracking centroid moves more than `drift_thr` (cosine) from
 * the anchor, ONE `alarm` token with topic "REGIME_DRIFT" is published
 * and the profile re-anchors: a continuous slow drift produces a
 * regular staircase of alarms instead of silence. `drift_thr` 0 turns
 * the feature off; a recluster re-baselines every anchor.
 *
 * PORT RENAME NOTE: the recluster trigger used to be a data input named
 * `recluster`. Wired that way, the scheduler counted it toward the
 * required-inputs gate, so the node only fired on ticks where an
 * embedding AND a recluster token coincided; embedding-only ticks then
 * overflowed the capacity-1 embedding slot and crashed the session. It
 * now lives in the control plane as `_recluster` (platform convention
 * for state-mutating triggers, see Logic.Flow): drained by
 * `processControlInputs` into a pending flag that `fire()` honours
 * AFTER the tick's assignments.
 *
 * CONTRACT, identical to the driverv2 api: local labels are NEVER
 * stable identifiers. A recluster freely renumbers every profile, so
 * downstream consumers must treat `label` as a session-local index,
 * not a persistent identity.
 *
 * Inputs:
 *   embedding   tensor [E], required. One assignment per token.
 *
 * Control inputs:
 *   _recluster  any. Any token triggers a batch recluster at the end
 *               of the next fire (after the assignments of that tick).
 *
 * Outputs:
 *   label       float    assigned cluster index (session-local), one
 *                        token per assignment
 *   is_new      boolean  true when this assignment created a profile
 *   distance    float    cosine distance to the matched centroid
 *   k           float    current number of profiles, published AT MOST
 *                        ONCE per fire with the final value (after any
 *                        recluster, where it may DECREASE), so a
 *                        coincident assignment + recluster cannot
 *                        overflow a capacity-1 downstream slot
 *   alarm       any      Alert-Bus-compatible message (severity "warn"):
 *                        topic "NEW_REGIME" when is_new is true, topic
 *                        "REGIME_DRIFT" when the matched profile drifted
 *                        past drift_thr from its anchor (payload then
 *                        carries driftSteps). Burst-capable: capacity 4.
 *
 * Editables: assign_thr, update_thr, drift_thr (0 = drift detection
 * off), alpha, link_thr, k_max, history_max. Viewables: k, last_label,
 * last_distance, drift_count.
 *
 * reset() recreates the clusterer from the current editables, erasing
 * every centroid, anchor and the whole history: the erasable-profiles
 * privacy promise (nothing learned survives a session reset).
 */
export class OnlineClusterNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "embedding", optional: false, type: "tensor" }];
    public override readonly controlInputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "_enable", optional: true, type: "boolean" },
        { slot: "_recluster", optional: true, type: "any" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "label", optional: false, type: "float" },
        { slot: "is_new", optional: false, type: "boolean" },
        { slot: "distance", optional: false, type: "float" },
        { slot: "k", optional: false, type: "float" },
        // alarm bursts: a single fire draining several embeddings can
        // publish one token per assignment (NEW_REGIME or REGIME_DRIFT),
        // so the default capacity-1 slot would overflow mid-fire; 4
        // absorbs a realistic burst the way SampleSource-style ports do.
        { slot: "alarm", optional: false, type: "any", capacity: 4 },
    ];

    // Defaults mirror the calibrated V2 trip-profile values that
    // OnlineClusterer itself defaults to (see clustering.ts).
    @cloneable private _assignThr: number = 0.05;
    @cloneable private _updateThr: number = 0.02;
    @cloneable private _driftThr: number = 0.1;
    @cloneable private _alpha: number = 0.15;
    @cloneable private _linkThr: number = 0.06;
    @cloneable private _kMax: number = 4;
    @cloneable private _historyMax: number = 512;

    // Viewable-backing fields, mutated via setField so the LiveBinder
    // propagates each assignment to the property panel.
    @cloneable private _k: number = 0;
    @cloneable private _lastLabel: number = -1;
    @cloneable private _lastDistance: number = 0;
    @cloneable private _driftCount: number = 0;

    // Runtime state: rebuilt from the editables on reset(). Editable
    // setters push into the live instance so retuning thresholds does
    // not erase the learned profiles.
    private _clusterer: OnlineClusterer = new OnlineClusterer();

    // Latched by processControlInputs when a _recluster token arrives;
    // honoured (and cleared) by fire() AFTER the tick's assignments so
    // the batch sees every embedding delivered this tick. Survives an
    // embedding-less tick: the recluster then runs on the next fire.
    private _pendingRecluster: boolean = false;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /** Above this cosine distance to every centroid, a NEW profile is created. */
    @editable("number")
    public get assign_thr(): number {
        return this._assignThr;
    }
    public set assign_thr(v: number) {
        const next = Math.max(0, v);
        this.setField("assign_thr", this._assignThr, next, (n) => {
            this._assignThr = n;
            this._clusterer.assignThr = n;
        });
    }

    /** Stricter threshold gating the EMA centroid update (jitter
     *  absorption; the anchor below covers the drift it cannot). */
    @editable("number")
    public get update_thr(): number {
        return this._updateThr;
    }
    public set update_thr(v: number) {
        const next = Math.max(0, v);
        this.setField("update_thr", this._updateThr, next, (n) => {
            this._updateThr = n;
            this._clusterer.updateThr = n;
        });
    }

    /** Cosine distance a tracking centroid may move from its anchor
     *  snapshot before a REGIME_DRIFT alarm fires and the profile
     *  re-anchors (staircase). 0 disables drift detection. Live retune,
     *  like the other thresholds (no profile erasure). */
    @editable("number")
    public get drift_thr(): number {
        return this._driftThr;
    }
    public set drift_thr(v: number) {
        const next = Math.max(0, v);
        this.setField("drift_thr", this._driftThr, next, (n) => {
            this._driftThr = n;
            this._clusterer.driftThr = n;
        });
    }

    /** EMA inertia (small = stable centroids). */
    @editable("number")
    public get alpha(): number {
        return this._alpha;
    }
    public set alpha(v: number) {
        const next = Math.min(1, Math.max(0, v));
        this.setField("alpha", this._alpha, next, (n) => {
            this._alpha = n;
            this._clusterer.alpha = n;
        });
    }

    /** Absolute cosine-distance cut for the batch agglomerative merge. */
    @editable("number")
    public get link_thr(): number {
        return this._linkThr;
    }
    public set link_thr(v: number) {
        const next = Math.max(0, v);
        this.setField("link_thr", this._linkThr, next, (n) => {
            this._linkThr = n;
        });
    }

    /** Upper bound on the number of profiles a recluster may keep. */
    @editable("number")
    public get k_max(): number {
        return this._kMax;
    }
    public set k_max(v: number) {
        const next = Math.max(1, Math.floor(v));
        this.setField("k_max", this._kMax, next, (n) => {
            this._kMax = n;
        });
    }

    /** Retained-history bound (oldest entries dropped first). A
     *  reduction takes effect on the next assignment. */
    @editable("number", { unit: { quantity: "Count", unit: "samples" } })
    public get history_max(): number {
        return this._historyMax;
    }
    public set history_max(v: number) {
        const next = Math.max(1, Math.floor(v));
        this.setField("history_max", this._historyMax, next, (n) => {
            this._historyMax = n;
            this._clusterer.historyMax = n;
        });
    }

    /** Current number of profiles (centroids). */
    @viewable("number")
    public get k(): number {
        return this._k;
    }

    /** Label of the most recent assignment (-1 before the first one).
     *  Session-local index, never a stable identifier. */
    @viewable("number")
    public get last_label(): number {
        return this._lastLabel;
    }

    /** Cosine distance of the most recent assignment. */
    @viewable("number")
    public get last_distance(): number {
        return this._lastDistance;
    }

    /** Total REGIME_DRIFT events since the last reset (all profiles). */
    @viewable("number")
    public get drift_count(): number {
        return this._driftCount;
    }

    /** Diagnostics seam: the live clusterer (history, centroids).
     *  Replaced wholesale by reset(); re-read after a reset. */
    public get clusterer(): OnlineClusterer {
        return this._clusterer;
    }

    public override reset(_session: ISession): void {
        // Erase the clusterer state entirely (centroids + history):
        // the erasable-profiles privacy promise. Rebuilt from the
        // current editables so a tuned graph resumes with its tuning.
        this._clusterer = new OnlineClusterer({
            assignThr: this._assignThr,
            updateThr: this._updateThr,
            alpha: this._alpha,
            historyMax: this._historyMax,
            driftThr: this._driftThr,
        });
        this._pendingRecluster = false;
        this.setField("k", this._k, 0, (n) => {
            this._k = n;
        });
        this.setField("last_label", this._lastLabel, -1, (n) => {
            this._lastLabel = n;
        });
        this.setField("last_distance", this._lastDistance, 0, (n) => {
            this._lastDistance = n;
        });
        this.setField("drift_count", this._driftCount, 0, (n) => {
            this._driftCount = n;
        });
    }

    /** Drains the _recluster control input (state-mutating trigger,
     *  control-plane convention: it must never gate the firing) into
     *  the pending flag fire() honours. */
    public override processControlInputs(session: ISession): void {
        super.processControlInputs(session);
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (inSlotOf(link) !== "_recluster") continue;
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                session.consume(idx);
                this._pendingRecluster = true;
            }
        }
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Embeddings are assigned in arrival order, then a single
        // pending recluster runs AFTER the assignments so the batch
        // sees every embedding delivered this tick.
        let mutated = false;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            if (inSlotOf(link) !== "embedding") continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                const e = embeddingOf(session.consume(idx));
                if (e === null) continue;
                this._assignOne(session, e);
                mutated = true;
            }
        }
        if (this._pendingRecluster) {
            this._pendingRecluster = false;
            this._runRecluster(session);
            mutated = true;
        }
        // k is published AT MOST ONCE per fire, deferred past any
        // recluster so the single token carries the final value (a
        // per-assignment publish followed by a recluster re-publish
        // would overflow a capacity-1 downstream slot).
        if (mutated) {
            this._publishOn(session, "k", this._clusterer.centroids.length);
        }
    }

    /** Assign one embedding and publish the per-assignment outputs
     *  (k is NOT published here; fire() publishes it once at the end).
     *  Alarm objects are only allocated on the rare is_new / drift
     *  paths. An assignment is never both: drift is only checked on
     *  matches to an EXISTING profile, so one assignment yields at most
     *  one alarm token (a multi-embedding fire can still burst several;
     *  the alarm port advertises capacity 4 for exactly that). */
    private _assignOne(session: ISession, embedding: ArrayLike<number>): void {
        const r = this._clusterer.assign(embedding);
        const k = this._clusterer.centroids.length;

        this._publishOn(session, "label", r.label);
        this._publishOn(session, "is_new", r.isNew);
        this._publishOn(session, "distance", r.distance);
        if (r.isNew) {
            const alarm: IClusterAlarm = {
                topic: "NEW_REGIME",
                severity: "warn",
                payload: {
                    message: `NEW_REGIME k=${k} label=${r.label}`,
                    k,
                    label: r.label,
                    distance: r.distance,
                },
            };
            this._publishOn(session, "alarm", alarm);
        }
        if (r.drift) {
            // Staircase drift event: the matched profile's tracking
            // centroid moved another drift_thr past its anchor (which
            // assign() already refreshed). payload.distance is the
            // centroid-to-anchor distance, NOT the assign distance.
            const alarm: IClusterAlarm = {
                topic: "REGIME_DRIFT",
                severity: "warn",
                payload: {
                    message: `REGIME_DRIFT label=${r.label} step=${r.drift.steps} distance=${r.drift.distance.toFixed(4)}`,
                    k,
                    label: r.label,
                    distance: r.drift.distance,
                    driftSteps: r.drift.steps,
                },
            };
            this._publishOn(session, "alarm", alarm);
            this.setField("drift_count", this._driftCount, this._driftCount + 1, (n) => {
                this._driftCount = n;
            });
        }

        this.setField("k", this._k, k, (n) => {
            this._k = n;
        });
        this.setField("last_label", this._lastLabel, r.label, (n) => {
            this._lastLabel = n;
        });
        this.setField("last_distance", this._lastDistance, r.distance, (n) => {
            this._lastDistance = n;
        });
    }

    /** Batch recluster over the retained history; centroids and history
     *  labels are remapped in place (the possibly smaller k reaches the
     *  wire via fire()'s single end-of-fire publication). Labels are
     *  renumbered freely here: they are never stable identifiers
     *  (driverv2 contract). */
    private _runRecluster(_session: ISession): void {
        const { labels, k } = this._clusterer.reclusterHistory({ linkThr: this._linkThr, kMax: this._kMax });
        this.setField("k", this._k, k, (n) => {
            this._k = n;
        });
        const last = labels.length > 0 ? labels[labels.length - 1] : -1;
        this.setField("last_label", this._lastLabel, last, (n) => {
            this._lastLabel = n;
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

/** Lenient embedding reader: accepts an ITensor (canonical, with any
 *  numeric array-like `data`: typed array or plain number[]), a bare
 *  typed array, or a plain number[]. Returns null for anything else
 *  so a stray token cannot corrupt the profile set. The token is
 *  already consumed when we get here, so silently dropping e.g. a
 *  Float64Array-backed tensor would make a miswired pipeline look
 *  dead; accept every numeric layout instead. */
function embeddingOf(raw: unknown): Nullable<ArrayLike<number>> {
    if (raw === null || raw === undefined) return null;
    if (raw instanceof Float32Array || raw instanceof Float64Array) return raw;
    if (Array.isArray(raw)) return raw as number[];
    const t = raw as ITensor;
    if (ArrayBuffer.isView(t.data) || Array.isArray(t.data)) return t.data as ArrayLike<number>;
    return null;
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createOnlineClusterNode(): OnlineClusterNode {
    return new OnlineClusterNode();
}
