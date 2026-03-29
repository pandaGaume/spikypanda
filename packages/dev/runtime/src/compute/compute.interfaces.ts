// ═══════════════════════════════════════════════════════════════════════════
// Compute graph interfaces : ONNX-like configurable data flow pipeline
//
// Extends @spiky-panda/core's INode/IOlink/IGraph to build typed
// compute graphs where:
//   - Nodes are processing stages (IComputeNode)
//   - Edges carry typed data tensors (IDataLink)
//   - The graph executes in topological order
//
// Usage:
//   [LidarSource] ──► [Convolution] ──► [PerceptCortex] ──► [DecisionCortex]
//   [StereoCapture] ──► [MatchingCNN] ──► [Convolution] ──► [Percept] ──► [Decision]
// ═══════════════════════════════════════════════════════════════════════════

import { IGraph, INode, IOlink } from "spikypanda-core";

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
 * Extends IOlink (which provides `oini`/`ofin` node references)
 * with a `tensor` payload, analogous to how `ISynapse` extends `IOlink`
 * with a `weight` property.
 *
 * During graph execution:
 * 1. Source node executes -> writes its output to outgoing links' `tensor`
 * 2. Destination node reads from incoming links' `tensor` array
 */
export interface IDataLink extends IOlink {
    /** The tensor flowing through this edge. Null before first execution. */
    tensor: ITensor | null;
    /** Positional index of this link at the consumer node. -1 if unset. */
    inputIndex: number;
}

// ─── Compute node ────────────────────────────────────────────────────────────

/**
 * A processing stage in the compute graph.
 *
 * Each node implements `execute()` which reads input tensors from
 * incoming `IDataLink`s and produces output tensors written to
 * outgoing `IDataLink`s.
 *
 * Node types:
 * - **Source**: no inputs, produces data (e.g., LidarSourceNode reads a sensor)
 * - **Transform**: inputs -> outputs (e.g., ConvolutionNode, PerceptCortexNode)
 * - **Sink**: consumes data, no outputs (e.g., a logger)
 *
 * The graph engine calls `execute()` in topological order.
 */
export interface IComputeNode extends INode {
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
     * For **source nodes** (no incoming links): `inputs` is empty.
     * For **transform nodes**: `inputs` are the tensors from incoming `IDataLink`s,
     * in the same order as `opsc()` (predecessors).
     *
     * @param inputs  Input tensors from upstream nodes.
     * @returns       Output tensors to be written to outgoing `IDataLink`s.
     */
    execute(inputs: ITensor[]): ITensor[];

    /**
     * Optional async execution for nodes that require it (GPU, ONNX, Web Workers).
     *
     * When present, `runAsync()` will prefer this over `execute()`.
     * CPU-only nodes do not need to implement this.
     *
     * @param inputs  Input tensors from upstream nodes.
     * @returns       Promise resolving to output tensors.
     */
    executeAsync?(inputs: ITensor[]): Promise<ITensor[]>;
}

// ─── Compute graph ───────────────────────────────────────────────────────────

/**
 * A directed acyclic graph of compute nodes connected by data links.
 *
 * Extends `IGraph<IComputeNode, IDataLink>`, inheriting:
 * - `nodes` : all compute nodes
 * - `links` : all data links (edges with tensor payloads)
 * - `inputs` : source nodes (no predecessors)
 * - `outputs` : sink nodes (no successors)
 * - `hiddens` : intermediate nodes
 *
 * The graph provides a `run()` method that executes all nodes in
 * topological order, flowing tensors through the links.
 */
export interface IComputeGraph extends IGraph<IComputeNode, IDataLink> {
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
     * Uses `executeAsync()` on nodes that provide it, falls back to
     * `execute()` wrapped in Promise.resolve() for synchronous nodes.
     * Nodes are still executed in topological order (sequential await).
     *
     * @param externalInputs  Named tensors to inject into source nodes.
     * @returns                Promise resolving to named tensors from output nodes.
     */
    runAsync(externalInputs?: Map<string, ITensor>): Promise<Map<string, ITensor>>;
}

// ─── Compute node base bag ───────────────────────────────────────────────────

/**
 * Runtime execution context stored in a compute node's `bag` property.
 * Used to cache intermediate results between frames (zero-allocation
 * after the first execution).
 */
export interface IComputeNodeBag {
    /** Cached output tensors from the last execution. */
    lastOutputs?: ITensor[];
}
