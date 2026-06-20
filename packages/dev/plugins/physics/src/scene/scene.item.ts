/**
 * SceneItem — descriptive scene carrier.
 *
 * The SceneItem replaces the legacy `SceneNode` (RuntimeNode) with a
 * pure `GraphItem` extension. It does NOT participate in the runtime
 * dispatch loop:
 *   - no `fire()`, no `inputPorts`, no `outputPorts` consumed by the
 *     scheduler;
 *   - it appears on the editor canvas as a draggable, property-panel-
 *     editable entity;
 *   - its anchors (`scene_out`, `atmosphere_in`, variadic `solver_in_*`
 *     and `shared_in_*`) are CONFIG-LINKS — visually dashed in the
 *     editor, resolved at session bind time, never carrying a payload
 *     during `fire()`.
 *
 * The SceneItem's role is twofold:
 *   1. STORAGE — `@cloneable` fields hold the initial values for
 *      gravity, temperature, pressure, timeScale, the local transform,
 *      and the manual sample-rate override. Plus optional `*SourceId`
 *      refs (V1: temperature, pressure, timeScale, localPosition,
 *      localRotation, localScale) pointing at publisher nodes that
 *      drive the latent live each tick.
 *   2. RESOLUTION — at session bind, the SceneItem produces a
 *      `SceneStateView` whose accessors are closures over EITHER the
 *      static `@cloneable` field (when no source is wired) OR the
 *      publisher's `lastPublished(slot)` (when a source is wired).
 *      The view is the live read-through that TransformNode-derived
 *      consumers, gates, sensors, etc. read each tick.
 *
 * Three referenced collections complete the picture:
 *   - `atmosphereItemId`     (slot-typed) — points at the
 *                             AtmosphereStateNode whose state IS this
 *                             scene's atmosphere. Consumed by gates.
 *   - `solverItemIds`        (variadic)   — list of solver-node IDs.
 *                             Each Sim.Graph that references this
 *                             scene attaches these solvers to its own
 *                             innerSession at reset.
 *   - `sharedNodeIds`        (variadic)   — generic shared nodes
 *                             whose proxies are auto-generated inside
 *                             every Sim.Graph that references this
 *                             scene (the generalisation of the
 *                             atmosphere-as-shared-resource pattern).
 *
 * No `parentSceneId` is stored — the parent in the 3D tree is derived
 * IMPLICITLY at session bind from the enclosing Sim.Graph's
 * scene-input wiring. A SceneItem placed at the editor's root canvas
 * has no parent; a SceneItem inside a Sim.Graph's content has the
 * scene wired on that Sim.Graph's `scene_in` anchor as its parent.
 */

import { Cartesian3, cloneable, editable, Frequency, GraphNode, Matrix4, Pressure, Quaternion, Temperature, viewable } from "spikypanda-core";
import type { IAtmosphereAggregator, ICartesian3, IIntegrable, ILiveInScene, IQuaternion, SceneStateView, SceneStateViewSources } from "spikypanda-core";
import {
    ATMOSPHERE_ANCHOR_IN,
    DEFAULT_GRAVITY,
    DEFAULT_PRESSURE,
    DEFAULT_TEMPERATURE,
    DEFAULT_TIME_SCALE,
    fieldReader,
    isAtmosphereAggregator,
    MIN_EFFECTIVE_HZ,
    SceneStateViewImpl,
    SCENE_ANCHOR_OUT,
    SHARED_ANCHOR_IN_PREFIX,
    SOLVER_ANCHOR_IN_PREFIX,
} from "spikypanda-core";

/**
 * Source-resolution adapter the runtime injects when binding a
 * SceneItem to a session. Lets the SceneItem build per-latent closures
 * without depending on the editor's viewer or the channel layer
 * directly — keeps the plugin testable in isolation and the seam
 * narrow.
 *
 * The runtime walks the SceneItem's `*SourceId` fields; for each
 * non-null ID, it asks the resolver for a thunk that returns the
 * publisher's latest value. For unwired latents, the SceneItem feeds
 * its own field via `fieldReader`.
 */
