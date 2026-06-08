/**
 * Scene state view — runtime contract.
 *
 * The view is the LIVE binding consumers (motors, sensors, future
 * gates, atmospheres, dashboards) read each tick to obtain the
 * environmental context of their owning scene. It is intentionally
 * NOT a frozen snapshot: each accessor is a getter that re-reads its
 * underlying source on every call, so a temperature wired to a
 * publisher node, a worldPosition driven by a kinematics chain, or an
 * atmosphere whose state evolves via the integrator are all visible
 * to consumers on the same tick they change.
 *
 * The view is built once per session at reset() by the SceneItem (the
 * editor-side descriptor — a GraphItem, NOT a RuntimeNode). Building
 * the view captures references to the publisher nodes and to the
 * Atmosphere (and resolves the implicit 3D parent chain via Sim.Graph
 * nesting); it does not copy values. The same view instance is reused
 * across ticks; consumers cache the reference at fire-loop bind time
 * and only pay the getter cost when they actually read a field.
 *
 * A SceneItem with no wired publisher for a given latent serves its
 * `@cloneable` default as the static value through the same getter.
 *
 * V1 scope:
 *   - gravity, temperature, pressure, timeScale: scalars, optionally
 *     pilot-driven via a source node ref.
 *   - localTransform / worldTransform: 3D transform of the scene
 *     origin, decomposed into position / rotation / scale (UE5-style
 *     FTransform). `worldTransform = parent.worldTransform × local`.
 *     Both expose `toMatrix4()` for consumers that need the column-
 *     major form (GPU upload, downstream physics engine bridges).
 *   - atmosphere: direct reference to an AtmosphereStateNode (or
 *     null). Consumers read its observables via standard runtime
 *     cables; this ref serves identification + metadata lookup.
 *   - effectiveHz: aggregated max(requiredHz) over owned IIntegrable
 *     leaves; consumed by Sim.Graph to size sub-stepping.
 *   - parent: the enclosing scene in the 3D tree, derived from the
 *     Sim.Graph nesting (the scene referenced by the enclosing
 *     Sim.Graph's scene input). null at the root.
 */

import { Cartesian3 } from "../geometry/geometry.cartesian";
import type { ICartesian3, IMatrix4, IQuaternion } from "../geometry/geometry.interfaces";
import { Matrix4 } from "../geometry/geometry.matrix";
import { Quaternion } from "../geometry/geometry.quarternion";
import { Frequency, Pressure, Temperature } from "../math/math.units";
import type { IIntegrable } from "./sim.interfaces";

/**
 * Local-or-world 3D transform carried by a scene. Decomposed into
 * translation + quaternion rotation + non-uniform scale (UE5
 * `FTransform`, Babylon.js `TransformNode` style), with `toMatrix4()`
 * to collapse to the column-major matrix form when needed.
 *
 * The decomposed view is canonical for storage / editing / blending;
 * the matrix form is canonical for GPU upload and for chaining
 * heavyweight scene-graph multiplications. Implementations are free
 * to cache the matrix internally — V1 just recomputes on demand,
 * which is fine because each consumer reads it at most once per
 * `fire()` and the compose is ~50 multiply-adds.
 *
 * Scale is per-axis (`ICartesian3`) for parity with UE5 / BJS, not
 * uniform.
 */
export interface ITransform {
    readonly position: ICartesian3;
    readonly rotation: IQuaternion;
    readonly scale: ICartesian3;
    /** Compute the column-major 4×4 matrix `T(position) · R(rotation) · S(scale)`.
     *  Allocates a fresh `Matrix4` on each call in V1; callers that
     *  need to retain it across ticks should `clone()` and cache. */
    toMatrix4(): IMatrix4;
}

/** Identity transform constant. Used as the fallback "world" of a root scene. */
export const IDENTITY_TRANSFORM: ITransform = Object.freeze({
    position: Object.freeze(new Cartesian3(0, 0, 0)),
    rotation: Object.freeze(new Quaternion(0, 0, 0, 1)),
    scale: Object.freeze(new Cartesian3(1, 1, 1)),
    toMatrix4: () => new Matrix4(),
});

/** Earth-surface sane default for an unconfigured scene's gravity,
 *  in m/s². Vector quantities are not Quantity-wrapped (V1 scope);
 *  the unit is part of the contract on the `ICartesian3` axes.
 *  Frozen so an accidental `default.gravity.z = 0` from a buggy
 *  consumer poisons no one else. */
export const DEFAULT_GRAVITY: ICartesian3 = Object.freeze(new Cartesian3(0, 0, -9.81));

/**
 * Earth-surface default ambient temperature, declared as a `Temperature`
 * Quantity rather than a bare number so the unit travels with the value
 * across the codebase (no more "is this K or °C?" guessing at consumer
 * sites). The instance is frozen — any consumer that needs to mutate
 * should `clone()` first.
 *
 * 293.15 K = 20 °C, the conventional engineering lab default.
 */
export const DEFAULT_TEMPERATURE: Temperature = Object.freeze(new Temperature(293.15, Temperature.Units.k)) as Temperature;

