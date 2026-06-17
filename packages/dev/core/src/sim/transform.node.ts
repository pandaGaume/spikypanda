import { cloneable, IOlink } from "../graph/graph.interfaces";
import { IDeclaresPorts, IPortDescriptor, ISession } from "../execution/execution.interfaces";
import { RuntimeNode } from "../execution/execution.node";
import { buildDefaultStateView, transformToMatrix44 } from "./scene-state-view.impl";
import { IDENTITY44, isMatrix44, Matrix4 } from "../geometry/geometry.matrix";
import { Cartesian3 } from "../geometry/geometry.cartesian";
import type { ICartesian, ICartesian3 } from "../geometry/geometry.interfaces";
import type { Nullable } from "../types";
import type { SceneStateView } from "./scene-state-view.interface";

/**
 * Base class for every runtime object that lives in a world reference
 * frame. Computes the node's world transform by composing a parent's
 * world transform with the local one:
 *
 *     world = parent_world × local
 *
 * Inputs (both optional, default = identity):
 *   local         this object's pose in the parent's frame [matrix44]
 *   parent_world  the parent's world transform              [matrix44]
 *
 * Output:
 *   world         this object's pose in the world frame    [matrix44]
 *
 * Environmental context (gravity, ambient temperature, pressure,
 * timeScale, atmosphere) lives on `session.sceneStateView` (a live
 * binding established at session bind by the enclosing Sim.Graph or by
 * the GraphRunner). Subclasses read it through `getScene()`, which falls
 * back to a sane Earth-surface default when no scene has been bound.
 *
 * Parent-frame inheritance: when the `parent_world` port is NOT wired,
 * the node inherits the enclosing scene's `worldTransform` as its
 * parent frame (rather than the bare identity). The scene IS the
 * default parent of every world object: a Sim.Graph that nests a scene
 * with a non-identity pose re-frames every TransformNode inside it
 * automatically. Backward compatible: a root scene's worldTransform is
 * identity unless the user gives the scene a pose, so graphs that never
 * set a scene transform see the same identity parent as before.
 *
 * This is a CORE primitive (it was previously vendored inside the physics
 * plugin): any plugin's world object (motor, sensor, mechanical body,
 * robot link) extends it to inherit the local / parent_world ports and a
 * `super.fire()` it calls before its own physics. The matrix is a flat
 * array of 16 numbers in column-major layout.
 */
export class TransformNode extends RuntimeNode implements IDeclaresPorts {
    /** Slot names exposed as static so subclasses can reference them. */
    public static readonly INPUT_LOCAL = "local";
    public static readonly INPUT_PARENT_WORLD = "parent_world";
    public static readonly OUTPUT_WORLD = "world";

    /** Reusable port descriptor blocks so subclasses can spread them. */
    public static readonly TRANSFORM_INPUT_PORTS: ReadonlyArray<IPortDescriptor> = [
        { slot: TransformNode.INPUT_LOCAL, optional: true, type: "matrix44" },
        { slot: TransformNode.INPUT_PARENT_WORLD, optional: true, type: "matrix44" },
    ];
    public static readonly TRANSFORM_OUTPUT_PORTS: ReadonlyArray<IPortDescriptor> = [{ slot: TransformNode.OUTPUT_WORLD, optional: false, type: "matrix44" }];

    /**
     * Returns true if `slot` is one of the transform-owned input slots.
     * Subclasses use this in their fire() consume loop to skip slots
     * already consumed by `super.fire()`.
     */
    protected static isTransformInputSlot(slot: string): boolean {
        return slot === TransformNode.INPUT_LOCAL || slot === TransformNode.INPUT_PARENT_WORLD;
    }

    /** Internal world transform; cloneable so editor save/restore preserves it. */
    @cloneable private _world: number[] = (IDENTITY44 as number[]).slice();

    /** Reusable Matrix4 instances so the per-tick composition + body-frame
     *  gravity projection go through the Matrix4 class with no per-tick
     *  allocation. `_m4World` holds the current world after `fire()`; the
     *  flat `_world` is its serialized copy (ports / @cloneable). */
    private readonly _m4Parent: Matrix4 = new Matrix4();
    private readonly _m4Local: Matrix4 = new Matrix4();
    private readonly _m4World: Matrix4 = new Matrix4();

