import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable, IHasSampleRateRequirement } from "spikypanda-core";
import { FaultableNode } from "spikypanda-core";

const TWO_PI = 2 * Math.PI;
const SQRT3 = Math.sqrt(3);

/**
 * 3-phase squirrel-cage induction motor, space-vector model in the
 * STATIONARY alpha-beta frame with flux linkages as state:
 *
 *     state: psi_s_alpha, psi_s_beta, psi_r_alpha, psi_r_beta,
 *            omega (mechanical), theta (mechanical angle)
 *
 *     i_s = (Lr*psi_s - Lm*psi_r) / D       D = Ls*Lr - Lm^2
 *     i_r = (Ls*psi_r - Lm*psi_s) / D       (componentwise alpha/beta)
 *     dpsi_s/dt = v_s - Rs*i_s
 *     dpsi_r/dt = -R_r(a)*i_r + j*P*omega*psi_r
 *     Te = 1.5 * P * Lm/Lr * (psi_r_alpha*i_s_beta - psi_r_beta*i_s_alpha)
 *     J*domega/dt = Te - b*omega - (tau_load + getFault("tau"))
 *
 * Defaults model a ~1 kW, 2-pole-pair small industrial machine fed at
 * 60 Hz. The forward-Euler operating point is RATE-DEPENDENT; anchored
 * at the self-declared rate (requiredHz ~ 9813 Hz for these defaults,
 * see computeRequiredHz), with V_peak = 80 V phase it settles near
 * 171 rad/s mechanical (synchronous = 188.5 rad/s) at slip ~ 9.2
 * percent under 1.5 Nm load. A 4x-oversampled run converges to slip
 * ~ 10.1 percent; coarser legacy rates under-read the slip (~ 8
 * percent at 5 kHz).
 *
 * BROKEN ROTOR BARS (MCSA centerpiece). Broken bars make the rotor
 * cage resistance asymmetric; the asymmetry is fixed in the rotor and
 * therefore rotates with it. We use the standard lumped model: the
 * scalar Rr becomes the 2x2 matrix
 *
 *     R_r(a) = Rr * (I + delta * P(a))
 *     P(a)   = [[cos^2 a, sin a cos a], [sin a cos a, sin^2 a]]
 *     a      = P * theta   (electrical rotor angle)
 *     delta  = bar_severity * broken_bars / total_bars
 *
 * P(a) is the projector onto the rotor-fixed asymmetry axis: resistance
 * is raised along one rotor axis only. The backward-rotating field this
 * produces puts the classic sidebands in the stator current at
 * f_supply * (1 +/- 2s), amplitude growing with broken_bars/total_bars.
 *
 * Calibration is RATE-DEPENDENT and anchored at the declared rate
 * (forward Euler, dt = 1/requiredHz ~ 1.02e-4 s, defaults above,
 * 1.5 Nm load, Hann-windowed single-bin DFT over 4 s of steady state;
 * measured by the "calibration at the declared rate" test in
 * packages/tests/physics/induction-motor.test.ts):
 *     healthy (broken_bars = 0): both sidebands < 1e-5 of fundamental
 *                                (numerical floor)
 *     broken_bars = 2 / 28:      lower sideband ~ 3.5 percent of the
 *                                fundamental, upper ~ 0.28 percent
 *     broken_bars = 4 / 28:      lower ~ 6.7 percent, upper ~ 0.50
 *                                percent (lower ratio ~ 1.9x vs k = 2)
 * Coarser integration shifts these numbers (at the legacy 5 kHz
 * harness rate the lower sidebands read ~ 3.9 / 7.5 percent). With
 * bar_severity = 1 the lower sideband is ~ 0.5 * delta of the
 * fundamental, consistent with the k/N modulation-depth rule of thumb
 * (docs/research/motor-current-mcsa-principles.md) within a factor of
 * 2. The weaker upper sideband is physical: it arises from the speed
 * ripple feedback and is attenuated by the rotor inertia J.
 *
 * Inherits world-frame placement from TransformNode and the variadic
 * fault bank from FaultableNode (target="tau" folds into tau_load).
 */
export class InductionMotorDynamicNode extends FaultableNode implements IDeclaresPorts, IHasSampleRateRequirement {
    private static readonly OWN_INPUT_SLOTS: ReadonlySet<string> = new Set(["V_a", "V_b", "V_c", "tau_load", "dt"]);

    // P8 sample-rate (boilerplate mirror of IntegrableRuntimeNode)
    @cloneable private _requiredHzValue: number = 0;
    @cloneable private _requiredHzUserDefined: boolean = false;

