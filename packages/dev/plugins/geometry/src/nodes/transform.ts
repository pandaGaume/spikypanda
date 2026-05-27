import type { ICartesian } from "spikypanda-core";
import { Cartesian3, Quaternion, editable, viewable, cloneable, IOlink, IDeclaresPorts, IPortDescriptor, ISession, publishToFirstOutput, resolveSlotInputs, RuntimeNode } from "spikypanda-core";
import type { Nullable } from "spikypanda-core";


export class Transform extends RuntimeNode implements IDeclaresPorts {
    @cloneable
    private _position: Cartesian3 = new Cartesian3(0, 0, 0);

    @cloneable
    private _rotation: Quaternion = new Quaternion(0, 0, 0, 1);

    // Input port slot names mirror the editable field names so the
    // generic LiveBinder can map slot -> property without a custom
    // table. "translation" is used instead of "position" because
    // RuntimeNode already reserves `position` for the node's layout
    // coordinates on the canvas.
    public static readonly INPUT_TRANSLATION = "translation";
    public static readonly INPUT_ROTATION    = "rotation";
    public static readonly OUTPUT_MATRIX     = "matrix";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: Transform.INPUT_TRANSLATION, optional: true,  type: "vec3" },
        { slot: Transform.INPUT_ROTATION,    optional: true,  type: "vec4" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: Transform.OUTPUT_MATRIX, optional: false, type: "matrix44" },
    ];

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

    @viewable("matrix4")
    public get matrix(): ReadonlyArray<number> {
        return computeTRS(this._position, this._rotation);
    }

    public override fire(session: ISession, _t: number): void {
       // Resolve effective position / rotation: a ready input channel
        // wins over the editable default. The editable stays unchanged
        // (still visible in the panel) so the user can disconnect and
        // get their configured value back without losing it.
        const eff = resolveSlotInputs(session, this, {
            [Transform.INPUT_TRANSLATION]: this._position as unknown,
            [Transform.INPUT_ROTATION]: this._rotation as unknown,
        }, {
            validator: (slot, v) => {
                if (!v || typeof v !== "object" || !("x" in v)) return false;
                if (slot === Transform.INPUT_ROTATION) return "w" in v;
                return true;
            },
        });

        publishToFirstOutput(session, this, computeTRS(
            eff[Transform.INPUT_TRANSLATION] as Cartesian3,
            eff[Transform.INPUT_ROTATION] as Quaternion,
        ));
    }
}

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
        tx,                 ty,                 tz,                  1,
    ];
}
