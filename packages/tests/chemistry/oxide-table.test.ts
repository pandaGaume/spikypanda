/**
 * Reading a published oxide analysis into a material.
 *
 * The fixture is not invented: it is the lunar half of the composition
 * table of a published LIBS calibration set, carried here unchanged so
 * the parser is tested against the real layout rather than a tidied
 * version of it.
 *
 *   Regolith simulant dataset under simulated terrestrial and
 *   extraterrestrial conditions, Laser-induced Breakdown Spectroscopy.
 *   https://doi.org/10.5281/zenodo.21639060, CC BY 4.0.
 *
 * Why it earns a test of its own rather than a glance: the table has
 * three traps that a tidied fixture would hide. Oxides are left blank
 * where they were not reported, and a blank is not a zero. Iron is
 * split between Fe2O3 and FeO, reported for different samples, so the
 * element has to be assembled from two rows. And the analyses do not
 * add up to a hundred, which decides whether a sample can be used at
 * all.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseChemicalFormula, resolveElementalComposition } from "spikypanda-core";
import { oxideComponents, oxideComponentsLine, parseOxideTable } from "../../dev/plugins/chemistry/src";
import { parseComponentList } from "../../dev/plugins/chemistry/src";

const TABLE = readFileSync(join(__dirname, "fixtures", "moon-regolith-simulants-oxides.tsv"), "utf8");

describe("parseOxideTable, on a synthetic table", () => {
    it("reads oxides down the rows and samples across the columns", () => {
        const r = parseOxideTable(["Sample\tA\tB", "SiO2\t50\t40", "CaO\t10\t20"].join("\n"));
        expect(r.errors).toEqual([]);
        expect(r.oxides).toEqual(["SiO2", "CaO"]);
        expect(r.samples.map((s) => s.name)).toEqual(["A", "B"]);
        expect(r.samples[0].oxidesWeightPercent).toEqual({ SiO2: 50, CaO: 10 });
        expect(r.samples[0].publishedTotalWeightPercent).toBe(60);
    });

    it("treats a blank cell as not reported, not as zero", () => {
        // The distinction is the whole point: an oxide absent from the
        // record cannot be confused with one measured at zero, and a
        // sample's published total must not count it.
        const r = parseOxideTable(["Sample\tA\tB", "SiO2\t50\t40", "FeO\t\t5"].join("\n"));
        expect(r.samples[0].oxidesWeightPercent).not.toHaveProperty("FeO");
        expect(r.samples[1].oxidesWeightPercent.FeO).toBe(5);
        expect(r.samples[0].publishedTotalWeightPercent).toBe(50);
    });

    it("keeps a reported zero", () => {
        const r = parseOxideTable(["Sample\tA", "SiO2\t50", "FeO\t0"].join("\n"));
        expect(r.samples[0].oxidesWeightPercent.FeO).toBe(0);
    });

    it("reports a bad cell and keeps the rest of the table", () => {
        const r = parseOxideTable(["Sample\tA\tB", "SiO2\t50\tnot-a-number", "CaO\t10\t20"].join("\n"));
        expect(r.errors).toHaveLength(1);
        expect(r.errors[0]).toMatch(/B, SiO2/);
        expect(r.samples[1].oxidesWeightPercent).toEqual({ CaO: 20 });
    });

    it("refuses a negative weight per cent", () => {
        const r = parseOxideTable(["Sample\tA", "SiO2\t-1"].join("\n"));
        expect(r.errors[0]).toMatch(/negative/);
    });

    it("reports a row that is not a formula instead of guessing", () => {
        const r = parseOxideTable(["Sample\tA", "SiO2\t50", "LOI\t2"].join("\n"));
        expect(r.oxides).toEqual(["SiO2"]);
        expect(r.errors[0]).toMatch(/LOI/);
    });

    it("says so rather than throwing when there is no data", () => {
        expect(parseOxideTable("").errors).toEqual(["the table has no data row"]);
        expect(parseOxideTable("Sample\tA").errors).toEqual(["the table has no data row"]);
    });
});

describe("parseOxideTable, on the published lunar table", () => {
    const result = parseOxideTable(TABLE);

    it("reads every sample and every oxide without an error", () => {
        expect(result.errors).toEqual([]);
        expect(result.samples).toHaveLength(21);
        expect(result.oxides).toEqual(["SiO2", "Al2O3", "CaO", "Fe2O3", "K2O", "MgO", "MnO", "P2O5", "TiO2", "SO3", "Na2O", "Cr2O3", "FeO"]);
    });

    it("gives analyses that close, which is what makes this subset usable", () => {
        // The lunar analyses add up; the martian half of the same
        // publication does not, running down to 88 wt %, and that is
        // why only this half is used for anything quantitative. See
        // internals/libs/data/README.md section 2 bis.
        const totals = result.samples.map((s) => s.publishedTotalWeightPercent);
        expect(Math.min(...totals)).toBeGreaterThan(98);
        expect(Math.max(...totals)).toBeLessThan(102);
    });

    it("carries iron from both of the rows that report it", () => {
        // Fe2O3 is given for sixteen samples and FeO for five, and a
        // sample may carry either. Whichever it is, the element has to
        // come out as iron.
        const withFerric = result.samples.filter((s) => "Fe2O3" in s.oxidesWeightPercent);
        const withFerrous = result.samples.filter((s) => "FeO" in s.oxidesWeightPercent);
        expect(withFerric.length).toBeGreaterThan(10);
        expect(withFerrous.length).toBeGreaterThan(0);

        for (const sample of [withFerric[0], withFerrous[0]]) {
            const resolved = resolveElementalComposition(oxideComponents(sample), "mass");
            expect(resolved.moleFractions.Fe).toBeGreaterThan(0);
        }
    });

    it("turns a sample into a component line the material node accepts", () => {
        const sample = result.samples.find((s) => s.name === "LHS-1")!;
        const line = oxideComponentsLine(sample);
        expect(line).toMatch(/SiO2:51\.2/);

        // The round trip is the point: what comes out of a published
        // table goes into the editor's own field with nothing retyped.
        const parsed = parseComponentList(line);
        expect(parsed.error).toBeNull();
        expect(parsed.components.map((c) => c.formula)).toEqual(Object.keys(sample.oxidesWeightPercent));
    });

    it("resolves the elements a LIBS spectrum of these samples will show", () => {
        const sample = result.samples.find((s) => s.name === "LHS-1")!;
        const resolved = resolveElementalComposition(oxideComponents(sample), "mass");

        // Oxygen dominates by atom count in any silicate, which is why
        // a spectrum of one of these is unreadable without oxygen in
        // the line catalogue.
        const byAtom = Object.entries(resolved.moleFractions).sort((a, b) => b[1] - a[1]);
        expect(byAtom[0][0]).toBe("O");
        expect(byAtom[0][1]).toBeGreaterThan(0.55);

        // And aluminium outranks every metal but silicon in this
        // sample, which is the reason the catalogue had to grow beyond
        // calcium, iron and silicon.
        const rank = byAtom.map(([el]) => el);
        expect(rank.indexOf("Al")).toBeLessThan(rank.indexOf("Ca"));
        expect(rank.indexOf("Al")).toBeLessThan(rank.indexOf("Fe"));

        // Every element the analysis names comes through, and nothing
        // else appears. The expected set is derived from the sample's
        // own oxides rather than written out, because which oxides a
        // sample reports varies across the table: chromium is reported
        // for one sample of the twenty-one, sulfur for a handful.
        const named = new Set<string>();
        for (const oxide of Object.keys(sample.oxidesWeightPercent)) {
            for (const element of Object.keys(parseChemicalFormula(oxide).counts)) named.add(element);
        }
        expect(new Set(rank)).toEqual(named);
    });
});
