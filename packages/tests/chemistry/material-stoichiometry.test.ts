/**
 * Stoichiometry of a condensed-matter composition: formula parsing,
 * element mass fractions inside a compound, and the mass / mole basis
 * resolution of a whole material.
 *
 * The test that matters most is the first one of section 3: a mass
 * fraction of Fe2O3 must NOT be read as a mass fraction of Fe. The
 * factor between the two is 0.6994, and a model fed the wrong one looks
 * broken for reasons that have nothing to do with the model.
 *
 * Coverage:
 *   1. Parsing: simple, with counts, with groups, and every refusal.
 *   2. Mass fractions inside one compound.
 *   3. Material resolution on a mass basis, including the brief's
 *      SiO2 / Fe2O3 / CaCO3 / MgO scenario.
 *   4. Material resolution on a mole basis, and the fact that the two
 *      bases disagree for the same numbers.
 *   5. Degenerate inputs: empty, all-zero, non-normalised, negative.
 */
import { CHEMICAL_ELEMENTS, ChemicalFormulaError, elementMassFractionsOf, elementMolarMass, isKnownElement, parseChemicalFormula, resolveElementalComposition } from "../../dev/core/src";

// ─────────────────────────────────────────────────────────────────────
// 1. Parsing
// ─────────────────────────────────────────────────────────────────────

