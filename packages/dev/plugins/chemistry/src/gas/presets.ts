/**
 * V1 gas catalog — 12 common gases with their physico-chemical
 * constants at standard conditions (0 °C, 100 kPa unless noted).
 *
 * Sources: NIST WebBook, Engineering ToolBox cross-checked. Numerical
 * values are conservative engineering averages; precise values for
 * publication-quality work should be re-read from CODATA / NIST.
 *
 * Storage is canonical SI (kg/mol, kg/m³, J/(kg·K), W/(m·K), Pa·s).
 * The `GasNode.molarMassGperMol`, `.viscosityMicroPas`, etc. accessors
 * convert at the property-panel surface to the engineering-natural
 * units users actually write in.
 */

import { GasNode } from "./gas.node.js";

export interface IGasPreset {
    readonly typeId: string;
    readonly speciesId: string;
    readonly displayName: string;
    readonly formula: string;
    readonly casNumber: string;
    /** [kg/mol] */
    readonly molarMass: number;
    /** [kg/m³] at 0 °C / 100 kPa */
    readonly density: number;
    /** [J/(kg·K)] at constant pressure */
    readonly specificHeat: number;
    /** [W/(m·K)] at room T */
    readonly thermalConductivity: number;
    /** [Pa·s] at room T */
    readonly viscosity: number;

    // Pollutant attributes (P9.4 redesign). Optional: bulk gases
    // (N2, O2, ...) omit them; toxic and VOC presets set them.
    /** OEL TWA in ppm (8-hour time-weighted average). */
    readonly oelTwa?: number;
    /** OEL STEL in ppm (15-minute short-term exposure limit). */
    readonly oelStel?: number;
    /** IDLH in ppm (immediately dangerous to life or health). */
    readonly idlh?: number;
    /** Hazard tag: "voc" / "asphyxiant" / "irritant" / "carcinogen" /
     *  "corrosive". Empty / undefined for non-hazardous bulk gases. */
    readonly hazardClass?: string;
}

export const N2_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:n2",
    speciesId: "N2",
    displayName: "Nitrogen",
    formula: "N₂",
    casNumber: "7727-37-9",
    molarMass: 0.0280134,
    density: 1.2506,
    specificHeat: 1040,
    thermalConductivity: 0.0259,
    viscosity: 17.81e-6,
});

export const O2_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:o2",
    speciesId: "O2",
    displayName: "Oxygen",
    formula: "O₂",
    casNumber: "7782-44-7",
    molarMass: 0.0319988,
    density: 1.429,
    specificHeat: 918,
    thermalConductivity: 0.0263,
    viscosity: 20.55e-6,
});

export const CO2_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:co2",
    speciesId: "CO2",
    displayName: "Carbon dioxide",
    formula: "CO₂",
    casNumber: "124-38-9",
    molarMass: 0.0440095,
    density: 1.977,
    specificHeat: 844,
    thermalConductivity: 0.0166,
    viscosity: 14.91e-6,
});

export const H2O_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:h2o",
    speciesId: "H2O",
    displayName: "Water vapor",
    formula: "H₂O",
    casNumber: "7732-18-5",
    molarMass: 0.01801528,
    density: 0.804, // saturated vapor density at 100 °C
    specificHeat: 1996,
    thermalConductivity: 0.0182,
    viscosity: 9.85e-6,
});

export const AR_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:ar",
    speciesId: "Ar",
    displayName: "Argon",
    formula: "Ar",
    casNumber: "7440-37-1",
    molarMass: 0.039948,
    density: 1.784,
    specificHeat: 520,
    thermalConductivity: 0.01772,
    viscosity: 22.74e-6,
});

export const CH4_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:ch4",
    speciesId: "CH4",
    displayName: "Methane",
    formula: "CH₄",
    casNumber: "74-82-8",
    molarMass: 0.01604246,
    density: 0.717,
    specificHeat: 2226,
    thermalConductivity: 0.0341,
    viscosity: 11.0e-6,
});

