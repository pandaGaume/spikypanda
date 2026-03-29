import type { ITensor } from "../../compute/compute.interfaces";
import type { OnnxNodeInfo } from "../onnx-types";
import { OnnxOpNode, makeTensor, OnnxOpRegistry } from "../registry";

/**
 * BatchNormalization: Y = (X - mean) / sqrt(var + eps) * scale + bias
 * Inputs: X, scale, B, mean, var
 * For 2D [N, C]: normalize per channel.
 * For 3D [N, C, L]: normalize per channel across spatial.
 */
class BatchNormNode extends OnnxOpNode {
    private readonly eps: number;
    readonly outputShapes: number[][] = [];

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.eps = this.attr("epsilon", 1e-5);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const X = inputs[0];
        const scale = inputs[1];
        const bias = inputs[2];
        const mean = inputs[3];
        const variance = inputs[4];

        if (!scale || !bias || !mean || !variance) {
            return [makeTensor(new Float32Array(X.data), [...X.shape])];
        }

        const out = new Float32Array(X.data.length);
        const C = scale.data.length;

        if (X.shape.length === 2) {
            const N = X.shape[0];
            for (let n = 0; n < N; n++) {
                for (let c = 0; c < C; c++) {
                    const idx = n * C + c;
                    out[idx] = (X.data[idx] - mean.data[c]) / Math.sqrt(variance.data[c] + this.eps)
                        * scale.data[c] + bias.data[c];
                }
            }
        } else if (X.shape.length === 3) {
            const N = X.shape[0];
            const L = X.shape[2];
            for (let n = 0; n < N; n++) {
                for (let c = 0; c < C; c++) {
                    const invStd = 1 / Math.sqrt(variance.data[c] + this.eps);
                    for (let l = 0; l < L; l++) {
                        const idx = n * C * L + c * L + l;
                        out[idx] = (X.data[idx] - mean.data[c]) * invStd * scale.data[c] + bias.data[c];
                    }
                }
            }
        } else {
            out.set(X.data);
        }

        return [makeTensor(out, [...X.shape])];
    }
}

/**
 * LayerNormalization: normalize across the last axis.
 */
class LayerNormNode extends OnnxOpNode {
    private readonly eps: number;
    private readonly axis: number;
    readonly outputShapes: number[][] = [];

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.eps = this.attr("epsilon", 1e-5);
        this.axis = this.attrInt("axis", -1);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const X = inputs[0];
        const scale = inputs.length >= 2 ? inputs[1] : null;
        const bias = inputs.length >= 3 ? inputs[2] : null;

        const shape = X.shape;
        const rank = shape.length;
        const axis = this.axis < 0 ? rank + this.axis : this.axis;
        const outerSize = shape.slice(0, axis).reduce((a, b) => a * b, 1);
        const innerSize = shape.slice(axis).reduce((a, b) => a * b, 1);

        const out = new Float32Array(X.data.length);
        for (let i = 0; i < outerSize; i++) {
            const base = i * innerSize;
            let mean = 0;
            for (let j = 0; j < innerSize; j++) mean += X.data[base + j];
            mean /= innerSize;
            let variance = 0;
            for (let j = 0; j < innerSize; j++) {
                const d = X.data[base + j] - mean;
                variance += d * d;
            }
            variance /= innerSize;
            const invStd = 1 / Math.sqrt(variance + this.eps);
            for (let j = 0; j < innerSize; j++) {
                let val = (X.data[base + j] - mean) * invStd;
                if (scale) val *= scale.data[j % scale.data.length];
                if (bias) val += bias.data[j % bias.data.length];
                out[base + j] = val;
            }
        }

        return [makeTensor(out, [...shape])];
    }
}

/**
 * Dropout: passthrough during inference.
 */
class DropoutNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        // During inference, dropout is a no-op
        return [makeTensor(new Float32Array(inputs[0].data), [...inputs[0].shape])];
    }
}

export function registerNormOps(registry: OnnxOpRegistry): void {
    registry.register("BatchNormalization", (info) => new BatchNormNode(info));
    registry.register("LayerNormalization", (info) => new LayerNormNode(info));
    registry.register("InstanceNormalization", (info) => new BatchNormNode(info)); // same logic
    registry.register("Dropout", (info) => new DropoutNode(info));
}
