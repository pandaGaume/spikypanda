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

import { Cartesian3, cloneable, editable, Frequency, GraphItem, Pressure, Quaternion, Temperature } from "spikypanda-core";
import type { ICartesian3, IIntegrable, IQuaternion, ITransform, SceneStateView, SceneStateViewSources } from "spikypanda-core";
import {
    ATMOSPHERE_ANCHOR_IN,
    DEFAULT_GRAVITY,
    DEFAULT_PRESSURE,
    DEFAULT_TEMPERATURE,
    DEFAULT_TIME_SCALE,
    fieldReader,
    makeTransform,
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
export class SceneItem extends GraphItem {
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

    @cloneable private _temperatureSourceId: string = "";
    @cloneable private _pressureSourceId: string = "";
    @cloneable private _timeScaleSourceId: string = "";
    @cloneable private _localPositionSourceId: string = "";
    @cloneable private _localRotationSourceId: string = "";
    @cloneable private _localScaleSourceId: string = "";

    // ── Referenced collections (resolved at bind via SceneSourceResolver) ─

    /** The one canonical atmosphere of this scene, if any.
     *  Wired via the `atmosphere_in` anchor; the editor stores the
     *  publisher node's ID. Empty string = no atmosphere. */
    @cloneable private _atmosphereItemId: string = "";

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

    @editable("vector3", { layout: "block", alignement: "horizontal", unit: "m/s²" })
    public get gravity(): Cartesian3 {
        return this._gravity;
    }
    public set gravity(v: Cartesian3) {
        this.setField("gravity", this._gravity, v, (n) => {
            this._gravity = n;
        });
    }

    /** Ambient temperature in kelvin (canonical storage unit). The
     *  property panel surfaces this as a raw number with the K label;
     *  unit-aware code should prefer `temperatureQ` for arbitrary
     *  source units. */
    @editable("number", { unit: "K" })
    public get temperature(): number {
        return this._temperatureK;
    }
    public set temperature(v: number) {
        this.setField("temperature", this._temperatureK, v, (n) => {
            this._temperatureK = n;
        });
    }

    /** Ambient temperature as a `Temperature` Quantity. Reading returns
     *  a fresh Quantity over the live K storage; writing accepts a
     *  Quantity in any unit (K, °C, °F) and converts down to kelvin
     *  before storing. Use this from any code path that thinks in
     *  natural temperature units — the editor sample-graph for an
     *  ECLSS scenario, e.g.: `scene.temperatureQ = new Temperature(20, Temperature.Units.c)`. */
    public get temperatureQ(): Temperature {
        return new Temperature(this._temperatureK, Temperature.Units.k);
    }
    public set temperatureQ(q: Temperature) {
        const k = q.getValue(Temperature.Units.k);
        this.setField("temperature", this._temperatureK, k, (n) => {
            this._temperatureK = n;
        });
    }

    /** Ambient pressure in pascal (canonical storage unit). */
    @editable("number", { unit: "Pa" })
    public get pressure(): number {
        return this._pressurePa;
    }
    public set pressure(v: number) {
        this.setField("pressure", this._pressurePa, v, (n) => {
            this._pressurePa = n;
        });
    }

    /** Ambient pressure as a `Pressure` Quantity. Same semantics as
     *  `temperatureQ`: read returns a fresh Quantity over Pa storage,
     *  write converts to Pa. Use for `new Pressure(1, Pressure.Units.atm)`
     *  or `new Pressure(600, Pressure.Units.mbar)` — the storage stays
     *  Pa regardless. */
    public get pressureQ(): Pressure {
        return new Pressure(this._pressurePa, Pressure.Units.Pa);
    }
    public set pressureQ(q: Pressure) {
        const pa = q.getValue(Pressure.Units.Pa);
        this.setField("pressure", this._pressurePa, pa, (n) => {
            this._pressurePa = n;
        });
    }

    @editable("number", { unit: "×" })
    public get timeScale(): number {
        return this._timeScale;
    }
    public set timeScale(v: number) {
        this.setField("timeScale", this._timeScale, v, (n) => {
            this._timeScale = n;
        });
    }

    @editable("vector3", { layout: "block", alignement: "horizontal", unit: "m" })
    public get localPosition(): Cartesian3 {
        return this._localPosition;
    }
    public set localPosition(v: Cartesian3) {
        this.setField("localPosition", this._localPosition, v, (n) => {
            this._localPosition = n;
        });
    }

    public get localRotation(): Quaternion {
        return this._localRotation;
    }
    public set localRotation(v: Quaternion) {
        this.setField("localRotation", this._localRotation, v, (n) => {
            this._localRotation = n;
        });
    }

    @editable("vector3", { layout: "block", alignement: "horizontal", unit: "×" })
    public get localScale(): Cartesian3 {
        return this._localScale;
    }
    public set localScale(v: Cartesian3) {
        this.setField("localScale", this._localScale, v, (n) => {
            this._localScale = n;
        });
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

    public get temperatureSourceId(): string {
        return this._temperatureSourceId;
    }
    public set temperatureSourceId(v: string) {
        this.setField("temperatureSourceId", this._temperatureSourceId, v, (n) => {
            this._temperatureSourceId = n;
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
        const tempSource = this._temperatureSourceId ? resolver.resolveNumberSource(this._temperatureSourceId) : null;
        const pressSource = this._pressureSourceId ? resolver.resolveNumberSource(this._pressureSourceId) : null;
        const tsSource = this._timeScaleSourceId ? resolver.resolveNumberSource(this._timeScaleSourceId) : null;
        const posSource = this._localPositionSourceId ? resolver.resolveCartesian3Source(this._localPositionSourceId) : null;
        const rotSource = this._localRotationSourceId ? resolver.resolveQuaternionSource(this._localRotationSourceId) : null;
        const sclSource = this._localScaleSourceId ? resolver.resolveCartesian3Source(this._localScaleSourceId) : null;

        // Effective-Hz aggregation: ask the resolver, which has the
        // graph-level visibility we lack from inside the SceneItem.
        // The user-set `_manualHzHz` short-circuits the aggregate when
        // positive (Q-S manualHz override).
        const aggregateHz = resolver.aggregateEffectiveHz();
        const minHz = MIN_EFFECTIVE_HZ.getValue(Frequency.Units.Hz);
        const effectiveHz = this._manualHzHz > 0 ? this._manualHzHz : Math.max(minHz, aggregateHz);

        const atmosphere = this._atmosphereItemId ? resolver.resolveAtmosphere(this._atmosphereItemId) : null;

        const sources: SceneStateViewSources = {
            id: idStr,
            readGravity: fieldReader<ICartesian3>(this, "_gravity"),
            readTemperatureK: tempSource ?? fieldReader<number>(this, "_temperatureK"),
            readPressurePa: pressSource ?? fieldReader<number>(this, "_pressurePa"),
            readTimeScale: tsSource ?? fieldReader<number>(this, "_timeScale"),
            readLocalTransform: this._buildLocalTransformReader(posSource, rotSource, sclSource),
            readEffectiveHz: () => effectiveHz,
            readAtmosphere: () => atmosphere,
        };

        return new SceneStateViewImpl(sources);
    }

    /**
     * Compose the live local-transform reader from the per-axis source
     * thunks (or static field readers when no source is wired).
     * Returns a fresh `ITransform` (full methodful instances backing
     * its position/rotation/scale) each call — three small allocations
     * plus the matrix-on-demand. The freshness is what makes the
     * `worldTransform` chain safe to compose without aliasing the
     * SceneItem's own `Cartesian3` / `Quaternion` storage (which the
     * property panel mutates).
     */
    private _buildLocalTransformReader(
        posSource: (() => ICartesian3) | null,
        rotSource: (() => IQuaternion) | null,
        sclSource: (() => ICartesian3) | null,
    ): () => ITransform {
        const readPos = posSource ?? fieldReader<ICartesian3>(this, "_localPosition");
        const readRot = rotSource ?? fieldReader<IQuaternion>(this, "_localRotation");
        const readScl = sclSource ?? fieldReader<ICartesian3>(this, "_localScale");
        return () => makeTransform(readPos(), readRot(), readScl());
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
