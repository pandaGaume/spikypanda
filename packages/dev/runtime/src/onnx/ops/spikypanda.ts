import type { ITensor } from "../../compute/compute.interfaces";
import type { OnnxNodeInfo } from "../onnx-types";
import { OnnxOpNode, makeTensor, OnnxOpRegistry, PRIORITY_NATIVE } from "../registry";

const BACKEND = "spikypanda";

// ─── Activation functions (matching spikypanda-core ActivationFunctions) ────

function spRelu(x: number): number {
    return Math.max(0, x);
}
function spSigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
}
function spTanh(x: number): number {
    return Math.tanh(x);
}

function unaryMap(inp: ITensor, fn: (x: number) => number): ITensor {
    const out = new Float32Array(inp.data.length);
    for (let i = 0; i < inp.data.length; i++) out[i] = fn(inp.data[i]);
    return makeTensor(out, [...inp.shape]);
}

class SpGemmNode extends OnnxOpNode {
    private readonly alpha: number;
    private readonly beta: number;
    private readonly transA: boolean;
    private readonly transB: boolean;
    readonly outputShapes: number[][] = [];

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.alpha = this.attr("alpha", 1.0);
        this.beta = this.attr("beta", 1.0);
        this.transA = this.attrInt("transA", 0) !== 0;
        this.transB = this.attrInt("transB", 0) !== 0;
    }

    execute(inputs: ITensor[]): ITensor[] {
        const A = inputs[0],
            B = inputs[1];
        const C = inputs.length > 2 ? inputs[2] : null;
        const aR = A.shape[0] ?? 1,
            aC = A.shape.length >= 2 ? A.shape[1] : A.data.length;
        const bR = B.shape[0] ?? 1,
            bC = B.shape.length >= 2 ? B.shape[1] : B.data.length;
        const M = this.transA ? aC : aR;
        const K = this.transA ? aR : aC;
        const N = this.transB ? bR : bC;

        const out = new Float32Array(M * N);
        const aData = A.data,
            bData = B.data;

        // Optimized: loop tiling for cache locality on small matrices
        if (!this.transA && !this.transB) {
            for (let m = 0; m < M; m++) {
                const mK = m * K;
                const mN = m * N;
                for (let k = 0; k < K; k++) {
                    const a = this.alpha * aData[mK + k];
                    const kN = k * N;
                    for (let n = 0; n < N; n++) {
                        out[mN + n] += a * bData[kN + n];
                    }
                }
            }
        } else {
            for (let m = 0; m < M; m++) {
                for (let n = 0; n < N; n++) {
                    let sum = 0;
                    for (let k = 0; k < K; k++) {
                        const ai = this.transA ? k * M + m : m * K + k;
                        const bi = this.transB ? n * K + k : k * N + n;
                        sum += aData[ai] * bData[bi];
                    }
                    out[m * N + n] = this.alpha * sum;
                }
            }
        }

        if (C) {
            const cData = C.data;
            const cLen = cData.length;
            if (cLen === N) {
                // Bias is [1, N]: broadcast per row
                for (let m = 0; m < M; m++) {
                    const mN = m * N;
                    for (let n = 0; n < N; n++) {
                        out[mN + n] += this.beta * cData[n];
                    }
                }
            } else {
                for (let i = 0; i < out.length; i++) {
                    out[i] += this.beta * cData[i % cLen];
                }
            }
        }

        return [makeTensor(out, [M, N])];
    }
}

class SpLstmNode extends OnnxOpNode {
    private readonly hiddenSize: number;
    readonly outputShapes: number[][] = [];

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.hiddenSize = this.attrInt("hidden_size", 0);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const X = inputs[0];
        const W = inputs[1];
        const R = inputs[2];
        const B = inputs.length > 3 ? inputs[3] : null;

        const seqLen = X.shape[0];
        const inputSize = X.shape.length >= 3 ? X.shape[2] : X.shape[1];
        const H = this.hiddenSize || W.data.length / (4 * inputSize);

        let h = new Float32Array(H);
        let c = new Float32Array(H);
        const W4H = W.data,
            R4H = R.data;
        const biasW = B ? B.data : null;

        // Pre-allocate gate buffer
        const gates = new Float32Array(4 * H);

        for (let t = 0; t < seqLen; t++) {
            const xOff = t * inputSize;

            // Compute gates: W*x + R*h + bias
            gates.fill(0);
            for (let g = 0; g < 4 * H; g++) {
                let sum = 0;
                const gInput = g * inputSize;
                const gHidden = g * H;
                for (let i = 0; i < inputSize; i++) sum += W4H[gInput + i] * X.data[xOff + i];
                for (let j = 0; j < H; j++) sum += R4H[gHidden + j] * h[j];
                if (biasW) sum += biasW[g] + biasW[4 * H + g];
                gates[g] = sum;
            }

            // Apply gate functions (IOFC order)
            const newH = new Float32Array(H);
            const newC = new Float32Array(H);
            for (let j = 0; j < H; j++) {
                const i = spSigmoid(gates[j]);
                const o = spSigmoid(gates[H + j]);
                const f = spSigmoid(gates[2 * H + j]);
                const g = spTanh(gates[3 * H + j]);
                newC[j] = f * c[j] + i * g;
                newH[j] = o * spTanh(newC[j]);
            }
            h = newH;
            c = newC;
        }

