/**
 * V1-A: do the lines land where NIST says they do?
 *
 * This is the first of the three validation steps the LIBS brief makes
 * blocking (`internals/libs/SOURCE-brief-graphe-2026-10-19.md`, section
 * 5 bis): before any learning on synthetic spectra, the forward model
 * has to be confronted with the reference. Here the reference is the
 * NIST ASD catalogue itself, so what is measured is the PIPELINE:
 * emission, profile, sampling, instrument. The comparison against an
 * independent measurement (a real spectrum, or the NIST LIBS simulator)
 * is V1-B and V1-C, and it is not done yet.
 *
 * It reports NUMBERS, not a colour: position errors in nanometres for
 * every isolated reference line, how many lines were matched, and how
 * many peaks appeared that no catalogue line explains. The thresholds
 * are stated in pixels, because a position error below the sampling
 * step is not an error of the model but of the grid.
 *
 * Blends are treated as blends, not as failures: two lines closer than
 * the instrumental width make ONE peak whose position sits between
 * them, which is physics and not a defect. Such groups are counted and
 * excluded from the position statistics.
 */
import {
    computeLineEmissions,
    DEFAULT_INSTRUMENT_PARAMETERS,
    DEFAULT_PLASMA_PARAMETERS,
    NIST_IONISATION_ENERGIES_EV,
    NIST_LINE_CATALOGUE,
    NIST_SPECIES,
    pseudoVoigtFwhm,
    renderSpectrum,
} from "../../dev/plugins/spectroscopy/src";
import type { IInstrumentParameters, IPhysicalModelData, IPlasmaParameters } from "../../dev/plugins/spectroscopy/src";

const DATA: IPhysicalModelData = {
    species: NIST_SPECIES.map((s) => ({ element: s.element, ionisation: s.ionisation, asdName: s.asdName, lines: s.lines, levels: s.levels })),
    ionisationEnergiesEv: NIST_IONISATION_ENERGIES_EV,
};

const PLASMA: IPlasmaParameters = {
    ...DEFAULT_PLASMA_PARAMETERS,
    emissionModel: "physical",
    temperatureK: 10000,
    electronDensityCm3: 1e17,
    continuumLevel: 0,
    collisionalWidthNm: 0.01,
};

/** A narrow, finely sampled window: 0.005 nm per pixel. */
const INSTRUMENT: IInstrumentParameters = { ...DEFAULT_INSTRUMENT_PARAMETERS, rangeStartNm: 380, rangeEndNm: 450, pixelCount: 14001, resolutionFwhmNm: 0.05, noiseEnabled: false };

const PIXEL_NM = (INSTRUMENT.rangeEndNm - INSTRUMENT.rangeStartNm) / (INSTRUMENT.pixelCount - 1);

function spectrumOf(atomFractions: Record<string, number>) {
    const emission = computeLineEmissions(atomFractions, NIST_LINE_CATALOGUE, PLASMA, "v1a");
    const physical = computeLineEmissions(atomFractions, NIST_LINE_CATALOGUE, PLASMA, "v1a", DATA);
    expect(emission.blocker).not.toBeNull(); // without the data set, it refuses
    expect(physical.blocker).toBeNull();
    return { emission: physical, spectrum: renderSpectrum(physical, INSTRUMENT) };
}

/** Local maxima of a curve, above `floor` times the global maximum. */
function peaks(grid: Float64Array, y: Float32Array, floor: number): Array<{ wavelengthNm: number; height: number }> {
    let max = 0;
    for (let i = 0; i < y.length; i++) max = Math.max(max, y[i]);
    const threshold = max * floor;
    const found: Array<{ wavelengthNm: number; height: number }> = [];
    for (let i = 1; i < y.length - 1; i++) {
        if (!(y[i] >= y[i - 1] && y[i] > y[i + 1] && y[i] > threshold)) continue;
        // Parabolic interpolation: the sampled maximum is not the peak.
        const denom = y[i - 1] - 2 * y[i] + y[i + 1];
        const delta = denom !== 0 ? (0.5 * (y[i - 1] - y[i + 1])) / denom : 0;
        found.push({ wavelengthNm: grid[i] + delta * PIXEL_NM, height: y[i] });
    }
    return found;
}

