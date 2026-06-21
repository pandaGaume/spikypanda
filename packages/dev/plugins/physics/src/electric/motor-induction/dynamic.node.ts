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
 *            angularVelocity (mechanical), theta (mechanical angle)
 *
 *     i_s = (rotorInductance*psi_s - magnetizingInductance*psi_r) / D       D = statorInductance*rotorInductance - magnetizingInductance^2
 *     i_r = (statorInductance*psi_r - magnetizingInductance*psi_s) / D       (componentwise alpha/beta)
 *     dpsi_s/dt = v_s - statorResistance*i_s
 *     dpsi_r/dt = -R_r(a)*i_r + j*polePairs*angularVelocity*psi_r
 *     Te = 1.5 * polePairs * magnetizingInductance/rotorInductance * (psi_r_alpha*i_s_beta - psi_r_beta*i_s_alpha)
 *     rotorInertia*domega/dt = Te - viscousFriction*angularVelocity - (loadTorque + getFault("tau"))
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
 * scalar rotorResistance becomes the 2x2 matrix
 *
 *     R_r(a) = rotorResistance * (I + delta * polePairs(a))
 *     polePairs(a)   = [[cos^2 a, sin a cos a], [sin a cos a, sin^2 a]]
 *     a      = polePairs * theta   (electrical rotor angle)
 *     delta  = barFaultSeverity * brokenBarCount / totalBarCount
 *
 * polePairs(a) is the projector onto the rotor-fixed asymmetry axis: resistance
 * is raised along one rotor axis only. The backward-rotating field this
 * produces puts the classic sidebands in the stator current at
 * supplyFrequency * (1 +/- 2s), amplitude growing with brokenBarCount/totalBarCount.
 *
 * Calibration is RATE-DEPENDENT and anchored at the declared rate
 * (forward Euler, dt = 1/requiredHz ~ 1.02e-4 s, defaults above,
 * 1.5 Nm load, Hann-windowed single-bin DFT over 4 s of steady state;
 * measured by the "calibration at the declared rate" test in
 * packages/tests/physics/induction-motor.test.ts):
 *     healthy (brokenBarCount = 0): both sidebands < 1e-5 of fundamental
 *                                (numerical floor)
 *     brokenBarCount = 2 / 28:      lower sideband ~ 3.5 percent of the
 *                                fundamental, upper ~ 0.28 percent
 *     brokenBarCount = 4 / 28:      lower ~ 6.7 percent, upper ~ 0.50
 *                                percent (lower ratio ~ 1.9x vs k = 2)
 * Coarser integration shifts these numbers (at the legacy 5 kHz
 * harness rate the lower sidebands read ~ 3.9 / 7.5 percent). With
 * barFaultSeverity = 1 the lower sideband is ~ 0.5 * delta of the
 * fundamental, consistent with the k/N modulation-depth rule of thumb
 * (docs/research/motor-current-mcsa-principles.md) within a factor of
 * 2. The weaker upper sideband is physical: it arises from the speed
 * ripple feedback and is attenuated by the rotor inertia rotorInertia.
 *
 * Inherits world-frame placement from TransformNode and the variadic
 * fault bank from FaultableNode (target="tau" folds into loadTorque).
 */
export class InductionMotorDynamicNode extends FaultableNode implements IDeclaresPorts, IHasSampleRateRequirement {
    private static readonly OWN_INPUT_SLOTS: ReadonlySet<string> = new Set(["phaseVoltageA", "phaseVoltageB", "phaseVoltageC", "loadTorque", "dt"]);

    // P8 sample-rate (boilerplate mirror of IntegrableRuntimeNode)
    @cloneable private _requiredHzValue: number = 0;
    @cloneable private _requiredHzUserDefined: boolean = false;

