import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Hysteresis steady-state detector on a scalar stream (e.g. a current
 * RMS or a speed estimate). It is the INVERSE of an event/transient
 * gate: it lets through samples that belong to an ESTABLISHED regime
 * and closes during transients (start-ups, load steps, speed ramps).
 *
 * Typical use: in front of a condition-monitoring feature pipeline,
 * so spectra / statistics are only computed on stationary segments
 * where the fault signatures are interpretable.
 *
 * Mechanics:
 *   - An EMA baseline `m` tracks the (possibly smoothed) input `s`:
 *         m <- emaAlpha * s + (1 - emaAlpha) * m
 *     (seeded with the first sample after reset so the cold start is
 *     not biased toward 0).
 *   - Optional input smoothing: a pre-filter EMA
 *         s <- s + smoothAlpha * (value - s)
 *     (seeded with the first sample after reset, like the baseline)
 *     feeds the stability test and the baseline update INSTEAD OF the
 *     raw sample. The sample FORWARDED on `value_gated` stays the RAW
 *     input: only the gate DECISION is smoothed. Use it when the
 *     solver rate resolves a carrier ripple the gate should not see,
 *     e.g. PWM current ripple at a 20x fPwm derived rate, where a
 *     +/- 6 % ripple exceeds the 5 % epsilon and chatters the gate
 *     shut; 0.005-0.02 is a good range there. The default 1 disables
 *     the stage (s == value, the legacy behavior).
 *   - A sample is STABLE when its (smoothed) deviation from the
 *     baseline is small relative to the baseline magnitude:
 *         |s - m| <= epsilon * max(|m|, 1e-9)
 *     The stability check runs against the PRE-update baseline so a
 *     step change is measured against the previous regime.
 *   - Hysteresis: enter steady after `settle` CONSECUTIVE stable
 *     samples; leave after `breakHold` CONSECUTIVE unstable samples.
 *     The asymmetric thresholds make the gate slow to trust a new
 *     plateau but quick to drop out on a transient.
 *
 * Outputs:
 *   value_gated  the raw input, forwarded only while steady (the
 *                sample that triggers the steady->transient edge is
 *                NOT forwarded; the one that triggers the entry IS).
 *   steady       current regime flag, published on every fire.
 *   transition   one-shot token (`true`) published once on EACH
 *                steady<->transient edge. Mirrors the TimerNode
 *                `_completed` convention: an edge event, not a level.
 *
 * Editables:
 *   epsilon      relative stability threshold            (default 0.05)
 *   settle       stable samples required to enter        (default 20)
 *   breakHold    unstable samples required to leave      (default 3)
 *   emaAlpha     EMA smoothing factor for the baseline   (default 0.05)
 *   smoothAlpha  input-smoothing EMA factor, 1 = off     (default 1)
 */
