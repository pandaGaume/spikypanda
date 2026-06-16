import { cloneable, editable, viewable, FaultableNode, TransformNode, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable, IHasSampleRateRequirement, IFaultDescriptor } from "spikypanda-core";

/**
 * PMSM machine in the rotor synchronous (dq) frame. Faithful port of the
 * legacy `sensors` PmsmMachine, the validation oracle, with identical
 * numerics (implicit Euler on the 2x2 electrical system, implicit
 * mechanical, trapezoidal theta, same substep cap).
 *
 * State: i_d, i_q, omega_m, theta_m. Equations (salient via L_d != L_q):
 *
 *   V_d = R*i_d + L_d*di_d/dt - omega_e*L_q*i_q
 *   V_q = R*i_q + L_q*di_q/dt + omega_e*L_d*i_d + omega_e*lambda_m_eff
 *   T_e = (3/2)*p*(lambda_m_eff*i_q + (L_d - L_q)*i_d*i_q)
 *   J*domega_m/dt + B*omega_m = T_e - tau_load
 *   dtheta_m/dt = omega_m
 *
 * World object: like every other motor (DC, BLDC) this node extends
 * FaultableNode (-> TransformNode), so it carries the local / parent_world
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
 * epsilon*cos(theta_m - theta_grav) into lambda_m_eff, plus the
 * gravity-augmented bearing preloads (F_*_eff viewables). This is the
 * gravity -> MCSA signature, automatic: put the motor in a scene, it
 * responds; swap Earth -> Orbital and the sideband vanishes. The
 * standalone Physics.Environment.Gravity:rotor-sag / bearing-preload
 * nodes remain for EXPLICIT composition (set gravityCoupling = false to
 * avoid double-counting, then wire them into the fault bank). Coupling is
 * gated on a BOUND scene (session.sceneStateView), not the per-node Earth
 * fallback, so headless drive validation with no scene stays gravity-free.
 *
 * Voltages V_a/V_b/V_c are line-neutral phase voltages (from an inverter
 * or a composed 3-phase source). Decomposition-C: FOC, SVPWM and the
 * inverter are separate nodes; the gravity-coupling env models and the
 * faults are separate nodes feeding the fault bank / tau_load.
 *
 * Defaults: Maxon ECX PRIME 6M/16L (the gravity-study reference).
 */
export class PmsmMachineDqNode extends FaultableNode implements IDeclaresPorts, IHasSampleRateRequirement {
    // Electrical + mechanical parameters (SI). ECX PRIME 6M/16L defaults.
    @cloneable private _R: number = 2.0; // stator resistance [ohm]
    @cloneable private _Ld: number = 3e-4; // d-axis inductance [H]
    @cloneable private _Lq: number = 3e-4; // q-axis inductance [H]
    @cloneable private _lambdaM: number = 2e-3; // magnet flux linkage [Wb]
    @cloneable private _P: number = 1; // pole pairs
    @cloneable private _J: number = 1e-6; // rotor inertia [kg.m^2]
    @cloneable private _b: number = 1e-7; // viscous friction [N.m.s/rad]

    // Intrinsic gravity-coupling parameters (rotor sag + bearing preload),
    // internalised from the legacy RotorSagModel / BearingPreloadModel.
    @cloneable private _gravityCoupling: boolean = true;
    @cloneable private _rotorMass: number = 0.0076; // kg (Maxon ECX PRIME)
    @cloneable private _bearingRadialStiffness: number = 1e5; // N/m
    @cloneable private _airGap: number = 5e-4; // m
    @cloneable private _nominalAxialPreload: number = 5; // N
    @cloneable private _nominalRadialPreload: number = 0; // N
    @cloneable private _umpRadialStiffness: number = 4000; // N/m (UMP -> housing vibration; 0 = none)

    @cloneable private _id0: number = 0;
    @cloneable private _iq0: number = 0;
    @cloneable private _omega0: number = 0;
    @cloneable private _theta0: number = 0;

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

