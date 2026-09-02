import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IFaultDescriptor, IOlink, IPortDescriptor, ISession } from "spikypanda-core";
import type { ICartesian, Nullable, IHasSampleRateRequirement, IIntegrable, IIntegrationInputs } from "spikypanda-core";
import { FaultableNode } from "spikypanda-core";

/**
 * Separately-excited DC motor — dynamic model expressed as an
 * IIntegrable. The coupled electrical + mechanical equations
 *
 *     di/dt = (armatureVoltage - armatureResistance·armatureCurrent - backEmfConstant·ω) / armatureInductance
 *     dω/dt = (torqueConstant·armatureCurrent - viscousFriction·ω - (τ_load + τ_fault)) / rotorInertia
 *
 * are exposed via `rhs(t, y, inputs, dydt)`; the integration loop
 * (adaptive RK4 by default) is owned by the Session's attached solver.
 * Because the solver runs in the Session's integration phase BEFORE
 * the dispatch phase fires this node, `fire()` is now pure I/O: it
 * publishes the just-updated `armatureCurrent / angularVelocity / electromagneticTorque` on the outgoing
 * channels and runs the inherited FaultableNode + TransformNode
 * pipelines.
 *
 * Inputs (all optional, default 0):
 *   armatureVoltage         armature voltage [armatureVoltage]
 *   loadTorque  external load torque [Nm]
 *   fault_N   variadic IFaultDescriptor bank (inherited from
 *             FaultableNode). Faults with target "tau" are summed into
 *             loadTorque, so any bearing/shaft/gear/modulator output wires
 *             directly. Other targets are accepted but ignored by V1.
 *   local, parentWorld  inherited from TransformNode (matrix44)
 *
 * Outputs:
 *   armatureCurrent         armature current at end of step [A]
 *   angularVelocity     angular speed at end of step [rad/s]
 *   electromagneticTorque    electromagnetic torque (= torqueConstant·armatureCurrent) [Nm]
 *   world     inherited from TransformNode (matrix44)
 *
 * Notes:
 *   - The legacy `dt` input port is GONE. Session.dt is the single
 *     source of truth for the timebase, consumed by the attached
 *     RK4 solver (or whatever solver the user drops in the graph).
 *   - Without a solver in the graph, the motor doesn't integrate —
 *     state stays at (initialArmatureCurrent, initialAngularVelocity). Drop a `Control.Sim:rk4-solver`
 *     marker node in the graph to enable integration.
 *   - State (armatureCurrent, angularVelocity) is restored to (initialArmatureCurrent, initialAngularVelocity) on session reset.
 *     The solver gathers from these fields at attach time.
 *
 * Mass / inertia block (single source of truth for gravity coupling). The
 * electromechanical ODE above is unchanged; these fields describe the motor's
 * MASS, which the gravity-dependent faults LINKED to this motor read:
 *   motorMass            total motor mass [kg] (structural / mounting load)
 *   rotorMass            rotating assembly mass [kg] (sag, bearing preload,
 *                        imbalance all scale with it)
 *   rotorGyrationRadius  radius of gyration k_g [m]; the rotor inertia is
 *                        rotorInertia = rotorMass · k_g², surfaced as the
 *                        viewable `inertiaFromMass` to cross-check rotorInertia (which
 *                        stays the integrator input here)
 *   comOffset, comPhase  residual centre-of-mass eccentricity e [m] and its
 *                        phase [rad]; the unbalance product is rotorMass · e —
 *                        the term that SURVIVES in micro-gravity as the 1x
 *                        centripetal imbalance signature (a static-gravity sag
 *                        vanishes when g→0, a mass asymmetry does not)
 * This is a LUMPED model; the target (model level C) is a per-component mass
 * distribution (shaft / iron core / windings / commutator / can / magnets)
 * that DERIVES both the inertia and the CoM offset from geometry + density.
 */
export class DcMotorDynamicNode extends FaultableNode implements IDeclaresPorts, IIntegrable, IHasSampleRateRequirement {
    // ── IIntegrable trait ──────────────────────────────────────────────
    public readonly stateSize = 2;
    public readonly stateNames: ReadonlyArray<string> = ["armatureCurrent", "angularVelocity"];

