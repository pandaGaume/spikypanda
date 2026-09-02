/**
 * `Chemistry.Gas:gas` — gas-species descriptor (P9.1).
 *
 * A GraphItem (descriptive, NOT a RuntimeNode) that carries the
 * physico-chemical constants of a single gas. Wired to a
 * `Chemistry.Composition:*` via the `gas_out` config-link; never
 * participates in the runtime dispatch loop.
 *
 * Storage convention: canonical SI throughout (kg/mol for molar
 * mass, kg/m³ for density, J/(kg·K) for specific heat, W/(m·K) for
 * thermal conductivity, Pa·s for viscosity). The @editable
 * accessors surface the engineering-natural units users actually
 * write in (g/mol for molar mass — 28.0134 not 0.0280134, μPa·s for
 * gas viscosity — 17.81 not 1.781e-5). Quantity-aware accessors
 * (`molarMassQ`, `densityQ`, …) provide the canonical-Quantity form
 * for unit-aware consumer code.
 *
 * Implements `IGasMetadata` (core/sim/chemistry.interfaces.ts) so any
 * future plugin (physics atmosphere, kinetics, ...) can duck-type
 * without taking a dependency on the chemistry plugin's bundle.
 */

import {
    Cartesian3,
    cloneable,
    Density,
    DynamicViscosity,
    editable,
    GraphItem,
    MassSpecificHeat,
    MolarMass,
    ThermalConductivity,
} from "spikypanda-core";
import type { ICartesian, IGasMetadata } from "spikypanda-core";

void Cartesian3; // imported re-export entry point — keep alive for ICartesian-typed positions

/** Slot constant for the gas → composition config-link. */
export const GAS_OUT_ANCHOR = "gas_out";

export class GasNode extends GraphItem implements IGasMetadata {
    // ── Identity ─────────────────────────────────────────────────────
    //
    // `_speciesId` is the chemistry-level identifier ("N2", "CO2", …)
    // that propagates to atmosphere variadic slot names; distinct
    // from `GraphItem.id`, which is the editor-assigned UUID owned by
    // the base class. Don't conflate the two.

    @cloneable private _speciesId: string = "gas";
    @cloneable private _displayName: string = "Gas";
    @cloneable private _formula: string = "";
    @cloneable private _casNumber: string = "";

    // ── Physico-chemical constants (canonical SI storage) ────────────

    @cloneable private _molarMassKgPerMol: number = 0.028;
    @cloneable private _densityKgPerM3: number = 1.25;
    @cloneable private _specificHeatJPerKgK: number = 1000;
    @cloneable private _thermalConductivityWPerMK: number = 0.025;
    @cloneable private _viscosityPas: number = 1.8e-5;

    // ── Toxicology block (P9.4 redesign 2026-06-08) ──────────────────
    //
    // Pollutant-ness is an ATTRIBUTE on the gas, not a separate node
    // class. Every GasNode carries these fields; left at zero / empty
    // for non-toxic bulk gases (N2, O2, ...). A gas is flagged as a
    // pollutant downstream via the `isPollutant` getter below (or the
    // standalone `isPollutantGas(g)` guard from core), which inspects
    // these very fields. The integrator never reads them: they only
    // drive panel renderers, alarm logic, and gate-condition checks.

    @cloneable private _oelTwaPpm: number = 0;
    @cloneable private _oelStelPpm: number = 0;
    @cloneable private _idlhPpm: number = 0;
    @cloneable private _hazardClass: string = "";

    // ── @editable accessors (engineering units) ──────────────────────

    // Naming: the property-panel labels uppercase the JS property name
    // verbatim, so a camelCase accessor would render as SPECIESID (ugly).
    // The @editable surface uses snake_case, which after CSS uppercase
    // transforms to readable SPECIES_ID / DISPLAY_NAME / MOLAR_MASS_G_PER_MOL.
    // Internal camelCase aliases below forward to the same storage so
    // existing call sites (presets, type contracts) keep compiling.

    @editable("string")
    public get species_id(): string {
        return this._speciesId;
    }
    public set species_id(v: string) {
        const next = v && v.length > 0 ? v : "gas";
        this.setField("species_id", this._speciesId, next, (n) => {
            this._speciesId = n;
        });
    }
    public get speciesId(): string {
        return this._speciesId;
    }
    public set speciesId(v: string) {
        this.species_id = v;
    }

    @editable("string")
    public get display_name(): string {
        return this._displayName;
    }
    public set display_name(v: string) {
        this.setField("display_name", this._displayName, v, (n) => {
            this._displayName = n;
        });
    }
    public get displayName(): string {
        return this._displayName;
    }
    public set displayName(v: string) {
        this.display_name = v;
    }

    @editable("string")
    public get formula(): string {
        return this._formula;
    }
    public set formula(v: string) {
        this.setField("formula", this._formula, v, (n) => {
            this._formula = n;
        });
    }