export const CO_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:co",
    speciesId: "CO",
    displayName: "Carbon monoxide",
    formula: "CO",
    casNumber: "630-08-0",
    molarMass: 0.0280101,
    density: 1.250,
    specificHeat: 1041,
    thermalConductivity: 0.0250,
    viscosity: 17.5e-6,
    // Pollutant attributes — CO is a notorious asphyxiant.
    oelTwa: 25,
    idlh: 1200,
    hazardClass: "asphyxiant",
});

export const NH3_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:nh3",
    speciesId: "NH3",
    displayName: "Ammonia",
    formula: "NH₃",
    casNumber: "7664-41-7",
    molarMass: 0.01703052,
    density: 0.7710,
    specificHeat: 2097,
    thermalConductivity: 0.0247,
    viscosity: 10.07e-6,
    // Pollutant attributes — refrigerant leak tracer, corrosive.
    oelTwa: 25,
    oelStel: 35,
    idlh: 300,
    hazardClass: "corrosive",
});

export const HE_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:he",
    speciesId: "He",
    displayName: "Helium",
    formula: "He",
    casNumber: "7440-59-7",
    molarMass: 0.004002602,
    density: 0.1786,
    specificHeat: 5193,
    thermalConductivity: 0.1513,
    viscosity: 19.6e-6,
});

export const N2O_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:n2o",
    speciesId: "N2O",
    displayName: "Nitrous oxide",
    formula: "N₂O",
    casNumber: "10024-97-2",
    molarMass: 0.04401280,
    density: 1.9775,
    specificHeat: 872,
    thermalConductivity: 0.01757,
    viscosity: 14.6e-6,
});

export const NE_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:ne",
    speciesId: "Ne",
    displayName: "Neon",
    formula: "Ne",
    casNumber: "7440-01-9",
    molarMass: 0.0201797,
    density: 0.9002,
    specificHeat: 1030,
    thermalConductivity: 0.0491,
    viscosity: 31.1e-6,
});

export const XE_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:xe",
    speciesId: "Xe",
    displayName: "Xenon",
    formula: "Xe",
    casNumber: "7440-63-3",
    molarMass: 0.131293,
    density: 5.887,
    specificHeat: 158,
    thermalConductivity: 0.00569,
    viscosity: 23.0e-6,
});

// ─── VOC / pollutant presets (P9.4 redesign 2026-06-08) ──────────────
// These are GAS presets that happen to carry pollutant attributes.
// Pollutant-ness is an attribute on the gas itself (oelTwa / oelStel /
// idlh / hazardClass), not a separate node class — every entry below
// is still a regular `GasNode` consumed through the same wire-into-
// Composition pathway as the bulk species.

export const FORMALDEHYDE_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:formaldehyde",
    speciesId: "HCHO",
    displayName: "Formaldehyde",
    formula: "CH₂O",
    casNumber: "50-00-0",
    molarMass: 0.0300260,
    density: 1.34,
    specificHeat: 1170,
    thermalConductivity: 0.0237,
    viscosity: 10.0e-6,
    oelTwa: 0.75,
    oelStel: 2.0,
    idlh: 20,
    hazardClass: "irritant",
});

export const TOLUENE_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:toluene",
    speciesId: "C7H8",
    displayName: "Toluene",
    formula: "C₇H₈",
    casNumber: "108-88-3",
    molarMass: 0.0921384,
    density: 3.78,
    specificHeat: 1090,
    thermalConductivity: 0.013,
    viscosity: 6.9e-6,
    oelTwa: 20,
    idlh: 500,
    hazardClass: "voc",
});

export const BENZENE_PRESET: IGasPreset = Object.freeze({
    typeId: "Chemistry.Gas:benzene",
    speciesId: "C6H6",
    displayName: "Benzene",
    formula: "C₆H₆",
    casNumber: "71-43-2",
    molarMass: 0.0781118,
    density: 3.49,
    specificHeat: 1050,
    thermalConductivity: 0.0143,
    viscosity: 7.5e-6,
    oelTwa: 0.5,
    oelStel: 2.5,
    idlh: 500,
    hazardClass: "carcinogen",
});

