/**
 * Physical coherence of the LIBS forward model (experiment E1 of the
 * brief), run against the pure engine with no graph in the way.
 *
 * What each section proves:
 *   1. Profiles are area-normalised and reduce to their limits, so an
 *      intensity means the same thing at any width.
 *   2. A catalogue line lands at its own wavelength, to a fraction of a
 *      pixel.
 *   3. The instrument broadens without moving the centre. This is the
 *      test that forced the engine to fold the slit function into the
 *      line's Gaussian width instead of smoothing a sampled curve.
 *   4. Widths respond to temperature and electron density the way the
 *      formulas say, and not otherwise.
 *   5. In relative mode the chain is linear, so contributions
 *      superpose.
 *   6. Noise is reproducible from its seed, and separable from the
 *      signal.
 *   7. The physical model refuses to run on an unverified catalogue,
 *      and says what is missing.
 */
import {
    accumulateLines,
    BUILTIN_LINE_CATALOGUE,
    buildWavelengthGrid,
    collisionalFwhmNm,
    computeLineEmissions,
    DEFAULT_INSTRUMENT_PARAMETERS,
    DEFAULT_PLASMA_PARAMETERS,
    dopplerFwhmNm,
    gaussian,
    linesOfElement,
    lorentzian,
    physicalModeBlocker,
    pseudoVoigt,
    pseudoVoigtFwhm,
    simulateLibsSpectrum,
    simulationIdOf,
} from "../../dev/plugins/spectroscopy/src";
import type { IInstrumentParameters, IPlasmaParameters } from "../../dev/plugins/spectroscopy/src";

// ── helpers ──────────────────────────────────────────────────────────

/** Peak position [nm] by parabolic interpolation around the top pixel. */
function peakWavelength(grid: Float64Array, y: Float32Array | ArrayLike<number>): number {
    let best = 0;
    for (let i = 1; i < grid.length; i++) if (y[i] > y[best]) best = i;
    if (best === 0 || best === grid.length - 1) return grid[best];
    const yl = y[best - 1];
    const y0 = y[best];
    const yr = y[best + 1];
    const denom = yl - 2 * y0 + yr;
    const delta = denom !== 0 ? (0.5 * (yl - yr)) / denom : 0;
    const step = (grid[grid.length - 1] - grid[0]) / (grid.length - 1);
    return grid[best] + delta * step;
}

/** FWHM [nm] of a single-peak curve, by half-maximum crossings. */
function fwhmOf(grid: Float64Array, y: Float32Array | ArrayLike<number>, baseline = 0): number {
    let best = 0;
    for (let i = 1; i < grid.length; i++) if (y[i] > y[best]) best = i;
    const half = baseline + (y[best] - baseline) / 2;
    const cross = (from: number, dir: number): number => {
        for (let i = from; i >= 0 && i < grid.length; i += dir) {
            if (y[i] <= half) {
                const i2 = i - dir;
                const t = (half - y[i]) / (y[i2] - y[i]);
                return grid[i] + t * (grid[i2] - grid[i]);
            }
        }
        return grid[dir > 0 ? grid.length - 1 : 0];
    };
    return cross(best, 1) - cross(best, -1);
}

/** Trapezoidal area under a curve. */
function areaOf(grid: Float64Array, y: Float32Array | ArrayLike<number>): number {
    let a = 0;
    for (let i = 1; i < grid.length; i++) a += ((y[i] + y[i - 1]) / 2) * (grid[i] - grid[i - 1]);
    return a;
}

const narrowInstrument = (over: Partial<IInstrumentParameters> = {}): IInstrumentParameters =>
    Object.freeze({ ...DEFAULT_INSTRUMENT_PARAMETERS, rangeStartNm: 421, rangeEndNm: 424, pixelCount: 6001, resolutionFwhmNm: 0, ...over });

const plasma = (over: Partial<IPlasmaParameters> = {}): IPlasmaParameters => Object.freeze({ ...DEFAULT_PLASMA_PARAMETERS, ...over });

// ─────────────────────────────────────────────────────────────────────
// 1. Profiles
// ─────────────────────────────────────────────────────────────────────

