import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable, IHasSampleRateRequirement } from "spikypanda-core";
import { PHASE_OFFSET_B, PHASE_OFFSET_C, sinusoidalBackEmf } from "./back-emf.js";
import { FaultableNode } from "spikypanda-core";

/**
 * 3-phase permanent magnet synchronous motor (PMSM) — sinusoidal back-EMF
 * variant. Same electrical/mechanical structure as the BLDC node but the
 * back-EMF shape function is `sin(θ_e + offset)` instead of trapezoidal.
 *
 * The current spectrum has fundamental at f_e and very low high-order
 * harmonics in the ideal sinusoidal case — the natural counterpart to
 * BLDC's 6f_e ripple. Useful baseline for MCSA studies of FOC-driven
 * PMSMs (or distinguishing healthy PMSM from BLDC commutation effects).
 *
 * For control, typically driven by a sinusoidal inverter (SVPWM/FOC) —
 * the V_a/V_b/V_c inputs here accept any 3-phase voltage source the
 * user composes (Logic plugin: 3 × Sin shifted by 120°, or a future
 * SVPWM inverter node).
 *
 * Inherits world-frame placement from TransformNode and the variadic
 * fault bank from FaultableNode (target="tau" folds into τ_load).
 */
export class PmsmMotorDynamicNode extends FaultableNode implements IDeclaresPorts, IHasSampleRateRequirement {
    private static readonly OWN_INPUT_SLOTS: ReadonlySet<string> = new Set(["V_a", "V_b", "V_c", "tau_load", "dt"]);

    // ── P8 sample-rate (boilerplate mirror of IntegrableRuntimeNode) ──
    @cloneable private _requiredHzValue: number = 0;
    @cloneable private _requiredHzUserDefined: boolean = false;

    /** PMSM is sinusoidal: dominant electrical frequency is f_e = P · ω
     *  / (2π). We honor the electrical pole τ_e = L/R and Nyquist on the
     *  fundamental at a design omega_max = 1000 rad/s. Clamped
     *  [60, 1e6]. */
    protected computeRequiredHz(): number {
        const tauE = this._L > 0 && this._R > 0 ? this._L / this._R : Infinity;
        const tauM = this._J > 0 && this._b > 0 ? this._J / this._b : Infinity;
        const tauMin = Math.min(tauE, tauM);
        const omegaMax = 1000;
        const fe = (this._P * omegaMax) / (2 * Math.PI);
        const fromTau = Number.isFinite(tauMin) && tauMin > 0 ? 10 / tauMin : 0;
        const hz = Math.max(fromTau, 10 * fe);
        if (!Number.isFinite(hz) || hz <= 0) return 5000;
        return Math.max(60, Math.min(1e6, hz));
    }

    public get requiredHz(): number {
        if (this._requiredHzUserDefined && this._requiredHzValue > 0) {
            return this._requiredHzValue;
        }
        return this.computeRequiredHz();
    }

    @editable("number", { unit: "Hz" })
    public get required_hz(): number {
        return this.requiredHz;
    }
    public set required_hz(v: number) {
        if (!Number.isFinite(v) || v <= 0) {
            if (this._requiredHzUserDefined || this._requiredHzValue !== 0) {
                const prev = this.requiredHz;
                this._requiredHzUserDefined = false;
                this._requiredHzValue = 0;
                this.notifyPropertyChanged("required_hz", prev, this.requiredHz);
            }
            return;
        }
        const prev = this.requiredHz;
        if (this._requiredHzValue !== v || !this._requiredHzUserDefined) {
            this._requiredHzValue = v;
            this._requiredHzUserDefined = true;
            this.notifyPropertyChanged("required_hz", prev, v);
        }
    }

    @viewable("boolean") public get required_hz_user_defined(): boolean {
        return this._requiredHzUserDefined;
    }

    private _notifyRequiredHzMayHaveChanged(): void {
        if (this._requiredHzUserDefined && this._requiredHzValue > 0) return;
        this.notifyPropertyChanged("required_hz", null, this.requiredHz);
    }

