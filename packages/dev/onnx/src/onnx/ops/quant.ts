// ═══════════════════════════════════════════════════════════════════════════
// Quantized ONNX ops — TS-side fake-quant implementations for import.
//
// Per the framework's design (option D in the quantization discussion),
// the runtime layer stays FP32 : every ITensor carries `data:
// Float32Array`. Quantized ONNX models loaded via OnnxGraphBuilder
// therefore execute in "fake-quant" mode: the int8/uint8 initializers
// are read at construction time, the math runs in FP32 with the
// quantization parameters applied explicitly (dequantize-on-read,
// requantize-on-write), and intermediate ITensors carry float values
// that fall on the integer grid in (-128..127) or (0..255).
//
// This path is *not* for production performance — CyanMycelium /
// onnxruntime do that, on the real int8 buffers. It exists so we can
// validate quantized ONNX numerics end-to-end without leaving the
// TS test process.
//
// The optional `quantization` metadata on ITensor is set on every
// output so downstream consumers can inspect what the value range
// represents.
// ═══════════════════════════════════════════════════════════════════════════

import type { IQuantizationParams, ITensor } from "spikypanda-core";
import type { OnnxNodeInfo } from "../onnx-types";
import { OnnxOpNode, OnnxOpRegistry, getInitializerData, makeTensor } from "../registry";

// ─── Helpers ─────────────────────────────────────────────────────────────

function readScalar(t: ITensor | undefined): number {
    if (!t) return 0;
    return t.data.length > 0 ? t.data[0] : 0;
}

function readVector(t: ITensor | undefined): Float32Array {
    return t ? t.data : new Float32Array(0);
}

function paramsFor(scale: number | Float32Array, zeroPoint: number | Float32Array, axis?: number): IQuantizationParams {
    const scales = scale instanceof Float32Array ? scale : Float32Array.from([scale]);
    const zpArr = zeroPoint instanceof Float32Array
        ? Int32Array.from(zeroPoint)
        : Int32Array.from([zeroPoint as number]);
    return {
        scheme: scales.length > 1 ? "per_channel" : "per_tensor",
        dtype: "int8",
        scales,
        zeroPoints: zpArr,
        axis,
        symmetric: false,
    };
}

function roundHalfEven(x: number): number {
    if (!Number.isFinite(x)) return x;
    const floor = Math.floor(x);
    const diff = x - floor;
    if (diff < 0.5) return floor;
    if (diff > 0.5) return floor + 1;
    return floor % 2 === 0 ? floor : floor + 1;
}

function quantizeOne(real: number, scale: number, zp: number): number {
    if (scale <= 0 || !Number.isFinite(scale)) return zp;
    let q = roundHalfEven(real / scale) + zp;
    if (q < -128) return -128;
    if (q > 127) return 127;
    return q;
}

// ─── QuantizeLinear ──────────────────────────────────────────────────────

class QuantizeLinearNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];

    public constructor(info: OnnxNodeInfo) {
        super(info);
    }

    public execute(inputs: ITensor[]): ITensor[] {
        const x = inputs[0];
        const scaleT = inputs[1];
        const zpT = inputs.length > 2 ? inputs[2] : undefined;

        const scale = readScalar(scaleT);
        const zp = readScalar(zpT);

        const out = new Float32Array(x.data.length);
        for (let i = 0; i < x.data.length; i++) {
            out[i] = quantizeOne(x.data[i], scale, zp);
        }
        return [{
            data: out,
            shape: [...x.shape],
            name: x.name,
            quantization: paramsFor(scale, zp),
        }];
    }
}

// ─── DequantizeLinear ────────────────────────────────────────────────────

class DequantizeLinearNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];

    public execute(inputs: ITensor[]): ITensor[] {
        const x = inputs[0];
        const scaleT = inputs[1];
        const zpT = inputs.length > 2 ? inputs[2] : undefined;

        const scale = readScalar(scaleT);
        const zp = readScalar(zpT);

        const out = new Float32Array(x.data.length);
        for (let i = 0; i < x.data.length; i++) {
            out[i] = (x.data[i] - zp) * scale;
        }
        // No `quantization` metadata: this output IS the dequantized FP32.
        return [makeTensor(out, [...x.shape], x.name)];
    }
}

// ─── QLinearConv (2D NCHW) ───────────────────────────────────────────────

class QLinearConvNode extends OnnxOpNode {
    private readonly strides: number[];
    private readonly pads: number[];
    readonly outputShapes: number[][] = [];

    public constructor(info: OnnxNodeInfo) {
        super(info);
        const listAttrs = info.listAttributes;
        // kernel_shape is parsed for completeness but the kernel
        // dimensions are also encoded in the weight tensor shape
        // ([F, Cin, kH, kW]) which we read at execute() time.
        this.strides = listAttrs?.get("strides")?.slice() ?? [this.attrInt("strides", 1)];
        this.pads = listAttrs?.get("pads")?.slice() ?? [this.attrInt("pads", 0)];
    }