export interface SceneSourceResolver {
    /** Resolve a publisher node by ID to a thunk returning its
     *  current scalar output. The resolver is responsible for caching
     *  the publisher lookup; the SceneItem just calls the thunk on
     *  every consumer access. Returns null when the ID is invalid
     *  (publisher not found at bind time), in which case the
     *  SceneItem falls back to the static default. */
    resolveNumberSource(sourceId: string): (() => number) | null;
    /** Same as `resolveNumberSource` but for vec3 publishers
     *  (gravity, local position, scale). Returns an `ICartesian3` so
     *  the publisher can hand back a `Cartesian3` instance (methodful)
     *  or any structurally compatible value. */
    resolveCartesian3Source(sourceId: string): (() => ICartesian3) | null;
    /** Same as `resolveNumberSource` but for quaternion publishers
     *  (local rotation). */
    resolveQuaternionSource(sourceId: string): (() => IQuaternion) | null;
    /** Resolve an atmosphere reference to its concrete runtime node.
     *  Returns null when the atmosphere has been removed since the
     *  last bind (graceful degradation). */
    resolveAtmosphere(atmosphereItemId: string): IIntegrable | null;
    /** Aggregate `max(requiredHz)` over the IIntegrable leaves owned
     *  by THIS scene's solvers at the calling Sim.Graph level. The
     *  runtime computes this once per bind; the result is captured in
     *  the SceneStateView as a constant for the lifetime of the
     *  session (re-bound on topology edits). */
    aggregateEffectiveHz(): number;
}

/**
 * Scene-on-canvas: a descriptor that lives in the editor model and is
 * read at session bind to feed a `SceneStateView` consumers will use
 * each tick.
 */
export class SceneItem extends GraphNode implements ILiveInScene {
    /** ILiveInScene brand: a scene is a world object (a frame in the scene
     *  tree). Its transform `parent` is wired to the enclosing scene at
     *  session bind, so `worldTransform()` chains scene -> ... -> root; a
     *  root scene has no parent and its world equals its local pose. */
    public readonly livesInScene = true as const;

    // ── Scalar latents ────────────────────────────────────────────────
    //
    // Storage is the canonical SI scalar (K for temperature, Pa for
    // pressure, Hz for manualHz). Public accessors expose both the raw
    // SI number (cheap, used in hot paths and by the property panel via
    // @editable) and a Quantity wrapper (`temperatureQ` / `pressureQ` /
    // `manualHzQ`) for unit-aware code that wants to display °C / atm /
    // kHz / etc. without manual conversion.

    @cloneable private _gravity: Cartesian3 = new Cartesian3(DEFAULT_GRAVITY.x, DEFAULT_GRAVITY.y, DEFAULT_GRAVITY.z);
    @cloneable private _temperatureK: number = DEFAULT_TEMPERATURE.getValue(Temperature.Units.k);
    @cloneable private _pressurePa: number = DEFAULT_PRESSURE.getValue(Pressure.Units.Pa);
    /** Editable default density [kg/m³]. Only used when no atmosphere
     *  is wired through `atmosphere_in` — otherwise the atmosphere's
     *  live aggregate density takes over via the `density` getter.
     *  1.225 kg/m³ = sea-level standard atmosphere (matches
     *  DEFAULT_DENSITY in core). */
    @cloneable private _densityKgPerM3: number = 1.225;
    @cloneable private _timeScale: number = DEFAULT_TIME_SCALE;

    // ── Local 3D transform (relative to parent in the scene tree) ─────

    @cloneable private _localPosition: Cartesian3 = new Cartesian3(0, 0, 0);
    @cloneable private _localRotation: Quaternion = new Quaternion(0, 0, 0, 1);
    @cloneable private _localScale: Cartesian3 = new Cartesian3(1, 1, 1);

    // ── Dynamic source references (V1: scalars + transform parts) ─────
    //
    // Each ID points at a node whose output port (named after the slot
    // convention) drives this latent live. An empty string means "no
    // source wired — use the static default".

    @cloneable private _gravitySourceId: string = "";
    @cloneable private _temperatureSourceId: string = "";
    @cloneable private _pressureSourceId: string = "";
    @cloneable private _densitySourceId: string = "";
    @cloneable private _timeScaleSourceId: string = "";
    @cloneable private _localPositionSourceId: string = "";
    @cloneable private _localRotationSourceId: string = "";
    @cloneable private _localScaleSourceId: string = "";

    // ── Referenced collections (resolved at bind via SceneSourceResolver) ─

    /** The one canonical atmosphere of this scene, if any.
     *  Wired via the `atmosphere_in` anchor; the editor stores the
     *  publisher node's ID. Empty string = no atmosphere. */
    @cloneable private _atmosphereItemId: string = "";

