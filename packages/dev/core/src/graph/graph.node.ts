import type { ICartesian, ICartesian3, IHasTransform, IMatrix4, IQuaternion } from "../geometry";
import { Cartesian3, Matrix4, Quaternion } from "../geometry";
import { Nullable } from "../types";
import { GraphItem } from "./graph.graphItem";
import { cloneable, INode, IOlink } from "./graph.interfaces";

/** Reused pose defaults + transient scratch for the node transform compose.
 *  The frozen defaults are shared and never mutated; the translation carrier
 *  and the parent-copy scratch are working buffers, each written and consumed
 *  within a single synchronous compose (JS is single-threaded, the recursive
 *  `parent.worldTransform()` resolves before the multiply), so one shared
 *  instance is safe and avoids per-call allocation. */
const IDENTITY_QUAT: IQuaternion = Object.freeze(new Quaternion(0, 0, 0, 1));
const UNIT_SCALE: ICartesian3 = Object.freeze(new Cartesian3(1, 1, 1));
const POSE_TRANSLATION: Cartesian3 = new Cartesian3();
const SCRATCH_PARENT: Matrix4 = new Matrix4();

/** Compose a fresh local matrix `T(position) · R(orientation)` [scale = 1].
 *  `position` is read through `ICartesian3` (a missing axis = 0, so a 2D
 *  quadtree position still works); an empty pose yields identity. The 4×4
 *  arithmetic is delegated to `Matrix4` (the single source of matrix math);
 *  this only feeds it the pose with sane defaults. */
function composeLocalMatrix(position: ICartesian | undefined, orientation: IQuaternion | undefined): Matrix4 {
    if (position === undefined && orientation === undefined) {
        return new Matrix4(); // the constructor defaults to identity
    }
    const p = position as ICartesian3 | undefined;
    POSE_TRANSLATION.x = p?.x ?? 0;
    POSE_TRANSLATION.y = p?.y ?? 0;
    POSE_TRANSLATION.z = p?.z ?? 0;
    return new Matrix4().composeInPlace(UNIT_SCALE, orientation ?? IDENTITY_QUAT, POSE_TRANSLATION);
}

export class GraphNode<B = unknown> extends GraphItem<B> implements INode<B> {
    protected _onsc: IOlink[];
    protected _opsc: IOlink[];

    // Backing fields named to avoid colliding with subclass editables that
    // already use `_position` / `_rotation` (e.g. the geometry Transform
    // node). `@cloneable` lives on the public getters below so the serialized
    // keys stay "position" / "orientation" (save-file compatible).
    private _positionValue?: ICartesian;
    private _orientationValue?: IQuaternion;
    private _parent?: IHasTransform;

    /** Cached local pose matrix; `undefined` = invalidated (recomposed on the
     *  next `localTransform()`). The cache IS the matrix-or-undefined: a pose
     *  setter nulls it directly rather than flipping a boolean. Stays
     *  undefined for a node that never asks for its transform, so a
     *  non-spatial node (most neurons) holds no 4×4. */
    private _local?: Matrix4;
    /** Cached world pose matrix. Recomposed IN PLACE (the buffer is reused
     *  across recomputes — a moving parent overwrites it, never reallocates);
     *  nulled only by a pose / parent change so the rare structural change
     *  reallocates once. */
    private _world?: Matrix4;

    /** Monotonic pose version: the position / orientation setters bump it.
     *  `worldTransform()` compares it to `_cachedLocalVersion` to know the
     *  local moved (O(1), no matrix compare). */
    private _localVersion: number = 0;
    /** Monotonic WORLD version (see IHasTransform.transformVersion): advances
     *  whenever this node's world is (re)composed to a new value. A child
     *  reads it to detect a moved parent in O(1). Protected so a world-object
     *  subclass that recomposes its own world (the sim push path) keeps it
     *  advancing for any child observing it. */
    protected _worldVersion: number = 0;
    /** The (parent world version, local version) this node last composed its
     *  world against; a mismatch on either means the cached world is stale.
     *  `-1` = never composed / no parent. */
    private _cachedParentWorldVersion: number = -1;
    private _cachedLocalVersion: number = -1;

    /** The node's founding spatial coordinate (see IHasTransform.position).
     *  Reassigning it invalidates the cached local + world transforms;
     *  mutating the vector IN PLACE does not — reassign, or call
     *  `invalidateTransform()`. */
    @cloneable
    public get position(): ICartesian | undefined {
        return this._positionValue;
    }

    public set position(v: ICartesian | undefined) {
        if (v === this._positionValue) {
            return;
        }
        this._positionValue = v;
        this._local = undefined; // invalidate the cached matrices themselves
        this._world = undefined;
        this._localVersion++; // signal worldTransform (here + on any child) to recompose
    }

    /** The node's orientation (see IHasTransform.orientation). Reassigning it
     *  invalidates the cached local + world transforms. */
    @cloneable
    public get orientation(): IQuaternion | undefined {
        return this._orientationValue;
    }

    public set orientation(v: IQuaternion | undefined) {
        if (v === this._orientationValue) {
            return;
        }
        this._orientationValue = v;
        this._local = undefined; // invalidate the cached matrices themselves
        this._world = undefined;
        this._localVersion++; // signal worldTransform (here + on any child) to recompose
    }

    /** Parent frame in the transform tree (see IHasTransform). Structural,
     *  re-established by the enclosing container on placement, so NOT
     *  @cloneable: a clone starts parent-less until it is placed.
     *  Reassigning it invalidates the cached world transform. */
    public get parent(): IHasTransform | undefined {
        return this._parent;
    }

