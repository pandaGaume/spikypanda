/**
 * `Chemistry.Composition:composition` — gas-mixture descriptor (P9.2).
 *
 * A GraphItem (descriptive, NOT a RuntimeNode) that holds an ordered
 * list of components, each = `{ speciesId, moleFraction, molarMass,
 * gasItemId? }`. Wired to:
 *
 *   - variadic `gas_in_<k>` inputs (config-link "gas") to refine a
 *     component's metadata from a wired `Chemistry.Gas:*` instance;
 *   - single `composition_out` output (config-link "composition")
 *     that an `Physics.Scene:atmosphere-state` consumes at session
 *     bind to size its state vector and seed its initial inventory.
 *
 * Presets (Earth humid air, Earth dry air, Mars, ISS cabin, vacuum)
 * inline the species + mole fraction + molar mass so the composition
 * works STANDALONE — no `Chemistry.Gas:*` nodes need to be on the
 * canvas. The user can OPTIONALLY wire `Chemistry.Gas:*` instances
 * to refine viscosity / Cp / thermal conductivity for downstream
 * thermal nodes (V3).
 *
 * Pollutants and particulates (P9.4 / P9.5) will plug in through
 * sibling variadic groups (`pollutant_in_<k>`, `particulate_in_<k>`)
 * once their node families ship; the composition shape is forward-
 * compatible.
 */

import { cloneable, editable, GraphItem, MolarMass, Pressure, viewable } from "spikypanda-core";
import type { IGasMetadata, IParticulateMetadata } from "spikypanda-core";

/** Slot anchors centralised so the editor reconciler, the
 *  graph-session-builder sync pass, and any sibling test code can
 *  refer to the same string literals. */
export const COMPOSITION_OUT_ANCHOR = "composition_out";
export const COMPOSITION_IN_GAS_PREFIX = "gas_in_";
/** Variadic config-link input pool: wired Particulate descriptors
 *  ride along with the bulk gas mix as part of the same Composition.
 *  An AtmosphereLayer reading a bound Composition picks them up
 *  through `composition.particulates`; no separate `particulate_in`
 *  slot on the Layer is needed. */
export const COMPOSITION_IN_PARTICULATE_PREFIX = "particulate_in_";

/** Fallback molar masses [kg/mol] used by the per-species editables
 *  when the user sets a mole fraction for a species not yet in the
 *  mixture (and no wired GasNode has supplied a richer value yet).
 *  Aligned with the V1 GasNode catalog (P9.1). */
const M_N2_FALLBACK = 0.0280134;
const M_O2_FALLBACK = 0.0319988;
const M_CO2_FALLBACK = 0.0440095;
const M_H2O_FALLBACK = 0.01801528;
const M_AR_FALLBACK = 0.039948;

/**
 * One component of a gas mixture.
 *
 * `speciesId` is the chemistry-level identifier ("N2", "CO2", ...);
 * propagates downstream as the slot suffix in `mass_<speciesId>` /
 * `delta_<speciesId>_<k>` on the atmosphere.
 *
 * `moleFraction` is the dimensionless x_i used at session bind to
 * seed the atmosphere's initial mass via the ideal-gas law; the
 * runtime atmosphere does NOT re-normalise across components — the
 * preset is trusted to be well-formed (sum_i x_i ≈ 1).
 *
 * `molarMass` is in canonical SI (kg/mol). Stays read-only at the
 * IGasMetadata layer; presets bake values from `core/sim/chemical.species`
 * V1 data, custom compositions can override via wired GasNodes.
 *
 * `gasItemId` is the editor-resolved reference to a wired
 * `Chemistry.Gas:*` instance; set by the session-builder when the
 * user drags `gas_out → gas_in_<k>`. When non-empty, downstream nodes
 * may read additional metadata (specificHeat, thermalConductivity,
 * viscosity) from the wired GasNode instead of falling back to
 * defaults.
 */
