import { cloneable, editable, viewable, FaultableNode, TransformNode, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable, IHasSampleRateRequirement, IFaultDescriptor } from "spikypanda-core";

/**
 * PMSM machine in the rotor synchronous (dq) frame. Faithful port of the
 * legacy `sensors` PmsmMachine, the validation oracle, with identical
 * numerics (implicit Euler on the 2x2 electrical system, implicit
 * mechanical, trapezoidal theta, same substep cap).
 *
 * State: directAxisCurrent, quadratureAxisCurrent, omega_m, rotorAngle. Equations (salient via L_d != L_q):
 *
 *   V_d = armatureResistance*directAxisCurrent + L_d*di_d/dt - omega_e*L_q*quadratureAxisCurrent
 *   V_q = armatureResistance*quadratureAxisCurrent + L_q*di_q/dt + omega_e*L_d*directAxisCurrent + omega_e*lambda_m_eff
 *   T_e = (3/2)*p*(lambda_m_eff*quadratureAxisCurrent + (L_d - L_q)*directAxisCurrent*quadratureAxisCurrent)
 *   rotorInertia*domega_m/dt + B*omega_m = T_e - loadTorque
 *   dtheta_m/dt = omega_m
 *
 * World object: like every other motor (DC, BLDC) this node extends
 * FaultableNode (-> TransformNode), so it carries the local / parentWorld
 * transform ports + a `world` output, reads environmental gravity from the
 * Scene via getScene(), and accepts perturbations on the variadic fault_N
 * bank. Two fault targets drive the gravity / MCSA study:
 *
 *   "flux" : multiplicative magnet-flux modulation. lambda_m_eff =
 *            lambda_m * (1 + sum of flux faults + intrinsic gravity sag).
 *            It rides the back-EMF term omega_e*lambda_m_eff into V_q, so
 *            the dq and phase currents carry the 1x f_mech sideband: how a
 *            mechanical air-gap perturbation becomes readable in the
 *            ELECTRICAL signal.
 *   "tau"  : additive load-torque perturbation [Nm], same lingua franca as
 *            the other motors (imbalance, bearing, gear).
 *
 * Intrinsic gravity coupling (internalised, not a node you wire): the
 * machine is a world object, so it knows its own pose (`world`) and reads
 * its bound scene's gravity. When `gravityCoupling` is on AND a scene is
 * bound, it computes its own rotor sag (rotor weight deflects the shaft,
 * modulating the air gap) and folds the resulting flux delta
 * epsilon*cos(rotorAngle - theta_grav) into lambda_m_eff, plus the
 * gravity-augmented bearing preloads (F_*_eff viewables). This is the
 * gravity -> MCSA signature, automatic: put the motor in a scene, it
 * responds; swap Earth -> Orbital and the sideband vanishes. The
 * standalone Physics.Environment.Gravity:rotor-sag / bearing-preload
 * nodes remain for EXPLICIT composition (set gravityCoupling = false to
 * avoid double-counting, then wire them into the fault bank). Coupling is
 * gated on a BOUND scene (session.sceneStateView), not the per-node Earth
 * fallback, so headless drive validation with no scene stays gravity-free.
 *
 * Voltages phaseVoltageA/phaseVoltageB/phaseVoltageC are line-neutral phase voltages (from an inverter
 * or a composed 3-phase source). Decomposition-C: FOC, SVPWM and the
 * inverter are separate nodes; the gravity-coupling env models and the
 * faults are separate nodes feeding the fault bank / loadTorque.
 *
 * Defaults: Maxon ECX PRIME 6M/16L (the gravity-study reference).
 */