    /** Live reference to the bound atmosphere node, populated by the
     *  graph-session-builder's config-link sync pass whenever an
     *  `atmosphere_out → atmosphere_in` wiring exists on the canvas.
     *
     *  NOT @cloneable: this is runtime metadata, not part of the
     *  SceneItem's serialisable identity. A reloaded canvas re-populates
     *  it on the first sync pass.
     *
     *  Used by:
     *    1. The atmosphere-aware getters on `temperature`, `pressure`,
     *       and `density`, which return the live atmosphere aggregate
     *       when bound and fall back to the static editable default
     *       otherwise. One field per property: no "EFFECTIVE_" prefix
     *       duplication in the property panel (revision 2026-06-08).
     *    2. `buildStateView()` below, which prefers this ref over the
     *       resolver round-trip when both are available. */
    private _atmosphereRef: IAtmosphereAggregator | null = null;

    /** Map of property name → live-value provider closure, populated
     *  by the graph-session-builder whenever a data wire lands on one
     *  of the Scene's per-property input ports (gravity_in,
     *  temperature_in, ...). The closure reads the publisher's current
     *  output value through the getter named after the wired output
     *  slot — Cartesian3's `vec3`, a number-publisher's `value`, an
     *  Atmosphere's `pressure`/`temperature`/`density`, etc.
     *
     *  Read priority for every per-property getter on SceneItem is:
     *    1. _propertyProviders entry (explicit data wire)
     *    2. _atmosphereRef.sampleAggregates() (for the atmosphere-only
     *       fields: temperature, pressure, density)
     *    3. The static editable default. */
    private _propertyProviders: Map<string, () => unknown> = new Map();

    /** Solver node IDs in attachment order. Variadic — wired via
     *  `solver_in_<k>` anchors. */
    @cloneable private _solverItemIds: ReadonlyArray<string> = [];

    /** Generic shared node IDs. Variadic — wired via `shared_in_<k>`
     *  anchors. Each Sim.Graph referencing this scene auto-generates
     *  a proxy per shared node in its inner canvas. */
    @cloneable private _sharedNodeIds: ReadonlyArray<string> = [];

    // ── Manual frequency override (V1: scene-level, optional) ────────

    /** `0` means "auto-derive `effectiveHz` from owned IIntegrable
     *  leaves' requiredHz". Any positive value (in hertz) pins the
     *  scene to that rate, useful for forcing a slow visualisation
     *  cadence. Exposed as a `Frequency` Quantity via `manualHzQ` for
     *  unit-aware code (`new Frequency(1, Frequency.Units.kHz)`). */
    @cloneable private _manualHzHz: number = 0;

    // ── Primary-at-root convention flag (Q-Root B1) ──────────────────

    /** When multiple SceneItems coexist at the editor's root canvas,
     *  the one with `isPrimary = true` is the scene that configures
     *  the GraphRunner's root session. Auto-elected when there is
     *  exactly one SceneItem at root regardless of this flag. */
    @cloneable private _isPrimary: boolean = false;

    // ─────────────────────────────────────────────────────────────────
    // Editable accessors
    // ─────────────────────────────────────────────────────────────────

    @editable("vector3", { layout: "block", alignement: "horizontal", unit: "m/s²", disabledWhen: "is_gravity_wired" })
    public get gravity(): Cartesian3 {
        const wired = this._readProvided("gravity", (v): v is Cartesian3 => v instanceof Cartesian3);
        if (wired) return wired;
        return this._gravity;
    }
    public set gravity(v: Cartesian3) {
        this.setField("gravity", this._gravity, v, (n) => {
            this._gravity = n;
        });
    }

    // ── Wired-input indicators (V1: panel sees `WIRED` here, the
    //    actual current value of the publisher lives on the publisher's
    //    own panel; the runtime path resolves through SceneSourceResolver
    //    in buildStateView). For atmosphere-driven fields (temperature,
    //    pressure, density) the getters above already return live values,
    //    so the indicator is just informative there. ─────────────────

    @viewable("boolean") public get is_gravity_wired(): boolean {
        return this._propertyProviders.has("gravity") || this._gravitySourceId.length > 0;
    }
    @viewable("boolean") public get is_temperature_wired(): boolean {
        return this._propertyProviders.has("temperature") || this._temperatureSourceId.length > 0 || this._atmosphereRef !== null;
    }
    @viewable("boolean") public get is_pressure_wired(): boolean {
        return this._propertyProviders.has("pressure") || this._pressureSourceId.length > 0 || this._atmosphereRef !== null;
    }
    @viewable("boolean") public get is_density_wired(): boolean {
        return this._propertyProviders.has("density") || this._densitySourceId.length > 0 || this._atmosphereRef !== null;
    }
    @viewable("boolean") public get is_time_scale_wired(): boolean {
        return this._propertyProviders.has("timeScale") || this._timeScaleSourceId.length > 0;
    }
    @viewable("boolean") public get is_local_position_wired(): boolean {
        return this._propertyProviders.has("localPosition") || this._localPositionSourceId.length > 0;
    }
    @viewable("boolean") public get is_local_rotation_wired(): boolean {
        return this._propertyProviders.has("localRotation") || this._localRotationSourceId.length > 0;
    }
    @viewable("boolean") public get is_local_scale_wired(): boolean {
        return this._propertyProviders.has("localScale") || this._localScaleSourceId.length > 0;
    }