describe("V1-A, line positions against the NIST catalogue", () => {
    const { emission, spectrum } = spectrumOf({ Ca: 1 });
    const measured = peaks(spectrum.wavelengthNm, spectrum.instrumented, 0.0005);

    // Reference lines: the catalogue lines inside the window, strong
    // enough to show, and far enough from a neighbour of comparable
    // strength that the instrument resolves them.
    const inWindow = emission.lines.filter((l) => l.wavelengthNm > INSTRUMENT.rangeStartNm + 1 && l.wavelengthNm < INSTRUMENT.rangeEndNm - 1);
    const strongest = Math.max(...inWindow.map((l) => l.intensity));
    const strong = inWindow.filter((l) => l.intensity > strongest * 0.001);

    /**
     * How wide this line actually comes out: its own Doppler width and
     * its own collisional width, folded with the slit.
     *
     * It is per line because the collisional width is. While every
     * line carried one global coefficient a single constant was right;
     * now Ca I 445.478 is 200 pm wide against Ca II 393.366's 17 pm,
     * so the first blends with neighbours the second resolves. Using
     * one number for both silently declared a line isolated while a
     * companion sat inside its profile, and the peak then came out
     * between the two.
     */
    const totalWidthOf = (l: (typeof inWindow)[number]) =>
        pseudoVoigtFwhm(Math.hypot(l.dopplerFwhmNm, INSTRUMENT.resolutionFwhmNm), l.collisionalFwhmNm ?? PLASMA.collisionalWidthNm);

    // The companion that spoils a peak need not itself be strong
    // enough to be a reference line, so this looks at EVERY line in
    // the window. Checking only against the reference set was the
    // second half of the same mistake.
    const isolated = strong.filter(
        (l) => !inWindow.some((o) => o !== l && Math.abs(o.wavelengthNm - l.wavelengthNm) < 3 * Math.max(totalWidthOf(l), totalWidthOf(o)) && o.intensity > l.intensity * 0.05)
    );
    const blended = strong.length - isolated.length;

    const errors = isolated.map((l) => {
        const nearest = measured.reduce(
            (best, p) => (best === null || Math.abs(p.wavelengthNm - l.wavelengthNm) < Math.abs(best.wavelengthNm - l.wavelengthNm) ? p : best),
            null as (typeof measured)[number] | null
        );
        return { line: l, deltaNm: nearest ? nearest.wavelengthNm - l.wavelengthNm : Number.NaN };
    });

    const absErrors = errors.map((e) => Math.abs(e.deltaNm)).filter((d) => Number.isFinite(d));
    const maxError = Math.max(...absErrors);
    const meanError = absErrors.reduce((s, d) => s + d, 0) / absErrors.length;

    it("reports the measured position errors", () => {
        // The brief asks for figures, so the figures are printed.
        const worst = [...errors].sort((a, b) => Math.abs(b.deltaNm) - Math.abs(a.deltaNm)).slice(0, 5);
        // eslint-disable-next-line no-console
        console.log(
            [
                `V1-A, Ca pur, 380-450 nm, ${INSTRUMENT.pixelCount} pixels (${(PIXEL_NM * 1000).toFixed(1)} pm/pixel), fente 0,05 nm`,
                `  raies de reference isolees : ${isolated.length} (plus ${blended} en melange, exclues)`,
                `  erreur de position : max ${(maxError * 1000).toFixed(3)} pm, moyenne ${(meanError * 1000).toFixed(3)} pm`,
                `  soit max ${(maxError / PIXEL_NM).toFixed(3)} pixel`,
                ...worst.map((e) => `  ${e.line.species} ${e.line.wavelengthNm.toFixed(4)} nm -> ${(e.deltaNm * 1000).toFixed(3)} pm`),
            ].join("\n")
        );
        expect(absErrors.length).toBeGreaterThan(5);
    });

    it("places every isolated line within a fifth of a pixel", () => {
        expect(maxError).toBeLessThan(PIXEL_NM * 0.2);
    });

    it("identifies the three lines a calcium spectrum is known by", () => {
        const top = [...measured]
            .sort((a, b) => b.height - a.height)
            .slice(0, 3)
            .map((p) => p.wavelengthNm)
            .sort((a, b) => a - b);
        expect(top[0]).toBeCloseTo(393.366, 2); // Ca II K
        expect(top[1]).toBeCloseTo(396.847, 2); // Ca II H
        expect(top[2]).toBeCloseTo(422.673, 2); // Ca I resonance
    });

    it("produces no peak that the catalogue cannot explain", () => {
        const unexplained = measured
            .filter((p) => p.height > Math.max(...Array.from(spectrum.instrumented)) * 0.01)
            .filter((p) => !inWindow.some((l) => Math.abs(l.wavelengthNm - p.wavelengthNm) < 2 * PIXEL_NM + 3 * totalWidthOf(l)));
        expect(unexplained.map((p) => p.wavelengthNm.toFixed(3))).toEqual([]);
    });

    it("misses no strong catalogue line", () => {
        const missed = isolated.filter((l) => !measured.some((p) => Math.abs(p.wavelengthNm - l.wavelengthNm) < 2 * PIXEL_NM));
        expect(missed.map((l) => `${l.species} ${l.wavelengthNm.toFixed(3)}`)).toEqual([]);
    });

    it("keeps the ion and neutral lines of the same element apart", () => {
        const ionLines = emission.lines.filter((l) => l.species === "Ca II");
        const neutralLines = emission.lines.filter((l) => l.species === "Ca I");
        expect(ionLines.length).toBeGreaterThan(0);
        expect(neutralLines.length).toBeGreaterThan(0);
        // At 10 000 K and 1e17 cm^-3, calcium is mostly ionised, so its
        // strongest line is an ion line. This is the Saha balance
        // reaching the spectrum, and it is what a species assignment on
        // a real spectrum has to reproduce.
        const strongestLine = emission.lines.reduce((b, l) => (l.intensity > b.intensity ? l : b));
        expect(strongestLine.species).toBe("Ca II");
    });
});

