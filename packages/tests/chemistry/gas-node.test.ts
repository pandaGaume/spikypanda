/**
 * Unit tests for `Chemistry.Gas:gas` (P9.1).
 *
 * Coverage:
 *   1. Default GasNode state implements IGasMetadata with sensible
 *      starter values (N2-like defaults).
 *   2. Quantity round-trip on storage path (set via Q, get via plain
 *      getter returns the expected SI scalar).
 *   3. Engineering-unit @editable accessors expose g/mol and μPa·s
 *      while storage stays canonical SI.
 *   4. Every preset factory produces a GasNode whose IGasMetadata
 *      fields match the documented constants.
 *   5. `isGasMetadata` guard accepts a configured GasNode, rejects
 *      missing-field and mis-typed payloads.
 */
import {
    Density,
    DynamicViscosity,
    isGasMetadata,
    MassSpecificHeat,
    MolarMass,
    ThermalConductivity,
} from "../../dev/core/src";
import {
    AR_PRESET,
    BENZENE_PRESET,
    CH4_PRESET,
    CO2_PRESET,
    CO_PRESET,
    FORMALDEHYDE_PRESET,
    GAS_PRESETS,
    GasNode,
    H2O_PRESET,
    HE_PRESET,
    N2O_PRESET,
    N2_PRESET,
    NE_PRESET,
    NH3_PRESET,
    O2_PRESET,
    TOLUENE_PRESET,
    XE_PRESET,
    createArGasNode,
    createBenzeneGasNode,
    createCH4GasNode,
    createCO2GasNode,
    createCOGasNode,
    createFormaldehydeGasNode,
    createGasNode,
    createH2OGasNode,
    createHeGasNode,
    createN2GasNode,
    createN2OGasNode,
    createNeGasNode,
    createNH3GasNode,
    createO2GasNode,
    createTolueneGasNode,
    createXeGasNode,
} from "../../dev/plugins/chemistry/src";
import type { IGasPreset } from "../../dev/plugins/chemistry/src";

// ─────────────────────────────────────────────────────────────────────
// 1. Defaults + IGasMetadata implementation
// ─────────────────────────────────────────────────────────────────────

