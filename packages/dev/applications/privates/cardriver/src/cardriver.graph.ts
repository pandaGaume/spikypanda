// ═══════════════════════════════════════════════════════════════════════════
// Driving Signature Encoder pipeline.
//
// Wires the cardriver nodes into a runtime graph:
//
//   AccelSource ─[3]─> NormKernel ─[4]─> WindowNode ─[30,4]─>
//   NormalizeKernel ─[30,4]─> CnnAdapterKernel ─[16]─> EmbeddingSink
//
// Source / Window / Sink are firmware-side RuntimeNodes (queueing,
// timing, external I/O). NormKernel / NormalizeKernel / CnnAdapterKernel
// + the wrapped CNN form the ONNX-exportable subset.
//
// The graph runs in "dynamic" mode because WindowNode only publishes
// once its buffer is full; downstream Kernels stay un-armed during the
// warm-up ticks.
// ═══════════════════════════════════════════════════════════════════════════

import {
    ActivationFunctions,
    Channel,
    CnnBuilder,
    CnnInferenceRuntime,
    IActivationFunction,
    PoolingType,
    RuntimeGraph,
    RuntimeGraphBuilder,
    RuntimeNode,
} from "spikypanda-core";

import { AccelSource } from "./nodes/accel.source";
import { WindowNode } from "./nodes/window.node";
import { EmbeddingSink } from "./nodes/embedding.sink";
import { NormKernel } from "./kernels/norm.kernel";
import { NormalizeKernel } from "./kernels/normalize.kernel";
import { CnnAdapterKernel } from "./kernels/cnn.adapter.kernel";

// ─── Pipeline constants ──────────────────────────────────────────────────────

/** Number of accelerometer samples per window (~3 s at 10 Hz). */
export const WINDOW_SIZE = 30;
/** Channels fed to the CNN: [ax, ay, az, |a|]. */
export const CHANNELS = 4;
/** Dimensionality of the driving signature embedding. */
export const EMBEDDING_SIZE = 16;

// ─── Builder options ─────────────────────────────────────────────────────────

export interface BuildDrivingSignaturePipelineOptions {
    /**
     * Pre-loaded fake samples for tests / offline replay. Each sample
     * must be a `[ax, ay, az]` triple when `withNorm` is true (the
     * default) or a `[ax, ay, az, |a|]` quad when `withNorm` is false
     * (firmware pre-computes the magnitude).
     */
    samples?: number[][];

    /**
     * Pre-built CNN inference runtime. When omitted, the builder
     * constructs a default topology (Conv1D x2 + GlobalAvgPool + Dense)
     * matching the (WINDOW_SIZE, CHANNELS) -> EMBEDDING_SIZE contract.
     */
    cnn?: CnnInferenceRuntime;

    /**
     * Main activation function for the default CNN. Ignored when a
     * pre-built `cnn` runtime is supplied. Defaults to ReLU.
     */
    activation?: IActivationFunction;

    /**
     * Include the NormKernel (raw 3-axis accel → 4-channel with
     * magnitude appended). When false, the firmware is expected to
     * supply 4-channel samples directly (preformatted) and the
     * NormKernel is bypassed. Default: true.
     */
    withNorm?: boolean;
}

// ─── Default CNN ─────────────────────────────────────────────────────────────

/**
 * Builds the default driving signature CNN: two Conv1D layers, a
 * GlobalAvgPool, and a linear dense embedding head. Total ~780 params.
 *
 * Input shape : (W=WINDOW_SIZE, H=1, C=CHANNELS)
 * Output      : EMBEDDING_SIZE-d vector
 */
function buildDefaultCnn(activation: IActivationFunction): CnnInferenceRuntime {
    const graph = new CnnBuilder()
        .withInputLayer(WINDOW_SIZE, 1, CHANNELS)
        .withConvLayer({ filters: 8, kernelSize: [1, 3], activation })
        .withConvLayer({ filters: 16, kernelSize: [1, 3], activation })
        .withPoolLayer({ type: PoolingType.Avg, size: [1, WINDOW_SIZE - 4] })
        .withDenseLayer({ units: EMBEDDING_SIZE, activation: ActivationFunctions.linear })
        .build();
    return new CnnInferenceRuntime(graph, activation);
}

// ─── Wired pipeline ──────────────────────────────────────────────────────────

/**
 * Concrete return type for buildDrivingSignaturePipeline(): exposes the
 * runtime graph plus the individual nodes so tests / firmware can poke
 * at internals (feed new samples, inspect the embedding sink, reset the
 * window, ...).
 */
export interface DrivingSignaturePipeline {
    readonly graph: RuntimeGraph<RuntimeNode, Channel>;
    readonly source: AccelSource;
    /** Present when withNorm is true (default); null when the firmware
     *  supplies 4-channel preformatted samples and the NormKernel is
     *  bypassed. */
    readonly normKernel: NormKernel | null;
    readonly window: WindowNode;
    readonly normalizeKernel: NormalizeKernel;
    readonly cnnAdapter: CnnAdapterKernel;
    readonly sink: EmbeddingSink;
}

/**
 * Constructs the wired graph. Returns the RuntimeGraph plus references
 * to every node so the caller can drive (feed samples) and inspect
 * (read embeddings) without hunting through graph.nodes.
 */
export function buildDrivingSignaturePipeline(
    opts: BuildDrivingSignaturePipelineOptions = {}
): DrivingSignaturePipeline {
    const samples = opts.samples ?? [];
    const activation = opts.activation ?? ActivationFunctions.relu;
    const cnnRuntime = opts.cnn ?? buildDefaultCnn(activation);
    const withNorm = opts.withNorm ?? true;

    const source = new AccelSource(samples);
    const normKernel = withNorm ? new NormKernel() : null;
    const window = new WindowNode(WINDOW_SIZE, CHANNELS);
    const normalizeKernel = new NormalizeKernel(WINDOW_SIZE, CHANNELS);
    const cnnAdapter = new CnnAdapterKernel({
        runtime: cnnRuntime,
        windowSize: WINDOW_SIZE,
        channels: CHANNELS,
        outputSize: EMBEDDING_SIZE,
    });
    const sink = new EmbeddingSink();

    // Pipeline chain: source → [normKernel] → window → normalize → cnn → sink.
    // When withNorm is false, the source emits 4-channel samples directly.
    const chain: RuntimeNode[] = normKernel
        ? [source, normKernel, window, normalizeKernel, cnnAdapter, sink]
        : [source, window, normalizeKernel, cnnAdapter, sink];

    const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>()
        .withMode("dynamic")
        .withNodes(...chain)
        .withLinks(...chain)
        .build();

    return { graph, source, normKernel, window, normalizeKernel, cnnAdapter, sink };
}