describe("V1-A, a three-element sample", () => {
    it("assigns every strong peak to the right species", () => {
        const { emission, spectrum } = spectrumOf({ Ca: 0.4, Fe: 0.4, Si: 0.2 });
        // The two Ca II lines tower over everything in this window, so a
        // threshold at 2 % of the maximum would only ever see calcium.
        // The floor is set low enough for the iron lines to be in the
        // comparison, which is the point: a species assignment is only
        // tested when more than one element is on the table.
        const measured = peaks(spectrum.wavelengthNm, spectrum.instrumented, 0.0005);
        const assigned = measured.map((p) => {
            const nearest = emission.lines.reduce((b, l) => (Math.abs(l.wavelengthNm - p.wavelengthNm) < Math.abs(b.wavelengthNm - p.wavelengthNm) ? l : b));
            return { peak: p.wavelengthNm, species: nearest.species, deltaNm: nearest.wavelengthNm - p.wavelengthNm };
        });
        expect(assigned.length).toBeGreaterThan(10);
        expect(new Set(assigned.map((a) => a.species.split(" ")[0])).size).toBeGreaterThan(1);
        for (const a of assigned) {
            expect(Math.abs(a.deltaNm)).toBeLessThan(0.06);
            expect(["Ca I", "Ca II", "Fe I", "Fe II", "Si I", "Si II"]).toContain(a.species);
        }
    });
});