export class PmsmMachineDqNode extends FaultableNode implements IDeclaresPorts, IHasSampleRateRequirement {
    // Electrical + mechanical parameters (SI). ECX PRIME 6M/16L defaults.
    @cloneable private _armatureResistance: number = 2.0; // stator resistance [ohm]
    @cloneable private _directAxisInductance: number = 3e-4; // d-axis inductance [H]
    @cloneable private _quadratureAxisInductance: number = 3e-4; // q-axis inductance [H]
    @cloneable private _magnetFluxLinkage: number = 2e-3; // magnet flux linkage [Wb]
    @cloneable private _polePairs: number = 1; // pole pairs
    @cloneable private _rotorInertia: number = 1e-6; // rotor inertia [kg.m^2]
    @cloneable private _viscousFriction: number = 1e-7; // viscous friction [N.m.s/rad]

    // Intrinsic gravity-coupling parameters (rotor sag + bearing preload),
    // internalised from the legacy RotorSagModel / BearingPreloadModel.
    @cloneable private _gravityCoupling: boolean = true;
    @cloneable private _rotorMass: number = 0.0076; // kg (Maxon ECX PRIME)
    @cloneable private _bearingRadialStiffness: number = 1e5; // N/m
    @cloneable private _airGap: number = 5e-4; // m
    @cloneable private _nominalAxialPreload: number = 5; // N
    @cloneable private _nominalRadialPreload: number = 0; // N
    @cloneable private _umpRadialStiffness: number = 4000; // N/m (UMP -> housing vibration; 0 = none)

    @cloneable private _initialDirectAxisCurrent: number = 0;
    @cloneable private _initialQuadratureAxisCurrent: number = 0;
    @cloneable private _initialAngularVelocity: number = 0;
    @cloneable private _initialRotorAngle: number = 0;

    // State.
    @cloneable private _iD: number = 0;
    @cloneable private _iQ: number = 0;
    @cloneable private _omega: number = 0;
    @cloneable private _theta: number = 0;
    @cloneable private _iA: number = 0;
    @cloneable private _iB: number = 0;
    @cloneable private _iC: number = 0;
    @cloneable private _tauEm: number = 0;
    private _lastT: number = -1;

    // Gravity-coupling runtime outputs (recomputed each fire).
    private _gravFluxDelta: number = 0;
    private _fAxialEff: number = 5;
    private _fRadialEff: number = 0;
    private _gRadial: number = 0;
    private _fy: number = 0; // UMP vibration force, body radial Y
    private _fz: number = 0; // UMP vibration force, body radial Z

    // Rotor-frame coupling constants derived from the (cached, dirty-checked)
    // body-frame gravity. Recomputed only when that gravity changes or a
    // coupling editable changes; the theta-dependent modulation each tick
    // reads them. (gravity is a constant latent, so this is computed ~once.)
    private _gAngle: number = 0; // gravity angle in the body radial (Y-Z) plane
    private _sagEpsilon: number = 0; // delta / airGap (flux modulation depth)
    private _sagForce: number = 0; // umpRadialStiffness * delta (UMP force magnitude)
    private _sagConstantsDirty: boolean = true;

