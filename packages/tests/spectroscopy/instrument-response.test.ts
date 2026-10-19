/**
 * The instrument response, recovered from a lamp.
 *
 * The tests are built the other way round from the measurement: a
 * response is chosen, a certificate is chosen, their product is handed
 * in as the "measurement", and the response has to come back. That is
 * the only way to test a recovery, because on real data there is
 * nothing to compare the answer with.
 *
 * Why this earns its own file rather than a glance: the response is
 * multiplicative in the wavelength, so it goes straight into every
 * line ratio and therefore into every temperature read from one. The
 * instrument of V1-B rises by a factor of forty between 250 and
 * 650 nm, and an uncorrected Boltzmann plot over that range would
 * return a confident, wrong temperature.
 */
import { applyInstrumentResponse, averageInto, combine, instrumentResponse } from "../../dev/plugins/spectroscopy/src";
import type { ISampledCurve } from "../../dev/plugins/spectroscopy/src";

/** A grid from `from` to `to` inclusive, at `step`. */
const grid = (from: number, to: number, step: number): number[] => {
    const out: number[] = [];
    // Built by multiplication rather than by accumulation so the
    // points are exactly on the step and comparisons stay exact.
    for (let k = 0; from + k * step <= to + step / 2; k++) out.push(Number((from + k * step).toFixed(6)));
    return out;
};

const curve = (wavelengthNm: number[], f: (nm: number) => number): ISampledCurve => ({ wavelengthNm, values: wavelengthNm.map(f) });

/** Something shaped like a real detector: blind low, peak, falling. */
const TRUE_RESPONSE = (nm: number) => 10 + 6000 * Math.exp(-(((nm - 650) / 220) ** 2));
/** Something shaped like a lamp certificate. */
const CERTIFICATE = (nm: number) => 1 + 25 * Math.exp(-(((nm - 230) / 40) ** 2)) + nm / 90;

describe("averageInto", () => {
    it("averages a fine grid into a coarse one", () => {
        const fine = curve(grid(200, 210, 0.02), () => 7);
        const { values, counts } = averageInto(fine, grid(200, 210, 1));
        expect(values.every((v) => Math.abs(v - 7) < 1e-12)).toBe(true);
        // Fifty fine points per nanometre, give or take the bin edges.
        expect(counts[5]).toBe(50);
    });

    it("averages the noise down rather than carrying it", () => {
        // Alternating about a mean: the average must be the mean, which
        // is the whole reason a measurement is averaged into the
        // certificate and not the other way round.
        const fine = curve(grid(300, 310, 0.02), (nm) => 100 + (Math.round(nm / 0.02) % 2 === 0 ? 40 : -40));
        const { values } = averageInto(fine, grid(300, 310, 1));
        expect(values[5]).toBeCloseTo(100, 6);
    });

    it("leaves a bin empty rather than reaching for a far-off point", () => {
        // A measurement covering 300 to 310 says nothing about 400.
        const fine = curve(grid(300, 310, 0.02), () => 7);
        const { counts } = averageInto(fine, [305, 400]);
        expect(counts[0]).toBeGreaterThan(0);
        expect(counts[1]).toBe(0);
    });

    it("is safe on an empty coarse grid", () => {
        expect(
            averageInto(
                curve(grid(300, 301, 0.5), () => 1),
                []
            )
        ).toEqual({ values: [], counts: [], oneSided: [] });
    });
});

describe("combine", () => {
    it("sums two measurements of one lamp", () => {
        const g = grid(200, 205, 1);
        expect(
            combine(
                curve(g, () => 3),
                curve(g, () => 4)
            ).values
        ).toEqual([7, 7, 7, 7, 7, 7]);
    });

    it("refuses two different grids instead of pairing by index", () => {
        // A silent index-pairing of two grids that do not match is the
        // kind of mistake that produces a plausible wrong answer.
        expect(() =>
            combine(
                curve(grid(200, 205, 1), () => 1),
                curve(grid(200, 205, 0.5), () => 1)
            )
        ).toThrow(/points/);
        expect(() =>
            combine(
                curve([200, 201], () => 1),
                curve([200, 202], () => 1)
            )
        ).toThrow(/different grids/);
    });
});

