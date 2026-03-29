import type { ITensor } from "../../compute/compute.interfaces";
import type { OnnxNodeInfo } from "../onnx-types";
import { OnnxOpNode, makeTensor, OnnxOpRegistry } from "../registry";

function sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
}

/**
 * LSTM: Long Short-Term Memory.
 *
 * Inputs: X [seq_len, batch, input_size], W [num_dir, 4*hidden, input], R [num_dir, 4*hidden, hidden],
 *         B [num_dir, 8*hidden] (optional), sequence_lens, initial_hidden, initial_cell
 *
 * Simplified: single direction, batch=1, 2D input [seq_len, input_size].
 * Returns Y_h [1, 1, hidden_size] (last hidden state).
 */
class LSTMNode extends OnnxOpNode {
    private readonly hiddenSize: number;
    readonly outputShapes: number[][] = [];

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.hiddenSize = this.attrInt("hidden_size", 0);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const X = inputs[0]; // [seq_len, input_size] or [seq_len, batch, input_size]
        const W = inputs[1]; // [1, 4*H, input_size]
        const R = inputs[2]; // [1, 4*H, H]
        const B = inputs.length > 3 ? inputs[3] : null; // [1, 8*H]

        const seqLen = X.shape[0];
        const inputSize = X.shape.length >= 3 ? X.shape[2] : X.shape[1];
        const H = this.hiddenSize || W.data.length / (4 * inputSize);

        let h = new Float32Array(H);
        let c = new Float32Array(H);

        // Pre-extract W and R matrices (stored as [4*H, input] and [4*H, H])
        const W4H = W.data;
        const R4H = R.data;
        const biasW = B ? B.data : null;

        for (let t = 0; t < seqLen; t++) {
            const xOffset = t * inputSize;
            const gates = new Float32Array(4 * H);

            // gates = W @ x + R @ h + bias
            for (let g = 0; g < 4 * H; g++) {
                let sum = 0;
                for (let i = 0; i < inputSize; i++) {
                    sum += W4H[g * inputSize + i] * X.data[xOffset + i];
                }
                for (let j = 0; j < H; j++) {
                    sum += R4H[g * H + j] * h[j];
                }
                if (biasW) {
                    sum += biasW[g] + biasW[4 * H + g]; // W bias + R bias
                }
                gates[g] = sum;
            }

            // i=sigmoid, o=sigmoid, f=sigmoid, c'=tanh (IOFC order in ONNX)
            const newH = new Float32Array(H);
            const newC = new Float32Array(H);
            for (let j = 0; j < H; j++) {
                const i = sigmoid(gates[0 * H + j]);
                const o = sigmoid(gates[1 * H + j]);
                const f = sigmoid(gates[2 * H + j]);
                const g = Math.tanh(gates[3 * H + j]);
                newC[j] = f * c[j] + i * g;
                newH[j] = o * Math.tanh(newC[j]);
            }
            h = newH;
            c = newC;
        }

        // Return last hidden state [1, 1, H]
        return [makeTensor(h, [1, 1, H])];
    }
}

/**
 * GRU: Gated Recurrent Unit.
 *
 * Simplified: single direction, batch=1.
 * Returns Y_h [1, 1, hidden_size].
 */
class GRUNode extends OnnxOpNode {
    private readonly hiddenSize: number;
    readonly outputShapes: number[][] = [];

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.hiddenSize = this.attrInt("hidden_size", 0);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const X = inputs[0];
        const W = inputs[1]; // [1, 3*H, input_size]
        const R = inputs[2]; // [1, 3*H, H]
        const B = inputs.length > 3 ? inputs[3] : null;

        const seqLen = X.shape[0];
        const inputSize = X.shape.length >= 3 ? X.shape[2] : X.shape[1];
        const H = this.hiddenSize || W.data.length / (3 * inputSize);

        let h = new Float32Array(H);
        const W3H = W.data;
        const R3H = R.data;
        const biasW = B ? B.data : null;

        for (let t = 0; t < seqLen; t++) {
            const xOffset = t * inputSize;

            // Compute z and r gates: gate = sigmoid(W_gate @ x + R_gate @ h + bias)
            const zGate = new Float32Array(H);
            const rGate = new Float32Array(H);
            for (let j = 0; j < H; j++) {
                let zSum = 0;
                let rSum = 0;
                for (let i = 0; i < inputSize; i++) {
                    zSum += W3H[(0 * H + j) * inputSize + i] * X.data[xOffset + i];
                    rSum += W3H[(1 * H + j) * inputSize + i] * X.data[xOffset + i];
                }
                for (let k = 0; k < H; k++) {
                    zSum += R3H[(0 * H + j) * H + k] * h[k];
                    rSum += R3H[(1 * H + j) * H + k] * h[k];
                }
                if (biasW) {
                    zSum += biasW[0 * H + j] + biasW[3 * H + j];
                    rSum += biasW[1 * H + j] + biasW[4 * H + j];
                }
                zGate[j] = sigmoid(zSum);
                rGate[j] = sigmoid(rSum);
            }

            // Compute candidate with linear_before_reset=1 (ONNX default for most exporters):
            // n = tanh(Wn @ x + Wb_n + r * (Rn @ h + Rb_n))
            const newH = new Float32Array(H);
            for (let j = 0; j < H; j++) {
                let nSum = 0;
                for (let i = 0; i < inputSize; i++) {
                    nSum += W3H[(2 * H + j) * inputSize + i] * X.data[xOffset + i];
                }
                if (biasW) {
                    nSum += biasW[2 * H + j]; // W bias for candidate
                }
                let rh = 0;
                for (let k = 0; k < H; k++) {
                    rh += R3H[(2 * H + j) * H + k] * h[k];
                }
                if (biasW) {
                    rh += biasW[5 * H + j]; // R bias for candidate (inside reset)
                }
                nSum += rGate[j] * rh;
                const n = Math.tanh(nSum);
                newH[j] = (1 - zGate[j]) * n + zGate[j] * h[j];
            }
            h = newH;
        }

        return [makeTensor(h, [1, 1, H])];
    }
}

export function registerRecurrentOps(registry: OnnxOpRegistry): void {
    registry.register("LSTM", (info) => new LSTMNode(info));
    registry.register("GRU", (info) => new GRUNode(info));
}
