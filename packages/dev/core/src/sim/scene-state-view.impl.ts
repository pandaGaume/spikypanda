/**
 * SceneStateView reference implementation.
 *
 * The view is materialised at session bind time from three pieces of
 * information passed in by the caller (typically a Sim.Graph or the
 * GraphRunner at root):
 *
 *   1. A `SceneStateViewSources` bundle that supplies — for each
 *      latent the SceneItem owns — either a static default value or a
 *      closure that returns the current value. The choice between the
 *      two is decided at bind time by inspecting the SceneItem's
 *      `*SourceId` fields: an unwired latent gets a `() => static`
 *      closure, a wired one gets a `() => publisher.lastPublished(slot)`
 *      closure. Either way, every getter on the live view is uniform
 *      from the consumer side.
 *
 *   2. A `parent` `SceneStateView` reference (or null for a root
 *      scene). Used to chain `worldTransform`.
 *
 *   3. A `getAtmosphere` resolver for the scene's wired
 *      AtmosphereStateNode (lazily evaluated so the runtime can swap
 *      the atmosphere reference when needed without rebuilding the
 *      view).
 *
 * The implementation deliberately keeps the closures-as-fields shape
 * rather than a virtual method per accessor: it makes the runtime
 * cost of a getter call the cost of one indirect function call plus
 * the publisher lookup itself, with no v-table dispatch through the
 * `SceneStateView` interface.
 */

import type { ICartesian3 } from "../geometry/geometry.interfaces";
import { Frequency, Pressure, Temperature } from "../math/math.units";
import type { IIntegrable } from "./sim.interfaces";
import {
    composeTransform,
    DEFAULT_DENSITY,
    DEFAULT_GRAVITY,
    DEFAULT_PRESSURE,
    DEFAULT_TEMPERATURE,
    DEFAULT_TIME_SCALE,
    IDENTITY_TRANSFORM,
    MIN_EFFECTIVE_HZ,
    type ITransform,
    type SceneStateView,
} from "./scene-state-view.interface";

/**
 * The per-latent resolver bundle that wires `SceneStateViewImpl`
 * accessors. Every field is required; callers that have no dynamic
 * source for a given latent pass a `() => static` thunk built from the
 * SceneItem's `@cloneable` default. Centralising the static-vs-live
 * choice at construction means the view's hot path stays a single
 * function call, branch-free.
 */
export interface SceneStateViewSources {
    /** Stable identifier copied from the originating SceneItem. */
    readonly id: string;

    /** Live readers. None are optional: the SceneItem's static
     *  defaults are wrapped in a constant thunk at bind time.
     *
     *  Scalar readers return raw numbers in their CANONICAL SI unit
     *  (K for temperature, Pa for pressure, Hz for effectiveHz). The
     *  SceneStateView wraps them into a fresh Quantity instance on
     *  every public getter access, so consumers get a unit-bearing
     *  object without paying the Quantity allocation on the storage
     *  side. */
    readonly readGravity: () => ICartesian3;
    readonly readTemperatureK: () => number;
    readonly readPressurePa: () => number;
    readonly readDensity: () => number;
    readonly readTimeScale: () => number;
    readonly readLocalTransform: () => ITransform;
    readonly readEffectiveHz: () => number;

    /** Atmosphere is sometimes nullable (a scene with no wired
     *  atmosphere is valid — pure visual marker). The resolver returns
     *  the current bound atmosphere or null. */
    readonly readAtmosphere: () => IIntegrable | null;
}

/**
 * Closure-driven SceneStateView. Holds no copy of any latent value;
 * every accessor re-reads its underlying source on demand.
 *
 * `parent` is set after construction via `setParent` so the runtime
 * can build the views bottom-up or top-down without circular
 * dependencies (a child scene's view exists before its parent's
 * Sim.Graph wraps it; the parent is wired in afterwards).
 */
export class SceneStateViewImpl implements SceneStateView {
    private _parent: SceneStateView | null = null;
    private readonly _src: SceneStateViewSources;

    public constructor(sources: SceneStateViewSources) {
        this._src = sources;
    }

    public get id(): string {
        return this._src.id;
    }

    public get parent(): SceneStateView | null {
        return this._parent;
    }