describe("line profiles", () => {
    it("are area-normalised", () => {
        const grid = buildWavelengthGrid(narrowInstrument({ rangeStartNm: 420, rangeEndNm: 426, pixelCount: 60001 }));
        const centre = 423;
        const g = Float32Array.from(grid, (x) => gaussian(x - centre, 0.05));
        const l = Float32Array.from(grid, (x) => lorentzian(x - centre, 0.05));
        const v = Float32Array.from(grid, (x) => pseudoVoigt(x - centre, 0.05, 0.03));
        expect(areaOf(grid, g)).toBeCloseTo(1, 4);
        // A Lorentzian has heavy tails: on a finite window it loses a
        // few percent, which is itself worth knowing.
        expect(areaOf(grid, l)).toBeGreaterThan(0.97);
        expect(areaOf(grid, v)).toBeGreaterThan(0.97);
        expect(areaOf(grid, v)).toBeLessThan(1.01);
    });

    it("reduce to their limits", () => {
        const grid = buildWavelengthGrid(narrowInstrument({ pixelCount: 30001 }));
        const centre = 422.5;

        const pureG = Float32Array.from(grid, (x) => pseudoVoigt(x - centre, 0.08, 0));
        expect(fwhmOf(grid, pureG)).toBeCloseTo(0.08, 3);

        const pureL = Float32Array.from(grid, (x) => pseudoVoigt(x - centre, 0, 0.08));
        expect(fwhmOf(grid, pureL)).toBeCloseTo(0.08, 3);

        // Mixed: the total width is the Thompson-Cox-Hastings one, and
        // it sits between the larger input and their sum.
        const fG = 0.06;
        const fL = 0.04;
        const total = pseudoVoigtFwhm(fG, fL);
        expect(total).toBeGreaterThan(Math.max(fG, fL));
        expect(total).toBeLessThan(fG + fL);
        const mixed = Float32Array.from(grid, (x) => pseudoVoigt(x - centre, fG, fL));
        expect(fwhmOf(grid, mixed)).toBeCloseTo(total, 2);
    });

    it("keep a line's area proportional to its intensity, whatever the width", () => {
        const instrument = narrowInstrument({ pixelCount: 30001 });
        const grid = buildWavelengthGrid(instrument);
        const emission = [{ element: "Ca", species: "Ca I", wavelengthNm: 422.67, intensity: 2, dopplerFwhmNm: 0.01, provenance: "test" }];
        const narrow = accumulateLines(grid, emission, 0.01, 0);
        const wide = accumulateLines(grid, emission, 0.2, 0);
        // Same area, very different peak height: that is what
        // normalisation buys, and it is why intensity can be compared
        // across plasma states.
        expect(areaOf(grid, narrow)).toBeCloseTo(2, 1);
        expect(areaOf(grid, wide)).toBeGreaterThan(1.8);
        expect(Math.max(...narrow)).toBeGreaterThan(Math.max(...wide) * 3);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Line position
// ─────────────────────────────────────────────────────────────────────

describe("line position", () => {
    it("puts a catalogue line at its own wavelength", () => {
        const instrument = narrowInstrument();
        const sim = simulateLibsSpectrum({
            atomFractions: { Ca: 1 },
            catalogue: linesOfElement(BUILTIN_LINE_CATALOGUE, "Ca", 0).filter((l) => l.wavelengthNm > 421 && l.wavelengthNm < 424),
            plasma: plasma(),
            instrument,
        });
        expect(sim.lines).toHaveLength(1);
        const step = (instrument.rangeEndNm - instrument.rangeStartNm) / (instrument.pixelCount - 1);
        expect(Math.abs(peakWavelength(sim.wavelengthNm, sim.ideal) - 422.67)).toBeLessThan(step);
    });

    it("displaces the MEASURED peak by the calibration error, and leaves the ideal one alone", () => {
        const catalogue = linesOfElement(BUILTIN_LINE_CATALOGUE, "Ca", 0).filter((l) => l.wavelengthNm > 421 && l.wavelengthNm < 424);
        const base = simulateLibsSpectrum({ atomFractions: { Ca: 1 }, catalogue, plasma: plasma(), instrument: narrowInstrument({ resolutionFwhmNm: 0.05 }) });
        const shifted = simulateLibsSpectrum({
            atomFractions: { Ca: 1 },
            catalogue,
            plasma: plasma(),
            instrument: narrowInstrument({ resolutionFwhmNm: 0.05, calibrationShiftNm: 0.1 }),
        });

        // A calibration error is the instrument misnaming its pixels:
        // the reported line moves, the physics does not.
        expect(peakWavelength(shifted.wavelengthNm, shifted.instrumented) - peakWavelength(base.wavelengthNm, base.instrumented)).toBeCloseTo(0.1, 3);
        expect(peakWavelength(shifted.wavelengthNm, shifted.ideal)).toBeCloseTo(peakWavelength(base.wavelengthNm, base.ideal), 6);
        // Which is exactly what makes the ideal / measured overlay a
        // readout of the calibration error.
        expect(peakWavelength(shifted.wavelengthNm, shifted.instrumented) - peakWavelength(shifted.wavelengthNm, shifted.ideal)).toBeCloseTo(0.1, 3);
    });

    it("emits one curve point per pixel and keeps the axis monotonic", () => {
        const sim = simulateLibsSpectrum({ atomFractions: { Ca: 1 }, catalogue: BUILTIN_LINE_CATALOGUE, plasma: plasma(), instrument: DEFAULT_INSTRUMENT_PARAMETERS });
        expect(sim.wavelengthNm).toHaveLength(DEFAULT_INSTRUMENT_PARAMETERS.pixelCount);
        expect(sim.measured).toHaveLength(DEFAULT_INSTRUMENT_PARAMETERS.pixelCount);
        for (let i = 1; i < sim.wavelengthNm.length; i++) expect(sim.wavelengthNm[i]).toBeGreaterThan(sim.wavelengthNm[i - 1]);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. The instrument broadens, it does not move
// ─────────────────────────────────────────────────────────────────────

describe("instrument response", () => {
    const catalogue = linesOfElement(BUILTIN_LINE_CATALOGUE, "Ca", 0).filter((l) => l.wavelengthNm > 421 && l.wavelengthNm < 424);

    it("widens the line without displacing its centre", () => {
        const sharp = simulateLibsSpectrum({ atomFractions: { Ca: 1 }, catalogue, plasma: plasma({ collisionalWidthNm: 0.005 }), instrument: narrowInstrument({ resolutionFwhmNm: 0 }) });
        const blurred = simulateLibsSpectrum({ atomFractions: { Ca: 1 }, catalogue, plasma: plasma({ collisionalWidthNm: 0.005 }), instrument: narrowInstrument({ resolutionFwhmNm: 0.1 }) });

        const wSharp = fwhmOf(sharp.wavelengthNm, sharp.ideal, DEFAULT_PLASMA_PARAMETERS.continuumLevel);
        const wBlurred = fwhmOf(blurred.wavelengthNm, blurred.instrumented, DEFAULT_PLASMA_PARAMETERS.continuumLevel);
        expect(wBlurred).toBeGreaterThan(wSharp * 2);

        const cSharp = peakWavelength(sharp.wavelengthNm, sharp.ideal);
        const cBlurred = peakWavelength(blurred.wavelengthNm, blurred.instrumented);
        const step = 3 / 6000;
        expect(Math.abs(cBlurred - cSharp)).toBeLessThan(step / 2);
    });

    it("conserves the line's area through the slit function", () => {
        const sharp = simulateLibsSpectrum({ atomFractions: { Ca: 1 }, catalogue, plasma: plasma({ continuumLevel: 0 }), instrument: narrowInstrument({ resolutionFwhmNm: 0 }) });
        const blurred = simulateLibsSpectrum({ atomFractions: { Ca: 1 }, catalogue, plasma: plasma({ continuumLevel: 0 }), instrument: narrowInstrument({ resolutionFwhmNm: 0.1 }) });
        const a1 = areaOf(sharp.wavelengthNm, sharp.ideal);
        const a2 = areaOf(blurred.wavelengthNm, blurred.instrumented);
        expect(a2 / a1).toBeCloseTo(1, 1);
    });

    it("applies gain and offset to the instrumented curve only", () => {
        const sim = simulateLibsSpectrum({
            atomFractions: { Ca: 1 },
            catalogue,
            plasma: plasma({ continuumLevel: 1 }),
            instrument: narrowInstrument({ resolutionFwhmNm: 0.05, gain: 3, offset: 10 }),
        });
        // Far from the line, ideal is the bare continuum and
        // instrumented is continuum x gain + offset.
        expect(sim.ideal[0]).toBeCloseTo(1, 6);
        expect(sim.instrumented[0]).toBeCloseTo(13, 5);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Widths follow the plasma state
// ─────────────────────────────────────────────────────────────────────

describe("plasma state drives the widths", () => {
    it("scales the Doppler width as the square root of temperature", () => {
        const w1 = dopplerFwhmNm(422.67, 5000, 40.078e-3);
        const w2 = dopplerFwhmNm(422.67, 20000, 40.078e-3);
        expect(w2 / w1).toBeCloseTo(2, 6);
    });

    it("gives a lighter atom a wider Doppler profile", () => {
        const hydrogen = dopplerFwhmNm(500, 10000, 1.008e-3);
        const iron = dopplerFwhmNm(500, 10000, 55.845e-3);
        expect(hydrogen / iron).toBeCloseTo(Math.sqrt(55.845 / 1.008), 4);
    });

    it("returns zero width for a degenerate state rather than a NaN", () => {
        expect(dopplerFwhmNm(500, 0, 55.845e-3)).toBe(0);
        expect(dopplerFwhmNm(500, 10000, 0)).toBe(0);
    });

    it("scales the collisional width linearly with electron density", () => {
        const p = plasma({ collisionalWidthNm: 0.04, referenceElectronDensityCm3: 1e17 });
        expect(collisionalFwhmNm({ ...p, electronDensityCm3: 1e17 })).toBeCloseTo(0.04, 12);
        expect(collisionalFwhmNm({ ...p, electronDensityCm3: 5e16 })).toBeCloseTo(0.02, 12);
        expect(collisionalFwhmNm({ ...p, electronDensityCm3: 0 })).toBe(0);
    });

    it("has no temperature dependence on INTENSITY in relative mode, and says so", () => {
        const cold = computeLineEmissions({ Ca: 1 }, BUILTIN_LINE_CATALOGUE, plasma({ temperatureK: 6000 }));
        const hot = computeLineEmissions({ Ca: 1 }, BUILTIN_LINE_CATALOGUE, plasma({ temperatureK: 14000 }));
        const iCold = cold.lines.map((l) => l.intensity);
        const iHot = hot.lines.map((l) => l.intensity);
        expect(iHot).toEqual(iCold);
        // The widths, however, did change.
        expect(hot.lines[0].dopplerFwhmNm).toBeGreaterThan(cold.lines[0].dopplerFwhmNm);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Linearity
// ─────────────────────────────────────────────────────────────────────

describe("superposition in relative mode", () => {
    const instrument = narrowInstrument({ rangeStartNm: 280, rangeEndNm: 300, pixelCount: 4001, resolutionFwhmNm: 0.05 });
    const common = { catalogue: BUILTIN_LINE_CATALOGUE, plasma: plasma({ continuumLevel: 0 }), instrument };

    it("adds the contributions of two elements", () => {
        const si = simulateLibsSpectrum({ ...common, atomFractions: { Si: 0.5 } });
        const mg = simulateLibsSpectrum({ ...common, atomFractions: { Mg: 0.5 } });
        const both = simulateLibsSpectrum({ ...common, atomFractions: { Si: 0.5, Mg: 0.5 } });
        for (let i = 0; i < both.ideal.length; i += 37) {
            expect(both.ideal[i]).toBeCloseTo(si.ideal[i] + mg.ideal[i], 5);
        }
    });

    it("scales a line's amplitude with the element's atom fraction", () => {
        const half = simulateLibsSpectrum({ ...common, atomFractions: { Si: 0.5 } });
        const tenth = simulateLibsSpectrum({ ...common, atomFractions: { Si: 0.1 } });
        const peakHalf = Math.max(...half.ideal);
        const peakTenth = Math.max(...tenth.ideal);
        expect(peakHalf / peakTenth).toBeCloseTo(5, 3);
    });

    it("reports elements the catalogue cannot emit instead of dropping them", () => {
        const r = computeLineEmissions({ Zr: 0.5, Ca: 0.5 }, BUILTIN_LINE_CATALOGUE, plasma());
        expect(r.missingElements).toEqual(["Zr"]);
        expect(r.lines.every((l) => l.element === "Ca")).toBe(true);
    });

    it("ignores an element with a zero fraction", () => {
        const r = computeLineEmissions({ Ca: 0, Fe: 1 }, BUILTIN_LINE_CATALOGUE, plasma());
        expect(r.lines.every((l) => l.element === "Fe")).toBe(true);
        expect(r.missingElements).toEqual([]);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 6. Noise
// ─────────────────────────────────────────────────────────────────────

describe("noise", () => {
    const base = {
        atomFractions: { Ca: 1 },
        catalogue: BUILTIN_LINE_CATALOGUE,
        plasma: plasma({ continuumLevel: 1 }),
    };

    it("is exactly zero when disabled, and measured equals instrumented", () => {
        const sim = simulateLibsSpectrum({ ...base, instrument: narrowInstrument({ noiseEnabled: false }) });
        expect(Array.from(sim.noise).every((v) => v === 0)).toBe(true);
        expect(Array.from(sim.measured)).toEqual(Array.from(sim.instrumented));
    });

    it("is reproducible from its seed", () => {
        const a = simulateLibsSpectrum({ ...base, instrument: narrowInstrument({ noiseEnabled: true, seed: 7 }) });
        const b = simulateLibsSpectrum({ ...base, instrument: narrowInstrument({ noiseEnabled: true, seed: 7 }) });
        const c = simulateLibsSpectrum({ ...base, instrument: narrowInstrument({ noiseEnabled: true, seed: 8 }) });
        expect(Array.from(a.noise)).toEqual(Array.from(b.noise));
        expect(Array.from(a.noise)).not.toEqual(Array.from(c.noise));
    });

    it("stays separable: measured minus noise is the instrumented curve", () => {
        const sim = simulateLibsSpectrum({ ...base, instrument: narrowInstrument({ noiseEnabled: true, seed: 3, readNoise: 0.05 }) });
        for (let i = 0; i < sim.measured.length; i += 11) {
            expect(sim.measured[i] - sim.noise[i]).toBeCloseTo(sim.instrumented[i], 5);
        }
    });

    it("grows with the signal, which is what shot noise means", () => {
        const faint = simulateLibsSpectrum({
            ...base,
            plasma: plasma({ continuumLevel: 1, intensityScale: 1 }),
            instrument: narrowInstrument({ noiseEnabled: true, seed: 5, readNoise: 0, shotNoiseFactor: 0.05 }),
        });
        const bright = simulateLibsSpectrum({
            ...base,
            plasma: plasma({ continuumLevel: 100, intensityScale: 1 }),
            instrument: narrowInstrument({ noiseEnabled: true, seed: 5, readNoise: 0, shotNoiseFactor: 0.05 }),
        });
        const rms = (v: Float32Array): number => Math.sqrt(Array.from(v).reduce((s, x) => s + x * x, 0) / v.length);
        expect(rms(bright.noise)).toBeGreaterThan(rms(faint.noise) * 5);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 7. The physical model refuses rather than guesses
// ─────────────────────────────────────────────────────────────────────

describe("physical mode", () => {
    it("is blocked by the built-in catalogue, with the reason", () => {
        const blocker = physicalModeBlocker(BUILTIN_LINE_CATALOGUE);
        expect(blocker).toMatch(/unverified/);
        expect(blocker).toMatch(/NIST/);
    });

    it("produces no line and carries the blocker into the simulation", () => {
        const sim = simulateLibsSpectrum({
            atomFractions: { Ca: 1 },
            catalogue: BUILTIN_LINE_CATALOGUE,
            plasma: plasma({ emissionModel: "physical", continuumLevel: 0 }),
            instrument: narrowInstrument(),
        });
        // Two refusals are possible and both are correct: no level data
        // at all (the case here, since no physical data set is passed),
        // or a catalogue whose lines are unverified.
        expect(sim.blocker).toMatch(/no level data|unverified/);
        expect(sim.lines).toEqual([]);
        expect(Math.max(...sim.ideal)).toBe(0);
    });

    it("refuses a catalogue that is verified but incomplete", () => {
        const verifiedButBare = [{ element: "Ca", ionisation: 0 as const, wavelengthNm: 422.67, relativeStrength: 1, verified: true, provenance: "test" }];
        expect(physicalModeBlocker(verifiedButBare)).toMatch(/lack transitionProbability/);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 8. Traceability
// ─────────────────────────────────────────────────────────────────────

describe("simulation identity", () => {
    it("changes when anything that shaped the spectrum changes", () => {
        const common = { catalogue: BUILTIN_LINE_CATALOGUE, instrument: narrowInstrument() };
        const a = simulateLibsSpectrum({ ...common, atomFractions: { Ca: 1 }, plasma: plasma() });
        const b = simulateLibsSpectrum({ ...common, atomFractions: { Ca: 1 }, plasma: plasma() });
        const c = simulateLibsSpectrum({ ...common, atomFractions: { Ca: 0.9, Mg: 0.1 }, plasma: plasma() });
        const d = simulateLibsSpectrum({ ...common, atomFractions: { Ca: 1 }, plasma: plasma({ temperatureK: 12000 }) });
        const e = simulateLibsSpectrum({ ...common, atomFractions: { Ca: 1 }, plasma: plasma(), provenance: "sample 42" });

        expect(a.simulationId).toBe(b.simulationId);
        expect(c.simulationId).not.toBe(a.simulationId);
        expect(d.simulationId).not.toBe(a.simulationId);
        expect(e.simulationId).not.toBe(a.simulationId);
        expect(a.simulationId).toMatch(/^[0-9a-f]{8}$/);
    });

    it("hashes deterministically", () => {
        expect(simulationIdOf("abc")).toBe(simulationIdOf("abc"));
        expect(simulationIdOf("abc")).not.toBe(simulationIdOf("abd"));
    });
});
