// ═══════════════════════════════════════════════════════════════════════════
// ONNX export framework : contracts.
//
// A serializer maps one Kernel instance to a chunk of ONNX content
// (zero or more nodes + zero or more initializers). The exporter
// resolves tensor naming for the kernel's inputs and outputs and
// hands the names to the serializer via OnnxKernelNaming; the
// serializer pushes nodes/initializers into the OnnxExportContext.
// ═══════════════════════════════════════════════════════════════════════════

import type { IKernel } from "spikypanda-core";
import type { OnnxNodeInfo, OnnxTensorInfo } from "../onnx-types";

/**
 * Tensor names assigned to a kernel's inputs and outputs at export
 * time. `inputNames[i]` is the ONNX tensor name flowing into input
 * slot `i`; `outputNames[i]` is the name the serializer must produce
 * on output slot `i` (downstream kernels consume that name, or it is
 * exposed as a graph output for sink kernels).
 */
export interface OnnxKernelNaming {
    readonly inputNames: ReadonlyArray<string>;
    readonly outputNames: ReadonlyArray<string>;
}

/**
 * Spec for a synthesized ONNX node.
 *
 * Preferred path : pass a unified `attrs` map; the framework looks up
 * the op's schema (declared via `@onnxOp` decorators in
 * `onnx/export/schema/`) and classifies each attribute as int / float
 * / ints / floats automatically. This is the cleanest call site and
 * keeps the type information in ONE place per op (the schema
 * declaration) instead of scattered across every emitter.
 *
 * Escape hatch : the `intAttrs / floatAttrs / intsAttrs / floatsAttrs`
 * buckets stay supported for one-off ops that aren't in the schema
 * registry (or when a serializer wants to override the schema). When
 * both `attrs` and a bucket carry the same key, the bucket wins
 * (deliberate override).
 */
export interface OnnxNodeSpec {
    opType: string;
    inputs: ReadonlyArray<string>;
    outputs: ReadonlyArray<string>;
    name?: string;
    /** Unified attribute bag. Types resolved via the op's
     *  `@onnxOp`-decorated schema. */
    attrs?: Record<string, number | ReadonlyArray<number>>;
    intAttrs?: Record<string, number>;
    floatAttrs?: Record<string, number>;
    intsAttrs?: Record<string, ReadonlyArray<number>>;
    floatsAttrs?: Record<string, ReadonlyArray<number>>;
}

/**
 * Builder context handed to each kernel serializer. Insulates the
 * serializer from the OnnxParseResult assembly; offers naming +
 * adders for nodes and initializers.
 */
export interface OnnxExportContext {
    /**
     * Allocate a fresh, unique intermediate tensor name. The optional
     * `hint` is incorporated into the generated identifier for
     * readability ("magnitude" → "<kernel-id>_magnitude_42").
     */
    allocateTensorName(hint?: string): string;

    /** Append an ONNX op node to the export buffer. */
    addNode(node: OnnxNodeInfo): void;

    /** Append a tensor initializer (weights, biases, constants). */
    addInitializer(init: OnnxTensorInfo): void;

    /**
     * Convenience: create a float32 initializer from raw values.
     * The data is copied into a fresh buffer (the caller can reuse
     * its source array).
     */
    addFloatInitializer(name: string, dims: ReadonlyArray<number>, data: Float32Array | ReadonlyArray<number>): void;

    /**
     * Convenience: create an int64 initializer from raw values.
     * Stores into TensorProto.raw_data as little-endian int64.
     */
    addInt64Initializer(name: string, dims: ReadonlyArray<number>, data: ReadonlyArray<number>): void;

    /**
     * Convenience: create an int8 initializer from raw values.
     * Stores into TensorProto.raw_data; the int8 bytes are
     * reinterpreted as a Uint8Array (same memory, signed → unsigned
     * view) before packaging.
     */
    addInt8Initializer(name: string, dims: ReadonlyArray<number>, data: Int8Array): void;

    /**
     * Convenience: create an int32 initializer from raw values.
     * Used for QLinearConv's pre-scaled `B` (bias) input. Stores
     * into TensorProto.raw_data as little-endian int32.
     */
    addInt32Initializer(name: string, dims: ReadonlyArray<number>, data: Int32Array | ReadonlyArray<number>): void;

    /**
     * Convenience: build an OnnxNodeInfo from a typed spec and add
     * it. List attributes also seed the legacy scalar map with their
     * first value so consumers that only read scalars still work.
     */
    makeNode(spec: OnnxNodeSpec): void;
}

/**
 * Serializer signature. The function pushes ONNX content into `ctx`
 * such that, after the call returns, the tensors listed in
 * `naming.outputNames` carry the kernel's logical outputs computed
 * from the tensors in `naming.inputNames`.
 *
 * Serializers are stateless; per-export state lives in `ctx`.
 */
export type KernelOnnxSerializer<K extends IKernel = IKernel> = (
    kernel: K,
    naming: OnnxKernelNaming,
    ctx: OnnxExportContext
) => void;
