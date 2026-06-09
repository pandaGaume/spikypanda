/**
 * `Control.Sim:rk4-solver` — parameter descriptor for the adaptive RK4
 * (Cash-Karp) solver.
 *
 * Refactored 2026-06-09 (D-refactor #53): used to be a RuntimeNode that
 * owned a `leafFilter` glob and dispatched integration itself. Is now
 * a `GraphItem` (descriptor only):
 *
 *   - Carries common options (`tolerance`, `maxStep`).
 *   - Exposes `toSolverDescriptor()` returning `{ kind: "rk4-adaptive",
 *     options: {...} }` which the attachment helper feeds to
 *     `SOLVER_REGISTRY.create()`.
 *   - Holds a reference to the LIVE solver instance built from this
 *     descriptor (set by the attachment helper) so the property panel's
 *     diagnostic viewables (lastMicroSteps, lastMaxError, rhsEvalsTotal,
 *     ownedLeaves) stay live during play.
 *
 *   - Does NOT extend RuntimeNode. The editor's session-builder
 *     EXCLUDES this from the runtime graph (no fire(), no channel
 *     wiring) — same convention as SceneItem.
 *   - Does NOT implement leafFilter or own resolution. Leaves
 *     declare `solverKind = "rk4-adaptive"` (the default), the
 *     attachment helper groups them.
 *
 * Editables:
 *   tolerance     embedded-error threshold per state entry (default 1e-6)
 *   maxStep       hard cap on adaptive step size (default 10 ms)
 *
 * Viewables (refreshed each macro-step via the bound solver instance):
 *   lastMicroSteps  count of adaptive sub-steps for the previous macro-step
 *   lastMaxError    L∞ embedded-error estimate over the accepted state
 *   rhsEvalsTotal   running total of rhs evaluations since reset
 *   ownedLeaves     leaves the solver claimed at its last initialise
 */

import {
    cloneable,
    editable,
    GraphItem,
    ISolverDescriptor,
    ISolverOptions,
    viewable,
} from "spikypanda-core";
import type { ISolver } from "spikypanda-core";

/** Kind id this descriptor produces. Must match the factory the
 *  `Control.Sim` plugin registers in its `activate()`. */
export const RK4_SOLVER_KIND = "rk4-adaptive";

/**
 * A minimal duck-type capturing the diagnostic surface the RK4 solver
 * exposes (the runtime classes implement more, but the item only reads
 * these). Kept here so we don't depend on the concrete RK4AdaptiveSolver
 * import inside the item — the registry's factory function builds the
 * concrete one and hands it back; the item just inspects `lastStep`.
 */
interface ISolverWithDiagnostics extends ISolver {
    // ISolver already declares `readonly lastStep: ISolverStep | null`.
    // The item reads it through ISolver itself; this alias is here
    // purely for documentation.
}

export class RK4SolverItem extends GraphItem {
    // ── Common options (exposed to the property panel) ────────────────
    @cloneable private _tolerance: number = 1e-6;
    @cloneable private _maxStep: number = 1e-2;

    // ── Diagnostic mirrors (read from the bound solver each tick) ────
    //
    // We keep these as cloneable fields so the property panel +
    // serialization round-trip them on save/load (matches the previous
    // RuntimeNode's behaviour). Updated by `refreshDiagnostics()` which
    // is called from the parent's fire phase via `SimGraphNode` or the
    // root attachment loop.
    @cloneable private _lastMicroSteps: number = 0;
    @cloneable private _lastMaxError: number = 0;
    @cloneable private _rhsEvalsTotal: number = 0;
    @cloneable private _ownedCount: number = 0;

    // ── Bound solver instance (set by the attachment helper) ─────────
    //
    // Held as a weak association: when a new session bind occurs the
    // attachment helper rebuilds the solver and overwrites this ref.
    // null before the first bind, AND after the user clears the wiring.
    private _boundSolver: ISolverWithDiagnostics | null = null;

