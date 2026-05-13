// ═══════════════════════════════════════════════════════════════════════════
// CnnGraphOnnxExporter
//
// Converts an ICnnGraph (built via CnnBuilder) into a sequence of
// ONNX ops + initializers, writing them into an OnnxExportContext.
// Walks the graph's `layerDescriptors` and emits one (or a couple
// of) ONNX node(s) per layer in order. The CNN's native layout
// (channel-major neurons) maps directly to ONNX NCHW; no internal
// transpose is needed.
//
// Input contract: the caller supplies `inputName` as an NCHW tensor
// `[N, C_in, H_in, W_in]`. The output is named `outputName` and
// matches the shape of the final layer (Dense → `[N, units]`, Pool
// → `[N, C, H, W]`, etc.). Anything reshaping (T,C → NCHW) is the
// caller's responsibility (typically the wrapping CnnAdapterKernel
// serializer in Phase 3).
//
// Supported layer types: Input (skipped), Conv, Pool, Flatten, Dense.
// Reshape and Upsample throw "not implemented" — added later if a
// client demands them.
// ═══════════════════════════════════════════════════════════════════════════

import {
    ActivationFunctions,
    CnnLayerType,
    IActivationFunction,
    ICnnGraph,
    ICnnLayerDescriptor,
    ICnnNeuron,
    ICnnSynapse,
    IConvKernel,
    PoolingType,
} from "spikypanda-core";

import type { OnnxExportContext } from "../export.types";

export class CnnGraphOnnxExporter {
    /**
     * Emit ONNX content into `ctx` that maps `inputName` to
     * `outputName` for the given CNN. The first descriptor (Input)
     * is metadata only; emission starts at descriptor[1].
     */
    public static emit(
        cnn: ICnnGraph,
        inputName: string,
        outputName: string,
        ctx: OnnxExportContext,
        scopeHint: string = "cnn"
    ): void {
        const descs = cnn.layerDescriptors;
        if (descs.length < 2) {
            throw new Error("CnnGraphOnnxExporter: CNN has no actual layers (only Input).");
        }
        if (descs[0].type !== CnnLayerType.Input) {
            throw new Error("CnnGraphOnnxExporter: first layer descriptor must be Input.");
        }

        let prev = inputName;
        let prevDesc = descs[0];

        for (let i = 1; i < descs.length; i++) {
            const desc = descs[i];
            const isLast = i === descs.length - 1;
            const out = isLast ? outputName : ctx.allocateTensorName(`L${i}_${CnnGraphOnnxExporter._typeName(desc.type)}`);
            const layerScope = `${scopeHint}_L${i}`;

            switch (desc.type) {
                case CnnLayerType.Conv:
                    CnnGraphOnnxExporter._emitConv(prev, out, desc, prevDesc, ctx, layerScope);
                    break;
                case CnnLayerType.Pool:
                    CnnGraphOnnxExporter._emitPool(prev, out, desc, prevDesc, ctx);
                    break;
                case CnnLayerType.Flatten:
                    CnnGraphOnnxExporter._emitFlatten(prev, out, ctx);
                    break;
                case CnnLayerType.Dense:
                    CnnGraphOnnxExporter._emitDense(prev, out, desc, prevDesc, ctx, layerScope);
                    break;
                case CnnLayerType.Upsample:
                case CnnLayerType.Reshape:
                    throw new Error(`CnnGraphOnnxExporter: layer type ${CnnGraphOnnxExporter._typeName(desc.type)} not implemented yet.`);
                default:
                    throw new Error(`CnnGraphOnnxExporter: unknown layer type ${desc.type}`);
            }

            prev = out;
            prevDesc = desc;
        }
    }

    // ── Conv ──────────────────────────────────────────────────────────