export interface ICompositionComponent {
    speciesId: string;
    moleFraction: number;
    molarMass: number;
    gasItemId?: string;
}

export class CompositionNode extends GraphItem {
    /** Human-readable preset identifier surfaced in the property panel.
     *  `"custom"` for compositions built by hand. */
    @cloneable private _presetId: string = "custom";
    @cloneable private _displayName: string = "Composition";

    /** Reference pressure for the initial inventory derivation. The
     *  atmosphere reads this at reset to invert the ideal-gas law
     *  (n = P V / RT, then m_i = x_i × n × M_i). Setting it to 0
     *  reproduces the vacuum case — every species at 0 kg. */
    @cloneable private _referencePressurePa: number = 101325;

    /** Ordered component list. Cloneable so save/load round-trips. */
    @cloneable private _components: ICompositionComponent[] = [];

    // ── Editables ────────────────────────────────────────────────────

    @editable("string")
    public get preset_id(): string {
        return this._presetId;
    }
    public set preset_id(v: string) {
        this.setField("preset_id", this._presetId, v, (n) => {
            this._presetId = n;
        });
    }
    // Internal camelCase alias kept for programmatic call sites (the
    // preset factories use it). The @editable mirror above is the
    // property-panel-friendly name; both refer to the same underlying
    // storage so edits via either path stay consistent.
    public get presetId(): string {
        return this._presetId;
    }
    public set presetId(v: string) {
        this.preset_id = v;
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

    @editable("number", { unit: { quantity: "Pressure", unit: "Pa" } })
    public get reference_pressure(): number {
        return this._referencePressurePa;
    }
    public set reference_pressure(v: number) {
        const next = v >= 0 ? v : 0;
        this.setField("reference_pressure", this._referencePressurePa, next, (n) => {
            this._referencePressurePa = n;
        });
    }
    public get referencePressurePa(): number {
        return this._referencePressurePa;
    }
    public set referencePressurePa(v: number) {
        this.reference_pressure = v;
    }

    /** Quantity-aware accessor for the reference pressure. Atmospheric
     *  presets are conventionally expressed in atm or bar; this
     *  accessor lets the property-panel value round-trip through any
     *  Pressure unit without manual conversion. */
    public get referencePressureQ(): Pressure {
        return new Pressure(this._referencePressurePa, Pressure.Units.Pa);
    }
    public set referencePressureQ(q: Pressure) {
        this.referencePressurePa = q.getValue(Pressure.Units.Pa);
    }

    // ── Component manipulation ───────────────────────────────────────

    public get components(): ReadonlyArray<ICompositionComponent> {
        return this._components;
    }

    /**
     * Replace the entire component list. Used by the preset factories
     * and by the session-builder when a wired Gas refresh changes the
     * shape. Fires a single property-changed notification rather than
     * one per component, keeping the property-panel re-render cheap.
     */
    public setComponents(components: ReadonlyArray<ICompositionComponent>): void {
        const next = components.map((c) => ({ ...c }));
        const old = this._components;
        this._components = next;
        this.notifyPropertyChanged("components", old, next);
    }

    /** Look up a component by speciesId. Returns `undefined` when the
     *  species is not in the mixture (composition does NOT auto-create
     *  components on read). */
    public findComponent(speciesId: string): ICompositionComponent | undefined {
        return this._components.find((c) => c.speciesId === speciesId);
    }

    /** Append a component or update its mole fraction if already
     *  present. Used by the session-builder when a Gas wires onto a
     *  variadic slot — adds the gas to the mixture with a default
     *  zero mole fraction; the user tunes the fraction in the
     *  property panel afterwards. */
    public upsertComponent(component: ICompositionComponent): void {
        const next = this._components.map((c) => ({ ...c }));
        const idx = next.findIndex((c) => c.speciesId === component.speciesId);
        if (idx >= 0) {
            next[idx] = { ...next[idx], ...component };
        } else {
            next.push({ ...component });
        }
        const old = this._components;
        this._components = next;
        this.notifyPropertyChanged("components", old, next);
    }

    /** Remove a component by speciesId. No-op when the species is not
     *  in the mixture. */
    public removeComponent(speciesId: string): void {
        const next = this._components.filter((c) => c.speciesId !== speciesId);
        if (next.length === this._components.length) return;
        const old = this._components;
        this._components = next;
        this.notifyPropertyChanged("components", old, next);
    }

    // ── Per-species mole-fraction editables (V1 canonical 5) ────────
    //
    // V1 limitation: the property panel needs dedicated @editable
    // accessors per species because the editor framework does not yet
    // surface dynamic list-of-row editors. We cover the five canonical
    // V1 air components (N2, O2, CO2, H2O, Ar) — enough for every
    // preset and for any Earth/Mars/ISS sim. Custom species (CH4,
    // pollutants, ...) can still be set via `setComponents` /
    // `upsertComponent` programmatically or appended through the
    // `gas_in_<k>` wiring; their mole fractions just have no panel-
    // level editor until V2 ships a dynamic-rows component.

    // Property names use snake_case so the property-panel renderer
    // (which applies `text-transform: uppercase` via CSS without
    // word-boundary inserts) shows them as `MOLE_FRACTION_N2` rather
    // than the unreadable `MOLEFRACTIONN2`. Underscores survive the
    // uppercase transform — the JS convention shift is contained to
    // this one block, since the surrounding `setField` / @cloneable
    // metadata keys are derived from the property name verbatim.

    @editable("number")
    public get mole_fraction_n2(): number {
        return this.findComponent("N2")?.moleFraction ?? 0;
    }
    public set mole_fraction_n2(v: number) {
        this._setMoleFractionFor("N2", v, M_N2_FALLBACK);
    }

    @editable("number")
    public get mole_fraction_o2(): number {
        return this.findComponent("O2")?.moleFraction ?? 0;
    }
    public set mole_fraction_o2(v: number) {
        this._setMoleFractionFor("O2", v, M_O2_FALLBACK);
    }

    @editable("number")
    public get mole_fraction_co2(): number {
        return this.findComponent("CO2")?.moleFraction ?? 0;
    }
    public set mole_fraction_co2(v: number) {
        this._setMoleFractionFor("CO2", v, M_CO2_FALLBACK);
    }

    @editable("number")
    public get mole_fraction_h2o(): number {
        return this.findComponent("H2O")?.moleFraction ?? 0;
    }
    public set mole_fraction_h2o(v: number) {
        this._setMoleFractionFor("H2O", v, M_H2O_FALLBACK);
    }

    @editable("number")
    public get mole_fraction_ar(): number {
        return this.findComponent("Ar")?.moleFraction ?? 0;
    }
    public set mole_fraction_ar(v: number) {
        this._setMoleFractionFor("Ar", v, M_AR_FALLBACK);
    }

    /**
     * Internal helper for the per-species mole-fraction setters.
     * Clamps the value to ≥ 0 (negative mole fractions are
     * unphysical) and falls back to a baked molar mass when the
     * species was not in the mixture yet — the user can wire a
     * `Chemistry.Gas:<species>` later to refine the molar mass with a
     * non-V1-canonical value.
     */
    private _setMoleFractionFor(speciesId: string, fraction: number, fallbackMolarMass: number): void {
        const clamped = Number.isFinite(fraction) && fraction >= 0 ? fraction : 0;
        const existing = this.findComponent(speciesId);
        const molarMass = existing?.molarMass ?? fallbackMolarMass;
        const gasItemId = existing?.gasItemId;
        this.upsertComponent({
            speciesId,
            moleFraction: clamped,
            molarMass,
            gasItemId,
        });
    }

    // ── Aggregate viewables ──────────────────────────────────────────

    @viewable("number") public get component_count(): number {
        return this._components.length;
    }
    public get componentCount(): number {
        return this.component_count;
    }

    @viewable("number") public get total_mole_fraction(): number {
        let s = 0;
        for (const c of this._components) s += c.moleFraction;
        return s;
    }
    public get totalMoleFraction(): number {
        return this.total_mole_fraction;
    }

    /** Mole-fraction-weighted average molar mass [kg/mol]. Used by the
     *  atmosphere's ideal-gas pressure/density calculations when no
     *  species-resolved formula is needed. Returns 0 for the empty
     *  (vacuum) composition. */
    @viewable("number") public get average_molar_mass(): number {
        let xSum = 0;
        let mxSum = 0;
        for (const c of this._components) {
            xSum += c.moleFraction;
            mxSum += c.moleFraction * c.molarMass;
        }
        return xSum > 0 ? mxSum / xSum : 0;
    }
    public get averageMolarMass(): number {
        return this.average_molar_mass;
    }

    /** Quantity-aware variant of `averageMolarMass`. */
    public get averageMolarMassQ(): MolarMass {
        return new MolarMass(this.average_molar_mass, MolarMass.Units.kgpmol);
    }

    /**
     * Refresh a component's metadata from a wired `Chemistry.Gas:*`
     * descriptor. Matches by speciesId; the gasItemId field is
     * updated so downstream consumers can still locate the GasNode
     * for richer queries (Cp, viscosity, ...). If no component with
     * the gas's speciesId exists, one is appended with a zero mole
     * fraction (the user adjusts it in the property panel).
     *
     * Used by the editor's `graph-session-builder.ts` sync pass
     * (extended in P9.3 to cover composition wirings).
     */
    public bindGas(gasItemId: string, gas: IGasMetadata): void {
        this.upsertComponent({
            speciesId: gas.speciesId,
            molarMass: gas.molarMass,
            moleFraction: this.findComponent(gas.speciesId)?.moleFraction ?? 0,
            gasItemId,
        });
    }

    // ── Particulate bindings (2026-06-08) ─────────────────────────────
    //
    // Particulates now ride along with the gas mix as part of the same
    // Composition. The hierarchy is:
    //
    //   Atmosphere ─► Layer ─► Composition ─┬─► gases (via gas_in_<k>)
    //                                       └─► particulates (via
    //                                           particulate_in_<k>)
    //
    // A bound AtmosphereLayer reads its composition's particulates at
    // session bind; the Layer itself no longer carries a particulate_in
    // slot. Reset-each-sync semantic (not bind-additive like gases):
    // the session-builder calls `clearParticulates()` at the start of
    // every sync pass before re-applying current wirings, so removing
    // a wire on the canvas takes effect on the next build.
    //
    // NOT @cloneable: particulate bindings are runtime state, not part
    // of the composition's serialisable identity. A reloaded session
    // starts with no particulates until the session-builder repopulates
    // them from the live canvas.

    private _particulates: IParticulateMetadata[] = [];

    /** Read-only view of currently bound particulates. */
    public get particulates(): ReadonlyArray<IParticulateMetadata> {
        return this._particulates;
    }

    /** Append a particulate descriptor to this composition. Called by
     *  the session-builder when a `Physics.Particulate:*` is wired to
     *  `particulate_in_<k>`. Binding order = wiring order. */
    public bindParticulate(_particulateItemId: string, particulate: IParticulateMetadata): void {
        this._particulates.push(particulate);
    }

    /** Wipe the bound particulate list. Called by the session-builder
     *  at the start of each sync pass before re-binding from current
     *  canvas connections. */
    public clearParticulates(): void {
        this._particulates = [];
    }
}

/** Default factory: a custom (empty) composition the user can build
 *  by hand. The preset factories in `presets.ts` seed the various
 *  Earth / Mars / ISS / vacuum starters. */
export function createCompositionNode(): CompositionNode {
    return new CompositionNode();
}
