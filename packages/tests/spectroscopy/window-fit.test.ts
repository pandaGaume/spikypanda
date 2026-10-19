/**
 * Fitting a window, tested by fitting what the model drew.
 *
 * Every test builds a window with the forward model at a known offset,
 * width, amplitude and continuum, hands it over, and checks the four
 * come back. That is the only honest test of a fit: on a real spectrum
 * the truth is what is being looked for.
 *
 * The cases that matter are the ones where a fit can be confidently
 * wrong: a blend of two lines, a window whose line is weaker than its
 * noise, and the trade between amplitude and width that makes a
 * four-parameter optimiser wander. The amplitude here is solved exactly
 * rather than searched, so the last of those cannot happen, and the
 * test that shows it is `holds the amplitude against a wrong width`.
 */
import { accumulateLines, buildWavelengthGrid, fitLinearTrend, fitWindow, makeRandom } from "../../dev/plugins/spectroscopy/src";
import type { ILineEmission, IInstrumentParameters } from "../../dev/plugins/spectroscopy/src";

const INSTRUMENT = (start: number, end: number, points: number): IInstrumentParameters => ({
    rangeStartNm: start,
    rangeEndNm: end,
    pixelCount: points,
    resolutionFwhmNm: 0,
    calibrationShiftNm: 0,
    gain: 1,
    offset: 0,
    noiseEnabled: false,
    shotNoiseFactor: 0,
    readNoise: 0,
    seed: 1,
});

const line = (wavelengthNm: number, intensity: number, dopplerFwhmNm = 0.004): ILineEmission => ({
    element: "Ca",
    species: "Ca II",
    wavelengthNm,
    intensity,
    dopplerFwhmNm,
    provenance: "test",
});

/** A window the model drew, at a known truth. */
function drawn(lines: ILineEmission[], truth: { offsetNm: number; fwhmNm: number; scale: number; continuum: number; lorentzNm?: number }, start = 393, end = 394, points = 501) {
    const grid = buildWavelengthGrid(INSTRUMENT(start, end, points));
    const profile = accumulateLines(grid, lines, truth.lorentzNm ?? 0, truth.fwhmNm, truth.offsetNm);
    const measured = Array.from(profile, (v) => truth.scale * v + truth.continuum);
    return { grid, measured };
}

