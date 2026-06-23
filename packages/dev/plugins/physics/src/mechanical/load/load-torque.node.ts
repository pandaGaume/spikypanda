import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Supported load profiles. Encoded as a string-literal union so the
 * editable round-trips through JSON serialisation unchanged and the UI
 * can render a free-form text field today, an enum picker tomorrow,
 * without touching the runtime.
 */
export type LoadProfile = "constant" | "step" | "ramp" | "quadratic" | "periodic";

/**
 * Load torque source: the missing loadTorque generator for motor
 * simulation graphs. Every motor node accepts a `loadTorque` input but
 * nothing in the catalog produced one, so demo graphs either left it
 * unwired (no-load run) or hand-built the law from Logic primitives.
 *
 * The profiles model operating-regime changes (against the node's LOCAL
 * clock — time since the segment was armed, not session time):
 *
 *     constant   tau = baseTorque                          (baseline regime)
 *     step       tau = localT < stepTime ? baseTorque : targetTorque    (new regime at stepTime)
 *     ramp       tau drifts baseTorque -> targetTorque at
 *                |rampRate|, then holds at targetTorque      (slow regime drift)
 *     quadratic  tau = k * angularVelocity * |angularVelocity|           (fan / pump load)
 *     periodic   tau = baseTorque + A * sin(2*pi*f*localT)  (mechanical modulation)
 *
 * SCHEDULER CHAIN (lifecycle): a LoadTorque is a chainable timed SEGMENT.
 * It drives the motor only while ACTIVE — armed by a `_start` trigger (or
 * `autoStart` at session start), it runs its profile for `duration`
 * seconds, then pulses `_completed` ONCE and goes silent. Wire
 * `segment[i]._completed -> segment[i+1]._start` and the sequence advances
 * itself: each segment signals the end of its profile (the "reached"
 * event), which starts the next. `duration <= 0` runs open-ended (never
 * completes) — the baseline / last segment. An inactive segment publishes
 * nothing, so exactly one segment drives `loadTorque` at a time. Mirrors
 * the Logic TimerNode armed-producer pattern. Defaults (autoStart=true,
 * duration=0) reproduce the legacy always-on behaviour.
 *
 * The ramp is BOUNDED on purpose: it models a slow drift INTO a new
 * operating regime, so the torque settles on the targetTorque plateau where a
 * downstream steady-state gate can re-open. An unbounded ramp would
 * grow past any real motor's stall torque (~45 mN.m at 6.7 V on the
 * R385 bench) and the signal would never stabilise. The direction
 * comes from sign(targetTorque - baseTorque), so targetTorque below baseTorque gives a downward
 * drift; rampRate only contributes its magnitude.
 *
 * Passivity invariant: the published torque never DRIVES the motor.
 * The angularVelocity-dependent profiles (quadratic) use a signed law that always
 * opposes the actual rotation: tau carries the sign of angularVelocity (negative
 * under reverse rotation, with the motor convention
 * J*domega/dt = Te - b*angularVelocity - loadTorque), and the output is clamped so
 * that sign(tau) == sign(angularVelocity). The time-only profiles (constant,
 * step, ramp, periodic) are braking torques by convention and clamp at
 * >= 0. For custom laws the hand-composition alternative (a Feedback
 * channel on angularVelocity plus Multiply / Add nodes) remains possible; this
 * node only packages the common cases.
 */
