import {
    cloneable, editable, viewable,
    IChannel, IDeclaresPorts, IOlink, IPortDescriptor,
    ISession, RuntimeNode,
    resolveSlotInputs,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * DC motor in steady state. Solves the coupled equations at
 * di/dt = 0 and dω/dt = 0 directly, no integration:
 *
 *     V = R·i + Ke·ω         (electrical, L term vanishes)
 *     Kt·i = b·ω + τ_load    (mechanical, J term vanishes)
 *
 *  =>  ω = (V·Kt - R·τ_load) / (Ke·Kt + R·b)
 *      i = (b·ω + τ_load) / Kt
 *      τ = Kt·i
 *      back_emf = Ke·ω
 *
 * Stateless: each `fire` recomputes everything from the current inputs
 * and editable parameters. Useful for sanity checks, designing a working
 * point, and validating that the dynamic node converges to the right
 * equilibrium when integrated long enough.
 */
export class DcMotorSteadyNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _R:  number = 1.0;
    @cloneable private _Kt: number = 0.01;
    @cloneable private _Ke: number = 0.01;
    @cloneable private _b:  number = 1e-4;

    // Last computed values, exposed via @viewable so the property panel
    // mirrors them. Plain fields (no @cloneable) because they are pure
    // derivatives of inputs+params; recomputed on every fire.
    @cloneable private _i:       number = 0;
    @cloneable private _omega:   number = 0;
    @cloneable private _tau:     number = 0;
    @cloneable private _backEmf: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "V",        optional: true, type: "float" },
        { slot: "tau_load", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "i",        optional: false, type: "float" },
        { slot: "omega",    optional: false, type: "float" },
        { slot: "tau",      optional: false, type: "float" },
        { slot: "back_emf", optional: false, type: "float" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number") public get R(): number { return this._R; }
    public set R(v: number) { this.setField("R", this._R, v, (n) => { this._R = n; }); }

    @editable("number") public get Kt(): number { return this._Kt; }
    public set Kt(v: number) { this.setField("Kt", this._Kt, v, (n) => { this._Kt = n; }); }

    @editable("number") public get Ke(): number { return this._Ke; }
    public set Ke(v: number) { this.setField("Ke", this._Ke, v, (n) => { this._Ke = n; }); }

    @editable("number") public get b(): number { return this._b; }
    public set b(v: number) { this.setField("b", this._b, v, (n) => { this._b = n; }); }

    @viewable("number") public get i(): number        { return this._i; }
    @viewable("number") public get omega(): number    { return this._omega; }
    @viewable("number") public get tau(): number      { return this._tau; }
    @viewable("number") public get back_emf(): number { return this._backEmf; }

    public override fire(session: ISession, _t: number): void {
        const eff = resolveSlotInputs(session, this, { V: 0, tau_load: 0 }, {
            validator: (_slot, v) => typeof v === "number",
        });

        const denom = this._Ke * this._Kt + this._R * this._b;
        const omega = denom > 1e-18
            ? (eff.V * this._Kt - this._R * eff.tau_load) / denom
            : 0;
        const i        = (this._b * omega + eff.tau_load) / Math.max(this._Kt, 1e-12);
        const tau      = this._Kt * i;
        const back_emf = this._Ke * omega;

        this.setField("i",        this._i,       i,        (n) => { this._i = n; });
        this.setField("omega",    this._omega,   omega,    (n) => { this._omega = n; });
        this.setField("tau",      this._tau,     tau,      (n) => { this._tau = n; });
        this.setField("back_emf", this._backEmf, back_emf, (n) => { this._backEmf = n; });

        const links = session.graph.links as ReadonlyArray<IChannel>;
        const broadcast = (slot: string, val: unknown): void => {
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== slot || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, val);
            }
        };
        broadcast("i",        i);
        broadcast("omega",    omega);
        broadcast("tau",      tau);
        broadcast("back_emf", back_emf);
    }
}

export function createDcMotorSteadyNode(): DcMotorSteadyNode {
    return new DcMotorSteadyNode();
}
