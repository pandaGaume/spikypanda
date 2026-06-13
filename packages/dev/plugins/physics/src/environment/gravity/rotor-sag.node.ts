import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Static rotor sag under gravity. Faithful port of the legacy `sensors`
 * RotorSagModel (the validation oracle). The rotor weight deflects the
 * shaft along the gravity component perpendicular to the shaft axis:
 *
 *   delta_sag = m_rotor * g_perp / k_radial
 *   epsilon   = delta_sag / air_gap                  (fractional gap modulation)
 *   flux delta(theta_m) = epsilon * cos(theta_m - theta_grav)
 *
 * where g_perp = g_radial and theta_grav = g_angle come from the
 * GravityVector node, and theta_m is the rotor angle from the machine.
 *
 * The `flux` output emits a fault descriptor `{ target: "flux", value:
 * delta }` for the machine's variadic fault bank (wire flux -> machine
 * fault_N). The machine forms lambda_m_eff = lambda_m * (1 + sum of flux
 * faults), turning this static eccentricity into a 1x f_mech sideband on
 * i_d / i_q once the FOC reacts: the MCSA-readable gravity signature. It
 * vanishes in three regimes that matter for the gravity study:
 *   - microgravity (g = 0): g_perp = 0, delta = 0.
 *   - shaft along gravity (vertical): g_perp = 0, delta = 0.
 *   - rigid bearing (k_radial -> infinity): delta_sag -> 0.
 *
 * Rotating UMP (unbalanced magnetic pull): when umpRadialStiffness > 0,
 * the spinning PM field across the fixed gap asymmetry yields a radial
 * force of magnitude umpRadialStiffness * delta_sag that rotates at
 * f_mech, exposed on force_y / force_z for the housing (a 1x peak on the
 * vibration channels). Zero by default (legacy backward-compat).
 *
 * Source node (like Shaft:unbalance): it reads the body-frame gravity
 * scalars from the GravityVector node rather than the Scene directly.
 * Stateless, no allocation in the hot path.
 */
export class RotorSagNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _rotorMass: number = 0.0076; // kg (Maxon ECX PRIME)
    @cloneable private _bearingRadialStiffness: number = 1e5; // N/m
    @cloneable private _airGap: number = 5e-4; // m
    @cloneable private _umpRadialStiffness: number = 0; // N/m (0 = no UMP force)

    private _fluxDelta: number = 0;
    private _fy: number = 0;
    private _fz: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "g_radial", optional: true, type: "float" },
        { slot: "g_angle", optional: true, type: "float" },
        { slot: "theta_m", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "flux", optional: false, type: "any" },
        { slot: "force_y", optional: false, type: "float" },
        { slot: "force_z", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
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
    @editable("number", { unit: "N/m" }) public get umpRadialStiffness(): number {
        return this._umpRadialStiffness;
    }
    public set umpRadialStiffness(v: number) {
        this.setField("umpRadialStiffness", this._umpRadialStiffness, v, (n) => (this._umpRadialStiffness = n));
    }

    // ── Viewables ──────────────────────────────────────────────────────
    /** The multiplicative envelope the machine applies: 1 + flux delta. */
    @viewable("number") public get flux_envelope(): number {
        return 1 + this._fluxDelta;
    }
    @viewable("number") public get flux_delta(): number {
        return this._fluxDelta;
    }
    @viewable("number") public get force_y(): number {
        return this._fy;
    }
    @viewable("number") public get force_z(): number {
        return this._fz;
    }

    public override reset(_session: ISession): void {
        this._fluxDelta = 0;
        this._fy = 0;
        this._fz = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let gPerp = 0,
            gAngle = 0,
            thetaM = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "g_radial") gPerp = value;
            else if (slot === "g_angle") gAngle = value;
            else if (slot === "theta_m") thetaM = value;
        }

        // Faithful to RotorSagModel.preStep / postStep, emitting the flux
        // DELTA (the machine forms 1 + sum of flux faults).
        if (gPerp < 1e-12) {
            this._fluxDelta = 0;
            this._fy = 0;
            this._fz = 0;
        } else {
            const delta = (this._rotorMass * gPerp) / this._bearingRadialStiffness;
            const epsilon = delta / this._airGap;
            this._fluxDelta = epsilon < 1e-12 ? 0 : epsilon * Math.cos(thetaM - gAngle);
            if (this._umpRadialStiffness && delta >= 1e-12) {
                const F = this._umpRadialStiffness * delta;
                const theta = thetaM - gAngle;
                this._fy = F * Math.cos(theta);
                this._fz = F * Math.sin(theta);
            } else {
                this._fy = 0;
                this._fz = 0;
            }
        }

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "flux":
                    session.publish(idx, { target: "flux", value: this._fluxDelta });
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
}

export function createRotorSagNode(): RotorSagNode {
    return new RotorSagNode();
}
