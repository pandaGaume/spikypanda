/**
 * The NIST readers, and the catalogue the plugin ships.
 *
 * Two things are under test and they are different: the PARSER, which
 * must read a column by its name under every variant ASD emits, and the
 * SHIPPED DATA, which must carry its provenance and be complete enough
 * for the physical emission model to run.
 *
 * The parser test that matters most is the one with a reordered header
 * carrying an extra uncertainty column: ASD emits `unc_obs_wl` for Fe I
 * and not for Ca I, so a reader that trusts column positions works on
 * the file it was written against and silently reads the wrong number
 * on the next one.
 */
import {
    NIST_CATALOGUE_ELEMENTS,
    NIST_IONISATION_ENERGIES_EV,
    NIST_LINE_CATALOGUE,
    NIST_PROVENANCE,
    NIST_SPECIES,
    nistSpecies,
    parseNistIonizationEnergies,
    parseNistLevels,
    parseNistLines,
    parseNistNumber,
    physicalModeBlocker,
} from "../../dev/plugins/spectroscopy/src";

// ─────────────────────────────────────────────────────────────────────
// 1. Numbers as ASD writes them
// ─────────────────────────────────────────────────────────────────────

describe("parseNistNumber", () => {
    it("reads a plain or quoted number", () => {
        expect(parseNistNumber('"422.673"')).toBeCloseTo(422.673, 6);
        expect(parseNistNumber(" 6.1e+06 ")).toBeCloseTo(6.1e6, 6);
    });

    it("strips the brackets ASD puts around an interpolated value", () => {
        expect(parseNistNumber('"[34.657]"')).toBeCloseTo(34.657, 6);
        expect(parseNistNumber("(2.19)")).toBeCloseTo(2.19, 6);
    });

    it("refuses anything it cannot read, rather than guessing", () => {
        expect(parseNistNumber("")).toBeNull();
        expect(parseNistNumber('""')).toBeNull();
        expect(parseNistNumber("+x")).toBeNull();
        expect(parseNistNumber("---")).toBeNull();
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. The line reader is driven by the header
// ─────────────────────────────────────────────────────────────────────

const CA_STYLE = [
    "obs_wl_air(nm)\tritz_wl_air(nm)\tintens\tAki(s^-1)\tAcc\tEi(eV)\tEk(eV)\tg_i\tg_k",
    '"422.673"\t"422.67330"\t"500"\t"2.18e+08"\tAAA\t"0.0000000"\t"2.9325100"\t1\t3',
].join("\n");

// The same line, Fe-style: two uncertainty columns inserted, and the
// weights moved to the end.
const FE_STYLE = [
    "obs_wl_air(nm)\tunc_obs_wl\tritz_wl_air(nm)\tunc_ritz_wl\tintens\tAki(s^-1)\tAcc\tEi(eV)\tEk(eV)\tg_i\tg_k",
    '"422.673"\t"0.00001"\t"422.67330"\t"0.000006"\t"500"\t"2.18e+08"\tAAA\t"0.0000000"\t"2.9325100"\t1\t3',
].join("\n");

describe("parseNistLines", () => {
    it("reads the same line from two different column layouts", () => {
        const a = parseNistLines(CA_STYLE, "Ca", 0, "test");
        const b = parseNistLines(FE_STYLE, "Ca", 0, "test");
        expect(a.lines).toHaveLength(1);
        expect(b.lines).toHaveLength(1);
        for (const r of [a.lines[0], b.lines[0]]) {
            expect(r.wavelengthNm).toBeCloseTo(422.673, 6);
            expect(r.transitionProbability).toBeCloseTo(2.18e8, 2);
            expect(r.upperLevelEnergyEv).toBeCloseTo(2.93251, 6);
            expect(r.upperLevelWeight).toBe(3);
            expect(r.lowerLevelWeight).toBe(1);
            expect(r.verified).toBe(true);
        }
    });

    it("carries the accuracy grade into the provenance", () => {
        expect(parseNistLines(CA_STYLE, "Ca", 0, "NIST ASD").lines[0].provenance).toBe("NIST ASD, A_ki accuracy AAA");
    });

    it("falls back to the Ritz wavelength when no line was observed", () => {
        const text = ["obs_wl_air(nm)\tritz_wl_air(nm)\tAki(s^-1)\tEk(eV)\tg_k", '""\t"254.14811"\t"1.7e+04"\t"4.8769584"\t3'].join("\n");
        expect(parseNistLines(text, "Ca", 0, "t").lines[0].wavelengthNm).toBeCloseTo(254.14811, 6);
    });

    it("counts what it drops instead of dropping it in silence", () => {
        const text = [
            "obs_wl_air(nm)\tritz_wl_air(nm)\tAki(s^-1)\tEk(eV)\tg_k",
            '"422.673"\t"422.67330"\t"2.18e+08"\t"2.9325100"\t3', // kept
            '""\t""\t"1.0e+08"\t"2.0"\t3', // no wavelength
            '"500.0"\t"500.0"\t""\t"2.0"\t3', // no transition probability
            '"600.0"\t"600.0"\t"1.0e+08"\t""\t3', // no upper level
        ].join("\n");
        const { lines, report } = parseNistLines(text, "Ca", 0, "t");
        expect(lines).toHaveLength(1);
        expect(report).toMatchObject({ kept: 1, skippedNoWavelength: 1, skippedNoTransitionProbability: 1, skippedNoUpperLevel: 1 });
    });

    it("normalises the heuristic strength within the species", () => {
        const text = ["obs_wl_air(nm)\tritz_wl_air(nm)\tAki(s^-1)\tEk(eV)\tg_k", '"400.0"\t"400.0"\t"1.0e+08"\t"3.0"\t3', '"500.0"\t"500.0"\t"1.0e+07"\t"3.0"\t3'].join("\n");
        const { lines } = parseNistLines(text, "Ca", 0, "t");
        expect(Math.max(...lines.map((l) => l.relativeStrength))).toBe(1);
        expect(lines.find((l) => l.wavelengthNm === 500)?.relativeStrength).toBeCloseTo(0.1, 6);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Levels and ionisation energies
// ─────────────────────────────────────────────────────────────────────

describe("parseNistLevels", () => {
    const text = [
        "J\tg\tPrefix\tLevel (eV)\tSuffix",
        '"0"\t1\t""\t"0.0000000"\t""',
        '"1"\t3\t""\t"1.8858075"\t""',
        '"2"\t5\t""\t"[2.5000]"\t""',
        '"---"\t\t""\t"6.1131550"\t""',
    ].join("\n");

    it("reads the level list and keeps the ionisation limit apart", () => {
        const { levels, ionisationLimitEv } = parseNistLevels(text);
        expect(levels).toHaveLength(3);
        expect(levels[0]).toEqual({ weight: 1, energyEv: 0 });
        // A bracketed level is an interpolated value, still the best
        // estimate available.
        expect(levels[2].energyEv).toBeCloseTo(2.5, 6);
        // The `---` row is the limit, not a level.
        expect(ionisationLimitEv).toBeCloseTo(6.113155, 6);
    });
});

describe("parseNistIonizationEnergies", () => {
    it("keys on the species being ionised, which is the ASD convention", () => {
        const text = [
            "At. num\tSp. Name\tIon Charge\tEl. Name\tIonization Energy (eV)",
            '"20"\t"Ca I"\t"0"\t"Calcium"\t"6.1131549210"',
            '"20"\t"Ca II"\t"+1"\t"Calcium"\t"11.871719"',
        ].join("\n");
        const map = parseNistIonizationEnergies(text);
        // "Ca I" is the energy to ionise NEUTRAL calcium: the one the
        // first Saha balance needs.
        expect(map["Ca I"]).toBeCloseTo(6.113155, 6);
        expect(map["Ca II"]).toBeCloseTo(11.871719, 6);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 4. The shipped catalogue
// ─────────────────────────────────────────────────────────────────────

describe("the shipped NIST catalogue", () => {
    it("names its source precisely enough to be re-downloaded", () => {
        expect(NIST_PROVENANCE.version).toBe("5.12");
        expect(NIST_PROVENANCE.doi).toBe("10.18434/T4W30F");
        expect(NIST_PROVENANCE.wavelengthMedium).toBe("air");
        expect(NIST_PROVENANCE.wavelengthRangeNm).toEqual([200, 900]);
        expect(NIST_PROVENANCE.linesFilter).toMatch(/transition probability/);
        expect(NIST_PROVENANCE.citation).toMatch(/Kramida/);
        expect(NIST_PROVENANCE.manifest).toBe("internals/libs/data/MANIFEST.md");
    });

    it("carries nine species over three elements, with a checksum each", () => {
        expect(NIST_CATALOGUE_ELEMENTS).toEqual(["Ca", "Fe", "Si"]);
        // Three stages per element: the neutral, the ion and the doubly
        // ionised atom, which the Saha balance needs because nine per
        // cent of calcium is already in the third stage at 11 605 K.
        expect(NIST_SPECIES).toHaveLength(9);
        expect(NIST_SPECIES.filter((s) => s.ionisation === 2).map((s) => s.asdName)).toEqual(["Ca III", "Fe III", "Si III"]);
        for (const s of NIST_SPECIES) {
            expect(s.sourceSha256.lines).toMatch(/^[0-9a-f]{64}$/);
            expect(s.sourceSha256.levels).toMatch(/^[0-9a-f]{64}$/);
            expect(s.levels.length).toBeGreaterThan(50);
        }
    });

    it("gives every line what an emission calculation needs", () => {
        expect(NIST_LINE_CATALOGUE.length).toBeGreaterThan(7000);
        for (const l of NIST_LINE_CATALOGUE) {
            expect(l.verified).toBe(true);
            expect(l.wavelengthNm).toBeGreaterThanOrEqual(200);
            expect(l.wavelengthNm).toBeLessThanOrEqual(900);
            expect(l.transitionProbability).toBeGreaterThan(0);
            expect(l.upperLevelWeight).toBeGreaterThan(0);
            expect(typeof l.upperLevelEnergyEv).toBe("number");
        }
    });

    it("is sorted by wavelength, which the renderer relies on for nothing and a reader for everything", () => {
        for (let i = 1; i < NIST_LINE_CATALOGUE.length; i++) {
            expect(NIST_LINE_CATALOGUE[i].wavelengthNm).toBeGreaterThanOrEqual(NIST_LINE_CATALOGUE[i - 1].wavelengthNm);
        }
    });

    it("no longer blocks the physical model", () => {
        expect(physicalModeBlocker(NIST_LINE_CATALOGUE)).toBeNull();
    });

    it("has the ionisation energies the Saha balance needs", () => {
        expect(NIST_IONISATION_ENERGIES_EV["Ca I"]).toBeCloseTo(6.1132, 3);
        expect(NIST_IONISATION_ENERGIES_EV["Fe I"]).toBeCloseTo(7.9025, 3);
        expect(NIST_IONISATION_ENERGIES_EV["Si I"]).toBeCloseTo(8.1517, 3);
        // Second ionisation too, so a hotter plasma can be modelled later.
        expect(NIST_IONISATION_ENERGIES_EV["Ca II"]).toBeCloseTo(11.8717, 3);
    });

    it("carries the lines every LIBS operator looks for first", () => {
        const has = (element: string, ionisation: 0 | 1, nm: number, tolerance = 0.01): boolean =>
            (nistSpecies(element, ionisation)?.lines ?? []).some((l) => Math.abs(l.wavelengthNm - nm) < tolerance);
        // Ca II H and K, the strongest pair in a calcium spectrum.
        expect(has("Ca", 1, 393.366)).toBe(true);
        expect(has("Ca", 1, 396.847)).toBe(true);
        // Ca I resonance line.
        expect(has("Ca", 0, 422.673)).toBe(true);
        // Si I analytical line.
        expect(has("Si", 0, 251.611)).toBe(true);
    });
});
