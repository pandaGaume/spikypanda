import { viewable, TransformNode, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Gravity vector in the motor body frame. Faithful port of the legacy
 * `sensors` GravityField + MotorTransform + GravityVector projection, but
 * built on the plugin's existing infrastructure instead of reinventing it:
 *
 *   - World gravity comes from the SCENE. This node extends TransformNode,
 *     so it reads `getScene(session).gravity` (the live world-frame gravity
 *     the enclosing Sim.Graph / SceneItem broadcasts). No duplicate gravity
 *     editable.
 *   - Orientation comes from the node's own TRANSFORM. The motor is a world
 *     object: wire its `local` / `parent_world` so this node's `world`
 *     matrix is the body -> world pose. Gravity is projected to the body
 *     frame with the rotation part of that matrix (g_body = R^T * g_world).
 *     No duplicate Euler editable.
 *
 * Body frame convention (legacy MotorTransform): X = rotor shaft axis;
 * Y, Z span the rotor radial plane; theta_m = 0 along body +Y.
 *
 * Outputs (consumed by the gravity-coupling nodes rotor-sag / bearing-
 * preload / mounting-compliance, the single place world -> body happens):
 *   - g_x / g_y / g_z : body-frame gravity (signed). g_x is signed axial.
 *   - g_radial = sqrt(g_y^2 + g_z^2) : perpendicular component (rotor sag).
 *   - g_axial = |g_x| : magnitude along the shaft.
 *   - g_angle = atan2(g_z, g_y) : azimuth of gravity in the YZ plane.
 *   - world : the body -> world transform (inherited from TransformNode).
 *
 * Microgravity, vertical-shaft and rigid-bearing regimes all fall out of
 * the scene gravity + transform automatically. Stateless beyond the
 * inherited world matrix; no allocation in the hot path.
 */
export class GravityVectorNode extends TransformNode implements IDeclaresPorts {
    private _gx: number = 0;
    private _gy: number = 0;
    private _gz: number = 0;

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = TransformNode.TRANSFORM_INPUT_PORTS;
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...TransformNode.TRANSFORM_OUTPUT_PORTS, // world
        { slot: "g_x", optional: false, type: "float" },
        { slot: "g_y", optional: false, type: "float" },
        { slot: "g_z", optional: false, type: "float" },
        { slot: "g_radial", optional: false, type: "float" },
        { slot: "g_axial", optional: false, type: "float" },
        { slot: "g_angle", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Viewables ──────────────────────────────────────────────────────
    @viewable("number") public get g_x(): number {
        return this._gx;
    }
    @viewable("number") public get g_y(): number {
        return this._gy;
    }
    @viewable("number") public get g_z(): number {
        return this._gz;
    }
    @viewable("number") public get g_radial(): number {
        return Math.sqrt(this._gy * this._gy + this._gz * this._gz);
    }
    @viewable("number") public get g_axial(): number {
        return Math.abs(this._gx);
    }
    @viewable("number") public get g_angle(): number {
        return Math.atan2(this._gz, this._gy);
    }

    public override reset(session: ISession): void {
        super.reset(session); // world -> identity
        this._gx = 0;
        this._gy = 0;
        this._gz = 0;
    }

    public override fire(session: ISession, t: number): void {
        // TransformNode hop: consume local / parent_world, set + publish
        // the world matrix.
        super.fire(session, t);

        const g = this.getScene(session).gravity; // world-frame gravity
        const W = this.world; // body -> world, column-major flat[16]
        // g_body = R^T * g_world; R = rotation part (columns 0,1,2 of W).
        this._gx = W[0] * g.x + W[1] * g.y + W[2] * g.z;
        this._gy = W[4] * g.x + W[5] * g.y + W[6] * g.z;
        this._gz = W[8] * g.x + W[9] * g.y + W[10] * g.z;

        const gRadial = Math.sqrt(this._gy * this._gy + this._gz * this._gz);
        const gAxial = Math.abs(this._gx);
        const gAngle = Math.atan2(this._gz, this._gy);
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            if (link.slot === TransformNode.OUTPUT_WORLD) continue; // handled by super.fire
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "g_x":
                    session.publish(idx, this._gx);
                    break;
                case "g_y":
                    session.publish(idx, this._gy);
                    break;
                case "g_z":
                    session.publish(idx, this._gz);
                    break;
                case "g_radial":
                    session.publish(idx, gRadial);
                    break;
                case "g_axial":
                    session.publish(idx, gAxial);
                    break;
                case "g_angle":
                    session.publish(idx, gAngle);
                    break;
            }
        }
    }
}

export function createGravityVectorNode(): GravityVectorNode {
    return new GravityVectorNode();
}
