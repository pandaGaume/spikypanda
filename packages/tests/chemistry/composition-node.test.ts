/**
 * Unit tests for `Chemistry.Composition:composition` (P9.2).
 *
 * Coverage:
 *   1. Empty composition defaults (custom preset, 1 atm reference,
 *      zero components).
 *   2. Component manipulation API — setComponents / upsertComponent /
 *      removeComponent / findComponent.
 *   3. Aggregate viewables — componentCount / totalMoleFraction /
 *      averageMolarMass (including the empty-mixture sentinel).
 *   4. Preset factories produce expected component lists with the
 *      documented reference pressures.
 *   5. Mole fractions for non-vacuum presets sum to ≈ 1.
 *   6. bindGas — wired GasNode metadata flows into the matching
 *      component; missing species are appended.
 *   7. Quantity-aware reference-pressure accessor round-trips.
 */
import { Pressure, type IGasMetadata } from "../../dev/core/src";
import {
    COMPOSITION_PRESETS,
    EARTH_DRY_AIR_PRESET,
    EARTH_HUMID_AIR_PRESET,
    ISS_CABIN_PRESET,
    MARS_ATMOSPHERE_PRESET,
    createCompositionNode,
    createEarthDryAirCompositionNode,
    createEarthHumidAirCompositionNode,
    createIssCabinCompositionNode,
    createMarsAtmosphereCompositionNode,
    createVacuumCompositionNode,
    createN2GasNode,
} from "../../dev/plugins/chemistry/src";

// ─────────────────────────────────────────────────────────────────────
// 1. Defaults
// ─────────────────────────────────────────────────────────────────────

