import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession } from "spikypanda-core";
import type { ICartesian, Nullable, IHasSampleRateRequirement, IIntegrable, IIntegrationInputs } from "spikypanda-core";
import { FaultableNode } from "../../transform/fault.node.js";

/**
 * Separately-excited DC motor — dynamic model expressed as an
 * IIntegrable. The coupled electrical + mechanical equations
 *
 *     di/dt = (V - R·i - Ke·ω) / L
 *     dω/dt = (Kt·i - b·ω - (τ_load + τ_fault)) / J
 *
 * are exposed via `rhs(t, y, inputs, dydt)`; the integration loop
 * (adaptive RK4 by default) is owned by the Session's attached solver.
 * Because the solver runs in the Session's integration phase BEFORE
 * the dispatch phase fires this node, `fire()` is now pure I/O: it
 * publishes the just-updated `i / omega / tau_em` on the outgoing
 * channels and runs the inherited FaultableNode + TransformNode
 * pipelines.
 *
 * Inputs (all optional, default 0):
 *   V         armature voltage [V]
 *   tau_load  external load torque [Nm]
 *   fault_N   variadic IFaultDescriptor bank (inherited from
 *             FaultableNode). Faults with target "tau" are summed into
 *             tau_load, so any bearing/shaft/gear/modulator output wires
 *             directly. Other targets are accepted but ignored by V1.
 *   local, parent_world  inherited from TransformNode (matrix44)
 *
 * Outputs:
 *   i         armature current at end of step [A]
 *   omega     angular speed at end of step [rad/s]
 *   tau_em    electromagnetic torque (= Kt·i) [Nm]
 *   world     inherited from TransformNode (matrix44)
 *
 * Notes:
 *   - The legacy `dt` input port is GONE. Session.dt is the single
 *     source of truth for the timebase, consumed by the attached
 *     RK4 solver (or whatever solver the user drops in the graph).
 *   - Without a solver in the graph, the motor doesn't integrate —
 *     state stays at (i0, omega0). Drop a `Control.Sim:rk4-solver`
 *     marker node in the graph to enable integration.
 *   - State (i, omega) is restored to (i0, omega0) on session reset.
 *     The solver gathers from these fields at attach time.
 */