export class SteadyStateGateNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "value", optional: true, type: "float" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "value_gated", optional: false, type: "float" },
        { slot: "steady", optional: false, type: "boolean" },
        { slot: "transition", optional: true, type: "trigger" },
    ];

    @cloneable private _epsilon: number = 0.05;
    @cloneable private _settle: number = 20;
    @cloneable private _breakHold: number = 3;
    @cloneable private _emaAlpha: number = 0.05;
    @cloneable private _smoothAlpha: number = 1;
    @cloneable private _transitionCount: number = 0;

    // Runtime state. `_hasBaseline` distinguishes the cold start (no
    // sample seen since reset) from a legitimate m == 0 baseline; `_s`
    // is the input-smoothing EMA the decision path runs on.
    private _m: number = 0;
    private _s: number = 0;
    private _hasBaseline: boolean = false;
    private _steady: boolean = false;
    private _stableRun: number = 0;
    private _unstableRun: number = 0;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number")
    public get epsilon(): number {
        return this._epsilon;
    }
    public set epsilon(v: number) {
        const next = Math.max(0, v);
        this.setField("epsilon", this._epsilon, next, (n) => {
            this._epsilon = n;
        });
    }

    @editable("number", { unit: "samples" })
    public get settle(): number {
        return this._settle;
    }
    public set settle(v: number) {
        const next = Math.max(1, Math.floor(v));
        this.setField("settle", this._settle, next, (n) => {
            this._settle = n;
        });
    }

    @editable("number", { unit: "samples" })
    public get breakHold(): number {
        return this._breakHold;
    }
    public set breakHold(v: number) {
        const next = Math.max(1, Math.floor(v));
        this.setField("breakHold", this._breakHold, next, (n) => {
            this._breakHold = n;
        });
    }

    @editable("number")
    public get emaAlpha(): number {
        return this._emaAlpha;
    }
    public set emaAlpha(v: number) {
        // Clamp to (0, 1]: alpha 0 would freeze the baseline forever
        // and silently disable regime tracking.
        const next = Math.min(1, Math.max(1e-6, v));
        this.setField("emaAlpha", this._emaAlpha, next, (n) => {
            this._emaAlpha = n;
        });
    }

    @editable("number")
    public get smoothAlpha(): number {
        return this._smoothAlpha;
    }
    public set smoothAlpha(v: number) {
        // Clamp to (0, 1]: 1 disables the stage (s == value); alpha 0
        // would freeze the smoother on its seed and blind the gate.
        const next = Math.min(1, Math.max(1e-6, v));
        this.setField("smoothAlpha", this._smoothAlpha, next, (n) => {
            this._smoothAlpha = n;
        });
    }

    /** Current regime flag, mirrored for the property panel. */
    @viewable("boolean") public get isSteady(): boolean {
        return this._steady;
    }

    /** Number of steady<->transient edges since last reset(). */
    @viewable("number") public get transitionCount(): number {
        return this._transitionCount;
    }

    /** Current EMA baseline, handy to sanity-check epsilon scaling. */
    @viewable("number") public get baseline(): number {
        return this._m;
    }

    public override reset(_session: ISession): void {
        this._m = 0;
        this._s = 0;
        this._hasBaseline = false;
        this._steady = false;
        this._stableRun = 0;
        this._unstableRun = 0;
        this.setField("transitionCount", this._transitionCount, 0, (n) => {
            this._transitionCount = n;
        });
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Drain every queued scalar on `value` this tick (burst-safe,
        // same ingestion pattern as ScalarBufferNode). Each sample is
        // run through the regime state machine; edges publish on
        // `transition`, open-gate samples forward on `value_gated`.
        let sawSample = false;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (slot !== "value") continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                const v = session.consume(idx);
                if (typeof v !== "number") continue;
                sawSample = true;
                this._processSample(v, session);
            }
        }

        // Publish the regime flag once per fire (not per sample) so a
        // burst can never overflow the capacity-1 `steady` channel.
        if (sawSample) {
            this._broadcast(session, "steady", this._steady);
        }
    }

    /** Run one sample through baseline + hysteresis, publishing the
     *  edge token and the gated value as side effects. */
    private _processSample(value: number, session: ISession): void {
        // Seed the baseline AND the smoother with the first sample so
        // the cold start is immediately "on regime" rather than
        // measured against 0.
        if (!this._hasBaseline) {
            this._m = value;
            this._s = value;
            this._hasBaseline = true;
        }

        // Optional input smoothing: the stability DECISION runs on the
        // EMA `s`, not on the raw sample, so a resolved carrier ripple
        // (PWM at a high derived rate) cannot chatter the gate. With
        // the default smoothAlpha = 1 this reduces to s == value.
        this._s += this._smoothAlpha * (value - this._s);

        // Stability against the PRE-update baseline: a step change is
        // judged against the previous regime, not against a baseline
        // already polluted by the step.
        const stable = Math.abs(this._s - this._m) <= this._epsilon * Math.max(Math.abs(this._m), 1e-9);
        this._m = this._emaAlpha * this._s + (1 - this._emaAlpha) * this._m;

        if (this._steady) {
            if (stable) {
                this._unstableRun = 0;
            } else {
                this._unstableRun++;
                if (this._unstableRun >= this._breakHold) {
                    this._setSteady(false, session);
                }
            }
        } else {
            if (stable) {
                this._stableRun++;
                if (this._stableRun >= this._settle) {
                    this._setSteady(true, session);
                }
            } else {
                this._stableRun = 0;
            }
        }

        // Gate decision AFTER the state update: the sample that
        // completes `settle` is forwarded; the one that completes
        // `breakHold` is not.
        if (this._steady) {
            this._broadcast(session, "value_gated", value);
        }
    }

    /** Flip the regime flag, reset both run counters, and publish a
     *  one-shot token on `transition` (TimerNode `_completed` style). */
    private _setSteady(next: boolean, session: ISession): void {
        this._steady = next;
        this._stableRun = 0;
        this._unstableRun = 0;
        this.setField("transitionCount", this._transitionCount, this._transitionCount + 1, (n) => {
            this._transitionCount = n;
        });
        this._broadcast(session, "transition", true);
    }

    /** Fan out `value` on every outgoing channel bound to `slot`. */
    private _broadcast(session: ISession, slot: string, value: unknown): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== slot || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, value);
        }
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createSteadyStateGateNode(): SteadyStateGateNode {
    return new SteadyStateGateNode();
}
