import type { ICartesian, Nullable } from "spikypanda-core";
import { IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf, viewable } from "spikypanda-core";

/**
 * Cartesian3 Split — the inverse of `Cartesian3Node`: demultiplexes a `vec3`
 * (ICartesian3) stream into three scalar `x` / `y` / `z` float outputs. The
 * canonical adapter to feed each axis of an IMU's `measuredAcceleration` (a
 * single vec3) into its own scalar DSP chain (buffer → window → FFT → spectrum)
 * or a `Viz.Plot:line` time-series. Pure I/O: consume the latest vec3 token,
 * publish each component; a missing component reads 0.
 */
export class Cartesian3SplitNode extends RuntimeNode implements IDeclaresPorts {
    public static readonly INPUT_VEC3 = "vec3";
    public static readonly OUTPUT_X = "x";
    public static readonly OUTPUT_Y = "y";
    public static readonly OUTPUT_Z = "z";

    private _x: number = 0;
    private _y: number = 0;
    private _z: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: Cartesian3SplitNode.INPUT_VEC3, optional: true, type: "vec3" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: Cartesian3SplitNode.OUTPUT_X, optional: false, type: "float" },
        { slot: Cartesian3SplitNode.OUTPUT_Y, optional: false, type: "float" },
        { slot: Cartesian3SplitNode.OUTPUT_Z, optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @viewable("number") public get x(): number {
        return this._x;
    }
    @viewable("number") public get y(): number {
        return this._y;
    }
    @viewable("number") public get z(): number {
        return this._z;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            if (inSlotOf(link) !== Cartesian3SplitNode.INPUT_VEC3) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const v = session.consume(idx) as { x?: number; y?: number; z?: number } | undefined;
            if (v && typeof v.x === "number") {
                this._x = v.x;
                this._y = typeof v.y === "number" ? v.y : 0;
                this._z = typeof v.z === "number" ? v.z : 0;
            }
        }
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (link.slot === Cartesian3SplitNode.OUTPUT_X) session.publish(idx, this._x);
            else if (link.slot === Cartesian3SplitNode.OUTPUT_Y) session.publish(idx, this._y);
            else if (link.slot === Cartesian3SplitNode.OUTPUT_Z) session.publish(idx, this._z);
        }
    }
}

export function createCartesian3SplitNode(): Cartesian3SplitNode {
    return new Cartesian3SplitNode();
}