export const GAS_PRESETS: ReadonlyArray<IGasPreset> = Object.freeze([
    N2_PRESET,
    O2_PRESET,
    CO2_PRESET,
    H2O_PRESET,
    AR_PRESET,
    CH4_PRESET,
    CO_PRESET,
    NH3_PRESET,
    HE_PRESET,
    N2O_PRESET,
    NE_PRESET,
    XE_PRESET,
    FORMALDEHYDE_PRESET,
    TOLUENE_PRESET,
    BENZENE_PRESET,
]);

/** Apply preset values to a freshly-constructed `GasNode`. Storage is
 *  canonical SI throughout; the engineering-units @editable accessors
 *  surface them in g/mol / μPa·s / etc. Pollutant attributes
 *  (oelTwa / oelStel / idlh / hazardClass) are seeded when the preset
 *  supplies them; bulk gases leave them at zero / empty. */
function applyPreset(node: GasNode, p: IGasPreset): GasNode {
    node.speciesId = p.speciesId;
    node.displayName = p.displayName;
    node.formula = p.formula;
    node.casNumber = p.casNumber;
    // Setting via the *Q accessors keeps the canonical-SI storage path
    // explicit and round-trips through the Quantity API.
    node.molarMassGperMol = p.molarMass * 1000;
    node.densityKgPerM3 = p.density;
    node.specificHeatJPerKgK = p.specificHeat;
    node.thermalConductivityWPerMK = p.thermalConductivity;
    node.viscosityMicroPas = p.viscosity * 1e6;
    if (typeof p.oelTwa === "number") node.oel_twa_ppm = p.oelTwa;
    if (typeof p.oelStel === "number") node.oel_stel_ppm = p.oelStel;
    if (typeof p.idlh === "number") node.idlh_ppm = p.idlh;
    if (typeof p.hazardClass === "string") node.hazard_class = p.hazardClass;
    return node;
}

export function createN2GasNode(): GasNode {
    return applyPreset(new GasNode(), N2_PRESET);
}
export function createO2GasNode(): GasNode {
    return applyPreset(new GasNode(), O2_PRESET);
}
export function createCO2GasNode(): GasNode {
    return applyPreset(new GasNode(), CO2_PRESET);
}
export function createH2OGasNode(): GasNode {
    return applyPreset(new GasNode(), H2O_PRESET);
}
export function createArGasNode(): GasNode {
    return applyPreset(new GasNode(), AR_PRESET);
}
export function createCH4GasNode(): GasNode {
    return applyPreset(new GasNode(), CH4_PRESET);
}
export function createCOGasNode(): GasNode {
    return applyPreset(new GasNode(), CO_PRESET);
}
export function createNH3GasNode(): GasNode {
    return applyPreset(new GasNode(), NH3_PRESET);
}
export function createHeGasNode(): GasNode {
    return applyPreset(new GasNode(), HE_PRESET);
}
export function createN2OGasNode(): GasNode {
    return applyPreset(new GasNode(), N2O_PRESET);
}
export function createNeGasNode(): GasNode {
    return applyPreset(new GasNode(), NE_PRESET);
}
export function createXeGasNode(): GasNode {
    return applyPreset(new GasNode(), XE_PRESET);
}

// ─── VOC factory functions (P9.4 redesign 2026-06-08) ────────────────

export function createFormaldehydeGasNode(): GasNode {
    return applyPreset(new GasNode(), FORMALDEHYDE_PRESET);
}
export function createTolueneGasNode(): GasNode {
    return applyPreset(new GasNode(), TOLUENE_PRESET);
}
export function createBenzeneGasNode(): GasNode {
    return applyPreset(new GasNode(), BENZENE_PRESET);
}
