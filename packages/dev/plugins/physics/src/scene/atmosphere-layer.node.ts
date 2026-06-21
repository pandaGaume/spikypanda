/**
 * `Physics.Scene:atmosphere-layer` — the IIntegrable mass-inventory
 * carrier for a single layer of a Scene's atmosphere.
 *
 * Was `Physics.Scene:atmosphere-state` (renamed 2026-06-08 when the
 * Atmosphere class split into a Layer carrier and a Container facade).
 * A scene's full atmosphere is now a `Physics.Scene:atmosphere`
 * container that holds one or more layers; each layer is what this
 * class models. Single-layer scenes still work transparently (the
 * container instantiates a hidden default layer when no Layer node
 * is wired).
 *
 * Responsibility:
 *   - Hold the per-species mass [kg] of the gases that occupy this
 *     layer's volume. The mass vector is the integrated state owned
 *     by whatever solver the scene's SimGraphNode attaches.
 *   - Accept producer contributions on variadic `delta_<species>_<k>`
 *     input ports (currently runtime-only; not exposed at the editor
 *     layer until V2 dynamic-port story lands). Each tick the solver
 *     sums slots whose name starts with `delta_<species>_` into
 *     dm_<species>/dt.
 *   - Publish per-species observables (mass / mole-fraction / partial-
 *     pressure / ppm) at the runtime level for any consumer that
 *     wires by slot name; plus aggregates (pressure, temperature,
 *     density) exposed as editor ports.
 *   - Accept two config-link inputs:
 *       `composition_in`        single Composition spec; drives species
 *                               schema + initial mass via ideal gas
 *                               at reset.
 *       `particulate_in_<k>`    variadic Particulate references; V1
 *                               records them as bound metadata only,
 *                               no state-vector contribution.
 *   - Expose `layer_out` as the config-link anchor consumed by the
 *     container's variadic `layer_in_<k>` slot pool.
 *
 * Base class: extends `IntegrableRuntimeNode`, which bundles the
 * `IHasSampleRateRequirement` scaffolding (user-pin + `computeRequiredHz()`
 * virtual hook). The layer's `computeRequiredHz()` returns a constant
 * 100 Hz baseline; the user can pin a different rate through the
 * inherited `requiredSampleRateHz` editable.
 *
 * Design choices preserved from the pre-split atmosphere:
 *   - Composition is the species schema + initial-conditions snapshot
 *     at t=0; the layer then OWNS the mass evolution. Displayed mole
 *     fractions are derived from current masses, not from the
 *     composition spec.
 *   - Pollutant-class species (VOCs, CO, NH3, ...) are just gases with
 *     toxicology attributes — they reach the layer through the same
 *     bound Composition as bulk species; no separate `pollutant_in`
 *     seam.
 *   - Particulates are stubbed: the slot exists so user topologies
 *     survive the V2 PM integration without re-wiring.
 *   - When no composition is wired, the layer falls back to
 *     V1_SPECIES_ORDER + ATMOSPHERE_PRESETS (preserves the original
 *     single-atmosphere quick-start behavior).
 */

import {
    ATMOSPHERE_PRESETS,
    Cartesian3,
    CHEMICAL_SPECIES_V1,
    cloneable,
    editable,
    GAS_CONSTANT_R,
    IDeclaresPorts,
    IHasSampleRateRequirement,
    IIntegrable,
    IIntegrationInputs,
    IntegrableRuntimeNode,
    IOlink,
    IPortDescriptor,
    isGasMetadata,
    ISession,
    Temperature,
    V1_SPECIES_ORDER,
    viewable,
} from "spikypanda-core";
import type { ChemicalSpeciesId, IChannel, ICartesian, IGasMetadata, IParticulateMetadata, Nullable } from "spikypanda-core";

/**
 * Output / input slot names. Centralised so sibling code can subscribe
 * by string without re-deriving the convention.
 */
