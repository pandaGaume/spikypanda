// ═══════════════════════════════════════════════════════════════════════════
// ONNX serializers for the cardriver kernels.
//
// Registers serializers for `cardriver_norm`, `cardriver_normalize`
// and `cardriver_cnn_adapter` on a provided OnnxExportRegistry (or
// the module-level default). Each serializer emits the ONNX ops +
// initializers that compute the kernel's tensor transform.
//
// The serializers are independent: an export subgraph can include
// any subset of these three kernels depending on the firmware
// preprocessing the deployment expects.
// ═══════════════════════════════════════════════════════════════════════════

import {
    CnnGraphOnnxExporter,
    OnnxExportRegistry,
    onnxExportRegistry,
} from "spikypanda-onnx";

import { NormKernel } from "./kernels/norm.kernel";
import { NormalizeKernel } from "./kernels/normalize.kernel";
import { CnnAdapterKernel } from "./kernels/cnn.adapter.kernel";

/**
 * Register the three cardriver kernel serializers on the given
 * registry (defaults to the module-level `onnxExportRegistry`).
 * Idempotent: re-registration overwrites the previous entry for
 * each nodeType.
 */
export function registerCardriverOnnxSerializers(registry: OnnxExportRegistry = onnxExportRegistry): void {
    registry.register<NormKernel>("cardriver_norm", (_kernel, naming, ctx) => {
        const inp = naming.inputNames[0];
        const out = naming.outputNames[0];
        const mag = ctx.allocateTensorName("magnitude");
        // Input shape [T, 3]; reduce over the last axis (channel) gives
        // a [T, 1] magnitude column. Concatenate along the same axis
        // produces [T, 4].
        ctx.makeNode({
            opType: "ReduceL2",
            inputs: [inp],
            outputs: [mag],
            attrs: { axes: [-1], keepdims: 1 },
        });
        ctx.makeNode({
            opType: "Concat",
            inputs: [inp, mag],
            outputs: [out],
            attrs: { axis: -1 },
        });
    });

    registry.register<NormalizeKernel>("cardriver_normalize", (kernel, naming, ctx) => {
        const inp = naming.inputNames[0];
        const out = naming.outputNames[0];

        // Compute per-channel mean / std along the time axis (axis 0)
        // and produce (input - mean) / (std + eps).
        const mean = ctx.allocateTensorName("mean");
        const centered = ctx.allocateTensorName("centered");
        const squared = ctx.allocateTensorName("squared");
        const variance = ctx.allocateTensorName("variance");
        const std = ctx.allocateTensorName("std");
        const stdEps = ctx.allocateTensorName("std_eps");
        const epsName = ctx.allocateTensorName("eps");

        ctx.makeNode({
            opType: "ReduceMean",
            inputs: [inp],
            outputs: [mean],
            attrs: { axes: [0], keepdims: 1 },
        });
        ctx.makeNode({
            opType: "Sub",
            inputs: [inp, mean],
            outputs: [centered],
        });
        ctx.makeNode({
            opType: "Mul",
            inputs: [centered, centered],
            outputs: [squared],
        });
        ctx.makeNode({
            opType: "ReduceMean",
            inputs: [squared],
            outputs: [variance],
            attrs: { axes: [0], keepdims: 1 },
        });
        ctx.makeNode({
            opType: "Sqrt",
            inputs: [variance],
            outputs: [std],
        });

        // Scalar eps initializer (shape []) for numerical stability.
        ctx.addFloatInitializer(epsName, [], [kernel.eps]);
        ctx.makeNode({
            opType: "Add",
            inputs: [std, epsName],
            outputs: [stdEps],
        });
        ctx.makeNode({
            opType: "Div",
            inputs: [centered, stdEps],
            outputs: [out],
        });
    });

    registry.register<CnnAdapterKernel>("cardriver_cnn_adapter", (kernel, naming, ctx) => {
        const inp = naming.inputNames[0];   // [T, C]
        const out = naming.outputNames[0];  // [E] (E = outputSize)

        // 1. Re-layout (T, C) → NCHW (1, C, 1, T).
        //    Transpose perm=[1,0] gives (C, T); Reshape adds the
        //    batch + height singleton dims required by Conv.
        const transposed = ctx.allocateTensorName("CT");
        const nchw = ctx.allocateTensorName("nchw");
        const shape4dName = ctx.allocateTensorName("nchw_shape");

        ctx.makeNode({
            opType: "Transpose",
            inputs: [inp],
            outputs: [transposed],
            attrs: { perm: [1, 0] },
        });
        ctx.addInt64Initializer(shape4dName, [4], [1, kernel.channels, 1, kernel.windowSize]);
        ctx.makeNode({
            opType: "Reshape",
            inputs: [transposed, shape4dName],
            outputs: [nchw],
        });

        // 2. Delegate the CNN proper to CnnGraphOnnxExporter.
        const denseOut = ctx.allocateTensorName("dense_out");  // [1, E]
        CnnGraphOnnxExporter.emit(kernel.runtime.graph, nchw, denseOut, ctx, "cnn");

        // 3. Strip the batch dim: Squeeze axis 0 → [E].
        const sqAxesName = ctx.allocateTensorName("squeeze_axes");
        ctx.addInt64Initializer(sqAxesName, [1], [0]);
        ctx.makeNode({
            opType: "Squeeze",
            inputs: [denseOut, sqAxesName],
            outputs: [out],
        });
    });
}
