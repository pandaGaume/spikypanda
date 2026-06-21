import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import { FaultableNode } from "spikypanda-core";

/**
 * DC motor in steady state. Solves the coupled equations at
 * di/dt = 0 and dω/dt = 0 directly, no integration:
 *
 *     armatureVoltage = armatureResistance·armatureCurrent + backEmfConstant·ω                    (electrical, armatureInductance term vanishes)
 *     torqueConstant·armatureCurrent = viscousFriction·ω + (τ_load + τ_fault)   (mechanical, rotorInertia term vanishes)
 *
 *  =>  ω = (armatureVoltage·torqueConstant - armatureResistance·τ_eff) / (backEmfConstant·torqueConstant + armatureResistance·viscousFriction)
 *      armatureCurrent = (viscousFriction·ω + τ_eff) / torqueConstant
 *      τ = torqueConstant·armatureCurrent
 *      backEmf = backEmfConstant·ω
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
    private static readonly OWN_INPUT_SLOTS: ReadonlySet<string> = new Set(["armatureVoltage", "loadTorque"]);

    @cloneable private _armatureResistance: number = 1.0;
    @cloneable private _torqueConstant: number = 0.01;
    @cloneable private _backEmfConstant: number = 0.01;
    @cloneable private _viscousFriction: number = 1e-4;

    // Last computed values, exposed via @viewable so the property panel
    // mirrors them. Plain fields (no @cloneable) because they are pure
    // derivatives of inputs+params; recomputed on every fire.
    @cloneable private _i: number = 0;
    @cloneable private _omega: number = 0;
    @cloneable private _developedTorque: number = 0;
    @cloneable private _backEmf: number = 0;

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_INPUT_PORTS,
        { slot: "armatureVoltage", optional: true, type: "float" },
        { slot: "loadTorque", optional: true, type: "float" },
    ];
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_OUTPUT_PORTS,
        { slot: "armatureCurrent", optional: false, type: "float" },
        { slot: "angularVelocity", optional: false, type: "float" },
        { slot: "developedTorque", optional: false, type: "float" },
        { slot: "backEmf", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get armatureResistance(): number {
        return this._armatureResistance;
    }
    public set armatureResistance(v: number) {
        this.setField("armatureResistance", this._armatureResistance, v, (n) => {
            this._armatureResistance = n;
        });
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

    @editable("number") public get viscousFriction(): number {
        return this._viscousFriction;
    }
    public set viscousFriction(v: number) {
        this.setField("viscousFriction", this._viscousFriction, v, (n) => {
            this._viscousFriction = n;
        });
    }

    @viewable("number") public get armatureCurrent(): number {
        return this._i;
    }
    @viewable("number") public get angularVelocity(): number {
        return this._omega;
    }
    @viewable("number") public get developedTorque(): number {
        return this._developedTorque;
    }
    @viewable("number") public get backEmf(): number {
        return this._backEmf;
    }

    public override fire(session: ISession, t: number): void {
        // Compose world transform first.
        super.fire(session, t);

        // Read motor-own inputs without disturbing transform tokens.
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let armatureVoltage = 0,
            tauLoad = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (!DcMotorSteadyNode.OWN_INPUT_SLOTS.has(slot)) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "armatureVoltage") armatureVoltage = value;
            else if (slot === "loadTorque") tauLoad = value;
        }

        // Fold the accumulated "tau"-target faults into the effective load.
        const tauEff = tauLoad + this.getFault("tau");

        const denom = this._backEmfConstant * this._torqueConstant + this._armatureResistance * this._viscousFriction;
        const angularVelocity = denom > 1e-18 ? (armatureVoltage * this._torqueConstant - this._armatureResistance * tauEff) / denom : 0;
        const armatureCurrent = (this._viscousFriction * angularVelocity + tauEff) / Math.max(this._torqueConstant, 1e-12);
        const developedTorque = this._torqueConstant * armatureCurrent;
        const backEmf = this._backEmfConstant * angularVelocity;

        this.setField("armatureCurrent", this._i, armatureCurrent, (n) => {
            this._i = n;
        });
        this.setField("angularVelocity", this._omega, angularVelocity, (n) => {
            this._omega = n;
        });
        this.setField("developedTorque", this._developedTorque, developedTorque, (n) => {
            this._developedTorque = n;
        });
        this.setField("backEmf", this._backEmf, backEmf, (n) => {
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
        broadcast("armatureCurrent", armatureCurrent);
        broadcast("angularVelocity", angularVelocity);
        broadcast("developedTorque", developedTorque);
        broadcast("backEmf", backEmf);
    }
}

export function createDcMotorSteadyNode(): DcMotorSteadyNode {
    return new DcMotorSteadyNode();
}
