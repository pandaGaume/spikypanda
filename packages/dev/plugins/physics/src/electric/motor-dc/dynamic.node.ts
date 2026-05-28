import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import { FaultableNode } from "../../transform/fault.node.js";

/**
 * Separately-excited DC motor — dynamic model integrating the coupled
 * electrical + mechanical equations with an explicit Euler step:
 *
 *     V       = R·i + L·di/dt + Ke·ω
 *     τ_em    = Kt·i
 *     J·dω/dt = τ_em - b·ω - (τ_load + τ_fault)
 *
 * Inputs (all optional, default 0):
 *   V         armature voltage [V]
 *   tau_load  external load torque [Nm]
 *   dt        integration step [s] — when unwired, falls back to
 *             `t - lastT` like Timer
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
 * Defaults (R=1Ω, L=1mH, Kt=Ke=0.01, J=10µkg·m², b=0.1mNm·s/rad) are
 * tuned for MCSA pipelines: τ_e = L/R = 1 ms electrical, so Euler is
 * numerically stable for dt ≤ 100 µs (the typical scope sampling rate).
 *
 * State (i, omega) is restored to (i0, omega0) on session reset.
 */
export class DcMotorDynamicNode extends FaultableNode implements IDeclaresPorts {
    private static readonly OWN_INPUT_SLOTS: ReadonlySet<string> = new Set(["V", "tau_load", "dt"]);

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
    @cloneable private _i: number = 0;
    @cloneable private _omega: number = 0;
    @cloneable private _tauEm: number = 0;
    private _lastT: number = -1;

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_INPUT_PORTS,
        { slot: "V", optional: true, type: "float" },
        { slot: "tau_load", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_OUTPUT_PORTS,
        { slot: "i", optional: false, type: "float" },
        { slot: "omega", optional: false, type: "float" },
        { slot: "tau_em", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
    @editable("number") public get R(): number {
        return this._R;
    }
    public set R(v: number) {
        this.setField("R", this._R, v, (n) => {
            this._R = n;
        });
    }

    @editable("number") public get L(): number {
        return this._L;
    }
    public set L(v: number) {
        this.setField("L", this._L, v, (n) => {
            this._L = n;
        });
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
        this._lastT = -1;
    }

    public override fire(session: ISession, t: number): void {
        // Compose world transform + scan variadic fault inputs first
        // (super → FaultableNode → TransformNode). Both layers only
        // consume their own slot families, so motor tokens are untouched.
        super.fire(session, t);

        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Read wired inputs (consume only the motor's own slots).
        let V = 0,
            tauLoad = 0,
            dt = -1;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (!DcMotorDynamicNode.OWN_INPUT_SLOTS.has(slot)) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "V") V = value;
            else if (slot === "tau_load") tauLoad = value;
            else if (slot === "dt") dt = value;
        }
        if (dt < 0) {
            dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        }
        this._lastT = t;

        // Fold the accumulated tau-target faults into the effective load.
        const tauEff = tauLoad + this.getFault("tau");

        // Euler step. Compute new values into locals first so setField
        // sees old vs new and fires LiveBinder propagation correctly.
        let newI = this._i;
        let newOmega = this._omega;
        if (dt > 0) {
            const dIdt = (V - this._R * this._i - this._Ke * this._omega) / Math.max(this._L, 1e-12);
            const dWdt = (this._Kt * this._i - this._b * this._omega - tauEff) / Math.max(this._J, 1e-12);
            newI = this._i + dt * dIdt;
            newOmega = this._omega + dt * dWdt;
        }
        const newTauEm = this._Kt * newI;

        this.setField("i", this._i, newI, (n) => {
            this._i = n;
        });
        this.setField("omega", this._omega, newOmega, (n) => {
            this._omega = n;
        });
        this.setField("tau_em", this._tauEm, newTauEm, (n) => {
            this._tauEm = n;
        });

        // Fan-out per source slot, same pattern as TimerNode.
        const broadcast = (slot: string, val: unknown): void => {
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== slot || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, val);
            }
        };
        broadcast("i", newI);
        broadcast("omega", newOmega);
        broadcast("tau_em", newTauEm);
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createDcMotorDynamicNode(): DcMotorDynamicNode {
    return new DcMotorDynamicNode();
}
