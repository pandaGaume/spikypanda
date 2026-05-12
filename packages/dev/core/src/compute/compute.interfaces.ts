// ═══════════════════════════════════════════════════════════════════════════
// Compute graph interfaces : ONNX-like configurable data flow pipeline
//
// Specialisation of core/execution for tensor-flow graphs. IComputeNode
// extends IRuntimeNode with the kernel-style execute(inputs[]):outputs[]
// contract; IDataLink narrows IChannel<ITensor> to a numeric slot
// (matches ONNX positional input indexing). ComputeGraph defaults to
// static (Kahn) scheduling, which is the right mode for ONNX inference,
// MPC rollout, and any other DAG of pure compute kernels.
// ═══════════════════════════════════════════════════════════════════════════

import { IChannel, IRuntimeGraph, IRuntimeNode, ISession } from "../execution/execution.interfaces";

// ─── Tensor ──────────────────────────────────────────────────────────────────

/**
 * A typed multi-dimensional data container.
 *
 * The fundamental data unit flowing through compute graph edges.
 * Shape describes dimensions (e.g., [36] for a 1D sector grid,
 * [256, 192] for a 2D depth buffer, [9, 9, 2] for a stereo patch pair).
 */
export interface ITensor {
    /** Raw data. Float32 covers all our numeric use cases. */
    data: Float32Array;

    /**
     * Dimensions of the tensor.
     * - `[N]` : 1D vector (e.g., sector depths, MLP input/output)
     * - `[H, W]` : 2D grid (e.g., depth buffer, disparity map)
     * - `[H, W, C]` : 2D with channels (e.g., stereo pair: C=2)
     */
    shape: number[];

    /** Optional name for debugging and graph wiring (e.g., "lidar_sectors", "pose"). */
    name?: string;
}

// ─── Data link ───────────────────────────────────────────────────────────────

/**
 * A directed edge carrying a tensor between compute nodes.
 *
 * Narrows IChannel<ITensor> by constraining the slot to a number
 * (ONNX-style positional input index). The runtime ILinkState (in the
 * session) holds the actual payload at execution time; the link itself
 * is pure topology + routing metadata.
 */
export interface IDataLink extends IChannel<ITensor> {
    /** Positional index of this link at the consumer node. -1 if unset. */
    readonly slot: number;
}

// ─── Compute node ────────────────────────────────────────────────────────────

/**
 * Cached execution context stashed on a compute node's `bag` during
 * fire(). `lastOutputs` lets sink collectors retrieve the per-node
 * output set without re-reading channel state.
 */
export interface IComputeNodeBag {
    /** Cached output tensors from the last fire(). */
    lastOutputs?: ITensor[];
    /** Pre-injected external input tensor for source nodes (set by ComputeGraph.run before session.run). */
    pendingInput?: ITensor;
}

/**
 * A processing stage in the compute graph.
 *
 * Extends IRuntimeNode with the kernel-style execute(inputs[]):outputs[]
 * contract. ComputeNodeBase provides the fire(session, t) adapter that
 * gathers inputs from incoming channels (via session.consume), calls
 * execute(), and publishes outputs to outgoing channels (via session
 * .publish), so concrete ops stay agnostic of the session API.
 *
 * Node types:
 * - **Source**: no inputs, produces data (e.g., ExternalInputNode).
 *   Receives its tensor via bag.pendingInput before session.run.
 * - **Transform**: inputs -> outputs (e.g., ConvNode, MlpNode).
 *   Inputs are gathered from opsc() in slot-sorted order.
 * - **Sink**: terminal node whose lastOutputs are collected by run().
 */
export interface IComputeNode extends IRuntimeNode {
    /**
     * Human-readable node type for debugging (e.g., "lidar_source", "convolution").
     */
    readonly nodeType: string;

    /**
     * Expected shape of each output tensor.
     * Used by the graph builder to validate connectivity.
     * One shape per output (most nodes have a single output).
     */
    readonly outputShapes: number[][];

    /**
     * Execute this compute node synchronously.
     *
     * For **source nodes** (no incoming links): `inputs` is empty or
     * contains the pre-injected external tensor.
     * For **transform nodes**: `inputs` are the tensors from incoming
     * IDataLinks, ordered by their slot index.
     *
     * @param inputs  Input tensors from upstream nodes.
     * @returns       Output tensors to be written to outgoing IDataLinks.
     */
    execute(inputs: ITensor[]): ITensor[];

    /**
     * Optional async execution for nodes that require it (GPU, ONNX
     * runtime, Web Workers). ComputeGraph.runAsync prefers this over
     * execute(); CPU-only nodes do not need to implement it.
     */
    executeAsync?(inputs: ITensor[]): Promise<ITensor[]>;

    /**
     * Optional async fire adapter. ComputeNodeBase provides a default
     * implementation that mirrors fire() but awaits executeAsync().
     * Concrete nodes typically do not override.
     */
    fireAsync?(session: ISession, t: number): Promise<void>;
}

// ─── Compute graph ───────────────────────────────────────────────────────────

/**
 * A directed acyclic graph of compute nodes connected by data links.
 *
 * Extends IRuntimeGraph<IComputeNode, IDataLink>, picking up the
 * scheduler / session machinery from core/execution. ComputeGraph adds
 * the named-input/named-output API (Map<string, ITensor>) on top of the
 * generic ISession.run(t).
 */
export interface IComputeGraph extends IRuntimeGraph<IComputeNode, IDataLink> {
    /**
     * Execute the full graph synchronously.
     *
     * External inputs (sensor readings, pose, goal) are injected via
     * the `externalInputs` map, keyed by source node name or ID.
     *
     * @param externalInputs  Named tensors to inject into source nodes.
     * @returns                Named tensors from output (sink) nodes.
     */
    run(externalInputs?: Map<string, ITensor>): Map<string, ITensor>;

    /**
     * Execute the full graph asynchronously.
     *
     * Walks the topological order awaiting each node's fireAsync (which
     * routes to executeAsync when available, falls back to execute).
     *
     * @param externalInputs  Named tensors to inject into source nodes.
     * @returns                Promise resolving to named tensors from output nodes.
     */
    runAsync(externalInputs?: Map<string, ITensor>): Promise<Map<string, ITensor>>;
}