    public constructor() {
        super();
    }

    // ── Editable accessors ───────────────────────────────────────────
    @editable("number") public get tolerance(): number {
        return this._tolerance;
    }
    public set tolerance(v: number) {
        const next = Number.isFinite(v) && v > 0 ? v : 1e-12;
        this._setField("tolerance", this._tolerance, next, (n) => {
            this._tolerance = n;
        });
    }

    @editable("number") public get maxStep(): number {
        return this._maxStep;
    }
    public set maxStep(v: number) {
        const next = Number.isFinite(v) && v > 0 ? v : 1e-6;
        this._setField("maxStep", this._maxStep, next, (n) => {
            this._maxStep = n;
        });
    }

    // ── Viewables: diagnostic mirrors ────────────────────────────────
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

    // ── Descriptor contract ──────────────────────────────────────────

    /**
     * Produce a descriptor for the attachment helper. Called once per
     * session bind; the helper then calls `SOLVER_REGISTRY.create(kind,
     * options, leaves)` which produces an ISolver instance, then loops
     * back via `bindSolver(solver)` so the item's diagnostic viewables
     * stay live.
     */
    public toSolverDescriptor(): ISolverDescriptor {
        const options: ISolverOptions = {
            tolerance: this._tolerance,
            maxStep: this._maxStep,
        };
        return { kind: RK4_SOLVER_KIND, options };
    }

    /**
     * Receive the live solver instance built from this descriptor.
     * Called by the attachment helper after `SOLVER_REGISTRY.create`.
     * Pass `null` to clear the binding (e.g. on session teardown).
     */
    public bindSolver(solver: ISolver | null, ownedCount: number): void {
        this._boundSolver = solver as ISolverWithDiagnostics | null;
        this._setField("ownedLeaves", this._ownedCount, ownedCount, (n) => {
            this._ownedCount = n;
        });
        if (!solver) {
            this._setField("lastMicroSteps", this._lastMicroSteps, 0, (n) => {
                this._lastMicroSteps = n;
            });
            this._setField("lastMaxError", this._lastMaxError, 0, (n) => {
                this._lastMaxError = n;
            });
            this._setField("rhsEvalsTotal", this._rhsEvalsTotal, 0, (n) => {
                this._rhsEvalsTotal = n;
            });
        }
    }

    /**
     * Pull the latest `lastStep` from the bound solver and update the
     * diagnostic viewables. Idempotent. Called once per macro-tick by
     * the enclosing session — typically right after the integration
     * phase finishes — through a side-channel set up by the attachment
     * helper. In the SimGraphNode case, this gets wired into a per-
     * solver postfire hook; in the root case the GraphRunner's tick
     * loop invokes it.
     */
    public refreshDiagnostics(): void {
        const last = this._boundSolver?.lastStep ?? null;
        if (!last) return;
        this._setField("lastMicroSteps", this._lastMicroSteps, last.microSteps, (n) => {
            this._lastMicroSteps = n;
        });
        this._setField("lastMaxError", this._lastMaxError, last.maxError, (n) => {
            this._lastMaxError = n;
        });
        const newTotal = this._rhsEvalsTotal + last.rhsEvals;
        this._setField("rhsEvalsTotal", this._rhsEvalsTotal, newTotal, (n) => {
            this._rhsEvalsTotal = n;
        });
    }

    // ── setField helper (GraphItem doesn't expose `setField` publicly) ──
    //
    // SceneItem has access to GraphItem.setField (protected); RK4SolverItem
    // is a sibling subclass and inherits the same protected access. We
    // wrap it in a private helper to keep call sites tidy.
    private _setField<T>(name: string, current: T, next: T, writer: (v: T) => void): void {
        if (current === next) return;
        writer(next);
        this.notifyPropertyChanged(name, current, next);
    }
}

export function createRK4SolverItem(): RK4SolverItem {
    return new RK4SolverItem();
}
