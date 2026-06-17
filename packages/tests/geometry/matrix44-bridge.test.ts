/**
 * Matrix44 (flat serialized form) <-> Matrix4 (math class) bridge.
 *
 * `Matrix44` is ONLY the flat serialized projection of `Matrix4`; it carries
 * no math. All 4x4 arithmetic lives on the `Matrix4` class, and hot paths
 * cross the wire boundary with `setFromArray` / `toArrayRef` (allocation-free)
 * or `fromFlat` / `toFlat`. This suite pins that bridge.
 */
import { Cartesian3, IDENTITY44, isMatrix44, Matrix4, Quaternion } from "spikypanda-core";

function poseFlat(px: number, py: number, pz: number, qz: number): number[] {
    // A non-trivial affine: rotation about Z by quaternion (0,0,qz,w) +
    // translation + a bit of non-uniform scale.
    const w = Math.sqrt(Math.max(0, 1 - qz * qz));
    return Matrix4.Compose(new Cartesian3(1.3, 0.7, 2.0), new Quaternion(0, 0, qz, w), new Cartesian3(px, py, pz)).toFlat();
}

describe("Matrix44 <-> Matrix4 bridge", () => {
    test("IDENTITY44 equals Matrix4.Identity().toFlat()", () => {
        expect(Array.from(IDENTITY44)).toEqual(Matrix4.Identity().toFlat());
    });

    test("fromFlat / toFlat round-trip is lossless", () => {
        const flat = poseFlat(5, -2, 3, 0.4);
        const round = Matrix4.fromFlat(flat).toFlat();
        for (let i = 0; i < 16; i++) expect(round[i]).toBeCloseTo(flat[i], 12);
    });

    test("setFromArray / toArrayRef round-trip is lossless and allocation-reusing", () => {
        const flat = poseFlat(-1, 6, 0.5, 0.7);
        const m = new Matrix4();
        expect(m.setFromArray(flat)).toBe(m); // chains, mutates in place
        const out = new Array<number>(16).fill(0);
        expect(m.toArrayRef(out)).toBe(out); // writes into the caller's buffer
        for (let i = 0; i < 16; i++) expect(out[i]).toBeCloseTo(flat[i], 12);
    });

    test("setFromArray rejects a wrong-length flat form", () => {
        expect(() => new Matrix4().setFromArray([1, 2, 3])).toThrow();
    });

    test("equalsArray / equals do a tolerant element-wise compare", () => {
        const flat = poseFlat(1, -2, 3, 0.4);
        const m = Matrix4.fromFlat(flat);
        expect(m.equalsArray(flat)).toBe(true);
        expect(m.equals(Matrix4.fromFlat(flat))).toBe(true);
        const near = flat.slice();
        near[5] += 1e-13; // inside default tolerance
        expect(m.equalsArray(near)).toBe(true);
        const far = flat.slice();
        far[5] += 1e-6; // outside default tolerance
        expect(m.equalsArray(far)).toBe(false);
        expect(m.equalsArray([1, 2, 3])).toBe(false); // wrong length
    });

    test("isMatrix44 guards the flat form", () => {
        expect(isMatrix44(poseFlat(0, 0, 0, 0))).toBe(true);
        expect(isMatrix44([1, 2, 3])).toBe(false);
        expect(isMatrix44(new Float64Array(16))).toBe(false); // wire form is a plain Array
        expect(isMatrix44(null)).toBe(false);
    });

    test("transformDirectionToRef applies the linear part and ignores translation", () => {
        // Same rotation, different translations -> identical transformed direction.
        const wq = Math.sqrt(1 - 0.3 * 0.3);
        const rot = new Quaternion(0, 0, 0.3, wq);
        const a = Matrix4.Compose(Cartesian3.One(), rot, new Cartesian3(0, 0, 0));
        const b = Matrix4.Compose(Cartesian3.One(), rot, new Cartesian3(100, -50, 7));
        const v = new Cartesian3(0, 0, -9.81);
        const ra = a.transformDirectionToRef(v, new Cartesian3());
        const rb = b.transformDirectionToRef(v, new Cartesian3());
        expect(rb.x).toBeCloseTo(ra.x, 12);
        expect(rb.y).toBeCloseTo(ra.y, 12);
        expect(rb.z).toBeCloseTo(ra.z, 12);
    });

    test("transposeToRef is an involution and may alias this", () => {
        const a = Matrix4.fromFlat(poseFlat(2, -3, 1, 0.5));
        const t = a.transposeToRef(new Matrix4());
        // Off-diagonal entries swapped.
        expect(t.m[4]).toBeCloseTo(a.m[1], 12);
        expect(t.m[1]).toBeCloseTo(a.m[4], 12);
        // (Aᵀ)ᵀ == A, even when out aliases this.
        const tt = t.transposeToRef(t);
        for (let i = 0; i < 16; i++) expect(tt.m[i]).toBeCloseTo(a.m[i], 12);
    });

    test("composition transposeToRef + transformDirectionToRef gives Rᵀ·v (inverse rotation, round-trips)", () => {
        // Pure rotation (unit scale) so Rᵀ = R⁻¹.
        const wq = Math.sqrt(1 - 0.5 * 0.5);
        const R = Matrix4.Compose(Cartesian3.One(), new Quaternion(0, 0, 0.5, wq), Cartesian3.Zero());
        const v = new Cartesian3(1, 2, 3);
        // body = Rᵀ·v, composed from the two pure primitives.
        const body = R.transposeToRef(new Matrix4()).transformDirectionToRef(v, new Cartesian3());
        // Re-apply R (forward): R·body recovers v.
        const back = R.transformDirectionToRef(body, new Cartesian3());
        expect(back.x).toBeCloseTo(v.x, 12);
        expect(back.y).toBeCloseTo(v.y, 12);
        expect(back.z).toBeCloseTo(v.z, 12);
    });
});
