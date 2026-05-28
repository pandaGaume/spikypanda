import {
    cloneable, editable, viewable,
    IChannel, IDeclaresPorts, IOlink, IPortDescriptor,
    ISession, RuntimeNode, inSlotOf,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import { PHASE_OFFSET_B, PHASE_OFFSET_C, trapezoidalBackEmf } from "./back-emf.js";

/**
 * 3-phase brushless DC motor (BLDC) — trapezoidal back-EMF, surface PM
 * rotor, Y-connected stator. Per-phase electrical equation:
 *
 *     V_k = R · i_k + L · di_k/dt + e_k(θ_e)
 *     e_k(θ_e) = Ke · ω_e · trapezoid(θ_e + offset_k)
 *
 * Mechanical equation:
 *
 *     τ_em = Σ e_k · i_k / ω_m            (limit handled near ω_m = 0)
 *     J · dω_m/dt = τ_em - b · ω_m - τ_load
 *     θ_e = P · θ_m                         (P = pole pairs)
 *
 * Mutual inductance is neglected (surface PM approximation). Stator
 * currents are integrated independently with Euler.
 *
 * The trapezoidal commutation produces a characteristic 6f_e harmonic
 * in the current spectrum and a torque ripple at 6f_e — both relevant
 * MCSA signatures distinct from brush DC.
 */
export class BldcMotorDynamicNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _R:  number = 0.5;
    @cloneable private _L:  number = 2e-3;
    @cloneable private _Ke: number = 0.05;
    @cloneable private _J:  number = 5e-5;
    @cloneable private _b:  number = 1e-4;
    @cloneable private _P:  number = 4;          // pole pairs

    @cloneable private _ia0:     number = 0;
    @cloneable private _ib0:     number = 0;
    @cloneable private _ic0:     number = 0;
    @cloneable private _omega0:  number = 0;
    @cloneable private _theta0:  number = 0;

    @cloneable private _ia:    number = 0;
    @cloneable private _ib:    number = 0;
    @cloneable private _ic:    number = 0;
    @cloneable private _omega: number = 0;
    @cloneable private _theta: number = 0;
    @cloneable private _tauEm: number = 0;
    private _lastT: number = -1;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "V_a",      optional: true, type: "float" },
        { slot: "V_b",      optional: true, type: "float" },
        { slot: "V_c",      optional: true, type: "float" },
        { slot: "tau_load", optional: true, type: "float" },
        { slot: "dt",       optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "i_a",     optional: false, type: "float" },
        { slot: "i_b",     optional: false, type: "float" },
        { slot: "i_c",     optional: false, type: "float" },
        { slot: "omega",   optional: false, type: "float" },
        { slot: "theta_m", optional: false, type: "float" },
        { slot: "tau_em",  optional: false, type: "float" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number") public get R(): number { return this._R; }
    public set R(v: number) { this.setField("R", this._R, v, (n) => { this._R = n; }); }
    @editable("number") public get L(): number { return this._L; }
    public set L(v: number) { this.setField("L", this._L, v, (n) => { this._L = n; }); }
    @editable("number") public get Ke(): number { return this._Ke; }
    public set Ke(v: number) { this.setField("Ke", this._Ke, v, (n) => { this._Ke = n; }); }
    @editable("number") public get J(): number { return this._J; }
    public set J(v: number) { this.setField("J", this._J, v, (n) => { this._J = n; }); }
    @editable("number") public get b(): number { return this._b; }
    public set b(v: number) { this.setField("b", this._b, v, (n) => { this._b = n; }); }
    @editable("number") public get P(): number { return this._P; }
    public set P(v: number) { this.setField("P", this._P, v, (n) => { this._P = n; }); }
    @editable("number") public get ia0(): number { return this._ia0; }
    public set ia0(v: number) { this.setField("ia0", this._ia0, v, (n) => { this._ia0 = n; }); }
    @editable("number") public get ib0(): number { return this._ib0; }
    public set ib0(v: number) { this.setField("ib0", this._ib0, v, (n) => { this._ib0 = n; }); }
    @editable("number") public get ic0(): number { return this._ic0; }
    public set ic0(v: number) { this.setField("ic0", this._ic0, v, (n) => { this._ic0 = n; }); }
    @editable("number") public get omega0(): number { return this._omega0; }
    public set omega0(v: number) { this.setField("omega0", this._omega0, v, (n) => { this._omega0 = n; }); }
    @editable("number") public get theta0(): number { return this._theta0; }
    public set theta0(v: number) { this.setField("theta0", this._theta0, v, (n) => { this._theta0 = n; }); }

    @viewable("number") public get i_a(): number    { return this._ia; }
    @viewable("number") public get i_b(): number    { return this._ib; }
    @viewable("number") public get i_c(): number    { return this._ic; }
    @viewable("number") public get omega(): number  { return this._omega; }
    @viewable("number") public get theta_m(): number { return this._theta; }
    @viewable("number") public get tau_em(): number { return this._tauEm; }

    public override reset(_session: ISession): void {
        this.setField("i_a",     this._ia,    this._ia0,    (n) => { this._ia = n; });
        this.setField("i_b",     this._ib,    this._ib0,    (n) => { this._ib = n; });
        this.setField("i_c",     this._ic,    this._ic0,    (n) => { this._ic = n; });
        this.setField("omega",   this._omega, this._omega0, (n) => { this._omega = n; });
        this.setField("theta_m", this._theta, this._theta0, (n) => { this._theta = n; });
        this.setField("tau_em",  this._tauEm, 0,            (n) => { this._tauEm = n; });
        this._lastT = -1;
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let Va = 0, Vb = 0, Vc = 0, tauLoad = 0, dt = -1;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if      (slot === "V_a")      Va = value;
            else if (slot === "V_b")      Vb = value;
            else if (slot === "V_c")      Vc = value;
            else if (slot === "tau_load") tauLoad = value;
            else if (slot === "dt")       dt = value;
        }
        if (dt < 0) dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        this._lastT = t;

        // Electrical angle from mechanical angle.
        const thetaE = this._P * this._theta;
        const omegaE = this._P * this._omega;
        const Ke = this._Ke;

        const ea = Ke * omegaE * trapezoidalBackEmf(thetaE);
        const eb = Ke * omegaE * trapezoidalBackEmf(thetaE + PHASE_OFFSET_B);
        const ec = Ke * omegaE * trapezoidalBackEmf(thetaE + PHASE_OFFSET_C);

        let newIa = this._ia, newIb = this._ib, newIc = this._ic;
        let newOmega = this._omega, newTheta = this._theta;
        let newTauEm = this._tauEm;
        if (dt > 0) {
            const L = Math.max(this._L, 1e-12);
            newIa = this._ia + dt * (Va - this._R * this._ia - ea) / L;
            newIb = this._ib + dt * (Vb - this._R * this._ib - eb) / L;
            newIc = this._ic + dt * (Vc - this._R * this._ic - ec) / L;

            // Torque from sum of back-EMF · current normalized by ω_m, with
            // limit handling at low speed: use the equivalent form
            //     τ_em = Σ (f_k(θ_e + offset_k) · Ke · P · i_k)
            // (drop the omega in numerator and denominator).
            newTauEm = Ke * this._P * (
                trapezoidalBackEmf(thetaE)                    * this._ia +
                trapezoidalBackEmf(thetaE + PHASE_OFFSET_B)   * this._ib +
                trapezoidalBackEmf(thetaE + PHASE_OFFSET_C)   * this._ic
            );

            const J = Math.max(this._J, 1e-12);
            newOmega = this._omega + dt * (newTauEm - this._b * this._omega - tauLoad) / J;
            newTheta = this._theta + dt * this._omega;
        }

        this.setField("i_a",     this._ia,    newIa,    (n) => { this._ia = n; });
        this.setField("i_b",     this._ib,    newIb,    (n) => { this._ib = n; });
        this.setField("i_c",     this._ic,    newIc,    (n) => { this._ic = n; });
        this.setField("omega",   this._omega, newOmega, (n) => { this._omega = n; });
        this.setField("theta_m", this._theta, newTheta, (n) => { this._theta = n; });
        this.setField("tau_em",  this._tauEm, newTauEm, (n) => { this._tauEm = n; });

        const broadcast = (slot: string, val: unknown): void => {
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== slot || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, val);
            }
        };
        broadcast("i_a",     newIa);
        broadcast("i_b",     newIb);
        broadcast("i_c",     newIc);
        broadcast("omega",   newOmega);
        broadcast("theta_m", newTheta);
        broadcast("tau_em",  newTauEm);
    }
}

export function createBldcMotorDynamicNode(): BldcMotorDynamicNode {
    return new BldcMotorDynamicNode();
}