    @cloneable private _requiredHzValue: number = 0;
    @cloneable private _requiredHzUserDefined: boolean = false;

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_INPUT_PORTS, // local, parentWorld, fault_0
        { slot: "phaseVoltageA", optional: true, type: "float" },
        { slot: "phaseVoltageB", optional: true, type: "float" },
        { slot: "phaseVoltageC", optional: true, type: "float" },
        { slot: "loadTorque", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_OUTPUT_PORTS, // world
        { slot: "directAxisCurrent", optional: false, type: "float" },
        { slot: "quadratureAxisCurrent", optional: false, type: "float" },
        { slot: "phaseCurrentA", optional: false, type: "float" },
        { slot: "phaseCurrentB", optional: false, type: "float" },
        { slot: "phaseCurrentC", optional: false, type: "float" },
        { slot: "angularVelocity", optional: false, type: "float" },
        { slot: "rotorAngle", optional: false, type: "float" },
        { slot: "electromagneticTorque", optional: false, type: "float" },
        // Intrinsic vibration: the rotor sag / UMP radial force the motor
        // exerts on its housing, in the body radial plane (1x f_mech).
        { slot: "forceY", optional: false, type: "float" },
        { slot: "forceZ", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
    @editable("number", { unit: "ohm" }) public get armatureResistance(): number {
        return this._armatureResistance;
    }
    public set armatureResistance(v: number) {
        if (this.setField("armatureResistance", this._armatureResistance, v, (n) => (this._armatureResistance = n))) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number", { unit: "H" }) public get directAxisInductance(): number {
        return this._directAxisInductance;
    }
    public set directAxisInductance(v: number) {
        if (this.setField("directAxisInductance", this._directAxisInductance, v, (n) => (this._directAxisInductance = n))) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number", { unit: "H" }) public get quadratureAxisInductance(): number {
        return this._quadratureAxisInductance;
    }
    public set quadratureAxisInductance(v: number) {
        if (this.setField("quadratureAxisInductance", this._quadratureAxisInductance, v, (n) => (this._quadratureAxisInductance = n))) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number", { unit: "Wb" }) public get magnetFluxLinkage(): number {
        return this._magnetFluxLinkage;
    }
    public set magnetFluxLinkage(v: number) {
        this.setField("magnetFluxLinkage", this._magnetFluxLinkage, v, (n) => (this._magnetFluxLinkage = n));
    }
    @editable("number") public get polePairs(): number {
        return this._polePairs;
    }
    public set polePairs(v: number) {
        if (this.setField("polePairs", this._polePairs, v, (n) => (this._polePairs = n))) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number", { unit: "kg.m^2" }) public get rotorInertia(): number {
        return this._rotorInertia;
    }
    public set rotorInertia(v: number) {
        if (this.setField("rotorInertia", this._rotorInertia, v, (n) => (this._rotorInertia = n))) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get viscousFriction(): number {
        return this._viscousFriction;
    }
    public set viscousFriction(v: number) {
        if (this.setField("viscousFriction", this._viscousFriction, v, (n) => (this._viscousFriction = n))) this._notifyRequiredHzMayHaveChanged();
    }

    // ── Intrinsic gravity coupling ─────────────────────────────────────
    @editable("boolean") public get gravityCoupling(): boolean {
        return this._gravityCoupling;
    }
    public set gravityCoupling(v: boolean) {
        this.setField("gravityCoupling", this._gravityCoupling, v, (n) => (this._gravityCoupling = n));
    }
    @editable("number", { unit: "kg" }) public get rotorMass(): number {
        return this._rotorMass;
    }
    public set rotorMass(v: number) {
        this.setField("rotorMass", this._rotorMass, v, (n) => {
            this._rotorMass = n;
            this._sagConstantsDirty = true;
        });
    }
    @editable("number", { unit: "N/m" }) public get bearingRadialStiffness(): number {
        return this._bearingRadialStiffness;
    }
    public set bearingRadialStiffness(v: number) {
        this.setField("bearingRadialStiffness", this._bearingRadialStiffness, v, (n) => {
            this._bearingRadialStiffness = n;
            this._sagConstantsDirty = true;
        });
    }
    @editable("number", { unit: "m" }) public get airGap(): number {
        return this._airGap;
    }
    public set airGap(v: number) {
        this.setField("airGap", this._airGap, v, (n) => {
            this._airGap = n;
            this._sagConstantsDirty = true;
        });
    }
    @editable("number", { unit: "N" }) public get nominalAxialPreload(): number {
        return this._nominalAxialPreload;
    }
    public set nominalAxialPreload(v: number) {
        this.setField("nominalAxialPreload", this._nominalAxialPreload, v, (n) => {
            this._nominalAxialPreload = n;
            this._sagConstantsDirty = true;
        });
    }
    @editable("number", { unit: "N" }) public get nominalRadialPreload(): number {
        return this._nominalRadialPreload;
    }
    public set nominalRadialPreload(v: number) {
        this.setField("nominalRadialPreload", this._nominalRadialPreload, v, (n) => {
            this._nominalRadialPreload = n;
            this._sagConstantsDirty = true;
        });
    }
    @editable("number", { unit: "N/m" }) public get umpRadialStiffness(): number {
        return this._umpRadialStiffness;
    }
    public set umpRadialStiffness(v: number) {
        this.setField("umpRadialStiffness", this._umpRadialStiffness, v, (n) => {
            this._umpRadialStiffness = n;
            this._sagConstantsDirty = true;
        });
    }
    @editable("number") public get initialDirectAxisCurrent(): number {
        return this._initialDirectAxisCurrent;
    }
    public set initialDirectAxisCurrent(v: number) {
        this.setField("initialDirectAxisCurrent", this._initialDirectAxisCurrent, v, (n) => (this._initialDirectAxisCurrent = n));
    }
    @editable("number") public get initialQuadratureAxisCurrent(): number {
        return this._initialQuadratureAxisCurrent;
    }
    public set initialQuadratureAxisCurrent(v: number) {
        this.setField("initialQuadratureAxisCurrent", this._initialQuadratureAxisCurrent, v, (n) => (this._initialQuadratureAxisCurrent = n));
    }
    @editable("number") public get initialAngularVelocity(): number {
        return this._initialAngularVelocity;
    }
    public set initialAngularVelocity(v: number) {
        this.setField("initialAngularVelocity", this._initialAngularVelocity, v, (n) => (this._initialAngularVelocity = n));
    }
    @editable("number") public get initialRotorAngle(): number {
        return this._initialRotorAngle;
    }
    public set initialRotorAngle(v: number) {
        this.setField("initialRotorAngle", this._initialRotorAngle, v, (n) => (this._initialRotorAngle = n));
    }

    // ── Viewables ──────────────────────────────────────────────────────
    @viewable("number") public get directAxisCurrent(): number {
        return this._iD;
    }
    @viewable("number") public get quadratureAxisCurrent(): number {
        return this._iQ;
    }
    @viewable("number") public get phaseCurrentA(): number {
        return this._iA;
    }
    @viewable("number") public get phaseCurrentB(): number {
        return this._iB;
    }
    @viewable("number") public get phaseCurrentC(): number {
        return this._iC;
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

    // ── Gravity-coupling observables ───────────────────────────────────
    /** The intrinsic rotor-sag flux delta folded into lambda_m_eff this
     *  tick (0 when gravityCoupling is off or no scene is bound). */
    @viewable("number") public get gravity_flux_delta(): number {
        return this._gravFluxDelta;
    }
    /** Body-frame radial gravity magnitude driving the sag. */
    @viewable("number") public get g_radial(): number {
        return this._gRadial;
    }
    /** Gravity-augmented bearing preloads (operating point for a future
     *  bearing-race fault; metadata otherwise). */
    @viewable("number", { unit: "N" }) public get F_axial_eff(): number {
        return this._fAxialEff;
    }
    @viewable("number", { unit: "N" }) public get F_radial_eff(): number {
        return this._fRadialEff;
    }
    /** UMP rotor-sag vibration force the motor exerts on its housing
     *  (body radial plane, 1x f_mech). 0 without gravity / scene / UMP. */
    @viewable("number", { unit: "N" }) public get forceY(): number {
        return this._fy;
    }
    @viewable("number", { unit: "N" }) public get forceZ(): number {
        return this._fz;
    }

    // ── Sample-rate requirement (mirror of the BLDC/PMSM node) ─────────
    public computeRequiredHz(): number {
        const tauE =
            this._directAxisInductance > 0 && this._armatureResistance > 0
                ? Math.min(this._directAxisInductance, this._quadratureAxisInductance) / this._armatureResistance
                : Infinity;
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
        if (this._requiredHzUserDefined && this._requiredHzValue > 0) return this._requiredHzValue;
        return this.computeRequiredHz();
    }
    @editable("number", { unit: "Hz" }) public get requiredSampleRateHz(): number {
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
    private _notifyRequiredHzMayHaveChanged(): void {
        if (this._requiredHzUserDefined && this._requiredHzValue > 0) return;
        this.notifyPropertyChanged("requiredSampleRateHz", null, this.requiredHz);
    }

    // ── Fault coherence ────────────────────────────────────────────────
    // A PMSM models only a multiplicative magnet-flux modulation ("flux":
    // sag / eccentricity) and an additive load torque ("tau"). It has no
    // squirrel cage, so a broken-rotor-bar fault (or any other target) is
    // physically meaningless here and is dropped rather than corrupting
    // the model.
    protected override acceptFault(fault: IFaultDescriptor): boolean {
        return fault.target === "flux" || fault.target === "tau";
    }

    // ── Runtime ────────────────────────────────────────────────────────
    public override reset(session: ISession): void {
        super.reset(session); // transform world + fault accumulator
        this._iD = this._initialDirectAxisCurrent;
        this._iQ = this._initialQuadratureAxisCurrent;
        this._omega = this._initialAngularVelocity;
        this._theta = this._initialRotorAngle;
        const [a, viscousFriction, c] = PmsmMachineDqNode._dqToAbc(this._iD, this._iQ, this._polePairs * this._theta);
        this._iA = a;
        this._iB = viscousFriction;
        this._iC = c;
        this._tauEm = 0;
        this._lastT = -1;
        this._gravFluxDelta = 0;
        this._gRadial = 0;
        this._fAxialEff = this._nominalAxialPreload;
        this._fRadialEff = this._nominalRadialPreload;
        this._fy = 0;
        this._fz = 0;
        this._gAngle = 0;
        this._sagEpsilon = 0;
        this._sagForce = 0;
        this._sagConstantsDirty = true; // recompute on the first fire after reset
    }

    public override fire(session: ISession, t: number): void {
        // 1) TransformNode hop (world = parentWorld x local, publishes
        //    `world`) + FaultableNode hop (accumulates fault_N tokens).
        super.fire(session, t);

        const links = session.graph.links as ReadonlyArray<IChannel>;
        let vA = 0,
            vB = 0,
            vC = 0,
            tauLoad = 0,
            dtIn = -1;
        // Consume only this node's data slots; the transform (local /
        // parentWorld) and fault_N tokens were already consumed by
        // super.fire(), so we leave them untouched here.
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            if (slot !== "phaseVoltageA" && slot !== "phaseVoltageB" && slot !== "phaseVoltageC" && slot !== "loadTorque" && slot !== "dt") continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "phaseVoltageA") vA = value;
            else if (slot === "phaseVoltageB") vB = value;
            else if (slot === "phaseVoltageC") vC = value;
            else if (slot === "loadTorque") tauLoad = value;
            else if (slot === "dt") dtIn = value;
        }

        // Intrinsic gravity sag (from the bound scene + this machine's pose)
        // plus any explicit flux faults modulate the magnet flux; tau faults
        // add to the load torque: lambda_m_eff = lambda_m * (1 + sag + flux).
        this._updateGravityCoupling(session);
        const fluxEnv = 1 + this._gravFluxDelta + this.getFault("flux");
        const tauEffLoad = tauLoad + this.getFault("tau");

        if (this._lastT < 0 && dtIn < 0) {
            this._lastT = t;
            this._publish(session, links);
            return;
        }
        const dt = dtIn >= 0 ? dtIn : Math.max(0, t - this._lastT);
        this._lastT = t;

        if (dt > 0) {
            // lambda_m_eff held constant across the substeps of this fire,
            // matching the legacy per-advance flux envelope.
            const lambdaMEff = this._magnetFluxLinkage * fluxEnv;
            const maxSubstep = this._maxSubstep();
            let elapsed = 0;
            while (elapsed < dt) {
                const h = Math.min(maxSubstep, dt - elapsed);
                this._integrateOneSubstep(h, lambdaMEff, vA, vB, vC, tauEffLoad);
                elapsed += h;
            }
            const [a, viscousFriction, c] = PmsmMachineDqNode._dqToAbc(this._iD, this._iQ, this._polePairs * this._theta);
            this._iA = a;
            this._iB = viscousFriction;
            this._iC = c;
            const reluctant = (this._directAxisInductance - this._quadratureAxisInductance) * this._iD * this._iQ;
            this._tauEm = 1.5 * this._polePairs * (lambdaMEff * this._iQ + reluctant);
        }

        this._publish(session, links);
    }

    private _maxSubstep(): number {
        const tauElec = Math.min(this._directAxisInductance, this._quadratureAxisInductance) / this._armatureResistance;
        const tauMech = this._viscousFriction > 0 ? this._rotorInertia / this._viscousFriction : Number.POSITIVE_INFINITY;
        return Math.max(5e-6, Math.min(tauElec / 10, tauMech / 10));
    }

    /**
     * Fold the bound scene's gravity into this machine's coupling. The
     * body-frame gravity (g_body = armatureResistance^T * g_world) is cached + dirty-checked
     * by the TransformNode base (recomputed only when the gravity value or
     * this machine's orientation changes); from it we recompute the rotor-
     * frame constants in lock-step, then apply the theta-dependent air-gap
     * modulation EVERY tick (the rotor sweeps past the gravity direction
     * once per rev, the 1x f_mech sideband). Gravity is a world-fixed scene
     * latent, never mutated: `world` only orients HOW the machine sees it.
     * Gated on a BOUND scene + gravityCoupling, NOT the Earth fallback, so a
     * headless drive with no scene stays gravity-free and bit-exact with the
     * legacy oracle. Faithful to RotorSagModel / BearingPreloadModel:
     *   sag     = (rotorMass*g_radial / bearingRadialStiffness / airGap)
     *             * cos(rotorAngle - g_angle)
     *   F_*_eff = nominal_* + rotorMass * g_{axial,radial}
     */
    protected override _updateGravityCoupling(session: ISession): boolean {
        if (!this._gravityCoupling) {
            this._clearGravityCoupling();
            this._sagConstantsDirty = true; // recompute when re-enabled
            return false;
        }
        const changed = super._updateGravityCoupling(session); // refresh cached body gravity
        const gb = this._bodyGravity;
        if (!gb) {
            // No scene bound: inert (bit-exact with the legacy oracle).
            this._clearGravityCoupling();
            this._sagConstantsDirty = true;
            return changed;
        }
        if (changed || this._sagConstantsDirty) {
            // Rotor-frame decomposition: body X = axial, the Y-Z plane = radial.
            this._gRadial = Math.hypot(gb.y, gb.z);
            this._gAngle = Math.atan2(gb.z, gb.y);
            const delta = (this._rotorMass * this._gRadial) / this._bearingRadialStiffness;
            this._sagEpsilon = delta / this._airGap;
            this._sagForce = this._umpRadialStiffness * delta; // UMP radial force magnitude
            this._fAxialEff = this._nominalAxialPreload + this._rotorMass * gb.x;
            this._fRadialEff = this._nominalRadialPreload + this._rotorMass * this._gRadial;
            this._sagConstantsDirty = false;
        }
        // Per-tick: the sag rotates with the rotor (1x f_mech).
        if (this._gRadial < 1e-12) {
            this._gravFluxDelta = 0;
            this._fy = 0;
            this._fz = 0;
        } else {
            const phase = this._theta - this._gAngle;
            this._gravFluxDelta = this._sagEpsilon < 1e-12 ? 0 : this._sagEpsilon * Math.cos(phase);
            this._fy = this._sagForce * Math.cos(phase);
            this._fz = this._sagForce * Math.sin(phase);
        }
        return changed;
    }

    /** Zero the coupling outputs and restore the bare nominal preloads
     *  (the inert state when coupling is off or no scene is bound). */
    private _clearGravityCoupling(): void {
        this._gravFluxDelta = 0;
        this._gRadial = 0;
        this._fAxialEff = this._nominalAxialPreload;
        this._fRadialEff = this._nominalRadialPreload;
        this._fy = 0;
        this._fz = 0;
    }

    // Implicit Euler on the electrical 2x2 + implicit mechanical +
    // trapezoidal theta, omega_e held at its pre-step value. Numerically
    // identical to the legacy PmsmMachine._integrateOneSubstep.
    private _integrateOneSubstep(dt: number, lambdaMEff: number, vA: number, vB: number, vC: number, tauLoad: number): void {
        const statorResistance = this._armatureResistance;
        const directAxisInductance = this._directAxisInductance;
        const quadratureAxisInductance = this._quadratureAxisInductance;
        const p = this._polePairs;
        const rotorInertia = this._rotorInertia;
        const B = this._viscousFriction;

        const thetaE = p * this._theta;
        const omegaE = p * this._omega;
        const [vD, vQ] = PmsmMachineDqNode._abcToDq(vA, vB, vC, thetaE);

        const a11 = directAxisInductance / dt + statorResistance;
        const a12 = -omegaE * quadratureAxisInductance;
        const a21 = omegaE * directAxisInductance;
        const a22 = quadratureAxisInductance / dt + statorResistance;
        const b1 = (directAxisInductance / dt) * this._iD + vD;
        const b2 = (quadratureAxisInductance / dt) * this._iQ + vQ - omegaE * lambdaMEff;
        const det = a11 * a22 - a12 * a21;
        const iDNew = (a22 * b1 - a12 * b2) / det;
        const iQNew = (a11 * b2 - a21 * b1) / det;

        const tEReluctant = (directAxisInductance - quadratureAxisInductance) * iDNew * iQNew;
        const tENew = 1.5 * p * (lambdaMEff * iQNew + tEReluctant);
        const omegaMNew = ((rotorInertia / dt) * this._omega + tENew - tauLoad) / (rotorInertia / dt + B);
        const thetaMNew = this._theta + 0.5 * (this._omega + omegaMNew) * dt;

        this._iD = iDNew;
        this._iQ = iQNew;
        this._omega = omegaMNew;
        this._theta = thetaMNew;
    }

    private _publish(session: ISession, links: ReadonlyArray<IChannel>): void {
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            if (link.slot === TransformNode.OUTPUT_WORLD) continue; // handled by super.fire
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "directAxisCurrent":
                    session.publish(idx, this._iD);
                    break;
                case "quadratureAxisCurrent":
                    session.publish(idx, this._iQ);
                    break;
                case "phaseCurrentA":
                    session.publish(idx, this._iA);
                    break;
                case "phaseCurrentB":
                    session.publish(idx, this._iB);
                    break;
                case "phaseCurrentC":
                    session.publish(idx, this._iC);
                    break;
                case "angularVelocity":
                    session.publish(idx, this._omega);
                    break;
                case "rotorAngle":
                    session.publish(idx, this._theta);
                    break;
                case "electromagneticTorque":
                    session.publish(idx, this._tauEm);
                    break;
                case "forceY":
                    session.publish(idx, this._fy);
                    break;
                case "forceZ":
                    session.publish(idx, this._fz);
                    break;
            }
        }
    }

    // ── Amplitude-invariant Clarke + Park (exact legacy convention) ────
    private static _abcToDq(a: number, viscousFriction: number, c: number, thetaE: number): [number, number] {
        const alpha = (2 / 3) * (a - 0.5 * viscousFriction - 0.5 * c);
        const beta = (2 / 3) * (0.5 * Math.sqrt(3)) * (viscousFriction - c);
        const cs = Math.cos(thetaE);
        const sn = Math.sin(thetaE);
        return [alpha * cs + beta * sn, -alpha * sn + beta * cs];
    }
    private static _dqToAbc(d: number, q: number, thetaE: number): [number, number, number] {
        const cs = Math.cos(thetaE);
        const sn = Math.sin(thetaE);
        const alpha = d * cs - q * sn;
        const beta = d * sn + q * cs;
        const half = 0.5;
        const sqrt3Over2 = 0.5 * Math.sqrt(3);
        return [alpha, -half * alpha + sqrt3Over2 * beta, -half * alpha - sqrt3Over2 * beta];
    }
}

export function createPmsmMachineDqNode(): PmsmMachineDqNode {
    return new PmsmMachineDqNode();
}
