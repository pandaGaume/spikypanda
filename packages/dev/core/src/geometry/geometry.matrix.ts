/**
 * Column-major 4×4 transform matrix.
 *
 * Storage and indexing match `IMatrix4` (see geometry.interfaces.ts):
 * `m[col*4 + row]`, with translation in `m[12..14]` and the homogeneous
 * row `[0, 0, 0, 1]` at `m[3], m[7], m[11], m[15]`. This is the same
 * layout as Babylon.js's `Matrix.m`, three.js's `Matrix4.elements`,
 * and the OpenGL / WebGL / glsl `mat4` uniform format — a `Matrix4`
 * instance's `m` buffer can be uploaded to a shader uniform without
 * transposition.
 *
 * The class is designed for V1 scene-graph composition: the canonical
 * operations are `compose(p, r, s)` to build a transform from its
 * decomposed parts, `multiply(other)` to chain transforms in the
 * parent × child order standard scene graphs use, and `decompose(p, r, s)`
 * to extract translation / rotation / non-uniform scale back out.
 *
 * Float64Array storage (not Float32) because the SceneStateView /
 * composeTransform path is used by the physics layer, where the
 * accumulated rounding error of repeated matrix products at f32
 * precision shows up in long-running simulations. The cost difference
 * vs f32 is negligible at our matrix counts (a handful per fire).
 */

import { Cartesian3 } from "./geometry.cartesian";
import type { ICartesian3, IMatrix4, IQuaternion } from "./geometry.interfaces";
import { Quaternion } from "./geometry.quarternion";

/** Column-major index for row `r`, column `c` in a 4×4 matrix. Inlined
 *  in the perf-sensitive paths; exported for downstream code that
 *  needs to read individual entries with an obvious naming. */
export function mIdx(row: number, col: number): number {
    return col * 4 + row;
}

export class Matrix4 implements IMatrix4 {
    /** Column-major entries; 16 floats. Length-checked at construction. */
    public readonly m: Float64Array;

    public constructor(entries?: ArrayLike<number>) {
        this.m = new Float64Array(16);
        if (entries) {
            if (entries.length !== 16) {
                throw new Error(`Matrix4 expects 16 entries, got ${entries.length}`);
            }
            for (let i = 0; i < 16; i++) this.m[i] = entries[i];
        } else {
            // Default to identity rather than zero — most call sites
            // chain a `.compose(...)` or `.multiply(...)` immediately,
            // but a few read entries before any setup and zero would
            // be wrong (a zero matrix maps every point to the origin).
            this.m[0] = 1;
            this.m[5] = 1;
            this.m[10] = 1;
            this.m[15] = 1;
        }
    }

    /** Fresh identity matrix. PascalCase to match the Babylon.js
     *  `Matrix.Identity()` static-factory naming convention. */
    public static Identity(): Matrix4 {
        return new Matrix4();
    }

    /**
     * Build the affine transform matrix `T(translation) · R(rotation) · S(scale)`
     * — the standard parent-frame composition: scale first (applied
     * to unit-cube vertices), then rotate, then translate. Argument
     * order (`scale, rotation, translation`) matches Babylon.js
     * `Matrix.Compose` exactly so cross-engine porting is mechanical;
     * the math reads naturally right-to-left as `T · R · S`.
     *
     * Implemented inline (rather than via three matrix multiplies) so
     * the 16-store path stays a single pass over the destination
     * buffer — important because `composeTransform` is called on
     * every `worldTransform` access from a TransformNode-derived
     * consumer.
     */
    public static Compose(scale: ICartesian3, rotation: IQuaternion, translation: ICartesian3): Matrix4 {
        const out = new Matrix4();
        out.composeInPlace(scale, rotation, translation);
        return out;
    }