    /** The stiff electrical pole of the flux model is the leakage
     *  (transient) pole: with D = Ls*Lr - Lm^2 the fast eigenvalue of
     *  the coupled flux subsystem sits near
     *      1/tau_e = (Rs*Lr + Rr*Ls) / D
     *  BOTH resistances damp the leakage flux; an Rs-only estimate
     *  (the old sigma*Ls/Rs) under-declares the rate and lets forward
     *  Euler diverge on high-Rr rotors (NaN for Rr >~ 19*Rs at the old
     *  self-declared rate). First-order Euler also needs an accuracy
     *  margin well beyond mere stability, so we declare 40/tau_e and
     *  floor at 80*f_supply: for the defaults this lands at ~9813 Hz,
     *  at or above the 5 kHz calibration regime. Clamped [60, 1e6]. */
    protected computeRequiredHz(): number {
        const D = this._Ls * this._Lr - this._Lm * this._Lm;
        const rl = this._Rs * this._Lr + this._Rr * this._Ls;
        const tauE = D > 0 && rl > 0 ? D / rl : Infinity;
        const fromTau = Number.isFinite(tauE) && tauE > 0 ? 40 / tauE : 0;
        const hz = Math.max(fromTau, 80 * this._fSupply);
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

    // Electrical / mechanical parameters (~1 kW small industrial machine).
    @cloneable private _Rs: number = 2.3;
    @cloneable private _Rr: number = 2.5;
    @cloneable private _Ls: number = 0.23;
    @cloneable private _Lr: number = 0.23;
    @cloneable private _Lm: number = 0.22;
    @cloneable private _P: number = 2;
    @cloneable private _J: number = 0.005;
    @cloneable private _b: number = 1e-4;
    @cloneable private _fSupply: number = 60;

    // Broken-rotor-bar fault parameters.
    @cloneable private _brokenBars: number = 0;
    @cloneable private _totalBars: number = 28;
    @cloneable private _barSeverity: number = 1;

    // Initial conditions.
    @cloneable private _omega0: number = 0;
    @cloneable private _theta0: number = 0;

    // State: stator/rotor flux linkages (alpha-beta), mechanics.
    @cloneable private _psiSa: number = 0;
    @cloneable private _psiSb: number = 0;
    @cloneable private _psiRa: number = 0;
    @cloneable private _psiRb: number = 0;
    @cloneable private _omega: number = 0;
    @cloneable private _theta: number = 0;

    // Derived outputs (kept as fields so viewables track the last tick).
    @cloneable private _ia: number = 0;
    @cloneable private _ib: number = 0;
    @cloneable private _ic: number = 0;
    @cloneable private _tauEm: number = 0;
    @cloneable private _slip: number = 1;
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
        { slot: "slip", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get Rs(): number {
        return this._Rs;
    }
    public set Rs(v: number) {
        if (
            this.setField("Rs", this._Rs, v, (n) => {
                this._Rs = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get Rr(): number {
        return this._Rr;
    }
    public set Rr(v: number) {
        if (
            this.setField("Rr", this._Rr, v, (n) => {
                this._Rr = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get Ls(): number {
        return this._Ls;
    }
    public set Ls(v: number) {
        if (
            this.setField("Ls", this._Ls, v, (n) => {
                this._Ls = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get Lr(): number {
        return this._Lr;
    }
    public set Lr(v: number) {
        if (
            this.setField("Lr", this._Lr, v, (n) => {
                this._Lr = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get Lm(): number {
        return this._Lm;
    }
    public set Lm(v: number) {
        if (
            this.setField("Lm", this._Lm, v, (n) => {
                this._Lm = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get P(): number {
        return this._P;
    }
    public set P(v: number) {
        this.setField("P", this._P, v, (n) => {
            this._P = n;
        });
    }
    @editable("number") public get J(): number {
        return this._J;
    }
    public set J(v: number) {
        this.setField("J", this._J, v, (n) => {
            this._J = n;
        });
    }
    @editable("number") public get b(): number {
        return this._b;
    }
    public set b(v: number) {
        this.setField("b", this._b, v, (n) => {
            this._b = n;
        });
    }
    @editable("number", { unit: "Hz" }) public get f_supply(): number {
        return this._fSupply;
    }
    public set f_supply(v: number) {
        if (
            this.setField("f_supply", this._fSupply, v, (n) => {
                this._fSupply = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get broken_bars(): number {
        return this._brokenBars;
    }
    public set broken_bars(v: number) {
        this.setField("broken_bars", this._brokenBars, v, (n) => {
            this._brokenBars = n;
        });
    }
    @editable("number") public get total_bars(): number {
        return this._totalBars;
    }
    public set total_bars(v: number) {
        this.setField("total_bars", this._totalBars, v, (n) => {
            this._totalBars = n;
        });
    }
    @editable("number") public get bar_severity(): number {
        return this._barSeverity;
    }
    public set bar_severity(v: number) {
        this.setField("bar_severity", this._barSeverity, v, (n) => {
            this._barSeverity = n;
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
    @viewable("number") public get slip(): number {
        return this._slip;
    }

    /** Slip from the supply electrical frequency and the mechanical
     *  speed, clamped to [-1, 2]: s = (omega_sync - P*omega)/omega_sync
     *  with omega_sync = 2*pi*f_supply. The (1, 2] band reports
     *  plugging (rotation against the field, up to s = 2 at full
     *  reverse synchronous speed); -1 caps the regenerative side.
     *  Returns 1 (standstill) when the supply frequency is not
     *  positive. */
    private _computeSlip(omega: number): number {
        const omegaSync = TWO_PI * this._fSupply;
        if (!(omegaSync > 0)) return 1;
        const s = (omegaSync - this._P * omega) / omegaSync;
        return Math.max(-1, Math.min(2, s));
    }

    public override reset(session: ISession): void {
        super.reset(session);
        this._psiSa = 0;
        this._psiSb = 0;
        this._psiRa = 0;
        this._psiRb = 0;
        this.setField("i_a", this._ia, 0, (n) => {
            this._ia = n;
        });
        this.setField("i_b", this._ib, 0, (n) => {
            this._ib = n;
        });
        this.setField("i_c", this._ic, 0, (n) => {
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
        this.setField("slip", this._slip, this._computeSlip(this._omega0), (n) => {
            this._slip = n;
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
            if (!InductionMotorDynamicNode.OWN_INPUT_SLOTS.has(slot)) continue;
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

        // Forward Clarke on the input phase voltages.
        const vAlpha = (2 * Va - Vb - Vc) / 3;
        const vBeta = (Vb - Vc) / SQRT3;

        let newPsiSa = this._psiSa,
            newPsiSb = this._psiSb;
        let newPsiRa = this._psiRa,
            newPsiRb = this._psiRb;
        let newOmega = this._omega,
            newTheta = this._theta;
        let newTauEm = this._tauEm;
        // Safe inverse-inductance denominator D = Ls*Lr - Lm^2.
        let D = this._Ls * this._Lr - this._Lm * this._Lm;
        if (Math.abs(D) < 1e-12) D = D < 0 ? -1e-12 : 1e-12;

        if (dt > 0) {
            // Currents from flux linkages.
            const iSa = (this._Lr * this._psiSa - this._Lm * this._psiRa) / D;
            const iSb = (this._Lr * this._psiSb - this._Lm * this._psiRb) / D;
            const iRa = (this._Ls * this._psiRa - this._Lm * this._psiSa) / D;
            const iRb = (this._Ls * this._psiRb - this._Lm * this._psiSb) / D;

            // Broken-bar rotor resistance asymmetry, rotating with the
            // rotor: R_r(a) = Rr*(I + delta*P(a)), a = P*theta electrical.
            // The 4 matrix entries are scalars recomputed in place, no
            // per-tick allocation.
            const bars = this._totalBars > 0 ? this._totalBars : 1;
            const delta = Math.max(0, (this._barSeverity * this._brokenBars) / bars);
            const a = this._P * this._theta;
            const ca = Math.cos(a);
            const sa = Math.sin(a);
            const rAA = this._Rr * (1 + delta * ca * ca);
            const rAB = this._Rr * delta * sa * ca;
            const rBB = this._Rr * (1 + delta * sa * sa);

            newTauEm = 1.5 * this._P * (this._Lm / Math.max(this._Lr, 1e-12)) * (this._psiRa * iSb - this._psiRb * iSa);

            // Forward Euler on the flux linkages.
            newPsiSa = this._psiSa + dt * (vAlpha - this._Rs * iSa);
            newPsiSb = this._psiSb + dt * (vBeta - this._Rs * iSb);
            newPsiRa = this._psiRa + dt * (-(rAA * iRa + rAB * iRb) - this._P * this._omega * this._psiRb);
            newPsiRb = this._psiRb + dt * (-(rAB * iRa + rBB * iRb) + this._P * this._omega * this._psiRa);

            // Fold the accumulated tau-target faults into the effective load.
            const tauEff = tauLoad + this.getFault("tau");
            const J = Math.max(this._J, 1e-12);
            newOmega = this._omega + (dt * (newTauEm - this._b * this._omega - tauEff)) / J;
            newTheta = this._theta + dt * this._omega;
        }

        this._psiSa = newPsiSa;
        this._psiSb = newPsiSb;
        this._psiRa = newPsiRa;
        this._psiRb = newPsiRb;

        // Inverse Clarke on the updated stator currents.
        const iSaNew = (this._Lr * newPsiSa - this._Lm * newPsiRa) / D;
        const iSbNew = (this._Lr * newPsiSb - this._Lm * newPsiRb) / D;
        const newIa = iSaNew;
        const newIb = (-iSaNew + SQRT3 * iSbNew) / 2;
        const newIc = -(newIa + newIb);
        const newSlip = this._computeSlip(newOmega);

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
        this.setField("slip", this._slip, newSlip, (n) => {
            this._slip = n;
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
        broadcast("slip", newSlip);
    }
}

export function createInductionMotorDynamicNode(): InductionMotorDynamicNode {
    return new InductionMotorDynamicNode();
}
