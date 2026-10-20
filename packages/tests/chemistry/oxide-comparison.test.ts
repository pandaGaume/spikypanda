/**
 * Confronting two published analyses of one material.
 *
 * The three traps of a real composition table are the subject here, not
 * the arithmetic. A blank must not become a zero when two tables are
 * subtracted. Iron reported as Fe2O3 against iron reported as FeO must
 * come out equal when the sample is the same, which only happens if the
 * comparison goes through the element. And a mixture computed from the
 * masses weighed out must say how much of its own mass it had an
 * analysis for, because a part that kept silent about an oxide is not a
 * part that measured zero.
 *
 * The fixture is the lunar half of the composition table of the
 * published LIBS calibration set that `oxide-table.test.ts` already
 * carries:
 *
 *   Regolith simulant dataset under simulated terrestrial and
 *   extraterrestrial conditions, Laser-induced Breakdown Spectroscopy.
 *   https://doi.org/10.5281/zenodo.21639060, CC BY 4.0.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { compareWeightPercent, elementWeightPercent, mixByMass, parseOxideTable } from "../../dev/plugins/chemistry/src";
import type { IOxideTableSample } from "../../dev/plugins/chemistry/src";

const TABLE = parseOxideTable(readFileSync(join(__dirname, "fixtures", "moon-regolith-simulants-oxides.tsv"), "utf8"));

/** One sample of the fixture, by the name the table gives it. */
function sample(name: string): IOxideTableSample {
    const found = TABLE.samples.find((s) => s.name === name);
    if (!found) throw new Error(`the fixture has no sample "${name}"`);
    return found;
}

/** An analysis made up on the spot, for the cases the fixture cannot show. */
function made(name: string, oxidesWeightPercent: Record<string, number>): IOxideTableSample {
    return { name, oxidesWeightPercent, publishedTotalWeightPercent: Object.values(oxidesWeightPercent).reduce((a, b) => a + b, 0) };
}

describe("compareWeightPercent", () => {
    it("gives the difference in percentage points and relative to the pair", () => {
        const c = compareWeightPercent({ SiO2: 51.2, CaO: 12.8 }, { SiO2: 50.2, CaO: 12.8 });
        const silica = c.differences.find((d) => d.key === "SiO2");
        expect(silica?.difference).toBeCloseTo(1.0, 12);
        // The denominator is the mean of the two, not either one: both
        // routes are claims of equal standing.
        expect(silica?.relativeDifference).toBeCloseTo(1.0 / 50.7, 12);
        expect(c.comparable).toEqual(["CaO", "SiO2"]);
        expect(c.worstKey).toBe("SiO2");
        expect(c.maximumAbsoluteDifference).toBeCloseTo(1.0, 12);
        expect(c.medianAbsoluteDifference).toBeCloseTo(0.5, 12);
    });

    it("refuses to compare a key only one route reported", () => {
        // The whole point: 3.44 against a blank is not a difference of
        // 3.44, it is a question nobody answered.
        const c = compareWeightPercent({ SiO2: 50, Fe2O3: 3.44 }, { SiO2: 50, FeO: 2.7 });
        expect(c.comparable).toEqual(["SiO2"]);
        expect(c.onlyInA).toEqual(["Fe2O3"]);
        expect(c.onlyInB).toEqual(["FeO"]);
        expect(c.differences.find((d) => d.key === "Fe2O3")?.difference).toBeNull();
        expect(c.differences.find((d) => d.key === "FeO")?.relativeDifference).toBeNull();
        expect(c.maximumAbsoluteDifference).toBe(0);
    });

    it("keeps a reported zero as a comparable figure", () => {
        const c = compareWeightPercent({ SO3: 0 }, { SO3: 0.1 });
        expect(c.comparable).toEqual(["SO3"]);
        expect(c.differences[0].difference).toBeCloseTo(-0.1, 12);
        expect(c.differences[0].relativeDifference).toBeCloseTo(-2, 12);
    });

    it("carries both published totals without normalising either", () => {
        // 88 % and 98 % must stay 88 % and 98 % here: the decision about
        // the missing mass belongs to the caller.
        const c = compareWeightPercent({ SiO2: 50, CaO: 38.3 }, { SiO2: 50, CaO: 48.1 });
        expect(c.totalA).toBeCloseTo(88.3, 12);
        expect(c.totalB).toBeCloseTo(98.1, 12);
    });

    it("puts the worst disagreement first and the silent keys last", () => {
        const c = compareWeightPercent({ SiO2: 50, CaO: 10, MgO: 1 }, { SiO2: 52, CaO: 10.5 });
        expect(c.differences.map((d) => d.key)).toEqual(["SiO2", "CaO", "MgO"]);
    });

    it("reports nothing comparable as NaN rather than as zero", () => {
        const c = compareWeightPercent({ SiO2: 50 }, { CaO: 10 });
        expect(c.comparable).toEqual([]);
        expect(c.medianAbsoluteDifference).toBeNaN();
        expect(c.maximumAbsoluteDifference).toBeNaN();
        expect(c.rootMeanSquareDifference).toBeNaN();
        expect(c.worstKey).toBeNull();
    });
});

