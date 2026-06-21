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
 * The profiles model operating-regime changes:
 *
 *     constant   tau = baseTorque                          (baseline regime)
 *     step       tau = t < stepTime ? baseTorque : targetTorque       (new regime at stepTime)
 *     ramp       tau drifts baseTorque -> targetTorque at
 *                |rampRate|, then holds at targetTorque      (slow regime drift)
 *     quadratic  tau = k * angularVelocity * |angularVelocity|           (fan / pump load)
 *     periodic   tau = baseTorque + A * sin(2*pi*f*t)      (mechanical modulation)
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
    @cloneable private _stepTime: number = 5; // Step time [s]
    @cloneable private _rampRate: number = 0.001; // Ramp slope magnitude [N.m/s]
    @cloneable private _k: number = 1.5e-7; // Quadratic coefficient [N.m.s^2/rad^2]
    @cloneable private _amplitude: number = 0.005; // Periodic amplitude [N.m]
    @cloneable private _frequency: number = 1; // Periodic frequency [Hz]

    @cloneable private _tau: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "angularVelocity", optional: true, type: "float" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "loadTorque", optional: false, type: "float" }];

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

    @viewable("number") public get tau(): number {
        return this._tau;
    }

    public override reset(_session: ISession): void {
        this.setField("tau", this._tau, 0, (n) => {
            this._tau = n;
        });
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let angularVelocity = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "angularVelocity") angularVelocity = value;
        }

        let tau: number;
        let omegaDependent = false;
        switch (this._profile) {
            case "step":
                tau = t < this._stepTime ? this._baseTorque : this._targetTorque;
                break;
            case "ramp": {
                // Bounded drift: tau moves from baseTorque toward targetTorque at
                // |rampRate| and HOLDS at targetTorque once reached, so the
                // load settles on a new plateau instead of growing
                // forever past the motor's stall torque.
                const drift = Math.abs(this._rampRate) * t;
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
                tau = this._baseTorque + this._amplitude * Math.sin(2 * Math.PI * this._frequency * t);
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
    }
}

export function createLoadTorqueNode(): LoadTorqueNode {
    return new LoadTorqueNode();
}