    /** Ambient temperature in kelvin (canonical storage unit). The
     *  getter is atmosphere-aware: when a `Physics.Scene:atmosphere`
     *  is wired through `atmosphere_in`, this returns the live
     *  volume-weighted aggregate temperature from the bound
     *  atmosphere. When NO atmosphere is wired, it falls back to the
     *  user-edited default (`_temperatureK`).
     *
     *  The setter always writes to the static default — that value
     *  only matters when no atmosphere is wired, so typing into the
     *  field while an atmosphere is connected has no visible effect
     *  (the displayed value comes from the atmosphere). A future
     *  panel-level "read-only when wired" mode would close that UX
     *  gap; for V1 the user just sees the live value either way.
     *
     *  Unit-aware code should prefer `temperatureQ` for arbitrary
     *  source units (the Quantity layer wraps the same getter). */
    @editable("number", { unit: "K", disabledWhen: "is_temperature_wired" })
    public get temperature(): number {
        const wired = this._readProvided("temperature", (v): v is number => typeof v === "number" && Number.isFinite(v));
        if (wired !== null) return wired;
        if (this._atmosphereRef) {
            const t = this._atmosphereRef.sampleAggregates().temperatureK;
            if (Number.isFinite(t) && t > 0) return t;
        }
        return this._temperatureK;
    }
    public set temperature(v: number) {
        this.setField("temperature", this._temperatureK, v, (n) => {
            this._temperatureK = n;
        });
    }

    /** Ambient temperature as a `Temperature` Quantity. The getter
     *  delegates to the atmosphere-aware `temperature` getter so a
     *  wired atmosphere flows through this Quantity surface too. */
    public get temperatureQ(): Temperature {
        return new Temperature(this.temperature, Temperature.Units.k);
    }
    public set temperatureQ(q: Temperature) {
        const k = q.getValue(Temperature.Units.k);
        this.setField("temperature", this._temperatureK, k, (n) => {
            this._temperatureK = n;
        });
    }

    /** Ambient pressure in pascal (canonical storage unit). Atmosphere-
     *  aware: when an atmosphere is wired, returns its volume-weighted
     *  aggregate pressure. Otherwise the editable default. */
    @editable("number", { unit: "Pa", disabledWhen: "is_pressure_wired" })
    public get pressure(): number {
        const wired = this._readProvided("pressure", (v): v is number => typeof v === "number" && Number.isFinite(v));
        if (wired !== null) return wired;
        if (this._atmosphereRef) {
            const p = this._atmosphereRef.sampleAggregates().pressure;
            if (Number.isFinite(p) && p >= 0) return p;
        }
        return this._pressurePa;
    }
    public set pressure(v: number) {
        this.setField("pressure", this._pressurePa, v, (n) => {
            this._pressurePa = n;
        });
    }

    /** Ambient pressure as a `Pressure` Quantity. Delegates to the
     *  atmosphere-aware `pressure` getter for live reads. */
    public get pressureQ(): Pressure {
        return new Pressure(this.pressure, Pressure.Units.Pa);
    }
    public set pressureQ(q: Pressure) {
        const pa = q.getValue(Pressure.Units.Pa);
        this.setField("pressure", this._pressurePa, pa, (n) => {
            this._pressurePa = n;
        });
    }

    /** Ambient mass density in kg/m³. Atmosphere-aware: returns the
     *  live mass / volume aggregate when an atmosphere is wired, else
     *  the editable default (1.225 kg/m³ = U.S. Standard Atmosphere
     *  sea-level value). NEW 2026-06-08 — the prior EFFECTIVE_DENSITY_
     *  KG_PER_M3 viewable is dropped in favor of this single-source
     *  editable. */
    @editable("number", { unit: "kg/m³", disabledWhen: "is_density_wired" })
    public get density(): number {
        const wired = this._readProvided("density", (v): v is number => typeof v === "number" && Number.isFinite(v));
        if (wired !== null) return wired;
        if (this._atmosphereRef) {
            const d = this._atmosphereRef.sampleAggregates().density;
            if (Number.isFinite(d) && d >= 0) return d;
        }
        return this._densityKgPerM3;
    }
    public set density(v: number) {
        const next = v >= 0 ? v : this._densityKgPerM3;
        this.setField("density", this._densityKgPerM3, next, (n) => {
            this._densityKgPerM3 = n;
        });
    }

