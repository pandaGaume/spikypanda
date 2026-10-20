/**
 * Per-line collisional (Stark) widths: the three tiers.
 *
 * Tier 1 is a critically evaluated measurement, tier 2 a published
 * calculation, tier 3 the single global coefficient every line used
 * before. The evidence behind the table and the reason the mix is the
 * right plan are in `internals/libs/15-STARK-COEFFICIENTS.md`.
 *
 * The tests here are shaped by what can go wrong silently rather than
 * by what the code does, because this change has two failure modes
 * that no type checks:
 *
 *   - a UNIT slip. The table is in picometres and the catalogue in
 *     nanometres, and a factor of a thousand in the wrong direction
 *     does not throw: it produces a line with no collisional wing at
 *     all, which looks exactly like a clean Doppler profile. The width
 *     of every catalogue entry is therefore bounded here, both ways;
 *   - a line quietly getting a width it has no source for. The two the
 *     sources do not cover must keep falling back, and an empty cell
 *     must not read as a zero width, which is a real Lorentzian of no
 *     width rather than an absence.
 */
import {
    accumulateLines,
    collisionalFwhmNm,
    DEFAULT_PLASMA_PARAMETERS,
    NIST_LINE_CATALOGUE,
    NIST_STARK_PROVENANCE,
    nistSpecies,
    STARK_REFERENCE_ELECTRON_DENSITY_CM3,
    STARK_SUPPORTED_TEMPERATURE_K,
} from "../../dev/plugins/spectroscopy/src";
import type { IAtomicLine, ILineEmission, IPlasmaParameters } from "../../dev/plugins/spectroscopy/src";

const plasma = (over: Partial<IPlasmaParameters> = {}): IPlasmaParameters => Object.freeze({ ...DEFAULT_PLASMA_PARAMETERS, ...over });

/** The one line of a species nearest a wavelength, within 12 pm. */
const lineAt = (element: string, ionisation: 0 | 1 | 2, nm: number): IAtomicLine | undefined =>
    nistSpecies(element, ionisation)?.lines.find((l) => Math.abs(l.wavelengthNm - nm) < 0.012);

const emission = (over: Partial<ILineEmission> = {}): ILineEmission => ({
    element: "X",
    species: "X I",
    wavelengthNm: 500,
    intensity: 1,
    dopplerFwhmNm: 0.004,
    provenance: "test",
    ...over,
});

// ─────────────────────────────────────────────────────────────────────
// 1. The three tiers, in the engine
// ─────────────────────────────────────────────────────────────────────

