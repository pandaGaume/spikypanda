// ═══════════════════════════════════════════════════════════════════════════
// QuantizedCnnGraphOnnxExporter
//
// Emits an int8-quantized CNN as ONNX. Reads a QuantizedCnnGraph
// (FP32 CnnGraph + per-channel/per-tensor weight scales + activation
// params from calibration) and produces the QLinear* op sequence
// CyanMycelium accepts:
//
//   inputName (FP32)
//     ─► QuantizeLinear           FP32 → int8
//     ─► QLinearConv + Relu       int8 → int8
//     ─► (more Conv layers)
//     ─► AveragePool / MaxPool    int8 → int8 (standard pool, polymorphic)
//     ─► Flatten                  int8 → int8 (polymorphic)
//     ─► QLinearMatMul            int8 → int8
//     ─► DequantizeLinear         int8 → FP32
//   outputName (FP32)
//
// All scales, zero_points and weights are emitted as initializers
// (int8 / int32 / float32 bytes via the OnnxExportContext helpers).
// No new TS type is introduced: int8-ness lives entirely in the
// initializer payload + the ONNX dataType field.
// ═══════════════════════════════════════════════════════════════════════════

import {
    ActivationFunctions,
    CnnLayerType,
    type IActivationFunction,
    type IQuantizationParams,
    PoolingType,
    type QuantizedCnnGraph,
    type QuantizedCnnLayer,
} from "spikypanda-core";

function layerTypeName(t: CnnLayerType): string {
    switch (t) {
        case CnnLayerType.Input:
            return "Input";
        case CnnLayerType.Conv:
            return "Conv";
        case CnnLayerType.Pool:
            return "Pool";
        case CnnLayerType.Flatten:
            return "Flatten";
        case CnnLayerType.Dense:
            return "Dense";
        case CnnLayerType.Upsample:
            return "Upsample";
        case CnnLayerType.Reshape:
            return "Reshape";
        default:
            return `?${t}`;
    }
}

import type { OnnxExportContext } from "../export.types";

