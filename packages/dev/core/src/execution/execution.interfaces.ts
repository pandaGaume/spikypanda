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
 *   isReady(session)        true when this node may fire in the current
 *                           session cycle. Default semantic: every
 *                           required input slot has its bound channel
 *                           marked ready in the session's linkStates.
 *
 *   fire(session, t)        consume inputs, produce outputs (read/write
 *                           session.linkStates of bound channels). The
 *                           scheduler does not transport data; the node
 *                           decides what to peek vs consume.
 *
 *   reset(session)          drop any per-node session state. Called
 *                           when the session is reset.
 *
 *   createNodeState()       optional factory: when present, the Session
 *                           constructor calls it to allocate the node's
 *                           entry in session.nodeStates. Used by nodes
 *                           that need more than the base INodeState
 *                           (e.g. a sub-graph stores its internal
 *                           Session in IGraphNodeState).
 *
 * A single IRuntimeNode instance is safely shared by N parallel
 * sessions; all mutable state lives in the session's nodeStates entry
 * for this node.
 */
export interface IRuntimeNode<B=unknown> extends INode<B>, IEnableable {
    isReady(session: ISession): boolean;
    fire(session: ISession, t: number): void;
    /**
     * Async variant of fire(). Nodes whose execution is genuinely
     * synchronous (most pure compute kernels) inherit the default
     * RuntimeNode implementation, which simply awaits fire(). Nodes
     * that wrap real async work (GPU, WebWorker, ONNX runtime) override
     * to await their async primitive instead. RuntimeGraph.runAsync
     * calls fireAsync uniformly without runtime introspection.
     */
    fireAsync(session: ISession, t: number): Promise<void>;
    reset(session: ISession): void;
    createNodeState?(): INodeState;
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
 * Autonomous-run contract. A graph that is IRunnable can drive itself
 * without the caller having to construct a Session explicitly: it lazily
 * allocates a default Session whose state persists across run() calls
 * (so delayed channels and counters survive between ticks). Callers that
 * need explicit Session control (concurrent inferences, custom state
 * lifecycle) pass their own Session via the optional second parameter,
 * in which case the default session is bypassed entirely.
 *
 * The default Session is an implementation detail and is intentionally
 * not part of this contract.
 */
export interface IRunnable {
    run(t: number, session?: ISession): void;
    runAsync(t: number, session?: ISession): Promise<void>;
}

/**
 * Runtime graph: an IGraph of IRuntimeNode + IChannel that is itself an
 * IRuntimeNode (composition fractale).
 *
 * Embedding: when this graph is wired as a node inside a parent graph,
 * the parent treats it like any other IRuntimeNode (channels target it
 * with a slot, isReady/fire follow the standard contract). The
 * inputBindings/outputBindings maps connect the external slot vocabulary
 * (used by parent channels) to internal channel indices, so fire(parent,
 * t) can route data across the boundary:
 *
 *   external slot of channel feeding this graph
 *     -> inputBindings.get(slot)                 (internal channel idx)
 *     -> internalSession.linkStates[idx]         (write payload)
 *
 *   external slot of channel leaving this graph
 *     -> outputBindings.get(slot)                (internal channel idx)
 *     -> internalSession.linkStates[idx]         (read payload)
 *
 * Top-level use (no parent embedding): bindings can be empty; the user
 * drives via `new Session(graph)` as usual.
 */
export interface IRuntimeGraph<N extends IRuntimeNode = IRuntimeNode, L extends IChannel = IChannel>
    extends IGraph<N, L>, IRuntimeNode, IRunnable {
    readonly mode: SchedulingMode;
    readonly inputBindings: ReadonlyMap<string | number, number>;
    readonly outputBindings: ReadonlyMap<string | number, number>;
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
 *
 * Extensible: nodes that need richer per-session state declare a
 * createNodeState() factory and return a subtype. A sub-graph node, for
 * example, stores its internal Session as IGraphNodeState.internalSession.
 */
export interface INodeState {
    linksReady: number;
}

/**
 * Per-node state for a graph that is embedded as a node in a parent.
 * The internalSession is the per-parent-session instance that drives
 * this sub-graph's internal scheduler. One parent session has its own
 * IGraphNodeState (and therefore its own internalSession) per embedded
 * graph node, so a single IRuntimeGraph instance can be shared across N
 * parents without collision.
 */
export interface IGraphNodeState extends INodeState {
    internalSession: ISession;
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
     * Inject a value into a channel from outside the graph. Equivalent
     * to publish() but named for clarity at the caller boundary
     * (feeding a model-input channel before a run).
     */
    setInput(channelIndex: number, value: unknown): void;

    /**
     * Read the current payload of a channel without consuming it.
     * Equivalent to peek() but named for clarity at the caller boundary
     * (reading a model-output channel after a run).
     */
    getOutput(channelIndex: number): unknown;

    /**
     * Node-side write API: set payload + ready=true on the channel.
     * When this transitions the channel from not-ready to ready and
     * the channel is enabled, the destination node's INodeState
     * .linksReady is bumped by 1. The ready-queue scheduler uses this
     * counter to dispatch downstream nodes without rescanning the
     * graph; nodes that mutate linkStates directly bypass that
     * accounting and must update counters themselves (not recommended).
     */
    publish(channelIndex: number, value: unknown): void;

    /**
     * Node-side read+clear API: returns the payload and clears the
     * channel (ready=false, payload=undefined). When the channel was
     * ready and is enabled, decrements the destination node's
     * INodeState.linksReady so it can re-arm on the next publish.
     */
    consume(channelIndex: number): unknown;

    /**
     * Node-side read API: returns the payload without clearing the
     * channel. Use for SNN-style integration where a node reads its
     * input but does not consume it (so the next tick still sees the
     * same value).
     */
    peek(channelIndex: number): unknown;

    /**
     * Number of enabled incoming channels (filtered to channels that
     * belong to this session's graph) for the given node. Cached at
     * session construction; treat as immutable per session. The
     * scheduler dispatches a node when its INodeState.linksReady
     * reaches this count.
     */
    requiredInputsOf(node: IRuntimeNode): number;

    /**
     * Lookup helper: per-node session state for a given node. Returns
     * undefined when the node is not part of this session's graph.
     * Used by nodes that need to read/write their own state without
     * tracking their index manually.
     */
    nodeStateOf(node: IRuntimeNode): INodeState | undefined;

    /**
     * Lookup helper: per-link session state for a given channel.
     * Returns undefined when the channel is not part of this session's
     * graph.
     */
    linkStateOf(channel: IOlink): ILinkState | undefined;

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

export function declaresPorts(n: IRuntimeNode): n is IRuntimeNode & IDeclaresPorts {
    const candidate = n as IRuntimeNode & Partial<IDeclaresPorts>;

    return (
        Array.isArray(candidate.inputPorts) &&
        Array.isArray(candidate.outputPorts)
    );
}