export const ATMOSPHERE_LAYER_OUT_PRESSURE = "pressure";
export const ATMOSPHERE_LAYER_OUT_TEMPERATURE = "temperature";
export const ATMOSPHERE_LAYER_OUT_DENSITY = "density";
/** Config-link anchor consumed by the Atmosphere container's variadic
 *  `layer_in_<k>` slot pool. Type "layer" (dashed cable). */
export const ATMOSPHERE_LAYER_OUT_ANCHOR = "layer_out";
export const ATMOSPHERE_LAYER_OUT_MASS = (sp: string): string => `mass_${sp}`;
export const ATMOSPHERE_LAYER_OUT_MOLE_FRACTION = (sp: string): string => `mole_fraction_${sp}`;
export const ATMOSPHERE_LAYER_OUT_PARTIAL_PRESSURE = (sp: string): string => `partial_pressure_${sp}`;
export const ATMOSPHERE_LAYER_OUT_PPM = (sp: string): string => `ppm_${sp}`;
export const ATMOSPHERE_LAYER_IN_DELTA_PREFIX = (sp: string): string => `delta_${sp}_`;

/** Config-link slot constants. */
export const ATMOSPHERE_LAYER_IN_COMPOSITION = "composition_in";

/** Minimal structural shape the layer consumes from a bound
 *  CompositionNode. Duck-typed so the physics plugin doesn't need to
 *  import @spikypanda/plugin-chemistry directly.
 *
 *  Particulates now ride along with the gas mix as part of the same
 *  Composition (the user-facing hierarchy is Atmosphere ─ Layer ─
 *  Composition ─ {gases, particulates}). Layer reads them at bind
 *  but does not own a particulate_in slot anymore. */
export interface ICompositionView {
    readonly components: ReadonlyArray<{
        readonly speciesId: string;
        readonly moleFraction: number;
        readonly molarMass: number;
    }>;
    /** Reference pressure used to derive the initial mole / mass
     *  inventory at reset, via the ideal gas law. */
    readonly referencePressurePa: number;
    /** Particulates carried by this composition. V1 stub: recorded
     *  as metadata only; no state-vector contribution from the layer. */
    readonly particulates: ReadonlyArray<IParticulateMetadata>;
}

/** Structural guard for the composition shape. The session-builder
 *  uses this to validate payloads handed to `bindComposition`. */
export function isCompositionView(v: unknown): v is ICompositionView {
    if (!v || typeof v !== "object") return false;
    const c = v as Partial<ICompositionView>;
    return Array.isArray(c.components) && Array.isArray(c.particulates) && typeof c.referencePressurePa === "number" && Number.isFinite(c.referencePressurePa);
}

export class AtmosphereLayerNode extends IntegrableRuntimeNode implements IDeclaresPorts, IIntegrable, IHasSampleRateRequirement {
    /** Effective species schema in state-vector order. Re-derived at
     *  `reset()` from the bound composition (the config-link path) OR
     *  from the V1 fallback when nothing is wired. Stable across the
     *  run so the solver's owned state vector shape doesn't change
     *  mid-integration. */
    private _effectiveSpecies: ReadonlyArray<string> = V1_SPECIES_ORDER as ReadonlyArray<string>;

    /** Per-species molar mass [kg/mol], parallel to `_effectiveSpecies`.
     *  Populated at reset from the bound composition, or from
     *  CHEMICAL_SPECIES_V1 on the fallback path. */
    private _effectiveMolarMass: ReadonlyArray<number> = V1_SPECIES_ORDER.map((sp) => CHEMICAL_SPECIES_V1[sp].molarMass);

    /** Read-only accessor for tests / sibling nodes that need to know
     *  which species are currently being integrated. */
    public get activeSpecies(): ReadonlyArray<string> {
        return this._effectiveSpecies;
    }

    // ── Editables ────────────────────────────────────────────────────