export class QuantizedCnnGraphOnnxExporter {
    /**
     * Emit a QLinear-flavoured ONNX representation of `qcnn` into
     * `ctx`. The caller supplies FP32 input/output tensor names;
     * the exporter inserts QuantizeLinear at the entry and
     * DequantizeLinear at the exit so the public boundary stays
     * FP32-friendly.
     */
    public static emit(qcnn: QuantizedCnnGraph, inputName: string, outputName: string, ctx: OnnxExportContext, scopeHint: string = "qcnn"): void {
        const layers = qcnn.layers;
        if (layers.length < 2) {
            throw new Error("QuantizedCnnGraphOnnxExporter: CNN has no actual layers (Input only).");
        }
        if (layers[0].type !== CnnLayerType.Input) {
            throw new Error("QuantizedCnnGraphOnnxExporter: first layer must be Input.");
        }

        // ── 1. QuantizeLinear at the entry ──────────────────────
        const inputScaleName = `${scopeHint}_x_scale`;
        const inputZpName = `${scopeHint}_x_zp`;
        QuantizedCnnGraphOnnxExporter._emitScaleAndZp(ctx, qcnn.inputParams, inputScaleName, inputZpName);

        const quantInput = ctx.allocateTensorName(`${scopeHint}_quant_in`);
        ctx.makeNode({
            opType: "QuantizeLinear",
            inputs: [inputName, inputScaleName, inputZpName],
            outputs: [quantInput],
            name: `${scopeHint}_quantize_in`,
        });

        // ── 2. Walk the quantized layers ────────────────────────
        //
        // Each layer emitter writes its output into a unique intermediate
        // tensor (`layerOut`). For all layers except a terminal Dense,
        // that output is INT8 (lives in the int8 stream). A terminal Dense
        // emits its own dequantize-then-add-bias sequence and produces
        // an FP32 tensor directly; we then route that tensor straight to
        // `outputName` and skip the trailing DequantizeLinear.
        //
        // The reason for the Dense special case : standard ONNX `Add`
        // doesn't accept int8 operands (ORT rejects the model), so we
        // can't add an int8 bias to the int8 QLinearMatMul output. The
        // canonical fix is to dequantize first and add in FP32. Since
        // the dequantize step is exactly what the graph's exit op would
        // have done anyway, we fuse them by letting Dense write into the
        // graph output.
        let prev = quantInput;
        let prevParams = qcnn.inputParams;
        let prevDesc: QuantizedCnnLayer = layers[0];
        for (let i = 1; i < layers.length; i++) {
            const layer = layers[i];
            const isLast = i === layers.length - 1;
            const layerScope = `${scopeHint}_L${i}`;
            // If this is a terminal Dense, write straight to `outputName`
            // (the dense path emits its own dequant + bias-add). Otherwise
            // allocate a fresh intermediate tensor.
            const denseTerminal = isLast && layer.type === CnnLayerType.Dense;
            const layerOut = denseTerminal ? outputName : ctx.allocateTensorName(`${scopeHint}_L${i}_${layerTypeName(layer.type)}`);

            switch (layer.type) {
                case CnnLayerType.Conv:
                    QuantizedCnnGraphOnnxExporter._emitQLinearConv(prev, layerOut, layer, prevParams, prevDesc, ctx, layerScope);
                    break;
                case CnnLayerType.Pool:
                    QuantizedCnnGraphOnnxExporter._emitPool(prev, layerOut, layer, prevDesc, ctx);
                    break;
                case CnnLayerType.Flatten:
                    QuantizedCnnGraphOnnxExporter._emitFlatten(prev, layerOut, ctx);
                    break;
                case CnnLayerType.Dense:
                    QuantizedCnnGraphOnnxExporter._emitQLinearMatMul(prev, layerOut, layer, prevParams, prevDesc, ctx, layerScope);
                    break;
                default:
                    throw new Error(`QuantizedCnnGraphOnnxExporter: layer type ${layerTypeName(layer.type)} not implemented for quantized export.`);
            }

            if (isLast && !denseTerminal) {
                // ── 3. DequantizeLinear at the exit ────────────
                // Reached only when the terminal layer's output is int8
                // (Conv / Pool / Flatten — Dense already produces FP32).
                const outScaleName = `${layerScope}_y_scale_out`;
                const outZpName = `${layerScope}_y_zp_out`;
                QuantizedCnnGraphOnnxExporter._emitScaleAndZp(ctx, layer.outputParams, outScaleName, outZpName);
                ctx.makeNode({
                    opType: "DequantizeLinear",
                    inputs: [layerOut, outScaleName, outZpName],
                    outputs: [outputName],
                    name: `${scopeHint}_dequantize_out`,
                });
            }

            prev = layerOut;
            prevParams = layer.outputParams;
            prevDesc = layer;
        }
    }

    // ── Conv ──────────────────────────────────────────────────────────

