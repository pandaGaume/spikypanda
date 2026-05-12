import { IEnableable, IGraph, INode, IOlink, isEnableable, isGraph, isNode, isOlink } from "../graph/graph.interfaces";
import { IRuntimeNode, ISession } from "../execution/execution.interfaces";

/**
 * Named scheduling phases. The scheduler runs nodes phase-by-phase in
 * declaration order; nodes participate in any subset of phases (declared
 * via ISimNode.phases). Covers general-purpose time-discrete simulation
 * (PreStep, Step, PostStep). New phases are added by extending this
 * enum, not by passing arbitrary strings.
 */
export enum SimPhase {
    PreStep = 0,
    Step = 1,
    PostStep = 2,
}

/**
 * A node with temporal discipline. advance(t, phase) advances internal
 * state from t_prev to t during the named phase; it must be called with
 * monotonically non-decreasing t and is idempotent when t == t_prev.
 * reset() returns the node to its construction-time state.
 *
 * phases declares which phases this node participates in. The scheduler
 * invokes advance once per declared phase per tick, in graph-phase order.
 * Stateless single-phase nodes (e.g. ONNX compute ops) declare [Step].
 */
export interface ISimNode extends INode, IEnableable {
    readonly phases: ReadonlyArray<SimPhase>;
    advance(t: number, phase: SimPhase): void;
    reset(): void;
}

/**
 * A directed link from a source node to a specific input port (slot) of
 * a destination node.
 *
 * slot identifies which port at the destination this link feeds. Strings
 * name fixed ports ("force", "voltage", "feedback"); integers index
 * variadic ports (a Sum's 0,1,2,... inputs, a Concat's tensor list).
 * Cardinality (single vs variadic) is enforced by the destination's port
 * declaration, not by the link itself. To merge multiple sources onto a
 * single destination port, insert an explicit reduction node (Sum, Mean,
 * Max, ...) rather than overloading the slot.
 *
 * delayed signals the scheduler to read oini's previous-tick output
 * rather than the current one, breaking data dependency cycles in
 * closed-loop topologies (e.g. an FOC controller reading machine state
 * from t-1).
 */
export interface ISimLink extends IOlink, IEnableable {
    readonly slot: string | number;
    readonly delayed: boolean;
}

/**
 * A graph that is itself a sim node, enabling fractal composition. When a
 * parent calls advance(t, phase), the graph dispatches the call to its
 * children whose own phase declarations include phase. A subgraph may
 * declare a subset of its parent's phases (e.g. an ONNX subgraph that
 * only runs in Step).
 */
export interface ISimGraph<N extends ISimNode, L extends ISimLink> extends IGraph<N, L>, ISimNode {
    /**
     * Run one full tick: iterate self.phases in declaration order and
     * call advance(t, phase) for each. Convenience for the outermost
     * graph driver; nested subgraphs are driven phase-by-phase by their
     * parent via advance() and do not call tick() on themselves.
     */
    tick(t: number): void;
}

/**
 * Type guard for ISimNode.
 */
export function isSimNode<N extends ISimNode>(obj: unknown): obj is N {
    return (
        isNode(obj) &&
        isEnableable(obj) &&
        "phases" in obj &&
        Array.isArray((obj as ISimNode).phases) &&
        "advance" in obj &&
        typeof (obj as ISimNode).advance === "function" &&
        "reset" in obj &&
        typeof (obj as ISimNode).reset === "function"
    );
}

/**
 * Type guard for ISimLink.
 */
export function isSimLink<L extends ISimLink>(obj: unknown): obj is L {
    if (!isOlink(obj) || !isEnableable(obj)) {
        return false;
    }
    const slot = (obj as ISimLink).slot;
    return (
        "slot" in obj &&
        (typeof slot === "string" || typeof slot === "number") &&
        "delayed" in obj &&
        typeof (obj as ISimLink).delayed === "boolean"
    );
}

/**
 * Type guard for ISimGraph.
 */
export function isSimGraph<N extends ISimNode, L extends ISimLink>(obj: unknown): obj is ISimGraph<N, L> {
    return isGraph<N, L>(obj) && isSimNode<N>(obj) && "tick" in obj && typeof (obj as ISimGraph<N, L>).tick === "function";
}

// =====================================================================
// New execution-model extension: phase as a session-level context.
// These types live alongside the legacy ISimNode / SimGraph above and
// will eventually supersede them once the impls land.
// =====================================================================

/**
 * Sim-specific session: extends the generic ISession with the phase
 * currently being dispatched. The scheduler sets this once per phase
 * iteration before draining the ready-queue; nodes that implement
 * ISupportsPhasing read it to gate themselves.
 */
export interface ISimSession extends ISession {
    readonly currentPhase: SimPhase;
}

/**
 * Opt-in marker for nodes that gate themselves on the current phase.
 * Nodes not implementing this fire whenever their inputs are ready,
 * regardless of phase (pure KPN behaviour).
 *
 * The scheduler checks: if supportsPhasing(node) and
 * !node.phases.includes(session.currentPhase), skip the node this
 * phase even if its inputs are ready.
 */
export interface ISupportsPhasing {
    readonly phases: ReadonlyArray<SimPhase>;
}

/**
 * Type guard for ISupportsPhasing on a runtime node.
 */
export function supportsPhasing(n: IRuntimeNode): n is IRuntimeNode & ISupportsPhasing {
    return "phases" in n && Array.isArray((n as unknown as ISupportsPhasing).phases);
}
