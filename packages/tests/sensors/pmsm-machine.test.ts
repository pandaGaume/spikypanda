import { PmsmMachine, IPmsmMachineConfig } from "spikypanda-sensors/sources/motor/pmsm/machine";
import { ThreePhaseTransforms } from "spikypanda-sensors/sources/motor/pmsm/control/transforms";

// Reference SPM-style configuration. Numbers are illustrative, in the
// ballpark of a small low-voltage PMSM (Maxon ECX class).
const REF_CFG: IPmsmMachineConfig = {
    resistance: 1.0,           // ohm
    inductanceD: 5e-4,         // 0.5 mH
    inductanceQ: 5e-4,         // SPM
    rotorFluxLinkage: 5e-3,    // 5 mWb
    polePairs: 1,
    rotorInertia: 1e-5,        // kg.m^2
    viscousFriction: 1e-5,     // N.m.s/rad
    nominalSpeedRps: 50,
};

describe("PmsmMachine basics", () => {
    it("starts at the configured initial state", () => {
        const m = new PmsmMachine({ ...REF_CFG, initialId: 0.1, initialIq: 0.2, initialOmegaM: 5, initialThetaM: 1.5 });
        expect(m.iD).toBeCloseTo(0.1, 12);
        expect(m.iQ).toBeCloseTo(0.2, 12);
        expect(m.omegaM).toBeCloseTo(5, 12);
        expect(m.thetaM).toBeCloseTo(1.5, 12);
        expect(m.thetaE).toBeCloseTo(1.5 * REF_CFG.polePairs, 12);
    });

    it("rejects invalid configurations", () => {
        expect(() => new PmsmMachine({ ...REF_CFG, resistance: 0 })).toThrow();
        expect(() => new PmsmMachine({ ...REF_CFG, inductanceD: -1 })).toThrow();
        expect(() => new PmsmMachine({ ...REF_CFG, polePairs: 0.5 })).toThrow();
        expect(() => new PmsmMachine({ ...REF_CFG, rotorInertia: 0 })).toThrow();
    });

    it("at rest with zero voltage, stays at rest after one advance", () => {
        const m = new PmsmMachine(REF_CFG);
        m.setPhaseVoltages(0, 0, 0);
        m.advance(1e-3);
        expect(Math.abs(m.iD)).toBeLessThan(1e-9);
        expect(Math.abs(m.iQ)).toBeLessThan(1e-9);
        expect(Math.abs(m.omegaM)).toBeLessThan(1e-9);
    });
});

describe("PmsmMachine electrical steady state", () => {
    it("with omega = 0 and a constant V_q, i_q converges to V_q / R_s", () => {
        // Lock the rotor (huge friction substitute by setting J huge so omega
        // barely moves). Easier : run for short electrical time and check the
        // electrical equilibrium directly.
        const m = new PmsmMachine({
            ...REF_CFG,
            rotorInertia: 1e3,           // effectively immovable on this timescale
            viscousFriction: 0,
            initialOmegaM: 0,
            initialThetaM: 0,
        });
        // theta_e = 0 -> dq aligned with alpha-beta. v_q lives on phase b axis
        // direction. We pick v_a, v_b, v_c so that abcToDq at theta_e = 0
        // gives v_d = 0, v_q = V.
        const Vq = 0.5;          // volts
        // Solve : dq->abc with theta_e = 0, d = 0, q = Vq
        const [vA, vB, vC] = ThreePhaseTransforms.dqToAbc(0, Vq, 0);
        m.setPhaseVoltages(vA, vB, vC);
        // Run for many electrical time constants.
        const tau = REF_CFG.inductanceQ / REF_CFG.resistance;
        const tEnd = 50 * tau;
        const dt = tau / 50;
        for (let t = 0; t <= tEnd; t += dt) m.advance(t);

        // Expected : i_q approx V_q / R_s (since omega ~= 0, no back-EMF).
        const expected = Vq / REF_CFG.resistance;
        expect(Math.abs(m.iQ - expected)).toBeLessThan(0.05 * expected);
        expect(Math.abs(m.iD)).toBeLessThan(0.05 * expected);
    });
});

