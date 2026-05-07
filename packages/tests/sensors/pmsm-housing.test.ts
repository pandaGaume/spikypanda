import { HousingMechanics, defaultHousingMechanicsConfig } from "spikypanda-sensors/sources/motor/pmsm/env/HousingMechanics";

describe("HousingMechanics 2nd-order LTI", () => {
    it("with no force, stays at rest", () => {
        const h = new HousingMechanics(defaultHousingMechanicsConfig());
        for (let i = 0; i <= 1000; i++) h.advance(i * 1e-4);
        expect(Math.abs(h.position(0))).toBeLessThan(1e-12);
        expect(Math.abs(h.velocity(0))).toBeLessThan(1e-12);
    });

    it("rejects invalid configurations", () => {
        expect(() => new HousingMechanics({
            x: { mass: 0 } as any,
            y: { mass: 0.1, omegaN: 1, zeta: 0.1 },
            z: { mass: 0.1, omegaN: 1, zeta: 0.1 },
        })).toThrow();
        expect(() => new HousingMechanics({
            x: { mass: 0.1 } as any,
            y: { mass: 0.1, omegaN: 1, zeta: 0.1 },
            z: { mass: 0.1, omegaN: 1, zeta: 0.1 },
        })).toThrow();
    });

    it("constant force converges to DC steady state x = F / k", () => {
        const k = 1e6;
        const m = 0.1;
        const c = 2 * 0.1 * Math.sqrt(m * k);
        const h = new HousingMechanics({
            x: { mass: m, stiffness: k, damping: c },
            y: { mass: m, stiffness: k, damping: c },
            z: { mass: m, stiffness: k, damping: c },
        });
        h.advance(0);
        const F = 10;
        // Apply F continuously over many time constants.
        const dt = 1e-5;
        const tEnd = 0.5;
        for (let i = 1; (i * dt) <= tEnd; i++) {
            h.addForce(0, F);
            h.advance(i * dt);
        }
        const xExpected = F / k;
        expect(Math.abs(h.position(0) - xExpected) / xExpected).toBeLessThan(0.01);
        expect(Math.abs(h.velocity(0))).toBeLessThan(1e-3 * Math.abs(xExpected));
    });

    it("each axis is independent", () => {
        const cfg = defaultHousingMechanicsConfig();
        const h = new HousingMechanics(cfg);
        const F = 5;
        const dt = 1e-5;
        for (let i = 1; (i * dt) <= 0.2; i++) {
            h.addForce(1, F);   // y axis only
            h.advance(i * dt);
        }
        expect(Math.abs(h.position(1))).toBeGreaterThan(1e-9);
        expect(Math.abs(h.position(0))).toBeLessThan(1e-12);
        expect(Math.abs(h.position(2))).toBeLessThan(1e-12);
    });

    it("force accumulator resets after each advance cycle", () => {
        const h = new HousingMechanics(defaultHousingMechanicsConfig());
        h.advance(0);
        // Inject a single impulse and step.
        h.addForce(0, 100);
        h.advance(1e-3);
        const v1 = h.velocity(0);
        // Without further forces, the axis should decay (damped 2nd order).
        for (let i = 2; i <= 500; i++) h.advance(i * 1e-3);
        // After many time constants the axis should have decayed back to
        // small values; in particular, its velocity is much smaller than v1.
        expect(Math.abs(h.velocity(0))).toBeLessThan(0.1 * Math.abs(v1));
    });

    it("reset clears all state", () => {
        const h = new HousingMechanics(defaultHousingMechanicsConfig());
        h.advance(0);
        for (let i = 1; i <= 100; i++) {
            h.addForce(0, 5);
            h.advance(i * 1e-4);
        }
        expect(Math.abs(h.position(0))).toBeGreaterThan(1e-12);
        h.reset();
        expect(h.position(0)).toBe(0);
        expect(h.velocity(0)).toBe(0);
        expect(h.acceleration(0)).toBe(0);
    });
});
