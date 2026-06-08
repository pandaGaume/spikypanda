import { buildDefaultStateView, cloneable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf, viewable } from "spikypanda-core";
import type { ICartesian, Nullable, SceneStateView } from "spikypanda-core";

/**
 * Column-major 4×4 identity. Frozen so subclasses that read it cannot
 * accidentally mutate the shared fallback.
 *
 * Kept as a flat-number-array constant for compatibility with the
 * existing matrix44 channel payload type; the new core `Matrix4` class
 * (column-major Float64Array) is the canonical math citizen, but
 * channels still carry plain arrays. Conversion is trivial when
 * needed.
 */
export const IDENTITY44: ReadonlyArray<number> = Object.freeze([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

/** Lightweight runtime guard: matrix44 is a flat array of 16 numbers. */
export function isMatrix44(v: unknown): v is ReadonlyArray<number> {
    return Array.isArray(v) && v.length === 16;
}

/**
 * Column-major 4×4 multiplication: `out = a × b`.
 *
 * The geometry plugin's TRS builder stores translation in indices 12/13/14
 * (4th column), confirming column-major layout. We mirror that convention.
 *
 * `out` may alias neither `a` nor `b` (caller passes a fresh array).
 */
export function mul44(out: number[], a: ReadonlyArray<number>, b: ReadonlyArray<number>): void {
    const a00 = a[0],
        a10 = a[1],
        a20 = a[2],
        a30 = a[3];
    const a01 = a[4],
        a11 = a[5],
        a21 = a[6],
        a31 = a[7];
    const a02 = a[8],
        a12 = a[9],
        a22 = a[10],
        a32 = a[11];
    const a03 = a[12],
        a13 = a[13],
        a23 = a[14],
        a33 = a[15];

    const b00 = b[0],
        b10 = b[1],
        b20 = b[2],
        b30 = b[3];
    const b01 = b[4],
        b11 = b[5],
        b21 = b[6],
        b31 = b[7];
    const b02 = b[8],
        b12 = b[9],
        b22 = b[10],
        b32 = b[11];
    const b03 = b[12],
        b13 = b[13],
        b23 = b[14],
        b33 = b[15];

    out[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
    out[1] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
    out[2] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
    out[3] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;

    out[4] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
    out[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
    out[6] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
    out[7] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;

    out[8] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
    out[9] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
    out[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
    out[11] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;

    out[12] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
    out[13] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
    out[14] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
    out[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;
}

/** Equality test with a small absolute tolerance; both flat arrays of 16. */
function matrices44Equal(a: ReadonlyArray<number>, b: ReadonlyArray<number>): boolean {
    if (a.length !== 16 || b.length !== 16) return false;
    for (let i = 0; i < 16; ++i) {
        if (Math.abs(a[i] - b[i]) > 1e-12) return false;
    }
    return true;
}

/**
 * Base class for every physical object that lives in a world reference
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
 * timeScale, atmosphere) is NOT a runtime cable any more — it lives
 * on `session.sceneStateView` (a live binding established at session
 * bind by the enclosing Sim.Graph or by the GraphRunner). Subclasses
 * read it through `getScene()`, which falls back to a sane Earth-
 * surface default when no scene has been bound to the session.
 *
 * Subclasses (motors, sensors, mechanical assemblies) inherit the
 * `local` / `parent_world` ports for free and gain a `super.fire()`
 * that they call before their own physics. The shared static helper
 * `isTransformInputSlot` lets subclasses skip the transform inputs in
 * their own consume loop so they don't double-consume tokens that
 * `super.fire()` already handled.
 *
 * The matrix is stored as a flat array of 16 numbers in column-major
 * layout, matching `Physics.Geometry.Transform`'s convention. Composing
 * two `Transform` nodes therefore just works without manual conversion.
 */
export class TransformNode extends RuntimeNode implements IDeclaresPorts {
    /** Slot names exposed as static so subclasses can reference them. */
    public static readonly INPUT_LOCAL = "local";
    public static readonly INPUT_PARENT_WORLD = "parent_world";
    public static readonly OUTPUT_WORLD = "world";

    /** The set of input slot names owned by this base class. */
    private static readonly TRANSFORM_INPUT_SLOTS: ReadonlySet<string> = new Set([TransformNode.INPUT_LOCAL, TransformNode.INPUT_PARENT_WORLD]);

    /** Reusable port descriptor blocks so subclasses can spread them.
     *  The scene is no longer a port — it's bound at the session
     *  level via `ISession.sceneStateView`. */
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
     *  no `sceneStateView` (e.g. unit tests, sample graphs without a
     *  SceneItem). Constructed lazily on first `getScene()` access; the
     *  builder returns a view backed by Earth-surface defaults. */
    private _fallbackSceneView: SceneStateView | null = null;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = TransformNode.TRANSFORM_INPUT_PORTS;
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = TransformNode.TRANSFORM_OUTPUT_PORTS;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /** Read-only mirror of the world transform for the property panel. */
    @viewable("matrix4")
    public get world(): ReadonlyArray<number> {
        return this._world;
    }

    /**
     * Returns the effective scene view for the current tick.
     *
     * Reads `session.sceneStateView` when one has been bound (the Sim.Graph
     * that contains this node, or the GraphRunner at root, sets it
     * at session bind time from the wired SceneItem). Falls back to
     * a per-node default view (Earth surface, identity transform,
     * no atmosphere) when no scene is bound — keeps unit tests and
     * sample graphs without a SceneItem running cleanly.
     *
     * The returned view's accessors are live: a `scene.gravity` read
     * sees whatever the SceneItem holds right now, including dynamic
     * source overrides published this tick by upstream nodes.
     *
     *     const g = this.getScene(session).gravity;     // ICartesian3
     *     const T = this.getScene(session).temperature; // K
     *     const w = this.getScene(session).worldTransform.toMatrix4();
     */
    protected getScene(session: ISession): SceneStateView {
        const bound = session.sceneStateView;
        if (bound) return bound;
        if (!this._fallbackSceneView) {
            this._fallbackSceneView = buildDefaultStateView("__transform_fallback__");
        }
        return this._fallbackSceneView;
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

        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            // Only consume slots owned by the transform base class.
            // Subclasses iterate opsc again with their own slot filter,
            // so non-transform tokens stay untouched for them.
            if (!TransformNode.isTransformInputSlot(slot)) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (!isMatrix44(value)) continue;
            if (slot === TransformNode.INPUT_LOCAL) local = value;
            else if (slot === TransformNode.INPUT_PARENT_WORLD) parentWorld = value;
        }

        const newWorld: number[] = new Array(16);
        mul44(newWorld, parentWorld, local);

        if (!matrices44Equal(this._world, newWorld)) {
            this.setField("world", this._world, newWorld, (n) => {
                this._world = n;
            });
        }

        // Fan out the world matrix to every channel wired to the world output.
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== TransformNode.OUTPUT_WORLD || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, this._world);
        }
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createTransformNode(): TransformNode {
    return new TransformNode();
}
