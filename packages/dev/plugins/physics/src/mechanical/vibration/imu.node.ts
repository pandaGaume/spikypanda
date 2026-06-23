import { cloneable, editable, viewable, Cartesian3, IChannel, IDeclaresPorts, IPortDescriptor, ISession, TransformNode, inSlotOf } from "spikypanda-core";
import type { IOlink, ICartesian, Nullable } from "spikypanda-core";

/**
 * 3-axis IMU / accelerometer. Unlike the scalar `AccelerometerNode`, this is a
 * `TransformNode` (IHasTransform), so it is PLACED on a structure (housing /
 * motor) with its OWN attitude (wire a geometry Attitude -> Transform into its
 * `parentWorld` / `local`, or parent it to the scene). It reads the true
 * vibration acceleration as one `vec3` (ICartesian3, e.g. from a Housing's
 * `acceleration` output) and outputs the SPECIFIC FORCE a real accelerometer
 * measures, as one `vec3`:
 *
 *     measured = a_body − g_body + noise          (per axis)
 *
 * where `g_body = R^T · g_world` is the scene gravity projected into the IMU's
 * OWN body frame (inherited `_updateGravityCoupling`). The sensor's attitude
 * therefore splits the +1g reaction across its axes — at rest it reads +1g
 * "up", exactly like a real MEMS accelerometer. White Gaussian noise
 * (Box-Muller + seeded LCG, same scheme as the current sensor / accelerometer)
 * is added independently per axis. Gravity-free (measured = a + noise) when no
 * scene is bound (`measuresGravity` also gates it).
 *
 * Frame note (V1): the input acceleration is taken in the IMU's own body frame
 * (the IMU is assumed rigidly co-oriented with the structure it sits on). A
 * relative structure↔IMU rotation + lever-arm is a future refinement; the IMU's
 * own attitude already drives the gravity projection, which is the dominant
 * orientation effect for the gravity-signature study.
 */
export class ImuNode extends TransformNode implements IDeclaresPorts {
    @cloneable private _noiseStdDev: number = 0.001; // per-axis Gaussian sigma [m/s^2]
    @cloneable private _seed: number = 1; // RNG seed (reproducible noise)
    @cloneable private _measuresGravity: boolean = true; // add the +1g reaction (real accelerometer)

    private _mx: number = 0;
    private _my: number = 0;
    private _mz: number = 0;
    private _rng: number = 1;

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        ...TransformNode.TRANSFORM_INPUT_PORTS, // local, parentWorld (placement / attitude)
        { slot: "acceleration", optional: true, type: "vec3" }, // true kinematic acceleration (ICartesian3)
    ];
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...TransformNode.TRANSFORM_OUTPUT_PORTS, // world
        { slot: "measuredAcceleration", optional: false, type: "vec3" }, // measured specific force (ICartesian3)
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get noiseStdDev(): number {
        return this._noiseStdDev;
    }
    public set noiseStdDev(v: number) {
        this.setField("noiseStdDev", this._noiseStdDev, v, (n) => {
            this._noiseStdDev = n;
        });
    }
    @editable("number") public get seed(): number {
        return this._seed;
    }
    public set seed(v: number) {
        this.setField("seed", this._seed, v, (n) => {
            this._seed = n;
        });
    }
    @editable("boolean") public get measuresGravity(): boolean {
        return this._measuresGravity;
    }
    public set measuresGravity(v: boolean) {
        this.setField("measuresGravity", this._measuresGravity, v, (n) => {
            this._measuresGravity = n;
        });
    }

    @viewable("number") public get measuredAccelerationX(): number {
        return this._mx;
    }
    @viewable("number") public get measuredAccelerationY(): number {
        return this._my;
    }
    @viewable("number") public get measuredAccelerationZ(): number {
        return this._mz;
    }

    public override reset(session: ISession): void {
        super.reset(session); // world -> identity, gravity cache cleared
        this._mx = 0;
        this._my = 0;
        this._mz = 0;
        this._rng = Math.max(1, Math.floor(this._seed));
    }

    public override fire(session: ISession, t: number): void {
        // TransformNode hop: consume local / parentWorld, set + publish world.
        super.fire(session, t);

        const links = session.graph.links as ReadonlyArray<IChannel>;
        let ax = 0,
            ay = 0,
            az = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            if (TransformNode.isTransformInputSlot(String(slot))) continue; // consumed by super.fire
            if (slot !== "acceleration") continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx) as { x?: number; y?: number; z?: number } | undefined;
            if (value && typeof value === "object" && typeof value.x === "number") {
                ax = value.x;
                ay = typeof value.y === "number" ? value.y : 0;
                az = typeof value.z === "number" ? value.z : 0;
            }
        }

        // Gravity in the IMU's OWN body frame (R^T · g_world); undefined when no
        // scene is bound -> the IMU is gravity-free.
        this._updateGravityCoupling(session);
        const bg = this._bodyGravity;
        const addG = this._measuresGravity && bg !== undefined;
        // Specific force = kinematic acceleration − gravitational field (so at
        // rest the sensor reads −g_body = +1g "up"), plus independent per-axis noise.
        this._mx = ax - (addG ? bg!.x : 0) + this._noise();
        this._my = ay - (addG ? bg!.y : 0) + this._noise();
        this._mz = az - (addG ? bg!.z : 0) + this._noise();

        const measured = new Cartesian3(this._mx, this._my, this._mz);
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "measuredAcceleration" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, measured);
        }
    }

    private _noise(): number {
        return this._noiseStdDev > 0 ? this._noiseStdDev * this._gaussian() : 0;
    }
    private _gaussian(): number {
        const u1 = Math.max(this._lcg(), 1e-12);
        const u2 = this._lcg();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
    private _lcg(): number {
        this._rng = (this._rng * 9301 + 49297) % 233280;
        return this._rng / 233280;
    }
}

export function createImuNode(): ImuNode {
    return new ImuNode();
}