describe("collisionalFwhmNm", () => {
    it("uses the line's own width when it has one", () => {
        const w = collisionalFwhmNm(plasma(), { collisionalWidthNm: 0.0102 });
        expect(w).toBeCloseTo(0.0102, 9);
    });

    it("scales the line's width linearly with the electron density", () => {
        const atHalf = collisionalFwhmNm(plasma({ electronDensityCm3: 0.5e17 }), { collisionalWidthNm: 0.0102 });
        const atDouble = collisionalFwhmNm(plasma({ electronDensityCm3: 2e17 }), { collisionalWidthNm: 0.0102 });
        expect(atHalf).toBeCloseTo(0.0051, 9);
        expect(atDouble).toBeCloseTo(0.0204, 9);
    });

    it("reads the line's width at the catalogue's density, not the plasma's reference", () => {
        // The two are independent: the plasma's reference says what the
        // GLOBAL coefficient is stated at, and changing it must not
        // move a per-line width.
        const odd = plasma({ referenceElectronDensityCm3: 3.7e16 });
        expect(collisionalFwhmNm(odd, { collisionalWidthNm: 0.0102 })).toBeCloseTo(0.0102 * (odd.electronDensityCm3 / STARK_REFERENCE_ELECTRON_DENSITY_CM3), 9);
    });

    it("falls back to the global coefficient for a line with no width, and with no line at all", () => {
        expect(collisionalFwhmNm(plasma())).toBeCloseTo(DEFAULT_PLASMA_PARAMETERS.collisionalWidthNm, 9);
        expect(collisionalFwhmNm(plasma(), {})).toBeCloseTo(DEFAULT_PLASMA_PARAMETERS.collisionalWidthNm, 9);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. The profile actually uses it
// ─────────────────────────────────────────────────────────────────────

describe("accumulateLines with per-line widths", () => {
    const grid = new Float64Array(2001);
    for (let i = 0; i < grid.length; i++) grid[i] = 499 + (2 * i) / (grid.length - 1);

    /** Full width at half maximum read off a sampled profile. */
    const fwhmOf = (profile: Float32Array): number => {
        let peak = 0;
        for (const v of profile) peak = Math.max(peak, v);
        let first = -1;
        let last = -1;
        for (let i = 0; i < profile.length; i++) {
            if (profile[i] >= peak / 2) {
                if (first < 0) first = i;
                last = i;
            }
        }
        return first < 0 ? 0 : grid[last] - grid[first];
    };

    it("broadens a line that carries its own width and leaves its neighbour alone", () => {
        const narrow = accumulateLines(grid, [emission({ wavelengthNm: 500, collisionalFwhmNm: 0.004 })], 0, 0);
        const wide = accumulateLines(grid, [emission({ wavelengthNm: 500, collisionalFwhmNm: 0.08 })], 0, 0);
        expect(fwhmOf(wide)).toBeGreaterThan(fwhmOf(narrow) * 3);
    });

    it("ignores the global argument for a line that carries a width, and honours it for one that does not", () => {
        const carried = emission({ wavelengthNm: 500, collisionalFwhmNm: 0.004 });
        const withGlobal = accumulateLines(grid, [carried], 0.2, 0);
        const withoutGlobal = accumulateLines(grid, [carried], 0, 0);
        expect(fwhmOf(withGlobal)).toBeCloseTo(fwhmOf(withoutGlobal), 6);

        const bare = emission({ wavelengthNm: 500 });
        expect(fwhmOf(accumulateLines(grid, [bare], 0.2, 0))).toBeGreaterThan(fwhmOf(accumulateLines(grid, [bare], 0, 0)) * 3);
    });

    it("gives two lines of one window two different profiles", () => {
        // The whole point of the change: before it, one window had one
        // Lorentz width and the two lines of a doublet could not differ.
        const pair = [emission({ wavelengthNm: 499.6, collisionalFwhmNm: 0.004 }), emission({ wavelengthNm: 500.4, collisionalFwhmNm: 0.1 })];
        const profile = accumulateLines(grid, pair, 0, 0);
        let peakNarrow = 0;
        let peakWide = 0;
        for (let i = 0; i < grid.length; i++) {
            if (grid[i] < 500) peakNarrow = Math.max(peakNarrow, profile[i]);
            else peakWide = Math.max(peakWide, profile[i]);
        }
        // Equal areas, very different widths: the narrow one is taller.
        expect(peakNarrow).toBeGreaterThan(peakWide * 3);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. The shipped catalogue
// ─────────────────────────────────────────────────────────────────────

describe("the catalogue's collisional widths", () => {
    const withWidth = NIST_LINE_CATALOGUE.filter((l) => l.collisionalWidthNm !== undefined);

    it("states its reference density and its supported temperature range", () => {
        expect(NIST_STARK_PROVENANCE?.referenceElectronDensityCm3).toBe(STARK_REFERENCE_ELECTRON_DENSITY_CM3);
        expect(NIST_STARK_PROVENANCE?.supportedTemperatureK).toEqual([...STARK_SUPPORTED_TEMPERATURE_K]);
    });

    it("carries a width for the lines the V1-B fit uses", () => {
        // Four of the twenty-three, one per source volume, with the
        // value the review states at 1e17 cm^-3.
        expect(lineAt("Mg", 1, 279.553)?.collisionalWidthNm).toBeCloseTo(0.0102, 6);
        expect(lineAt("Ca", 1, 393.366)?.collisionalWidthNm).toBeCloseTo(0.017, 6);
        expect(lineAt("Mg", 0, 383.829)?.collisionalWidthNm).toBeCloseTo(0.27, 6);
        expect(lineAt("O", 0, 777.19)?.collisionalWidthNm).toBeCloseTo(0.105, 6);
    });

    it("leaves the two lines no source covers without one", () => {
        // An empty cell is an absence, not a zero. A zero would be a
        // Lorentzian of no width, which is a different and wrong claim.
        expect(lineAt("Si", 0, 263.128)).toBeDefined();
        expect(lineAt("Si", 0, 263.128)?.collisionalWidthNm).toBeUndefined();
        expect(lineAt("O", 0, 844.68)).toBeDefined();
        expect(lineAt("O", 0, 844.68)?.collisionalWidthNm).toBeUndefined();
    });

    it("spreads a width across its multiplet", () => {
        // Ca I 445.478 is measured; 442.544 and 443.569 are two more
        // components of the same 4p 3Po to 4d 3D multiplet and have no
        // measurement of their own. Two neighbours of one multiplet on
        // different tiers would differ by more than physics allows.
        const measured = lineAt("Ca", 0, 445.478);
        const partner = lineAt("Ca", 0, 443.569) ?? lineAt("Ca", 0, 442.544);
        expect(measured?.collisionalWidthNm).toBeCloseTo(0.2, 6);
        expect(partner?.collisionalWidthNm).toBeCloseTo(0.2, 6);
    });

    it("names a tier and a stated temperature for every width it carries", () => {
        expect(withWidth.length).toBeGreaterThan(20);
        for (const l of withWidth) {
            expect(["measured", "calculated"]).toContain(l.collisionalWidthSource);
            expect(l.collisionalWidthTemperatureK).toBeGreaterThan(1000);
        }
    });

    it("keeps every width inside a physically possible range", () => {
        // The guard against a unit slip. A thousandfold error either
        // way lands outside this band and nothing else does: the
        // smallest value the sources give is 10.2 pm and the largest
        // 270 pm, so a picometre and a nanometre bracket them with room
        // to spare and without pinning the test to today's table.
        for (const l of withWidth) {
            expect(l.collisionalWidthNm).toBeGreaterThan(0.001);
            expect(l.collisionalWidthNm).toBeLessThan(1);
        }
    });

    it("leaves the rest of the catalogue on the global coefficient", () => {
        // The per-line table covers the lines a fit reads, not the
        // catalogue. Most lines must still be undefined, or something
        // has been invented.
        expect(withWidth.length).toBeLessThan(NIST_LINE_CATALOGUE.length / 100);
    });
});
