/**
 * `Sim.Graph:graph` — the explicit fractal-container RuntimeNode.
 *
 * The runtime already supports fractal sub-graphs via `RuntimeGraph` +
 * `IGraphNodeState.internalSession` (each parent session that embeds a
 * RuntimeGraph allocates a distinct inner Session, so the same graph
 * topology can be embedded by N parents without state sharing). That
 * mechanism was invisible on the canvas; SimGraphNode promotes it to a
 * palette-droppable entity with the two extra contracts the v2
 * architecture needs:
 *
 *   1. **Scene binding** — `@cloneable sceneItemId` points at a
 *      SceneItem (a `GraphItem`) living in the same canvas. At
 *      `reset(parentSession)`, the editor's session-builder hands the
 *      SimGraphNode a `SceneStateViewResolver` that maps the ID to a
 *      live `SceneStateView`; the view is written into
 *      `innerSession.sceneStateView` so every TransformNode-derived
 *      node inside this sub-graph reads its gravity / temperature /
 *      transform from the wired Scene rather than from a default.
 *
 *   2. **Multi-rate sub-stepping** — `fire(parentSession, t)`
 *      computes the ratio K = innerHz / parentHz at every call (cheap;
 *      both Hz values are getters on the bound SceneStateView), then
 *      runs `innerSession.run()` K times between the parent's previous
 *      and current sim-time. Inputs are routed in ONCE before the
 *      sub-step loop (ZOH semantics — the inner integrator sees the
 *      parent's last-published value held across K micro-steps) and
 *      outputs routed out ONCE after, matching the F9 / `Helios.Sim:rate-group`
 *      design. K is clamped to ≥ 1, so a child with a slower (or
 *      identical) rate falls back to a single inner.run per parent
 *      fire.
 *
 * Solver attachment to the inner session lands in P4 (Solver-node
 * refactor); V1 of this node only wires the SceneStateView and runs
 * the sub-step loop.
 *
 * Inheritance choice: SimGraphNode subclasses `RuntimeGraph` rather
 * than composing one. Subclassing reuses the input/output port
 * routing, the IGraphNodeState factory, the control plane, and the
 * `reset()` cascade for free; the only new code paths are the scene
 * binding in reset() and the K-loop in fire().
 */

import { cloneable } from "../graph/graph.interfaces";
import type { IChannel, ISession, ISolverHandle } from "../execution/execution.interfaces";
import { RuntimeGraph } from "../execution/execution.graph";
import { Frequency } from "../math/math.units";
import { buildDefaultStateView } from "./scene-state-view.impl";
import type { SceneStateView } from "./scene-state-view.interface";

/**
 * Resolver protocol the editor's session-builder hands to a
 * SimGraphNode at session bind. Bundles the two scene-related
 * lookups the SimGraphNode needs at `reset()`:
 *
 *   - `buildView`: map a `sceneItemId` (the SceneItem's editor
 *     identity) to a live `SceneStateView` bound to the calling
 *     SimGraphNode's inner session.
 *   - `buildSolverAttachments`: enumerate the solvers wired to the
 *     SceneItem (via its `solverItemIds`), build each one's
 *     `ISolverHandle` instance from its editables, register the leaves
 *     it owns, and return the handles ready for `inner.attachSolver`.
 *
 * Both lookups are scoped to the same SceneItem, which is why they
 * live on a single interface rather than two parallel function-style
 * resolvers — the editor implements the two together and the
 * SimGraphNode invokes both inside the same reset() pass.
 *
 * Returns `null` / empty when the ID is unknown (item missing / not
 * yet created / typo) — SimGraphNode falls back to a default view
 * silently rather than throwing, matching the editor's tolerance for
 * transient invalid wirings during topology edits.
 *
 * Core has no SceneItem class (that lives in `plugins/physics/scene`)
 * and no concrete SolverNode (those live in `plugins/control/sim`),
 * so this interface is the seam that lets the editor wire all three
 * together without pulling the plugin layer into core's import graph.
 */
export interface SceneBindingResolver {
    buildView(sceneItemId: string, innerSession: ISession): SceneStateView | null;
    buildSolverAttachments(sceneItemId: string, innerSession: ISession): ReadonlyArray<ISolverHandle>;
}

export class SimGraphNode<N extends import("../execution/execution.interfaces").IRuntimeNode = import("../execution/execution.interfaces").IRuntimeNode, L extends IChannel = IChannel> extends RuntimeGraph<N, L> {
    /** Identifier of the SceneItem this sub-graph belongs to. Set by
     *  the editor when the user wires a SceneItem to this Sim.Graph
     *  via a config-link (P5). Empty string means "no scene wired"
     *  → falls back to a default Earth-surface view. */
    @cloneable public sceneItemId: string = "";

    /** Editor-injected resolver; null means the SimGraphNode is being
     *  used outside an editor session-build (unit tests, headless
     *  driver) and should fall back to defaults. */
    private _bindingResolver: SceneBindingResolver | null = null;

    /** Solvers we attached to the inner session on the most recent
     *  reset(). Tracked so we can detach them on a subsequent reset()
     *  (re-bind / re-configure) without leaving stale solvers
     *  registered. */
    private _attachedSolvers: ISolverHandle[] = [];

