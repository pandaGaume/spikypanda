/**
 * Matrix44 (flat serialized form) <-> Matrix4 (math class) bridge.
 *
 * The whole point of consolidating into geometry: there is ONE 4x4
 * abstraction. `Matrix44` is just the flat serialized projection of
 * `Matrix4`, and `mul44` is the allocation-free form of
 * `Matrix4.multiply`. This suite pins that equivalence so the two never
 * drift into divergent implementations.
 */
import { Cartesian3, IDENTITY44, isMatrix44, Matrix4, mul44, Quaternion } from "spikypanda-core";

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

    test("mul44 agrees with Matrix4.multiply (one source of truth)", () => {
        const a = poseFlat(1, 2, 3, 0.3);
        const b = poseFlat(-4, 0.5, 2, 0.6);
        const out = new Array<number>(16);
        mul44(out, a, b);
        const viaClass = new Matrix4(a).multiply(new Matrix4(b)).toFlat();
        for (let i = 0; i < 16; i++) expect(out[i]).toBeCloseTo(viaClass[i], 12);
    });

    test("mul44 with identity is the other operand", () => {
        const a = poseFlat(7, 8, 9, 0.2);
        const out = new Array<number>(16);
        mul44(out, IDENTITY44, a);
        for (let i = 0; i < 16; i++) expect(out[i]).toBeCloseTo(a[i], 12);
    });

    test("isMatrix44 guards the flat form", () => {
        expect(isMatrix44(poseFlat(0, 0, 0, 0))).toBe(true);
        expect(isMatrix44([1, 2, 3])).toBe(false);
        expect(isMatrix44(new Float64Array(16))).toBe(false); // wire form is a plain Array
        expect(isMatrix44(null)).toBe(false);
    });
});