describe("elementWeightPercent", () => {
    it("gives grams of the element per hundred grams of material, unnormalised", () => {
        // Pure Fe2O3 at 100 wt % is 69.94 % iron by mass, so an analysis
        // reporting 10 % Fe2O3 carries 6.994 g of iron per hundred grams.
        const e = elementWeightPercent(made("one oxide", { Fe2O3: 10 }));
        expect(e.Fe).toBeCloseTo(6.9943, 3);
        expect(e.O).toBeCloseTo(3.0057, 3);
        expect(e.Fe + e.O).toBeCloseTo(10, 9);
    });

    it("adds the oxygen of every oxide into one figure", () => {
        const e = elementWeightPercent(made("two oxides", { SiO2: 50, CaO: 10 }));
        expect(e.O).toBeCloseTo(50 * 0.53256 + 10 * 0.28534, 2);
        expect(Object.keys(e).sort()).toEqual(["Ca", "O", "Si"]);
    });

    it("makes an Fe2O3 analysis and an FeO analysis of the same sample agree", () => {
        // The trap this exists for. 3.0 wt % Fe2O3 holds the same iron as
        // 2.6986 wt % FeO; the two numbers look like a 10 % disagreement
        // on the oxide and are the same measurement on the element.
        const asFerric = elementWeightPercent(made("ferric", { Fe2O3: 3.0 }));
        const asFerrous = elementWeightPercent(made("ferrous", { FeO: asFerric.Fe / 0.777305 }));
        const c = compareWeightPercent(asFerric, asFerrous);
        expect(c.comparable).toContain("Fe");
        expect(Math.abs(c.differences.find((d) => d.key === "Fe")?.difference as number)).toBeLessThan(1e-3);
        // On the oxide basis the same pair shares no iron key at all.
        const onOxides = compareWeightPercent({ Fe2O3: 3.0 }, { FeO: asFerric.Fe / 0.777305 });
        expect(onOxides.comparable).toEqual([]);
    });

    it("sums back to the published total", () => {
        const lhs1 = sample("LHS-1");
        const e = elementWeightPercent(lhs1);
        expect(Object.values(e).reduce((a, b) => a + b, 0)).toBeCloseTo(lhs1.publishedTotalWeightPercent, 9);
    });
});