/**
 * Earth sea-level default ambient pressure (1 atm ≡ 101325 Pa). Frozen
 * `Pressure` Quantity, same rationale as `DEFAULT_TEMPERATURE`.
 */
export const DEFAULT_PRESSURE: Pressure = Object.freeze(new Pressure(101325, Pressure.Units.Pa)) as Pressure;

/** Sim-to-wall time multiplier neutral value (dimensionless). Kept as
 *  a bare number because the underlying quantity has no unit. */
export const DEFAULT_TIME_SCALE: number = 1.0;

/**
 * Floor on the runner's derived sample rate so an unconfigured graph
 * still ticks at a sensible visualisation cadence. 60 Hz mirrors the
 * default display refresh, which avoids visible jitter when no leaf
 * has declared a stronger `requiredHz`. Frozen `Frequency` Quantity.
 */
export const MIN_EFFECTIVE_HZ: Frequency = Object.freeze(new Frequency(60, Frequency.Units.Hz)) as Frequency;

/**
 * Live read-through view of a scene's runtime state. Consumers hold a
 * reference (resolved once at session bind) and call getters per tick.
 *
 * Every getter is intentionally O(1) and side-effect-free at the
 * implementation level: a wired source resolves to `publisher.lastPublished(slot)`
 * accessor, an unwired latent resolves to `this._sceneItem.<field>`. No
 * caching, no per-tick allocation for scalars, no observers — the
 * freshness IS the dataflow itself. Transform getters DO allocate
 * (one ITransform + one Matrix4 per access if you read both); that is
 * acceptable because each consumer reads them at most a few times
 * per `fire()`.
 *
 * The view never extends `IGraphItem` and never appears on the canvas.
 * It is a pure binding object materialised from the editor model at
 * session build, lifetime tied to the session.
 */
export interface SceneStateView {
    /** Stable identifier of the originating SceneItem; useful for
     *  diagnostic UIs and for cross-Sim.Graph proxy resolution (atmosphere
     *  sharing). */
    readonly id: string;

    /** The enclosing scene in the 3D tree, resolved at session build
     *  from the Sim.Graph nesting chain. `null` when this scene is at
     *  the editor's root canvas (no enclosing Sim.Graph). */
    readonly parent: SceneStateView | null;

    /** The owning scene's atmosphere, if one is wired on its
     *  `atmosphereIn` slot. Consumers read the atmosphere's
     *  observables via the standard runtime port mechanism (the
     *  cable connecting them); this reference exists for
     *  identification, for gate-node bidirectional lookups, and for
     *  the proxy generation inside child Sim.Graphs. */
    readonly atmosphere: IIntegrable | null;

    // ── Scalar latents (live read-through, may evolve per tick) ───────

    /** Body-frame gravity acceleration in m/s². Vector field — not
     *  Quantity-wrapped (V1 scope). Static fallback unless a
     *  `gravitySourceId` is wired on the SceneItem (V1: static only;
     *  dynamic gravity source deferred to V3). */
    readonly gravity: ICartesian3;

    /** Ambient temperature as a `Temperature` Quantity. Consumers call
     *  `.getValue(Temperature.Units.k)` to obtain kelvin (the canonical
     *  storage unit), `.getValue(Temperature.Units.c)` for celsius,
     *  etc. Each getter access returns a fresh Quantity instance over
     *  the SceneItem's live storage; mutating the Quantity has no
     *  effect on the SceneItem. */
    readonly temperature: Temperature;

    /** Ambient pressure as a `Pressure` Quantity. Canonical storage in
     *  pascal. Same access semantics as `temperature`. */
    readonly pressure: Pressure;

    /** Sim-clock multiplier (mirror of UE5 `WorldSettings.TimeDilation`).
     *  Dimensionless — kept as a plain number. Static for V1; dynamic
     *  source deferred. */
    readonly timeScale: number;

    /** Sample rate this scene wants the runner / containing Sim.Graph
     *  to tick at, as a `Frequency` Quantity. Derived from
     *  `max(requiredHz)` over the IIntegrable leaves directly owned by
     *  this scene's solvers, with a floor of `MIN_EFFECTIVE_HZ`.
     *  Canonical storage in hertz. Sim.Graph reads
     *  `.getValue(Frequency.Units.Hz)` once per fire to compute the
     *  sub-stepping ratio K = childHz / parentHz. */
    readonly effectiveHz: Frequency;

    // ── 3D transform (live, world chained from parent) ────────────────

    /** This scene's local transform relative to its parent in the 3D
     *  tree. Live if any of the local source IDs are wired, else the
     *  SceneItem's static `@cloneable local*` fields. */
    readonly localTransform: ITransform;

    /** Cumulative transform to world. `parent ? parent.worldTransform · localTransform : localTransform`.
     *  Recomputed on each access from live components — for V1 this is
     *  a fresh allocation per call, which is fine because consumers
     *  read it at most once per fire() and the matrix-multiply is
     *  cheap. A future optimization may cache when nothing changed. */
    readonly worldTransform: ITransform;
}