    public execute(inputs: ITensor[]): ITensor[] {
        // QLinearConv inputs:
        //   0: x (int8 stored as FP32 fake-quant)
        //   1: x_scale (scalar)
        //   2: x_zero_point (scalar)
        //   3: w (int8 OIHW stored as FP32)
        //   4: w_scale (per-channel float32 [F])
        //   5: w_zero_point (per-channel int8 [F])
        //   6: y_scale (scalar)
        //   7: y_zero_point (scalar)
        //   8 (optional): B (int32 [F], pre-scaled)
        const xT = inputs[0];
        const xScale = readScalar(inputs[1]);
        const xZp = readScalar(inputs[2]);
        const wT = inputs[3];
        const wScales = readVector(inputs[4]);
        const wZps = readVector(inputs[5]);
        const yScale = readScalar(inputs[6]);
        const yZp = readScalar(inputs[7]);
        const biasInt = inputs.length > 8 ? readVector(inputs[8]) : new Float32Array(0);

        // Shapes : x = [N, Cin, H, W], w = [F, Cin, kH, kW].
        const [N, Cin, Hi, Wi] = xT.shape;
        const [F, , kH, kW] = wT.shape;
        const [pH, pW] = this.pads.length >= 2 ? [this.pads[0], this.pads[1]] : [0, 0];
        const [sH, sW] = this.strides.length >= 2 ? [this.strides[0], this.strides[1]] : [this.strides[0], 1];

        const outH = Math.floor((Hi + 2 * pH - kH) / sH) + 1;
        const outW = Math.floor((Wi + 2 * pW - kW) / sW) + 1;
        const out = new Float32Array(N * F * outH * outW);

        for (let n = 0; n < N; n++) {
            for (let f = 0; f < F; f++) {
                const wScale = wScales[f] ?? wScales[0];
                const wZp = wZps[f] ?? wZps[0];
                const compoundScale = xScale * wScale;
                const fBias = biasInt[f] ?? 0;
                for (let oh = 0; oh < outH; oh++) {
                    for (let ow = 0; ow < outW; ow++) {
                        // int32 accumulator simulated in FP64 (exact for our small ranges).
                        let acc = 0;
                        for (let ci = 0; ci < Cin; ci++) {
                            for (let kr = 0; kr < kH; kr++) {
                                for (let kc = 0; kc < kW; kc++) {
                                    const ih = oh * sH - pH + kr;
                                    const iw = ow * sW - pW + kc;
                                    if (ih < 0 || ih >= Hi || iw < 0 || iw >= Wi) continue;
                                    const xi = ((n * Cin + ci) * Hi + ih) * Wi + iw;
                                    const wi = ((f * Cin + ci) * kH + kr) * kW + kc;
                                    acc += (xT.data[xi] - xZp) * (wT.data[wi] - wZp);
                                }
                            }
                        }
                        // bias_int is pre-scaled to (compoundScale) units, so it adds in the same domain as acc.
                        acc += fBias;
                        const yFp = acc * compoundScale;
                        const yi = ((n * F + f) * outH + oh) * outW + ow;
                        out[yi] = quantizeOne(yFp, yScale, yZp);
                    }
                }
            }
        }

        return [{
            data: out,
            shape: [N, F, outH, outW],
            quantization: paramsFor(yScale, yZp),
        }];
    }
}

// ─── QLinearMatMul (per-tensor, 2D) ──────────────────────────────────────

class QLinearMatMulNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];

    public execute(inputs: ITensor[]): ITensor[] {
        // 0: a (int8 [M, K])
        // 1: a_scale (scalar)
        // 2: a_zero_point (scalar)
        // 3: b (int8 [K, N])
        // 4: b_scale (scalar)
        // 5: b_zero_point (scalar)
        // 6: y_scale (scalar)
        // 7: y_zero_point (scalar)
        const aT = inputs[0];
        const aScale = readScalar(inputs[1]);
        const aZp = readScalar(inputs[2]);
        const bT = inputs[3];
        const bScale = readScalar(inputs[4]);
        const bZp = readScalar(inputs[5]);
        const yScale = readScalar(inputs[6]);
        const yZp = readScalar(inputs[7]);

        // Coerce both operands to 2D [M, K] and [K, N].
        const aShape = aT.shape.length === 2 ? aT.shape : [1, aT.data.length];
        const [M, K] = aShape;
        const bShape = bT.shape.length === 2 ? bT.shape : [K, bT.data.length / K];
        const [, Nout] = bShape;

        const compound = aScale * bScale;
        const out = new Float32Array(M * Nout);
        for (let m = 0; m < M; m++) {
            for (let n = 0; n < Nout; n++) {
                let acc = 0;
                for (let k = 0; k < K; k++) {
                    acc += (aT.data[m * K + k] - aZp) * (bT.data[k * Nout + n] - bZp);
                }
                const yFp = acc * compound;
                out[m * Nout + n] = quantizeOne(yFp, yScale, yZp);
            }
        }
        return [{
            data: out,
            shape: [M, Nout],
            quantization: paramsFor(yScale, yZp),
        }];
    }
}

// ─── Registration ───────────────────────────────────────────────────────

/** Avoid the TS unused-import warning while still allowing future use. */
export const _getInitializerData = getInitializerData;

export function registerQuantOps(registry: OnnxOpRegistry): void {
    registry.register("QuantizeLinear", (info) => new QuantizeLinearNode(info));
    registry.register("DequantizeLinear", (info) => new DequantizeLinearNode(info));
    registry.register("QLinearConv", (info) => new QLinearConvNode(info));
    registry.register("QLinearMatMul", (info) => new QLinearMatMulNode(info));
}