    private static _emitConv(
        prev: string,
        out: string,
        desc: ICnnLayerDescriptor,
        prevDesc: ICnnLayerDescriptor,
        ctx: OnnxExportContext,
        scope: string
    ): void {
        if (!desc.convKernels || !desc.kernelSize || !desc.stride || !desc.padding) {
            throw new Error(`CnnGraphOnnxExporter: Conv layer missing builder metadata (convKernels/kernelSize/stride/padding).`);
        }
        const [kH, kW] = desc.kernelSize;
        const [sH, sW] = desc.stride;
        const [padH, padW] = desc.padding;
        const filters = desc.convKernels.length;
        const cIn = prevDesc.channels;

        // Pack W in NCHW order [F, C_in, kH, kW]:
        //   W[f, ic, kr, kc] = kernels[f].weights[ic*kH*kW + kr*kW + kc]
        const wSize = filters * cIn * kH * kW;
        const W = new Float32Array(wSize);
        const B = new Float32Array(filters);
        for (let f = 0; f < filters; f++) {
            const k = desc.convKernels[f];
            const ks = k.weights;
            for (let ic = 0; ic < cIn; ic++) {
                for (let kr = 0; kr < kH; kr++) {
                    for (let kc = 0; kc < kW; kc++) {
                        const srcIdx = ic * kH * kW + kr * kW + kc;
                        const dstIdx = ((f * cIn + ic) * kH + kr) * kW + kc;
                        W[dstIdx] = ks[srcIdx];
                    }
                }
            }
            B[f] = k.bias;
        }

        const wName = `${scope}_W`;
        const bName = `${scope}_B`;
        ctx.addFloatInitializer(wName, [filters, cIn, kH, kW], W);
        ctx.addFloatInitializer(bName, [filters], B);

        const activation = CnnGraphOnnxExporter._layerActivation(desc);
        const needsActivation = activation !== null && activation !== "Identity";
        const convOut = needsActivation ? ctx.allocateTensorName(`${scope}_conv_out`) : out;

        ctx.makeNode({
            opType: "Conv",
            inputs: [prev, wName, bName],
            outputs: [convOut],
            name: `${scope}_conv`,
            attrs: {
                kernel_shape: [kH, kW],
                strides: [sH, sW],
                pads: [padH, padW, padH, padW],
            },
        });

        if (needsActivation) {
            ctx.makeNode({
                opType: activation!,
                inputs: [convOut],
                outputs: [out],
                name: `${scope}_act`,
            });
        }
    }

    // ── Pool ──────────────────────────────────────────────────────────