    @editable("number", { unit: "×", disabledWhen: "is_time_scale_wired" })
    public get timeScale(): number {
        const wired = this._readProvided("timeScale", (v): v is number => typeof v === "number" && Number.isFinite(v));
        if (wired !== null) return wired;
        return this._timeScale;
    }
    public set timeScale(v: number) {
        this.setField("timeScale", this._timeScale, v, (n) => {
            this._timeScale = n;
        });
    }

    @editable("vector3", { layout: "block", alignement: "horizontal", unit: "m", disabledWhen: "is_local_position_wired" })
    public get localPosition(): Cartesian3 {
        const wired = this._readProvided("localPosition", (v): v is Cartesian3 => v instanceof Cartesian3);
        if (wired) return wired;
        return this._localPosition;
    }
    public set localPosition(v: Cartesian3) {
        if (
            this.setField("localPosition", this._localPosition, v, (n) => {
                this._localPosition = n;
            })
        ) {
            // Invalidate the IHasTransform cache so residents parented to this
            // scene recompose their world (localTransform() reads these fields).
            this.invalidateTransform();
        }
    }

    public get localRotation(): Quaternion {
        const wired = this._readProvided("localRotation", (v): v is Quaternion => v instanceof Quaternion);
        if (wired) return wired;
        return this._localRotation;
    }
    public set localRotation(v: Quaternion) {
        if (
            this.setField("localRotation", this._localRotation, v, (n) => {
                this._localRotation = n;
            })
        ) {
            this.invalidateTransform();
        }
    }

    @editable("vector3", { layout: "block", alignement: "horizontal", unit: "×", disabledWhen: "is_local_scale_wired" })
    public get localScale(): Cartesian3 {
        const wired = this._readProvided("localScale", (v): v is Cartesian3 => v instanceof Cartesian3);
        if (wired) return wired;
        return this._localScale;
    }
    public set localScale(v: Cartesian3) {
        if (
            this.setField("localScale", this._localScale, v, (n) => {
                this._localScale = n;
            })
        ) {
            this.invalidateTransform();
        }
    }

    /** Local pose (IHasTransform), composed from the scene's own
     *  localPosition / localRotation / localScale editables as `T·R·S`.
     *  Read live (uncached) on each access so a property-panel edit shows up
     *  immediately, matching the SceneStateView read-through semantics.
     *  The WORLD pose is the inherited `GraphNode.worldTransform()` =
     *  `parent.worldTransform() × this`, with the enclosing scene wired as
     *  `parent` at session bind (root scene has no parent => world = local). */
    public override localTransform(): Matrix4 {
        // Babylon-aligned arg order: Compose(scale, rotation, translation).
        return Matrix4.Compose(this._localScale, this._localRotation, this._localPosition);
    }

    /** Manual sample-rate override in hertz (canonical storage). 0
     *  means "auto-derive from owned IIntegrable leaves' requiredHz".
     *  Property panel shows raw Hz; code can use `manualHzQ` for
     *  kHz / MHz / rpm input. */
    @editable("number", { unit: "Hz" })
    public get manualHz(): number {
        return this._manualHzHz;
    }
    public set manualHz(v: number) {
        this.setField("manualHz", this._manualHzHz, v, (n) => {
            this._manualHzHz = n;
        });
    }

    /** Manual sample-rate override as a `Frequency` Quantity. */
    public get manualHzQ(): Frequency {
        return new Frequency(this._manualHzHz, Frequency.Units.Hz);
    }
    public set manualHzQ(q: Frequency) {
        const hz = q.getValue(Frequency.Units.Hz);
        this.setField("manualHz", this._manualHzHz, hz, (n) => {
            this._manualHzHz = n;
        });
    }

    @editable("boolean")
    public get isPrimary(): boolean {
        return this._isPrimary;
    }
    public set isPrimary(v: boolean) {
        this.setField("isPrimary", this._isPrimary, v, (n) => {
            this._isPrimary = n;
        });
    }