    /** Late-bound parent setter. The runtime resolves the 3D-tree
     *  chain (Sim.Graph nesting → enclosing scene) AFTER constructing
     *  each child view, so the parent reference is established here in
     *  a separate pass. Setting null at any time detaches; consumers
     *  reading `worldTransform` after detach see `localTransform`
     *  again (the scene becomes a root). */
    public setParent(parent: SceneStateView | null): void {
        this._parent = parent;
    }

    public get atmosphere(): IIntegrable | null {
        return this._src.readAtmosphere();
    }

    public get gravity(): ICartesian3 {
        return this._src.readGravity();
    }

    public get temperature(): Temperature {
        // Fresh Quantity wrap each access; cheap, and avoids any
        // chance of a consumer mutating the underlying SceneItem
        // storage through a cached Quantity instance.
        return new Temperature(this._src.readTemperatureK(), Temperature.Units.k);
    }

    public get pressure(): Pressure {
        return new Pressure(this._src.readPressurePa(), Pressure.Units.Pa);
    }

    public get density(): number {
        return this._src.readDensity();
    }

    public get timeScale(): number {
        return this._src.readTimeScale();
    }

    public get effectiveHz(): Frequency {
        return new Frequency(this._src.readEffectiveHz(), Frequency.Units.Hz);
    }

    public get localTransform(): ITransform {
        return this._src.readLocalTransform();
    }

    public get worldTransform(): ITransform {
        const local = this._src.readLocalTransform();
        const parent = this._parent;
        return parent ? composeTransform(parent.worldTransform, local) : local;
    }
}

// ─────────────────────────────────────────────────────────────────────
// Static-thunk factory helpers
// ─────────────────────────────────────────────────────────────────────
//
// Most SceneItems have NO wired publisher for any of their latents in
// V1 — the scalar fields just round-trip through the `@cloneable`
// storage and the SceneStateView accessor returns the stored value.
// These helpers produce the "static thunk" form so the SceneItem's
// `buildStateViewSources()` can build the SceneStateViewSources bundle
// without an `if (sourceId) ... else ...` per latent.

/** Bind a getter on a host object so the SceneStateView re-reads the
 *  host's live property on each access. Used by SceneItem to feed its
 *  own mutable fields into the view without copying — when the user
 *  edits `temperature` in the property panel, the view reflects the
 *  change instantly on the next consumer access.
 *
 *  The key argument is widened to `string` so callers can target
 *  private underscore-prefixed fields (`_gravity`, `_temperature`, …)
 *  that the public `keyof Host` projection does not expose. The
 *  returned-value type is parameterised so a SceneItem call site can
 *  state `fieldReader<number>(this, "_temperature")` and have the
 *  closure-call return number directly without a tail cast. */
export function fieldReader<R>(host: object, key: string): () => R {
    const h = host as unknown as Record<string, R>;
    return () => h[key];
}

/**
 * Convenience builder for the all-static "no dynamic sources wired"
 * case. The view returned has every latent backed by a constant default.
 * Used by the GraphRunner when no SceneItem is present at the root
 * canvas — yields a sane fallback scene rather than throwing.
 */
export function buildDefaultStateView(id: string): SceneStateView {
    const sources: SceneStateViewSources = {
        id,
        readGravity: () => DEFAULT_GRAVITY,
        // Unwrap the canonical Quantity constants down to their SI
        // scalar at bind time — the SceneStateViewImpl getters
        // re-wrap on every access. Doing the unwrap once here, rather
        // than per-access, keeps the hot path branch-free.
        readTemperatureK: () => DEFAULT_TEMPERATURE.getValue(Temperature.Units.k),
        readPressurePa: () => DEFAULT_PRESSURE.getValue(Pressure.Units.Pa),
        readDensity: () => DEFAULT_DENSITY,
        readTimeScale: () => DEFAULT_TIME_SCALE,
        readLocalTransform: () => IDENTITY_TRANSFORM,
        readEffectiveHz: () => MIN_EFFECTIVE_HZ.getValue(Frequency.Units.Hz),
        readAtmosphere: () => null,
    };
    return new SceneStateViewImpl(sources);
}
