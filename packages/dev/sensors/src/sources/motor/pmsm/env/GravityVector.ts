import { Cartesian3 } from "@spiky-panda/core";
import { ISimNode } from "../../../../interfaces/SimNode";
import { GravityField } from "./GravityField";
import { MotorTransform } from "./MotorTransform";

// Projects the world gravity field into the motor body frame, given the
// motor orientation. This is the only place where the world->body
// transformation happens; downstream env nodes (RotorSag,
// BearingPreload, MountingCompliance) consume the cached body-frame
// gravity from this node.
//
// advance(t) recomputes the projection (cheap : a 3x3 transpose-multiply).
// Caching keeps repeated reads in the same tick free.
//
// Conventions :
//   - motorFrameGravity().z is along the shaft axis.
//   - radialMagnitude() = sqrt(gx^2 + gy^2) is the gravity component
//     perpendicular to the shaft, the driving quantity for rotor sag.
//   - axialMagnitude() = |gz| is the component along the shaft, the
//     driving quantity for axial bearing preload modulation.
//   - radialAngle() = atan2(gy, gx) is the azimuth of the gravity
//     vector in the rotor (XY) plane, which fixes the sag direction.
export class GravityVector implements ISimNode {
    public readonly kind: string = "pmsm.env.gravity-vector";

    public readonly field: GravityField;
    public readonly transform: MotorTransform;

    private _gBody: Cartesian3 = Cartesian3.Zero() as Cartesian3;

    public constructor(field: GravityField, transform: MotorTransform) {
        this.field = field;
        this.transform = transform;
        // Initial projection so consumers reading before the first advance
        // see a sensible value.
        this._recompute();
    }

    public advance(_t: number): void {
        this._recompute();
    }

    public reset(): void {
        this._gBody = Cartesian3.Zero() as Cartesian3;
    }

    public motorFrameGravity(): Cartesian3 {
        return this._gBody.clone();
    }

    public radialMagnitude(): number {
        return Math.sqrt(this._gBody.x ** 2 + this._gBody.y ** 2);
    }

    public axialMagnitude(): number {
        return Math.abs(this._gBody.z);
    }

    public radialAngle(): number {
        return Math.atan2(this._gBody.y, this._gBody.x);
    }

    public magnitude(): number {
        return this._gBody.magnitude();
    }

    private _recompute(): void {
        const gWorld = this.field.worldGravity();
        this._gBody = this.transform.projectWorldToBody(gWorld);
    }
}