describe("CompositionNode defaults", () => {
    it("constructor produces an empty custom composition", () => {
        const comp = createCompositionNode();
        expect(comp.presetId).toBe("custom");
        expect(comp.displayName).toBe("Composition");
        expect(comp.referencePressurePa).toBe(101325);
        expect(comp.componentCount).toBe(0);
        expect(comp.totalMoleFraction).toBe(0);
        expect(comp.averageMolarMass).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Component manipulation
// ─────────────────────────────────────────────────────────────────────

describe("CompositionNode component manipulation", () => {
    it("setComponents replaces the entire list", () => {
        const comp = createCompositionNode();
        comp.setComponents([
            { speciesId: "N2", moleFraction: 0.8, molarMass: 0.028 },
            { speciesId: "O2", moleFraction: 0.2, molarMass: 0.032 },
        ]);
        expect(comp.componentCount).toBe(2);
        expect(comp.findComponent("N2")?.moleFraction).toBeCloseTo(0.8, 9);
        expect(comp.findComponent("O2")?.moleFraction).toBeCloseTo(0.2, 9);
    });

    it("upsertComponent appends a new species or updates the existing one", () => {
        const comp = createCompositionNode();
        comp.upsertComponent({ speciesId: "N2", moleFraction: 0.5, molarMass: 0.028 });
        expect(comp.componentCount).toBe(1);
        comp.upsertComponent({ speciesId: "O2", moleFraction: 0.5, molarMass: 0.032 });
        expect(comp.componentCount).toBe(2);
        comp.upsertComponent({ speciesId: "N2", moleFraction: 0.78, molarMass: 0.028 });
        expect(comp.componentCount).toBe(2);
        expect(comp.findComponent("N2")?.moleFraction).toBeCloseTo(0.78, 9);
    });

    it("removeComponent drops a species and is a no-op on absent ones", () => {
        const comp = createEarthHumidAirCompositionNode();
        const before = comp.componentCount;
        comp.removeComponent("H2O");
        expect(comp.componentCount).toBe(before - 1);
        expect(comp.findComponent("H2O")).toBeUndefined();
        // No-op on a species that never existed.
        comp.removeComponent("Xe");
        expect(comp.componentCount).toBe(before - 1);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Aggregate viewables
// ─────────────────────────────────────────────────────────────────────

describe("CompositionNode aggregate viewables", () => {
    it("totalMoleFraction sums every component's mole fraction", () => {
        const comp = createCompositionNode();
        comp.setComponents([
            { speciesId: "N2", moleFraction: 0.78, molarMass: 0.028 },
            { speciesId: "O2", moleFraction: 0.21, molarMass: 0.032 },
            { speciesId: "Ar", moleFraction: 0.01, molarMass: 0.040 },
        ]);
        expect(comp.totalMoleFraction).toBeCloseTo(1, 9);
    });

    it("averageMolarMass returns the mole-fraction-weighted SI value", () => {
        const comp = createCompositionNode();
        // Pure O2 → average = O2 molar mass.
        comp.setComponents([{ speciesId: "O2", moleFraction: 1, molarMass: 0.0319988 }]);
        expect(comp.averageMolarMass).toBeCloseTo(0.0319988, 9);
        // 50/50 N2/O2 → ((0.028 + 0.032) / 2) = 0.030
        comp.setComponents([
            { speciesId: "N2", moleFraction: 0.5, molarMass: 0.028 },
            { speciesId: "O2", moleFraction: 0.5, molarMass: 0.032 },
        ]);
        expect(comp.averageMolarMass).toBeCloseTo(0.030, 9);
    });

    it("averageMolarMass returns 0 for an empty mixture (vacuum sentinel)", () => {
        const comp = createVacuumCompositionNode();
        expect(comp.componentCount).toBe(0);
        expect(comp.averageMolarMass).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Preset factories
// ─────────────────────────────────────────────────────────────────────

describe("CompositionNode preset factories", () => {
    it("Earth humid air preset has 5 components at 1 atm reference", () => {
        const comp = createEarthHumidAirCompositionNode();
        expect(comp.presetId).toBe("earthHumidAirSeaLevel");
        expect(comp.componentCount).toBe(5);
        expect(comp.referencePressurePa).toBe(101325);
        for (const sp of ["N2", "O2", "CO2", "H2O", "Ar"]) {
            expect(comp.findComponent(sp)).toBeDefined();
        }
    });

    it("Earth dry air preset omits H2O", () => {
        const comp = createEarthDryAirCompositionNode();
        expect(comp.componentCount).toBe(4);
        expect(comp.findComponent("H2O")).toBeUndefined();
    });

    it("Mars preset has CO2 as the dominant species", () => {
        const comp = createMarsAtmosphereCompositionNode();
        expect(comp.referencePressurePa).toBe(600);
        const co2 = comp.findComponent("CO2");
        expect(co2?.moleFraction).toBeGreaterThan(0.9);
    });

    it("ISS cabin preset has CO2 at ECLSS cap (~3000 ppm)", () => {
        const comp = createIssCabinCompositionNode();
        const co2 = comp.findComponent("CO2");
        expect(co2?.moleFraction).toBeCloseTo(0.003, 6);
    });

    it("Vacuum preset has 0 components and 0 Pa reference pressure", () => {
        const comp = createVacuumCompositionNode();
        expect(comp.componentCount).toBe(0);
        expect(comp.referencePressurePa).toBe(0);
        expect(comp.totalMoleFraction).toBe(0);
    });

    it("every non-vacuum preset has mole fractions that sum to ≈ 1", () => {
        for (const preset of [
            EARTH_HUMID_AIR_PRESET,
            EARTH_DRY_AIR_PRESET,
            MARS_ATMOSPHERE_PRESET,
            ISS_CABIN_PRESET,
        ]) {
            const sum = preset.components.reduce((s, c) => s + c.moleFraction, 0);
            expect(sum).toBeGreaterThanOrEqual(0.99);
            expect(sum).toBeLessThanOrEqual(1.01);
        }
    });

    it("COMPOSITION_PRESETS array enumerates exactly 5 entries", () => {
        expect(COMPOSITION_PRESETS).toHaveLength(5);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 5. bindGas — wired-GasNode metadata sync
// ─────────────────────────────────────────────────────────────────────

describe("CompositionNode.bindGas", () => {
    it("refreshes molarMass + gasItemId on a matching component without touching its mole fraction", () => {
        const comp = createEarthHumidAirCompositionNode();
        const n2 = comp.findComponent("N2")!;
        const originalMoleFraction = n2.moleFraction;
        const gas = createN2GasNode();
        comp.bindGas("gas-item-1", gas as IGasMetadata);
        const refreshed = comp.findComponent("N2")!;
        expect(refreshed.gasItemId).toBe("gas-item-1");
        expect(refreshed.molarMass).toBeCloseTo(gas.molarMass, 9);
        expect(refreshed.moleFraction).toBeCloseTo(originalMoleFraction, 9);
    });

    it("appends a new component when wiring a gas whose species is not present yet", () => {
        const comp = createEarthDryAirCompositionNode();
        const before = comp.componentCount;
        expect(comp.findComponent("H2O")).toBeUndefined();
        comp.bindGas("gas-h2o", { speciesId: "H2O", displayName: "Water", molarMass: 0.01801528 });
        expect(comp.componentCount).toBe(before + 1);
        expect(comp.findComponent("H2O")).toBeDefined();
        expect(comp.findComponent("H2O")?.moleFraction).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 6. Quantity-aware reference pressure
// ─────────────────────────────────────────────────────────────────────

describe("CompositionNode reference-pressure Quantity", () => {
    it("referencePressureQ setter accepts atm and stores Pa", () => {
        const comp = createCompositionNode();
        comp.referencePressureQ = new Pressure(1, Pressure.Units.atm);
        expect(comp.referencePressurePa).toBeCloseTo(101325, 6);
    });

    it("referencePressureQ setter accepts mbar and stores Pa (Mars ≈ 6 mbar)", () => {
        const comp = createCompositionNode();
        comp.referencePressureQ = new Pressure(6, Pressure.Units.mbar);
        expect(comp.referencePressurePa).toBeCloseTo(600, 6);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 7. Particulate bindings (2026-06-08)
// ─────────────────────────────────────────────────────────────────────
//
// Composition is the single point for everything a layer holds:
// gases AND particulates. The session-builder routes Particulate →
// Composition (not → Layer). Reset-each-sync semantic: the builder
// calls clearParticulates() at the start of each sync pass before
// re-binding from current canvas wirings.

function particulateMock(particulateId: string) {
    return {
        particulateId,
        displayName: particulateId,
        characteristicDiameter: 1e-5,
        density: 1500,
        pmClass: "pm10",
    };
}

describe("CompositionNode particulate bindings", () => {
    it("starts with an empty particulates list", () => {
        const comp = createCompositionNode();
        expect(comp.particulates).toEqual([]);
    });

    it("bindParticulate appends in wiring order", () => {
        const comp = createCompositionNode();
        comp.bindParticulate("pm10-uuid", particulateMock("pm10"));
        comp.bindParticulate("pm2_5-uuid", particulateMock("pm2_5"));
        expect(comp.particulates.length).toBe(2);
        expect(comp.particulates[0].particulateId).toBe("pm10");
        expect(comp.particulates[1].particulateId).toBe("pm2_5");
    });

    it("clearParticulates wipes the bound list (reset-each-sync semantic)", () => {
        const comp = createCompositionNode();
        comp.bindParticulate("pm10-uuid", particulateMock("pm10"));
        comp.bindParticulate("pm2_5-uuid", particulateMock("pm2_5"));
        comp.clearParticulates();
        expect(comp.particulates).toEqual([]);
    });

    it("clearParticulates does NOT affect bound gas components (gases stay bind-additive)", () => {
        const comp = createCompositionNode();
        comp.upsertComponent({ speciesId: "N2", moleFraction: 0.5, molarMass: 0.0280134 });
        comp.bindParticulate("pm10-uuid", particulateMock("pm10"));
        comp.clearParticulates();
        expect(comp.particulates).toEqual([]);
        expect(comp.components.length).toBe(1);
        expect(comp.components[0].speciesId).toBe("N2");
    });
});
