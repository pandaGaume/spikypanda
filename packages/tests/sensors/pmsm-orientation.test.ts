import { Cartesian3 } from "@spiky-panda/core";
import { GravityField } from "spikypanda-sensors/sources/motor/pmsm/env/GravityField";
import { GravityVector } from "spikypanda-sensors/sources/motor/pmsm/env/GravityVector";
import { MotorTransform } from "spikypanda-sensors/sources/motor/pmsm/env/MotorTransform";

const G_EARTH_MAG = 9.80665;

function near(a: number, b: number, eps: number = 1e-9): boolean {
    return Math.abs(a - b) <= eps;
}

describe("MotorTransform presets", () => {
    it("identity : body axes equal world axes", () => {
        const t = MotorTransform.identity();
        const R = t.bodyToWorldMatrix();
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                expect(R[i][j]).toBeCloseTo(i === j ? 1 : 0, 12);
            }
        }
        expect(t.label).toBe("identity");
    });

    it("horizontal : body X lies along world +X (identity)", () => {
        const t = MotorTransform.horizontal();
        const R = t.bodyToWorldMatrix();
        // Body X = column 0 of R_bodyToWorld.
        const xInWorld: [number, number, number] = [R[0][0], R[1][0], R[2][0]];
        expect(xInWorld[0]).toBeCloseTo(1, 9);
        expect(xInWorld[1]).toBeCloseTo(0, 9);
        expect(xInWorld[2]).toBeCloseTo(0, 9);
    });

    it("verticalDown : body X along world -Z", () => {
        const t = MotorTransform.verticalDown();
        const R = t.bodyToWorldMatrix();
        const xInWorld: [number, number, number] = [R[0][0], R[1][0], R[2][0]];
        expect(xInWorld[0]).toBeCloseTo(0, 9);
        expect(xInWorld[1]).toBeCloseTo(0, 9);
        expect(xInWorld[2]).toBeCloseTo(-1, 9);
    });

    it("verticalUp : body X along world +Z", () => {
        const t = MotorTransform.verticalUp();
        const R = t.bodyToWorldMatrix();
        const xInWorld: [number, number, number] = [R[0][0], R[1][0], R[2][0]];
        expect(xInWorld[0]).toBeCloseTo(0, 9);
        expect(xInWorld[1]).toBeCloseTo(0, 9);
        expect(xInWorld[2]).toBeCloseTo(1, 9);
    });

    it("rotation matrix is orthonormal (R * R^T = I) for arbitrary Euler angles", () => {
        const t = MotorTransform.fromEulerZyx(0.5, 1.2, -0.7);
        const R = t.bodyToWorldMatrix();
        const Rt = t.worldToBodyMatrix();
        // R * R^T = I.
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                let s = 0;
                for (let k = 0; k < 3; k++) s += R[i][k] * Rt[k][j];
                expect(s).toBeCloseTo(i === j ? 1 : 0, 9);
            }
        }
    });

    it("projectWorldToBody is consistent with worldToBodyMatrix", () => {
        const t = MotorTransform.fromEulerZyx(0.3, -0.8, 1.1);
        const Rt = t.worldToBodyMatrix();
        const v = new Cartesian3(1, 2, 3);
        const projected = t.projectWorldToBody(v);
        const expected = [
            Rt[0][0] * v.x + Rt[0][1] * v.y + Rt[0][2] * v.z,
            Rt[1][0] * v.x + Rt[1][1] * v.y + Rt[1][2] * v.z,
            Rt[2][0] * v.x + Rt[2][1] * v.y + Rt[2][2] * v.z,
        ];
        expect(projected.x).toBeCloseTo(expected[0], 12);
        expect(projected.y).toBeCloseTo(expected[1], 12);
        expect(projected.z).toBeCloseTo(expected[2], 12);
    });
});

