import { cloneable, editable, viewable, IDeclaresPorts, IOlink, IPortDescriptor, IRuntimeGraph, ISession, ISolverHandle, RuntimeNode, isIntegrable, RK4AdaptiveSolver } from "spikypanda-core";
import type { ICartesian, Nullable, IIntegrable } from "spikypanda-core";

/**
 * RK4 adaptive solver marker node.
 *
 * In the P4 architecture this node is a **config carrier + diagnostic
 * publisher**, NOT a session-attaching agent. The actual lifetime is:
 *
 *   1. The user drops a SceneItem on the canvas, a `Sim.Graph:graph`
 *      sub-graph, and one or more `Control.Sim:rk4-solver` nodes
 *      beside the Scene. Config-links wire the SolverNode's `solver_out`
 *      anchor to the Scene's variadic `solver_in_<k>` (P5).
 *
 *   2. At session-build the editor's `SceneBindingResolver`
 *      enumerates the Scene's `solverItemIds`, looks up each
 *      SolverNode by ID, and calls `node.buildSolverFor(innerGraph)`
 *      to obtain a ready-to-attach `ISolverHandle`. The resolver
 *      hands the handles back to `SimGraphNode.reset()` which
 *      attaches them to the inner session.
 *
 *   3. The SolverNode's own `reset(parentSession)` only resets its
 *      diagnostic counters — it never calls `session.attachSolver`
 *      directly. `fire(parentSession, t)` reads the previously-built
 *      solver's `lastStep` into its viewables so the user can plot
 *      `lastMicroSteps` / `lastMaxError` / `rhsEvalsTotal` from a
 *      Time-series tile (the solver lives in a different session —
 *      the inner one — but the reference is held on this node for
 *      diagnostics).
 *
 * Editables:
 *   tolerance     embedded-error threshold per state entry (default 1e-6)
 *   maxStep       hard cap on adaptive step size (default 10 ms)
 *   leafFilter    glob on each leaf's `typeId` (default "*" = catch-all).
 *                 Future: when multiple solvers coexist on the same
 *                 scene, partition leaves so an RK4 owns physics
 *                 motors and a Rosenbrock owns Sabatier chemistry.
 *
 * Viewables (live diagnostics, refreshed on each `fire()`):
 *   lastMicroSteps  count of adaptive sub-steps the solver used last
 *                   macro-step. 1 = no subdivision; high = transient.
 *   lastMaxError    L∞ embedded-error estimate over the accepted state.
 *   rhsEvalsTotal   running total of rhs evaluations since reset.
 *   ownedLeaves     leaves the solver claimed at build time.
 */