    /** Layer volume in m³. */
    @cloneable private _volumeM3: number = 100;
    /** Layer temperature in kelvin. Source-of-truth: the layer OWNS
     *  its temperature now (2026-06-08), instead of reading it from
     *  the SceneStateView. This breaks the prior cycle (atmosphere
     *  reads scene → scene reads atmosphere) and lets a wired
     *  Atmosphere drive the Scene's display values via the config-
     *  link binding. Default 293.15 K = 20 °C engineering lab. */
    @cloneable private _temperatureK: number = 293.15;
    /** Preset key used to seed the initial mass vector when no
     *  composition is wired AND `_initialMassKg` is left empty. V1
     *  fallback path only. */
    @cloneable private _initialAtmosphere: string = "earthHumidAirSeaLevel";
    /** Initial mass inventory in kg, one entry per species in the
     *  effective species order. Empty / shorter array triggers auto-
     *  derivation from the bound composition or the V1 preset fallback
     *  at the next `reset()`. */
    @cloneable private _initialMassKg: ReadonlyArray<number> = [];

    /** Live mass storage in kg, parallel to `_effectiveSpecies`. */
    @cloneable private _mass: number[] = [];

    /** Binding state: populated by the session-builder's config-link
     *  sync pass before reset() runs. Snapshotted at reset() into
     *  `_effectiveSpecies` / `_effectiveMolarMass`. Particulates are
     *  accessed through `_boundComposition.particulates` — the Layer
     *  no longer owns a particulate slot of its own. */
    private _boundComposition: ICompositionView | null = null;

    /** P8 sample-rate: 100 Hz is the layer's parameter-independent
     *  baseline. ECLSS / habitat-air mass-balance dynamics happen on
     *  the sub-second scale; integrating faster doesn't add accuracy
     *  for a well-stirred volume. The user can pin a different value
     *  via the inherited `requiredSampleRateHz` editable. */
    protected override computeRequiredHz(): number {
        return 100;
    }

    @editable("number", { unit: "m³" })
    public get volume(): number {
        return this._volumeM3;
    }
    public set volume(v: number) {
        const next = v > 0 ? v : 1e-6;
        this.setField("volume", this._volumeM3, next, (n) => {
            this._volumeM3 = n;
            this._reseedFromCurrent();
        });
    }

    /** Quantity-aware temperature accessor (canonical SI storage in
     *  kelvin; the property panel renders Temperature so users can
     *  edit in °C). The Atmosphere container exposes a paralle
     *  editable that routes to its internal default layer. */
    @editable("number", { unit: "K" })
    public get temperature_k(): number {
        return this._temperatureK;
    }
    public set temperature_k(v: number) {
        const next = v > 0 ? v : 293.15;
        this.setField("temperature_k", this._temperatureK, next, (n) => {
            this._temperatureK = n;
            this._reseedFromCurrent();
        });
    }
    /** Camel-case alias for programmatic / Quantity-aware call sites. */
    public get temperatureK(): number {
        return this._temperatureK;
    }
    public set temperatureK(v: number) {
        this.temperature_k = v;
    }
    public get temperatureQ(): Temperature {
        return new Temperature(this._temperatureK, Temperature.Units.k);
    }
    public set temperatureQ(q: Temperature) {
        this.temperature_k = q.getValue(Temperature.Units.k);
    }

    @editable("string")
    public get initial_atmosphere_preset(): string {
        return this._initialAtmosphere;
    }
    public set initial_atmosphere_preset(v: string) {
        const next = v in ATMOSPHERE_PRESETS ? v : "earthHumidAirSeaLevel";
        this.setField("initial_atmosphere_preset", this._initialAtmosphere, next, (n) => {
            this._initialAtmosphere = n;
            this._reseedFromCurrent();
        });
    }
    /** Internal camelCase alias kept for backward compat. */
    public get initialAtmosphere(): string {
        return this._initialAtmosphere;
    }
    public set initialAtmosphere(v: string) {
        this.initial_atmosphere_preset = v;
    }

    // ── Viewables (live mass + aggregates) ──────────────────────────