    /** In-place variant of `Compose()`. Returns `this` for chaining.
     *  Argument order matches `Matrix4.Compose` and Babylon.js. */
    public composeInPlace(scale: ICartesian3, rotation: IQuaternion, translation: ICartesian3): this {
        const { x: qx, y: qy, z: qz, w: qw } = rotation;
        const { x: sx, y: sy, z: sz } = scale;
        // Rotation matrix entries from the quaternion. Reused below
        // weighted by the per-axis scale.
        const x2 = qx + qx;
        const y2 = qy + qy;
        const z2 = qz + qz;
        const xx = qx * x2;
        const xy = qx * y2;
        const xz = qx * z2;
        const yy = qy * y2;
        const yz = qy * z2;
        const zz = qz * z2;
        const wx = qw * x2;
        const wy = qw * y2;
        const wz = qw * z2;

        const m = this.m;
        // Column 0 (scaled X axis after rotation).
        m[0] = (1 - (yy + zz)) * sx;
        m[1] = (xy + wz) * sx;
        m[2] = (xz - wy) * sx;
        m[3] = 0;
        // Column 1 (scaled Y axis after rotation).
        m[4] = (xy - wz) * sy;
        m[5] = (1 - (xx + zz)) * sy;
        m[6] = (yz + wx) * sy;
        m[7] = 0;
        // Column 2 (scaled Z axis after rotation).
        m[8] = (xz + wy) * sz;
        m[9] = (yz - wx) * sz;
        m[10] = (1 - (xx + yy)) * sz;
        m[11] = 0;
        // Column 3 (translation).
        m[12] = translation.x;
        m[13] = translation.y;
        m[14] = translation.z;
        m[15] = 1;
        return this;
    }

    /**
     * Multiply `result = this · other`, fresh matrix. Equivalent to
     * Babylon.js `Matrix.multiply`. In a scene-graph context, call
     * `parent.multiply(child)` to obtain the world transform of a
     * node nested under `parent` carrying local transform `child`.
     */
    public multiply(other: IMatrix4): Matrix4 {
        const out = new Matrix4();
        this.multiplyToRef(other, out);
        return out;
    }

