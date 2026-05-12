import { IEnableable, IGraph, INode, IOlink } from "../graph/graph.interfaces";

/**
 * Execution layer. Reuses the topology of core/graph (INode, IOlink,
 * IGraph) and adds only what the execution semantic requires: a per-
 * node contract (isReady/fire/reset), per-link routing metadata (slot,
 * delayed), and per-session state.
 *
 * Model: KPN/dataflow. Edges carry tokens; nodes fire when their
 * required inputs are ready; the scheduler dispatches per cycle.
 * Single-slot per channel in v1 (one unread token at most); FIFO/
 * multi-token deferred to the SNN milestone. Phase is sim-specific
 * (see core/sim/sim.interfaces); execution itself knows nothing of it.
 */

// =====================================================================
// Per-link runtime metadata
// =====================================================================

/**
 * Oriented link (inherits oini/ofin from IOlink) with execution
 * metadata. slot names the input port on the destination node; the
 * same slot string can appear on multiple links targeting one node
 * (variadic ports collapse into "multiple links sharing a slot").
 *
 * delayed channels are pre-seeded with initialValue at session reset,
 * so the target reads the initial token on its first cycle. Used to
 * break feedback cycles in DAG-topology graphs (FOC reading machine
 * state from t-1).
 */
export interface IChannel<T = unknown> extends IOlink, IEnableable {
    readonly slot: string | number;
    readonly delayed: boolean;
    readonly initialValue?: T;
}

// =====================================================================
// Node execution contract
// =====================================================================

/**
 * A graph node with an execution contract. Reuses INode for topology
 * (id, position, onsc(), opsc()) and adds the dataflow lifecycle:
 *
 *   isReady(session)   true when this node may fire in the current
 *                      session cycle. Default semantic: every required
 *                      input slot has its bound channel marked ready
 *                      in the session's linkStates.
 *
 *   fire(session, t)   consume inputs (read from session.linkStates of
 *                      bound channels), produce outputs (write into
 *                      session.linkStates of bound channels). The
 *                      scheduler does not transport data; the node
 *                      decides what to peek vs consume.
 *
 *   reset(session)     drop any per-node session state. Called when
 *                      the session is reset.
 *
 * A single IRuntimeNode instance is safely shared by N parallel
 * sessions; all mutable state lives in the session.
 */
export interface IRuntimeNode extends INode, IEnableable {
    isReady(session: ISession): boolean;
    fire(session: ISession, t: number): void;
    reset(session: ISession): void;
}

// =====================================================================
// Graph
// =====================================================================

/**
 * Execution mode for a runtime graph, declared explicitly at construction.
 *
 * Static: precomputed topological order over the non-delayed channel
 * subgraph, executed in one batched pass per cycle. Cheapest. Valid only
 * when (i) the non-delayed subgraph is acyclic, (ii) every active node
 * fires unconditionally each cycle.
 *
 * Dynamic: ready-queue dispatch. Per cycle, repeatedly select nodes
 * whose isReady() is true and fire them until quiescence. Handles cycles
 * (broken by delayed channels), threshold-driven nodes (SNN), external-
 * input pacing.
 *
 * The helper checkStaticEligible(graph) verifies the declared mode is
 * appropriate for the built graph.
 */
export type SchedulingMode = "static" | "dynamic";

/**
 * Runtime graph: an IGraph of IRuntimeNode + IChannel that is itself an
 * IRuntimeNode (composition fractale conservée). One IRuntimeGraph backs
 * many concurrent sessions.
 */
export interface IRuntimeGraph<N extends IRuntimeNode = IRuntimeNode, L extends IChannel = IChannel>
    extends IGraph<N, L>, IRuntimeNode {
    readonly mode: SchedulingMode;
}

// =====================================================================
// Per-session state
// =====================================================================

/**
 * Per-channel state in a session. Single-slot in v1: one unread payload
 * at most, ready bit set by the producer, cleared by the consumer.
 * Indexed by the channel's position in graph.links.
 */
export interface ILinkState<T = unknown> {
    ready: boolean;
    payload: T | undefined;
}

/**
 * Per-node state in a session. linksReady counts how many of the node's
 * required input channels are currently marked ready; the node is
 * dispatch-eligible when linksReady equals the count of required inputs.
 * Indexed by the node's position in graph.nodes.
 */
export interface INodeState {
    linksReady: number;
}

/**
 * Per-execution state container. Owns the link/node state arrays for
 * one inference/tick lineage, exposes the input/output entry points and
 * the drive API (run, reset). Sim extends with ISimSession (currentPhase);
 * other domains can extend with their own per-session fields without
 * touching this base.
 */
export interface ISession {
    readonly graph: IRuntimeGraph;
    readonly linkStates: ReadonlyArray<ILinkState>;
    readonly nodeStates: ReadonlyArray<INodeState>;

    /**
     * Inject a value into a channel from outside the graph. channelIndex
     * is the channel's position in graph.links. Typical use: feeding a
     * model-input channel before a run.
     */
    setInput(channelIndex: number, value: unknown): void;

    /**
     * Read the current payload of a channel. channelIndex is the
     * channel's position in graph.links. Typical use: reading a model-
     * output channel after a run.
     */
    getOutput(channelIndex: number): unknown;

    run(t: number): void;
    reset(): void;
}

// =====================================================================
// Analysis helpers
// =====================================================================

/**
 * Result of static-eligibility analysis. eligible=true means the graph
 * can be safely scheduled in "static" mode; reasons is empty.
 * eligible=false populates reasons with one entry per blocker (cycle
 * through non-delayed channels, node with conditional readiness, ...).
 */
export interface IStaticEligibility {
    readonly eligible: boolean;
    readonly reasons: ReadonlyArray<string>;
}

// =====================================================================
// Optional editor metadata
// =====================================================================

/**
 * Opt-in interface for nodes that want to declare their port schema
 * statically, independent of the channels currently wired to them.
 * Consumed by the editor (to render unconnected ports like Conv.B
 * before any link is attached) and by validators. The runtime itself
 * ignores this; ports at runtime are derived from onsc()/opsc().
 */
export interface IDeclaresPorts {
    readonly inputPorts: ReadonlyArray<IPortDescriptor>;
    readonly outputPorts: ReadonlyArray<IPortDescriptor>;
}

export interface IPortDescriptor {
    readonly slot: string | number;
    readonly optional: boolean;
    readonly type?: string;
    readonly multiplicity?: "single" | "variadic";
}

export function declaresPorts( n: IRuntimeNode ): n is IRuntimeNode & IDeclaresPorts {
    const candidate = n as IRuntimeNode & Partial<IDeclaresPorts>;

    return (
        Array.isArray(candidate.inputPorts) &&
        Array.isArray(candidate.outputPorts)
    );
}