    // ─────────────────────────────────────────────────────────────────
    // Reference accessors (set by the editor when config-links are wired)
    // ─────────────────────────────────────────────────────────────────

    public get atmosphereItemId(): string {
        return this._atmosphereItemId;
    }
    public set atmosphereItemId(v: string) {
        this.setField("atmosphereItemId", this._atmosphereItemId, v, (n) => {
            this._atmosphereItemId = n;
        });
    }

    /** Called by the graph-session-builder's config-link sync pass
     *  whenever an `atmosphere_out → atmosphere_in` wiring is created
     *  (or refreshed). Sets BOTH the cloneable ID (so the saved canvas
     *  re-resolves on reload) and the runtime ref (so the property
     *  panel's effective_* viewables can read live aggregates without
     *  a resolver round-trip).
     *
     *  Passing null clears the binding (matches what happens when the
     *  wire is removed on the canvas).
     *
     *  The aggregator parameter is typed as `IAtmosphereAggregator | null`
     *  so any future atmosphere implementation can plug in by just
     *  implementing `sampleAggregates()`. Plain IIntegrable nodes that
     *  happen to be wired here gracefully degrade to "no live values
     *  available" — the panel falls back to the editables. */
    public bindAtmosphere(atmosphereItemId: string, aggregator: IAtmosphereAggregator | null): void {
        const prevId = this._atmosphereItemId;
        const nextId = aggregator ? atmosphereItemId : "";
        if (prevId !== nextId) {
            this._atmosphereItemId = nextId;
            this.notifyPropertyChanged("atmosphereItemId", prevId, nextId);
        }
        const prevRef = this._atmosphereRef;
        if (prevRef !== aggregator) {
            this._atmosphereRef = aggregator;
            // Drive a property-changed event on each of the atmosphere-
            // aware editables so the property panel re-reads them on
            // the next render pass. The panel's standard subscription
            // is per-property; without these notifies the user sees
            // stale defaults until they click another node.
            this.notifyPropertyChanged("temperature", null, this.temperature);
            this.notifyPropertyChanged("pressure", null, this.pressure);
            this.notifyPropertyChanged("density", null, this.density);
        }
    }

    /** Called by the graph-session-builder when a data wire lands on
     *  one of the Scene's per-property input ports. `propertyName` is
     *  the SceneItem editable name (e.g. "gravity"), `provider` is a
     *  closure that returns the publisher's current output value (or
     *  null to clear). The provider closure is called by the property
     *  getter on every read, so live values flow through.
     *
     *  Passing `null` clears the binding so the getter falls back to
     *  the static editable default. */
    public bindPropertyProvider(propertyName: string, provider: (() => unknown) | null): void {
        const prev = this._propertyProviders.get(propertyName);
        if (provider === null) {
            if (prev === undefined) return;
            this._propertyProviders.delete(propertyName);
        } else {
            if (prev === provider) return;
            this._propertyProviders.set(propertyName, provider);
        }
        // Wake the property panel so it re-reads the getter through
        // the new (or cleared) provider on the next render pass.
        // Reading the getter inline below also has the nice side
        // effect of failing loudly if the provider is malformed.
        try {
            const v = (this as unknown as Record<string, unknown>)[propertyName];
            this.notifyPropertyChanged(propertyName, null, v);
        } catch (_e) {
            // Reading an unknown property name is the caller's
            // mistake; swallow the failure so the binding sync stays
            // resilient to bad slot mappings.
        }
    }

    /** Internal helper: invoke the bound provider for a property and
     *  validate the returned value with a type guard. Returns the
     *  value if it passes the guard, else null (caller falls back to
     *  the editable default). The guard makes the chain defensive
     *  against publishers whose output happens not to match the
     *  expected shape (e.g. a number-publisher mis-wired to gravity_in). */
    private _readProvided<T>(propertyName: string, guard: (v: unknown) => v is T): T | null {
        const provider = this._propertyProviders.get(propertyName);
        if (!provider) return null;
        try {
            const v = provider();
            return guard(v) ? v : null;
        } catch (_e) {
            return null;
        }
    }

    public get solverItemIds(): ReadonlyArray<string> {
        return this._solverItemIds;
    }
    public set solverItemIds(v: ReadonlyArray<string>) {
        this.setField("solverItemIds", this._solverItemIds, v, (n) => {
            this._solverItemIds = n;
        });
    }

    public get sharedNodeIds(): ReadonlyArray<string> {
        return this._sharedNodeIds;
    }
    public set sharedNodeIds(v: ReadonlyArray<string>) {
        this.setField("sharedNodeIds", this._sharedNodeIds, v, (n) => {
            this._sharedNodeIds = n;
        });
    }

