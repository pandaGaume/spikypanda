import { Cartesian3, ICartesian3 } from "spikypanda-core";
import { ISimNode } from "../../../../interfaces/SimNode";

// World-frame gravity vector. Phase 1 uses a constant per scenario;
// future phases may ramp it to model parabolic flight (1g -> 0g)
// transitions or attitude maneuvers that change the effective specific
// force at the motor location.
//
// Convention : gravity is a 3-component acceleration vector in m/s^2,
// expressed in the world inertial frame. Earth surface gravity is
// (0, 0, -9.81) : negative Z is "down".
export class GravityField implements ISimNode {
    public readonly kind: string = "pmsm.env.gravity-field";
    private _g: Cartesian3 = Cartesian3.Zero() as Cartesian3;
    private _label: string = "zero";

    public advance(_t: number): void {
        /* static unless setter called */
    }
    public reset(): void {
        this._g = Cartesian3.Zero() as Cartesian3;
        this._label = "zero";
    }

    public setWorldGravity(g: ICartesian3, label: string = "custom"): void {
        this._g = new Cartesian3(g.x, g.y, g.z);
        this._label = label;
    }

    public worldGravity(): Cartesian3 {
        return this._g.clone();
    }

    public worldMagnitude(): number {
        return this._g.magnitude();
    }

    public get label(): string {
        return this._label;
    }

    // Presets ------------------------------------------------------------

    // Earth surface : 9.80665 m/s^2 along world -Z. This is the value
    // declared by spikypanda-core's Acceleration.Units.g, used elsewhere.
    public static earth(): GravityField {
        const f = new GravityField();
        f.setWorldGravity(new Cartesian3(0, 0, -9.80665), "earth");
        return f;
    }

    // Microgravity : zero gravity vector. Models orbital free-fall to
    // first order (residual ~ 1e-6 g not modeled here).
    public static microgravity(): GravityField {
        const f = new GravityField();
        f.setWorldGravity(Cartesian3.Zero(), "microgravity");
        return f;
    }

    public static custom(g: ICartesian3, label: string = "custom"): GravityField {
        const f = new GravityField();
        f.setWorldGravity(g, label);
        return f;
    }
}
