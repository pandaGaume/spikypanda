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
 *            lambda_m * (1 + sum of flux faults). A mechanical air-gap
 *            perturbation at the rotor angle (rotor sag, eccentricity)
 *            emits {target:"flux", value: epsilon*cos(theta_m - theta_grav)}
 *            from a Physics.Environment.Gravity:rotor-sag node; it rides
 *            the back-EMF term omega_e*lambda_m_eff into V_q, so the dq and
 *            phase currents carry the 1x f_mech sideband. That is how a
 *            mechanical fault becomes readable in the ELECTRICAL signal.
 *   "tau"  : additive load-torque perturbation [Nm], same lingua franca as
 *            the other motors (imbalance, bearing, gear).
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

        // Gravity / MCSA flux coupling and load-torque faults arrive on the
        // fault bank: lambda_m_eff = lambda_m * (1 + flux), tau += tau fault.
        const fluxEnv = 1 + this.getFault("flux");
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