describe("GasNode default state", () => {
    it("default constructor produces a usable IGasMetadata", () => {
        const gas = createGasNode();
        expect(typeof gas.speciesId).toBe("string");
        expect(gas.speciesId.length).toBeGreaterThan(0);
        expect(typeof gas.displayName).toBe("string");
        expect(gas.molarMass).toBeGreaterThan(0);
        expect(gas.density).toBeGreaterThanOrEqual(0);
        expect(gas.specificHeat).toBeGreaterThanOrEqual(0);
        expect(gas.thermalConductivity).toBeGreaterThanOrEqual(0);
        expect(gas.viscosity).toBeGreaterThanOrEqual(0);
    });

    it("speciesId is the chemistry identifier, NOT the editor UUID (no conflict with GraphItem.id)", () => {
        const gas = createN2GasNode();
        expect(gas.speciesId).toBe("N2");
        // The GraphItem base class's `id` field is independent.
        // No assertion on its value (it is editor-assigned), but
        // setting speciesId must NOT poison it.
        const before = gas.id;
        gas.speciesId = "NEW";
        expect(gas.id).toBe(before);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Quantity round-trips
// ─────────────────────────────────────────────────────────────────────

describe("GasNode Quantity round-trips", () => {
    it("molarMassQ setter accepts g/mol and stores canonical kg/mol", () => {
        const gas = createGasNode();
        gas.molarMassQ = new MolarMass(28.0134, MolarMass.Units.gpmol);
        expect(gas.molarMass).toBeCloseTo(0.0280134, 12);
        expect(gas.molarMassGperMol).toBeCloseTo(28.0134, 9);
    });

    it("densityQ setter accepts g/cm³ and stores canonical kg/m³", () => {
        const gas = createGasNode();
        gas.densityQ = new Density(1.225e-3, Density.Units.gpcm3); // air density-like
        expect(gas.density).toBeCloseTo(1.225, 9);
    });

    it("specificHeatQ setter accepts kJ/(kg·K) and stores J/(kg·K)", () => {
        const gas = createGasNode();
        gas.specificHeatQ = new MassSpecificHeat(1.005, MassSpecificHeat.Units.kJpkgK);
        expect(gas.specificHeat).toBeCloseTo(1005, 6);
    });

    it("thermalConductivityQ setter accepts mW/(m·K) and stores W/(m·K)", () => {
        const gas = createGasNode();
        gas.thermalConductivityQ = new ThermalConductivity(25.9, ThermalConductivity.Units.mWpmK);
        expect(gas.thermalConductivity).toBeCloseTo(0.0259, 9);
    });

    it("viscosityQ setter accepts μPa·s and stores Pa·s", () => {
        const gas = createGasNode();
        gas.viscosityQ = new DynamicViscosity(17.81, DynamicViscosity.Units.uPas);
        expect(gas.viscosity).toBeCloseTo(17.81e-6, 12);
        expect(gas.viscosityMicroPas).toBeCloseTo(17.81, 6);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Engineering @editable accessors
// ─────────────────────────────────────────────────────────────────────

describe("GasNode engineering-unit accessors", () => {
    it("molarMassGperMol surfaces 28.0134 for N2 (storage 0.0280134 kg/mol)", () => {
        const gas = createN2GasNode();
        expect(gas.molarMassGperMol).toBeCloseTo(28.0134, 6);
        expect(gas.molarMass).toBeCloseTo(0.0280134, 12);
    });

    it("viscosityMicroPas surfaces 17.81 for N2 (storage 1.781e-5 Pa·s)", () => {
        const gas = createN2GasNode();
        expect(gas.viscosityMicroPas).toBeCloseTo(17.81, 6);
        expect(gas.viscosity).toBeCloseTo(17.81e-6, 12);
    });

    it("editing molarMassGperMol updates the canonical molarMass storage", () => {
        const gas = createN2GasNode();
        gas.molarMassGperMol = 30;
        expect(gas.molarMass).toBeCloseTo(0.030, 12);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 4. Preset factories
// ─────────────────────────────────────────────────────────────────────

function assertPresetMatches(gas: GasNode, preset: IGasPreset): void {
    expect(gas.speciesId).toBe(preset.speciesId);
    expect(gas.displayName).toBe(preset.displayName);
    expect(gas.formula).toBe(preset.formula);
    expect(gas.casNumber).toBe(preset.casNumber);
    expect(gas.molarMass).toBeCloseTo(preset.molarMass, 9);
    expect(gas.density).toBeCloseTo(preset.density, 6);
    expect(gas.specificHeat).toBeCloseTo(preset.specificHeat, 6);
    expect(gas.thermalConductivity).toBeCloseTo(preset.thermalConductivity, 9);
    expect(gas.viscosity).toBeCloseTo(preset.viscosity, 12);
}

describe("GasNode presets — every catalog entry", () => {
    it("N2 preset round-trips its constants through the GasNode storage", () => {
        assertPresetMatches(createN2GasNode(), N2_PRESET);
    });
    it("O2 preset", () => assertPresetMatches(createO2GasNode(), O2_PRESET));
    it("CO2 preset", () => assertPresetMatches(createCO2GasNode(), CO2_PRESET));
    it("H2O preset", () => assertPresetMatches(createH2OGasNode(), H2O_PRESET));
    it("Ar preset", () => assertPresetMatches(createArGasNode(), AR_PRESET));
    it("CH4 preset", () => assertPresetMatches(createCH4GasNode(), CH4_PRESET));
    it("CO preset", () => assertPresetMatches(createCOGasNode(), CO_PRESET));
    it("NH3 preset", () => assertPresetMatches(createNH3GasNode(), NH3_PRESET));
    it("He preset", () => assertPresetMatches(createHeGasNode(), HE_PRESET));
    it("N2O preset", () => assertPresetMatches(createN2OGasNode(), N2O_PRESET));
    it("Ne preset", () => assertPresetMatches(createNeGasNode(), NE_PRESET));
    it("Xe preset", () => assertPresetMatches(createXeGasNode(), XE_PRESET));
    it("Formaldehyde preset", () => assertPresetMatches(createFormaldehydeGasNode(), FORMALDEHYDE_PRESET));
    it("Toluene preset", () => assertPresetMatches(createTolueneGasNode(), TOLUENE_PRESET));
    it("Benzene preset", () => assertPresetMatches(createBenzeneGasNode(), BENZENE_PRESET));

    it("GAS_PRESETS array enumerates 15 entries with unique speciesIds (12 bulk + 3 VOC)", () => {
        expect(GAS_PRESETS).toHaveLength(15);
        const ids = new Set(GAS_PRESETS.map((p) => p.speciesId));
        expect(ids.size).toBe(15);
    });

    it("every preset is frozen at the top level (Object.freeze applied)", () => {
        for (const preset of GAS_PRESETS) {
            expect(Object.isFrozen(preset)).toBe(true);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────
// 5. isGasMetadata guard
// ─────────────────────────────────────────────────────────────────────

describe("isGasMetadata structural guard", () => {
    it("accepts a configured GasNode", () => {
        expect(isGasMetadata(createN2GasNode())).toBe(true);
    });

    it("accepts a plain IGasMetadata-shaped object (duck-typing)", () => {
        expect(
            isGasMetadata({
                speciesId: "Xx",
                displayName: "Custom",
                molarMass: 0.05,
            }),
        ).toBe(true);
    });

    it("rejects null / undefined / non-object", () => {
        expect(isGasMetadata(null)).toBe(false);
        expect(isGasMetadata(undefined)).toBe(false);
        expect(isGasMetadata(42)).toBe(false);
        expect(isGasMetadata("N2")).toBe(false);
    });

    it("rejects objects missing required fields", () => {
        expect(isGasMetadata({ speciesId: "X", displayName: "X" })).toBe(false); // no molarMass
        expect(isGasMetadata({ displayName: "X", molarMass: 0.02 })).toBe(false); // no speciesId
        expect(isGasMetadata({ speciesId: "", displayName: "X", molarMass: 0.02 })).toBe(false); // empty speciesId
        expect(isGasMetadata({ speciesId: "X", displayName: "X", molarMass: 0 })).toBe(false); // molarMass <= 0
        expect(isGasMetadata({ speciesId: "X", displayName: "X", molarMass: NaN })).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 6. Pollutant-as-attribute (P9.4 redesign 2026-06-08)
// ─────────────────────────────────────────────────────────────────────
//
// Pollutant-ness is an ATTRIBUTE on the gas, not a separate node class.
// Toxic bulk gases (CO, NH3) and VOC trace species (formaldehyde,
// toluene, benzene) all live in the Gas catalog as ordinary GasNode
// presets with the toxicology block populated. The `isPollutant`
// getter on the node and the standalone `isPollutantGas(g)` guard
// from core return true when any OEL / IDLH > 0 or hazardClass is set.

describe("GasNode pollutant attributes", () => {
    it("default GasNode is NOT a pollutant (no OEL / IDLH / hazard set)", () => {
        const gas = createGasNode();
        expect(gas.isPollutant).toBe(false);
        expect(gas.oelTwa).toBeUndefined();
        expect(gas.oelStel).toBeUndefined();
        expect(gas.idlh).toBeUndefined();
        expect(gas.hazardClass).toBeUndefined();
    });

    it("bulk gases (N2, O2, CO2, H2O, Ar) carry NO pollutant attributes", () => {
        for (const g of [createN2GasNode(), createO2GasNode(), createCO2GasNode(), createH2OGasNode(), createArGasNode()]) {
            expect(g.isPollutant).toBe(false);
        }
    });

    it("CO gas preset carries NIOSH toxicology (oelTwa=25 ppm, idlh=1200 ppm, asphyxiant)", () => {
        const co = createCOGasNode();
        expect(co.isPollutant).toBe(true);
        expect(co.oelTwa).toBe(25);
        expect(co.idlh).toBe(1200);
        expect(co.hazardClass).toBe("asphyxiant");
    });

    it("NH3 gas preset carries toxicology (oelTwa=25, oelStel=35, idlh=300, corrosive)", () => {
        const nh3 = createNH3GasNode();
        expect(nh3.isPollutant).toBe(true);
        expect(nh3.oelTwa).toBe(25);
        expect(nh3.oelStel).toBe(35);
        expect(nh3.idlh).toBe(300);
        expect(nh3.hazardClass).toBe("corrosive");
    });

    it("formaldehyde gas preset is a pollutant (irritant, oelTwa=0.75 ppm)", () => {
        const hcho = createFormaldehydeGasNode();
        expect(hcho.isPollutant).toBe(true);
        expect(hcho.speciesId).toBe("HCHO");
        expect(hcho.oelTwa).toBe(0.75);
        expect(hcho.oelStel).toBe(2.0);
        expect(hcho.idlh).toBe(20);
        expect(hcho.hazardClass).toBe("irritant");
    });

    it("benzene gas preset is a carcinogen", () => {
        const b = createBenzeneGasNode();
        expect(b.isPollutant).toBe(true);
        expect(b.hazardClass).toBe("carcinogen");
        expect(b.idlh).toBe(500);
    });

    it("toluene gas preset is a voc (no STEL by default)", () => {
        const t = createTolueneGasNode();
        expect(t.isPollutant).toBe(true);
        expect(t.hazardClass).toBe("voc");
        expect(t.oelStel).toBeUndefined();
    });

    it("setting any OEL or hazardClass flips isPollutant true", () => {
        const gas = createGasNode();
        expect(gas.isPollutant).toBe(false);
        gas.oel_twa_ppm = 10;
        expect(gas.isPollutant).toBe(true);
        gas.oel_twa_ppm = 0;
        gas.hazard_class = "voc";
        expect(gas.isPollutant).toBe(true);
        gas.hazard_class = "";
        expect(gas.isPollutant).toBe(false);
    });

    it("isPollutantGas guard from core agrees with GasNode.isPollutant", () => {
        const { isPollutantGas } = jest.requireActual("../../dev/core/src") as {
            isPollutantGas: (g: { oelTwa?: number; oelStel?: number; idlh?: number; hazardClass?: string }) => boolean;
        };
        expect(isPollutantGas(createN2GasNode())).toBe(false);
        expect(isPollutantGas(createCOGasNode())).toBe(true);
        expect(isPollutantGas(createBenzeneGasNode())).toBe(true);
    });
});
