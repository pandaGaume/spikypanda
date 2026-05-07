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
//   - motorFrameGravity()[2] is along the shaft axis (Z).
//   - radialMagnitude() = sqrt(g_x^2 + g_y^2) is the gravity component
//     perpendicular to the shaft, the driving quantity for rotor sag.
//   - axialMagnitude() = |g_z| is the component along the shaft, the
//     driving quantity for axial bearing preload modulation.
//   - radialAngle() = atan2(g_y, g_x) is the azimuth of the gravity
//     vector in the rotor (XY) plane, which fixes the sag direction.
export class GravityVector implements ISimNode {
    public readonly kind: string = "pmsm.env.gravity-vector";

    public readonly field: GravityField;
    public readonly transform: MotorTransform;

    private _gBody: [number, number, number] = [0, 0, 0];

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
        this._gBody = [0, 0, 0];
    }

    public motorFrameGravity(): [number, number, number] {
        return [this._gBody[0], this._gBody[1], this._gBody[2]];
    }

    public radialMagnitude(): number {
        return Math.sqrt(this._gBody[0] ** 2 + this._gBody[1] ** 2);
    }

    public axialMagnitude(): number {
        return Math.abs(this._gBody[2]);
    }

    public radialAngle(): number {
        return Math.atan2(this._gBody[1], this._gBody[0]);
    }

    public magnitude(): number {
        return Math.sqrt(this._gBody[0] ** 2 + this._gBody[1] ** 2 + this._gBody[2] ** 2);
    }

    private _recompute(): void {
        const gWorld = this.field.worldGravity();
        this._gBody = this.transform.projectWorldToBody(gWorld);
    }
}