    private static _emitQLinearConv(
        prev: string,
        out: string,
        layer: QuantizedCnnLayer,
        inputParams: IQuantizationParams,
        prevDesc: QuantizedCnnLayer,
        ctx: OnnxExportContext,
        scope: string
    ): void {
        if (!layer.weights || !layer.bias) {
            throw new Error(`QuantizedCnnGraphOnnxExporter: Conv layer is missing weights or bias.`);
        }
        if (!layer.kernelSize || !layer.stride || !layer.padding) {
            throw new Error(`QuantizedCnnGraphOnnxExporter: Conv layer is missing spatial metadata.`);
        }

        const [kH, kW] = layer.kernelSize;
        const [sH, sW] = layer.stride;
        const [padH, padW] = layer.padding;

        // Weight initializer: int8 OIHW.
        const wName = `${scope}_W`;
        ctx.addInt8Initializer(wName, layer.weights.shape, layer.weights.data as Int8Array);

        // Weight scale: float32[F] (per-channel).
        const wScaleName = `${scope}_W_scale`;
        ctx.addFloatInitializer(wScaleName, [layer.weights.scales.length], layer.weights.scales);

        // Weight zero_point: int8[F] (symmetric → all zero, but we
        // emit explicit zeros because ONNX QLinearConv expects the
        // input).
        const wZpName = `${scope}_W_zp`;
        const wZp = new Int8Array(layer.weights.zeroPoints.length);
        for (let i = 0; i < layer.weights.zeroPoints.length; i++) wZp[i] = layer.weights.zeroPoints[i];
        ctx.addInt8Initializer(wZpName, [wZp.length], wZp);

        // Input scale/zp (per-tensor scalars, reused from upstream).
        const xScaleName = `${scope}_x_scale`;
        const xZpName = `${scope}_x_zp`;
        QuantizedCnnGraphOnnxExporter._emitScaleAndZp(ctx, inputParams, xScaleName, xZpName);

        // Output scale/zp (per-tensor scalars).
        const yScaleName = `${scope}_y_scale`;
        const yZpName = `${scope}_y_zp`;
        QuantizedCnnGraphOnnxExporter._emitScaleAndZp(ctx, layer.outputParams, yScaleName, yZpName);

        // Bias: int32[F] pre-scaled = round(bias_fp32 / (input_scale * weight_scales[f])).
        const biasInt32 = new Int32Array(layer.bias.length);
        const inputScale = inputParams.scales[0];
        for (let f = 0; f < layer.bias.length; f++) {
            const compoundScale = inputScale * layer.weights.scales[f];
            biasInt32[f] = compoundScale > 0 ? Math.round(layer.bias[f] / compoundScale) : 0;
        }
        const biasName = `${scope}_B`;
        ctx.addInt32Initializer(biasName, [biasInt32.length], biasInt32);

        // Activation fusion. When the layer's activation is Relu, the
        // post-Relu calibration of y_scale/y_zp already bakes the Relu
        // into QLinearConv: negative pre-activation values saturate to
        // y_zp = -128 (which represents real 0), so the int8 output IS
        // the Relu output. Emitting a separate Relu node afterward would
        // re-Relu the *int* representation (treating -128 as a number to
        // clip), which mangles the values. We therefore skip the explicit
        // Relu when fused. Sigmoid / Tanh aren't saturation-equivalent
        // and would need dequant → apply → requant; not supported yet.
        const activation = QuantizedCnnGraphOnnxExporter._activationOnnxName(layer.activation);
        const isReluFused = activation === "Relu";
        const needsSeparateAct = activation !== null && activation !== "Identity" && !isReluFused;
        if (activation && activation !== "Identity" && activation !== "Relu") {
            throw new Error(
                `QuantizedCnnGraphOnnxExporter: activation "${activation}" on a Conv layer is not yet ` +
                    `supported in quantized export (only linear / Relu are saturation-fusible).`
            );
        }
        const convOut = needsSeparateAct ? ctx.allocateTensorName(`${scope}_conv_out`) : out;

        ctx.makeNode({
            opType: "QLinearConv",
            inputs: [prev, xScaleName, xZpName, wName, wScaleName, wZpName, yScaleName, yZpName, biasName],
            outputs: [convOut],
            name: `${scope}_qlinear_conv`,
            attrs: {
                kernel_shape: [kH, kW],
                strides: [sH, sW],
                pads: [padH, padW, padH, padW],
            },
        });

        // Reserved for future non-fusible activations (currently
        // unreachable because we throw above).
        if (needsSeparateAct) {
            ctx.makeNode({
                opType: activation!,
                inputs: [convOut],
                outputs: [out],
                name: `${scope}_act`,
            });
        }

        void prevDesc;
    }

