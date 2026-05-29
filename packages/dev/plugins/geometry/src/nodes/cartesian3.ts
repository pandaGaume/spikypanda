import type { ICartesian } from "spikypanda-core";
import {
    Cartesian3,
    editable,
    viewable,
    cloneable,
    IOlink,
    IDeclaresPorts,
    IPortDescriptor,
    ISession,
    publishToFirstOutput,
    resolveSlotInputs,
    RuntimeNode,
} from "spikypanda-core";
import type { Nullable } from "spikypanda-core";

export class Cartesian3Node extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _x: number = 0;
    @cloneable private _y: number = 0;
    @cloneable private _z: number = 0;

    public static readonly INPUT_X = "x";
    public static readonly INPUT_Y = "y";
    public static readonly INPUT_Z = "z";
    public static readonly OUTPUT_VEC3 = "vec3";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: Cartesian3Node.INPUT_X, optional: true, type: "float" },
        { slot: Cartesian3Node.INPUT_Y, optional: true, type: "float" },
        { slot: Cartesian3Node.INPUT_Z, optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: Cartesian3Node.OUTPUT_VEC3, optional: false, type: "vec3" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number")
    public get x(): number {
        return this._x;
    }
    public set x(v: number) {
        this.setField("x", this._x, v, (n) => {
            this._x = n;
        });
    }

    @editable("number")
    public get y(): number {
        return this._y;
    }
    public set y(v: number) {
        this.setField("y", this._y, v, (n) => {
            this._y = n;
        });
    }

    @editable("number")
    public get z(): number {
        return this._z;
    }
    public set z(v: number) {
        this.setField("z", this._z, v, (n) => {
            this._z = n;
        });
    }

    @viewable("vector3", { layout: "block", alignement: "horizontal" })
    public get vec3(): Cartesian3 {
        return new Cartesian3(this._x, this._y, this._z);
    }

    public override fire(session: ISession, _t: number): void {
        const { x, y, z } = resolveSlotInputs(
            session,
            this,
            {
                [Cartesian3Node.INPUT_X]: this._x,
                [Cartesian3Node.INPUT_Y]: this._y,
                [Cartesian3Node.INPUT_Z]: this._z,
            },
            { validator: (_slot, v) => typeof v === "number" }
        );

        publishToFirstOutput(session, this, new Cartesian3(x, y, z));
    }
}
