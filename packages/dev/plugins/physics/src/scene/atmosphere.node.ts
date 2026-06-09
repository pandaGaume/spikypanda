/**
 * `Physics.Scene:atmosphere` — Atmosphere = AtmosphereLayer +
 * multi-layer container behavior.
 *
 * Design (2026-06-08 simplification): an `AtmosphereNode` IS an
 * `AtmosphereLayerNode` plus the container affordances (variadic
 * `layer_in_<k>`, `atmosphere_out` config-link, composite IIntegrable
 * dispatch). The inheritance eliminates the prior _defaultLayer
 * indirection: when no external layers are wired, the atmosphere
 * just RUNS as a layer (its own composition, temperature, mass state,
 * integration). When external Layers are wired through `layer_in_<k>`,
 * the inherited per-self integration is SUPPRESSED and the container
 * delegates to the bound layer set.
 *
 * UX consequences:
 *   - Drop "Atmosphere" alone → working single-layer atmosphere out of
 *     the box (composition_in, temperature_k editable, etc., all
 *     inherited from the Layer surface). The Scene reads its temperature/
 *     pressure/density from this atmosphere directly.
 *   - Drop "Atmosphere" + N "AtmosphereLayer" wired → multi-layer
 *     stratification. The Atmosphere's own composition_in becomes
 *     dormant (still on the canvas, no runtime effect); each external
 *     layer carries its own composition. The container's outputs
 *     are volume-weighted aggregates across the active layer set.
 *
 * `atmosphere_out` (type "atmosphere", config-link) is the SCENE-facing
 * anchor — wired into the SceneItem's `atmosphere_in` so the
 * SceneStateView resolves its temperature/pressure/density off the
 * atmosphere's `sampleAggregates()` (IAtmosphereAggregator).
 *
 * The inherited `layer_out` (type "layer") stays on the node, which
 * means an Atmosphere can theoretically be wired into ANOTHER
 * Atmosphere's `layer_in_<k>` (nested multi-layer atmospheres).
 * Architecturally interesting; V1 doesn't bake any special behavior
 * around this.
 */

import { editable, IIntegrationInputs, IPortDescriptor, ISession, Temperature, viewable } from "spikypanda-core";
import type { IAtmosphereAggregate, IAtmosphereAggregator } from "spikypanda-core";
import { AtmosphereLayerNode } from "./atmosphere-layer.node.js";

/** Output slot names exposed at the editor surface. */
export const ATMOSPHERE_OUT_PRESSURE = "pressure";
export const ATMOSPHERE_OUT_TEMPERATURE = "temperature";
export const ATMOSPHERE_OUT_DENSITY = "density";
/** Config-link anchor consumed by the SceneItem's `atmosphere_in` slot.
 *  Type "atmosphere" (dashed cable). */
export const ATMOSPHERE_OUT_ANCHOR = "atmosphere_out";
/** Variadic config-link input that wires AtmosphereLayer instances.
 *  Type "layer" (dashed cable). */
export const ATMOSPHERE_IN_LAYER_PREFIX = "layer_in_";

/** Structural shape the container needs from a bound Layer. The
 *  AtmosphereLayerNode satisfies this; tests may pass a stub with the
 *  same methods to exercise the composite IIntegrable dispatch.
 *  `sampleAggregates` is session-free now that the layer owns its
 *  own temperature editable. */
export interface ILayerHandle {
    readonly stateSize: number;
    readonly stateNames: ReadonlyArray<string>;
    gatherState(y: Float64Array, off: number): void;
    writeState(y: Float64Array, off: number): void;
    rhs(t: number, y: Float64Array, off: number, inputs: IIntegrationInputs, dydt: Float64Array): void;
    reset(session: ISession): void;
    fire(session: ISession, t: number): void;
    sampleAggregates(): { pressure: number; temperatureK: number; density: number; mass: number; volumeM3: number };
}

export class AtmosphereNode extends AtmosphereLayerNode implements IAtmosphereAggregator {
    /** Layers wired through the variadic `layer_in_<k>` config-link.
     *  When non-empty, the inherited Layer-self state is suppressed
     *  and the container delegates everything to this bound set. */
    private _boundLayers: ILayerHandle[] = [];

    // ── Viewables (V1 metadata-only) ────────────────────────────────

    @viewable("number") public get bound_layer_count(): number {
        return this._boundLayers.length;
    }
    @viewable("number") public get active_layer_count(): number {
        return this._boundLayers.length > 0 ? this._boundLayers.length : 1;
    }

    // ── Editor port surface ─────────────────────────────────────────
    //
    // Inherits the Layer's composition_in input + pressure/temperature/
    // density float outputs. Removes the inherited `layer_out` anchor
    // (the Atmosphere faces the Scene via `atmosphere_out`, not via
    // another Atmosphere's layer_in pool) and adds:
    //   - `layer_in_0` variadic config-link (type "layer") for external
    //     AtmosphereLayer wirings
    //   - `atmosphere_out` config-link (type "atmosphere") for the
    //     SceneItem's atmosphere_in slot