    public get gravitySourceId(): string {
        return this._gravitySourceId;
    }
    public set gravitySourceId(v: string) {
        this.setField("gravitySourceId", this._gravitySourceId, v, (n) => {
            this._gravitySourceId = n;
        });
    }

    public get temperatureSourceId(): string {
        return this._temperatureSourceId;
    }
    public set temperatureSourceId(v: string) {
        this.setField("temperatureSourceId", this._temperatureSourceId, v, (n) => {
            this._temperatureSourceId = n;
        });
    }

    public get densitySourceId(): string {
        return this._densitySourceId;
    }
    public set densitySourceId(v: string) {
        this.setField("densitySourceId", this._densitySourceId, v, (n) => {
            this._densitySourceId = n;
        });
    }

    public get pressureSourceId(): string {
        return this._pressureSourceId;
    }
    public set pressureSourceId(v: string) {
        this.setField("pressureSourceId", this._pressureSourceId, v, (n) => {
            this._pressureSourceId = n;
        });
    }

    public get timeScaleSourceId(): string {
        return this._timeScaleSourceId;
    }
    public set timeScaleSourceId(v: string) {
        this.setField("timeScaleSourceId", this._timeScaleSourceId, v, (n) => {
            this._timeScaleSourceId = n;
        });
    }

    public get localPositionSourceId(): string {
        return this._localPositionSourceId;
    }
    public set localPositionSourceId(v: string) {
        this.setField("localPositionSourceId", this._localPositionSourceId, v, (n) => {
            this._localPositionSourceId = n;
        });
    }

    public get localRotationSourceId(): string {
        return this._localRotationSourceId;
    }
    public set localRotationSourceId(v: string) {
        this.setField("localRotationSourceId", this._localRotationSourceId, v, (n) => {
            this._localRotationSourceId = n;
        });
    }

    public get localScaleSourceId(): string {
        return this._localScaleSourceId;
    }
    public set localScaleSourceId(v: string) {
        this.setField("localScaleSourceId", this._localScaleSourceId, v, (n) => {
            this._localScaleSourceId = n;
        });
    }

    // ─────────────────────────────────────────────────────────────────
    // Anchor / slot inventory (for the editor's config-link renderer)
    // ─────────────────────────────────────────────────────────────────

    /** Output anchor consumed by every Sim.Graph that references this
     *  scene. Singular: a Sim.Graph has at most one wired
     *  `scene_in`. */
    public readonly sceneOutSlot: string = SCENE_ANCHOR_OUT;

    /** Single-slot atmosphere intake. */
    public readonly atmosphereInSlot: string = ATMOSPHERE_ANCHOR_IN;

    /** Variadic-input prefixes for the editor's wiring layer. The
     *  editor enumerates connected anchors by prefix-matching slot
     *  names; the actual `solverItemIds` / `sharedNodeIds` arrays are
     *  updated at wire-time. */
    public readonly solverInPrefix: string = SOLVER_ANCHOR_IN_PREFIX;
    public readonly sharedInPrefix: string = SHARED_ANCHOR_IN_PREFIX;

    // ─────────────────────────────────────────────────────────────────
    // SceneStateView construction
    // ─────────────────────────────────────────────────────────────────

