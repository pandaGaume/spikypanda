import { ICartesian } from "../../geometry/geometry.interfaces";
import { Cartesian3 } from "../../geometry/geometry.cartesian";
import { Quaternion } from "../../geometry/geometry.quarternion";
import { editable, editor, viewable } from "../../graph/graph.editor";
import { cloneable, IOlink } from "../../graph/graph.interfaces";
import { IDeclaresPorts, IPortDescriptor, ISession } from "../../execution/execution.interfaces";
import { publishToFirstOutput, resolveSlotInputs } from "../../execution/execution.io";
import { RuntimeNode } from "../../execution/execution.node";
import { Nullable } from "../../types";

/**
 * Spatial pose container (position + orientation) that publishes the
 * derived 4x4 transform matrix on its output channel every tick.
 *
 * Property setters fire onPropertyChanged so observers (3D viewport
 * sub-editor, property panel inputs, downstream computed bindings) stay
 * in sync with mutations from any source.
 *
 * Editor wiring:
 *   - Class-level "transform-3d" tab via @editor (app registers the
 *     widget factory; the core package only declares the contract).
 *   - Property panel rows decorated for the per-field sub-editors:
 *       position → vector3, block layout, X|Y|Z inline
 *       rotation → quaternion, block layout, X|Y|Z|W inline
 *       matrix   → matrix4, read-only viewer
 */
@editor("transform-3d")
export class Transform extends RuntimeNode implements IDeclaresPorts {
    @cloneable
    private _position: Cartesian3 = new Cartesian3(0, 0, 0);

    @cloneable
    private _rotation: Quaternion = new Quaternion(0, 0, 0, 1);

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) {
        super(onsc, opsc, position);
    }

    @editable("vector3", { layout: "block", alignement: "horizontal" })
    public get translation(): Cartesian3 {
        return this._position;
    }

    public set translation(v: Cartesian3) {
        this.setField("translation", this._position, v, (x) => { this._position = x; });
    }

    @editable("quaternion", { layout: "block", alignement: "horizontal" })
    public get rotation(): Quaternion {
        return this._rotation;
    }

    public set rotation(v: Quaternion) {
        this.setField("rotation", this._rotation, v, (x) => { this._rotation = x; });
    }

    /**
     * Column-major TRS matrix derived from the EDITABLE defaults
     * (translation + rotation declared on the node). The panel shows
     * this as a read-only preview of the design-time configuration.
     * At runtime, fire() recomputes the matrix from the effective
     * values that may come from connected input channels instead.
     */
    @viewable("matrix4")
    public get matrix(): ReadonlyArray<number> {
        return computeTRS(this._position, this._rotation);
    }

    /**
     * Slot names of the input channels the node consumes when wired.
     * A connection drawn to one of these ports creates a Channel with
     * the matching slot; fire() peeks for them and overrides the
     * editable defaults.
     */
    public static readonly INPUT_POSITION  = "position";
    public static readonly INPUT_ROTATION  = "rotation";
    public static readonly OUTPUT_MATRIX   = "matrix";

    /**
     * IDeclaresPorts contract: the editor reads these to render the
     * port dots and accept connections, without having to introspect
     * fire() or maintain a parallel registry.
     */
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: Transform.INPUT_POSITION, optional: true,  type: "vec3" },
        { slot: Transform.INPUT_ROTATION, optional: true,  type: "vec4" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: Transform.OUTPUT_MATRIX,  optional: false, type: "matrix44" },
    ];

    public override fire(session: ISession, _t: number): void {
        // Resolve effective position / rotation: a ready input channel
        // wins over the editable default. The editable stays unchanged
        // (still visible in the panel) so the user can disconnect and
        // get their configured value back without losing it.
        const eff = resolveSlotInputs(session, this, {
            [Transform.INPUT_POSITION]: this._position as unknown,
            [Transform.INPUT_ROTATION]: this._rotation as unknown,
        }, {
            validator: (slot, v) => {
                if (!v || typeof v !== "object" || !("x" in v)) return false;
                if (slot === Transform.INPUT_ROTATION) return "w" in v;
                return true;
            },
        });

        publishToFirstOutput(session, this, computeTRS(
            eff[Transform.INPUT_POSITION] as Cartesian3,
            eff[Transform.INPUT_ROTATION] as Quaternion,
        ));
    }
}

/**
 * Column-major 4x4 TRS matrix. Standalone so the @viewable getter and
 * fire() can share without one mutating the other's inputs.
 */
function computeTRS(p: Cartesian3, r: Quaternion): ReadonlyArray<number> {
    const { x: qx, y: qy, z: qz, w: qw } = r;
    const { x: tx, y: ty, z: tz } = p;
    const xx = qx * qx, yy = qy * qy, zz = qz * qz;
    const xy = qx * qy, xz = qx * qz, yz = qy * qz;
    const wx = qw * qx, wy = qw * qy, wz = qw * qz;
    return [
        1 - 2 * (yy + zz),  2 * (xy + wz),      2 * (xz - wy),      0,
        2 * (xy - wz),      1 - 2 * (xx + zz),  2 * (yz + wx),      0,
        2 * (xz + wy),      2 * (yz - wx),      1 - 2 * (xx + yy),  0,
        tx,                 ty,                 tz,                 1,
    ];
}