describe("mixByMass", () => {
    it("weights each part by its mass, not by its count", () => {
        const m = mixByMass(
            [
                { sample: made("A", { SiO2: 50 }), massGrams: 7.14 },
                { sample: made("B", { SiO2: 40 }), massGrams: 22.86 },
            ],
            "A+B"
        );
        expect(m.totalMassGrams).toBeCloseTo(30, 12);
        expect(m.oxidesWeightPercent.SiO2).toBeCloseTo((7.14 * 50 + 22.86 * 40) / 30, 12);
        expect(m.oxideCoverage.SiO2).toBeCloseTo(1, 12);
    });

    it("records how much of the mass had an analysis for each oxide", () => {
        // Only one part reports SO3, so the computed SO3 is a lower
        // bound and the coverage says by how much it could be short.
        const m = mixByMass(
            [
                { sample: made("quiet", { SiO2: 50 }), massGrams: 10 },
                { sample: made("talkative", { SiO2: 40, SO3: 0.3 }), massGrams: 30 },
            ],
            "quiet+talkative"
        );
        expect(m.oxideCoverage.SiO2).toBeCloseTo(1, 12);
        expect(m.oxideCoverage.SO3).toBeCloseTo(0.75, 12);
        expect(m.oxidesWeightPercent.SO3).toBeCloseTo(0.225, 12);
    });

    it("leaves an oxide no part reported out of the mixture entirely", () => {
        const m = mixByMass(
            [
                { sample: made("A", { SiO2: 50 }), massGrams: 1 },
                { sample: made("B", { SiO2: 40 }), massGrams: 1 },
            ],
            "A+B"
        );
        expect(m.oxidesWeightPercent).not.toHaveProperty("Cr2O3");
        expect(m.oxideCoverage).not.toHaveProperty("Cr2O3");
    });

    it("mixes iron correctly only on the element basis", () => {
        // One part reports its iron as FeO and the other as Fe2O3, which
        // is the real case in the fixture. The oxide mixture then shows
        // two half-filled iron rows; the element mixture shows one iron
        // figure, and it is the one that adds up.
        const ferrous = made("ferrous", { SiO2: 48, FeO: 7.47 });
        const ferric = made("ferric", { SiO2: 47, Fe2O3: 3.44 });
        const m = mixByMass(
            [
                { sample: ferrous, massGrams: 10 },
                { sample: ferric, massGrams: 10 },
            ],
            "ferrous+ferric"
        );
        expect(m.oxideCoverage.FeO).toBeCloseTo(0.5, 12);
        expect(m.oxideCoverage.Fe2O3).toBeCloseTo(0.5, 12);

        const expectedIron = (elementWeightPercent(ferrous).Fe + elementWeightPercent(ferric).Fe) / 2;
        expect(elementWeightPercent(m).Fe).toBeCloseTo(expectedIron, 9);
    });

    it("reproduces a part exactly when it is the only one", () => {
        const lhs1 = sample("LHS-1");
        const m = mixByMass([{ sample: lhs1, massGrams: 30 }], "LHS-1 alone");
        expect(m.oxidesWeightPercent).toEqual(lhs1.oxidesWeightPercent);
        expect(m.publishedTotalWeightPercent).toBeCloseTo(lhs1.publishedTotalWeightPercent, 9);
    });

    it("refuses a negative mass and a mixture that weighs nothing", () => {
        const a = made("A", { SiO2: 50 });
        expect(() => mixByMass([{ sample: a, massGrams: -1 }], "bad")).toThrow(/has mass -1 g/);
        expect(() => mixByMass([{ sample: a, massGrams: 0 }], "empty")).toThrow(/weigh nothing/);
        expect(() => mixByMass([], "nothing")).toThrow(/at least one part/);
    });
});

describe("the fixture's own samples", () => {
    it("has the six end-members the mixtures are built from", () => {
        for (const name of ["LHS-1D", "LHS-1E", "LHS-1", "LMS-1D", "LMS-1", "Dusty"]) {
            expect(TABLE.samples.map((s) => s.name)).toContain(name);
        }
    });

    it("reports iron as FeO for five end-members and as Fe2O3 for the sixth", () => {
        for (const name of ["LHS-1D", "LHS-1", "LMS-1D", "LMS-1", "Dusty"]) {
            expect(sample(name).oxidesWeightPercent).toHaveProperty("FeO");
            expect(sample(name).oxidesWeightPercent).not.toHaveProperty("Fe2O3");
        }
        expect(sample("LHS-1E").oxidesWeightPercent).toHaveProperty("Fe2O3");
        expect(sample("LHS-1E").oxidesWeightPercent).not.toHaveProperty("FeO");
    });
});