    @cloneable private _R: number = 0.5;
    @cloneable private _L: number = 2e-3;
    @cloneable private _Ke: number = 0.05;
    @cloneable private _J: number = 5e-5;
    @cloneable private _b: number = 1e-4;
    @cloneable private _P: number = 4;

    @cloneable private _ia0: number = 0;
    @cloneable private _ib0: number = 0;
    @cloneable private _ic0: number = 0;
    @cloneable private _omega0: number = 0;
    @cloneable private _theta0: number = 0;

    @cloneable private _ia: number = 0;
    @cloneable private _ib: number = 0;
    @cloneable private _ic: number = 0;
    @cloneable private _omega: number = 0;
    @cloneable private _theta: number = 0;
    @cloneable private _tauEm: number = 0;
    private _lastT: number = -1;

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_INPUT_PORTS,
        { slot: "V_a", optional: true, type: "float" },
        { slot: "V_b", optional: true, type: "float" },
        { slot: "V_c", optional: true, type: "float" },
        { slot: "tau_load", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_OUTPUT_PORTS,
        { slot: "i_a", optional: false, type: "float" },
        { slot: "i_b", optional: false, type: "float" },
        { slot: "i_c", optional: false, type: "float" },
        { slot: "omega", optional: false, type: "float" },
        { slot: "theta_m", optional: false, type: "float" },
        { slot: "tau_em", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get R(): number {
        return this._R;
    }
    public set R(v: number) {
        if (this.setField("R", this._R, v, (n) => {
            this._R = n;
        })) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get L(): number {
        return this._L;
    }
    public set L(v: number) {
        if (this.setField("L", this._L, v, (n) => {
            this._L = n;
        })) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get Ke(): number {
        return this._Ke;
    }
    public set Ke(v: number) {
        this.setField("Ke", this._Ke, v, (n) => {
            this._Ke = n;
        });
    }
    @editable("number") public get J(): number {
        return this._J;
    }
    public set J(v: number) {
        if (this.setField("J", this._J, v, (n) => {
            this._J = n;
        })) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get b(): number {
        return this._b;
    }
    public set b(v: number) {
        if (this.setField("b", this._b, v, (n) => {
            this._b = n;
        })) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get P(): number {
        return this._P;
    }
    public set P(v: number) {
        if (this.setField("P", this._P, v, (n) => {
            this._P = n;
        })) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get ia0(): number {
        return this._ia0;
    }
    public set ia0(v: number) {
        this.setField("ia0", this._ia0, v, (n) => {
            this._ia0 = n;
        });
    }
    @editable("number") public get ib0(): number {
        return this._ib0;
    }
    public set ib0(v: number) {
        this.setField("ib0", this._ib0, v, (n) => {
            this._ib0 = n;
        });
    }
    @editable("number") public get ic0(): number {
        return this._ic0;
    }
    public set ic0(v: number) {
        this.setField("ic0", this._ic0, v, (n) => {
            this._ic0 = n;
        });
    }
    @editable("number") public get omega0(): number {
        return this._omega0;
    }
    public set omega0(v: number) {
        this.setField("omega0", this._omega0, v, (n) => {
            this._omega0 = n;
        });
    }
    @editable("number") public get theta0(): number {
        return this._theta0;
    }
    public set theta0(v: number) {
        this.setField("theta0", this._theta0, v, (n) => {
            this._theta0 = n;
        });
    }

    @viewable("number") public get i_a(): number {
        return this._ia;
    }
    @viewable("number") public get i_b(): number {
        return this._ib;
    }
    @viewable("number") public get i_c(): number {
        return this._ic;
    }
    @viewable("number") public get omega(): number {
        return this._omega;
    }
    @viewable("number") public get theta_m(): number {
        return this._theta;
    }
    @viewable("number") public get tau_em(): number {
        return this._tauEm;
    }

    public override reset(session: ISession): void {
        super.reset(session);
        this.setField("i_a", this._ia, this._ia0, (n) => {
            this._ia = n;
        });
        this.setField("i_b", this._ib, this._ib0, (n) => {
            this._ib = n;
        });
        this.setField("i_c", this._ic, this._ic0, (n) => {
            this._ic = n;
        });
        this.setField("omega", this._omega, this._omega0, (n) => {
            this._omega = n;
        });
        this.setField("theta_m", this._theta, this._theta0, (n) => {
            this._theta = n;
        });
        this.setField("tau_em", this._tauEm, 0, (n) => {
            this._tauEm = n;
        });
        this._lastT = -1;
    }

    public override fire(session: ISession, t: number): void {
        super.fire(session, t);

        const links = session.graph.links as ReadonlyArray<IChannel>;
        let Va = 0,
            Vb = 0,
            Vc = 0,
            tauLoad = 0,
            dt = -1;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (!PmsmMotorDynamicNode.OWN_INPUT_SLOTS.has(slot)) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "V_a") Va = value;
            else if (slot === "V_b") Vb = value;
            else if (slot === "V_c") Vc = value;
            else if (slot === "tau_load") tauLoad = value;
            else if (slot === "dt") dt = value;
        }
        if (dt < 0) dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        this._lastT = t;

        const thetaE = this._P * this._theta;
        const omegaE = this._P * this._omega;
        const Ke = this._Ke;

        const ea = Ke * omegaE * sinusoidalBackEmf(thetaE);
        const eb = Ke * omegaE * sinusoidalBackEmf(thetaE + PHASE_OFFSET_B);
        const ec = Ke * omegaE * sinusoidalBackEmf(thetaE + PHASE_OFFSET_C);

        let newIa = this._ia,
            newIb = this._ib,
            newIc = this._ic;
        let newOmega = this._omega,
            newTheta = this._theta;
        let newTauEm = this._tauEm;
        if (dt > 0) {
            const L = Math.max(this._L, 1e-12);
            newIa = this._ia + (dt * (Va - this._R * this._ia - ea)) / L;
            newIb = this._ib + (dt * (Vb - this._R * this._ib - eb)) / L;
            newIc = this._ic + (dt * (Vc - this._R * this._ic - ec)) / L;

            newTauEm =
                Ke *
                this._P *
                (sinusoidalBackEmf(thetaE) * this._ia + sinusoidalBackEmf(thetaE + PHASE_OFFSET_B) * this._ib + sinusoidalBackEmf(thetaE + PHASE_OFFSET_C) * this._ic);

            // Fold the accumulated tau-target faults into the effective load.
            const tauEff = tauLoad + this.getFault("tau");
            const J = Math.max(this._J, 1e-12);
            newOmega = this._omega + (dt * (newTauEm - this._b * this._omega - tauEff)) / J;
            newTheta = this._theta + dt * this._omega;
        }

        this.setField("i_a", this._ia, newIa, (n) => {
            this._ia = n;
        });
        this.setField("i_b", this._ib, newIb, (n) => {
            this._ib = n;
        });
        this.setField("i_c", this._ic, newIc, (n) => {
            this._ic = n;
        });
        this.setField("omega", this._omega, newOmega, (n) => {
            this._omega = n;
        });
        this.setField("theta_m", this._theta, newTheta, (n) => {
            this._theta = n;
        });
        this.setField("tau_em", this._tauEm, newTauEm, (n) => {
            this._tauEm = n;
        });

        const broadcast = (slot: string, val: unknown): void => {
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== slot || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, val);
            }
        };
        broadcast("i_a", newIa);
        broadcast("i_b", newIb);
        broadcast("i_c", newIc);
        broadcast("omega", newOmega);
        broadcast("theta_m", newTheta);
        broadcast("tau_em", newTauEm);
    }
}

export function createPmsmMotorDynamicNode(): PmsmMotorDynamicNode {
    return new PmsmMotorDynamicNode();
}
