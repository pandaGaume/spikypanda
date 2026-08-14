/**
 * ISO.Severity:iso20816 — the pure numerics against analytic oracles, the
 * refuse-not-guess guards, and the node's tensor->verdict path.
 *
 * Oracle: for a pure sine at an exact FFT bin, the broadband velocity RMS is
 * known in closed form. A velocity sine of amplitude A (mm/s) has RMS A/sqrt(2).
 * An acceleration sine of amplitude A (m/s^2) at frequency f integrates to a
 * velocity of amplitude A/(2*pi*f) (m/s), so RMS = A/(2*pi*f)/sqrt(2) * 1000 mm/s.
 */
import type { ITensor, IUnitTag } from "spikypanda-core";
import { assessSeverity, classifyZone, broadbandVelocityRmsMmS } from "../../dev/plugins/iso/src/severity/iso20816";
import { Iso20816SeverityNode } from "../../dev/plugins/iso/src/severity/iso20816.node";

const FS = 4096;
const N = 4096; // power of two -> no padding, exact RMS; f in Hz maps to bin f (fs=N)

function sine(ampl: number, freqHz: number, fs = FS, n = N): Float32Array {
    const x = new Float32Array(n);
    for (let i = 0; i < n; i++) x[i] = ampl * Math.sin((2 * Math.PI * freqHz * i) / fs);
    return x;
}

const RIGID2 = { group: 2 as const, support: "rigid" as const };

describe("classifyZone (<= belongs to the lower zone)", () => {
    it("respects the group-2 rigid boundaries [1.4, 2.8, 4.5]", () => {
        expect(classifyZone(1.4, 2, "rigid")).toBe("A"); // boundary -> lower zone
        expect(classifyZone(1.41, 2, "rigid")).toBe("B");
        expect(classifyZone(2.8, 2, "rigid")).toBe("B");
        expect(classifyZone(4.5, 2, "rigid")).toBe("C");
        expect(classifyZone(4.6, 2, "rigid")).toBe("D");
    });
    it("uses the group-1 flexible boundaries [3.5, 7.1, 11.0]", () => {
        expect(classifyZone(3.5, 1, "flexible")).toBe("A");
        expect(classifyZone(11.0, 1, "flexible")).toBe("C");
        expect(classifyZone(11.1, 1, "flexible")).toBe("D");
    });
});

describe("broadband velocity RMS (analytic oracle)", () => {
    it("velocity sine A mm/s -> RMS A/sqrt(2)", () => {
        const tag: IUnitTag = { quantity: "Speed", unit: "mmps", sampleRateHz: FS };
        const { rms } = broadbandVelocityRmsMmS(sine(2, 100), tag);
        expect(rms).toBeCloseTo(2 / Math.SQRT2, 2); // ~1.4142 mm/s
    });
    it("acceleration sine A m/s^2 -> velocity RMS A/(2 pi f)/sqrt(2) * 1000", () => {
        const A = 5;
        const f = 100;
        const tag: IUnitTag = { quantity: "Acceleration", unit: "mps2", sampleRateHz: FS };
        const { rms } = broadbandVelocityRmsMmS(sine(A, f), tag);
        const expected = (A / (2 * Math.PI * f) / Math.SQRT2) * 1000; // ~5.627 mm/s
        expect(rms).toBeCloseTo(expected, 1);
    });
    it("the g unit is converted to m/s^2 before integration", () => {
        const A = 0.5; // g
        const f = 100;
        const tag: IUnitTag = { quantity: "Acceleration", unit: "g", sampleRateHz: FS };
        const { rms } = broadbandVelocityRmsMmS(sine(A, f), tag);
        const expected = ((A * 9.80665) / (2 * Math.PI * f) / Math.SQRT2) * 1000;
        expect(rms).toBeCloseTo(expected, 1);
    });
});

describe("assessSeverity verdict + zone", () => {
    it("grades a velocity sine into the right ISO zone with provenance", () => {
        const tag: IUnitTag = { quantity: "Speed", unit: "mmps", sampleRateHz: FS };
        const v = assessSeverity(sine(2, 100), tag, RIGID2); // ~1.414 mm/s -> B (1.4 < 1.414 <= 2.8)
        expect(v.status).toBe("assessed");
        expect(v.zone).toBe("B");
        expect(v.rmsVelocityMmS).toBeCloseTo(2 / Math.SQRT2, 2);
        expect(v.frequencyRangeHz).toEqual([10, Math.min(1000, 0.95 * (FS / 2))]);
        // structured provenance on every graded output
        expect(v.provenance).toBeDefined();
        expect(v.provenance!.kind).toBe("standard");
        expect(v.provenance!.source).toBe("ISO 20816-3");
        expect(v.provenance!.version).toContain("supersedes");
        expect(v.provenance!.basis).toContain("group 2");
        expect(v.provenance!.note).toContain("ISO 20816-3:2022");
    });
});

describe("refuse, never guess", () => {
    const okTag: IUnitTag = { quantity: "Speed", unit: "mmps", sampleRateHz: FS };
    const data = sine(2, 100);
    it("refuses when the unit is undeclared", () => {
        const v = assessSeverity(data, undefined, RIGID2);
        expect(v.status).toBe("refused");
        expect(v.reason).toMatch(/unit/i);
    });
    it("refuses a non-vibration quantity", () => {
        const v = assessSeverity(data, { quantity: "Current", unit: "amp", sampleRateHz: FS }, RIGID2);
        expect(v.status).toBe("refused");
        expect(v.reason).toMatch(/Current|gradable/);
    });
    it("refuses an unknown unit key", () => {
        const v = assessSeverity(data, { quantity: "Speed", unit: "nope", sampleRateHz: FS }, RIGID2);
        expect(v.status).toBe("refused");
        expect(v.reason).toMatch(/unknown/i);
    });
    it("refuses when the sample rate cannot cover the 10-1000 Hz band", () => {
        const v = assessSeverity(data, { quantity: "Acceleration", unit: "mps2", sampleRateHz: 1000 }, RIGID2);
        expect(v.status).toBe("refused");
        expect(v.reason).toMatch(/sample rate too low|band/i);
    });
    it("refuses a machine below the 15 kW ISO scope floor", () => {
        const v = assessSeverity(data, okTag, { ...RIGID2, powerKw: 5 });
        expect(v.status).toBe("refused");
        expect(v.reason).toMatch(/15 kW/);
    });
    it("refuses a signal that is too short", () => {
        const v = assessSeverity(new Float32Array(32), okTag, RIGID2);
        expect(v.status).toBe("refused");
        expect(v.reason).toMatch(/too short/);
    });
});

describe("Iso20816SeverityNode.assess (tensor -> verdict path)", () => {
    it("reads the tensor unit tag and grades", () => {
        const node = new Iso20816SeverityNode(); // default group 2, rigid
        const tensor = {
            data: sine(2, 100),
            shape: [N],
            unit: { quantity: "Speed", unit: "mmps", sampleRateHz: FS },
        } as ITensor;
        const v = node.assess(tensor);
        expect(v.status).toBe("assessed");
        expect(v.zone).toBe("B");
    });
    it("refuses an untagged tensor (the unit-tag guard, through the node)", () => {
        const node = new Iso20816SeverityNode();
        const tensor = { data: sine(2, 100), shape: [N] } as ITensor; // no unit
        const v = node.assess(tensor);
        expect(v.status).toBe("refused");
        expect(v.reason).toMatch(/unit/i);
    });
});