export class Rk4SolverNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _tolerance: number = 1e-6;
    @cloneable private _maxStep: number = 1e-2;
    @cloneable private _leafFilter: string = "*";

    @cloneable private _lastMicroSteps: number = 0;
    @cloneable private _lastMaxError: number = 0;
    @cloneable private _rhsEvalsTotal: number = 0;
    @cloneable private _ownedCount: number = 0;

    /** Solver instance built by `buildSolverFor()` and held here so
     *  `fire()` can read its `lastStep` for diagnostic viewables. */
    private _solver: RK4AdaptiveSolver | null = null;

    // No data-flow ports. The solver doesn't consume tokens and
    // doesn't publish (broadcast for stats is intentionally NOT
    // wired by default; users add a Time-series Plot tile bound to
    // the viewables instead — keeps the graph topology clean).
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get tolerance(): number {
        return this._tolerance;
    }
    public set tolerance(v: number) {
        const next = v > 0 ? v : 1e-12;
        this.setField("tolerance", this._tolerance, next, (n) => {
            this._tolerance = n;
        });
    }

    @editable("number") public get maxStep(): number {
        return this._maxStep;
    }
    public set maxStep(v: number) {
        const next = v > 0 ? v : 1e-6;
        this.setField("maxStep", this._maxStep, next, (n) => {
            this._maxStep = n;
        });
    }

    @editable("string") public get leafFilter(): string {
        return this._leafFilter;
    }
    public set leafFilter(v: string) {
        const next = v && v.length > 0 ? v : "*";
        this.setField("leafFilter", this._leafFilter, next, (n) => {
            this._leafFilter = n;
        });
    }

    @viewable("number") public get lastMicroSteps(): number {
        return this._lastMicroSteps;
    }
    @viewable("number") public get lastMaxError(): number {
        return this._lastMaxError;
    }
    @viewable("number") public get rhsEvalsTotal(): number {
        return this._rhsEvalsTotal;
    }
    @viewable("number") public get ownedLeaves(): number {
        return this._ownedCount;
    }

    /**
     * Filter the given graph's IIntegrable leaves by this node's
     * `leafFilter` glob. Exposed publicly so the editor's
     * SceneBindingResolver can call it directly when populating
     * `buildSolverAttachments`. The graph passed in is the INNER
     * graph of the Sim.Graph that owns the calling scene — not the
     * graph that contains this SolverNode itself.
     */
    public resolveOwnedLeaves(innerGraph: IRuntimeGraph): IIntegrable[] {
        const filterRegex = _globToRegex(this._leafFilter);
        const owned: IIntegrable[] = [];
        for (const n of innerGraph.nodes) {
            if (!isIntegrable(n)) continue;
            const candidate = n as IIntegrable & { typeId?: string; constructor: { name: string } };
            const typeIdentity = candidate.typeId ?? candidate.constructor.name;
            if (!filterRegex.test(typeIdentity)) continue;
            owned.push(candidate);
        }
        return owned;
    }

    /**
     * Build (or rebuild) an `RK4AdaptiveSolver` configured with this
     * node's current editables, initialise it against the leaves it
     * claims from `innerGraph` via `leafFilter`, and return the
     * `ISolverHandle`. Returns `null` when no leaves matched — the
     * editor's resolver skips the attachment in that case to avoid
     * registering a no-op solver.
     *
     * The created solver instance is also stored on `_solver` so
     * `fire()` can read its `lastStep` for diagnostic viewables.
     * Re-calling this method (mid-session reconfigure) replaces the
     * stored instance; the previous handle is the caller's
     * responsibility to detach from any inner session it was
     * attached to.
     */
    public buildSolverFor(innerGraph: IRuntimeGraph): ISolverHandle | null {
        const owned = this.resolveOwnedLeaves(innerGraph);
        this.setField("ownedLeaves", this._ownedCount, owned.length, (n) => {
            this._ownedCount = n;
        });
        if (owned.length === 0) {
            this._solver = null;
            return null;
        }
        const solver = new RK4AdaptiveSolver({
            tolerance: this._tolerance,
            maxStep: this._maxStep,
        });
        solver.initialize(owned, 0);
        this._solver = solver;
        return solver;
    }

    public override reset(_session: ISession): void {
        // Diagnostic reset only — solver attachment is owned by the
        // SimGraphNode (P4 architecture). Topology re-binds happen
        // when `SimGraphNode.reset()` calls `buildSolverFor()`
        // through the SceneBindingResolver.
        this.setField("rhsEvalsTotal", this._rhsEvalsTotal, 0, (n) => {
            this._rhsEvalsTotal = n;
        });
        this.setField("lastMicroSteps", this._lastMicroSteps, 0, (n) => {
            this._lastMicroSteps = n;
        });
        this.setField("lastMaxError", this._lastMaxError, 0, (n) => {
            this._lastMaxError = n;
        });
    }

    public override fire(_session: ISession, _t: number): void {
        // No integration work — the inner session ran solver.step()
        // in its integration phase before our parent's dispatch
        // phase reaches us. We just refresh diagnostic viewables.
        const last = this._solver?.lastStep ?? null;
        if (!last) return;
        this.setField("lastMicroSteps", this._lastMicroSteps, last.microSteps, (n) => {
            this._lastMicroSteps = n;
        });
        this.setField("lastMaxError", this._lastMaxError, last.maxError, (n) => {
            this._lastMaxError = n;
        });
        const newTotal = this._rhsEvalsTotal + last.rhsEvals;
        this.setField("rhsEvalsTotal", this._rhsEvalsTotal, newTotal, (n) => {
            this._rhsEvalsTotal = n;
        });
    }
}

/**
 * Minimal glob → RegExp helper. Supports `*` (any sequence) and `?`
 * (any single char). Anchored on both ends. Sufficient for the
 * `Physics.Electric.*` / `Helios.Process.*` patterns the v2 plan
 * examples use; full POSIX globs would be overkill for one editor field.
 */
function _globToRegex(glob: string): RegExp {
    const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
    return new RegExp(`^${escaped}$`);
}

export function createRk4SolverNode(): Rk4SolverNode {
    return new Rk4SolverNode();
}