describe("PmsmMachine torque generation", () => {
    it("electromagnetic torque scales as (3/2) * p * lambda_m * i_q on SPM", () => {
        const m = new PmsmMachine(REF_CFG);
        // Force-set the state for an analytical torque check : pretend the
        // machine is at i_q = 1 A, i_d = 0.
        // We do this by configuring initial state and doing zero-step advance.
        const m2 = new PmsmMachine({ ...REF_CFG, initialIq: 1.0 });
        const tExpected = 1.5 * REF_CFG.polePairs * REF_CFG.rotorFluxLinkage * 1.0;
        expect(m2.electromagneticTorque()).toBeCloseTo(tExpected, 9);
        expect(m.electromagneticTorque()).toBe(0);
    });

    it("flux envelope from a fault scales the torque", () => {
        const m = new PmsmMachine({ ...REF_CFG, initialIq: 1.0 });
        m.addFluxEnvelope(0.5);
        // electromagneticTorque uses the envelope before reset, so this
        // works in tests at the same instant.
        const tExpected = 1.5 * REF_CFG.polePairs * REF_CFG.rotorFluxLinkage * 0.5 * 1.0;
        expect(m.electromagneticTorque()).toBeCloseTo(tExpected, 9);
    });
});

describe("PmsmMachine load and friction", () => {
    it("with i_q producing positive torque, omega rises", () => {
        const m = new PmsmMachine({ ...REF_CFG, initialIq: 1.0, viscousFriction: 0 });
        // Set v_a, v_b, v_c so that vD = R*iD + 0 and vQ = R*iQ + omega_e*lambda_m
        // i.e., voltages compatible with the steady state for the initial
        // current. To keep the test simple we just run a short time and
        // verify omega has increased (T_e > 0, no load, no friction).
        m.setPhaseVoltages(0, 0, 0);
        const dt = 1e-4;
        for (let i = 0; i < 100; i++) m.advance((i + 1) * dt);
        expect(m.omegaM).toBeGreaterThan(0);
    });

    it("setLoadTorque opposes electromagnetic torque", () => {
        const m = new PmsmMachine({ ...REF_CFG, initialIq: 1.0, viscousFriction: 0 });
        const tEm = m.electromagneticTorque();
        m.setLoadTorque(2 * tEm);  // load larger than torque
        m.setPhaseVoltages(0, 0, 0);
        const dt = 1e-4;
        for (let i = 0; i < 100; i++) m.advance((i + 1) * dt);
        expect(m.omegaM).toBeLessThan(0);  // net negative torque pulls speed negative
    });
});

describe("PmsmMachine reset / fault host", () => {
    it("reset clears state including flux envelope", () => {
        const m = new PmsmMachine(REF_CFG);
        m.setPhaseVoltages(1, -0.5, -0.5);
        m.advance(1e-3);
        m.addFluxEnvelope(0.7);
        m.reset();
        expect(m.iD).toBe(0);
        expect(m.iQ).toBe(0);
        expect(m.omegaM).toBe(0);
        // After reset, addFluxEnvelope baseline is 1, so torque uses lambda_m alone.
        expect(m.electromagneticTorque()).toBeCloseTo(0, 12);
    });

    it("setPhaseResistance / setPhaseInductance store overrides without crashing (no-op in dq)", () => {
        const m = new PmsmMachine(REF_CFG);
        m.setPhaseResistance(0, 2.0);
        m.setPhaseInductance(1, 1e-3);
        m.setPhaseResistance(0, null);
        m.setPhaseVoltages(0, 0, 0);
        // Should run normally, no exception, no surprising behavior.
        m.advance(1e-3);
        expect(Number.isFinite(m.iD)).toBe(true);
        expect(Number.isFinite(m.iQ)).toBe(true);
    });
});
