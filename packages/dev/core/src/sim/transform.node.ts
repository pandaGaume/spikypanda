import { cloneable, IOlink } from "../graph/graph.interfaces";
import { IChannel, IDeclaresPorts, IPortDescriptor, ISession, inSlotOf } from "../execution/execution.interfaces";
import { RuntimeNode } from "../execution/execution.node";
import { buildDefaultStateView, transformToMatrix44 } from "./scene-state-view.impl";
import { IDENTITY44, isMatrix44, mul44 } from "../geometry/geometry.matrix";
import type { ICartesian } from "../geometry/geometry.interfaces";
import type { Nullable } from "../types";
import type { SceneStateView } from "./scene-state-view.interface";

// IDENTITY44 / isMatrix44 / mul44 are the Matrix44 (flat serialized form)
// helpers, owned by geometry alongside the Matrix4 class — one home for
// the 4x4 matrix, no duplicated multiply. Imported here, not redefined.

/** Equality test with a small absolute tolerance; both flat arrays of 16. */
function matrices44Equal(a: ReadonlyArray<number>, b: ReadonlyArray<number>): boolean {
    if (a.length !== 16 || b.length !== 16) return false;
    for (let i = 0; i < 16; ++i) {
        if (Math.abs(a[i] - b[i]) > 1e-12) return false;
    }
    return true;
}

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

    /** The set of input slot names owned by this base class. */
    private static readonly TRANSFORM_INPUT_SLOTS: ReadonlySet<string> = new Set([TransformNode.INPUT_LOCAL, TransformNode.INPUT_PARENT_WORLD]);

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
        return TransformNode.TRANSFORM_INPUT_SLOTS.has(slot);
    }

    /** Internal world transform; cloneable so editor save/restore preserves it. */
    @cloneable private _world: number[] = (IDENTITY44 as number[]).slice();

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
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let local: ReadonlyArray<number> = IDENTITY44;
        let parentWorld: ReadonlyArray<number> = IDENTITY44;
        let parentWorldWired = false;

        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (!TransformNode.isTransformInputSlot(slot)) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (!isMatrix44(value)) continue;
            if (slot === TransformNode.INPUT_LOCAL) local = value;
            else if (slot === TransformNode.INPUT_PARENT_WORLD) {
                parentWorld = value;
                parentWorldWired = true;
            }
        }

        // No explicit parent wired: inherit the enclosing scene's world
        // pose. A root scene with no transform yields identity (the
        // historical default); a Sim.Graph that nests a posed scene
        // re-frames this node automatically.
        if (!parentWorldWired) {
            parentWorld = transformToMatrix44(this.getScene(session).worldTransform);
        }

        const newWorld: number[] = new Array(16);
        mul44(newWorld, parentWorld, local);

        if (!matrices44Equal(this._world, newWorld)) {
            this.setField("world", this._world, newWorld, (n) => {
                this._world = n;
            });
        }

        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== TransformNode.OUTPUT_WORLD || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, this._world);
        }
    }
}