    // ── P8 sample-rate requirement ─────────────────────────────────────
    // FaultableNode → TransformNode → RuntimeNode chain prevents this
    // class from extending IntegrableRuntimeNode directly, so the
    // computeRequiredHz / user-pin pattern is duplicated here. Keep
    // signatures identical to IntegrableRuntimeNode so a future mixin
    // refactor is straightforward.
    @cloneable private _requiredHzValue: number = 0;
    @cloneable private _requiredHzUserDefined: boolean = false;

    /** Derive the recommended sample rate from the dominant time
     *  constant. The motor has two poles:
     *
     *      τ_e = armatureInductance / armatureResistance   (electrical, fast)
     *      τ_m = rotorInertia / viscousFriction   (mechanical, slow)
     *
     *  Honoring the fast pole keeps the inner integrator stable; we
     *  pick 10 / τ_min as a comfortable margin (~10 samples per
     *  exponential e-fold). Examples:
     *      armatureInductance=1mH armatureResistance=1Ω      → τ_e=1ms  → 10 kHz
     *      armatureInductance=10mH armatureResistance=1Ω     → τ_e=10ms → 1 kHz
     *      armatureInductance=1mH armatureResistance=0.1Ω    → τ_e=10ms → 1 kHz
     *  Clamped to [60, 1e6] to keep the panel sensible. */
    protected computeRequiredHz(): number {
        const tauE = this._armatureInductance > 0 && this._armatureResistance > 0 ? this._armatureInductance / this._armatureResistance : Infinity;
        const tauM = this._rotorInertia > 0 && this._viscousFriction > 0 ? this._rotorInertia / this._viscousFriction : Infinity;
        const tauMin = Math.min(tauE, tauM);
        if (!Number.isFinite(tauMin) || tauMin <= 0) return 1000;
        const hz = 10 / tauMin;
        return Math.max(60, Math.min(1e6, hz));
    }

    public get requiredHz(): number {
        if (this._requiredHzUserDefined && this._requiredHzValue > 0) {
            return this._requiredHzValue;
        }
        return this.computeRequiredHz();
    }

    @editable("number", { unit: { quantity: "Frequency", unit: "Hz" } })
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

    // ── Physical parameters ─────────────────────────────────────────────
    @cloneable private _armatureResistance: number = 1.0; // armature resistance  [Ω]
    @cloneable private _armatureInductance: number = 1e-3; // armature inductance  [H]
    @cloneable private _torqueConstant: number = 0.01; // torque constant      [Nm/A]
    @cloneable private _backEmfConstant: number = 0.01; // back-EMF constant    [armatureVoltage·s/rad]
    @cloneable private _rotorInertia: number = 1e-5; // rotor inertia        [kg·m²]
    @cloneable private _viscousFriction: number = 1e-4; // viscous friction     [Nm·s/rad]
    @cloneable private _initialArmatureCurrent: number = 0;
    @cloneable private _initialAngularVelocity: number = 0;
    @cloneable private _initialRotorAngle: number = 0; // rotor angle at reset [rad]

    // ── Mass / inertia block ────────────────────────────────────────────
    // Single source of truth for the motor's mass, read by the gravity-
    // dependent faults LINKED to this motor. Does NOT change the electrical /
    // mechanical ODE (rotorInertia stays the integrator input). RS-385PH-15125 values.
    @cloneable private _motorMass: number = 0.082; // total motor mass        [kg]
    @cloneable private _rotorMass: number = 0.013; // rotating assembly mass  [kg]
    @cloneable private _rotorGyrationRadius: number = 0.00679; // radius of gyration k_g [m]; rotorInertia = rotorMass·k_g²
    @cloneable private _comOffset: number = 3.85e-4; // residual CoM eccentricity e [m]; unbalance = rotorMass·e
    @cloneable private _comPhase: number = 0; // angular phase of the CoM offset [rad]