describe("instrumentResponse", () => {
    const certificateGrid = grid(200, 1000, 1);
    const measuredGrid = grid(200, 1000, 0.02);
    const certificate = curve(certificateGrid, CERTIFICATE);
    const measured = curve(measuredGrid, (nm) => TRUE_RESPONSE(nm) * CERTIFICATE(nm));

    it("recovers the response the measurement was built from", () => {
        const r = instrumentResponse(measured, certificate, "uW/cm^2/nm");
        expect(r.gaps).toEqual([]);
        expect(r.pointsPerBin).toBe(50);

        const error = r.wavelengthNm.map((nm, k) => Math.abs(r.countsPerIrradiance[k] - TRUE_RESPONSE(nm)) / TRUE_RESPONSE(nm));
        const at = (nm: number) => error[r.wavelengthNm.findIndex((w) => w === nm)];

        // Inside the measured range the recovery is good to four parts
        // in ten thousand. What is left is that a bin averages the
        // PRODUCT of response and irradiance over a nanometre and then
        // divides by the irradiance at the bin centre, which is second
        // order in the bin width.
        const interior = r.wavelengthNm.map((nm, k) => ({ nm, e: error[k] })).filter((x) => !r.oneSidedBins.includes(x.nm));
        expect(Math.max(...interior.map((x) => x.e))).toBeLessThan(5e-4);

        // The two ends are a different and larger error, and the point
        // of reporting them: their bins take samples from one side
        // only, so they average a half interval and inherit its slope.
        // Measured here at 1.2 % and 0.33 %, thirty and eight times the
        // interior.
        expect(r.oneSidedBins).toEqual([200, 1000]);
        expect(at(200)).toBeGreaterThan(0.01);
        expect(at(1000)).toBeGreaterThan(0.003);
    });

    it("names the points whose bin is one-sided rather than hiding them", () => {
        // A hole in the middle of a measurement produces the same
        // thing as the two ends do, and it is worth catching for the
        // same reason.
        const holed = { wavelengthNm: measuredGrid.filter((nm) => nm < 500 || nm > 520), values: [] as number[] };
        (holed as { values: number[] }).values = holed.wavelengthNm.map((nm) => TRUE_RESPONSE(nm) * CERTIFICATE(nm));
        const r = instrumentResponse(holed, certificate, "uW/cm^2/nm");
        // The two ends of the whole range, and the two bins that sit on
        // the edges of the hole and so are fed from one side of it.
        expect(r.oneSidedBins).toEqual([200, 500, 520, 1000]);
        // And the certificate points inside the hole have no
        // measurement at all, so they are gaps rather than one-sided.
        expect(r.gaps).toContain(510);
    });

    it("reports a gap instead of inventing a response", () => {
        const withZero = { wavelengthNm: [300, 400, 500], values: [1, 0, 2] };
        const r = instrumentResponse(measured, withZero, "uW/cm^2/nm");
        expect(r.gaps).toEqual([400]);
        expect(Number.isNaN(r.countsPerIrradiance[1])).toBe(true);
        expect(r.countsPerIrradiance[0]).toBeGreaterThan(0);
    });

    it("reports a certificate point the measurement never reached", () => {
        const beyond = { wavelengthNm: [500, 2000], values: [1, 1] };
        expect(instrumentResponse(measured, beyond, "uW/cm^2/nm").gaps).toEqual([2000]);
    });

    it("carries the certificate's unit so a corrected spectrum can name it", () => {
        expect(instrumentResponse(measured, certificate, "uW/cm^2/nm").irradianceUnit).toBe("uW/cm^2/nm");
    });
});

describe("applyInstrumentResponse", () => {
    const certificate = curve(grid(200, 1000, 1), CERTIFICATE);
    const measured = curve(grid(200, 1000, 0.02), (nm) => TRUE_RESPONSE(nm) * CERTIFICATE(nm));
    const response = instrumentResponse(measured, certificate, "uW/cm^2/nm");

    it("turns counts back into the certificate's unit", () => {
        // A flat physical spectrum, seen through the instrument, comes
        // back flat.
        const seen = curve(grid(250, 950, 0.02), (nm) => TRUE_RESPONSE(nm) * 5);
        const corrected = applyInstrumentResponse(seen, response);
        const finite = corrected.values.filter((v) => Number.isFinite(v));
        expect(finite.length).toBe(corrected.values.length);
        // Within three parts in ten thousand, worst near 278 nm where
        // the response curves most: the bin averaging above, plus the
        // straight line the response is interpolated along between its
        // points. Measured, not hoped for.
        for (const v of finite) expect(Math.abs(v - 5) / 5).toBeLessThan(3e-4);
    });

    it("removes the bias the response puts into a line ratio", () => {
        // Two equal physical lines, one at 250 nm and one at 650, where
        // the response differs by a factor of forty-odd. Uncorrected,
        // their ratio is that factor; corrected, it is one. This is the
        // error that would otherwise arrive as a temperature.
        const atNm = (c: ISampledCurve, nm: number) => c.values[c.wavelengthNm.findIndex((w) => Math.abs(w - nm) < 1e-9)];
        const seen = curve(grid(200, 1000, 0.02), (nm) => (Math.abs(nm - 250) < 1e-9 || Math.abs(nm - 650) < 1e-9 ? TRUE_RESPONSE(nm) * 100 : 0));

        const rawRatio = atNm(seen, 650) / atNm(seen, 250);
        expect(rawRatio).toBeGreaterThan(20);

        const corrected = applyInstrumentResponse(seen, response);
        expect(atNm(corrected, 650) / atNm(corrected, 250)).toBeCloseTo(1, 2);
    });

    it("gives NaN outside the response rather than a silent zero", () => {
        // A zero would be read as "no light there", which is a
        // measurement, not an absence of one.
        const seen = curve([150, 500, 1500], () => 1000);
        const corrected = applyInstrumentResponse(seen, response);
        expect(Number.isNaN(corrected.values[0])).toBe(true);
        expect(Number.isFinite(corrected.values[1])).toBe(true);
        expect(Number.isNaN(corrected.values[2])).toBe(true);
    });
});