    protected override _buildInputPorts(): IPortDescriptor[] {
        return [...super._buildInputPorts(), { slot: `${ATMOSPHERE_IN_LAYER_PREFIX}0`, optional: true, type: "layer" }];
    }

    protected override _buildOutputPorts(): IPortDescriptor[] {
        return super
            ._buildOutputPorts()
            .filter((p) => p.slot !== "layer_out")
            .concat({ slot: ATMOSPHERE_OUT_ANCHOR, optional: true, type: "atmosphere" });
    }

    // ── Container editable parity ───────────────────────────────────
    //
    // The Layer's `temperature_k` and `volume` editables ARE the
    // Atmosphere's editables via inheritance — no proxy code needed.
    // The Quantity wrappers (`temperatureQ`, etc.) inherit too. Drop
    // "Atmosphere" and the property panel shows volume + temperature_k
    // immediately, configuring the inherited Layer-self.
    //
    // For clarity, we re-expose a Quantity-typed read accessor that
    // any consumer code can use without knowing the inheritance chain.
    public get atmosphereTemperature(): Temperature {
        return this.temperatureQ;
    }

    // ── Binding API (container-specific) ────────────────────────────

    /** Called for each Layer wired to `layer_in_<k>`. Binding order =
     *  wiring order = state-vector offset assignment order. */
    public bindLayer(_layerItemId: string, layer: ILayerHandle): void {
        this._boundLayers.push(layer);
    }

    /** Wipe BOTH the bound layer list AND the inherited Layer-self
     *  composition binding. Session-builder calls this once per sync
     *  pass before re-applying wirings. */
    public override clearBindings(): void {
        super.clearBindings();
        this._boundLayers = [];
    }

    // ── IIntegrable (conditional composite vs inherited self) ───────
    //
    // When external layers are wired, the composite dispatches across
    // them. When none are wired, super (inherited Layer) handles
    // everything — Atmosphere is just acting as a Layer.

    public override get stateSize(): number {
        if (!this._boundLayers || this._boundLayers.length === 0) return super.stateSize;
        let s = 0;
        for (const l of this._boundLayers) s += l.stateSize;
        return s;
    }

    public override get stateNames(): ReadonlyArray<string> {
        if (!this._boundLayers || this._boundLayers.length === 0) return super.stateNames;
        const names: string[] = [];
        for (let li = 0; li < this._boundLayers.length; li++) {
            const prefix = `L${li}_`;
            for (const n of this._boundLayers[li].stateNames) names.push(prefix + n);
        }
        return names;
    }

    public override gatherState(y: Float64Array, off: number): void {
        if (!this._boundLayers || this._boundLayers.length === 0) return super.gatherState(y, off);
        let cur = off;
        for (const layer of this._boundLayers) {
            layer.gatherState(y, cur);
            cur += layer.stateSize;
        }
    }

    public override writeState(y: Float64Array, off: number): void {
        if (!this._boundLayers || this._boundLayers.length === 0) return super.writeState(y, off);
        let cur = off;
        for (const layer of this._boundLayers) {
            layer.writeState(y, cur);
            cur += layer.stateSize;
        }
    }

    public override rhs(t: number, y: Float64Array, off: number, inputs: IIntegrationInputs, dydt: Float64Array): void {
        if (!this._boundLayers || this._boundLayers.length === 0) return super.rhs(t, y, off, inputs, dydt);
        let cur = off;
        for (const layer of this._boundLayers) {
            layer.rhs(t, y, cur, inputs, dydt);
            cur += layer.stateSize;
        }
    }

    // ── Lifecycle ───────────────────────────────────────────────────

    public override reset(session: ISession): void {
        if (!this._boundLayers || this._boundLayers.length === 0) return super.reset(session);
        for (const layer of this._boundLayers) layer.reset(session);
    }

    public override fire(session: ISession, t: number): void {
        if (!this._boundLayers || this._boundLayers.length === 0) {
            // Default mode: act as a Layer. The inherited fire()
            // publishes the per-species + pressure/temperature/density
            // outputs from this node's own state — exactly the values
            // a 1-layer atmosphere should expose to Scene consumers.
            return super.fire(session, t);
        }
        // Composite mode: let each external layer publish its own
        // per-species + scalar outputs, then publish the container's
        // volume-weighted aggregates onto OUR pressure/temperature/
        // density slots (each layer publishes onto its own slot
        // independently, so there is no collision).
        for (const layer of this._boundLayers) layer.fire(session, t);
        const agg = this.sampleAggregates();
        this._publishScalar(session, ATMOSPHERE_OUT_PRESSURE, agg.pressure);
        this._publishScalar(session, ATMOSPHERE_OUT_TEMPERATURE, agg.temperatureK);
        this._publishScalar(session, ATMOSPHERE_OUT_DENSITY, agg.density);
    }