    /** World's inverse rotation, reused to express world-frame gravity in the
     *  body frame. The world is a rigid body->world transform, so its inverse
     *  rotation is its transpose; that rigid-body equivalence is a DOMAIN
     *  choice made here, not a property of the pure-math Matrix4. */
    private readonly _m4WorldRotInv: Matrix4 = new Matrix4();

    /** Per-process fallback scene view used when the bound session has
     *  no `sceneStateView`. Constructed lazily on first `getScene()`. */
    private _fallbackSceneView: SceneStateView | null = null;

    /** Optional per-node SceneItem binding (the `scene` config-link
     *  target). When the editor wires a SceneItem's `scene_out` to this
     *  node's `scene` port, the session-builder records the SceneItem's
     *  id here and injects the resolved live view via `setBoundSceneView`.
     *  Lets two motors on the same canvas live in DIFFERENT scenes
     *  (Earth vs Moon side by side) without wrapping each in a Sim.Graph.
     *  Empty string = no per-node binding (use the session scene). */
    @cloneable public sceneItemId: string = "";

    /** Editor-injected live view for `sceneItemId` (null when unbound).
     *  Runtime metadata, not @cloneable: re-resolved each session build. */
    private _boundSceneView: SceneStateView | null = null;

    /** Inject (or clear) the per-node scene view. Called by the editor's
     *  session-builder after resolving `sceneItemId` against the canvas. */
    public setBoundSceneView(view: SceneStateView | null): void {
        this._boundSceneView = view;
    }

    // ── Body-frame gravity (cached, dirty-checked) ────────────────────
    //
    // The scene's gravity is a LATENT, world-fixed vector; the world
    // matrix is only this object's POSE and does NOT change the gravity.
    // What a world object needs for gravity coupling is that same gravity
    // expressed in its OWN body frame: g_body = R^T * g_world (R = the
    // rotation block of `world`). That projection depends solely on the
    // gravity (effectively constant) and this object's orientation (rarely
    // changing), so it is computed ONCE and cached, recomputed only when
    // the gravity value changes or the world transform changes. Reused
    // instance: no per-tick allocation.

    /** Cached body-frame gravity (R^-1 * g_world). PRESENCE is the binding
     *  signal: `undefined` means no scene is bound (inert / gravity-free),
     *  a vector means it holds the current projection. A subclass reads it
     *  after calling `super._updateGravityCoupling` and branches on
     *  undefined for its gravity-free path. The instance is reused while
     *  bound (no per-tick allocation); only a (re)bind allocates one. */
    protected _bodyGravity?: ICartesian3;

    /** Set by `fire()` whenever `_world` changes; consumed (cleared) by
     *  `_updateGravityCoupling` the next time it recomputes the body
     *  gravity. The orientation is what makes the projection stale. */
    private _worldChangedForGravity: boolean = true;

    /**
     * Refresh the cached body-frame gravity from the bound scene and this
     * object's current world pose, but only when it can have changed: the
     * orientation moved (`_worldChangedForGravity`) or there is no cache yet.
     * Gravity itself is a CONSTANT scene latent (a scene / binding swap goes
     * through `reset()`, which drops this cache), so it needs no value
     * compare. Returns `true` when it recomputed `_bodyGravity` this call (so
     * a subclass can recompute its own gravity-derived constants in
     * lock-step), `false` on a cache hit or when no scene is bound.
     *
     * Resident here (not in a plugin) so every world object shares one
     * dirty-checked projection; OVERRIDABLE so a subclass (e.g. the PMSM
     * machine) can call `super._updateGravityCoupling(session)` and then
     * fold the body gravity into its own coupling. Gated on a BOUND scene
     * (not the Earth fallback) so a headless drive with no scene stays
     * gravity-free and deterministic.
     */
    protected _updateGravityCoupling(session: ISession): boolean {
        const scene = this.boundScene(session);
        if (!scene) {
            if (this._bodyGravity !== undefined) {
                this._bodyGravity = undefined; // transitioned to no-gravity
                return true;
            }
            return false;
        }
        // Cache hit: a scene is bound AND the orientation has not moved.
        if (this._bodyGravity !== undefined && !this._worldChangedForGravity) {
            return false;
        }
        // g_body = R^-1 · g_world, composed from PURE Matrix4 primitives
        // (no inline indexing, no domain method on the matrix). The world is
        // a rigid body->world transform, so R^-1 = R^T: transpose, then apply
        // to the direction. That rigid-body equivalence is the domain choice.
        // Allocate the body-gravity vector lazily on (re)bind; reuse while bound.
        const out = (this._bodyGravity ??= new Cartesian3());
        this._m4World.transposeToRef(this._m4WorldRotInv);
        this._m4WorldRotInv.transformDirectionToRef(scene.gravity, out);
        this._worldChangedForGravity = false;
        return true;
    }

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = TransformNode.TRANSFORM_INPUT_PORTS;
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = TransformNode.TRANSFORM_OUTPUT_PORTS;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /** Current world transform: equals parent_world × local after the
     *  last fire() consumed inputs. */
    public get world(): ReadonlyArray<number> {
        return this._world;
    }

