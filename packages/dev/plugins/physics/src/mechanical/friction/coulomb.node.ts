import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Combined Coulomb + viscous + Stribeck friction torque, function of
 * angular speed:
 *
 *     τ_friction(ω) = sign(ω) · ( τ_c + (τ_s - τ_c) · exp(-(|ω|/ω_s)²) )
 *                   + viscousFriction · ω
 *
 * where:
 *   τ_c  Coulomb friction torque  (kinetic, speed-independent)
 *   τ_s  static / breakaway friction torque
 *   ω_s  Stribeck velocity (characteristic decay speed)
 *   viscousFriction    viscous coefficient
 *
 * Output sign convention: opposes motion (positive ω → negative torque
 * on the rotor). Use the `add_to_load` toggle to flip the sign convention
 * so the output can be summed onto a `loadTorque` input directly.
 *
 * Friction wear can be modeled by ramping τ_c / τ_s over the simulation
 * with a Logic plugin Lerp / Slider — those time-varying values are
 * accepted as wired inputs here.
 */
export class CoulombFrictionNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _coulombTorque: number = 0.005; // Coulomb
    @cloneable private _stribeckTorque: number = 0.01; // Static / Stribeck peak
    @cloneable private _stribeckVelocity: number = 5; // Stribeck velocity [rad/s]
    @cloneable private _viscousFriction: number = 0; // Viscous coefficient (0 = disabled)
    @cloneable private _signSign: boolean = true; // true = opposes motion, false = adds to load

    @cloneable private _tau: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "angularVelocity", optional: true, type: "float" },
        { slot: "coulombTorque", optional: true, type: "float" },
        { slot: "stribeckTorque", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "frictionTorque", optional: false, type: "float" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get coulombTorque(): number {
        return this._coulombTorque;
    }
    public set coulombTorque(v: number) {
        this.setField("coulombTorque", this._coulombTorque, v, (n) => {
            this._coulombTorque = n;
        });
    }
    @editable("number") public get stribeckTorque(): number {
        return this._stribeckTorque;
    }
    public set stribeckTorque(v: number) {
        this.setField("stribeckTorque", this._stribeckTorque, v, (n) => {
            this._stribeckTorque = n;
        });
    }
    @editable("number") public get stribeckVelocity(): number {
        return this._stribeckVelocity;
    }
    public set stribeckVelocity(v: number) {
        this.setField("stribeckVelocity", this._stribeckVelocity, v, (n) => {
            this._stribeckVelocity = n;
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
    @editable("boolean") public get opposesMotion(): boolean {
        return this._signSign;
    }
    public set opposesMotion(v: boolean) {
        this.setField("opposesMotion", this._signSign, v, (n) => {
            this._signSign = n;
        });
    }

    @viewable("number") public get frictionTorque(): number {
        return this._tau;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let angularVelocity = 0,
            coulombTorque = this._coulombTorque,
            stribeckTorque = this._stribeckTorque;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "angularVelocity") angularVelocity = value;
            else if (slot === "coulombTorque") coulombTorque = value;
            else if (slot === "stribeckTorque") stribeckTorque = value;
        }

        const sign = angularVelocity > 0 ? 1 : angularVelocity < 0 ? -1 : 0;
        const stribeck =
            this._stribeckVelocity > 0
                ? coulombTorque + (stribeckTorque - coulombTorque) * Math.exp(-(angularVelocity * angularVelocity) / (this._stribeckVelocity * this._stribeckVelocity))
                : coulombTorque;
        let tau = sign * stribeck + this._viscousFriction * angularVelocity;
        if (this._signSign) tau = -tau; // opposes motion

        this.setField("frictionTorque", this._tau, tau, (n) => {
            this._tau = n;
        });
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "frictionTorque" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, tau);
        }
    }
}

export function createCoulombFrictionNode(): CoulombFrictionNode {
    return new CoulombFrictionNode();
}
