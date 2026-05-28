import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Combined Coulomb + viscous + Stribeck friction torque, function of
 * angular speed:
 *
 *     τ_friction(ω) = sign(ω) · ( τ_c + (τ_s - τ_c) · exp(-(|ω|/ω_s)²) )
 *                   + b · ω
 *
 * where:
 *   τ_c  Coulomb friction torque  (kinetic, speed-independent)
 *   τ_s  static / breakaway friction torque
 *   ω_s  Stribeck velocity (characteristic decay speed)
 *   b    viscous coefficient
 *
 * Output sign convention: opposes motion (positive ω → negative torque
 * on the rotor). Use the `add_to_load` toggle to flip the sign convention
 * so the output can be summed onto a `tau_load` input directly.
 *
 * Friction wear can be modeled by ramping τ_c / τ_s over the simulation
 * with a Logic plugin Lerp / Slider — those time-varying values are
 * accepted as wired inputs here.
 */
export class CoulombFrictionNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _tauC: number = 0.005; // Coulomb
    @cloneable private _tauS: number = 0.01; // Static / Stribeck peak
    @cloneable private _omegaS: number = 5; // Stribeck velocity [rad/s]
    @cloneable private _b: number = 0; // Viscous coefficient (0 = disabled)
    @cloneable private _signSign: boolean = true; // true = opposes motion, false = adds to load

    @cloneable private _tau: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "omega", optional: true, type: "float" },
        { slot: "tau_c", optional: true, type: "float" },
        { slot: "tau_s", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "tau_friction", optional: false, type: "float" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get tauC(): number {
        return this._tauC;
    }
    public set tauC(v: number) {
        this.setField("tauC", this._tauC, v, (n) => {
            this._tauC = n;
        });
    }
    @editable("number") public get tauS(): number {
        return this._tauS;
    }
    public set tauS(v: number) {
        this.setField("tauS", this._tauS, v, (n) => {
            this._tauS = n;
        });
    }
    @editable("number") public get omegaS(): number {
        return this._omegaS;
    }
    public set omegaS(v: number) {
        this.setField("omegaS", this._omegaS, v, (n) => {
            this._omegaS = n;
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
    @editable("boolean") public get opposesMotion(): boolean {
        return this._signSign;
    }
    public set opposesMotion(v: boolean) {
        this.setField("opposesMotion", this._signSign, v, (n) => {
            this._signSign = n;
        });
    }

    @viewable("number") public get tau_friction(): number {
        return this._tau;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let omega = 0,
            tauC = this._tauC,
            tauS = this._tauS;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "omega") omega = value;
            else if (slot === "tau_c") tauC = value;
            else if (slot === "tau_s") tauS = value;
        }

        const sign = omega > 0 ? 1 : omega < 0 ? -1 : 0;
        const stribeck = this._omegaS > 0 ? tauC + (tauS - tauC) * Math.exp(-(omega * omega) / (this._omegaS * this._omegaS)) : tauC;
        let tau = sign * stribeck + this._b * omega;
        if (this._signSign) tau = -tau; // opposes motion

        this.setField("tau_friction", this._tau, tau, (n) => {
            this._tau = n;
        });
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "tau_friction" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, tau);
        }
    }
}

export function createCoulombFrictionNode(): CoulombFrictionNode {
    return new CoulombFrictionNode();
}
