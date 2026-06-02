import { cloneable, editable, viewable, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, isIntegrable, RK4AdaptiveSolver } from "spikypanda-core";
import type { ICartesian, Nullable, IIntegrable } from "spikypanda-core";

/**
 * RK4 adaptive solver marker node. Per the F3 / sim-framework-api-v2
 * plan: the solver is a Session concern, NOT a data-flow node. This
 * node exists in the graph purely for editability and serialization —
 * its `reset()` discovers IIntegrable leaves in the session's graph,
 * instantiates an `RK4AdaptiveSolver`, and calls `session.attachSolver`.
 * The actual integration runs in the Session's integration phase
 * (BEFORE the dispatch phase fires any node), so a leaf's `fire()`
 * always sees already-updated state.
 *
 * Editables:
 *   tolerance     embedded-error threshold per state entry (default 1e-6)
 *   maxStep       hard cap on adaptive step size (default 10 ms)
 *   leafFilter    glob on each leaf's `typeId` (default "*" = catch-all).
 *                 Future: when multiple solvers coexist, partition
 *                 leaves so an RK4 owns physics motors and a Rosenbrock
 *                 owns Sabatier chemistry.
 *
 * Viewables (live diagnostics, updated each `fire()` from the solver's
 * last step):
 *   lastMicroSteps  count of adaptive sub-steps the solver used last
 *                   macro-step. 1 = no subdivision; high = transient.
 *   lastMaxError    L∞ embedded-error estimate over the accepted state.
 *   rhsEvalsTotal   running total of rhs evaluations since reset.
 *
 * The node's `fire()` NEVER does integration work — it only refreshes
 * diagnostic viewables. The user can drop a Time-series Plot tile bound
 * to `lastMicroSteps` to watch solver behaviour live.
 *
 * Multi-solver and hierarchical solvers fall out naturally: drop two
 * RK4 marker nodes with disjoint `leafFilter` globs and each attaches
 * its own solver to the session. Drop a marker inside a sub-graph and
 * it attaches to that sub-graph's internal session.
 */
export class Rk4SolverNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _tolerance: number = 1e-6;
    @cloneable private _maxStep: number = 1e-2;
    @cloneable private _leafFilter: string = "*";

    @cloneable private _lastMicroSteps: number = 0;
    @cloneable private _lastMaxError: number = 0;
    @cloneable private _rhsEvalsTotal: number = 0;
    @cloneable private _ownedCount: number = 0;

    private _solver: RK4AdaptiveSolver | null = null;
    private _activeSession: ISession | null = null;

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

    public override reset(session: ISession): void {
        // Detach the previous solver (if any) and any associated
        // session attachment before rebuilding. Handles both first
        // reset (no-op) and mid-session reconfigure (drop old solver,
        // build new one with current editables).
        if (this._solver && this._activeSession) {
            this._activeSession.detachSolver(this._solver);
        }
        this._solver = null;
        this._activeSession = null;
        this._rhsEvalsTotal = 0;

        // Discover IIntegrable leaves in this session's graph, filtered
        // by the editor-configured leafFilter glob. We import isIntegrable
        // from core to do the structural check.
        const filterRegex = _globToRegex(this._leafFilter);
        const owned: IIntegrable[] = [];
        for (const n of session.graph.nodes) {
            if (!isIntegrable(n)) continue;
            // Pull typeId off the node if it exposes one. Convention:
            // RuntimeNode subclasses don't carry typeId at the runtime
            // layer (typeId lives on the editor NodeUI). For glob
            // matching at the leaf level we fall back to the node's
            // constructor name when typeId isn't present. Good enough
            // for V1; precise typeId-aware globbing is a future polish.
            const candidate = n as IIntegrable & { typeId?: string; constructor: { name: string } };
            const typeIdentity = candidate.typeId ?? candidate.constructor.name;
            if (!filterRegex.test(typeIdentity)) continue;
            owned.push(candidate);
        }
        this._ownedCount = owned.length;
        if (owned.length === 0) {
            // No leaves to integrate — solver doesn't attach. Property
            // panel still surfaces the ownedLeaves viewable so the user
            // sees "no leaves matched the filter" without digging.
            return;
        }

        const solver = new RK4AdaptiveSolver({
            tolerance: this._tolerance,
            maxStep: this._maxStep,
        });
        solver.initialize(owned, 0);
        session.attachSolver(solver);
        this._solver = solver;
        this._activeSession = session;
    }

    public override fire(_session: ISession, _t: number): void {
        // No integration work here — the Session ran solver.step() in
        // its integration phase before this fire. We're only here to
        // refresh diagnostic viewables.
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
