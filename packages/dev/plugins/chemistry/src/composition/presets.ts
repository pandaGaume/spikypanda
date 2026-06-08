/**
 * Composition presets — five canonical mixtures the user can drop
 * one-click on the canvas. Component lists are baked inline (species
 * id, mole fraction, molar mass) so the composition is self-contained
 * — no `Chemistry.Gas:*` instances need to be on the canvas for the
 * preset to function.
 *
 * Mole fractions sum to ≈ 1 by design (the user-facing slot displays
 * `totalMoleFraction` to spot drift). Molar masses are CODATA-style
 * values aligned with the V1 GasNode catalog (P9.1); presets and
 * gas nodes therefore agree on every species' mass without runtime
 * lookup.
 *
 * Sources:
 *   - Earth dry / humid air: U.S. Standard Atmosphere + 50% RH at 20 °C.
 *   - Mars: Mars Climate Database mean.
 *   - ISS cabin: ECLSS spec, CO2 cap at 3000 ppm.
 *   - Vacuum: no species. Atmosphere starts at zero mass / pressure.
 */

import { CompositionNode, type ICompositionComponent } from "./composition.node.js";

export interface ICompositionPreset {
    readonly typeId: string;
    readonly presetId: string;
    readonly displayName: string;
    readonly description: string;
    /** Reference total pressure [Pa] used by the atmosphere to seed
     *  initial mass via ideal gas. 0 for the vacuum preset. */
    readonly referencePressurePa: number;
    /** Component list, baked inline. Sum of mole fractions ≈ 1
     *  (vacuum has length 0). */
    readonly components: ReadonlyArray<ICompositionComponent>;
}

// Canonical V1 molar masses (kg/mol), aligned with chemistry/src/gas/presets.ts.
const M_N2 = 0.0280134;
const M_O2 = 0.0319988;
const M_CO2 = 0.0440095;
const M_H2O = 0.01801528;
const M_Ar = 0.039948;

export const EARTH_HUMID_AIR_PRESET: ICompositionPreset = Object.freeze({
    typeId: "Chemistry.Composition:earth-humid-air",
    presetId: "earthHumidAirSeaLevel",
    displayName: "Earth air, sea level (humid)",
    description: "ICAO standard atmosphere at sea level, 20 °C, ~50% RH.",
    referencePressurePa: 101325,
    components: Object.freeze([
        Object.freeze({ speciesId: "N2", moleFraction: 0.7715, molarMass: M_N2 }),
        Object.freeze({ speciesId: "O2", moleFraction: 0.2072, molarMass: M_O2 }),
        Object.freeze({ speciesId: "CO2", moleFraction: 0.00042, molarMass: M_CO2 }),
        Object.freeze({ speciesId: "H2O", moleFraction: 0.0116, molarMass: M_H2O }),
        Object.freeze({ speciesId: "Ar", moleFraction: 0.00928, molarMass: M_Ar }),
    ]) as ReadonlyArray<ICompositionComponent>,
});

export const EARTH_DRY_AIR_PRESET: ICompositionPreset = Object.freeze({
    typeId: "Chemistry.Composition:earth-dry-air",
    presetId: "earthDryAirSeaLevel",
    displayName: "Earth air, sea level (dry)",
    description: "U.S. Standard Atmosphere dry-air composition.",
    referencePressurePa: 101325,
    components: Object.freeze([
        Object.freeze({ speciesId: "N2", moleFraction: 0.78084, molarMass: M_N2 }),
        Object.freeze({ speciesId: "O2", moleFraction: 0.20946, molarMass: M_O2 }),
        Object.freeze({ speciesId: "CO2", moleFraction: 0.00042, molarMass: M_CO2 }),
        Object.freeze({ speciesId: "Ar", moleFraction: 0.00928, molarMass: M_Ar }),
    ]) as ReadonlyArray<ICompositionComponent>,
});

export const MARS_ATMOSPHERE_PRESET: ICompositionPreset = Object.freeze({
    typeId: "Chemistry.Composition:mars-atmosphere",
    presetId: "marsAtmosphereMean",
    displayName: "Mars atmosphere (mean)",
    description: "Mars Climate Database mean — CO2-dominated, traces of N2 and Ar.",
    referencePressurePa: 600,
    components: Object.freeze([
        Object.freeze({ speciesId: "CO2", moleFraction: 0.9532, molarMass: M_CO2 }),
        Object.freeze({ speciesId: "N2", moleFraction: 0.027, molarMass: M_N2 }),
        Object.freeze({ speciesId: "Ar", moleFraction: 0.0163, molarMass: M_Ar }),
        Object.freeze({ speciesId: "O2", moleFraction: 0.0013, molarMass: M_O2 }),
        Object.freeze({ speciesId: "H2O", moleFraction: 0.0003, molarMass: M_H2O }),
    ]) as ReadonlyArray<ICompositionComponent>,
});

export const ISS_CABIN_PRESET: ICompositionPreset = Object.freeze({
    typeId: "Chemistry.Composition:iss-cabin",
    presetId: "issCabinECLSS",
    displayName: "ISS cabin (ECLSS spec)",
    description: "Crewed cabin baseline: Earth dry air at CO2 cap ~3000 ppm.",
    referencePressurePa: 101325,
    components: Object.freeze([
        Object.freeze({ speciesId: "N2", moleFraction: 0.781, molarMass: M_N2 }),
        Object.freeze({ speciesId: "O2", moleFraction: 0.209, molarMass: M_O2 }),
        Object.freeze({ speciesId: "CO2", moleFraction: 0.003, molarMass: M_CO2 }),
        Object.freeze({ speciesId: "H2O", moleFraction: 0.007, molarMass: M_H2O }),
    ]) as ReadonlyArray<ICompositionComponent>,
});

export const VACUUM_PRESET: ICompositionPreset = Object.freeze({
    typeId: "Chemistry.Composition:vacuum",
    presetId: "vacuum",
    displayName: "Vacuum",
    description: "No species — pressure 0, no mass to track. Use for orbital exteriors.",
    referencePressurePa: 0,
    components: Object.freeze([]) as ReadonlyArray<ICompositionComponent>,
});

export const COMPOSITION_PRESETS: ReadonlyArray<ICompositionPreset> = Object.freeze([
    EARTH_HUMID_AIR_PRESET,
    EARTH_DRY_AIR_PRESET,
    MARS_ATMOSPHERE_PRESET,
    ISS_CABIN_PRESET,
    VACUUM_PRESET,
]);

function applyPreset(node: CompositionNode, p: ICompositionPreset): CompositionNode {
    node.presetId = p.presetId;
    node.displayName = p.displayName;
    node.referencePressurePa = p.referencePressurePa;
    node.setComponents(p.components.map((c) => ({ ...c })));
    return node;
}

export function createEarthHumidAirCompositionNode(): CompositionNode {
    return applyPreset(new CompositionNode(), EARTH_HUMID_AIR_PRESET);
}
export function createEarthDryAirCompositionNode(): CompositionNode {
    return applyPreset(new CompositionNode(), EARTH_DRY_AIR_PRESET);
}
export function createMarsAtmosphereCompositionNode(): CompositionNode {
    return applyPreset(new CompositionNode(), MARS_ATMOSPHERE_PRESET);
}
export function createIssCabinCompositionNode(): CompositionNode {
    return applyPreset(new CompositionNode(), ISS_CABIN_PRESET);
}
export function createVacuumCompositionNode(): CompositionNode {
    return applyPreset(new CompositionNode(), VACUUM_PRESET);
}
