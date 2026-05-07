import { ISimNode } from "../../../../interfaces/SimNode";

// Convention :
//   - The motor body frame has its Z axis aligned with the rotor shaft.
//     X and Y span the rotor radial plane, with the rotor angle theta_m
//     measured around +Z (right-hand rule).
//   - "World" is the inertial reference frame in which gravity is defined.
//   - Internally we store R_bodyToWorld : a 3x3 rotation matrix that maps
//     a vector expressed in the motor body frame to the same vector
//     expressed in the world frame.
//   - To project a world-frame quantity (e.g. gravity) into the body frame
//     we use R_bodyToWorld^T (transpose).
//
// Euler convention : intrinsic ZYX (yaw around world Z, then pitch around
// the new Y, then roll around the new X). This matches aerospace use and
// the BlueNode UE5 default. All angles are in radians.
type Mat3 = [
    [number, number, number],
    [number, number, number],
    [number, number, number],
];

function identityMatrix3(): Mat3 {
    return [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
}

function rotX(a: number): Mat3 {
    const c = Math.cos(a), s = Math.sin(a);
    return [[1, 0, 0], [0, c, -s], [0, s, c]];
}

function rotY(a: number): Mat3 {
    const c = Math.cos(a), s = Math.sin(a);
    return [[c, 0, s], [0, 1, 0], [-s, 0, c]];
}

function rotZ(a: number): Mat3 {
    const c = Math.cos(a), s = Math.sin(a);
    return [[c, -s, 0], [s, c, 0], [0, 0, 1]];
}

function matMul(a: Mat3, b: Mat3): Mat3 {
    const out: Mat3 = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            out[i][j] = a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j];
        }
    }
    return out;
}

// Orientation of the motor body in the world frame. ISimNode for symmetry
// with the rest of the env tree; advance() is a no-op (the orientation
// only changes when the user calls a setter).
export class MotorTransform implements ISimNode {
    public readonly kind: string = "pmsm.env.transform";

    // Stored : R_bodyToWorld. Default : identity (body axes aligned with
    // world axes).
    private _R: Mat3 = identityMatrix3();
    private _label: string = "identity";

    public advance(_t: number): void { /* static unless setter called */ }
    public reset(): void { this._R = identityMatrix3(); this._label = "identity"; }

    // Setters --------------------------------------------------------------

    public setRotationMatrix(R: Mat3, label: string = "custom"): void {
        this._R = [
            [R[0][0], R[0][1], R[0][2]],
            [R[1][0], R[1][1], R[1][2]],
            [R[2][0], R[2][1], R[2][2]],
        ];
        this._label = label;
    }

    // Intrinsic ZYX Euler : yaw, then pitch, then roll. R = Rz(yaw) * Ry(pitch) * Rx(roll).
    public setEulerZyx(yawRad: number, pitchRad: number, rollRad: number, label: string = "euler"): void {
        const R = matMul(matMul(rotZ(yawRad), rotY(pitchRad)), rotX(rollRad));
        this.setRotationMatrix(R, label);
    }

    // Accessors -----------------------------------------------------------

    public bodyToWorldMatrix(): Mat3 {
        return [
            [this._R[0][0], this._R[0][1], this._R[0][2]],
            [this._R[1][0], this._R[1][1], this._R[1][2]],
            [this._R[2][0], this._R[2][1], this._R[2][2]],
        ];
    }

    public worldToBodyMatrix(): Mat3 {
        // Rotation matrices are orthonormal so the inverse equals the transpose.
        return [
            [this._R[0][0], this._R[1][0], this._R[2][0]],
            [this._R[0][1], this._R[1][1], this._R[2][1]],
            [this._R[0][2], this._R[1][2], this._R[2][2]],
        ];
    }

    public projectWorldToBody(v: [number, number, number]): [number, number, number] {
        // R_worldToBody * v = R_bodyToWorld^T * v
        return [
            this._R[0][0] * v[0] + this._R[1][0] * v[1] + this._R[2][0] * v[2],
            this._R[0][1] * v[0] + this._R[1][1] * v[1] + this._R[2][1] * v[2],
            this._R[0][2] * v[0] + this._R[1][2] * v[1] + this._R[2][2] * v[2],
        ];
    }

    public get label(): string { return this._label; }

    // Presets -------------------------------------------------------------

    // Identity : body axes aligned with world axes. Body Z (shaft) points
    // along world +Z, so this represents the motor mounted vertically with
    // its shaft pointing "up" if world gravity points along -Z.
    public static identity(): MotorTransform {
        const t = new MotorTransform();
        t._label = "identity";
        return t;
    }

    // Shaft horizontal : body Z (shaft) lies along world +X. Achieved by
    // pitching the body 90 degrees around world Y. Under earth gravity
    // (g_world = [0, 0, -9.81]) this yields g_body = [9.81, 0, 0],
    // so gravity is fully radial (perpendicular to the shaft) : the
    // baseline orientation for Model A in the proposal section 4.3.
    public static horizontal(): MotorTransform {
        const t = new MotorTransform();
        t.setEulerZyx(0, Math.PI / 2, 0, "horizontal");
        return t;
    }

    // Shaft vertical, pointing "up" along world +Z. Under earth gravity
    // g_body = [0, 0, -9.81] (fully axial). Sag mechanism vanishes here.
    public static verticalUp(): MotorTransform {
        return MotorTransform.identity();
    }

    // Shaft vertical, pointing "down" along world -Z. Pitch 180 around Y.
    public static verticalDown(): MotorTransform {
        const t = new MotorTransform();
        t.setEulerZyx(0, Math.PI, 0, "verticalDown");
        return t;
    }

    // Generic Euler ZYX entry point.
    public static fromEulerZyx(yawRad: number, pitchRad: number, rollRad: number, label?: string): MotorTransform {
        const t = new MotorTransform();
        t.setEulerZyx(yawRad, pitchRad, rollRad, label ?? `euler(${yawRad.toFixed(3)},${pitchRad.toFixed(3)},${rollRad.toFixed(3)})`);
        return t;
    }
}