    /**
     * Returns the effective scene view for the current tick. Reads
     * `session.sceneStateView` when bound, else a per-node Earth-surface
     * default. The returned view's accessors are live:
     *
     *     const g = this.getScene(session).gravity;     // ICartesian3
     *     const T = this.getScene(session).temperature; // K
     */
    protected getScene(session: ISession): SceneStateView {
        const scene = this.boundScene(session);
        if (scene) return scene;
        if (!this._fallbackSceneView) {
            this._fallbackSceneView = buildDefaultStateView("__transform_fallback__");
        }
        return this._fallbackSceneView;
    }

    /**
     * The effective scene for this node WITHOUT the Earth fallback:
     * per-node binding wins, then the session scene, else null. Callers
     * that must distinguish "a real scene is bound" from "nothing"
     * (e.g. gravity coupling that should stay inert with no scene) use
     * this rather than `getScene()`.
     */
    protected boundScene(session: ISession): SceneStateView | null {
        return this._boundSceneView ?? session.sceneStateView ?? null;
    }

    public override reset(_session: ISession): void {
        const id = (IDENTITY44 as number[]).slice();
        this.setField("world", this._world, id, (n) => {
            this._world = n;
        });
        // Drop the body-gravity cache so the first fire after a reset
        // recomputes it against the freshly bound scene + pose.
        this._m4World.setIdentity();
        this._bodyGravity = undefined;
        this._worldChangedForGravity = true;
    }

    public override fire(session: ISession, _t: number): void {
        // Inputs by slot via the routing-cache helpers (O(1), no opsc()
        // scan, no string-match, no linear indexOf). consumeLatest = last
        // ready value wins, matching the legacy opsc-iteration semantics.
        const localV = this.consumeLatest(session, TransformNode.INPUT_LOCAL);
        const local: ReadonlyArray<number> = isMatrix44(localV) ? localV : IDENTITY44;

        // No explicit parent wired: inherit the enclosing scene's world
        // pose. A root scene with no transform yields identity (the
        // historical default); a Sim.Graph that nests a posed scene
        // re-frames this node automatically.
        const parentV = this.consumeLatest(session, TransformNode.INPUT_PARENT_WORLD);
        const parentWorld: ReadonlyArray<number> = isMatrix44(parentV) ? parentV : transformToMatrix44(this.getScene(session).worldTransform);

        // world = parent_world × local, through the Matrix4 class (the one
        // home for 4x4 math). _m4World holds the live result every tick; the
        // flat _world is re-serialized only when the pose actually changes.
        this._m4Parent.setFromArray(parentWorld);
        this._m4Local.setFromArray(local);
        this._m4Parent.multiplyToRef(this._m4Local, this._m4World);

        if (!this._m4World.equalsArray(this._world)) {
            const newWorld = this._m4World.toArrayRef(new Array<number>(16));
            this.setField("world", this._world, newWorld, (n) => {
                this._world = n;
            });
            // Orientation moved: the cached body-frame gravity projection
            // is stale (see _updateGravityCoupling).
            this._worldChangedForGravity = true;
        }

        this.publishAll(session, TransformNode.OUTPUT_WORLD, this._world);
    }
}
