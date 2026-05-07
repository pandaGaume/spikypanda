import { PiController } from "spikypanda-sensors/sources/motor/pmsm/control/PiController";

describe("PiController", () => {
    it("returns proportional output on the first sample (no time elapsed, no integral term)", () => {
        const pi = new PiController({ kp: 2, ki: 100, outMin: -10, outMax: 10 });
        const out = pi.update(1.0, 0.0, 0.0);
        // dt = 0 on the first call, so the integral term is zero. Output is
        // strictly the proportional term: kp * (1 - 0) = 2.
        expect(out).toBeCloseTo(2.0, 12);
    });

    it("integrates a constant error linearly over time", () => {
        const pi = new PiController({ kp: 0, ki: 4, outMin: -1e6, outMax: 1e6 });
        pi.update(1.0, 0.0, 0.0);
        const out = pi.update(1.0, 0.0, 0.5);
        // ki * error * dt = 4 * 1 * 0.5 = 2
        expect(out).toBeCloseTo(2.0, 12);
    });

    it("converges a first-order plant to setpoint under positive gains", () => {
        // Mini integrator: y[k+1] = y[k] + u * dt, u = pi.update(setpoint, y, t).
        // The closed loop drives y to setpoint after enough steps.
        const pi = new PiController({ kp: 2, ki: 5, outMin: -10, outMax: 10 });
        let y = 0;
        const dt = 1e-3;
        const setpoint = 3.0;
        for (let k = 0; k < 10000; k++) {
            const t = k * dt;
            const u = pi.update(setpoint, y, t);
            y += u * dt;
        }
        expect(Math.abs(y - setpoint)).toBeLessThan(0.01);
    });

    it("saturates the output at outMax when the unsaturated output exceeds it", () => {
        const pi = new PiController({ kp: 100, ki: 0, outMin: -1, outMax: 1 });
        const out = pi.update(10.0, 0.0, 0.0);
        expect(out).toBe(1);
    });

    it("anti-windup prevents integrator runaway during prolonged saturation", () => {
        // antiWindup defaults to ki/kp = 50, the textbook back-calc gain.
        const pi = new PiController({ kp: 1, ki: 50, outMin: -1, outMax: 1 });
        // Push the controller into saturation with a constant huge error.
        const dt = 1e-3;
        for (let k = 0; k < 5000; k++) {
            pi.update(100.0, 0.0, k * dt);
        }
        // Without anti-windup: integral would be ki * 100 * 5 = 25000.
        // With anti-windup: integral is bounded near (outMax - kp*error)
        // i.e. somewhere small once back-calc dominates. Bound is loose
        // because anti-windup gain is finite, but it must not be huge.
        expect(Math.abs(pi.integral)).toBeLessThan(50);
    });

    it("recovers correctly after saturation: when error reverses, output unsaturates promptly", () => {
        const pi = new PiController({ kp: 1, ki: 50, outMin: -1, outMax: 1 });
        const dt = 1e-3;
        // Saturate positive for a while.
        for (let k = 0; k < 1000; k++) pi.update(100.0, 0.0, k * dt);
        // Reverse: setpoint suddenly negative. With anti-windup the
        // integrator is small, so the output should reach negative
        // saturation within a handful of cycles.
        let stepsToNegative = -1;
        for (let k = 0; k < 200; k++) {
            const out = pi.update(-100.0, 0.0, (1000 + k) * dt);
            if (out <= -0.99) { stepsToNegative = k; break; }
        }
        expect(stepsToNegative).toBeGreaterThanOrEqual(0);
        expect(stepsToNegative).toBeLessThan(50);
    });

    it("reset() clears the integrator and the time bookkeeping", () => {
        const pi = new PiController({ kp: 0, ki: 10, outMin: -100, outMax: 100 });
        pi.update(1.0, 0.0, 0.0);
        pi.update(1.0, 0.0, 1.0);
        expect(pi.integral).toBeGreaterThan(0);
        pi.reset();
        expect(pi.integral).toBe(0);
        // After reset, the next update sees dt = 0 again.
        expect(pi.update(1.0, 0.0, 5.0)).toBeCloseTo(0.0, 12);
    });
});
