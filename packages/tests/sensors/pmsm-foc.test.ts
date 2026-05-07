import { PmsmMachine, IPmsmMachineConfig } from "spikypanda-sensors/sources/motor/pmsm/machine";
import { SvpwmModulator } from "spikypanda-sensors/sources/motor/pmsm/modulator";
import { ThreePhaseInverter } from "spikypanda-sensors/sources/motor/pmsm/inverter";
import { FocController } from "spikypanda-sensors/sources/motor/pmsm/control/FocController";

const V_BUS = 24;
const REF_CFG: IPmsmMachineConfig = {
    resistance: 1.0,
    inductanceD: 5e-4,
    inductanceQ: 5e-4,
    rotorFluxLinkage: 5e-3,
    polePairs: 1,
    rotorInertia: 1e-5,
    viscousFriction: 1e-5,
    nominalSpeedRps: 50,
};

// Build a minimal closed-loop : FOC -> SVPWM -> Inverter -> Machine,
// driven by the test loop. Returns a stepper that advances all four
// nodes by one orchestrator step.
function buildLoop(target: { omegaRefRps: number; loadTorque?: number }) {
    const machine = new PmsmMachine({ ...REF_CFG, loadTorque: target.loadTorque ?? 0 });

    // Tuning : current loop bandwidth ~ 1 kHz.
    const omegaBwI = 2 * Math.PI * 1000;
    const currentKp = omegaBwI * REF_CFG.inductanceD;
    const currentKi = omegaBwI * REF_CFG.resistance;
    // Speed loop bandwidth ~ 100 Hz, kt = (3/2) * p * lambda_m.
    const omegaBwW = 2 * Math.PI * 100;
    const kt = 1.5 * REF_CFG.polePairs * REF_CFG.rotorFluxLinkage;
    const speedKp = (omegaBwW * REF_CFG.rotorInertia) / kt;
    const speedKi = (omegaBwW * REF_CFG.viscousFriction) / kt;

    const foc = new FocController({
        speedKp, speedKi,
        currentKp, currentKi,
        iMax: 5,
        vMaxPerAxis: V_BUS / 2,
        vBusForSat: V_BUS,
    });
    foc.setSpeedTarget(2 * Math.PI * target.omegaRefRps);

    const mod = new SvpwmModulator({ pwmFrequencyHz: 20_000 });
    mod.setVBus(V_BUS);

    const inv = new ThreePhaseInverter({ vBus: V_BUS });

    function step(t: number) {
        // Feedback : machine state straight into the controller (Phase 1
        // simplification, no measurement noise).
        foc.setFeedback(machine.iD, machine.iQ, machine.omegaM, machine.thetaE);
        foc.advance(t);
        const [vAlphaRef, vBetaRef] = foc.references();

        mod.setReference(vAlphaRef, vBetaRef);
        mod.advance(t);
        const [dA, dB, dC] = mod.duties();

        inv.setDuties(dA, dB, dC);
        inv.advance(t);
        const [vA, vB, vC] = inv.phaseVoltages();

        machine.setPhaseVoltages(vA, vB, vC);
        machine.advance(t);
    }

    return { machine, foc, mod, inv, step };
}

describe("FOC closed loop", () => {
    it("reaches a positive speed target with a moderate load", () => {
        const targetRps = 30;
        const { machine, step } = buildLoop({ omegaRefRps: targetRps, loadTorque: 1e-4 });

        const dt = 5e-5;
        const tEnd = 0.5;
        const omegaTrace: number[] = [];
        for (let i = 1; i * dt <= tEnd; i++) {
            step(i * dt);
            if (i % 200 === 0) omegaTrace.push(machine.omegaM);
        }

        const omegaTarget = 2 * Math.PI * targetRps;
        const omegaFinal = machine.omegaM;
        // Steady-state error within 1% of target.
        expect(Math.abs(omegaFinal - omegaTarget) / omegaTarget).toBeLessThan(0.01);
        // omega trace is monotone-ish toward target (no oscillation > 30%).
        const overshoot = Math.max(...omegaTrace) - omegaTarget;
        expect(overshoot / omegaTarget).toBeLessThan(0.3);
    });

    it("rejects a step load disturbance and recovers speed", () => {
        const targetRps = 30;
        const { machine, step } = buildLoop({ omegaRefRps: targetRps });

        const dt = 5e-5;
        // Phase 1 : run to steady state.
        for (let i = 1; i <= 0.4 / dt; i++) step(i * dt);
        const omegaBefore = machine.omegaM;
        // Phase 2 : impose a step load.
        machine.setLoadTorque(2e-4);
        for (let i = 1; i <= 0.4 / dt; i++) step((0.4 + i * dt));
        const omegaAfter = machine.omegaM;
        const omegaTarget = 2 * Math.PI * targetRps;

        // Recovers within 2% of target despite the step disturbance.
        expect(Math.abs(omegaAfter - omegaTarget) / omegaTarget).toBeLessThan(0.02);
        // The before-steady-state was also within 2%.
        expect(Math.abs(omegaBefore - omegaTarget) / omegaTarget).toBeLessThan(0.02);
    });

    it("at steady state, i_d remains close to its reference (default 0)", () => {
        const targetRps = 30;
        const { machine, step } = buildLoop({ omegaRefRps: targetRps });

        const dt = 5e-5;
        for (let i = 1; i <= 0.5 / dt; i++) step(i * dt);

        // i_q is whatever the speed loop demands; i_d should be near 0 (SPM,
        // no field weakening). Threshold absolute since rated current is
        // small.
        expect(Math.abs(machine.iD)).toBeLessThan(0.1);
    });

    it("reset returns the controller to a clean state", () => {
        const { foc } = buildLoop({ omegaRefRps: 30 });
        foc.setFeedback(0.5, 0.5, 100, 1.0);
        foc.advance(0.001);
        foc.reset();
        // After reset, references are back to zero.
        const [a, b] = foc.references();
        expect(a).toBe(0);
        expect(b).toBe(0);
    });
});