        return [makeTensor(h, [1, 1, H])];
    }
}

class SpGruNode extends OnnxOpNode {
    private readonly hiddenSize: number;
    readonly outputShapes: number[][] = [];

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.hiddenSize = this.attrInt("hidden_size", 0);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const X = inputs[0];
        const W = inputs[1];
        const R = inputs[2];
        const B = inputs.length > 3 ? inputs[3] : null;

        const seqLen = X.shape[0];
        const inputSize = X.shape.length >= 3 ? X.shape[2] : X.shape[1];
        const H = this.hiddenSize || W.data.length / (3 * inputSize);

        let h = new Float32Array(H);
        const gates = new Float32Array(3 * H);

        for (let t = 0; t < seqLen; t++) {
            const xOff = t * inputSize;
            gates.fill(0);

            for (let g = 0; g < 3 * H; g++) {
                let sum = 0;
                for (let i = 0; i < inputSize; i++) sum += W.data[g * inputSize + i] * X.data[xOff + i];
                for (let j = 0; j < H; j++) sum += R.data[g * H + j] * h[j];
                if (B) sum += B.data[g] + B.data[3 * H + g];
                gates[g] = sum;
            }

            const newH = new Float32Array(H);
            for (let j = 0; j < H; j++) {
                const z = spSigmoid(gates[j]);
                const r = spSigmoid(gates[H + j]);
                const n = spTanh(gates[2 * H + j]);
                newH[j] = (1 - z) * n + z * h[j];
            }
            h = newH;
        }

        return [makeTensor(h, [1, 1, H])];
    }
}

class SpConvNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];

    execute(inputs: ITensor[]): ITensor[] {
        const X = inputs[0],
            W = inputs[1];
        const B = inputs.length > 2 ? inputs[2] : null;

        if (X.shape.length <= 2) {
            // Treat 2D as fully connected
            const features = X.shape.length === 2 ? X.shape[1] : X.data.length;
            const batch = X.shape[0] ?? 1;
            const outF = W.shape[0] ?? W.data.length;
            const wCols = W.data.length / outF;
            const out = new Float32Array(batch * outF);
            for (let n = 0; n < batch; n++) {
                for (let o = 0; o < outF; o++) {
                    let sum = 0;
                    const len = Math.min(wCols, features);
                    const nF = n * features,
                        oW = o * wCols;
                    for (let i = 0; i < len; i++) sum += X.data[nF + i] * W.data[oW + i];
                    if (B) sum += B.data[o % B.data.length];
                    out[n * outF + o] = sum;
                }
            }
            return [makeTensor(out, [batch, outF])];
        }

        // 3D: [N, C_in, L]
        const N = X.shape[0],
            C_in = X.shape[1],
            L = X.shape[2];
        const C_out = W.shape[0];
        const kL = W.shape.length >= 3 ? W.shape[2] : 1;
        const stride = this.attrInt("strides", 1);
        const pad = this.attrInt("pads", 0);
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
                                sum += X.data[n * C_in * L + ci * L + il] * W.data[co * C_in * kL + ci * kL + kk];
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

// ─── Registration ───────────────────────────────────────────────────────────

/**
 * Register SpikyPanda native implementations at PRIORITY_NATIVE.
 * These override the generic ONNX implementations for key ops.
 */
export function registerSpikyPandaOps(registry: OnnxOpRegistry): void {
    // Activations (using SpikyPanda's activation functions)
    registry.register(
        "Relu",
        (info) => {
            const n = new (class extends OnnxOpNode {
                readonly outputShapes: number[][] = [];
                execute(inputs: ITensor[]): ITensor[] {
                    return [unaryMap(inputs[0], spRelu)];
                }
            })(info);
            return n;
        },
        PRIORITY_NATIVE,
        BACKEND
    );

    registry.register(
        "Sigmoid",
        (info) => {
            const n = new (class extends OnnxOpNode {
                readonly outputShapes: number[][] = [];
                execute(inputs: ITensor[]): ITensor[] {
                    return [unaryMap(inputs[0], spSigmoid)];
                }
            })(info);
            return n;
        },
        PRIORITY_NATIVE,
        BACKEND
    );

    registry.register(
        "Tanh",
        (info) => {
            const n = new (class extends OnnxOpNode {
                readonly outputShapes: number[][] = [];
                execute(inputs: ITensor[]): ITensor[] {
                    return [unaryMap(inputs[0], spTanh)];
                }
            })(info);
            return n;
        },
        PRIORITY_NATIVE,
        BACKEND
    );

    // Matrix ops
    registry.register("Gemm", (info) => new SpGemmNode(info), PRIORITY_NATIVE, BACKEND);

    // Recurrent
    registry.register("LSTM", (info) => new SpLstmNode(info), PRIORITY_NATIVE, BACKEND);
    registry.register("GRU", (info) => new SpGruNode(info), PRIORITY_NATIVE, BACKEND);

    // Conv
    registry.register("Conv", (info) => new SpConvNode(info), PRIORITY_NATIVE, BACKEND);
}