    /**
     * Non-allocating multiply: writes `result = this · other` into
     * `result`. Matches Babylon.js `Matrix.multiplyToRef`. `result`
     * may alias neither `this` nor `other` — the implementation
     * builds the 16 result entries in locals so self-aliasing would
     * silently corrupt the inputs mid-multiply. Returns `this` for
     * chaining (NOT `result`; mirrors BJS).
     */
    public multiplyToRef(other: IMatrix4, result: Matrix4): this {
        const a = this.m;
        const b = other.m;
        const r0 = a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3];
        const r1 = a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3];
        const r2 = a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3];
        const r3 = a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3];

        const r4 = a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7];
        const r5 = a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7];
        const r6 = a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7];
        const r7 = a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7];

        const r8 = a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11];
        const r9 = a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11];
        const r10 = a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11];
        const r11 = a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11];

        const r12 = a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15];
        const r13 = a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15];
        const r14 = a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15];
        const r15 = a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15];

        const m = result.m;
        m[0] = r0;
        m[1] = r1;
        m[2] = r2;
        m[3] = r3;
        m[4] = r4;
        m[5] = r5;
        m[6] = r6;
        m[7] = r7;
        m[8] = r8;
        m[9] = r9;
        m[10] = r10;
        m[11] = r11;
        m[12] = r12;
        m[13] = r13;
        m[14] = r14;
        m[15] = r15;
        return this;
    }

    /**
     * Extract scale / rotation / translation from the matrix into the
     * caller-provided destinations. Argument order and nullability
     * match Babylon.js `Matrix.decompose(scale?, rotation?, translation?)`
     * exactly: the caller passes `undefined` for any part they do not
     * need (e.g. `m.decompose(undefined, outRot, outPos)` to skip
     * scale extraction).
     *
     * Returns `true` when the decomposition is valid (non-singular
     * scale), `false` when at least one scale axis collapsed to zero
     * and the rotation could not be uniquely recovered — in the
     * degenerate case the rotation output is left at identity rather
     * than NaN.
     *
     * For matrices with negative determinant (handed inversion or
     * mirrored axes), the first scale axis is negated so the
     * rotation stays a proper rotation; downstream consumers should
     * not assume positive-definite scale.
     */
    public decompose(outScale?: Cartesian3, outRotation?: Quaternion, outTranslation?: Cartesian3): boolean {
        const m = this.m;
        if (outTranslation) {
            outTranslation.x = m[12];
            outTranslation.y = m[13];
            outTranslation.z = m[14];
        }

        // Column-vector magnitudes give the per-axis scale.
        let sx = Math.hypot(m[0], m[1], m[2]);
        const sy = Math.hypot(m[4], m[5], m[6]);
        const sz = Math.hypot(m[8], m[9], m[10]);

        // Negative determinant → mirrored basis; absorb the flip in
        // the first axis so the rotation we extract is a pure SO(3).
        const det = this._determinant3x3();
        if (det < 0) sx = -sx;

        if (outScale) {
            outScale.x = sx;
            outScale.y = sy;
            outScale.z = sz;
        }

        const degenerate = sx === 0 || sy === 0 || sz === 0;
        if (outRotation) {
            if (degenerate) {
                outRotation.x = 0;
                outRotation.y = 0;
                outRotation.z = 0;
                outRotation.w = 1;
            } else {
                // Build the unscaled rotation matrix in locals.
                const ix = 1 / sx;
                const iy = 1 / sy;
                const iz = 1 / sz;
                const r00 = m[0] * ix;
                const r10 = m[1] * ix;
                const r20 = m[2] * ix;
                const r01 = m[4] * iy;
                const r11 = m[5] * iy;
                const r21 = m[6] * iy;
                const r02 = m[8] * iz;
                const r12 = m[9] * iz;
                const r22 = m[10] * iz;

                // Standard Shepperd quaternion extraction.
                const trace = r00 + r11 + r22;
                if (trace > 0) {
                    const s = 0.5 / Math.sqrt(trace + 1.0);
                    outRotation.w = 0.25 / s;
                    outRotation.x = (r21 - r12) * s;
                    outRotation.y = (r02 - r20) * s;
                    outRotation.z = (r10 - r01) * s;
                } else if (r00 > r11 && r00 > r22) {
                    const s = 2.0 * Math.sqrt(1.0 + r00 - r11 - r22);
                    outRotation.w = (r21 - r12) / s;
                    outRotation.x = 0.25 * s;
                    outRotation.y = (r01 + r10) / s;
                    outRotation.z = (r02 + r20) / s;
                } else if (r11 > r22) {
                    const s = 2.0 * Math.sqrt(1.0 + r11 - r00 - r22);
                    outRotation.w = (r02 - r20) / s;
                    outRotation.x = (r01 + r10) / s;
                    outRotation.y = 0.25 * s;
                    outRotation.z = (r12 + r21) / s;
                } else {
                    const s = 2.0 * Math.sqrt(1.0 + r22 - r00 - r11);
                    outRotation.w = (r10 - r01) / s;
                    outRotation.x = (r02 + r20) / s;
                    outRotation.y = (r12 + r21) / s;
                    outRotation.z = 0.25 * s;
                }
            }
        }
        return !degenerate;
    }

    /** Identity-set in place. Returns `this` for chaining. */
    public setIdentity(): this {
        const m = this.m;
        m[0] = 1;
        m[5] = 1;
        m[10] = 1;
        m[15] = 1;
        m[1] = m[2] = m[3] = 0;
        m[4] = m[6] = m[7] = 0;
        m[8] = m[9] = m[11] = 0;
        m[12] = m[13] = m[14] = 0;
        return this;
    }

    /** Copy entries from another IMatrix4. Returns `this` for chaining. */
    public copyFrom(other: IMatrix4): this {
        for (let i = 0; i < 16; i++) this.m[i] = other.m[i];
        return this;
    }

    /** Fresh copy. */
    public clone(): Matrix4 {
        return new Matrix4(this.m);
    }

    /** Determinant of the upper-left 3×3 block. Used by `decompose`
     *  to detect mirrored bases (negative determinant). */
    private _determinant3x3(): number {
        const m = this.m;
        return m[0] * (m[5] * m[10] - m[6] * m[9]) - m[4] * (m[1] * m[10] - m[2] * m[9]) + m[8] * (m[1] * m[6] - m[2] * m[5]);
    }
}