    private static _emitPool(
        prev: string,
        out: string,
        desc: ICnnLayerDescriptor,
        prevDesc: ICnnLayerDescriptor,
        ctx: OnnxExportContext
    ): void {
        if (!desc.kernelSize || !desc.stride || desc.poolType === undefined) {
            throw new Error(`CnnGraphOnnxExporter: Pool layer missing builder metadata (kernelSize/stride/poolType).`);
        }
        const [pH, pW] = desc.kernelSize;
        const [sH, sW] = desc.stride;
        const isAvg = desc.poolType === PoolingType.Avg;

        // Promote to Global*Pool when the kernel covers the full
        // feature map (and the output is therefore 1x1).
        const isGlobal = pH === prevDesc.height && pW === prevDesc.width
            && desc.width === 1 && desc.height === 1;

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

    // ── Flatten ───────────────────────────────────────────────────────

    private static _emitFlatten(prev: string, out: string, ctx: OnnxExportContext): void {
        ctx.makeNode({
            opType: "Flatten",
            inputs: [prev],
            outputs: [out],
            attrs: { axis: 1 },
        });
    }

    // ── Dense ─────────────────────────────────────────────────────────

    private static _emitDense(
        prev: string,
        out: string,
        desc: ICnnLayerDescriptor,
        prevDesc: ICnnLayerDescriptor,
        ctx: OnnxExportContext,
        scope: string
    ): void {
        const units = desc.neurons.length;
        const prevSize = prevDesc.neurons.length;
        if (units === 0 || prevSize === 0) {
            throw new Error(`CnnGraphOnnxExporter: Dense layer with zero units or zero prev_size.`);
        }

        // In SpikyPanda's CNN runtime, Dense connects to every neuron of
        // the previous layer regardless of its spatial shape (synapse-
        // level dot product). ONNX Gemm needs a flat [N, prev_size]
        // input though, so when the previous layer is spatial (Conv,
        // Pool, Upsample, Reshape) we emit an implicit Flatten before
        // the Gemm. If a Flatten layer is already declared explicitly,
        // its output is already flat and we skip the implicit step.
        const prevIsSpatial = prevDesc.type === CnnLayerType.Conv
            || prevDesc.type === CnnLayerType.Pool
            || prevDesc.type === CnnLayerType.Upsample
            || prevDesc.type === CnnLayerType.Reshape
            || prevDesc.type === CnnLayerType.Input;
        let gemmInput = prev;
        if (prevIsSpatial) {
            const flat = ctx.allocateTensorName(`${scope}_flat`);
            ctx.makeNode({
                opType: "Flatten",
                inputs: [prev],
                outputs: [flat],
                attrs: { axis: 1 },
                name: `${scope}_implicit_flatten`,
            });
            gemmInput = flat;
        }

        // Pack W as [units, prev_size] then use Gemm with transB=1.
        // For each dense neuron i, walk its incoming synapses (opsc)
        // and place the weight at the column matching the source
        // neuron's index in prev.
        const W = new Float32Array(units * prevSize);
        const B = new Float32Array(units);
        const prevIdx = new Map<ICnnNeuron, number>();
        prevDesc.neurons.forEach((n, k) => prevIdx.set(n, k));

        for (let i = 0; i < units; i++) {
            const neuron = desc.neurons[i];
            B[i] = neuron.bias;
            const incoming = neuron.opsc<ICnnSynapse>();
            for (const syn of incoming) {
                const src = syn.oini as ICnnNeuron | null;
                if (!src) continue;
                const j = prevIdx.get(src);
                if (j === undefined) {
                    throw new Error(`CnnGraphOnnxExporter: Dense synapse source not in previous layer.`);
                }
                W[i * prevSize + j] = syn.weight;
            }
        }

        const wName = `${scope}_W`;
        const bName = `${scope}_B`;
        ctx.addFloatInitializer(wName, [units, prevSize], W);
        ctx.addFloatInitializer(bName, [units], B);

        const activation = CnnGraphOnnxExporter._layerActivation(desc);
        const needsActivation = activation !== null && activation !== "Identity";
        const gemmOut = needsActivation ? ctx.allocateTensorName(`${scope}_gemm_out`) : out;

        // Gemm: Y = alpha * (A) * (B^T) + beta * C  when transB=1.
        // A = prev shape [N, prev_size], B = W shape [units, prev_size],
        // transB makes the multiplication land as [N, units].
        // C = bias shape [units], broadcast.
        ctx.makeNode({
            opType: "Gemm",
            inputs: [gemmInput, wName, bName],
            outputs: [gemmOut],
            name: `${scope}_gemm`,
            attrs: { alpha: 1.0, beta: 1.0, transA: 0, transB: 1 },
        });

        if (needsActivation) {
            ctx.makeNode({
                opType: activation!,
                inputs: [gemmOut],
                outputs: [out],
                name: `${scope}_act`,
            });
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────

    /**
     * Resolve the per-layer activation function (all neurons in a
     * layer share the same fn by CnnBuilder construction). Returns
     * the ONNX op name, or null when no activation is needed (or
     * `"Identity"` for the linear/identity case).
     */
    private static _layerActivation(desc: ICnnLayerDescriptor): string | null {
        const fn = desc.neurons[0]?.activationFn as IActivationFunction | undefined;
        if (!fn) return null;
        if (fn === ActivationFunctions.linear) return "Identity";
        if (fn === ActivationFunctions.relu) return "Relu";
        if (fn === ActivationFunctions.sigmoid) return "Sigmoid";
        if (fn === ActivationFunctions.tanh) return "Tanh";
        throw new Error(`CnnGraphOnnxExporter: unsupported activation function (only linear/relu/sigmoid/tanh).`);
    }

    private static _typeName(t: CnnLayerType): string {
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

    /**
     * Mark IConvKernel parameter as used (TS6133 guard in strict mode
     * when this method might be replaced by an external dispatcher).
     */
    public static _unused(_k: IConvKernel): void {
        /* no-op */
    }
}
