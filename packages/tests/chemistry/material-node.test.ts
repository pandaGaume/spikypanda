/**
 * Unit tests for `Chemistry.Material:material`.
 *
 * Coverage:
 *   1. Defaults and the published spec of an empty material.
 *   2. The one-line component syntax, including `%` and `=`.
 *   3. Resolution of the brief's oxide mix, through the node.
 *   4. `specVersion` as the "something changed" signal.
 *   5. Soft failure: a malformed formula reports instead of throwing,
 *      and publishes empty vectors rather than a guess.
 *   6. Basis handling, and the refusal to apply a nonsense basis.
 *   7. Component manipulation API.
 *   8. The duck-typed guard a consumer uses.
 */
import {
    createCalciumMagnesiumMaterialNode,
    createMaterialNode,
    createPureCalciumMaterialNode,
    createTestOxideMixMaterialNode,
    formatComponentList,
    isMaterialSpec,
    MATERIAL_OUT,
    MATERIAL_PRESETS,
    parseComponentList,
} from "../../dev/plugins/chemistry/src";

// ─────────────────────────────────────────────────────────────────────
// 1. Defaults
// ─────────────────────────────────────────────────────────────────────

describe("MaterialNode defaults", () => {
    it("starts empty, on a mass basis, with no error", () => {
        const m = createMaterialNode();
        expect(m.basis).toBe("mass");
        expect(m.components).toBe("");
        expect(m.component_count).toBe(0);
        expect(m.element_count).toBe(0);
        expect(m.resolution_error).toBe("");
        expect(m.spec.elements).toEqual([]);
    });

    it("declares one output port and no input", () => {
        const m = createMaterialNode();
        expect(m.inputPorts).toEqual([]);
        expect(m.outputPorts).toEqual([{ slot: MATERIAL_OUT, optional: false, type: "any" }]);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. The component syntax
// ─────────────────────────────────────────────────────────────────────

describe("parseComponentList", () => {
    it("reads formula:fraction pairs", () => {
        const { components, error } = parseComponentList("SiO2:0.6, Fe2O3:0.2");
        expect(error).toBeNull();
        expect(components).toEqual([
            { formula: "SiO2", fraction: 0.6 },
            { formula: "Fe2O3", fraction: 0.2 },
        ]);
    });

    it("accepts = as a separator and tolerates whitespace and a trailing comma", () => {
        const { components, error } = parseComponentList("  Fe = 0.7 ,  Ni=0.3 , ");
        expect(error).toBeNull();
        expect(components).toEqual([
            { formula: "Fe", fraction: 0.7 },
            { formula: "Ni", fraction: 0.3 },
        ]);
    });

    it("reads a percent sign as a hundredth", () => {
        const { components } = parseComponentList("SiO2:60%, Fe2O3:40%");
        expect(components[0].fraction).toBeCloseTo(0.6, 12);
        expect(components[1].fraction).toBeCloseTo(0.4, 12);
    });

    it("reports a malformed entry instead of guessing", () => {
        expect(parseComponentList("SiO2 0.6").error).toMatch(/not "formula:fraction"/);
        expect(parseComponentList("SiO2:abc").error).toMatch(/not a number/);
    });

    it("round-trips through formatComponentList", () => {
        const text = "SiO2:0.6, Fe2O3:0.2";
        expect(formatComponentList(parseComponentList(text).components)).toBe(text);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Resolution through the node
// ─────────────────────────────────────────────────────────────────────

describe("MaterialNode resolution", () => {
    it("resolves the brief's oxide mix to elemental mass fractions", () => {
        const m = createTestOxideMixMaterialNode();
        const spec = m.spec;

        expect(spec.resolutionError).toBeNull();
        expect(spec.basis).toBe("mass");
        expect(spec.components).toHaveLength(4);
        expect(spec.elements).toEqual(["C", "O", "Mg", "Si", "Ca", "Fe"]);

        expect(spec.massFractions.Fe).toBeCloseTo(0.1399, 3);
        expect(spec.massFractions.Si).toBeCloseTo(0.2804, 3);
        expect(spec.massFractions.Ca).toBeCloseTo(0.0601, 3);
        expect(spec.massFractions.Mg).toBeCloseTo(0.0302, 3);

        const sum = Object.values(spec.massFractions).reduce((s, v) => s + v, 0);
        expect(sum).toBeCloseTo(1, 12);
    });

    it("keeps the user's statement next to the resolved vector", () => {
        const m = createTestOxideMixMaterialNode();
        // 20 % Fe2O3 declared, 13.99 % Fe resolved: both readable, never
        // conflated.
        expect(m.spec.components.find((c) => c.formula === "Fe2O3")?.fraction).toBe(0.2);
        expect(m.spec.massFractions.Fe).toBeCloseTo(0.1399, 3);
    });

    it("summarises the resolution for the property panel", () => {
        const m = createPureCalciumMaterialNode();
        expect(m.resolved_mass_fractions).toBe("Ca:100.00%");
    });

    it("carries the preset provenance", () => {
        const m = createTestOxideMixMaterialNode();
        expect(m.spec.provenance).toMatch(/NOT a reference rock/);
    });

    it("ships three presets, all synthetic and all resolvable", () => {
        expect(MATERIAL_PRESETS).toHaveLength(3);
        for (const p of MATERIAL_PRESETS) {
            expect(p.provenance).toMatch(/synthetic|scenario/);
        }
        expect(createCalciumMagnesiumMaterialNode().spec.massFractions.Ca).toBeCloseTo(0.7, 12);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Change signalling
// ─────────────────────────────────────────────────────────────────────

describe("MaterialNode specVersion", () => {
    it("increments on an edit and keeps the spec stable otherwise", () => {
        const m = createMaterialNode();
        const v0 = m.spec.specVersion;
        // Reading twice must not bump anything: a consumer reads every tick.
        expect(m.spec.specVersion).toBe(v0);
        expect(m.spec).toBe(m.spec);

        m.components = "Fe:1";
        const v1 = m.spec.specVersion;
        expect(v1).toBeGreaterThan(v0);

        m.basis = "mole";
        expect(m.spec.specVersion).toBeGreaterThan(v1);
    });

    it("publishes a frozen spec", () => {
        const spec = createPureCalciumMaterialNode().spec;
        expect(Object.isFrozen(spec)).toBe(true);
        expect(Object.isFrozen(spec.massFractions)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 5. Soft failure
// ─────────────────────────────────────────────────────────────────────

describe("MaterialNode error handling", () => {
    it("does not throw on a malformed formula, and publishes nothing usable", () => {
        const m = createMaterialNode();
        expect(() => {
            m.components = "Zz2:0.5, Fe:0.5";
        }).not.toThrow();

        expect(m.resolution_error).toMatch(/unknown element "Zz"/);
        expect(m.spec.elements).toEqual([]);
        expect(m.spec.components).toEqual([]);
        expect(m.spec.massFractions).toEqual({});
    });

    it("recovers once the formula is fixed", () => {
        const m = createMaterialNode();
        m.components = "Zz:1";
        expect(m.resolution_error).not.toBe("");
        m.components = "Fe:1";
        expect(m.resolution_error).toBe("");
        expect(m.spec.massFractions.Fe).toBe(1);
    });

    it("reports a half-typed component without losing the text", () => {
        const m = createMaterialNode();
        m.components = "SiO2:";
        // `Number("")` is 0, so without an explicit check this would
        // have become a silent zero-fraction component.
        expect(m.resolution_error).toMatch(/missing its number/);
        expect(m.components).toBe("SiO2:");
        expect(m.spec.elements).toEqual([]);

        m.components = ":0.6";
        expect(m.resolution_error).toMatch(/missing its formula/);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 6. Basis
// ─────────────────────────────────────────────────────────────────────

describe("MaterialNode basis", () => {
    it("gives two different materials for the same numbers", () => {
        const byMass = createMaterialNode();
        byMass.components = "SiO2:0.5, MgO:0.5";
        const siByMass = byMass.spec.massFractions.Si;

        const byMole = createMaterialNode();
        byMole.basis = "mole";
        byMole.components = "SiO2:0.5, MgO:0.5";

        expect(byMole.spec.massFractions.Si).not.toBeCloseTo(siByMass, 3);
    });

    it("ignores a basis it does not know", () => {
        const m = createMaterialNode();
        m.basis = "volume" as never;
        expect(m.basis).toBe("mass");
    });
});

// ─────────────────────────────────────────────────────────────────────
// 7. Component manipulation
// ─────────────────────────────────────────────────────────────────────

describe("MaterialNode component API", () => {
    it("upserts, replaces and removes", () => {
        const m = createMaterialNode();
        m.setComponents([{ formula: "Fe", fraction: 0.8 }]);
        expect(m.component_count).toBe(1);

        m.upsertComponent({ formula: "Cr", fraction: 0.2 });
        expect(m.component_count).toBe(2);

        m.upsertComponent({ formula: "Cr", fraction: 0.18 });
        expect(m.component_count).toBe(2);
        expect(m.spec.components.find((c) => c.formula === "Cr")?.fraction).toBe(0.18);

        m.removeComponent("Cr");
        expect(m.component_count).toBe(1);
        m.removeComponent("Cr");
        expect(m.component_count).toBe(1);
    });

    it("normalises a list that does not sum to 1, and says so", () => {
        const m = createMaterialNode();
        m.setComponents([
            { formula: "Fe", fraction: 70 },
            { formula: "Cr", fraction: 18 },
            { formula: "Ni", fraction: 12 },
        ]);
        expect(m.input_fraction_sum).toBe(100);
        expect(m.spec.massFractions.Fe).toBeCloseTo(0.7, 12);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 8. The consumer's guard
// ─────────────────────────────────────────────────────────────────────

describe("isMaterialSpec", () => {
    it("accepts a published spec and rejects anything else", () => {
        expect(isMaterialSpec(createPureCalciumMaterialNode().spec)).toBe(true);
        expect(isMaterialSpec(null)).toBe(false);
        expect(isMaterialSpec(42)).toBe(false);
        expect(isMaterialSpec({ basis: "mass" })).toBe(false);
        expect(isMaterialSpec({ specVersion: 1, basis: "volume", components: [], massFractions: {} })).toBe(false);
    });
});