export class LoadTorqueNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _profile: LoadProfile = "constant";
    @cloneable private _baseTorque: number = 0.01; // Base torque [N.m]
    @cloneable private _targetTorque: number = 0.02; // Step / ramp target torque [N.m]
    @cloneable private _stepTime: number = 5; // Step time [s] (local)
    @cloneable private _rampRate: number = 0.001; // Ramp slope magnitude [N.m/s]
    @cloneable private _k: number = 1.5e-7; // Quadratic coefficient [N.m.s^2/rad^2]
    @cloneable private _amplitude: number = 0.005; // Periodic amplitude [N.m]
    @cloneable private _frequency: number = 1; // Periodic frequency [Hz]
    // Scheduler-chain lifecycle. duration<=0 = open-ended (never completes);
    // autoStart=true arms at session start (legacy always-on default), false
    // waits for a `_start` trigger (downstream segments in a chain).
    @cloneable private _duration: number = 0; // Segment length [s]
    @cloneable private _autoStart: boolean = true;

    @cloneable private _tau: number = 0;

    // Runtime lifecycle state (not serialised): armed flag, the sim-time origin
    // of the local profile clock, a pending-arm latch (the `_start` t is read in
    // fire, where the timestamp is available), and a once-only completion latch.
    private _active: boolean = true;
    private _armT: number = 0; // sim time the active window started; 0 = session start (autoStart)
    private _armPending: boolean = false;
    private _wasCompleted: boolean = false;

    // angularVelocity is the live speed (the motor's signal): only the
    // speed-dependent (quadratic) law wires it. A timed segment leaves it
    // UNWIRED so it stays a "true source" the scheduler ticks every SIM
    // dispatch — that is what keeps its `duration` clock advancing (and
    // reaching `_completed`) even when the speed has settled to a constant.
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "angularVelocity", optional: true, type: "float" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "loadTorque", optional: false, type: "float" }];
    // Control plane: `_start` arms the segment (the previous segment's
    // `_completed` wires here), `_reset` returns it to its autoStart state;
    // `_completed` pulses ONCE at the end of the profile (the "reached" event).
    // Control-slot wires don't gate firing and don't disqualify the
    // true-source seeding, so a timed segment fires every sim tick.
    public override readonly controlInputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "_enable", optional: true, type: "boolean" },
        { slot: "_start", optional: true, type: "trigger" },
        { slot: "_reset", optional: true, type: "trigger" },
    ];
    public override readonly controlOutputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "_enabled", optional: true, type: "boolean" },
        { slot: "_completed", optional: true, type: "trigger" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /** Active load profile. Encoded as a free-form string with a `unit`
     *  hint listing the legal values so the editor's tooltip serves as
     *  an inline cheat-sheet. Invalid inputs clamp to the default
     *  `"constant"` rather than throwing: the node should never crash a
     *  session over a typo. */
    @editable("string", { unit: "constant | step | ramp | quadratic | periodic" })
    public get profile(): LoadProfile {
        return this._profile;
    }
    public set profile(v: LoadProfile) {
        const next: LoadProfile = v === "step" || v === "ramp" || v === "quadratic" || v === "periodic" ? v : "constant";
        this.setField("profile", this._profile, next, (n) => {
            this._profile = n as LoadProfile;
        });
    }
    @editable("number") public get baseTorque(): number {
        return this._baseTorque;
    }
    public set baseTorque(v: number) {
        this.setField("baseTorque", this._baseTorque, v, (n) => {
            this._baseTorque = n;
        });
    }
    @editable("number") public get targetTorque(): number {
        return this._targetTorque;
    }
    public set targetTorque(v: number) {
        this.setField("targetTorque", this._targetTorque, v, (n) => {
            this._targetTorque = n;
        });
    }
    @editable("number") public get stepTime(): number {
        return this._stepTime;
    }
    public set stepTime(v: number) {
        this.setField("stepTime", this._stepTime, v, (n) => {
            this._stepTime = n;
        });
    }
    @editable("number") public get rampRate(): number {
        return this._rampRate;
    }
    public set rampRate(v: number) {
        this.setField("rampRate", this._rampRate, v, (n) => {
            this._rampRate = n;
        });
    }
    @editable("number") public get k(): number {
        return this._k;
    }
    public set k(v: number) {
        this.setField("k", this._k, v, (n) => {
            this._k = n;
        });
    }
    @editable("number") public get amplitude(): number {
        return this._amplitude;
    }
    public set amplitude(v: number) {
        this.setField("amplitude", this._amplitude, v, (n) => {
            this._amplitude = n;
        });
    }
    @editable("number") public get frequency(): number {
        return this._frequency;
    }
    public set frequency(v: number) {
        this.setField("frequency", this._frequency, v, (n) => {
            this._frequency = n;
        });
    }
    @editable("number", { unit: "s" }) public get duration(): number {
        return this._duration;
    }
    public set duration(v: number) {
        this.setField("duration", this._duration, v, (n) => {
            this._duration = n;
        });
    }
    @editable("boolean") public get autoStart(): boolean {
        return this._autoStart;
    }
    public set autoStart(v: boolean) {
        this.setField("autoStart", this._autoStart, v, (n) => {
            this._autoStart = n;
        });
    }

    @viewable("number") public get tau(): number {
        return this._tau;
    }
    @viewable("boolean") public get active(): boolean {
        return this._active;
    }

    public override reset(_session: ISession): void {
        this._active = this._autoStart;
        // autoStart arms at session start, so its clock origin is t = 0 and the
        // profile runs against absolute sim time (legacy single-segment
        // behaviour). A `_start`-armed segment captures its origin in fire().
        this._armT = 0;
        this._armPending = false;
        this._wasCompleted = false;
        this.setField("tau", this._tau, 0, (n) => {
            this._tau = n;
        });
    }

    /** Drain control triggers before fire() (the scheduler calls this first):
     *  `_start` arms the segment from a fresh local clock — the chain hand-off,
     *  the previous segment's `_completed` wires here. `_reset` returns it to
     *  its autoStart state. Control slots don't gate firing nor disqualify the
     *  true-source seeding, so the segment keeps ticking every sim step. */
    public override processControlInputs(session: ISession): void {
        super.processControlInputs(session);
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            if (slot === "_start") {
                session.consume(idx);
                this._active = true;
                this._armPending = true; // capture the origin t in the next fire()
                this._wasCompleted = false;
            } else if (slot === "_reset") {
                session.consume(idx);
                this._active = this._autoStart;
                this._armT = 0;
                this._armPending = false;
                this._wasCompleted = false;
            }
        }
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let angularVelocity = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            if (inSlotOf(link) !== "angularVelocity") continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const v = session.consume(idx);
            if (typeof v === "number") angularVelocity = v;
        }

        // Inactive segment drives nothing: it stays silent (no publish) until
        // `_start` arms it, so a chained sequence has exactly one segment
        // driving the motor at a time (the active one's torque wins the
        // loadTorque signal; the rest hold their last value through the
        // single-tick handover). An inactive segment that DOES read the speed
        // signal simply ignores it here.
        if (!this._active) return;

        // Local profile clock = sim time since the active window opened. A
        // `_start`-armed segment captures its origin on the first fire (the
        // timestamp `t` lives here, not in processControlInputs); autoStart
        // keeps origin 0 so it runs against absolute sim time. step / ramp /
        // periodic time is RELATIVE to activation, so each segment is
        // self-contained — and being sim-time based it is robust to
        // pause/resume + play-speed without a per-fire accumulator.
        if (this._armPending) {
            this._armT = t;
            this._armPending = false;
        }
        const localT = t - this._armT;

        let tau: number;
        let omegaDependent = false;
        switch (this._profile) {
            case "step":
                tau = localT < this._stepTime ? this._baseTorque : this._targetTorque;
                break;
            case "ramp": {
                // Bounded drift: tau moves from baseTorque toward targetTorque at
                // |rampRate| and HOLDS at targetTorque once reached, so the
                // load settles on a new plateau instead of growing
                // forever past the motor's stall torque.
                const drift = Math.abs(this._rampRate) * localT;
                const span = Math.abs(this._targetTorque - this._baseTorque);
                tau = drift >= span ? this._targetTorque : this._baseTorque + Math.sign(this._targetTorque - this._baseTorque) * drift;
                break;
            }
            case "quadratic":
                // Signed opposing law: |tau| = k*angularVelocity^2, sign follows
                // angularVelocity so the load brakes in BOTH rotation directions.
                tau = this._k * angularVelocity * Math.abs(angularVelocity);
                omegaDependent = true;
                break;
            case "periodic":
                tau = this._baseTorque + this._amplitude * Math.sin(2 * Math.PI * this._frequency * localT);
                break;
            default: // constant
                tau = this._baseTorque;
                break;
        }
        // Passivity clamp: a passive load never drives the motor. The
        // angularVelocity-dependent profiles must oppose the actual rotation, so
        // the published torque keeps the sign of angularVelocity (tau*angularVelocity >= 0);
        // the time-only profiles are braking torques and clamp at >= 0.
        if (omegaDependent) {
            if (angularVelocity === 0 || tau * angularVelocity < 0) tau = 0;
        } else if (tau < 0) {
            tau = 0;
        }

        this.setField("tau", this._tau, tau, (n) => {
            this._tau = n;
        });
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "loadTorque" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, tau);
        }

        // Profile end: pulse `_completed` ONCE (the "reached" event the next
        // segment's `_start` consumes), then go silent so the next segment
        // takes over. duration<=0 = open-ended, never completes.
        if (this._duration > 0 && localT >= this._duration && !this._wasCompleted) {
            this._wasCompleted = true;
            this._active = false;
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== "_completed" || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, true);
            }
        }
    }
}

export function createLoadTorqueNode(): LoadTorqueNode {
    return new LoadTorqueNode();
}