    /** The stiff electrical pole of the flux model is the leakage
     *  (transient) pole: with D = statorInductance*rotorInductance - magnetizingInductance^2 the fast eigenvalue of
     *  the coupled flux subsystem sits near
     *      1/tau_e = (statorResistance*rotorInductance + rotorResistance*statorInductance) / D
     *  BOTH resistances damp the leakage flux; an statorResistance-only estimate
     *  (the old sigma*statorInductance/statorResistance) under-declares the rate and lets forward
     *  Euler diverge on high-rotorResistance rotors (NaN for rotorResistance >~ 19*statorResistance at the old
     *  self-declared rate). First-order Euler also needs an accuracy
     *  margin well beyond mere stability, so we declare 40/tau_e and
     *  floor at 80*supplyFrequency: for the defaults this lands at ~9813 Hz,
     *  at or above the 5 kHz calibration regime. Clamped [60, 1e6]. */
    protected computeRequiredHz(): number {
        const D = this._statorInductance * this._rotorInductance - this._magnetizingInductance * this._magnetizingInductance;
        const rl = this._statorResistance * this._rotorInductance + this._rotorResistance * this._statorInductance;
        const tauE = D > 0 && rl > 0 ? D / rl : Infinity;
        const fromTau = Number.isFinite(tauE) && tauE > 0 ? 40 / tauE : 0;
        const hz = Math.max(fromTau, 80 * this._supplyFrequency);
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
    public get requiredSampleRateHz(): number {
        return this.requiredHz;
    }
    public set requiredSampleRateHz(v: number) {
        if (!Number.isFinite(v) || v <= 0) {
            if (this._requiredHzUserDefined || this._requiredHzValue !== 0) {
                const prev = this.requiredHz;
                this._requiredHzUserDefined = false;
                this._requiredHzValue = 0;
                this.notifyPropertyChanged("requiredSampleRateHz", prev, this.requiredHz);
            }
            return;
        }
        const prev = this.requiredHz;
        if (this._requiredHzValue !== v || !this._requiredHzUserDefined) {
            this._requiredHzValue = v;
            this._requiredHzUserDefined = true;
            this.notifyPropertyChanged("requiredSampleRateHz", prev, v);
        }
    }

    @viewable("boolean") public get requiredSampleRateHzUserDefined(): boolean {
        return this._requiredHzUserDefined;
    }

    private _notifyRequiredHzMayHaveChanged(): void {
        if (this._requiredHzUserDefined && this._requiredHzValue > 0) return;
        this.notifyPropertyChanged("requiredSampleRateHz", null, this.requiredHz);
    }

    // Electrical / mechanical parameters (~1 kW small industrial machine).
    @cloneable private _statorResistance: number = 2.3;
    @cloneable private _rotorResistance: number = 2.5;
    @cloneable private _statorInductance: number = 0.23;
    @cloneable private _rotorInductance: number = 0.23;
    @cloneable private _magnetizingInductance: number = 0.22;
    @cloneable private _polePairs: number = 2;
    @cloneable private _rotorInertia: number = 0.005;
    @cloneable private _viscousFriction: number = 1e-4;
    @cloneable private _supplyFrequency: number = 60;

    // Broken-rotor-bar fault parameters.
    @cloneable private _brokenBarCount: number = 0;
    @cloneable private _totalBarCount: number = 28;
    @cloneable private _barFaultSeverity: number = 1;

    // Initial conditions.
    @cloneable private _initialAngularVelocity: number = 0;
    @cloneable private _initialRotorAngle: number = 0;

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
        { slot: "phaseVoltageA", optional: true, type: "float" },
        { slot: "phaseVoltageB", optional: true, type: "float" },
        { slot: "phaseVoltageC", optional: true, type: "float" },
        { slot: "loadTorque", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_OUTPUT_PORTS,
        { slot: "phaseCurrentA", optional: false, type: "float" },
        { slot: "phaseCurrentB", optional: false, type: "float" },
        { slot: "phaseCurrentC", optional: false, type: "float" },
        { slot: "angularVelocity", optional: false, type: "float" },
        { slot: "rotorAngle", optional: false, type: "float" },
        { slot: "electromagneticTorque", optional: false, type: "float" },
        { slot: "slip", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get statorResistance(): number {
        return this._statorResistance;
    }
    public set statorResistance(v: number) {
        if (
            this.setField("statorResistance", this._statorResistance, v, (n) => {
                this._statorResistance = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get rotorResistance(): number {
        return this._rotorResistance;
    }
    public set rotorResistance(v: number) {
        if (
            this.setField("rotorResistance", this._rotorResistance, v, (n) => {
                this._rotorResistance = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get statorInductance(): number {
        return this._statorInductance;
    }
    public set statorInductance(v: number) {
        if (
            this.setField("statorInductance", this._statorInductance, v, (n) => {
                this._statorInductance = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get rotorInductance(): number {
        return this._rotorInductance;
    }
    public set rotorInductance(v: number) {
        if (
            this.setField("rotorInductance", this._rotorInductance, v, (n) => {
                this._rotorInductance = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get magnetizingInductance(): number {
        return this._magnetizingInductance;
    }
    public set magnetizingInductance(v: number) {
        if (
            this.setField("magnetizingInductance", this._magnetizingInductance, v, (n) => {
                this._magnetizingInductance = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get polePairs(): number {
        return this._polePairs;
    }
    public set polePairs(v: number) {
        this.setField("polePairs", this._polePairs, v, (n) => {
            this._polePairs = n;
        });
    }
    @editable("number") public get rotorInertia(): number {
        return this._rotorInertia;
    }
    public set rotorInertia(v: number) {
        this.setField("rotorInertia", this._rotorInertia, v, (n) => {
            this._rotorInertia = n;
        });
    }
    @editable("number") public get viscousFriction(): number {
        return this._viscousFriction;
    }
    public set viscousFriction(v: number) {
        this.setField("viscousFriction", this._viscousFriction, v, (n) => {
            this._viscousFriction = n;
        });
    }
    @editable("number", { unit: "Hz" }) public get supplyFrequency(): number {
        return this._supplyFrequency;
    }
    public set supplyFrequency(v: number) {
        if (
            this.setField("supplyFrequency", this._supplyFrequency, v, (n) => {
                this._supplyFrequency = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get brokenBarCount(): number {
        return this._brokenBarCount;
    }
    public set brokenBarCount(v: number) {
        this.setField("brokenBarCount", this._brokenBarCount, v, (n) => {
            this._brokenBarCount = n;
        });
    }
    @editable("number") public get totalBarCount(): number {
        return this._totalBarCount;
    }
    public set totalBarCount(v: number) {
        this.setField("totalBarCount", this._totalBarCount, v, (n) => {
            this._totalBarCount = n;
        });
    }
    @editable("number") public get barFaultSeverity(): number {
        return this._barFaultSeverity;
    }
    public set barFaultSeverity(v: number) {
        this.setField("barFaultSeverity", this._barFaultSeverity, v, (n) => {
            this._barFaultSeverity = n;
        });
    }
    @editable("number") public get initialAngularVelocity(): number {
        return this._initialAngularVelocity;
    }
    public set initialAngularVelocity(v: number) {
        this.setField("initialAngularVelocity", this._initialAngularVelocity, v, (n) => {
            this._initialAngularVelocity = n;
        });
    }
    @editable("number") public get initialRotorAngle(): number {
        return this._initialRotorAngle;
    }
    public set initialRotorAngle(v: number) {
        this.setField("initialRotorAngle", this._initialRotorAngle, v, (n) => {
            this._initialRotorAngle = n;
        });
    }

    @viewable("number") public get phaseCurrentA(): number {
        return this._ia;
    }
    @viewable("number") public get phaseCurrentB(): number {
        return this._ib;
    }
    @viewable("number") public get phaseCurrentC(): number {
        return this._ic;
    }
    @viewable("number") public get angularVelocity(): number {
        return this._omega;
    }
    @viewable("number") public get rotorAngle(): number {
        return this._theta;
    }
    @viewable("number") public get electromagneticTorque(): number {
        return this._tauEm;
    }
    @viewable("number") public get slip(): number {
        return this._slip;
    }

    /** Slip from the supply electrical frequency and the mechanical
     *  speed, clamped to [-1, 2]: s = (omega_sync - polePairs*angularVelocity)/omega_sync
     *  with omega_sync = 2*pi*supplyFrequency. The (1, 2] band reports
     *  plugging (rotation against the field, up to s = 2 at full
     *  reverse synchronous speed); -1 caps the regenerative side.
     *  Returns 1 (standstill) when the supply frequency is not
     *  positive. */
    private _computeSlip(angularVelocity: number): number {
        const omegaSync = TWO_PI * this._supplyFrequency;
        if (!(omegaSync > 0)) return 1;
        const s = (omegaSync - this._polePairs * angularVelocity) / omegaSync;
        return Math.max(-1, Math.min(2, s));
    }

    public override reset(session: ISession): void {
        super.reset(session);
        this._psiSa = 0;
        this._psiSb = 0;
        this._psiRa = 0;
        this._psiRb = 0;
        this.setField("phaseCurrentA", this._ia, 0, (n) => {
            this._ia = n;
        });
        this.setField("phaseCurrentB", this._ib, 0, (n) => {
            this._ib = n;
        });
        this.setField("phaseCurrentC", this._ic, 0, (n) => {
            this._ic = n;
        });
        this.setField("angularVelocity", this._omega, this._initialAngularVelocity, (n) => {
            this._omega = n;
        });
        this.setField("rotorAngle", this._theta, this._initialRotorAngle, (n) => {
            this._theta = n;
        });
        this.setField("electromagneticTorque", this._tauEm, 0, (n) => {
            this._tauEm = n;
        });
        this.setField("slip", this._slip, this._computeSlip(this._initialAngularVelocity), (n) => {
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
            if (slot === "phaseVoltageA") Va = value;
            else if (slot === "phaseVoltageB") Vb = value;
            else if (slot === "phaseVoltageC") Vc = value;
            else if (slot === "loadTorque") tauLoad = value;
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
        // Safe inverse-inductance denominator D = statorInductance*rotorInductance - magnetizingInductance^2.
        let D = this._statorInductance * this._rotorInductance - this._magnetizingInductance * this._magnetizingInductance;
        if (Math.abs(D) < 1e-12) D = D < 0 ? -1e-12 : 1e-12;

        if (dt > 0) {
            // Currents from flux linkages.
            const iSa = (this._rotorInductance * this._psiSa - this._magnetizingInductance * this._psiRa) / D;
            const iSb = (this._rotorInductance * this._psiSb - this._magnetizingInductance * this._psiRb) / D;
            const iRa = (this._statorInductance * this._psiRa - this._magnetizingInductance * this._psiSa) / D;
            const iRb = (this._statorInductance * this._psiRb - this._magnetizingInductance * this._psiSb) / D;

            // Broken-bar rotor resistance asymmetry, rotating with the
            // rotor: R_r(a) = rotorResistance*(I + delta*polePairs(a)), a = polePairs*theta electrical.
            // The 4 matrix entries are scalars recomputed in place, no
            // per-tick allocation.
            const bars = this._totalBarCount > 0 ? this._totalBarCount : 1;
            const delta = Math.max(0, (this._barFaultSeverity * this._brokenBarCount) / bars);
            const a = this._polePairs * this._theta;
            const ca = Math.cos(a);
            const sa = Math.sin(a);
            const rAA = this._rotorResistance * (1 + delta * ca * ca);
            const rAB = this._rotorResistance * delta * sa * ca;
            const rBB = this._rotorResistance * (1 + delta * sa * sa);

            newTauEm = 1.5 * this._polePairs * (this._magnetizingInductance / Math.max(this._rotorInductance, 1e-12)) * (this._psiRa * iSb - this._psiRb * iSa);

            // Forward Euler on the flux linkages.
            newPsiSa = this._psiSa + dt * (vAlpha - this._statorResistance * iSa);
            newPsiSb = this._psiSb + dt * (vBeta - this._statorResistance * iSb);
            newPsiRa = this._psiRa + dt * (-(rAA * iRa + rAB * iRb) - this._polePairs * this._omega * this._psiRb);
            newPsiRb = this._psiRb + dt * (-(rAB * iRa + rBB * iRb) + this._polePairs * this._omega * this._psiRa);

            // Fold the accumulated tau-target faults into the effective load.
            const tauEff = tauLoad + this.getFault("tau");
            const rotorInertia = Math.max(this._rotorInertia, 1e-12);
            newOmega = this._omega + (dt * (newTauEm - this._viscousFriction * this._omega - tauEff)) / rotorInertia;
            newTheta = this._theta + dt * this._omega;
        }

        this._psiSa = newPsiSa;
        this._psiSb = newPsiSb;
        this._psiRa = newPsiRa;
        this._psiRb = newPsiRb;

        // Inverse Clarke on the updated stator currents.
        const iSaNew = (this._rotorInductance * newPsiSa - this._magnetizingInductance * newPsiRa) / D;
        const iSbNew = (this._rotorInductance * newPsiSb - this._magnetizingInductance * newPsiRb) / D;
        const newIa = iSaNew;
        const newIb = (-iSaNew + SQRT3 * iSbNew) / 2;
        const newIc = -(newIa + newIb);
        const newSlip = this._computeSlip(newOmega);

        this.setField("phaseCurrentA", this._ia, newIa, (n) => {
            this._ia = n;
        });
        this.setField("phaseCurrentB", this._ib, newIb, (n) => {
            this._ib = n;
        });
        this.setField("phaseCurrentC", this._ic, newIc, (n) => {
            this._ic = n;
        });
        this.setField("angularVelocity", this._omega, newOmega, (n) => {
            this._omega = n;
        });
        this.setField("rotorAngle", this._theta, newTheta, (n) => {
            this._theta = n;
        });
        this.setField("electromagneticTorque", this._tauEm, newTauEm, (n) => {
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
        broadcast("phaseCurrentA", newIa);
        broadcast("phaseCurrentB", newIb);
        broadcast("phaseCurrentC", newIc);
        broadcast("angularVelocity", newOmega);
        broadcast("rotorAngle", newTheta);
        broadcast("electromagneticTorque", newTauEm);
        broadcast("slip", newSlip);
    }
}

export function createInductionMotorDynamicNode(): InductionMotorDynamicNode {
    return new InductionMotorDynamicNode();
}
