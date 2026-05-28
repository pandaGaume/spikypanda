import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import { FaultableNode } from "../../transform/fault.node.js";

/**
 * DC motor in steady state. Solves the coupled equations at
 * di/dt = 0 and dω/dt = 0 directly, no integration:
 *
 *     V = R·i + Ke·ω                    (electrical, L term vanishes)
 *     Kt·i = b·ω + (τ_load + τ_fault)   (mechanical, J term vanishes)
 *
 *  =>  ω = (V·Kt - R·τ_eff) / (Ke·Kt + R·b)
 *      i = (b·ω + τ_eff) / Kt
 *      τ = Kt·i
 *      back_emf = Ke·ω
 *
 * Stateless: each `fire` recomputes everything from the current inputs
 * and editable parameters. Useful for sanity checks, designing a working
 * point, and validating that the dynamic node converges to the right
 * equilibrium when integrated long enough.
 *
 * Inherits world-frame placement from TransformNode and the variadic
 * fault bank from FaultableNode (target="tau" folds into τ_load).
 */
export class DcMotorSteadyNode extends FaultableNode implements IDeclaresPorts {
    private static readonly OWN_INPUT_SLOTS: ReadonlySet<string> = new Set(["V", "tau_load"]);

    @cloneable private _R: number = 1.0;
    @cloneable private _Kt: number = 0.01;
    @cloneable private _Ke: number = 0.01;
    @cloneable private _b: number = 1e-4;

    // Last computed values, exposed via @viewable so the property panel
    // mirrors them. Plain fields (no @cloneable) because they are pure
    // derivatives of inputs+params; recomputed on every fire.
    @cloneable private _i: number = 0;
    @cloneable private _omega: number = 0;
    @cloneable private _tau: number = 0;
    @cloneable private _backEmf: number = 0;

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_INPUT_PORTS,
        { slot: "V", optional: true, type: "float" },
        { slot: "tau_load", optional: true, type: "float" },
    ];
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_OUTPUT_PORTS,
        { slot: "i", optional: false, type: "float" },
        { slot: "omega", optional: false, type: "float" },
        { slot: "tau", optional: false, type: "float" },
        { slot: "back_emf", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get R(): number {
        return this._R;
    }
    public set R(v: number) {
        this.setField("R", this._R, v, (n) => {
            this._R = n;
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

    @editable("number") public get b(): number {
        return this._b;
    }
    public set b(v: number) {
        this.setField("b", this._b, v, (n) => {
            this._b = n;
        });
    }

    @viewable("number") public get i(): number {
        return this._i;
    }
    @viewable("number") public get omega(): number {
        return this._omega;
    }
    @viewable("number") public get tau(): number {
        return this._tau;
    }
    @viewable("number") public get back_emf(): number {
        return this._backEmf;
    }

    public override fire(session: ISession, t: number): void {
        // Compose world transform first.
        super.fire(session, t);

        // Read motor-own inputs without disturbing transform tokens.
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let V = 0,
            tauLoad = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (!DcMotorSteadyNode.OWN_INPUT_SLOTS.has(slot)) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "V") V = value;
            else if (slot === "tau_load") tauLoad = value;
        }

        // Fold the accumulated tau-target faults into the effective load.
        const tauEff = tauLoad + this.getFault("tau");

        const denom = this._Ke * this._Kt + this._R * this._b;
        const omega = denom > 1e-18 ? (V * this._Kt - this._R * tauEff) / denom : 0;
        const i = (this._b * omega + tauEff) / Math.max(this._Kt, 1e-12);
        const tau = this._Kt * i;
        const back_emf = this._Ke * omega;

        this.setField("i", this._i, i, (n) => {
            this._i = n;
        });
        this.setField("omega", this._omega, omega, (n) => {
            this._omega = n;
        });
        this.setField("tau", this._tau, tau, (n) => {
            this._tau = n;
        });
        this.setField("back_emf", this._backEmf, back_emf, (n) => {
            this._backEmf = n;
        });

        const broadcast = (slot: string, val: unknown): void => {
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== slot || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, val);
            }
        };
        broadcast("i", i);
        broadcast("omega", omega);
        broadcast("tau", tau);
        broadcast("back_emf", back_emf);
    }
}

export function createDcMotorSteadyNode(): DcMotorSteadyNode {
    return new DcMotorSteadyNode();
}