    // ── Pool ──────────────────────────────────────────────────────────

    private static _emitPool(prev: string, out: string, layer: QuantizedCnnLayer, prevDesc: QuantizedCnnLayer, ctx: OnnxExportContext): void {
        if (!layer.kernelSize || !layer.stride || layer.poolType === undefined) {
            throw new Error(`QuantizedCnnGraphOnnxExporter: Pool layer is missing metadata.`);
        }
        const [pH, pW] = layer.kernelSize;
        const [sH, sW] = layer.stride;
        const isAvg = layer.poolType === PoolingType.Avg;
        const isGlobal = pH === prevDesc.height && pW === prevDesc.width && layer.width === 1 && layer.height === 1;

        if (isGlobal) {
            ctx.makeNode({
                opType: isAvg ? "GlobalAveragePool" : "GlobalMaxPool",
                inputs: [prev],
                outputs: [out],
            });
            return;
        }

        ctx.makeNode({
            opType: isAvg ? "AveragePool" : "MaxPool",
            inputs: [prev],
            outputs: [out],
            attrs: {
                kernel_shape: [pH, pW],
                strides: [sH, sW],
            },
        });
    }

    // ── Flatten ──────────────────────────────────────────────────────

    private static _emitFlatten(prev: string, out: string, ctx: OnnxExportContext): void {
        ctx.makeNode({
            opType: "Flatten",
            inputs: [prev],
            outputs: [out],
            attrs: { axis: 1 },
        });
    }

    // ── Dense (QLinearMatMul) ────────────────────────────────────────

