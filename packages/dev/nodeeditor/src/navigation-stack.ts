/**
 * Navigation history for drill-down into Sim.Graph sub-graphs.
 *
 * Each entry on the stack captures the state of a graph level the
 * user has just LEFT to enter a child sub-graph. The bottom entry
 * is always the root canvas; entries above are pushed when the user
 * double-clicks a Sim.Graph node and popped when they leave the
 * sub-graph (Esc / Ctrl+Up / breadcrumb click).
 *
 * Lazy storage convention: the popped-from level's serialized graph
 * lives in `parentSnapshot` (the JSON string `GraphViewer.save()`
 * produced before drilling). The sub-graph the user is currently
 * editing is NOT held on the stack — it's the live state in the
 * `GraphViewer` itself. On leaveSubGraph(), the viewer serializes
 * itself, writes the result back onto the Sim.Graph parent node's
 * data via `subGraphJsonKey`, then restores the parentSnapshot.
 *
 * The session-builder consults the same `subGraphJsonKey` at play
 * time to materialise inner RuntimeGraphs without going through the
 * viewer — so a graph saved while the user was inside a sub-graph
 * still plays correctly.
 */

/** Key on a Sim.Graph node's `item.data` where the serialized inner
 *  graph (`GraphViewer.save()` output) is stored. Centralised so the
 *  viewer, the session-builder, and any future code that needs to
 *  read or seed an inner graph all agree on the same string. */
export const SUB_GRAPH_JSON_KEY = "subGraphJson";

/** TypeId emitted by `Sim.Graph:graph` palette registration. Used by
 *  the viewer's double-click intercept to decide whether a node is
 *  a drill-down target. Hardcoded here (rather than imported from a
 *  plugin) so the editor layer has zero plugin dependencies. */
export const SIM_GRAPH_TYPE_ID = "Sim.Graph:graph";

export interface NavigationLevel {
    /** The Sim.Graph node ID we drilled INTO from the parent level.
     *  `null` for the implicit root entry that is always at the
     *  bottom of the stack. */
    readonly parentNodeId: string | null;
    /** Human-readable label shown in the breadcrumb (usually the
     *  parent node's label, or "Root" for the bottom entry). */
    readonly label: string;
    /** Serialized state of the PARENT graph (the canvas the user
     *  was viewing before entering this level). `null` only for the
     *  root entry, which has no parent to restore. */
    readonly parentSnapshot: string | null;
}

/**
 * Stack-of-levels with notification. Initialised with a single root
 * entry; never empties (so consumers can always read `.current`).
 */
export class NavigationStack {
    private readonly _levels: NavigationLevel[] = [];

    /** Fires whenever the stack changes (push / pop / popTo). */
    public onChanged: (() => void) | null = null;

    public constructor(rootLabel: string = "Root") {
        this._levels.push({
            parentNodeId: null,
            label: rootLabel,
            parentSnapshot: null,
        });
    }

    /** Number of levels currently on the stack. Always ≥ 1 (root). */
    public get depth(): number {
        return this._levels.length;
    }

    /** The current (top-of-stack) level. The user is currently editing
     *  the graph that this level was pushed INTO. */
    public get current(): NavigationLevel {
        return this._levels[this._levels.length - 1];
    }

    /** Read-only snapshot of every level in stack order (root at index 0,
     *  current at last). Used by the breadcrumb component to render
     *  every crumb. */
    public get all(): ReadonlyArray<NavigationLevel> {
        return this._levels;
    }

    /** Push a new level. Called by `GraphViewer.enterSubGraph()` once
     *  the parent state has been captured. */
    public push(level: NavigationLevel): void {
        this._levels.push(level);
        this.onChanged?.();
    }

    /** Pop the topmost level and return it. Returns `null` when only
     *  the root entry remains (the user can't drill ABOVE root). */
    public pop(): NavigationLevel | null {
        if (this._levels.length <= 1) return null;
        const popped = this._levels.pop()!;
        this.onChanged?.();
        return popped;
    }

    /** Pop the stack down to (and including) the entry at `index`.
     *  Used by the breadcrumb click handler to jump multiple levels
     *  up in a single action. Returns the popped levels in
     *  oldest-first order. Out-of-range indices are clamped: a
     *  negative or zero `index` pops everything above root. */
    public popTo(index: number): NavigationLevel[] {
        const target = Math.max(0, Math.min(index, this._levels.length - 1));
        const popped: NavigationLevel[] = [];
        while (this._levels.length - 1 > target) {
            popped.unshift(this._levels.pop()!);
        }
        if (popped.length > 0) this.onChanged?.();
        return popped;
    }

    /** Replace every level with a fresh root. Used by the viewer's
     *  `clear()` or when loading a brand-new project. */
    public reset(rootLabel: string = "Root"): void {
        this._levels.length = 0;
        this._levels.push({
            parentNodeId: null,
            label: rootLabel,
            parentSnapshot: null,
        });
        this.onChanged?.();
    }
}