    /** Last sim-time observed by `fire()`; used to compute the sub-step
     *  dt = (t - _lastFiredAt) / K. Initialised to -Infinity so the
     *  very first fire treats `t` as both endpoints (no time has
     *  elapsed yet). */
    private _lastFiredAt: number = -Infinity;

    /**
     * Inject the scene binding resolver. The editor's session-builder
     * calls this once per build, before the parent session's
     * `reset()` cascades into this node's own `reset()`.
     */
    public setSceneBindingResolver(resolver: SceneBindingResolver | null): void {
        this._bindingResolver = resolver;
    }

    /**
     * Reset the inner session and bind its `sceneStateView`. The
     * resolver lookup happens lazily here (not at construction) so a
     * topology edit that re-wires the scene takes effect on the next
     * play without recreating the SimGraphNode instance.
     */
    public override reset(parentSession: ISession): void {
        super.reset(parentSession);
        const inner = this._internalSessionIn(parentSession);
        if (!inner) return;

        // Detach solvers from the previous bind, if any. Idempotent
        // when the list is empty (first reset()). Doing this BEFORE
        // we ask the resolver for a fresh set means a topology edit
        // that swaps the SceneItem cleanly tears down the old solvers
        // before the new ones arrive.
        for (const solver of this._attachedSolvers) {
            inner.detachSolver(solver);
        }
        this._attachedSolvers = [];

        // ── Scene view binding ───────────────────────────────────────
        let view: SceneStateView | null = null;
        if (this.sceneItemId && this._bindingResolver) {
            view = this._bindingResolver.buildView(this.sceneItemId, inner);
        }
        if (!view) {
            // No scene wired (or resolver unavailable / item missing):
            // bind a default Earth-surface view so consumers inside
            // the sub-graph still get sane gravity / temperature.
            view = buildDefaultStateView(`__sim_graph_${this.sceneItemId || "unbound"}`);
        }
        inner.sceneStateView = view;

        // ── Solver attachment ────────────────────────────────────────
        // Each entry in the resolver's array is an already-initialised
        // ISolverHandle ready to step. SimGraphNode just hands it over
        // to the inner session — the session will invoke step() at
        // the start of every inner.run() (integration phase, F3).
        if (this.sceneItemId && this._bindingResolver) {
            const attachments = this._bindingResolver.buildSolverAttachments(this.sceneItemId, inner);
            for (const solver of attachments) {
                inner.attachSolver(solver);
                this._attachedSolvers.push(solver);
            }
        }

        this._lastFiredAt = -Infinity;
    }

    /**
     * Fire the sub-graph with K sub-steps where K = ceil(innerHz / parentHz).
     *
     * Routing model:
     *   - Inputs are routed from the parent session into the inner
     *     ONCE at the start of fire(). The first sub-step sees fresh
     *     parent values; subsequent sub-steps see whatever the inner
     *     nodes themselves have made of them (ZOH on parent
     *     boundaries).
     *   - The inner session runs K times, each at `_lastFiredAt + k*dt`.
     *   - Outputs are routed back from the inner to the parent ONCE
     *     at the end. The parent sees the inner's terminal state for
     *     this macro-step.
     *
     * K-clamping: a child whose Scene declares `effectiveHz` ≤ parent
     * Hz collapses to a single inner.run. We don't allow K < 1 (would
     * skip the inner entirely) or fractional K (the runtime works in
     * discrete ticks).
     */
    public override fire(parentSession: ISession, t: number): void {
        const inner = this._routeInputsFromParent(parentSession);
        if (!inner) return;

        const K = this._computeSubStepRatio(parentSession, inner);
        // First fire after reset() has no recorded "previous t"; we
        // anchor the span at 0 (start-of-sim convention). Sub-steps
        // therefore spread evenly from 0 to t on the first call,
        // matching what the user sees when a fixed-rate runner kicks
        // off a fresh play (`GraphRunner.play()` resets t = 0 then
        // immediately calls run(dt) for the first frame).
        const lastT = this._lastFiredAt === -Infinity ? 0 : this._lastFiredAt;
        const span = t - lastT;
        const dt = K > 0 ? span / K : span;

        for (let k = 1; k <= K; k++) {
            inner.run(lastT + k * dt);
        }
        this._lastFiredAt = t;

        this._routeOutputsToParent(parentSession, inner);
    }

    /**
     * K = max(1, round(innerHz / parentHz)).
     *
     * Hz lookups go through the bound SceneStateView when available,
     * otherwise fall back to the legacy `ISession.simRate` field
     * (the runner sets it from its fixed-step rate). If neither side
     * exposes a usable Hz, K defaults to 1 (no sub-stepping).
     */
    private _computeSubStepRatio(parentSession: ISession, inner: ISession): number {
        const myHz = this._readHz(inner) ?? parentSession.simRate;
        const parentHz = this._readHz(parentSession) ?? parentSession.simRate;
        if (!myHz || !parentHz || parentHz <= 0) return 1;
        const ratio = myHz / parentHz;
        if (!Number.isFinite(ratio) || ratio <= 1) return 1;
        return Math.max(1, Math.round(ratio));
    }

    private _readHz(session: ISession): number | null {
        const view = session.sceneStateView;
        if (!view) return null;
        const hz = view.effectiveHz.getValue(Frequency.Units.Hz);
        return Number.isFinite(hz) && hz > 0 ? hz : null;
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createSimGraphNode(): SimGraphNode {
    return new SimGraphNode();
}
