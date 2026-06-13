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
 * Load torque source: the missing tau_load generator for motor
 * simulation graphs. Every motor node accepts a `tau_load` input but
 * nothing in the catalog produced one, so demo graphs either left it
 * unwired (no-load run) or hand-built the law from Logic primitives.
 *
 * The profiles model operating-regime changes:
 *
 *     constant   tau = tau0                          (baseline regime)
 *     step       tau = t < tStep ? tau0 : tau1       (new regime at tStep)
 *     ramp       tau drifts tau0 -> tau1 at
 *                |rampRate|, then holds at tau1      (slow regime drift)
 *     quadratic  tau = k * omega * |omega|           (fan / pump load)
 *     periodic   tau = tau0 + A * sin(2*pi*f*t)      (mechanical modulation)
 *
 * The ramp is BOUNDED on purpose: it models a slow drift INTO a new
 * operating regime, so the torque settles on the tau1 plateau where a
 * downstream steady-state gate can re-open. An unbounded ramp would
 * grow past any real motor's stall torque (~45 mN.m at 6.7 V on the
 * R385 bench) and the signal would never stabilise. The direction
 * comes from sign(tau1 - tau0), so tau1 below tau0 gives a downward
 * drift; rampRate only contributes its magnitude.
 *
 * Passivity invariant: the published torque never DRIVES the motor.
 * The omega-dependent profiles (quadratic) use a signed law that always
 * opposes the actual rotation: tau carries the sign of omega (negative
 * under reverse rotation, with the motor convention
 * J*domega/dt = Te - b*omega - tau_load), and the output is clamped so
 * that sign(tau) == sign(omega). The time-only profiles (constant,
 * step, ramp, periodic) are braking torques by convention and clamp at
 * >= 0. For custom laws the hand-composition alternative (a Feedback
 * channel on omega plus Multiply / Add nodes) remains possible; this
 * node only packages the common cases.
 */
export class LoadTorqueNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _profile: LoadProfile = "constant";
    @cloneable private _tau0: number = 0.01; // Base torque [N.m]
    @cloneable private _tau1: number = 0.02; // Step / ramp target torque [N.m]
    @cloneable private _tStep: number = 5; // Step time [s]
    @cloneable private _rampRate: number = 0.001; // Ramp slope magnitude [N.m/s]
    @cloneable private _k: number = 1.5e-7; // Quadratic coefficient [N.m.s^2/rad^2]
    @cloneable private _amplitude: number = 0.005; // Periodic amplitude [N.m]
    @cloneable private _frequency: number = 1; // Periodic frequency [Hz]

    @cloneable private _tau: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "omega", optional: true, type: "float" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "tau_load", optional: false, type: "float" }];

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
    @editable("number") public get tau0(): number {
        return this._tau0;
    }
    public set tau0(v: number) {
        this.setField("tau0", this._tau0, v, (n) => {
            this._tau0 = n;
        });
    }
    @editable("number") public get tau1(): number {
        return this._tau1;
    }
    public set tau1(v: number) {
        this.setField("tau1", this._tau1, v, (n) => {
            this._tau1 = n;
        });
    }
    @editable("number") public get tStep(): number {
        return this._tStep;
    }
    public set tStep(v: number) {
        this.setField("tStep", this._tStep, v, (n) => {
            this._tStep = n;
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
        let omega = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "omega") omega = value;
        }

        let tau: number;
        let omegaDependent = false;
        switch (this._profile) {
            case "step":
                tau = t < this._tStep ? this._tau0 : this._tau1;
                break;
            case "ramp": {
                // Bounded drift: tau moves from tau0 toward tau1 at
                // |rampRate| and HOLDS at tau1 once reached, so the
                // load settles on a new plateau instead of growing
                // forever past the motor's stall torque.
                const drift = Math.abs(this._rampRate) * t;
                const span = Math.abs(this._tau1 - this._tau0);
                tau = drift >= span ? this._tau1 : this._tau0 + Math.sign(this._tau1 - this._tau0) * drift;
                break;
            }
            case "quadratic":
                // Signed opposing law: |tau| = k*omega^2, sign follows
                // omega so the load brakes in BOTH rotation directions.
                tau = this._k * omega * Math.abs(omega);
                omegaDependent = true;
                break;
            case "periodic":
                tau = this._tau0 + this._amplitude * Math.sin(2 * Math.PI * this._frequency * t);
                break;
            default: // constant
                tau = this._tau0;
                break;
        }
        // Passivity clamp: a passive load never drives the motor. The
        // omega-dependent profiles must oppose the actual rotation, so
        // the published torque keeps the sign of omega (tau*omega >= 0);
        // the time-only profiles are braking torques and clamp at >= 0.
        if (omegaDependent) {
            if (omega === 0 || tau * omega < 0) tau = 0;
        } else if (tau < 0) {
            tau = 0;
        }

        this.setField("tau", this._tau, tau, (n) => {
            this._tau = n;
        });
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "tau_load" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, tau);
        }
    }
}

export function createLoadTorqueNode(): LoadTorqueNode {
    return new LoadTorqueNode();
}