    @viewable("number") public get total_mass(): number {
        let s = 0;
        for (const m of this._mass) s += m;
        return s;
    }
    public get totalMass(): number {
        return this.total_mass;
    }

    @viewable("number") public get total_pressure(): number {
        return this._computeTotalPressure(this._temperatureK);
    }
    public get totalPressure(): number {
        return this.total_pressure;
    }

    @viewable("number") public get density(): number {
        return this.total_mass / Math.max(1e-12, this._volumeM3);
    }

    @viewable("number") public get bound_particulate_count(): number {
        return this._boundComposition?.particulates?.length ?? 0;
    }
    @viewable("number") public get bound_composition_components(): number {
        return this._boundComposition ? this._boundComposition.components.length : 0;
    }

    // ── Ports (frozen at construction) ──────────────────────────────

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = this._buildInputPorts();
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = this._buildOutputPorts();

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
        // Auto-init the mass vector from the V1 fallback path so the
        // property panel's LIVE STATE viewables (total_mass, total_
        // pressure, density) show MEANINGFUL values as soon as the
        // user drops the node — without waiting for a simulation run.
        // Session-free since 2026-06-08: the layer no longer reads
        // temperature from the SceneStateView, so reset() doesn't
        // need a real session.
        this.reset({} as never);
    }

    /**
     * The layer's editor surface is species-agnostic. Per-species
     * `delta_<sp>_<k>` inputs and `mass_<sp>` / `mole_fraction_<sp>`
     * etc. outputs are deliberately omitted: the species schema is
     * composition-driven, so hardcoding V1_SPECIES_ORDER would create
     * phantom ports for absent species. The runtime rhs() / fire()
     * still address per-species channels dynamically — any
     * externally-allocated channel (test stubs, codegen) with the
     * right slot name keeps working; only the editor's port bag is
     * trimmed.
     */
    protected _buildInputPorts(): IPortDescriptor[] {
        return [{ slot: ATMOSPHERE_LAYER_IN_COMPOSITION, optional: true, type: "composition" }];
    }

    protected _buildOutputPorts(): IPortDescriptor[] {
        return [
            { slot: ATMOSPHERE_LAYER_OUT_PRESSURE, optional: true, type: "float" },
            { slot: ATMOSPHERE_LAYER_OUT_TEMPERATURE, optional: true, type: "float" },
            { slot: ATMOSPHERE_LAYER_OUT_DENSITY, optional: true, type: "float" },
            // Layer anchor consumed by the Atmosphere container's
            // variadic layer_in_<k>. Dashed cable, type "layer".
            { slot: ATMOSPHERE_LAYER_OUT_ANCHOR, optional: true, type: "layer" },
        ];
    }

    // ── Binding API (called by graph-session-builder) ───────────────

    /** Called by the session-builder when a CompositionNode is wired
     *  to `composition_in`. Records the bound composition; the
     *  schema is snapshotted into `_effectiveSpecies` at the next
     *  `reset()`. Particulates ride along inside the composition
     *  (composition.particulates), so wiring the composition is
     *  enough — no separate bindParticulate seam on the Layer.
     *  Passing null clears the binding (falls back to V1).
     *
     *  Re-derives mass + bumps viewables so the property panel
     *  updates immediately when the user wires / unwires. */
    public bindComposition(_compositionItemId: string, composition: ICompositionView | null): void {
        const prev = this._boundComposition;
        this._boundComposition = composition;
        if (prev !== composition) this._reseedFromCurrent();
    }

    /** Called by the session-builder at the start of its sync pass to
     *  wipe stale bindings before re-applying current wirings. */
    public clearBindings(): void {
        this._boundComposition = null;
    }

    // ── IIntegrable ─────────────────────────────────────────────────

    public get stateSize(): number {
        return this._effectiveSpecies.length;
    }

    public get stateNames(): ReadonlyArray<string> {
        return this._effectiveSpecies.map((sp) => `m_${sp}`);
    }

    public gatherState(y: Float64Array, off: number): void {
        for (let i = 0; i < this.stateSize; i++) y[off + i] = this._mass[i] ?? 0;
    }

    public writeState(y: Float64Array, off: number): void {
        for (let i = 0; i < this.stateSize; i++) {
            const v = y[off + i];
            this._mass[i] = Number.isFinite(v) && v > 0 ? v : 0;
        }
    }

    /**
     * dm_i/dt = sum of delta_<species_i>_<k> contributions queued in
     * the input snapshot. Species outside V1_SPECIES_ORDER have no
     * editor-exposed producer slot, but the runtime still respects
     * any externally allocated channel.
     */
    public rhs(_t: number, _y: Float64Array, off: number, inputs: IIntegrationInputs, dydt: Float64Array): void {
        for (let i = 0; i < this.stateSize; i++) {
            dydt[off + i] = inputs.sumPrefix(ATMOSPHERE_LAYER_IN_DELTA_PREFIX(this._effectiveSpecies[i]));
        }
    }

    // ── Lifecycle ───────────────────────────────────────────────────

    public override reset(_session: ISession): void {
        // 1. Snapshot effective species schema from the current
        //    binding state (or fall back to V1).
        this._snapshotSpeciesSchema();

        // 2. Seed mass vector. Priority order:
        //    a. Explicit `_initialMassKg` editable (length must match
        //       current effective species count).
        //    b. Bound composition: derive via ideal gas at composition's
        //       reference pressure + scene temperature.
        //    c. V1 fallback: ATMOSPHERE_PRESETS[_initialAtmosphere].
        const T = this._temperatureK;
        if (this._initialMassKg.length === this.stateSize) {
            this._mass = [...this._initialMassKg];
        } else if (this._boundComposition) {
            this._mass = this._deriveMassFromComposition(T);
        } else {
            this._mass = this._deriveMassFromPreset(T);
        }
    }

    public override fire(session: ISession, _t: number): void {
        const T = this._temperatureK;
        const totalMoles = this._totalMoles();
        const P = this._computeTotalPressure(T, totalMoles);
        const totalMass = this.total_mass;
        for (let i = 0; i < this.stateSize; i++) {
            const sp = this._effectiveSpecies[i];
            const moles = this._mass[i] / this._effectiveMolarMass[i];
            const x = totalMoles > 0 ? moles / totalMoles : 0;
            this._publishScalar(session, ATMOSPHERE_LAYER_OUT_MASS(sp), this._mass[i]);
            this._publishScalar(session, ATMOSPHERE_LAYER_OUT_MOLE_FRACTION(sp), x);
            this._publishScalar(session, ATMOSPHERE_LAYER_OUT_PARTIAL_PRESSURE(sp), x * P);
            this._publishScalar(session, ATMOSPHERE_LAYER_OUT_PPM(sp), x * 1e6);
        }
        this._publishScalar(session, ATMOSPHERE_LAYER_OUT_PRESSURE, P);
        this._publishScalar(session, ATMOSPHERE_LAYER_OUT_TEMPERATURE, T);
        this._publishScalar(session, ATMOSPHERE_LAYER_OUT_DENSITY, totalMass / Math.max(1e-12, this._volumeM3));
    }

    // ── Gate-facing API (P9.6, AtmosphereGate refactor 2026-06-09) ──
    //
    // AtmosphereGate config-links directly to two atmospheres and
    // reads/writes them via the three methods below — no per-species
    // editor channels needed (those are gone since P9.3). The contract
    // is intentionally minimal: lookup by speciesId string, return /
    // apply scalar mass values. Unknown species (not in the bound
    // composition's effective list) read as 0 / silently no-op on
    // apply, so a gate whose two atmospheres carry overlapping but
    // non-identical species lists degrades gracefully.

    /** Look up this layer's current mass [kg] for `speciesId`. Returns
     *  0 when the species is not in the effective list. */
    public getMassKg(speciesId: string): number {
        const idx = this._effectiveSpecies.indexOf(speciesId);
        if (idx < 0) return 0;
        return this._mass[idx] ?? 0;
    }

    /** Look up this layer's current mole fraction for `speciesId`.
     *  Computed from per-species moles / total moles; returns 0 when
     *  the species is not in the layer or the layer carries no mass. */
    public getMoleFraction(speciesId: string): number {
        const idx = this._effectiveSpecies.indexOf(speciesId);
        if (idx < 0) return 0;
        const totalMoles = this._totalMoles();
        if (totalMoles <= 0) return 0;
        const moles = (this._mass[idx] ?? 0) / this._effectiveMolarMass[idx];
        return moles / totalMoles;
    }

    /** Apply a signed mass delta [kg] to this layer's `speciesId` slot.
     *  Used by AtmosphereGate to push/pull mass per tick. Negative
     *  results are clamped to zero (no negative mass). Species not in
     *  the effective list silently no-op. */
    public applyMassDelta(speciesId: string, deltaKg: number): void {
        if (!Number.isFinite(deltaKg) || deltaKg === 0) return;
        const idx = this._effectiveSpecies.indexOf(speciesId);
        if (idx < 0) return;
        const cur = this._mass[idx] ?? 0;
        const next = cur + deltaKg;
        this._mass[idx] = next > 0 ? next : 0;
    }

    /** Read-only accessor for the gate's iteration loop: yields the
     *  layer's pressure (Pa), temperature (K), and volume (m³) without
     *  forcing the gate to know about sampleAggregates's full shape. */
    public get pressurePa(): number {
        return this._computeTotalPressure(this._temperatureK);
    }

    /** Container-facing accessor: the Atmosphere container queries this
     *  to volume-weight the per-layer pressure / temperature / density
     *  across its active set. Session-free now that the layer owns its
     *  own temperature (the prior _readSceneTemperatureK(session) lookup
     *  is gone). The Scene's SceneStateView also calls into a similar
     *  composite path through the container so a wired Atmosphere drives
     *  the Scene's display fields. */
    public sampleAggregates(): { pressure: number; temperatureK: number; density: number; mass: number; volumeM3: number } {
        const T = this._temperatureK;
        const totalMoles = this._totalMoles();
        const P = this._computeTotalPressure(T, totalMoles);
        const mass = this.total_mass;
        return {
            pressure: P,
            temperatureK: T,
            density: mass / Math.max(1e-12, this._volumeM3),
            mass,
            volumeM3: this._volumeM3,
        };
    }

    // ── Internals ───────────────────────────────────────────────────

    /**
     * Recompute `_effectiveSpecies` + `_effectiveMolarMass` from the
     * bound composition. With no composition bound, falls back to
     * V1_SPECIES_ORDER + CHEMICAL_SPECIES_V1 molar masses.
     */
    private _snapshotSpeciesSchema(): void {
        if (!this._boundComposition) {
            this._effectiveSpecies = V1_SPECIES_ORDER as ReadonlyArray<string>;
            this._effectiveMolarMass = V1_SPECIES_ORDER.map((sp) => CHEMICAL_SPECIES_V1[sp].molarMass);
            return;
        }
        const species: string[] = [];
        const molarMass: number[] = [];
        const seen = new Set<string>();
        for (const c of this._boundComposition.components) {
            if (seen.has(c.speciesId)) continue;
            seen.add(c.speciesId);
            species.push(c.speciesId);
            molarMass.push(c.molarMass);
        }
        this._effectiveSpecies = species;
        this._effectiveMolarMass = molarMass;
    }

    private _totalMoles(): number {
        let n = 0;
        for (let i = 0; i < this.stateSize; i++) {
            n += this._mass[i] / this._effectiveMolarMass[i];
        }
        return n;
    }

    private _computeTotalPressure(temperatureK: number, totalMoles?: number): number {
        const n = totalMoles ?? this._totalMoles();
        // Ideal gas: P = nRT / V.
        return (n * GAS_CONSTANT_R * temperatureK) / Math.max(1e-12, this._volumeM3);
    }

    /** Re-derive the mass vector from the CURRENT volume / temperature /
     *  preset / composition. Triggered by the editable setters so the
     *  property panel's LIVE STATE viewables (total_mass, total_pressure,
     *  density) reflect what the user JUST changed, without waiting for
     *  a simulation run.
     *
     *  Also pumps a notifyPropertyChanged on the affected viewables so
     *  the property panel's per-property subscription re-renders the
     *  numbers. Without this, the user has to click another node and
     *  come back to see the update. */
    private _reseedFromCurrent(): void {
        this.reset({} as never);
        this.notifyPropertyChanged("total_mass", null, this.total_mass);
        this.notifyPropertyChanged("total_pressure", null, this.total_pressure);
        this.notifyPropertyChanged("density", null, this.density);
    }

    /**
     * Derive the initial mass vector from a bound composition. Total
     * moles come from the ideal gas at the composition's reference
     * pressure × scene volume / RT. Species not in the composition
     * seed at zero mass.
     */
    private _deriveMassFromComposition(temperatureK: number): number[] {
        const mass: number[] = new Array(this.stateSize).fill(0);
        if (!this._boundComposition || temperatureK <= 0) return mass;
        const P = this._boundComposition.referencePressurePa;
        if (P <= 0) return mass;
        const totalMoles = (P * this._volumeM3) / (GAS_CONSTANT_R * temperatureK);
        const fractionBySpecies = new Map<string, number>();
        for (const c of this._boundComposition.components) {
            fractionBySpecies.set(c.speciesId, c.moleFraction);
        }
        for (let i = 0; i < this.stateSize; i++) {
            const sp = this._effectiveSpecies[i];
            const x = fractionBySpecies.get(sp) ?? 0;
            mass[i] = x * totalMoles * this._effectiveMolarMass[i];
        }
        return mass;
    }

    /**
     * V1 fallback: invert the ideal gas law against the legacy
     * ATMOSPHERE_PRESETS map. Used when nothing is bound — preserves
     * the original single-atmosphere quick-start behavior.
     */
    private _deriveMassFromPreset(temperatureK: number): number[] {
        const preset = ATMOSPHERE_PRESETS[this._initialAtmosphere] ?? ATMOSPHERE_PRESETS.earthHumidAirSeaLevel;
        const P = preset.id === "vacuum" ? 0 : 101325;
        const mass: number[] = new Array(this.stateSize).fill(0);
        if (P === 0 || temperatureK <= 0) return mass;
        const totalMoles = (P * this._volumeM3) / (GAS_CONSTANT_R * temperatureK);
        for (let i = 0; i < this.stateSize; i++) {
            const sp = this._effectiveSpecies[i] as ChemicalSpeciesId;
            const x = preset.moleFractions[sp] ?? 0;
            mass[i] = x * totalMoles * this._effectiveMolarMass[i];
        }
        return mass;
    }

    protected _publishScalar(session: ISession, slot: string, value: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== slot || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, value);
        }
    }
}

/** Factory invoked by the Physics.Scene sub-plugin registration. */
export function createAtmosphereLayerNode(): AtmosphereLayerNode {
    return new AtmosphereLayerNode();
}

// Cartesian3 is imported above because RuntimeNode's constructor
// signature takes an `ICartesian` position parameter; keep the import
// alive for downstream callers who may want to construct directly with
// a position.
void Cartesian3;

// Imported guards are exposed here so the session-builder can sanity-
// check duck-typed payloads. The `void` reference keeps tree-shakers
// from dropping them.
void isGasMetadata;

// IGasMetadata is imported as a structural reference; the legacy
// `_deriveMassFromPreset` path uses CHEMICAL_SPECIES_V1 to look up
// molar masses by V1 species id (matches the IGasMetadata shape).
export type { IGasMetadata };