    @cloneable private _requiredHzValue: number = 0;
    @cloneable private _requiredHzUserDefined: boolean = false;

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_INPUT_PORTS, // local, parent_world, fault_0
        { slot: "V_a", optional: true, type: "float" },
        { slot: "V_b", optional: true, type: "float" },
        { slot: "V_c", optional: true, type: "float" },
        { slot: "tau_load", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_OUTPUT_PORTS, // world
        { slot: "i_d", optional: false, type: "float" },
        { slot: "i_q", optional: false, type: "float" },
        { slot: "i_a", optional: false, type: "float" },
        { slot: "i_b", optional: false, type: "float" },
        { slot: "i_c", optional: false, type: "float" },
        { slot: "omega", optional: false, type: "float" },
        { slot: "theta_m", optional: false, type: "float" },
        { slot: "tau_em", optional: false, type: "float" },
        // Intrinsic vibration: the rotor sag / UMP radial force the motor
        // exerts on its housing, in the body radial plane (1x f_mech).
        { slot: "force_y", optional: false, type: "float" },
        { slot: "force_z", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
    @editable("number", { unit: "ohm" }) public get R(): number {
        return this._R;
    }
    public set R(v: number) {
        if (this.setField("R", this._R, v, (n) => (this._R = n))) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number", { unit: "H" }) public get Ld(): number {
        return this._Ld;
    }
    public set Ld(v: number) {
        if (this.setField("Ld", this._Ld, v, (n) => (this._Ld = n))) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number", { unit: "H" }) public get Lq(): number {
        return this._Lq;
    }
    public set Lq(v: number) {
        if (this.setField("Lq", this._Lq, v, (n) => (this._Lq = n))) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number", { unit: "Wb" }) public get lambdaM(): number {
        return this._lambdaM;
    }
    public set lambdaM(v: number) {
        this.setField("lambdaM", this._lambdaM, v, (n) => (this._lambdaM = n));
    }
    @editable("number") public get P(): number {
        return this._P;
    }
    public set P(v: number) {
        if (this.setField("P", this._P, v, (n) => (this._P = n))) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number", { unit: "kg.m^2" }) public get J(): number {
        return this._J;
    }
    public set J(v: number) {
        if (this.setField("J", this._J, v, (n) => (this._J = n))) this._notifyRequiredHzMayHaveChanged();
    }
    @editable("number") public get b(): number {
        return this._b;
    }
    public set b(v: number) {
        if (this.setField("b", this._b, v, (n) => (this._b = n))) this._notifyRequiredHzMayHaveChanged();
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
        this.setField("rotorMass", this._rotorMass, v, (n) => (this._rotorMass = n));
    }
    @editable("number", { unit: "N/m" }) public get bearingRadialStiffness(): number {
        return this._bearingRadialStiffness;
    }
    public set bearingRadialStiffness(v: number) {
        this.setField("bearingRadialStiffness", this._bearingRadialStiffness, v, (n) => (this._bearingRadialStiffness = n));
    }
    @editable("number", { unit: "m" }) public get airGap(): number {
        return this._airGap;
    }
    public set airGap(v: number) {
        this.setField("airGap", this._airGap, v, (n) => (this._airGap = n));
    }
    @editable("number", { unit: "N" }) public get nominalAxialPreload(): number {
        return this._nominalAxialPreload;
    }
    public set nominalAxialPreload(v: number) {
        this.setField("nominalAxialPreload", this._nominalAxialPreload, v, (n) => (this._nominalAxialPreload = n));
    }
    @editable("number", { unit: "N" }) public get nominalRadialPreload(): number {
        return this._nominalRadialPreload;
    }
    public set nominalRadialPreload(v: number) {
        this.setField("nominalRadialPreload", this._nominalRadialPreload, v, (n) => (this._nominalRadialPreload = n));
    }
    @editable("number", { unit: "N/m" }) public get umpRadialStiffness(): number {
        return this._umpRadialStiffness;
    }
    public set umpRadialStiffness(v: number) {
        this.setField("umpRadialStiffness", this._umpRadialStiffness, v, (n) => (this._umpRadialStiffness = n));
    }
    @editable("number") public get id0(): number {
        return this._id0;
    }
    public set id0(v: number) {
        this.setField("id0", this._id0, v, (n) => (this._id0 = n));
    }
    @editable("number") public get iq0(): number {
        return this._iq0;
    }
    public set iq0(v: number) {
        this.setField("iq0", this._iq0, v, (n) => (this._iq0 = n));
    }
    @editable("number") public get omega0(): number {
        return this._omega0;
    }
    public set omega0(v: number) {
        this.setField("omega0", this._omega0, v, (n) => (this._omega0 = n));
    }
    @editable("number") public get theta0(): number {
        return this._theta0;
    }
    public set theta0(v: number) {
        this.setField("theta0", this._theta0, v, (n) => (this._theta0 = n));
    }

    // ── Viewables ──────────────────────────────────────────────────────
    @viewable("number") public get i_d(): number {
        return this._iD;
    }
    @viewable("number") public get i_q(): number {
        return this._iQ;
    }
    @viewable("number") public get i_a(): number {
        return this._iA;
    }
    @viewable("number") public get i_b(): number {
        return this._iB;
    }
    @viewable("number") public get i_c(): number {
        return this._iC;
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
    @viewable("number", { unit: "N" }) public get force_y(): number {
        return this._fy;
    }
    @viewable("number", { unit: "N" }) public get force_z(): number {
        return this._fz;
    }

    // ── Sample-rate requirement (mirror of the BLDC/PMSM node) ─────────
    public computeRequiredHz(): number {
        const tauE = this._Ld > 0 && this._R > 0 ? Math.min(this._Ld, this._Lq) / this._R : Infinity;
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
        if (this._requiredHzUserDefined && this._requiredHzValue > 0) return this._requiredHzValue;
        return this.computeRequiredHz();
    }
    @editable("number", { unit: "Hz" }) public get required_hz(): number {
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
    private _notifyRequiredHzMayHaveChanged(): void {
        if (this._requiredHzUserDefined && this._requiredHzValue > 0) return;
        this.notifyPropertyChanged("required_hz", null, this.requiredHz);
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
        this._iD = this._id0;
        this._iQ = this._iq0;
        this._omega = this._omega0;
        this._theta = this._theta0;
        const [a, b, c] = PmsmMachineDqNode._dqToAbc(this._iD, this._iQ, this._P * this._theta);
        this._iA = a;
        this._iB = b;
        this._iC = c;
        this._tauEm = 0;
        this._lastT = -1;
        this._gravFluxDelta = 0;
        this._gRadial = 0;
        this._fAxialEff = this._nominalAxialPreload;
        this._fRadialEff = this._nominalRadialPreload;
        this._fy = 0;
        this._fz = 0;
    }

    public override fire(session: ISession, t: number): void {
        // 1) TransformNode hop (world = parent_world x local, publishes
        //    `world`) + FaultableNode hop (accumulates fault_N tokens).
        super.fire(session, t);

        const links = session.graph.links as ReadonlyArray<IChannel>;
        let vA = 0,
            vB = 0,
            vC = 0,
            tauLoad = 0,
            dtIn = -1;
        // Consume only this node's data slots; the transform (local /
        // parent_world) and fault_N tokens were already consumed by
        // super.fire(), so we leave them untouched here.
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            if (slot !== "V_a" && slot !== "V_b" && slot !== "V_c" && slot !== "tau_load" && slot !== "dt") continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "V_a") vA = value;
            else if (slot === "V_b") vB = value;
            else if (slot === "V_c") vC = value;
            else if (slot === "tau_load") tauLoad = value;
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
            const lambdaMEff = this._lambdaM * fluxEnv;
            const maxSubstep = this._maxSubstep();
            let elapsed = 0;
            while (elapsed < dt) {
                const h = Math.min(maxSubstep, dt - elapsed);
                this._integrateOneSubstep(h, lambdaMEff, vA, vB, vC, tauEffLoad);
                elapsed += h;
            }
            const [a, b, c] = PmsmMachineDqNode._dqToAbc(this._iD, this._iQ, this._P * this._theta);
            this._iA = a;
            this._iB = b;
            this._iC = c;
            const reluctant = (this._Ld - this._Lq) * this._iD * this._iQ;
            this._tauEm = 1.5 * this._P * (lambdaMEff * this._iQ + reluctant);
        }

        this._publish(session, links);
    }

    private _maxSubstep(): number {
        const tauElec = Math.min(this._Ld, this._Lq) / this._R;
        const tauMech = this._b > 0 ? this._J / this._b : Number.POSITIVE_INFINITY;
        return Math.max(5e-6, Math.min(tauElec / 10, tauMech / 10));
    }

    /**
     * Recompute the intrinsic gravity coupling for this tick from the bound
     * scene's gravity and this machine's world pose. Gated on a BOUND scene
     * (session.sceneStateView), NOT the per-node Earth fallback, so headless
     * drive validation with no scene stays gravity-free and bit-exact with
     * the legacy oracle. Faithful to RotorSagModel / BearingPreloadModel:
     *   g_body  = R^T * g_world          (R = rotation part of `world`)
     *   sag     = (rotorMass*g_radial / bearingRadialStiffness / airGap)
     *             * cos(theta_m - g_angle)
     *   F_*_eff = nominal_* + rotorMass * g_{axial,radial}
     */
    private _updateGravityCoupling(session: ISession): void {
        const scene = this.boundScene(session); // per-node scene wins, then session, else null
        if (!this._gravityCoupling || !scene) {
            this._gravFluxDelta = 0;
            this._gRadial = 0;
            this._fAxialEff = this._nominalAxialPreload;
            this._fRadialEff = this._nominalRadialPreload;
            this._fy = 0;
            this._fz = 0;
            return;
        }
        const g = scene.gravity;
        const W = this.world; // body -> world, column-major flat[16]
        // g_body = R^T * g_world (R = columns 0,1,2 of W).
        const gx = W[0] * g.x + W[1] * g.y + W[2] * g.z; // signed axial (body X)
        const gy = W[4] * g.x + W[5] * g.y + W[6] * g.z;
        const gz = W[8] * g.x + W[9] * g.y + W[10] * g.z;
        const gRadial = Math.sqrt(gy * gy + gz * gz);
        this._gRadial = gRadial;
        if (gRadial < 1e-12) {
            this._gravFluxDelta = 0;
            this._fy = 0;
            this._fz = 0;
        } else {
            const delta = (this._rotorMass * gRadial) / this._bearingRadialStiffness;
            const epsilon = delta / this._airGap;
            const gAngle = Math.atan2(gz, gy);
            const phase = this._theta - gAngle;
            this._gravFluxDelta = epsilon < 1e-12 ? 0 : epsilon * Math.cos(phase);
            // UMP rotor-sag radial force on the housing (1x f_mech vibration).
            const F = this._umpRadialStiffness * delta;
            this._fy = F * Math.cos(phase);
            this._fz = F * Math.sin(phase);
        }
        this._fAxialEff = this._nominalAxialPreload + this._rotorMass * gx;
        this._fRadialEff = this._nominalRadialPreload + this._rotorMass * gRadial;
    }

    // Implicit Euler on the electrical 2x2 + implicit mechanical +
    // trapezoidal theta, omega_e held at its pre-step value. Numerically
    // identical to the legacy PmsmMachine._integrateOneSubstep.
    private _integrateOneSubstep(dt: number, lambdaMEff: number, vA: number, vB: number, vC: number, tauLoad: number): void {
        const Rs = this._R;
        const Ld = this._Ld;
        const Lq = this._Lq;
        const p = this._P;
        const J = this._J;
        const B = this._b;

        const thetaE = p * this._theta;
        const omegaE = p * this._omega;
        const [vD, vQ] = PmsmMachineDqNode._abcToDq(vA, vB, vC, thetaE);

        const a11 = Ld / dt + Rs;
        const a12 = -omegaE * Lq;
        const a21 = omegaE * Ld;
        const a22 = Lq / dt + Rs;
        const b1 = (Ld / dt) * this._iD + vD;
        const b2 = (Lq / dt) * this._iQ + vQ - omegaE * lambdaMEff;
        const det = a11 * a22 - a12 * a21;
        const iDNew = (a22 * b1 - a12 * b2) / det;
        const iQNew = (a11 * b2 - a21 * b1) / det;

        const tEReluctant = (Ld - Lq) * iDNew * iQNew;
        const tENew = 1.5 * p * (lambdaMEff * iQNew + tEReluctant);
        const omegaMNew = ((J / dt) * this._omega + tENew - tauLoad) / (J / dt + B);
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
                case "i_d":
                    session.publish(idx, this._iD);
                    break;
                case "i_q":
                    session.publish(idx, this._iQ);
                    break;
                case "i_a":
                    session.publish(idx, this._iA);
                    break;
                case "i_b":
                    session.publish(idx, this._iB);
                    break;
                case "i_c":
                    session.publish(idx, this._iC);
                    break;
                case "omega":
                    session.publish(idx, this._omega);
                    break;
                case "theta_m":
                    session.publish(idx, this._theta);
                    break;
                case "tau_em":
                    session.publish(idx, this._tauEm);
                    break;
                case "force_y":
                    session.publish(idx, this._fy);
                    break;
                case "force_z":
                    session.publish(idx, this._fz);
                    break;
            }
        }
    }

    // ── Amplitude-invariant Clarke + Park (exact legacy convention) ────
    private static _abcToDq(a: number, b: number, c: number, thetaE: number): [number, number] {
        const alpha = (2 / 3) * (a - 0.5 * b - 0.5 * c);
        const beta = (2 / 3) * (0.5 * Math.sqrt(3)) * (b - c);
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