describe("GravityField presets", () => {
    it("earth : 9.80665 m/s^2 along world -Z", () => {
        const f = GravityField.earth();
        const g = f.worldGravity();
        expect(g.x).toBeCloseTo(0, 12);
        expect(g.y).toBeCloseTo(0, 12);
        expect(g.z).toBeCloseTo(-G_EARTH_MAG, 12);
        expect(f.worldMagnitude()).toBeCloseTo(G_EARTH_MAG, 12);
        expect(f.label).toBe("earth");
    });

    it("microgravity : zero vector", () => {
        const f = GravityField.microgravity();
        expect(f.worldGravity()).toMatchObject({ x: 0, y: 0, z: 0 });
        expect(f.worldMagnitude()).toBe(0);
        expect(f.label).toBe("microgravity");
    });

    it("custom : caller-provided vector", () => {
        const f = GravityField.custom(new Cartesian3(1, 2, 3), "test");
        expect(f.worldGravity()).toMatchObject({ x: 1, y: 2, z: 3 });
        expect(f.label).toBe("test");
    });

    it("setWorldGravity allows runtime modulation", () => {
        const f = GravityField.earth();
        f.setWorldGravity(new Cartesian3(0, 0, -1.62), "moon");
        expect(f.worldGravity().z).toBeCloseTo(-1.62, 12);
        expect(f.label).toBe("moon");
    });
});

describe("GravityVector projection (decisive ground test setup)", () => {
    it("horizontal earth : g_body = [0, 0, -9.81], radial magnitude full, axial zero", () => {
        const gv = new GravityVector(GravityField.earth(), MotorTransform.horizontal());
        gv.advance(0);
        const g = gv.motorFrameGravity();
        expect(near(g.x, 0, 1e-6)).toBe(true);
        expect(near(g.y, 0, 1e-6)).toBe(true);
        expect(near(g.z, -G_EARTH_MAG, 1e-6)).toBe(true);
        expect(near(gv.radialMagnitude(), G_EARTH_MAG, 1e-6)).toBe(true);
        expect(near(gv.axialMagnitude(), 0, 1e-6)).toBe(true);
    });

    it("vertical up earth : g_body = [-9.81, 0, 0], radial zero, axial full", () => {
        const gv = new GravityVector(GravityField.earth(), MotorTransform.verticalUp());
        gv.advance(0);
        const g = gv.motorFrameGravity();
        expect(near(g.x, -G_EARTH_MAG, 1e-6)).toBe(true);
        expect(near(g.y, 0, 1e-6)).toBe(true);
        expect(near(g.z, 0, 1e-6)).toBe(true);
        expect(near(gv.radialMagnitude(), 0, 1e-6)).toBe(true);
        expect(near(gv.axialMagnitude(), G_EARTH_MAG, 1e-6)).toBe(true);
    });

    it("microgravity : zero in body frame regardless of orientation", () => {
        for (const t of [MotorTransform.horizontal(), MotorTransform.verticalUp(), MotorTransform.fromEulerZyx(0.7, 1.1, -0.3)]) {
            const gv = new GravityVector(GravityField.microgravity(), t);
            gv.advance(0);
            const g = gv.motorFrameGravity();
            expect(near(g.x, 0, 1e-9)).toBe(true);
            expect(near(g.y, 0, 1e-9)).toBe(true);
            expect(near(g.z, 0, 1e-9)).toBe(true);
            expect(gv.radialMagnitude()).toBe(0);
            expect(gv.axialMagnitude()).toBe(0);
        }
    });

    it("preserves magnitude under any rotation (rotation is isometric)", () => {
        for (const t of [
            MotorTransform.horizontal(),
            MotorTransform.verticalUp(),
            MotorTransform.verticalDown(),
            MotorTransform.fromEulerZyx(0.4, 1.5, -0.9),
        ]) {
            const gv = new GravityVector(GravityField.earth(), t);
            gv.advance(0);
            expect(near(gv.magnitude(), G_EARTH_MAG, 1e-6)).toBe(true);
        }
    });

    it("recomputes the projection when the field or transform changes", () => {
        const field = GravityField.earth();
        const tr = MotorTransform.horizontal();
        const gv = new GravityVector(field, tr);
        gv.advance(0);
        expect(gv.radialMagnitude()).toBeGreaterThan(1);
        // Switch the field to microgravity in place.
        field.setWorldGravity(new Cartesian3(0, 0, 0), "zerog");
        gv.advance(0);
        expect(gv.radialMagnitude()).toBeCloseTo(0, 9);
        // Restore and reorient to vertical up.
        field.setWorldGravity(new Cartesian3(0, 0, -G_EARTH_MAG), "earth");
        tr.setEulerZyx(0, -Math.PI / 2, 0, "verticalUp");
        gv.advance(0);
        expect(gv.radialMagnitude()).toBeCloseTo(0, 6);
        expect(gv.axialMagnitude()).toBeCloseTo(G_EARTH_MAG, 6);
    });
});