    public set parent(v: IHasTransform | undefined) {
        if (v === this._parent) {
            return;
        }
        this._parent = v;
        this._world = undefined; // a new (or removed) parent invalidates the cached world
        this._cachedParentWorldVersion = -1; // force a recompose vs the new parent (even if its version coincides)
        this._worldVersion++; // a parent identity change alters the world -> children observe it
    }

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super();
        this._onsc = onsc ?? [];
        this._opsc = opsc ?? [];
        this.position = position;
        for (const link of this._onsc) {
            this.nscAdded(link);
        }
        for (const link of this._opsc) {
            this.pscAdded(link);
        }
    }

    public onsc<L extends IOlink>(): Array<L> {
        return this._onsc as Array<L>;
    }

    public opsc<L extends IOlink>(): Array<L> {
        return this._opsc as Array<L>;
    }

    public add<L extends IOlink>(...links: Array<L>): void {
        if (links.length === 0) {
            return;
        }
        for (const link of links) {
            if (link.oini === this) {
                const a = this._onsc;
                const i = a.indexOf(link);
                if (i >= 0) {
                    continue;
                }
                this._onsc.push(link);
                this.nscAdded(link);
            } else if (link.ofin === this) {
                const a = this._opsc;
                const i = a.indexOf(link);
                if (i >= 0) {
                    continue;
                }
                this._opsc.push(link);
                this.pscAdded(link);
            }
        }
    }

    public remove<L extends IOlink>(...links: Array<L>): void {
        if (links.length === 0) {
            return;
        }
        for (const link of links) {
            if (link.oini === this) {
                const a = this._onsc;
                const i = a.indexOf(link);
                if (i >= 0) {
                    a.splice(i, 1);
                    this.nscRemoved(link);
                }
            } else if (link.ofin === this) {
                const a = this._opsc;
                const i = a.indexOf(link);
                if (i >= 0) {
                    a.splice(i, 1);
                    this.pscRemoved(link);
                }
            }
        }
    }

    protected nscAdded<L extends IOlink>(..._links: Array<L>): void {}
    protected nscRemoved<L extends IOlink>(..._links: Array<L>): void {}
    protected pscAdded<L extends IOlink>(..._links: Array<L>): void {}
    protected pscRemoved<L extends IOlink>(..._links: Array<L>): void {}

    // ── IHasTransform: pure-geometry pose, composed on demand ─────────
    //
    // No runtime / session / port concept here (that is the sim layer's,
    // layered on top by overriding these). World objects override
    // localTransform/worldTransform to fold in a wired `local` override
    // or a scene-parent fallback; the default below is the founding pose.

    /** Local pose as a 4×4 (see IHasTransform): composed from
     *  `position` / `orientation`, identity when both are unset. CACHED — the
     *  matrix is held until a pose change nulls it (the setters); repeated
     *  reads return the same instance. BORROWED / read-only (see IHasTransform):
     *  callers must not mutate it. Returns the concrete `Matrix4` (the contract
     *  is the wider `IMatrix4`). */
    public localTransform(): Matrix4 {
        let local = this._local;
        if (local === undefined) {
            local = this._local = composeLocalMatrix(this._positionValue, this._orientationValue);
        }
        return local;
    }

    /** World pose as a 4×4 (see IHasTransform): `parent.worldTransform() × local`,
     *  or the local pose when there is no parent. CACHED — recomposed only
     *  when the local moved or the parent's world moved, detected in O(1) via
     *  `transformVersion` counters (no per-call matrix value compare). The
     *  world buffer is REUSED across recomputes. BORROWED / read-only result
     *  (see IHasTransform): a root node returns its `localTransform()`
     *  instance, so mutating the result would corrupt the local. */
    public worldTransform(): Matrix4 {
        const local = this.localTransform();
        const parent = this._parent;
        if (parent === undefined) {
            // world == local; still advance the world version when the local
            // moved so a child parented to this (root) node detects the change.
            if (this._cachedLocalVersion !== this._localVersion) {
                this._cachedLocalVersion = this._localVersion;
                this._worldVersion++;
            }
            return local;
        }
        const parentWorld = parent.worldTransform();
        const parentVersion = parent.transformVersion;
        if (this._world === undefined || this._cachedParentWorldVersion !== parentVersion || this._cachedLocalVersion !== this._localVersion) {
            const world = (this._world ??= new Matrix4()); // reuse the buffer; only a null (pose/parent change) reallocates
            this.composeWorldInto(local, parentWorld, world);
            this._cachedParentWorldVersion = parentVersion;
            this._cachedLocalVersion = this._localVersion;
            this._worldVersion++;
        }
        return this._world;
    }

    /** Monotonic version of this node's WORLD transform (see IHasTransform).
     *  Reading it brings the world up to date first, so the value reflects the
     *  current pose / ancestry. */
    public get transformVersion(): number {
        this.worldTransform();
        return this._worldVersion;
    }

    /** Invalidate the cached local + world matrices (see IHasTransform). Same
     *  effect as a pose setter: the next `localTransform()` / `worldTransform()`
     *  recomposes and `transformVersion` advances. The escape hatch for an
     *  in-place pose mutation (`node.position.x = ...`) the setters can't see. */
    public invalidateTransform(): void {
        this._local = undefined;
        this._world = undefined;
        this._localVersion++;
    }

    /** Compose `out = parentWorld · local` into the caller's `out` and return
     *  it. The parent is copied into shared scratch first so the multiply is
     *  aliasing-safe. The base path passes a fresh matrix (it recomposes only
     *  on invalidation); world-object subclasses that recompute every fire
     *  (ports / scene change) pass a REUSED `out` to avoid per-tick allocation. */
    protected composeWorldInto(local: IMatrix4, parentWorld: IMatrix4, out: Matrix4): Matrix4 {
        SCRATCH_PARENT.copyFrom(parentWorld);
        SCRATCH_PARENT.multiplyToRef(local, out);
        return out;
    }
}
