import { Current } from "spikypanda-core";
import { MotorCurrentSource, DEFAULT_MOTOR } from "spikypanda-sensors";

describe("MotorCurrentSource", () => {
    it("declares amperes as its measurement unit", () => {
        const m = new MotorCurrentSource(DEFAULT_MOTOR);
        expect(m.meta().unit).toBe(Current.Units.amp);
        expect(m.meta().kind).toBe("motor.current");
    });

    it("starts at the equilibrium current (no startup transient with the default driver)", () => {
        // The model initializes the state at the operating equilibrium, so
        // signal(0) is the analytical steady-state DC plus the (small)
        // brush-commutation ripple at θ=0. With D=1 (driver transparent)
        // there is no PWM-induced transient either.
        const m = new MotorCurrentSource(DEFAULT_MOTOR);
        const idc = m.steadyStateDc();
        const maxRipple = (DEFAULT_MOTOR.rippleFactor ?? 0.05) * idc * 1.53;
        expect(Math.abs(m.signal(0) - idc)).toBeLessThanOrEqual(maxRipple + 1e-9);
    });

    it("converges toward the analytical steady-state DC level", () => {
        const m = new MotorCurrentSource(DEFAULT_MOTOR);
        const steady = m.steadyStateDc();
        expect(steady).toBeGreaterThan(0);

        // Average over many cycles after the transient settles to wash out the
        // ripple and harmonic contributions.
        const tau = DEFAULT_MOTOR.inductance! / DEFAULT_MOTOR.resistance!;
        const startT = 20 * tau;
        const fComm = DEFAULT_MOTOR.commutatorBars! * DEFAULT_MOTOR.motorSpeedRps!;
        const period = 1.0 / fComm;
        const samples = 4000;
        const dt = (40 * period) / samples;

        let sum = 0;
        for (let i = 0; i < samples; i++) {
            sum += m.signal(startT + i * dt);
        }
        const mean = sum / samples;

        expect(Math.abs(mean - steady)).toBeLessThan(0.05 * steady);
    });

    it("steadyStateDc reports the equilibrium current at the configured operating point regardless of loadFactor", () => {
        // steadyStateDc() returns the analytical equilibrium at full duty
        // and the configured nominal speed; it is independent of loadFactor
        // because the operating point is calibrated to the same speed for
        // any load. loadFactor's effect on the actual time-domain signal is
        // tested separately through dynamic settling.
        const ref = new MotorCurrentSource({ ...DEFAULT_MOTOR, loadFactor: 1.0 });
        const heavy = new MotorCurrentSource({ ...DEFAULT_MOTOR, loadFactor: 2.0 });
        expect(heavy.steadyStateDc()).toBeCloseTo(ref.steadyStateDc(), 6);
    });

    it("clamps negative DC (back-EMF exceeds supply) to zero", () => {
        const stalled = new MotorCurrentSource({
            ...DEFAULT_MOTOR,
            supplyVoltage: 1.0,
            backEmfConstant: 1.0,
            motorSpeedRps: 100.0,
        });
        expect(stalled.steadyStateDc()).toBe(0);
    });
});