    // ── Geometry block ──────────────────────────────────────────────────
    // Motor PROPERTIES (not ports) read by the faults LINKED to this motor:
    // a sag/eccentricity fault reads airGap + bearingRadialStiffness to turn a
    // rotor radial displacement into an air-gap modulation (-> flux -> current)
    // and a UMP force. RS-385PH-15125-class small-motor defaults.
    @cloneable private _airGap: number = 5e-4; // nominal radial air gap [m]
    @cloneable private _bearingRadialStiffness: number = 1e5; // shaft/bearing radial stiffness [N/m]
    @cloneable private _umpRadialStiffness: number = 0; // unbalanced-magnetic-pull stiffness [N/m] (0 = no UMP force)

    // ── Internal state (cloneable so editor save/restore captures it) ──
    // _lastT removed — Session.dt is the single source of truth now;
    // the solver in the integration phase reads it directly.
    @cloneable private _i: number = 0;
    @cloneable private _omega: number = 0;
    @cloneable private _tauEm: number = 0;

    // Air-gap eccentricity STATE -> EM consequences. The linked cause-faults
    // (sag, static/dynamic eccentricity) contribute a rotor radial displacement
    // (the "eccentricityY/Z" fault targets); THIS model turns the aggregated
    // displacement into its two electromagnetic consequences, recomputed each
    // fire(): a flux modulation (-> current) and a UMP radial force
    // (-> housing -> vibration). Transient (not @cloneable): recomputed, not state.
    private _rotorAngle: number = 0; // integrated rotor angle [rad] (flux phase)
    private _fluxModulation: number = 0; // flux delta from the air-gap eccentricity
    private _umpForceY: number = 0; // UMP radial force, body Y [N]
    private _umpForceZ: number = 0; // UMP radial force, body Z [N]
    private _forceY: number = 0; // TOTAL radial force to the housing (UMP + direct) [N]
    private _forceZ: number = 0; // TOTAL radial force to the housing (UMP + direct) [N]

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_INPUT_PORTS,
        // armatureVoltage and loadTorque are CONTINUOUS SIGNALS (Zero-Order Hold). The
        // solver reads their current value via `session.readSignal` at
        // every rhs evaluation; the upstream publishers (PI, Slider,
        // ...) overwrite the value on each tick. No buffer, no drain,
        // no overflow. Reading a signal that has never been published
        // returns undefined → falls back to 0 in `rhs`.
        { slot: "armatureVoltage", optional: true, type: "float", kind: "signal" },
        { slot: "loadTorque", optional: true, type: "float", kind: "signal" },
    ];
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_OUTPUT_PORTS,
        // Observation outputs as signals — downstream consumers
        // (Tachymeter, FB Channel, plots) read the current value via
        // ZOH semantics. Matches the physical reality: angularVelocity(t) and
        // armatureCurrent(t) are continuous quantities.
        { slot: "armatureCurrent", optional: false, type: "float", kind: "signal" },
        { slot: "angularVelocity", optional: false, type: "float", kind: "signal" },
        { slot: "electromagneticTorque", optional: false, type: "float", kind: "signal" },
        // Unbalanced-magnetic-pull radial force: the EM consequence of the
        // air-gap eccentricity state -> wire to a Housing's forceY/forceZ.
        { slot: "forceY", optional: false, type: "float", kind: "signal" },
        { slot: "forceZ", optional: false, type: "float", kind: "signal" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
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

    @editable("number") public get torqueConstant(): number {
        return this._torqueConstant;
    }
    public set torqueConstant(v: number) {
        this.setField("torqueConstant", this._torqueConstant, v, (n) => {
            this._torqueConstant = n;
        });
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

    @editable("number") public get initialArmatureCurrent(): number {
        return this._initialArmatureCurrent;
    }
    public set initialArmatureCurrent(v: number) {
        this.setField("initialArmatureCurrent", this._initialArmatureCurrent, v, (n) => {
            this._initialArmatureCurrent = n;
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

    @editable("number", { unit: { quantity: "Angle", unit: "r" } }) public get initialRotorAngle(): number {
        return this._initialRotorAngle;
    }
    public set initialRotorAngle(v: number) {
        this.setField("initialRotorAngle", this._initialRotorAngle, v, (n) => {
            this._initialRotorAngle = n;
        });
    }

    // ── Mass / inertia editables ───────────────────────────────────────
    @editable("number", { unit: { quantity: "Mass", unit: "kg" } }) public get motorMass(): number {
        return this._motorMass;
    }
    public set motorMass(v: number) {
        this.setField("motorMass", this._motorMass, v, (n) => {
            this._motorMass = n;
        });
    }

    @editable("number", { unit: { quantity: "Mass", unit: "kg" } }) public get rotorMass(): number {
        return this._rotorMass;
    }
    public set rotorMass(v: number) {
        this.setField("rotorMass", this._rotorMass, v, (n) => {
            this._rotorMass = n;
        });
    }

    @editable("number", { unit: { quantity: "Length", unit: "m" } }) public get rotorGyrationRadius(): number {
        return this._rotorGyrationRadius;
    }
    public set rotorGyrationRadius(v: number) {
        this.setField("rotorGyrationRadius", this._rotorGyrationRadius, v, (n) => {
            this._rotorGyrationRadius = n;
        });
    }

    @editable("number", { unit: { quantity: "Length", unit: "m" } }) public get comOffset(): number {
        return this._comOffset;
    }
    public set comOffset(v: number) {
        this.setField("comOffset", this._comOffset, v, (n) => {
            this._comOffset = n;
        });
    }

    @editable("number", { unit: { quantity: "Angle", unit: "r" } }) public get comPhase(): number {
        return this._comPhase;
    }
    public set comPhase(v: number) {
        this.setField("comPhase", this._comPhase, v, (n) => {
            this._comPhase = n;
        });
    }

    // ── Geometry editables ─────────────────────────────────────────────
    @editable("number", { unit: { quantity: "Length", unit: "m" } }) public get airGap(): number {
        return this._airGap;
    }
    public set airGap(v: number) {
        this.setField("airGap", this._airGap, v, (n) => {
            this._airGap = n;
        });
    }

    @editable("number", { unit: { quantity: "Stiffness", unit: "Npm" } }) public get bearingRadialStiffness(): number {
        return this._bearingRadialStiffness;
    }
    public set bearingRadialStiffness(v: number) {
        this.setField("bearingRadialStiffness", this._bearingRadialStiffness, v, (n) => {
            this._bearingRadialStiffness = n;
        });
    }

    @editable("number", { unit: { quantity: "Stiffness", unit: "Npm" } }) public get umpRadialStiffness(): number {
        return this._umpRadialStiffness;
    }
    public set umpRadialStiffness(v: number) {
        this.setField("umpRadialStiffness", this._umpRadialStiffness, v, (n) => {
            this._umpRadialStiffness = n;
        });
    }

    // ── Viewables (mirrors of state into the property panel) ───────────
    @viewable("number") public get armatureCurrent(): number {
        return this._i;
    }
    @viewable("number") public get angularVelocity(): number {
        return this._omega;
    }
    @viewable("number") public get electromagneticTorque(): number {
        return this._tauEm;
    }

    // EM consequences of the air-gap eccentricity state (recomputed each fire).
    @viewable("number") public get rotorAngle(): number {
        return this._rotorAngle;
    }
    @viewable("number") public get fluxModulation(): number {
        return this._fluxModulation;
    }
    @viewable("number") public get umpForceY(): number {
        return this._umpForceY;
    }
    @viewable("number") public get umpForceZ(): number {
        return this._umpForceZ;
    }
    /** Total radial force sent to the housing (UMP + direct fault forces). */
    @viewable("number") public get forceY(): number {
        return this._forceY;
    }
    @viewable("number") public get forceZ(): number {
        return this._forceZ;
    }

    /** Rotor inertia implied by the mass block: rotorMass · rotorGyrationRadius².
     *  Cross-check against the editable rotorInertia — they should agree (RS-385: both
     *  ≈ 6.0e-7). A divergence means the mass block and rotorInertia describe different
     *  rotors. Model level C will DERIVE the inertia from the mass distribution
     *  instead of carrying both rotorInertia and the mass block. */
    @viewable("number") public get inertiaFromMass(): number {
        return this._rotorMass * this._rotorGyrationRadius * this._rotorGyrationRadius;
    }

    /** Physically meaningful fault contributions for a brushed DC motor: "tau"
     *  (additive load torque) and the air-gap ECCENTRICITY state
     *  "eccentricityY" / "eccentricityZ" (a rotor radial displacement [m] in the
     *  body radial plane, contributed by the linked cause-faults). The motor
     *  turns the aggregated eccentricity into its EM consequences (flux + UMP)
     *  in `fire`/`rhs`. Other targets (e.g. a cage "broken_bar") are dropped. */
    protected override acceptFault(fault: IFaultDescriptor): boolean {
        return fault.target === "tau" || fault.target === "eccentricityY" || fault.target === "eccentricityZ" || fault.target === "radialForceY" || fault.target === "radialForceZ";
    }

    // ── IIntegrable implementation ─────────────────────────────────────
    // The solver attached to the session calls these. Indices in the
    // state slice: 0 = armatureCurrent (armature current), 1 = angularVelocity (angular speed).
    // electromagneticTorque is a DERIVED output (torqueConstant·armatureCurrent), not a state — recomputed in
    // fire() from the already-integrated current.

    public gatherState(y: Float64Array, offset: number): void {
        y[offset + 0] = this._i;
        y[offset + 1] = this._omega;
    }

    public writeState(y: Float64Array, offset: number): void {
        // setField preserves the viewable + LiveBinder propagation.
        // The solver writes here at the END of each accepted macro step,
        // BEFORE the dispatch phase fires this node — so any downstream
        // node consuming `armatureCurrent / angularVelocity / electromagneticTorque` from this node's fire()
        // sees the fully integrated values.
        this.setField("armatureCurrent", this._i, y[offset + 0], (n) => {
            this._i = n;
        });
        this.setField("angularVelocity", this._omega, y[offset + 1], (n) => {
            this._omega = n;
        });
        this.setField("electromagneticTorque", this._tauEm, this._torqueConstant * y[offset + 0], (n) => {
            this._tauEm = n;
        });
    }

    public rhs(_t: number, y: Float64Array, offset: number, inputs: IIntegrationInputs, dydt: Float64Array): void {
        // PURE function of (y, inputs). Must not read or write any
        // state outside the (y, dydt) slice — the solver may call this
        // multiple times per macro-step at different y values for its
        // embedded-error estimate (Cash-Karp evaluates 6 stages).
        const armatureCurrent = y[offset + 0];
        const angularVelocity = y[offset + 1];
        const armatureVoltage = inputs.get("armatureVoltage") ?? 0;
        const tauLoad = inputs.get("loadTorque") ?? 0;
        // Faults can't be re-evaluated mid-step (their source data isn't
        // snapshot here), so we sample the current accumulated fault
        // torque once per rhs call. This is the same per-macro-step
        // snapshot the v2 plan calls for (Q1.2).
        const tauEff = tauLoad + this.getFault("tau");
        // Air-gap -> flux -> current coupling (the explicit MCSA stage): in a
        // brushed DC motor BOTH the torque constant and the back-emf constant
        // are proportional to the air-gap FLUX. The air-gap ECCENTRICITY state
        // (aggregated from the cause-faults) modulates the flux; this model
        // computes that modulation in fire() and folds `1 + fluxModulation` into
        // the two constants IDENTICALLY -> an armature-current ripple at the
        // rotation frequency (the current signature). No eccentricity ->
        // fluxModulation = 0 -> fluxEnv exactly 1.0 -> bit-exact.
        const fluxEnv = 1 + this._fluxModulation;
        dydt[offset + 0] =
            (armatureVoltage - this._armatureResistance * armatureCurrent - this._backEmfConstant * fluxEnv * angularVelocity) / Math.max(this._armatureInductance, 1e-12);
        dydt[offset + 1] = (this._torqueConstant * fluxEnv * armatureCurrent - this._viscousFriction * angularVelocity - tauEff) / Math.max(this._rotorInertia, 1e-12);
    }

    // ── Lifecycle ──────────────────────────────────────────────────────
    public override reset(session: ISession): void {
        super.reset(session);
        this.setField("armatureCurrent", this._i, this._initialArmatureCurrent, (n) => {
            this._i = n;
        });
        this.setField("angularVelocity", this._omega, this._initialAngularVelocity, (n) => {
            this._omega = n;
        });
        this.setField("electromagneticTorque", this._tauEm, this._torqueConstant * this._initialArmatureCurrent, (n) => {
            this._tauEm = n;
        });
        this._rotorAngle = this._initialRotorAngle;
        this._fluxModulation = 0;
        this._umpForceY = 0;
        this._umpForceZ = 0;
    }

    public override fire(session: ISession, t: number): void {
        // Pure I/O. The solver in the Session's integration phase has
        // already advanced (this._i, this._omega) via writeState() —
        // reading armatureVoltage and loadTorque from session.readSignal at each
        // micro-step's rhs() call.
        //
        // armatureVoltage and loadTorque are SIGNALS now: no buffer, no drain, no
        // consumption logic. The upstream publishers overwrite the
        // signal on each tick; the motor reads the latest at any time.
        // Required = 0 (signals don't gate), so motor fires every tick
        // and publishes the freshly-integrated state.
        super.fire(session, t);

        // Air-gap eccentricity STATE -> its two electromagnetic consequences.
        // The linked cause-faults accumulated a rotor radial displacement
        // (eccentricityY/Z, body radial plane); aggregate it and compute:
        //   (a) the flux modulation -> current (read by rhs on the next step),
        //   (b) the UMP radial force -> housing -> vibration.
        const dt = session.dt;
        if (Number.isFinite(dt)) this._rotorAngle += this._omega * dt;
        const eccentricityY = this.getFault("eccentricityY");
        const eccentricityZ = this.getFault("eccentricityZ");
        const eccentricity = Math.hypot(eccentricityY, eccentricityZ);
        if (eccentricity > 0 && this._airGap > 0) {
            // A winding sweeping past the fixed gap minimum sees a 1x f_mech flux
            // ripple; epsilon = |displacement| / air gap, phase = rotorAngle vs
            // the eccentricity direction.
            const eccAngle = Math.atan2(eccentricityZ, eccentricityY);
            this._fluxModulation = (eccentricity / this._airGap) * Math.cos(this._rotorAngle - eccAngle);
        } else {
            this._fluxModulation = 0;
        }
        // UMP pulls the rotor toward the smaller gap = the displacement
        // direction: a radial force along (eccY, eccZ) scaled by the stiffness.
        this._umpForceY = this._umpRadialStiffness * eccentricityY;
        this._umpForceZ = this._umpRadialStiffness * eccentricityZ;
        // Total radial force on the housing = the UMP (from the air-gap
        // eccentricity) PLUS direct radial forces from mechanical faults (e.g.
        // imbalance, a force rotating at 1x). The VIBRATION is their VECTOR SUM,
        // so two faults can MASK each other in amplitude (a rotating imbalance
        // opposing the eccentricity UMP cancels the 1x vibration). The flux,
        // hence the CURRENT, comes from the eccentricity ALONE -> MCSA still
        // reveals an eccentricity that the vibration hides.
        this._forceY = this._umpForceY + this.getFault("radialForceY");
        this._forceZ = this._umpForceZ + this.getFault("radialForceZ");

        const links = session.graph.links as ReadonlyArray<IChannel>;
        const broadcast = (slot: string, val: unknown): void => {
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== slot || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, val);
            }
        };
        broadcast("armatureCurrent", this._i);
        broadcast("angularVelocity", this._omega);
        broadcast("electromagneticTorque", this._tauEm);
        broadcast("forceY", this._forceY);
        broadcast("forceZ", this._forceZ);
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createDcMotorDynamicNode(): DcMotorDynamicNode {
    return new DcMotorDynamicNode();
}
