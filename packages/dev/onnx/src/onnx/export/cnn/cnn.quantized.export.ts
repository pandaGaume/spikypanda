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
        case CnnLayerType.Input: return "Input";
        case CnnLayerType.Conv: return "Conv";
        case CnnLayerType.Pool: return "Pool";
        case CnnLayerType.Flatten: return "Flatten";
        case CnnLayerType.Dense: return "Dense";
        case CnnLayerType.Upsample: return "Upsample";
        case CnnLayerType.Reshape: return "Reshape";
        default: return `?${t}`;
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
    public static emit(
        qcnn: QuantizedCnnGraph,
        inputName: string,
        outputName: string,
        ctx: OnnxExportContext,
        scopeHint: string = "qcnn"
    ): void {
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
        let prev = quantInput;
        let prevParams = qcnn.inputParams;
        let prevDesc: QuantizedCnnLayer = layers[0];
        for (let i = 1; i < layers.length; i++) {
            const layer = layers[i];
            const isLast = i === layers.length - 1;
            // The final layer's output flows into DequantizeLinear,
            // so we still allocate an intermediate tensor for it.
            const out = ctx.allocateTensorName(`${scopeHint}_L${i}_${layerTypeName(layer.type)}`);
            const layerScope = `${scopeHint}_L${i}`;

            switch (layer.type) {
                case CnnLayerType.Conv:
                    QuantizedCnnGraphOnnxExporter._emitQLinearConv(prev, out, layer, prevParams, prevDesc, ctx, layerScope);
                    break;
                case CnnLayerType.Pool:
                    QuantizedCnnGraphOnnxExporter._emitPool(prev, out, layer, prevDesc, ctx);
                    break;
                case CnnLayerType.Flatten:
                    QuantizedCnnGraphOnnxExporter._emitFlatten(prev, out, ctx);
                    break;
                case CnnLayerType.Dense:
                    QuantizedCnnGraphOnnxExporter._emitQLinearMatMul(prev, out, layer, prevParams, prevDesc, ctx, layerScope);
                    break;
                default:
                    throw new Error(
                        `QuantizedCnnGraphOnnxExporter: layer type ${layerTypeName(layer.type)} not implemented for quantized export.`
                    );
            }

            if (isLast) {
                // ── 3. DequantizeLinear at the exit ────────────
                const outScaleName = `${layerScope}_y_scale_out`;
                const outZpName = `${layerScope}_y_zp_out`;
                QuantizedCnnGraphOnnxExporter._emitScaleAndZp(ctx, layer.outputParams, outScaleName, outZpName);
                ctx.makeNode({
                    opType: "DequantizeLinear",
                    inputs: [out, outScaleName, outZpName],
                    outputs: [outputName],
                    name: `${scopeHint}_dequantize_out`,
                });
            }

            prev = out;
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

        // QLinearConv with all 9 inputs.
        const activation = QuantizedCnnGraphOnnxExporter._activationOnnxName(layer.activation);
        const needsAct = activation !== null && activation !== "Identity";
        const convOut = needsAct ? ctx.allocateTensorName(`${scope}_conv_out`) : out;

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

        if (needsAct) {
            // ONNX Relu accepts int8 in opset 14+; CyanMycelium has
            // cm_relu_qs8_ansi to handle it natively.
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

    private static _emitPool(
        prev: string,
        out: string,
        layer: QuantizedCnnLayer,
        prevDesc: QuantizedCnnLayer,
        ctx: OnnxExportContext
    ): void {
        if (!layer.kernelSize || !layer.stride || layer.poolType === undefined) {
            throw new Error(`QuantizedCnnGraphOnnxExporter: Pool layer is missing metadata.`);
        }
        const [pH, pW] = layer.kernelSize;
        const [sH, sW] = layer.stride;
        const isAvg = layer.poolType === (PoolingType.Avg);
        const isGlobal = pH === prevDesc.height && pW === prevDesc.width
            && layer.width === 1 && layer.height === 1;

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
        const prevIsSpatial = prevDesc.type !== CnnLayerType.Flatten
            && prevDesc.type !== CnnLayerType.Dense;
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

        // QLinearMatMul: 8 inputs, no separate bias.
        const matmulOut = layer.bias.some((b) => b !== 0)
            ? ctx.allocateTensorName(`${scope}_matmul_out`)
            : ctx.allocateTensorName(`${scope}_matmul_no_act`);
        ctx.makeNode({
            opType: "QLinearMatMul",
            inputs: [matmulInput, xScaleName, xZpName, wName, wScaleName, wZpName, yScaleName, yZpName],
            outputs: [matmulOut],
            name: `${scope}_qlinear_matmul`,
        });

        // Add the bias separately as int8 add (when non-zero).
        // CyanMycelium handles int8 Add. We dequantize bias and
        // re-quantize against y_scale/y_zp.
        const yScale = layer.outputParams.scales[0];
        const yZp = layer.outputParams.zeroPoints[0];
        const biasInt8 = new Int8Array(layer.bias.length);
        for (let i = 0; i < layer.bias.length; i++) {
            const q = Math.round(layer.bias[i] / yScale) + yZp;
            biasInt8[i] = Math.max(-128, Math.min(127, q));
        }
        const biasName = `${scope}_B`;
        ctx.addInt8Initializer(biasName, [biasInt8.length], biasInt8);

        const activation = QuantizedCnnGraphOnnxExporter._activationOnnxName(layer.activation);
        const needsAct = activation !== null && activation !== "Identity";
        const addOut = needsAct ? ctx.allocateTensorName(`${scope}_add_out`) : out;

        ctx.makeNode({
            opType: "Add",
            inputs: [matmulOut, biasName],
            outputs: [addOut],
            name: `${scope}_bias_add`,
        });

        if (needsAct) {
            ctx.makeNode({
                opType: activation!,
                inputs: [addOut],
                outputs: [out],
                name: `${scope}_act`,
            });
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────

    /**
     * Emit per-tensor scale + zero_point as two scalar initializers
     * (float32 + int8). The same convention applies to graph-input,
     * weight, and graph-output params; per_channel weight scales are
     * emitted with their channel-length shape, not via this helper.
     */
    private static _emitScaleAndZp(
        ctx: OnnxExportContext,
        params: IQuantizationParams,
        scaleName: string,
        zpName: string
    ): void {
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
        throw new Error(
            `QuantizedCnnGraphOnnxExporter: unsupported activation (only linear / relu / sigmoid / tanh).`
        );
    }
}