/**
 * Build an `ITransform` value object from decomposed parts. Allocates
 * `Cartesian3` / `Quaternion` instances so the returned object's
 * fields satisfy `ICartesian3` / `IQuaternion` structurally (with
 * methods, not just `{x, y, z}` literals). The `toMatrix4()` accessor
 * delegates to `Matrix4.compose` each call.
 *
 * Used internally by `composeTransform`, by `SceneItem` for its local
 * transform reader, and by `SceneStateViewImpl` for the chained
 * worldTransform. Externally useful when a node (gate, sensor)
 * wants to publish an `ITransform`-typed value through a standard
 * runtime cable.
 */
export function makeTransform(position: ICartesian3, rotation: IQuaternion, scale: ICartesian3): ITransform {
    const p = position instanceof Cartesian3 ? position : new Cartesian3(position.x, position.y, position.z);
    const r = rotation instanceof Quaternion ? rotation : new Quaternion(rotation.x, rotation.y, rotation.z, rotation.w);
    const s = scale instanceof Cartesian3 ? scale : new Cartesian3(scale.x, scale.y, scale.z);
    return {
        position: p,
        rotation: r,
        scale: s,
        // Babylon-aligned arg order: Compose(scale, rotation, translation).
        toMatrix4: () => Matrix4.Compose(s, r, p),
    };
}

/**
 * Compose two transforms: `result = parent × child`, the standard
 * scene-graph parent-then-child concatenation. Done at the matrix
 * level (more correct under non-uniform scale than per-channel
 * composition, and simpler to maintain), then decomposed back to a
 * canonical `ITransform`.
 *
 * The matrix-then-decompose path costs one Matrix4 allocation and
 * one Shepperd quaternion extraction per call — acceptable for V1.
 * If hot-loop perf becomes an issue, the canonical fast path is to
 * skip decomposition: have consumers read `worldTransform.toMatrix4()`
 * directly and never touch the decomposed fields. We keep the
 * decomposed accessors on the result so the rest of the API stays
 * uniform (editable layer, gates, sensors all read .position/.scale).
 */
export function composeTransform(parent: ITransform, child: ITransform): ITransform {
    // parent · child via matrix product. The allocating form keeps
    // the function pure (no aliasing surprises for callers that hold
    // references to either input).
    const pm = parent.toMatrix4();
    const cm = child.toMatrix4();
    const composed = new Matrix4(pm.m).multiply(cm);

    const outScl = new Cartesian3(1, 1, 1);
    const outRot = new Quaternion();
    const outPos = new Cartesian3();
    // Babylon-aligned arg order: decompose(scale, rotation, translation).
    composed.decompose(outScl, outRot, outPos);
    return {
        position: outPos,
        rotation: outRot,
        scale: outScl,
        // Return the SAME matrix we already built — avoids
        // re-composing the decomposed parts in the trivial case
        // where a caller chains `composeTransform(...).toMatrix4()`.
        toMatrix4: () => composed,
    };
}

/**
 * Structural guard for `SceneStateView`. Used by tooling that
 * inspects whatever object a session returns from `getSceneStateView`;
 * does not catch every nuance (it is not a perfect runtime mirror of
 * the interface), but rejects obvious type mistakes.
 *
 * The scalar latents (temperature / pressure / effectiveHz) are
 * Quantity instances on a real view, so we check `instanceof` against
 * their concrete classes. `timeScale` stays dimensionless and number-
 * typed. Transform fields are plain object-shapes; gravity is an
 * ICartesian3 with `{x, y, z}` axes (Cartesian3 instances satisfy
 * the shape structurally, as do any literals returned by a dynamic
 * source resolver).
 */
export function isSceneStateView(v: unknown): v is SceneStateView {
    if (!v || typeof v !== "object") return false;
    const c = v as Partial<SceneStateView>;
    if (typeof c.id !== "string") return false;
    if (typeof c.timeScale !== "number") return false;
    if (!(c.temperature instanceof Temperature)) return false;
    if (!(c.pressure instanceof Pressure)) return false;
    if (!(c.effectiveHz instanceof Frequency)) return false;
    if (!c.gravity || typeof c.gravity !== "object") return false;
    if (typeof (c.gravity as ICartesian3).x !== "number") return false;
    if (typeof (c.gravity as ICartesian3).y !== "number") return false;
    if (typeof (c.gravity as ICartesian3).z !== "number") return false;
    if (!c.localTransform || typeof c.localTransform !== "object") return false;
    if (!c.worldTransform || typeof c.worldTransform !== "object") return false;
    return true;
}

/** Anchor / slot names reserved on `SceneItem`. Centralised here so the
 *  editor renderer (config-link routing) and the runtime binder both
 *  agree on the same string literals. */
export const SCENE_ANCHOR_OUT = "scene_out";
export const SCENE_ANCHOR_IN = "scene_in";
export const ATMOSPHERE_ANCHOR_IN = "atmosphere_in";
export const SOLVER_ANCHOR_IN_PREFIX = "solver_in_";
export const SHARED_ANCHOR_IN_PREFIX = "shared_in_";
export const SOLVER_ANCHOR_OUT = "solver_out";
export const ATMOSPHERE_ANCHOR_OUT = "atmosphere_out";
export const SHARED_ANCHOR_OUT = "scene_share_out";
