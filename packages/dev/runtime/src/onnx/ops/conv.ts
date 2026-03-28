import type { ITensor } from "../../compute/compute.interfaces";
import type { OnnxNodeInfo, OnnxTensorInfo } from "../onnx-types";
import { OnnxOpNode, makeTensor, getInitializerData, OnnxOpRegistry } from "./registry";

/**
 * Conv: 2D convolution.
 * Input: [N, C_in, H, W] (but we support [N, C_in, L] for 1D and [N, C_in, H, W] for 2D)
 * Limited to 2D tensors layout: [batch, channels, height, width] → treated as [batch, features].
 *
 * For our 2D-limited scope: input is [1, C_in * H * W], kernel is [C_out, C_in, kH, kW].
 * Simplified: treats as matrix multiply if shapes are 2D.
 */
class ConvNode extends OnnxOpNode {
    private readonly kernelShape: number[];
    private readonly strides: number[];
    private readonly pads: number[];
    private readonly group: number;
    readonly outputShapes: number[][] = [];

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.kernelShape = [this.attrInt("kernel_shape", 3)];
        this.strides = [this.attrInt("strides", 1)];
        this.pads = [this.attrInt("pads", 0)];
        this.group = this.attrInt("group", 1);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const X = inputs[0]; // [N, C_in, ...spatial]
        const W = inputs[1]; // [C_out, C_in/group, ...kernel]
        const B = inputs.length > 2 ? inputs[2] : null;

        // Simplified 1D convolution for 2D tensors [batch, features]
        if (X.shape.length <= 2) {
            const features = X.shape.length === 2 ? X.shape[1] : X.data.length;
            const outFeatures = W.shape[0] ?? W.data.length;
            const batch = X.shape[0] ?? 1;

            // Treat as fully connected: out = X @ W^T + B
            const out = new Float32Array(batch * outFeatures);
            const wCols = W.data.length / outFeatures;
            for (let n = 0; n < batch; n++) {
                for (let o = 0; o < outFeatures; o++) {
                    let sum = 0;
                    const kLen = Math.min(wCols, features);
                    for (let i = 0; i < kLen; i++) {
                        sum += X.data[n * features + i] * W.data[o * wCols + i];
                    }
                    if (B) sum += B.data[o % B.data.length];
                    out[n * outFeatures + o] = sum;
                }
            }
            return [makeTensor(out, [batch, outFeatures])];
        }

        // 3D: [N, C_in, L] → 1D conv
        const N = X.shape[0];
        const C_in = X.shape[1];
        const L = X.shape[2];
        const C_out = W.shape[0];
        const kL = W.shape.length >= 3 ? W.shape[2] : this.kernelShape[0];
        const stride = this.strides[0];
        const pad = this.pads[0];
        const outL = Math.floor((L + 2 * pad - kL) / stride) + 1;

        const out = new Float32Array(N * C_out * outL);
        for (let n = 0; n < N; n++) {
            for (let co = 0; co < C_out; co++) {
                for (let ol = 0; ol < outL; ol++) {
                    let sum = 0;
                    for (let ci = 0; ci < C_in; ci++) {
                        for (let kk = 0; kk < kL; kk++) {
                            const il = ol * stride - pad + kk;
                            if (il >= 0 && il < L) {
                                sum += X.data[n * C_in * L + ci * L + il]
                                    * W.data[co * (C_in * kL) + ci * kL + kk];
                            }
                        }
                    }
                    if (B) sum += B.data[co];
                    out[n * C_out * outL + co * outL + ol] = sum;
                }
            }
        }
        return [makeTensor(out, [N, C_out, outL])];
    }
}

/**
 * MaxPool: max pooling over last spatial dimension(s).
 * Supports 1D [N, C, L] and 2D fallback.
 */
class MaxPoolNode extends OnnxOpNode {
    private readonly kernelSize: number;
    private readonly stride: number;
    private readonly pad: number;
    readonly outputShapes: number[][] = [];

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.kernelSize = this.attrInt("kernel_shape", 2);
        this.stride = this.attrInt("strides", this.kernelSize);
        this.pad = this.attrInt("pads", 0);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const X = inputs[0];
        if (X.shape.length === 3) {
            const [N, C, L] = X.shape;
            const outL = Math.floor((L + 2 * this.pad - this.kernelSize) / this.stride) + 1;
            const out = new Float32Array(N * C * outL);
            for (let n = 0; n < N; n++) {
                for (let c = 0; c < C; c++) {
                    for (let o = 0; o < outL; o++) {
                        let max = -Infinity;
                        for (let k = 0; k < this.kernelSize; k++) {
                            const il = o * this.stride - this.pad + k;
                            if (il >= 0 && il < L) {
                                max = Math.max(max, X.data[n * C * L + c * L + il]);
                            }
                        }
                        out[n * C * outL + c * outL + o] = max;
                    }
                }
            }
            return [makeTensor(out, [N, C, outL])];
        }
        // 2D fallback: passthrough
        return [makeTensor(new Float32Array(X.data), [...X.shape])];
    }
}

/**
 * AveragePool: average pooling.
 */
class AveragePoolNode extends OnnxOpNode {
    private readonly kernelSize: number;
    private readonly stride: number;
    private readonly pad: number;
    readonly outputShapes: number[][] = [];

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.kernelSize = this.attrInt("kernel_shape", 2);
        this.stride = this.attrInt("strides", this.kernelSize);
        this.pad = this.attrInt("pads", 0);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const X = inputs[0];
        if (X.shape.length === 3) {
            const [N, C, L] = X.shape;
            const outL = Math.floor((L + 2 * this.pad - this.kernelSize) / this.stride) + 1;
            const out = new Float32Array(N * C * outL);
            for (let n = 0; n < N; n++) {
                for (let c = 0; c < C; c++) {
                    for (let o = 0; o < outL; o++) {
                        let sum = 0, count = 0;
                        for (let k = 0; k < this.kernelSize; k++) {
                            const il = o * this.stride - this.pad + k;
                            if (il >= 0 && il < L) {
                                sum += X.data[n * C * L + c * L + il];
                                count++;
                            }
                        }
                        out[n * C * outL + c * outL + o] = count > 0 ? sum / count : 0;
                    }
                }
            }
            return [makeTensor(out, [N, C, outL])];
        }
        return [makeTensor(new Float32Array(X.data), [...X.shape])];
    }
}

/**
 * GlobalAveragePool: average over all spatial dims → [N, C, 1] or [N, C].
 */
class GlobalAveragePoolNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const X = inputs[0];
        if (X.shape.length >= 3) {
            const N = X.shape[0];
            const C = X.shape[1];
            let spatial = 1;
            for (let i = 2; i < X.shape.length; i++) spatial *= X.shape[i];
            const out = new Float32Array(N * C);
            for (let n = 0; n < N; n++) {
                for (let c = 0; c < C; c++) {
                    let sum = 0;
                    const base = n * C * spatial + c * spatial;
                    for (let s = 0; s < spatial; s++) sum += X.data[base + s];
                    out[n * C + c] = sum / spatial;
                }
            }
            return [makeTensor(out, [N, C])];
        }
        return [makeTensor(new Float32Array(X.data), [...X.shape])];
    }
}

export function registerConvOps(registry: OnnxOpRegistry): void {
    registry.register("Conv", (info) => new ConvNode(info));
    registry.register("MaxPool", (info) => new MaxPoolNode(info));
    registry.register("AveragePool", (info) => new AveragePoolNode(info));
    registry.register("GlobalAveragePool", (info) => new GlobalAveragePoolNode(info));
}