describe("parseChemicalFormula", () => {
    it("reads a bare element", () => {
        const p = parseChemicalFormula("Fe");
        expect(p.counts).toEqual({ Fe: 1 });
        expect(p.molarMass).toBeCloseTo(55.845e-3, 12);
    });

    it("reads counts", () => {
        expect(parseChemicalFormula("Fe2O3").counts).toEqual({ Fe: 2, O: 3 });
        expect(parseChemicalFormula("SiO2").counts).toEqual({ Si: 1, O: 2 });
        expect(parseChemicalFormula("CaCO3").counts).toEqual({ Ca: 1, C: 1, O: 3 });
    });

    it("reads a two-letter symbol as one element, not two", () => {
        // "Co" is cobalt. Reading it as C + O would be a silent disaster.
        expect(parseChemicalFormula("Co").counts).toEqual({ Co: 1 });
        expect(parseChemicalFormula("CO").counts).toEqual({ C: 1, O: 1 });
    });

    it("expands groups with a multiplier", () => {
        expect(parseChemicalFormula("Ca(OH)2").counts).toEqual({ Ca: 1, O: 2, H: 2 });
        expect(parseChemicalFormula("Al2(SO4)3").counts).toEqual({ Al: 2, S: 3, O: 12 });
    });

    it("sums a repeated element instead of overwriting it", () => {
        expect(parseChemicalFormula("CH3COOH").counts).toEqual({ C: 2, H: 4, O: 2 });
    });

    it("computes the molar mass of a compound", () => {
        // Fe2O3 = 2 x 55.845 + 3 x 15.999 = 159.687 g/mol
        expect(parseChemicalFormula("Fe2O3").molarMass).toBeCloseTo(159.687e-3, 9);
    });

    it.each([
        ["", "empty formula"],
        ["Xx2", "unknown element"],
        ["Fe0", "zero atom count"],
        ["Ca(OH2", "unbalanced opening bracket"],
        ["CaOH)2", "unbalanced closing bracket"],
        ["CuSO4·5H2O", "unexpected character"],
        ["SO4^2-", "unexpected character"],
        ["fe2o3", "unexpected character"],
    ])("refuses %p", (formula, fragment) => {
        expect(() => parseChemicalFormula(formula)).toThrow(ChemicalFormulaError);
        expect(() => parseChemicalFormula(formula)).toThrow(new RegExp(fragment));
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Inside one compound
// ─────────────────────────────────────────────────────────────────────

describe("elementMassFractionsOf", () => {
    it("splits Fe2O3 into 69.94 % Fe and 30.06 % O", () => {
        const f = elementMassFractionsOf("Fe2O3");
        expect(f.Fe).toBeCloseTo(0.6994, 4);
        expect(f.O).toBeCloseTo(0.3006, 4);
        expect(f.Fe + f.O).toBeCloseTo(1, 12);
    });

    it("splits SiO2 into 46.74 % Si and 53.26 % O", () => {
        const f = elementMassFractionsOf("SiO2");
        expect(f.Si).toBeCloseTo(0.4674, 4);
        expect(f.O).toBeCloseTo(0.5326, 4);
    });

    it("gives a pure element a fraction of exactly 1", () => {
        expect(elementMassFractionsOf("Ca").Ca).toBe(1);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Mass basis
// ─────────────────────────────────────────────────────────────────────

describe("resolveElementalComposition, mass basis", () => {
    it("does NOT confuse a mass fraction of Fe2O3 with one of Fe", () => {
        const asOxide = resolveElementalComposition([{ formula: "Fe2O3", fraction: 1 }], "mass");
        expect(asOxide.massFractions.Fe).toBeCloseTo(0.6994, 4);
        expect(asOxide.massFractions.O).toBeCloseTo(0.3006, 4);

        const asMetal = resolveElementalComposition([{ formula: "Fe", fraction: 1 }], "mass");
        expect(asMetal.massFractions.Fe).toBe(1);
        expect(asMetal.massFractions.O).toBeUndefined();

        // The ratio between the two readings of "20 % iron oxide" is the
        // 1.43 error this test exists to prevent.
        expect(1 / asOxide.massFractions.Fe).toBeCloseTo(1.43, 2);
    });

    it("resolves the brief's four-oxide scenario", () => {
        // 60 % SiO2, 20 % Fe2O3, 15 % CaCO3, 5 % MgO, by mass.
        const c = resolveElementalComposition(
            [
                { formula: "SiO2", fraction: 0.6 },
                { formula: "Fe2O3", fraction: 0.2 },
                { formula: "CaCO3", fraction: 0.15 },
                { formula: "MgO", fraction: 0.05 },
            ],
            "mass"
        );

        expect(c.inputFractionSum).toBeCloseTo(1, 12);
        // Elements are ordered by atomic number, not by input order.
        expect(c.elements).toEqual(["C", "O", "Mg", "Si", "Ca", "Fe"]);

        // Hand-checked values: Si = 0.6 x 0.4674, Fe = 0.2 x 0.6994,
        // Ca = 0.15 x 0.4004, Mg = 0.05 x 0.6030.
        expect(c.massFractions.Si).toBeCloseTo(0.2804, 3);
        expect(c.massFractions.Fe).toBeCloseTo(0.1399, 3);
        expect(c.massFractions.Ca).toBeCloseTo(0.0601, 3);
        expect(c.massFractions.Mg).toBeCloseTo(0.0302, 3);
        expect(c.massFractions.C).toBeCloseTo(0.018, 3);

        const sum = Object.values(c.massFractions).reduce((s, v) => s + v, 0);
        expect(sum).toBeCloseTo(1, 12);
    });

    it("keeps oxygen from every oxide, not just the first", () => {
        const c = resolveElementalComposition(
            [
                { formula: "SiO2", fraction: 0.5 },
                { formula: "MgO", fraction: 0.5 },
            ],
            "mass"
        );
        // O comes from both components: 0.5 x 0.5326 + 0.5 x 0.3970.
        expect(c.massFractions.O).toBeCloseTo(0.4648, 3);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Mole basis
// ─────────────────────────────────────────────────────────────────────

describe("resolveElementalComposition, mole basis", () => {
    it("counts atoms, so a 50/50 mole mix of SiO2 and MgO is not 50/50 in mass", () => {
        const byMole = resolveElementalComposition(
            [
                { formula: "SiO2", fraction: 0.5 },
                { formula: "MgO", fraction: 0.5 },
            ],
            "mole"
        );
        const byMass = resolveElementalComposition(
            [
                { formula: "SiO2", fraction: 0.5 },
                { formula: "MgO", fraction: 0.5 },
            ],
            "mass"
        );

        // Same numbers, two different materials. If these were equal the
        // basis would be being ignored somewhere.
        expect(byMole.massFractions.Si).not.toBeCloseTo(byMass.massFractions.Si, 3);

        // Atom bookkeeping on the mole basis: 0.5 SiO2 + 0.5 MgO gives
        // 0.5 Si, 0.5 Mg, 1.5 O over 2.5 atoms total.
        expect(byMole.moleFractions.Si).toBeCloseTo(0.2, 12);
        expect(byMole.moleFractions.Mg).toBeCloseTo(0.2, 12);
        expect(byMole.moleFractions.O).toBeCloseTo(0.6, 12);
    });

    it("reports the mass vector of a mole-basis material consistently", () => {
        const c = resolveElementalComposition([{ formula: "Fe2O3", fraction: 1 }], "mole");
        // One mole of Fe2O3 is 2 mol Fe and 3 mol O, whatever the basis.
        expect(c.moleFractions.Fe).toBeCloseTo(0.4, 12);
        expect(c.moleFractions.O).toBeCloseTo(0.6, 12);
        // And its mass split is the compound's own split.
        expect(c.massFractions.Fe).toBeCloseTo(0.6994, 4);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Degenerate inputs
// ─────────────────────────────────────────────────────────────────────

describe("resolveElementalComposition, degenerate inputs", () => {
    it("returns empty vectors for an empty material", () => {
        const c = resolveElementalComposition([], "mass");
        expect(c.elements).toEqual([]);
        expect(c.inputFractionSum).toBe(0);
    });

    it("normalises fractions that do not sum to 1, and says so", () => {
        const c = resolveElementalComposition(
            [
                { formula: "Fe", fraction: 30 },
                { formula: "Ni", fraction: 70 },
            ],
            "mass"
        );
        expect(c.inputFractionSum).toBe(100);
        expect(c.massFractions.Fe).toBeCloseTo(0.3, 12);
        expect(c.massFractions.Ni).toBeCloseTo(0.7, 12);
    });

    it("still validates a zeroed component's formula", () => {
        expect(() => resolveElementalComposition([{ formula: "Zz", fraction: 0 }], "mass")).toThrow(ChemicalFormulaError);
    });

    it("refuses a negative fraction", () => {
        expect(() => resolveElementalComposition([{ formula: "Fe", fraction: -0.1 }], "mass")).toThrow(/negative fraction/);
    });

    it("refuses a non-finite fraction", () => {
        expect(() => resolveElementalComposition([{ formula: "Fe", fraction: Number.NaN }], "mass")).toThrow(/non-finite/);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 6. The element table itself
// ─────────────────────────────────────────────────────────────────────

describe("CHEMICAL_ELEMENTS", () => {
    it("is keyed by its own symbols and carries SI molar masses", () => {
        for (const [key, e] of Object.entries(CHEMICAL_ELEMENTS)) {
            expect(e.symbol).toBe(key);
            // kg/mol, so every element sits between 1e-3 and 0.3.
            expect(e.molarMass).toBeGreaterThan(1e-4);
            expect(e.molarMass).toBeLessThan(0.3);
            expect(e.atomicNumber).toBeGreaterThan(0);
        }
    });

    it("has unique atomic numbers", () => {
        const numbers = Object.values(CHEMICAL_ELEMENTS).map((e) => e.atomicNumber);
        expect(new Set(numbers).size).toBe(numbers.length);
    });

    it("answers membership without guessing", () => {
        expect(isKnownElement("Fe")).toBe(true);
        expect(isKnownElement("Xx")).toBe(false);
        expect(elementMolarMass("Xx")).toBeUndefined();
    });
});