    // ── Gate-facing API: aggregate across active layers ─────────────
    //
    // Inherits getMassKg / getMoleFraction / applyMassDelta from
    // AtmosphereLayer (which addresses this node's own self-state
    // when in default mode). When external Layers are wired, we
    // override to dispatch across the active set:
    //   - getMassKg → SUM across active layers
    //   - getMoleFraction → volume-weighted (Σ V_i x_i) / V_total
    //   - applyMassDelta → split proportionally by volume
    //
    // Default mode (no external layers): falls through to super, which
    // reads/writes self. So a gate config-linked to an Atmosphere works
    // in both default and multi-layer scenarios with no special-casing
    // at the gate site.

    public override getMassKg(speciesId: string): number {
        if (!this._boundLayers || this._boundLayers.length === 0) {
            return super.getMassKg(speciesId);
        }
        let sum = 0;
        for (const layer of this._boundLayers) {
            const m = (layer as unknown as { getMassKg?(id: string): number }).getMassKg?.(speciesId) ?? 0;
            sum += m;
        }
        return sum;
    }

    public override getMoleFraction(speciesId: string): number {
        if (!this._boundLayers || this._boundLayers.length === 0) {
            return super.getMoleFraction(speciesId);
        }
        let totalVolume = 0;
        let numerator = 0;
        for (const layer of this._boundLayers) {
            const x = (layer as unknown as { getMoleFraction?(id: string): number }).getMoleFraction?.(speciesId) ?? 0;
            const v = layer.sampleAggregates().volumeM3;
            totalVolume += v;
            numerator += v * x;
        }
        return totalVolume > 0 ? numerator / totalVolume : 0;
    }

    public override applyMassDelta(speciesId: string, deltaKg: number): void {
        if (!this._boundLayers || this._boundLayers.length === 0) {
            super.applyMassDelta(speciesId, deltaKg);
            return;
        }
        // Split proportionally by volume so the addition lands in
        // larger compartments more heavily. Layers with applyMassDelta
        // absent get nothing — the type guard keeps this defensive
        // against stub ILayerHandle test objects.
        let totalVolume = 0;
        for (const layer of this._boundLayers) totalVolume += layer.sampleAggregates().volumeM3;
        if (totalVolume <= 0) return;
        for (const layer of this._boundLayers) {
            const apply = (layer as unknown as { applyMassDelta?(id: string, d: number): void }).applyMassDelta;
            if (typeof apply !== "function") continue;
            const share = (layer.sampleAggregates().volumeM3 / totalVolume) * deltaKg;
            apply.call(layer, speciesId, share);
        }
    }

    public override get pressurePa(): number {
        if (!this._boundLayers || this._boundLayers.length === 0) {
            return super.pressurePa;
        }
        return this.sampleAggregates().pressure;
    }

    /**
     * IAtmosphereAggregator implementation. Volume-weighted means:
     *   pressure    = Σ (V_i · P_i) / V_total
     *   temperature = Σ (V_i · T_i) / V_total
     *   density     = Σ M_i / V_total
     *
     * Default mode (no external layers): returns the inherited Layer's
     * own values (super.sampleAggregates()), which is what a single-
     * layer atmosphere should expose. Container mode (N external):
     * volume-weighted means across the bound set.
     *
     * Session-free — each layer's `sampleAggregates()` uses its OWN
     * temperature editable, so there is no cycle through the
     * SceneStateView (the Scene's temperature now resolves through
     * this very call when an atmosphere is wired into atmosphere_in).
     */
    public override sampleAggregates(): IAtmosphereAggregate {
        if (!this._boundLayers || this._boundLayers.length === 0) {
            return super.sampleAggregates();
        }
        let totalVolume = 0;
        let pressureNumerator = 0;
        let temperatureNumerator = 0;
        let totalMass = 0;
        for (const layer of this._boundLayers) {
            const s = layer.sampleAggregates();
            totalVolume += s.volumeM3;
            pressureNumerator += s.volumeM3 * s.pressure;
            temperatureNumerator += s.volumeM3 * s.temperatureK;
            totalMass += s.mass;
        }
        const V = Math.max(1e-12, totalVolume);
        return {
            pressure: pressureNumerator / V,
            temperatureK: temperatureNumerator / V,
            density: totalMass / V,
            mass: totalMass,
            volumeM3: totalVolume,
        };
    }

    // ── Test affordances ────────────────────────────────────────────

    /** Number of external Layers wired. Distinct from active_layer_count
     *  (which is 1 in default mode and N in container mode). */
    public get boundLayerCount(): number {
        return this._boundLayers.length;
    }
}

/** Factory invoked by the Physics.Scene sub-plugin registration. */
export function createAtmosphereNode(): AtmosphereNode {
    return new AtmosphereNode();
}

// `editable` is imported only because TypeScript flags it as unused
// when the class only inherits @editable members without declaring
// any new ones. The reference below keeps the import alive (and the
// decorator side-effect path warm) without introducing dead-code
// warnings under strict noUnusedLocals.
void editable;