export class DcMotorDynamicNode extends FaultableNode implements IDeclaresPorts, IIntegrable, IHasSampleRateRequirement {
    // ── IIntegrable trait ──────────────────────────────────────────────
    public readonly stateSize = 2;
    public readonly stateNames: ReadonlyArray<string> = ["i", "omega"];

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
     *      τ_e = L / R   (electrical, fast)
     *      τ_m = J / b   (mechanical, slow)
     *
     *  Honoring the fast pole keeps the inner integrator stable; we
     *  pick 10 / τ_min as a comfortable margin (~10 samples per
     *  exponential e-fold). Examples:
     *      L=1mH R=1Ω      → τ_e=1ms  → 10 kHz
     *      L=10mH R=1Ω     → τ_e=10ms → 1 kHz
     *      L=1mH R=0.1Ω    → τ_e=10ms → 1 kHz
     *  Clamped to [60, 1e6] to keep the panel sensible. */
    protected computeRequiredHz(): number {
        const tauE = this._L > 0 && this._R > 0 ? this._L / this._R : Infinity;
        const tauM = this._J > 0 && this._b > 0 ? this._J / this._b : Infinity;
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

    // ── Physical parameters ─────────────────────────────────────────────
    @cloneable private _R: number = 1.0; // armature resistance  [Ω]
    @cloneable private _L: number = 1e-3; // armature inductance  [H]
    @cloneable private _Kt: number = 0.01; // torque constant      [Nm/A]
    @cloneable private _Ke: number = 0.01; // back-EMF constant    [V·s/rad]
    @cloneable private _J: number = 1e-5; // rotor inertia        [kg·m²]
    @cloneable private _b: number = 1e-4; // viscous friction     [Nm·s/rad]
    @cloneable private _i0: number = 0;
    @cloneable private _omega0: number = 0;

    // ── Internal state (cloneable so editor save/restore captures it) ──
    // _lastT removed — Session.dt is the single source of truth now;
    // the solver in the integration phase reads it directly.
    @cloneable private _i: number = 0;
    @cloneable private _omega: number = 0;
    @cloneable private _tauEm: number = 0;

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_INPUT_PORTS,
        // V and tau_load are CONTINUOUS SIGNALS (Zero-Order Hold). The
        // solver reads their current value via `session.readSignal` at
        // every rhs evaluation; the upstream publishers (PI, Slider,
        // ...) overwrite the value on each tick. No buffer, no drain,
        // no overflow. Reading a signal that has never been published
        // returns undefined → falls back to 0 in `rhs`.
        { slot: "V", optional: true, type: "float", kind: "signal" },
        { slot: "tau_load", optional: true, type: "float", kind: "signal" },
    ];
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_OUTPUT_PORTS,
        // Observation outputs as signals — downstream consumers
        // (Tachymeter, FB Channel, plots) read the current value via
        // ZOH semantics. Matches the physical reality: omega(t) and
        // i(t) are continuous quantities.
        { slot: "i", optional: false, type: "float", kind: "signal" },
        { slot: "omega", optional: false, type: "float", kind: "signal" },
        { slot: "tau_em", optional: false, type: "float", kind: "signal" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
    @editable("number") public get R(): number {
        return this._R;
    }
    public set R(v: number) {
        if (
            this.setField("R", this._R, v, (n) => {
                this._R = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }

    @editable("number") public get L(): number {
        return this._L;
    }
    public set L(v: number) {
        if (
            this.setField("L", this._L, v, (n) => {
                this._L = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }

    @editable("number") public get Kt(): number {
        return this._Kt;
    }
    public set Kt(v: number) {
        this.setField("Kt", this._Kt, v, (n) => {
            this._Kt = n;
        });
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
        if (
            this.setField("J", this._J, v, (n) => {
                this._J = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }

    @editable("number") public get b(): number {
        return this._b;
    }
    public set b(v: number) {
        if (
            this.setField("b", this._b, v, (n) => {
                this._b = n;
            })
        )
            this._notifyRequiredHzMayHaveChanged();
    }

    @editable("number") public get i0(): number {
        return this._i0;
    }
    public set i0(v: number) {
        this.setField("i0", this._i0, v, (n) => {
            this._i0 = n;
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

    // ── Viewables (mirrors of state into the property panel) ───────────
    @viewable("number") public get i(): number {
        return this._i;
    }
    @viewable("number") public get omega(): number {
        return this._omega;
    }
    @viewable("number") public get tau_em(): number {
        return this._tauEm;
    }

    // ── IIntegrable implementation ─────────────────────────────────────
    // The solver attached to the session calls these. Indices in the
    // state slice: 0 = i (armature current), 1 = omega (angular speed).
    // tau_em is a DERIVED output (Kt·i), not a state — recomputed in
    // fire() from the already-integrated current.

    public gatherState(y: Float64Array, offset: number): void {
        y[offset + 0] = this._i;
        y[offset + 1] = this._omega;
    }

    public writeState(y: Float64Array, offset: number): void {
        // setField preserves the viewable + LiveBinder propagation.
        // The solver writes here at the END of each accepted macro step,
        // BEFORE the dispatch phase fires this node — so any downstream
        // node consuming `i / omega / tau_em` from this node's fire()
        // sees the fully integrated values.
        this.setField("i", this._i, y[offset + 0], (n) => {
            this._i = n;
        });
        this.setField("omega", this._omega, y[offset + 1], (n) => {
            this._omega = n;
        });
        this.setField("tau_em", this._tauEm, this._Kt * y[offset + 0], (n) => {
            this._tauEm = n;
        });
    }

    public rhs(_t: number, y: Float64Array, offset: number, inputs: IIntegrationInputs, dydt: Float64Array): void {
        // PURE function of (y, inputs). Must not read or write any
        // state outside the (y, dydt) slice — the solver may call this
        // multiple times per macro-step at different y values for its
        // embedded-error estimate (Cash-Karp evaluates 6 stages).
        const i = y[offset + 0];
        const omega = y[offset + 1];
        const V = inputs.get("V") ?? 0;
        const tauLoad = inputs.get("tau_load") ?? 0;
        // Faults can't be re-evaluated mid-step (their source data isn't
        // snapshot here), so we sample the current accumulated fault
        // torque once per rhs call. This is the same per-macro-step
        // snapshot the v2 plan calls for (Q1.2).
        const tauEff = tauLoad + this.getFault("tau");
        dydt[offset + 0] = (V - this._R * i - this._Ke * omega) / Math.max(this._L, 1e-12);
        dydt[offset + 1] = (this._Kt * i - this._b * omega - tauEff) / Math.max(this._J, 1e-12);
    }

    // ── Lifecycle ──────────────────────────────────────────────────────
    public override reset(session: ISession): void {
        super.reset(session);
        this.setField("i", this._i, this._i0, (n) => {
            this._i = n;
        });
        this.setField("omega", this._omega, this._omega0, (n) => {
            this._omega = n;
        });
        this.setField("tau_em", this._tauEm, this._Kt * this._i0, (n) => {
            this._tauEm = n;
        });
    }

    public override fire(session: ISession, t: number): void {
        // Pure I/O. The solver in the Session's integration phase has
        // already advanced (this._i, this._omega) via writeState() —
        // reading V and tau_load from session.readSignal at each
        // micro-step's rhs() call.
        //
        // V and tau_load are SIGNALS now: no buffer, no drain, no
        // consumption logic. The upstream publishers overwrite the
        // signal on each tick; the motor reads the latest at any time.
        // Required = 0 (signals don't gate), so motor fires every tick
        // and publishes the freshly-integrated state.
        super.fire(session, t);

        const links = session.graph.links as ReadonlyArray<IChannel>;
        const broadcast = (slot: string, val: unknown): void => {
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== slot || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, val);
            }
        };
        broadcast("i", this._i);
        broadcast("omega", this._omega);
        broadcast("tau_em", this._tauEm);
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createDcMotorDynamicNode(): DcMotorDynamicNode {
    return new DcMotorDynamicNode();
}