    @editable("string")
    public get cas_number(): string {
        return this._casNumber;
    }
    public set cas_number(v: string) {
        this.setField("cas_number", this._casNumber, v, (n) => {
            this._casNumber = n;
        });
    }
    public get casNumber(): string {
        return this._casNumber;
    }
    public set casNumber(v: string) {
        this.cas_number = v;
    }

    /** Molar mass in g/mol (storage in kg/mol). The g/mol scale is the
     *  one chemistry tables quote; storing canonical SI internally
     *  keeps the IGasMetadata contract uniform across the codebase. */
    @editable("number", { unit: { quantity: "MolarMass", unit: "gpmol" } })
    public get molar_mass_g_per_mol(): number {
        return this._molarMassKgPerMol * 1000;
    }
    public set molar_mass_g_per_mol(v: number) {
        const next = v > 0 ? v / 1000 : this._molarMassKgPerMol;
        this.setField("molar_mass_g_per_mol", this._molarMassKgPerMol, next, (n) => {
            this._molarMassKgPerMol = n;
        });
    }
    public get molarMassGperMol(): number {
        return this.molar_mass_g_per_mol;
    }
    public set molarMassGperMol(v: number) {
        this.molar_mass_g_per_mol = v;
    }

    @editable("number", { unit: { quantity: "Density", unit: "kgpm3" } })
    public get density_kg_per_m3(): number {
        return this._densityKgPerM3;
    }
    public set density_kg_per_m3(v: number) {
        const next = v >= 0 ? v : this._densityKgPerM3;
        this.setField("density_kg_per_m3", this._densityKgPerM3, next, (n) => {
            this._densityKgPerM3 = n;
        });
    }
    public get densityKgPerM3(): number {
        return this.density_kg_per_m3;
    }
    public set densityKgPerM3(v: number) {
        this.density_kg_per_m3 = v;
    }

    @editable("number", { unit: { quantity: "MassSpecificHeat", unit: "JpkgK" } })
    public get specific_heat_j_per_kg_k(): number {
        return this._specificHeatJPerKgK;
    }
    public set specific_heat_j_per_kg_k(v: number) {
        const next = v >= 0 ? v : this._specificHeatJPerKgK;
        this.setField("specific_heat_j_per_kg_k", this._specificHeatJPerKgK, next, (n) => {
            this._specificHeatJPerKgK = n;
        });
    }
    public get specificHeatJPerKgK(): number {
        return this.specific_heat_j_per_kg_k;
    }
    public set specificHeatJPerKgK(v: number) {
        this.specific_heat_j_per_kg_k = v;
    }

    @editable("number", { unit: { quantity: "ThermalConductivity", unit: "WpmK" } })
    public get thermal_conductivity_w_per_m_k(): number {
        return this._thermalConductivityWPerMK;
    }
    public set thermal_conductivity_w_per_m_k(v: number) {
        const next = v >= 0 ? v : this._thermalConductivityWPerMK;
        this.setField("thermal_conductivity_w_per_m_k", this._thermalConductivityWPerMK, next, (n) => {
            this._thermalConductivityWPerMK = n;
        });
    }
    public get thermalConductivityWPerMK(): number {
        return this.thermal_conductivity_w_per_m_k;
    }
    public set thermalConductivityWPerMK(v: number) {
        this.thermal_conductivity_w_per_m_k = v;
    }

    /** Dynamic viscosity in μPa·s (storage in Pa·s). Gas viscosities
     *  are order 10 to 30 μPa·s: using the μ-scale at the user
     *  interface avoids the "0.0000178" trap and matches gas-tables
     *  convention. */
    @editable("number", { unit: { quantity: "DynamicViscosity", unit: "uPas" } })
    public get viscosity_micro_pa_s(): number {
        return this._viscosityPas * 1e6;
    }
    public set viscosity_micro_pa_s(v: number) {
        const next = v >= 0 ? v * 1e-6 : this._viscosityPas;
        this.setField("viscosity_micro_pa_s", this._viscosityPas, next, (n) => {
            this._viscosityPas = n;
        });
    }
    public get viscosityMicroPas(): number {
        return this.viscosity_micro_pa_s;
    }
    public set viscosityMicroPas(v: number) {
        this.viscosity_micro_pa_s = v;
    }

    // ── Toxicology @editable accessors (P9.4 redesign) ───────────────

    /** OEL TWA (8 h time-weighted average) in ppm. Panel renderers
     *  compare this against the live `ppm_<sp>` output on the wired
     *  atmosphere to flag chronic-exposure alarms. 0 = not regulated. */
    @editable("number", { unit: { quantity: "Dimensionless", unit: "ppm" } })
    public get oel_twa_ppm(): number {
        return this._oelTwaPpm;
    }
    public set oel_twa_ppm(v: number) {
        const next = v >= 0 ? v : 0;
        this.setField("oel_twa_ppm", this._oelTwaPpm, next, (n) => {
            this._oelTwaPpm = n;
        });
    }
    public get oelTwa(): number | undefined {
        return this._oelTwaPpm > 0 ? this._oelTwaPpm : undefined;
    }

