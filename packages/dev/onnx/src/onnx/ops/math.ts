import { normalizeAxis, binaryTensor } from "./tensor-utils";
import type { ITensor } from "spikypanda-core";
import type { OnnxNodeInfo } from "../onnx-types";
import { OnnxOpNode, makeTensor, OnnxOpRegistry } from "../registry";

// ─── Ops ────────────────────────────────────────────────────────────────────

class MulNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [binaryTensor(inputs[0], inputs[1], (a, b) => a * b)];
    }
}

class SubNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [binaryTensor(inputs[0], inputs[1], (a, b) => a - b)];
    }
}

class AddNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [binaryTensor(inputs[0], inputs[1], (a, b) => a + b)];
    }
}

class AtanNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const a = inputs[0];
        const out = new Float32Array(a.data.length);
        for (let i = 0; i < a.data.length; i++) out[i] = Math.atan(a.data[i]);
        return [makeTensor(out, [...a.shape])];
    }
}

/**
 * Gemm: Y = alpha * A @ B + beta * C
 * A is [M, K], B is [K, N], C is broadcastable to [M, N].
 */
/**
 * Gemm: alpha * (A @ B) + beta * C, with optional transposes.
 * Loop-tiled for cache locality on the common non-transposed path;
 * falls back to a generic indexed kernel when either operand is
 * transposed.
 */
class GemmNode extends OnnxOpNode {
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
        const A = inputs[0];
        const B = inputs[1];
        const C = inputs.length > 2 ? inputs[2] : null;
        const aR = A.shape[0] ?? 1;
        const aC = A.shape.length >= 2 ? A.shape[1] : A.data.length;
        const bR = B.shape[0] ?? 1;
        const bC = B.shape.length >= 2 ? B.shape[1] : B.data.length;
        const M = this.transA ? aC : aR;
        const K = this.transA ? aR : aC;
        const N = this.transB ? bR : bC;

        const out = new Float32Array(M * N);
        const aData = A.data,
            bData = B.data;

        if (!this.transA && !this.transB) {
            // Hot path: outer-i × inner-k × innermost-n with reused row.
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
                for (let m = 0; m < M; m++) {
                    const mN = m * N;
                    for (let n = 0; n < N; n++) out[mN + n] += this.beta * cData[n];
                }
            } else {
                for (let i = 0; i < out.length; i++) out[i] += this.beta * cData[i % cLen];
            }
        }

        return [makeTensor(out, [M, N])];
    }
}

/**
 * Concat along axis (supports axis 0 and 1 for 2D tensors).
 */
class ConcatNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const axis = normalizeAxis(this.attrInt("axis", 0), inputs[0].shape.length);
        const shape = [...inputs[0].shape];
        shape[axis] = 0;
        for (const inp of inputs) {
            if (inp.shape.length !== shape.length || inp.shape.some((d, i) => i !== axis && d !== shape[i])) throw new Error("Concat dimensions differ");
            shape[axis] += inp.shape[axis];
        }
        const inner = shape.slice(axis + 1).reduce((a, b) => a * b, 1),
            outer = shape.slice(0, axis).reduce((a, b) => a * b, 1);
        const out = new Float32Array(shape.reduce((a, b) => a * b, 1));
        let offset = 0;
        for (let o = 0; o < outer; o++)
            for (const inp of inputs) {
                const width = inp.shape[axis] * inner;
                out.set(inp.data.subarray(o * width, (o + 1) * width), offset);
                offset += width;
            }
        return [makeTensor(out, shape)];
    }
}

/**
 * Slice: multidimensional slicing with explicit steps.
 * ONNX opset ≥10 uses tensor inputs for starts/ends/axes/steps.
 * Opset <10 uses attributes.
 * We support both: try tensor inputs first, fall back to attributes.
 */
class SliceNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const x = inputs[0],
            rank = x.shape.length;
        const starts = inputs[1] ? Array.from(inputs[1].data) : this.attrInts("starts");
        const ends = inputs[2] ? Array.from(inputs[2].data) : this.attrInts("ends");
        if (!starts || !ends || starts.length !== ends.length) throw new Error("Slice requires matching starts and ends");
        const axes = inputs[3] ? Array.from(inputs[3].data) : (this.attrInts("axes") ?? starts.map((_, i) => i));
        const steps = inputs[4] ? Array.from(inputs[4].data) : starts.map(() => 1);
        if (axes.length !== starts.length || steps.length !== starts.length) throw new Error("Slice parameter lengths differ");
        const offsets = x.shape.map(() => 0),
            increments = x.shape.map(() => 1),
            shape = [...x.shape],
            used = new Set<number>();
        for (let i = 0; i < axes.length; i++) {
            const a = normalizeAxis(axes[i], rank),
                d = x.shape[a],
                step = steps[i];
            if (used.has(a) || !Number.isInteger(step) || step === 0) throw new Error("Invalid Slice axes or steps");
            used.add(a);
            let start = starts[i],
                end = ends[i];
            if (!Number.isInteger(start) || !Number.isInteger(end)) throw new Error("Invalid Slice bounds");
            if (start < 0) start += d;
            if (end < 0) end += d;
            start = Math.min(Math.max(start, 0), step > 0 ? d : d - 1);
            end = Math.min(Math.max(end, step > 0 ? 0 : -1), d);
            offsets[a] = start;
            increments[a] = step;
            shape[a] = Math.max(0, Math.ceil((end - start) / step));
        }
        const out = new Float32Array(shape.reduce((a, b) => a * b, 1));
        for (let i = 0; i < out.length; i++) {
            let remainder = i,
                source = 0,
                stride = 1;
            for (let a = rank - 1; a >= 0; a--) {
                source += (offsets[a] + (remainder % shape[a]) * increments[a]) * stride;
                remainder = Math.floor(remainder / shape[a]);
                stride *= x.shape[a];
            }
            out[i] = x.data[source];
        }
        return [makeTensor(out, shape)];
    }
}

// ─── Registration ───────────────────────────────────────────────────────────

export function registerMathOps(registry: OnnxOpRegistry): void {
    registry.register("Add", (info) => new AddNode(info));
    registry.register("Sub", (info) => new SubNode(info));
    registry.register("Mul", (info) => new MulNode(info));
    registry.register("Atan", (info) => new AtanNode(info));
    registry.register("Gemm", (info) => new GemmNode(info));
    registry.register("Concat", (info) => new ConcatNode(info));
    registry.register("Slice", (info) => new SliceNode(info));
}