    /**
     * Build a fresh `SceneStateView` bound to the given resolver.
     * Called by the runtime at session bind (typically by Sim.Graph's
     * `reset(session)`, or by the GraphRunner when this SceneItem
     * sits at the root canvas).
     *
     * The view captures closures over THIS SceneItem's mutable fields
     * via `fieldReader`. When the user edits a value in the property
     * panel, the live consumers see the change on the next read —
     * exactly what we want, and the reason the SceneStateView holds
     * no copy of any latent.
     *
     * The view's `parent` reference is left null here; the caller is
     * expected to chain `setParent` once the enclosing Sim.Graph's
     * scene reference is known (a separate top-down pass at session
     * bind).
     *
     * The returned view's `effectiveHz` is captured at bind time as a
     * constant — re-bound on topology edits via a full session
     * rebuild. This avoids re-walking the solver's owned leaves on
     * every consumer access (the value rarely changes per tick, and
     * when it does the user is in IDLE / paused state for a topology
     * edit).
     */
    public buildStateView(resolver: SceneSourceResolver): SceneStateViewImpl {
        const idStr = String(this.id ?? "");

        // Pre-resolve dynamic source thunks. A returned-null resolver
        // means the publisher disappeared since the last bind; we
        // fall back to the static field silently rather than throwing,
        // matching the editor's tolerance for transient invalid wirings.
        const gravSource = this._gravitySourceId ? resolver.resolveCartesian3Source(this._gravitySourceId) : null;
        const tempSource = this._temperatureSourceId ? resolver.resolveNumberSource(this._temperatureSourceId) : null;
        const pressSource = this._pressureSourceId ? resolver.resolveNumberSource(this._pressureSourceId) : null;
        const densSource = this._densitySourceId ? resolver.resolveNumberSource(this._densitySourceId) : null;
        const tsSource = this._timeScaleSourceId ? resolver.resolveNumberSource(this._timeScaleSourceId) : null;
        // NOTE: the local transform is NOT carried by the view anymore. The
        // scene's pose is its IHasTransform localTransform() (composed from
        // localPosition/localRotation/localScale); its world chains via the
        // `parent` wired at bind. So no pos/rot/scl source thunks here.

        // Effective-Hz aggregation: ask the resolver, which has the
        // graph-level visibility we lack from inside the SceneItem.
        // The user-set `_manualHzHz` short-circuits the aggregate when
        // positive (Q-S manualHz override).
        const aggregateHz = resolver.aggregateEffectiveHz();
        const minHz = MIN_EFFECTIVE_HZ.getValue(Frequency.Units.Hz);
        const effectiveHz = this._manualHzHz > 0 ? this._manualHzHz : Math.max(minHz, aggregateHz);

        // Prefer the runtime-bound atmosphere ref (set by the session-
        // builder's config-link sync) over a resolver round-trip. Both
        // point at the same node when both are set, but the ref also
        // lets the atmosphere-aware editable getters read live values
        // without depending on a session being open. The cast is safe
        // because the concrete AtmosphereNode implements both
        // IAtmosphereAggregator AND IIntegrable; SceneStateView's
        // readAtmosphere consumer is typed as `IIntegrable | null`.
        const atmosphere: IIntegrable | null = (this._atmosphereRef as IIntegrable | null) ?? (this._atmosphereItemId ? resolver.resolveAtmosphere(this._atmosphereItemId) : null);

        // Wire the atmosphere aggregate path on the readers. When a
        // bound Atmosphere also implements `IAtmosphereAggregator`
        // (the multi-layer container in plugin-physics does), the
        // SceneStateView's temperature / pressure / density resolve
        // to its live volume-weighted aggregates. The SceneItem's
        // own editables become fallbacks for the unwired case.
        //
        // An explicit publisher-wired source (tempSource / pressSource)
        // still wins over the atmosphere — the user can override the
        // atmosphere binding with a per-tick data wire if they need to.
        const atmoAggregator = isAtmosphereAggregator(atmosphere) ? atmosphere : null;
        const readTempK: () => number = tempSource ?? (atmoAggregator ? () => atmoAggregator.sampleAggregates().temperatureK : fieldReader<number>(this, "_temperatureK"));
        const readPressPa: () => number = pressSource ?? (atmoAggregator ? () => atmoAggregator.sampleAggregates().pressure : fieldReader<number>(this, "_pressurePa"));
        // Density: explicit publisher wire wins, then atmosphere, then
        // SceneItem's _densityKgPerM3 editable.
        const readDensity: () => number = densSource ?? (atmoAggregator ? () => atmoAggregator.sampleAggregates().density : fieldReader<number>(this, "_densityKgPerM3"));

        const sources: SceneStateViewSources = {
            id: idStr,
            // Gravity: explicit publisher wire (gravity_in) wins,
            // else the SceneItem's _gravity Cartesian3 editable.
            readGravity: gravSource ?? fieldReader<ICartesian3>(this, "_gravity"),
            readTemperatureK: readTempK,
            readPressurePa: readPressPa,
            readDensity,
            readTimeScale: tsSource ?? fieldReader<number>(this, "_timeScale"),
            readEffectiveHz: () => effectiveHz,
            readAtmosphere: () => atmosphere,
        };

        return new SceneStateViewImpl(sources);
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createSceneItem(): SceneItem {
    return new SceneItem();
}

/**
 * Re-export the shape consumers (gates, atmospheres, sensors) will
 * actually consume. Kept here so a plugin importing `scene.item.ts`
 * does not need a second import from spikypanda-core for the trivial
 * shape; in V2 we will introduce dedicated downstream helpers and
 * tighten the export surface.
 */
export type { SceneStateView };
