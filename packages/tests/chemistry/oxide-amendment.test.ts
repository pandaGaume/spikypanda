/**
 * Correcting a published analysis without editing it.
 *
 * The fixture beside this test is a published composition table, and
 * four defects were found in it after it was transcribed: an iron row
 * under the wrong heading, four mixtures whose iron figure adds two
 * quantities that are not the same quantity, three mistyped cells and
 * one recipe naming the wrong component. All four are errors rather
 * than uncertainty, so they have to be corrected before anything is
 * fitted to the table, and none of them may be corrected by typing over
 * the published figure: a reader has to be able to see what was
 * published, what is used instead, and which document decided.
 *
 *   Regolith simulant dataset under simulated terrestrial and
 *   extraterrestrial conditions, Laser-induced Breakdown Spectroscopy.
 *   https://doi.org/10.5281/zenodo.21639060, CC BY 4.0.
 *
 * The corrections and their authority are
 * `internals/libs/16-GROUND-TRUTH-UNCERTAINTY.md` section 4, carried
 * into `fixtures/moon-regolith-simulants-oxides.amendments.tsv`. The
 * figures asserted below are that document's, not this test's: they are
 * the oracle, which is why the iron of the four unrepairable mixtures
 * appears here as the four numbers section 4.2 prints.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { amendOxideTable, applyOxideAmendments, elementWeightPercent, NOT_REPORTED, parseOxideAmendments, parseOxideTable } from "../../dev/plugins/chemistry/src";
import type { IOxideAmendment } from "../../dev/plugins/chemistry/src";

const fixture = (name: string) => readFileSync(join(__dirname, "fixtures", name), "utf8");
const TABLE_TEXT = fixture("moon-regolith-simulants-oxides.tsv");
const LEDGER_TEXT = fixture("moon-regolith-simulants-oxides.amendments.tsv");

const HEADER = ["kind", "sample", "oxide", "published", "corrected", "authority", "note"].join("\t");
const ledger = (...rows: string[]) => [HEADER, ...rows].join("\n");
const TOY = ["Sample\tA\tB", "SiO2\t50\t40", "FeO\t\t5"].join("\n");

describe("parseOxideAmendments", () => {
    it("reads a cell row by the names its header gives, not by position", () => {
        const r = parseOxideAmendments(["note\tauthority\tcorrected\tpublished\toxide\tsample\tkind", "why\tdoc 1\t3\t2\tSiO2\tA\tcell"].join("\n"));
        expect(r.errors).toEqual([]);
        expect(r.amendments[0]).toEqual({ kind: "cell", sample: "A", oxide: "SiO2", published: 2, corrected: 3, authority: "doc 1", note: "why" });
    });

    it("ignores comment lines and blank lines", () => {
        const r = parseOxideAmendments(["# why this file exists", "", HEADER, "", "cell\tA\tSiO2\t50\t51\tdoc 1\t", "#  cell\tA\tCaO\t1\t2\tdoc 1\t"].join("\n"));
        expect(r.errors).toEqual([]);
        expect(r.amendments).toHaveLength(1);
    });

    it("reads not-reported as the absence of a figure, on either side", () => {
        const r = parseOxideAmendments(ledger(`cell\tA\tFe2O3\t3.44\t${NOT_REPORTED}\tdoc 1\twithdrawn`, `cell\tA\tFeO\t${NOT_REPORTED}\t3.44\tdoc 1\twritten`));
        expect(r.errors).toEqual([]);
        expect(r.amendments.map((a) => [a.published, a.corrected])).toEqual([
            [3.44, null],
            [null, 3.44],
        ]);
    });

    it("refuses a row with no authority, because a change with none is an edit", () => {
        const r = parseOxideAmendments(ledger("cell\tA\tSiO2\t50\t51\t\tno authority"));
        expect(r.amendments).toEqual([]);
        expect(r.errors[0]).toMatch(/no authority named/);
    });

    it("refuses a row that amends nothing", () => {
        const r = parseOxideAmendments(ledger("cell\tA\tSiO2\t50\t50\tdoc 1\tsame figure twice"));
        expect(r.amendments).toEqual([]);
        expect(r.errors[0]).toMatch(/amends nothing/);
    });

    it("refuses an unknown kind, a non-formula oxide and a figure that is neither a number nor not-reported", () => {
        const r = parseOxideAmendments(
            ledger("fix\tA\tSiO2\t50\t51\tdoc 1\t", "cell\tA\tLOI\t2\t3\tdoc 1\t", "cell\tA\tSiO2\tabout 50\t51\tdoc 1\t", "cell\tA\tSiO2\t50\t-1\tdoc 1\t")
        );
        expect(r.amendments).toEqual([]);
        expect(r.errors).toHaveLength(4);
        expect(r.errors[0]).toMatch(/"fix" is not one of/);
        expect(r.errors[1]).toMatch(/"LOI" is not a formula/);
        expect(r.errors[2]).toMatch(/neither a number nor not-reported/);
        expect(r.errors[3]).toMatch(/negative/);
    });

    it("keeps a recipe or premise row, which carries a note and changes no figure", () => {
        const r = parseOxideAmendments(ledger("premise\tA\t-\t-\t-\tdoc 1\tasserted, never measured", "premise\tB\t-\t-\t-\tdoc 1\t"));
        expect(r.amendments).toEqual([{ kind: "premise", sample: "A", oxide: null, published: null, corrected: null, authority: "doc 1", note: "asserted, never measured" }]);
        expect(r.errors[0]).toMatch(/the note is empty/);
    });

    it("says so rather than throwing when the header is not a header", () => {
        expect(parseOxideAmendments("").errors).toEqual(["the ledger has no header row"]);
        expect(parseOxideAmendments("kind\tsample\toxide").errors[0]).toMatch(/missing the column or columns published, corrected, authority, note/);
    });
});

describe("applyOxideAmendments", () => {
    const amend = (...rows: string[]) => amendOxideTable(TOY, ledger(...rows), parseOxideTable);

    it("moves a figure from one heading to another without inventing one", () => {
        const r = amend(`cell\tB\tFeO\t5\t${NOT_REPORTED}\tdoc 1\twrong heading`, `cell\tB\tFe2O3\t${NOT_REPORTED}\t5\tdoc 1\tright heading`);
        expect(r.errors).toEqual([]);
        expect(r.samples[1].oxidesWeightPercent).toEqual({ SiO2: 40, Fe2O3: 5 });
        expect(r.samples[1].oxidesWeightPercent).not.toHaveProperty("FeO");
        // The heading it moved to joins the table's oxides, in the order
        // the ledger introduced it.
        expect(r.oxides).toEqual(["SiO2", "FeO", "Fe2O3"]);
    });

    it("refuses a row whose published figure is not what the table holds", () => {
        // The audit. A ledger that has stopped describing its table is
        // the one failure mode a silent edit would not have.
        const r = amend("cell\tA\tSiO2\t49\t51\tdoc 1\tmistyped published figure");
        expect(r.samples[0].oxidesWeightPercent.SiO2).toBe(50);
        expect(r.errors[0]).toMatch(/the table holds 50 where the ledger says 49 was published/);
    });

    it("tells a blank apart from a zero on both sides of that check", () => {
        const absent = amend("cell\tA\tFeO\t0\t1\tdoc 1\tthe table reports no FeO for A, which is not an FeO of zero");
        expect(absent.errors[0]).toMatch(/the table holds not-reported where the ledger says 0 was published/);
        const present = amend(`cell\tB\tFeO\t${NOT_REPORTED}\t1\tdoc 1\tB does report FeO`);
        expect(present.errors[0]).toMatch(/the table holds 5 where the ledger says not-reported was published/);
    });

    it("refuses a row naming a sample the table does not have, so a typo cannot pass silently", () => {
        const r = amend("cell\tC\tSiO2\t50\t51\tdoc 1\tno such sample");
        expect(r.errors[0]).toMatch(/the table has no sample "C"/);
    });

    it("refuses the same cell twice", () => {
        const r = amend("cell\tA\tSiO2\t50\t51\tdoc 1\tfirst", "cell\tA\tSiO2\t50\t52\tdoc 1\tsecond");
        expect(r.samples[0].oxidesWeightPercent.SiO2).toBe(51);
        expect(r.errors[0]).toMatch(/amended twice/);
    });

    it("forgives case, spacing and a zero read as the letter O in a sample name", () => {
        const table = parseOxideTable(["Sample\tNa2O- AL", "SiO2\t50"].join("\n"));
        const r = applyOxideAmendments(table, parseOxideAmendments(ledger("cell\tNA20-al\tSiO2\t50\t51\tdoc 1\tthe three files spell it three ways")).amendments);
        expect(r.errors).toEqual([]);
        expect(r.samples[0].oxidesWeightPercent.SiO2).toBe(51);
    });

    it("refuses to guess when two samples of one table read as the same name", () => {
        const table = parseOxideTable(["Sample\tNa2O-AL\tNa2O- al", "SiO2\t50\t40"].join("\n"));
        const r = applyOxideAmendments(table, parseOxideAmendments(ledger("cell\tNa2O-AL\tSiO2\t50\t51\tdoc 1\t")).amendments);
        expect(r.errors[0]).toMatch(/two samples whose names both read as "NA2O-AL"/);
        expect(r.samples[0].oxidesWeightPercent.SiO2).toBe(50);
    });

    it("carries the published total of the amended figures, the published one staying in the ledger", () => {
        const r = amend("cell\tA\tSiO2\t50\t45\tdoc 1\t");
        expect(r.samples[0].publishedTotalWeightPercent).toBe(45);
        expect(r.samples[0].amendments[0].published).toBe(50);
        expect(r.samples[0].amendments[0].authority).toBe("doc 1");
    });

    it("hangs a recipe or premise row on its own sample and changes nothing", () => {
        const r = amend("premise\tA\t-\t-\t-\tdoc 1\tasserted, never measured");
        expect(r.errors).toEqual([]);
        expect(r.samples[0].oxidesWeightPercent).toEqual({ SiO2: 50 });
        expect(r.samples[0].notes.map((n) => n.note)).toEqual(["asserted, never measured"]);
        expect(r.samples[1].notes).toEqual([]);
    });
});

describe("the lunar table, amended", () => {
    const published = parseOxideTable(TABLE_TEXT);
    const amended = amendOxideTable(TABLE_TEXT, LEDGER_TEXT, parseOxideTable);
    const sample = (name: string) => {
        const found = amended.samples.find((s) => s.name === name);
        if (!found) throw new Error(`the amended table has no sample "${name}"`);
        return found;
    };
    const MIXTURES = amended.samples.map((s) => s.name).filter((n) => !["LHS-1D", "LHS-1E", "LHS-1", "LMS-1D", "LMS-1", "Dusty"].includes(n));

    it("applies every row of the ledger to the table it describes", () => {
        expect(amended.errors).toEqual([]);
        expect(amended.samples).toHaveLength(21);
        expect(MIXTURES).toHaveLength(15);
        const applied = amended.samples.flatMap((s) => s.amendments);
        expect(applied).toHaveLength(amended.amendments.filter((a) => a.kind === "cell").length);
        for (const a of amended.amendments) expect(a.authority).toMatch(/^16-GROUND-TRUTH-UNCERTAINTY\.md section [34]/);
    });

    it("leaves the published table alone", () => {
        // The transcript of the publication is not touched by any of
        // this: it is read a second time here and still holds its own
        // figures, defects and all.
        expect(published.samples.filter((s) => "Fe2O3" in s.oxidesWeightPercent)).toHaveLength(16);
        expect(parseOxideTable(TABLE_TEXT).samples.find((s) => s.name === "MgO-Bl")!.oxidesWeightPercent).toEqual({
            SiO2: 49.89,
            Al2O3: 22.58,
            CaO: 10.58,
            Fe2O3: 4.67,
            K2O: 0.59,
            MgO: 8,
            MnO: 0.095,
            P2O5: 0.57,
            TiO2: 2.32,
            Na2O: 2.32,
        });
    });

    it("leaves LHS-1E the only sample reporting its iron as Fe2O3, section 4.1", () => {
        // The defect: fifteen mixtures held an FeO figure under an Fe2O3
        // heading. Afterwards the ferric heading belongs to the one
        // end-member that reports ferric iron, and to the four mixtures
        // built with it, which carry both because their components do.
        const ferric = amended.samples.filter((s) => "Fe2O3" in s.oxidesWeightPercent).map((s) => s.name);
        expect(ferric).toEqual(["LHS-1E", "SiO2-BL", "SiO2-DL", "K2O-AL", "TiO2-DL"]);
        for (const name of MIXTURES) expect(sample(name).oxidesWeightPercent).toHaveProperty("FeO");
    });

    it("gives the four mixtures built with LHS-1E the iron section 4.2 computed for them", () => {
        // Their published figure summed an FeO per cent and an Fe2O3 per
        // cent, so no reading of the heading recovers it. These four
        // numbers are the document's, in grams of iron per hundred grams
        // of material, and the ledger has to reproduce them.
        const iron = { "SiO2-BL": 2.219, "K2O-AL": 4.433, "TiO2-DL": 4.912, "SiO2-DL": 3.372 };
        for (const [name, expected] of Object.entries(iron)) {
            expect(elementWeightPercent(sample(name)).Fe).toBeCloseTo(expected, 3);
            // And the figure they published, which is neither: read as
            // FeO it is 3.8 to 5.4 % too much iron.
            const asPublished = elementWeightPercent(published.samples.find((s) => s.name === name)!).Fe;
            expect(Math.abs(asPublished - expected)).toBeGreaterThan(0.1);
        }
    });

    it("puts MgO-BL's row shift back and takes the lunar set's 101.6 wt % with it, section 4.3", () => {
        const shifted = sample("MgO-Bl");
        expect(shifted.oxidesWeightPercent.TiO2).toBe(0.571);
        expect(shifted.oxidesWeightPercent).not.toHaveProperty("P2O5");
        expect(shifted.oxidesWeightPercent.Na2O).toBe(2.32);
        expect(shifted.publishedTotalWeightPercent).toBeCloseTo(99.3, 2);
        // It was the highest total in the set and is now inside it.
        const totals = amended.samples.map((s) => s.publishedTotalWeightPercent);
        expect(Math.max(...totals)).toBeLessThan(100.1);
        expect(Math.min(...totals)).toBeGreaterThan(98);
    });

    it("corrects Na2O-AL's titanium cell, section 4.3", () => {
        expect(sample("Na2O- AL").oxidesWeightPercent.TiO2).toBe(0.557);
        expect(published.samples.find((s) => s.name === "Na2O- AL")!.oxidesWeightPercent.TiO2).toBe(0.29);
    });

    it("records SiO2-CL's recipe rather than changing its composition, section 4.4", () => {
        // The defect is in the recipe, not in the column: the published
        // analysis is explained by LHS-1D + Dusty, and nothing in this
        // table is wrong. A consumer mixing from the declared pair has
        // to be able to find that out from the sample itself.
        const siO2CL = sample("SiO2-CL");
        const recipe = siO2CL.notes.find((n) => n.kind === "recipe");
        expect(recipe?.note).toMatch(/LHS-1D \+ Dusty/);
        expect(recipe?.authority).toMatch(/section 4\.4/);
        const published4 = published.samples.find((s) => s.name === "SiO2-CL")!.oxidesWeightPercent;
        for (const [oxide, value] of Object.entries(published4)) {
            if (oxide === "Fe2O3") continue; // the iron heading, section 4.1
            expect(siO2CL.oxidesWeightPercent[oxide]).toBe(value);
        }
    });

    it("carries the twin premise with the samples it is about", () => {
        // LHS-1D and LMS-1D are given their parents' analyses, oxide for
        // oxide. That is asserted and untestable from inside the data
        // set, so it travels as a premise: a consumer that scores a model
        // against these twenty-one samples is scoring it against four
        // analyses, and must be able to see that without having read the
        // document.
        for (const [fine, parent] of [
            ["LHS-1D", "LHS-1"],
            ["LMS-1D", "LMS-1"],
        ]) {
            const premise = sample(fine).notes.find((n) => n.kind === "premise");
            expect(premise).toBeDefined();
            expect(premise!.note).toContain(`${parent}'s analysis`);
            expect(premise!.note).toMatch(/never measured/);
            // And the claim itself holds in the figures, which is why it
            // cannot be tested here: the two columns are one record.
            expect(sample(fine).oxidesWeightPercent).toEqual(sample(parent).oxidesWeightPercent);
        }
        const premises: IOxideAmendment[] = amended.amendments.filter((a) => a.kind === "premise");
        expect(premises.map((p) => p.sample)).toEqual(["LHS-1D", "LMS-1D"]);
    });
});
