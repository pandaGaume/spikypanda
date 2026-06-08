import type { ICartesian } from "spikypanda-core";
import {
    Quaternion,
    editable,
    cloneable,
    IOlink,
    IDeclaresPorts,
    IPortDescriptor,
    ISession,
    publishToFirstOutput,
    resolveSlotInputs,
    RuntimeNode,
    editor,
} from "spikypanda-core";
import type { Nullable } from "spikypanda-core";

const DEG_TO_RAD = Math.PI / 180;

@editor("attitude-3d")
export class Attitude extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _yaw: number = 0;
    @cloneable private _pitch: number = 0;
    @cloneable private _roll: number = 0;

    public static readonly INPUT_YAW = "yaw";
    public static readonly INPUT_PITCH = "pitch";
    public static readonly INPUT_ROLL = "roll";
    public static readonly OUTPUT_ROTATION = "rotation";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: Attitude.INPUT_YAW, optional: true, type: "float" },
        { slot: Attitude.INPUT_PITCH, optional: true, type: "float" },
        { slot: Attitude.INPUT_ROLL, optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: Attitude.OUTPUT_ROTATION, optional: false, type: "vec4" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number", { unit: "deg" })
    public get yaw(): number {
        return this._yaw;
    }
    public set yaw(v: number) {
        this.setField("yaw", this._yaw, v, (x) => {
            this._yaw = x;
        });
    }

    @editable("number", { unit: "deg" })
    public get pitch(): number {
        return this._pitch;
    }
    public set pitch(v: number) {
        this.setField("pitch", this._pitch, v, (x) => {
            this._pitch = x;
        });
    }

    @editable("number", { unit: "deg" })
    public get roll(): number {
        return this._roll;
    }
    public set roll(v: number) {
        this.setField("roll", this._roll, v, (x) => {
            this._roll = x;
        });
    }

    /** Current composed quaternion from yaw/pitch/roll. NOT @viewable
     *  for the same reason as `Cartesian3.vec3` — yaw/pitch/roll are
     *  already shown as editables, so a duplicate LIVE STATE entry is
     *  noise. The getter remains because it's the bindPropertyProvider
     *  contract (this node's output slot is `rotation`). */
    public get rotation(): Quaternion {
        return Quaternion.fromYawPitchRoll(this._yaw * DEG_TO_RAD, this._pitch * DEG_TO_RAD, this._roll * DEG_TO_RAD);
    }

    public override fire(session: ISession, _t: number): void {
        const { yaw, pitch, roll } = resolveSlotInputs(
            session,
            this,
            {
                [Attitude.INPUT_YAW]: this._yaw,
                [Attitude.INPUT_PITCH]: this._pitch,
                [Attitude.INPUT_ROLL]: this._roll,
            },
            { validator: (_slot, v) => typeof v === "number" }
        );

        publishToFirstOutput(session, this, Quaternion.fromYawPitchRoll(yaw * DEG_TO_RAD, pitch * DEG_TO_RAD, roll * DEG_TO_RAD));
    }
}
