import { cloneable, editable, viewable, TransformNode, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Gravitational payload load (scene-aware world object).
 *
 * A point payload of mass `m` on a crank arm of radius `r` (phase `phi0`
 * in the rotor radial plane) that turns with the rotor. The payload is a
 * world object (extends TransformNode): wire its `local` / `parentWorld`
 * from the SAME transform that places the motor, so it shares the
 * assembly's orientation, and bind the Scene on its `scene` port. It
 * reads the world gravity from the bound Scene and projects it into the
 * body frame with its own `world` (g_body = R^T * g_world): NO separate
 * gravity-vector node. The projected weight reacts as:
 *
 *   loadTorque     = m * g_radial * r * sin((rotorAngle + phi0) - g_angle)
 *   axialForce  = m * g_axial      (thrust along the shaft)
 *   radialForce = m * g_radial     (radial weight on the bearing/housing)
 *
 * The torque is a 1x f_mech ripple of amplitude `m * g_radial * r`: a pure
 * SIGNATURE (zero mean over a turn). It scales with GRAVITY (-> 0 in
 * microgravity: the load loses its weight) and with ORIENTATION (g_radial
 * is the component perpendicular to the shaft, so a horizontal shaft gives
 * the max ripple, a vertical shaft gives zero). On a small modern PMSM
 * this payload torque ripple is the dominant mechanism that makes the
 * gravity signature READABLE in quadratureAxisCurrent (study 4.2, "charge importante").
 *
 * Gated on a BOUND scene (per-node `scene` port or session scene); with
 * no scene there is no defined gravity, so the load is inert.
 */
export class GravityPayloadLoadNode extends TransformNode implements IDeclaresPorts {
    @cloneable private _payloadMass: number = 0.05; // kg
    @cloneable private _armRadius: number = 0.01; // m
    @cloneable private _armPhase: number = 0; // rad (crank offset in the body radial plane)

    private _tauLoad: number = 0;
    private _fAxial: number = 0;
    private _fRadial: number = 0;
    private _gRadial: number = 0;

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        ...TransformNode.TRANSFORM_INPUT_PORTS, // local, parentWorld
        { slot: "rotorAngle", optional: true, type: "float" },
    ];
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...TransformNode.TRANSFORM_OUTPUT_PORTS, // world
        { slot: "loadTorque", optional: false, type: "float" },
        { slot: "axialForce", optional: false, type: "float" },
        { slot: "radialForce", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
    @editable("number", { unit: "kg" }) public get payloadMass(): number {
        return this._payloadMass;
    }
    public set payloadMass(v: number) {
        this.setField("payloadMass", this._payloadMass, v, (n) => (this._payloadMass = n));
    }
    @editable("number", { unit: "m" }) public get armRadius(): number {
        return this._armRadius;
    }
    public set armRadius(v: number) {
        this.setField("armRadius", this._armRadius, v, (n) => (this._armRadius = n));
    }
    @editable("number", { unit: "rad" }) public get armPhase(): number {
        return this._armPhase;
    }
    public set armPhase(v: number) {
        this.setField("armPhase", this._armPhase, v, (n) => (this._armPhase = n));
    }

    // ── Viewables ──────────────────────────────────────────────────────
    @viewable("number", { unit: "N.m" }) public get loadTorque(): number {
        return this._tauLoad;
    }
    @viewable("number", { unit: "N" }) public get axialForce(): number {
        return this._fAxial;
    }
    @viewable("number", { unit: "N" }) public get radialForce(): number {
        return this._fRadial;
    }
    /** The 1x torque-ripple amplitude m * g_radial * r (signature magnitude). */
    @viewable("number", { unit: "N.m" }) public get tau_ripple_amplitude(): number {
        return this._payloadMass * this._gRadial * this._armRadius;
    }

    public override reset(session: ISession): void {
        super.reset(session); // world -> identity
        this._tauLoad = 0;
        this._fAxial = 0;
        this._fRadial = 0;
        this._gRadial = 0;
    }

    public override fire(session: ISession, t: number): void {
        // TransformNode hop: consume local / parentWorld, set + publish world.
        super.fire(session, t);

        const links = session.graph.links as ReadonlyArray<IChannel>;
        let thetaM = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (slot !== "rotorAngle") continue; // local/parentWorld consumed by super.fire
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value === "number") thetaM = value;
        }

        const scene = this.boundScene(session);
        if (!scene) {
            this._tauLoad = 0;
            this._fAxial = 0;
            this._fRadial = 0;
            this._gRadial = 0;
        } else {
            const g = scene.gravity;
            const W = this.world; // body -> world, column-major flat[16]
            const gx = W[0] * g.x + W[1] * g.y + W[2] * g.z; // signed axial (body X)
            const gy = W[4] * g.x + W[5] * g.y + W[6] * g.z;
            const gz = W[8] * g.x + W[9] * g.y + W[10] * g.z;
            const gRadial = Math.sqrt(gy * gy + gz * gz);
            const gAngle = Math.atan2(gz, gy);
            this._gRadial = gRadial;
            const m = this._payloadMass;
            this._tauLoad = m * gRadial * this._armRadius * Math.sin(thetaM + this._armPhase - gAngle);
            this._fAxial = m * gx;
            this._fRadial = m * gRadial;
        }

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            if (link.slot === TransformNode.OUTPUT_WORLD) continue; // handled by super.fire
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "loadTorque":
                    session.publish(idx, this._tauLoad);
                    break;
                case "axialForce":
                    session.publish(idx, this._fAxial);
                    break;
                case "radialForce":
                    session.publish(idx, this._fRadial);
                    break;
            }
        }
    }
}

export function createGravityPayloadLoadNode(): GravityPayloadLoadNode {
    return new GravityPayloadLoadNode();
}
