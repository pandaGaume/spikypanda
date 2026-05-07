import { SvpwmModulator } from "spikypanda-sensors/sources/motor/pmsm/modulator";
import { ThreePhaseInverter } from "spikypanda-sensors/sources/motor/pmsm/inverter";
import { ThreePhaseTransforms } from "spikypanda-sensors/sources/motor/pmsm/control/transforms";

const V_BUS = 24;

function modulatorAndInverter() {
    const mod = new SvpwmModulator({ pwmFrequencyHz: 20_000 });
    mod.setVBus(V_BUS);
    const inv = new ThreePhaseInverter({ vBus: V_BUS });
    return { mod, inv };
}

describe("SvpwmModulator basics", () => {
    it("at zero reference, all three duties equal 0.5 (zero vector centered)", () => {
        const mod = new SvpwmModulator({ pwmFrequencyHz: 20_000 });
        mod.setVBus(V_BUS);
        mod.setReference(0, 0);
        mod.advance(0);
        const [a, b, c] = mod.duties();
        expect(a).toBeCloseTo(0.5, 12);
        expect(b).toBeCloseTo(0.5, 12);
        expect(c).toBeCloseTo(0.5, 12);
        expect(mod.saturated).toBe(false);
    });

    it("saturation flag set when |V_ref| exceeds V_bus / sqrt(3)", () => {
        const mod = new SvpwmModulator({ pwmFrequencyHz: 20_000 });
        mod.setVBus(V_BUS);
        const limit = V_BUS / Math.sqrt(3);
        mod.setReference(limit * 1.5, 0);
        mod.advance(0);
        expect(mod.saturated).toBe(true);
    });

    it("rejects invalid configuration", () => {
        expect(() => new SvpwmModulator({ pwmFrequencyHz: 0 })).toThrow();
        expect(() => new SvpwmModulator({ pwmFrequencyHz: 1, minDuty: 0.5, maxDuty: 0.5 })).toThrow();
    });
});

describe("ThreePhaseInverter basics", () => {
    it("with all duties 0.5, line-neutral voltages are zero", () => {
        const inv = new ThreePhaseInverter({ vBus: V_BUS });
        inv.setDuties(0.5, 0.5, 0.5);
        inv.advance(0);
        const [a, b, c] = inv.phaseVoltages();
        expect(a).toBeCloseTo(0, 12);
        expect(b).toBeCloseTo(0, 12);
        expect(c).toBeCloseTo(0, 12);
    });

    it("line-neutral voltages sum to zero by construction", () => {
        const inv = new ThreePhaseInverter({ vBus: V_BUS });
        inv.setDuties(0.7, 0.3, 0.5);
        inv.advance(0);
        const [a, b, c] = inv.phaseVoltages();
        expect(Math.abs(a + b + c)).toBeLessThan(1e-12);
    });

    it("rejects invalid vBus", () => {
        expect(() => new ThreePhaseInverter({ vBus: 0 })).toThrow();
        const inv = new ThreePhaseInverter({ vBus: V_BUS });
        expect(() => inv.setVBus(-1)).toThrow();
    });
});

describe("SVPWM + Inverter round-trip in the linear range", () => {
    // The cleanest, convention-independent test : in the linear range,
    // averaging the inverter line-neutral output over one PWM cycle and
    // applying Clarke must recover the requested (V_alpha_ref, V_beta_ref).
    // This test validates the chain end-to-end without forcing a specific
    // SVPWM scheme (7-segment vs 5-segment vs zero-sequence variant).
    it("recovers (V_alpha_ref, V_beta_ref) for a sweep of references", () => {
        const { mod, inv } = modulatorAndInverter();
        const limit = V_BUS / Math.sqrt(3);
        const refs: Array<[number, number]> = [
            [0, 0], [3, 0], [0, 5], [-4, 2], [7, -3], [-5, -5],
            [limit * 0.95, 0], [0, limit * 0.95],
        ];
        for (const [vAlphaRef, vBetaRef] of refs) {
            mod.setReference(vAlphaRef, vBetaRef);
            mod.advance(0);
            const [dA, dB, dC] = mod.duties();
            inv.setDuties(dA, dB, dC);
            inv.advance(0);
            const [vA, vB, vC] = inv.phaseVoltages();
            const [alpha, beta] = ThreePhaseTransforms.clarke(vA, vB, vC);
            expect(alpha).toBeCloseTo(vAlphaRef, 9);
            expect(beta).toBeCloseTo(vBetaRef, 9);
            expect(mod.saturated).toBe(false);
        }
    });

    it("clamps to the V_bus / sqrt(3) circle when the requested vector exceeds it", () => {
        const { mod, inv } = modulatorAndInverter();
        const limit = V_BUS / Math.sqrt(3);
        // Aim at 2x the radius along (1, 1) direction.
        const vAlphaRef = 2 * limit / Math.sqrt(2);
        const vBetaRef = 2 * limit / Math.sqrt(2);
        mod.setReference(vAlphaRef, vBetaRef);
        mod.advance(0);
        const [dA, dB, dC] = mod.duties();
        inv.setDuties(dA, dB, dC);
        inv.advance(0);
        const [vA, vB, vC] = inv.phaseVoltages();
        const [alpha, beta] = ThreePhaseTransforms.clarke(vA, vB, vC);
        const r = Math.sqrt(alpha * alpha + beta * beta);
        expect(r).toBeCloseTo(limit, 9);
        // Direction preserved.
        expect(alpha / r).toBeCloseTo(1 / Math.sqrt(2), 9);
        expect(beta / r).toBeCloseTo(1 / Math.sqrt(2), 9);
        expect(mod.saturated).toBe(true);
    });
});