describe("fitWindow, against windows the model drew", () => {
    const TRUTH = { offsetNm: 0.012, fwhmNm: 0.09, scale: 4.2e5, continuum: 1200 };

    it("recovers all four parameters from one line", () => {
        const lines = [line(393.366, 1)];
        const { grid, measured } = drawn(lines, TRUTH);
        const fit = fitWindow(grid, measured, lines);

        expect(fit.blocker).toBeNull();
        // Within one step of the search, which the three passes bring
        // to 0.59 pm: thirty times finer than the 20 pm grid a real
        // instrument samples on.
        expect(Math.abs(fit.offsetNm - TRUTH.offsetNm)).toBeLessThan(6e-4);
        expect(fit.instrumentalFwhmNm).toBeCloseTo(TRUTH.fwhmNm, 3);
        // The amplitude inherits the width's half-step error, since the
        // two together carry the line's area: one part in a thousand.
        expect(Math.abs(fit.scale / TRUTH.scale - 1)).toBeLessThan(2e-3);
        // What is left on a noiseless window the fit drew itself:
        // 0.14 % of the peak, set by the half-step errors in offset and
        // width above. Thirty-five times below M5's five per cent.
        expect(fit.residualShareOfPeak).toBeLessThan(2e-3);
    });

    it("does not determine the continuum under a strong line, and that is the point of M5", () => {
        // In this window the line towers over a continuum of 1200, so
        // the continuum is a fraction of a per cent of the signal. It
        // comes back 31 % wrong in its own terms, which sounds alarming
        // and is not: that is 374 counts, one part in a thousand of the
        // peak, and it is what a one-per-thousand error in the
        // amplitude does when multiplied by a profile that tall.
        //
        // The lesson is a constraint on the measurement, not a defect
        // in the fit: a continuum fitted under a strong line means
        // nothing, which is why the protocol's M5 measures the
        // continuum in LINE-FREE windows.
        const lines = [line(393.366, 1)];
        const { grid, measured } = drawn(lines, TRUTH);
        const fit = fitWindow(grid, measured, lines);

        let peak = 0;
        for (const v of measured) peak = Math.max(peak, v);
        expect(Math.abs(fit.continuum - TRUTH.continuum) / TRUTH.continuum).toBeGreaterThan(0.1);
        expect(Math.abs(fit.continuum - TRUTH.continuum) / peak).toBeLessThan(2e-3);

        // Weaken the line a thousandfold and the continuum sharpens up,
        // which demonstrates the cause rather than asserting it.
        const weak = drawn(lines, { ...TRUTH, scale: TRUTH.scale / 1000 });
        const weakFit = fitWindow(weak.grid, weak.measured, lines);
        expect(Math.abs(weakFit.continuum / TRUTH.continuum - 1)).toBeLessThan(0.01);
    });

    it("recovers them from a blend, which is where a fit earns its keep", () => {
        // Two lines 0.05 nm apart under a 0.09 nm slit make one peak
        // whose centre is between them. Picking that peak would give a
        // wrong position; fitting the pair gives the right offset.
        const lines = [line(393.366, 1), line(393.416, 0.6)];
        const { grid, measured } = drawn(lines, TRUTH);
        const fit = fitWindow(grid, measured, lines);

        expect(fit.blocker).toBeNull();
        expect(fit.offsetNm).toBeCloseTo(TRUTH.offsetNm, 3);
        expect(fit.instrumentalFwhmNm).toBeCloseTo(TRUTH.fwhmNm, 2);
        expect(fit.lineCount).toBe(2);
    });

    it("holds the amplitude against a wrong width, which a free optimiser would trade away", () => {
        // Forced to a width 30 % too large, the amplitude must rise to
        // conserve the area rather than the fit settling on a smaller
        // line. The exact linear solution is what guarantees it.
        const lines = [line(393.366, 1)];
        const { grid, measured } = drawn(lines, TRUTH);
        const forced = fitWindow(grid, measured, lines, { fwhmRangeNm: [TRUTH.fwhmNm * 1.3, TRUTH.fwhmNm * 1.3] });
        expect(forced.blocker).toBeNull();
        expect(forced.scale).toBeGreaterThan(TRUTH.scale);
        // And the residual tells on it, which is the point: a wrong
        // width does not hide inside a rescaled amplitude.
        expect(forced.residualShareOfPeak).toBeGreaterThan(20 * fitWindow(grid, measured, lines).residualShareOfPeak);
    });

    it("recovers the width when a collisional width is folded in too", () => {
        const lines = [line(393.366, 1)];
        const { grid, measured } = drawn(lines, { ...TRUTH, lorentzNm: 0.03 });
        const fit = fitWindow(grid, measured, lines, { collisionalFwhmNm: 0.03 });
        expect(fit.instrumentalFwhmNm).toBeCloseTo(TRUTH.fwhmNm, 2);

        // Given the wrong collisional width, the fit absorbs the
        // difference into the instrumental one, which is exactly why a
        // single window cannot separate the two and the protocol makes
        // the collisional coefficient a global parameter.
        const confused = fitWindow(grid, measured, lines, { collisionalFwhmNm: 0 });
        expect(confused.instrumentalFwhmNm).toBeGreaterThan(fit.instrumentalFwhmNm);
    });

    it("survives noise at a level a real measurement carries", () => {
        const lines = [line(393.366, 1)];
        const { grid, measured } = drawn(lines, TRUTH);
        const random = makeRandom(7);
        // Twenty per cent shot-to-shot, which is what the first look
        // measured on this very line.
        const noisy = measured.map((v) => v * (1 + 0.2 * (random() - 0.5)));
        const fit = fitWindow(grid, noisy, lines);

        expect(fit.offsetNm).toBeCloseTo(TRUTH.offsetNm, 2);
        expect(Math.abs(fit.instrumentalFwhmNm - TRUTH.fwhmNm) / TRUTH.fwhmNm).toBeLessThan(0.1);
        expect(fit.scale / TRUTH.scale).toBeCloseTo(1, 1);
    });

    it("says why rather than fitting nothing", () => {
        const grid = buildWavelengthGrid(INSTRUMENT(393, 394, 501));
        expect(
            fitWindow(
                grid,
                Array.from(grid, () => 1),
                []
            ).blocker
        ).toMatch(/no modelled line/);
        expect(fitWindow(new Float64Array([393, 394]), [1, 1], [line(393.5, 1)]).blocker).toMatch(/at least eight points/);
        expect(fitWindow(grid, [1, 2, 3], [line(393.5, 1)]).blocker).toMatch(/the measurement 3/);
    });

    it("is caught by its residual on a window turned upside down", () => {
        // A measurement with a trough where the model puts a line. The
        // fit does not refuse: with enough offset or width it still
        // finds some positive amplitude, which is worth knowing, since
        // it means a blocker is NOT the guard here. The residual is:
        // measured at 143 % of the peak against 0.03 % for the same
        // window the right way up, and 526 % at its worst point.
        const lines = [line(393.366, 1)];
        const { grid, measured } = drawn(lines, TRUTH);
        const inverted = measured.map((v) => 2 * TRUTH.continuum - v);

        const fit = fitWindow(grid, inverted, lines);
        expect(fit.blocker).toBeNull();
        expect(fit.residualShareOfPeak).toBeGreaterThan(1);
        expect(fit.worstResidualShare).toBeGreaterThan(5);
        // Which is nearly three orders above the honest fit's 0.14 %,
        // so the residual separates the two without any threshold
        // being delicate.
        expect(fit.residualShareOfPeak).toBeGreaterThan(500 * fitWindow(grid, measured, lines).residualShareOfPeak);
    });
});