    private static _emitQLinearMatMul(
        prev: string,
        out: string,
        layer: QuantizedCnnLayer,
        inputParams: IQuantizationParams,
        prevDesc: QuantizedCnnLayer,
        ctx: OnnxExportContext,
        scope: string
    ): void {
        if (!layer.weights || !layer.bias) {
            throw new Error(`QuantizedCnnGraphOnnxExporter: Dense layer is missing weights or bias.`);
        }
        // Auto-Flatten when the previous layer is spatial (Conv / Pool / etc.).
        const prevIsSpatial = prevDesc.type !== CnnLayerType.Flatten && prevDesc.type !== CnnLayerType.Dense;
        let matmulInput = prev;
        if (prevIsSpatial) {
            const flat = ctx.allocateTensorName(`${scope}_flat`);
            ctx.makeNode({
                opType: "Flatten",
                inputs: [prev],
                outputs: [flat],
                attrs: { axis: 1 },
                name: `${scope}_implicit_flatten`,
            });
            matmulInput = flat;
        }

        // QLinearMatMul expects per-tensor scales for both operands.
        // Weight is stored as [units, prev_size] but QLinearMatMul
        // operates as a × b with no transpose attribute; we therefore
        // transpose the weight at export time to [prev_size, units]
        // (an offline relayout, no runtime cost).
        const [units, prevSize] = layer.weights.shape;
        const wTransposed = new Int8Array(units * prevSize);
        const wSrc = layer.weights.data as Int8Array;
        for (let u = 0; u < units; u++) {
            for (let j = 0; j < prevSize; j++) {
                wTransposed[j * units + u] = wSrc[u * prevSize + j];
            }
        }

        const wName = `${scope}_W`;
        ctx.addInt8Initializer(wName, [prevSize, units], wTransposed);

        const wScaleName = `${scope}_W_scale`;
        ctx.addFloatInitializer(wScaleName, [1], layer.weights.scales);
        const wZpName = `${scope}_W_zp`;
        const wZp = new Int8Array(layer.weights.zeroPoints.length);
        for (let i = 0; i < layer.weights.zeroPoints.length; i++) wZp[i] = layer.weights.zeroPoints[i];
        ctx.addInt8Initializer(wZpName, [wZp.length], wZp);

        const xScaleName = `${scope}_x_scale`;
        const xZpName = `${scope}_x_zp`;
        QuantizedCnnGraphOnnxExporter._emitScaleAndZp(ctx, inputParams, xScaleName, xZpName);

        const yScaleName = `${scope}_y_scale`;
        const yZpName = `${scope}_y_zp`;
        QuantizedCnnGraphOnnxExporter._emitScaleAndZp(ctx, layer.outputParams, yScaleName, yZpName);

        // Same fusion logic as Conv : Relu is baked into the matmul's
        // post-Relu y_scale/y_zp calibration via the zero-point saturation
        // trick. Re-applying Relu on the int8 representation would mangle
        // the values; sigmoid/tanh need a separate dequant→apply→requant
        // path that we don't implement yet.
        const activation = QuantizedCnnGraphOnnxExporter._activationOnnxName(layer.activation);
        if (activation && activation !== "Identity" && activation !== "Relu") {
            throw new Error(
                `QuantizedCnnGraphOnnxExporter: activation "${activation}" on a Dense layer is not yet ` +
                    `supported in quantized export (only linear / Relu are saturation-fusible).`
            );
        }

        // Pattern : QLinearMatMul → DequantizeLinear → Add(fp32 bias).
        //
        // Standard ONNX `Add` does not accept int8 operands (ORT rejects
        // such graphs as invalid), so we cannot add an int8 bias directly
        // to the matmul's int8 output. The canonical fix is to dequantize
        // the matmul result first, then add the bias in FP32. This also
        // happens to fuse with the graph-exit dequantize when Dense is
        // the terminal layer : the caller routes our FP32 output straight
        // to the graph output, skipping the trailing DequantizeLinear.
        const matmulOut = ctx.allocateTensorName(`${scope}_matmul_int`);
        ctx.makeNode({
            opType: "QLinearMatMul",
            inputs: [matmulInput, xScaleName, xZpName, wName, wScaleName, wZpName, yScaleName, yZpName],
            outputs: [matmulOut],
            name: `${scope}_qlinear_matmul`,
        });

        const dequantOut = ctx.allocateTensorName(`${scope}_matmul_fp32`);
        ctx.makeNode({
            opType: "DequantizeLinear",
            inputs: [matmulOut, yScaleName, yZpName],
            outputs: [dequantOut],
            name: `${scope}_matmul_dequant`,
        });

        const biasFp32 = Float32Array.from(layer.bias);
        const biasName = `${scope}_B`;
        ctx.addFloatInitializer(biasName, [biasFp32.length], biasFp32);

        ctx.makeNode({
            opType: "Add",
            inputs: [dequantOut, biasName],
            outputs: [out],
            name: `${scope}_bias_add`,
        });
    }

    // ── Helpers ───────────────────────────────────────────────────────

    /**
     * Emit per-tensor scale + zero_point as two scalar initializers
     * (float32 + int8). The same convention applies to graph-input,
     * weight, and graph-output params; per_channel weight scales are
     * emitted with their channel-length shape, not via this helper.
     */
    private static _emitScaleAndZp(ctx: OnnxExportContext, params: IQuantizationParams, scaleName: string, zpName: string): void {
        ctx.addFloatInitializer(scaleName, [], Float32Array.from([params.scales[0]]));
        const zp = new Int8Array(1);
        zp[0] = params.zeroPoints[0];
        ctx.addInt8Initializer(zpName, [], zp);
    }

    private static _activationOnnxName(fn: IActivationFunction | undefined): string | null {
        if (!fn) return null;
        if (fn === ActivationFunctions.linear) return "Identity";
        if (fn === ActivationFunctions.relu) return "Relu";
        if (fn === ActivationFunctions.sigmoid) return "Sigmoid";
        if (fn === ActivationFunctions.tanh) return "Tanh";
        throw new Error(`QuantizedCnnGraphOnnxExporter: unsupported activation (only linear / relu / sigmoid / tanh).`);
    }
}