    /** OEL STEL (15-minute short-term exposure limit) in ppm. */
    @editable("number", { unit: { quantity: "Dimensionless", unit: "ppm" } })
    public get oel_stel_ppm(): number {
        return this._oelStelPpm;
    }
    public set oel_stel_ppm(v: number) {
        const next = v >= 0 ? v : 0;
        this.setField("oel_stel_ppm", this._oelStelPpm, next, (n) => {
            this._oelStelPpm = n;
        });
    }
    public get oelStel(): number | undefined {
        return this._oelStelPpm > 0 ? this._oelStelPpm : undefined;
    }

    /** IDLH (Immediately Dangerous to Life or Health) in ppm. */
    @editable("number", { unit: { quantity: "Dimensionless", unit: "ppm" } })
    public get idlh_ppm(): number {
        return this._idlhPpm;
    }
    public set idlh_ppm(v: number) {
        const next = v >= 0 ? v : 0;
        this.setField("idlh_ppm", this._idlhPpm, next, (n) => {
            this._idlhPpm = n;
        });
    }
    public get idlh(): number | undefined {
        return this._idlhPpm > 0 ? this._idlhPpm : undefined;
    }

    /** Hazard tag: "voc" / "asphyxiant" / "irritant" / "carcinogen" /
     *  "corrosive" / "" (the empty string flags a non-hazardous bulk
     *  gas). Stored verbatim — the panel renderer maps known tags to
     *  pictograms; unknown tags render as plain text. */
    @editable("string")
    public get hazard_class(): string {
        return this._hazardClass;
    }
    public set hazard_class(v: string) {
        this.setField("hazard_class", this._hazardClass, v ?? "", (n) => {
            this._hazardClass = n;
        });
    }
    public get hazardClass(): string | undefined {
        return this._hazardClass.length > 0 ? this._hazardClass : undefined;
    }

    /** Convenience: is this gas a pollutant? True when any OEL or
     *  IDLH is > 0 or a hazardClass is set. Mirrors the standalone
     *  `isPollutantGas(g)` guard exported from core. */
    public get isPollutant(): boolean {
        return (
            this._oelTwaPpm > 0 ||
            this._oelStelPpm > 0 ||
            this._idlhPpm > 0 ||
            this._hazardClass.length > 0
        );
    }

    // ── IGasMetadata implementation (canonical SI getters) ───────────
    //
    // The runtime contract reads these. Names match the interface
    // exactly so duck-typing via `isGasMetadata` works without
    // adapters.

    public get molarMass(): number {
        return this._molarMassKgPerMol;
    }
    public get density(): number {
        return this._densityKgPerM3;
    }
    public get specificHeat(): number {
        return this._specificHeatJPerKgK;
    }
    public get thermalConductivity(): number {
        return this._thermalConductivityWPerMK;
    }
    public get viscosity(): number {
        return this._viscosityPas;
    }

    // ── Quantity-aware accessors ─────────────────────────────────────

    /** Returns a fresh `MolarMass` Quantity over the canonical kg/mol
     *  storage. Consumers convert to whatever unit they need:
     *  `.getValue(MolarMass.Units.gpmol)` for property panels,
     *  `.getValue(MolarMass.Units.kgpmol)` for SI formulas. */
    public get molarMassQ(): MolarMass {
        return new MolarMass(this._molarMassKgPerMol, MolarMass.Units.kgpmol);
    }
    public set molarMassQ(q: MolarMass) {
        const kgpmol = q.getValue(MolarMass.Units.kgpmol);
        this.molarMassGperMol = kgpmol * 1000;
    }

    public get densityQ(): Density {
        return new Density(this._densityKgPerM3, Density.Units.kgpm3);
    }
    public set densityQ(q: Density) {
        this.densityKgPerM3 = q.getValue(Density.Units.kgpm3);
    }

    public get specificHeatQ(): MassSpecificHeat {
        return new MassSpecificHeat(this._specificHeatJPerKgK, MassSpecificHeat.Units.JpkgK);
    }
    public set specificHeatQ(q: MassSpecificHeat) {
        this.specificHeatJPerKgK = q.getValue(MassSpecificHeat.Units.JpkgK);
    }

    public get thermalConductivityQ(): ThermalConductivity {
        return new ThermalConductivity(this._thermalConductivityWPerMK, ThermalConductivity.Units.WpmK);
    }
    public set thermalConductivityQ(q: ThermalConductivity) {
        this.thermalConductivityWPerMK = q.getValue(ThermalConductivity.Units.WpmK);
    }

    public get viscosityQ(): DynamicViscosity {
        return new DynamicViscosity(this._viscosityPas, DynamicViscosity.Units.Pas);
    }
    public set viscosityQ(q: DynamicViscosity) {
        this._viscosityPas = q.getValue(DynamicViscosity.Units.Pas);
    }
}

/** Reference to `ICartesian` keeps the import tree happy when this
 *  class is instantiated with a position via the GraphItem base path. */
export type { ICartesian };

/** Default factory: a generic gas seeded as nitrogen. The preset
 *  factories below override every field via their own configuration. */
export function createGasNode(): GasNode {
    return new GasNode();
}