describe("fitLinearTrend", () => {
    it("recovers a line through per-window values", () => {
        const nm = [300, 400, 500, 600, 700];
        const value = nm.map((w) => 0.05 + 2e-4 * (w - 500));
        const t = fitLinearTrend(nm, value, 500);
        expect(t.blocker).toBeNull();
        expect(t.constant).toBeCloseTo(0.05, 9);
        expect(t.slopePerNm).toBeCloseTo(2e-4, 12);
        expect(t.rmsResidual).toBeLessThan(1e-12);
    });

    it("reports the scatter, which is what says a line was the right model", () => {
        // A width that goes as the square of the wavelength does not
        // fit a straight line, and the residual has to show it rather
        // than the two coefficients being reported as if they held.
        const nm = [300, 400, 500, 600, 700];
        const curved = nm.map((w) => 0.05 + 1e-6 * (w - 500) ** 2);
        const t = fitLinearTrend(nm, curved, 500);
        expect(t.slopePerNm).toBeCloseTo(0, 6);
        expect(t.rmsResidual).toBeGreaterThan(0.01);
    });

    it("ignores a window that gave no answer instead of poisoning the trend", () => {
        const nm = [300, 400, 500, 600];
        const withNaN = [0.05, NaN, 0.06, 0.07];
        const t = fitLinearTrend(nm, withNaN, 500);
        expect(t.pointCount).toBe(3);
        expect(t.blocker).toBeNull();
    });

    it("says why with too few windows", () => {
        expect(fitLinearTrend([300, 400], [1, 2], 350).blocker).toMatch(/at least three windows/);
        expect(fitLinearTrend([400, 400, 400], [1, 2, 3], 400).blocker).toMatch(/same wavelength/);
    });
});
