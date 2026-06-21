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
 * the phaseVoltageA/phaseVoltageB/phaseVoltageC inputs here accept any 3-phase voltage source the
 * user composes (Logic plugin: 3 × Sin shifted by 120°, or a future
 * SVPWM inverter node).
 *
 * Inherits world-frame placement from TransformNode and the variadic
 * fault bank from FaultableNode (target="tau" folds into τ_load).
 */
export class PmsmMotorDynamicNode extends FaultableNode implements IDeclaresPorts, IHasSampleRateRequirement {
    private static readonly OWN_INPUT_SLOTS: ReadonlySet<string> = new Set(["phaseVoltageA", "phaseVoltageB", "phaseVoltageC", "loadTorque", "dt"]);

    // ── P8 sample-rate (boilerplate mirror of IntegrableRuntimeNode) ──
    @cloneable private _requiredHzValue: number = 0;
    @cloneable private _requiredHzUserDefined: boolean = false;

    /** PMSM is sinusoidal: dominant electrical frequency is f_e = polePairs · ω
     *  / (2π). We honor the electrical pole τ_e = armatureInductance/armatureResistance and Nyquist on the
     *  fundamental at a design omega_max = 1000 rad/s. Clamped
     *  [60, 1e6]. */
    protected computeRequiredHz(): number {
        const tauE = this._armatureInductance > 0 && this._armatureResistance > 0 ? this._armatureInductance / this._armatureResistance : Infinity;
        const tauM = this._rotorInertia > 0 && this._viscousFriction > 0 ? this._rotorInertia / this._viscousFriction : Infinity;
        const tauMin = Math.min(tauE, tauM);
        const omegaMax = 1000;
        const fe = (this._polePairs * omegaMax) / (2 * Math.PI);
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

    @cloneable private _armatureResistance: number = 0.5;
    @cloneable private _armatureInductance: number = 2e-3;
    @cloneable private _backEmfConstant: number = 0.05;
    @cloneable private _rotorInertia: number = 5e-5;
    @cloneable private _viscousFriction: number = 1e-4;
    @cloneable private _polePairs: number = 4;

    @cloneable private _initialPhaseCurrentA: number = 0;
    @cloneable private _initialPhaseCurrentB: number = 0;
    @cloneable private _initialPhaseCurrentC: number = 0;
    @cloneable private _initialAngularVelocity: number = 0;
    @cloneable private _initialRotorAngle: number = 0;

    @cloneable private _ia: number = 0;
    @cloneable private _ib: number = 0;
    @cloneable private _ic: number = 0;
    @cloneable private _omega: number = 0;
    @cloneable private _theta: number = 0;
    @cloneable private _tauEm: number = 0;
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
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get armatureResistance(): number {
        return this._armatureResistance;
    }
    public set armatureResistance(v: number) {
        if (
            this.setField("armatureResistance", this._armatureResistance, v, (n) => {
                this._armatureResistance = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get armatureInductance(): number {
        return this._armatureInductance;
    }
    public set armatureInductance(v: number) {
        if (
            this.setField("armatureInductance", this._armatureInductance, v, (n) => {
                this._armatureInductance = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get backEmfConstant(): number {
        return this._backEmfConstant;
    }
    public set backEmfConstant(v: number) {
        this.setField("backEmfConstant", this._backEmfConstant, v, (n) => {
            this._backEmfConstant = n;
        });
    }
    @editable("number") public get rotorInertia(): number {
        return this._rotorInertia;
    }
    public set rotorInertia(v: number) {
        if (
            this.setField("rotorInertia", this._rotorInertia, v, (n) => {
                this._rotorInertia = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get viscousFriction(): number {
        return this._viscousFriction;
    }
    public set viscousFriction(v: number) {
        if (
            this.setField("viscousFriction", this._viscousFriction, v, (n) => {
                this._viscousFriction = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get polePairs(): number {
        return this._polePairs;
    }
    public set polePairs(v: number) {
        if (
            this.setField("polePairs", this._polePairs, v, (n) => {
                this._polePairs = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get initialPhaseCurrentA(): number {
        return this._initialPhaseCurrentA;
    }
    public set initialPhaseCurrentA(v: number) {
        this.setField("initialPhaseCurrentA", this._initialPhaseCurrentA, v, (n) => {
            this._initialPhaseCurrentA = n;
        });
    }
    @editable("number") public get initialPhaseCurrentB(): number {
        return this._initialPhaseCurrentB;
    }
    public set initialPhaseCurrentB(v: number) {
        this.setField("initialPhaseCurrentB", this._initialPhaseCurrentB, v, (n) => {
            this._initialPhaseCurrentB = n;
        });
    }
    @editable("number") public get initialPhaseCurrentC(): number {
        return this._initialPhaseCurrentC;
    }
    public set initialPhaseCurrentC(v: number) {
        this.setField("initialPhaseCurrentC", this._initialPhaseCurrentC, v, (n) => {
            this._initialPhaseCurrentC = n;
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

    public override reset(session: ISession): void {
        super.reset(session);
        this.setField("phaseCurrentA", this._ia, this._initialPhaseCurrentA, (n) => {
            this._ia = n;
        });
        this.setField("phaseCurrentB", this._ib, this._initialPhaseCurrentB, (n) => {
            this._ib = n;
        });
        this.setField("phaseCurrentC", this._ic, this._initialPhaseCurrentC, (n) => {
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
            if (slot === "phaseVoltageA") Va = value;
            else if (slot === "phaseVoltageB") Vb = value;
            else if (slot === "phaseVoltageC") Vc = value;
            else if (slot === "loadTorque") tauLoad = value;
            else if (slot === "dt") dt = value;
        }
        if (dt < 0) dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        this._lastT = t;

        const thetaE = this._polePairs * this._theta;
        const omegaE = this._polePairs * this._omega;
        const backEmfConstant = this._backEmfConstant;

        const ea = backEmfConstant * omegaE * sinusoidalBackEmf(thetaE);
        const eb = backEmfConstant * omegaE * sinusoidalBackEmf(thetaE + PHASE_OFFSET_B);
        const ec = backEmfConstant * omegaE * sinusoidalBackEmf(thetaE + PHASE_OFFSET_C);

        let newIa = this._ia,
            newIb = this._ib,
            newIc = this._ic;
        let newOmega = this._omega,
            newTheta = this._theta;
        let newTauEm = this._tauEm;
        if (dt > 0) {
            const armatureInductance = Math.max(this._armatureInductance, 1e-12);
            newIa = this._ia + (dt * (Va - this._armatureResistance * this._ia - ea)) / armatureInductance;
            newIb = this._ib + (dt * (Vb - this._armatureResistance * this._ib - eb)) / armatureInductance;
            newIc = this._ic + (dt * (Vc - this._armatureResistance * this._ic - ec)) / armatureInductance;

            newTauEm =
                backEmfConstant *
                this._polePairs *
                (sinusoidalBackEmf(thetaE) * this._ia + sinusoidalBackEmf(thetaE + PHASE_OFFSET_B) * this._ib + sinusoidalBackEmf(thetaE + PHASE_OFFSET_C) * this._ic);

            // Fold the accumulated tau-target faults into the effective load.
            const tauEff = tauLoad + this.getFault("tau");
            const rotorInertia = Math.max(this._rotorInertia, 1e-12);
            newOmega = this._omega + (dt * (newTauEm - this._viscousFriction * this._omega - tauEff)) / rotorInertia;
            newTheta = this._theta + dt * this._omega;
        }

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
    }
}

export function createPmsmMotorDynamicNode(): PmsmMotorDynamicNode {
    return new PmsmMotorDynamicNode();
}
