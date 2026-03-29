import type { ITensor } from "../../compute/compute.interfaces";
import type { OnnxNodeInfo } from "../onnx-types";
import { OnnxOpNode, makeTensor, OnnxOpRegistry } from "../registry";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Compute total element count from shape. */
function size(shape: number[]): number {
    let s = 1;
    for (const d of shape) s *= Math.max(d, 1);
    return s;
}

/**
 * Broadcast two shapes (up to 3D). Returns the broadcast result shape.
 * Follows numpy broadcasting rules: align right, expand dims of size 1.
 */
function broadcastShape(a: number[], b: number[]): number[] {
    const rank = Math.max(a.length, b.length);
    const out: number[] = new Array(rank);
    for (let i = 0; i < rank; i++) {
        const da = a[a.length - rank + i] ?? 1;
        const db = b[b.length - rank + i] ?? 1;
        if (da !== db && da !== 1 && db !== 1) {
            throw new Error(`Cannot broadcast shapes [${a}] and [${b}]`);
        }
        out[i] = Math.max(da, db);
    }
    return out;
}

/** Map a flat index in the broadcast output back to a flat index in a source tensor. */
function broadcastIndex(flatIdx: number, outShape: number[], srcShape: number[]): number {
    const rank = outShape.length;
    let idx = 0;
    let stride = 1;
    for (let i = rank - 1; i >= 0; i--) {
        const coord = Math.floor(flatIdx / strideof(outShape, i)) % outShape[i];
        const srcDim = srcShape[srcShape.length - rank + i] ?? 1;
        const srcCoord = srcDim === 1 ? 0 : coord;
        idx += srcCoord * stride;
        stride *= srcDim;
    }
    return idx;
}

function strideof(shape: number[], dim: number): number {
    let s = 1;
    for (let i = dim + 1; i < shape.length; i++) s *= shape[i];
    return s;
}

/** Element-wise binary op with broadcasting. */
function binaryOp(a: ITensor, b: ITensor, fn: (x: number, y: number) => number): ITensor {
    const outShape = broadcastShape(a.shape, b.shape);
    const outSize = size(outShape);
    const out = new Float32Array(outSize);
    for (let i = 0; i < outSize; i++) {
        const ai = broadcastIndex(i, outShape, a.shape);
        const bi = broadcastIndex(i, outShape, b.shape);
        out[i] = fn(a.data[ai], b.data[bi]);
    }
    return makeTensor(out, outShape);
}

// ─── Ops ────────────────────────────────────────────────────────────────────

class MulNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [binaryOp(inputs[0], inputs[1], (a, b) => a * b)];
    }
}

class SubNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [binaryOp(inputs[0], inputs[1], (a, b) => a - b)];
    }
}

class AddNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [binaryOp(inputs[0], inputs[1], (a, b) => a + b)];
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
class GemmNode extends OnnxOpNode {
    private readonly alpha: number;
    private readonly beta: number;
    private readonly transA: boolean;
    private readonly transB: boolean;
    readonly outputShapes: number[][] = [];

    constructor(nodeInfo: OnnxNodeInfo) {
        super(nodeInfo);
        this.alpha = this.attr("alpha", 1.0);
        this.beta = this.attr("beta", 1.0);
        this.transA = this.attrInt("transA", 0) !== 0;
        this.transB = this.attrInt("transB", 0) !== 0;
    }

    execute(inputs: ITensor[]): ITensor[] {
        const A = inputs[0];
        const B = inputs[1];
        const C = inputs.length > 2 ? inputs[2] : null;

        // Infer M, K, N from actual tensor data + shapes
        const aRows = A.shape.length >= 2 ? A.shape[0] : 1;
        const aCols = A.shape.length >= 2 ? A.shape[1] : A.data.length;
        const bRows = B.shape.length >= 2 ? B.shape[0] : 1;
        const bCols = B.shape.length >= 2 ? B.shape[1] : B.data.length;

        const M = this.transA ? aCols : aRows;
        const K = this.transA ? aRows : aCols;
        const N = this.transB ? bRows : bCols;

        const out = new Float32Array(M * N);

        for (let m = 0; m < M; m++) {
            for (let n = 0; n < N; n++) {
                let sum = 0;
                for (let k = 0; k < K; k++) {
                    const aIdx = this.transA ? k * M + m : m * K + k;
                    const bIdx = this.transB ? n * K + k : k * N + n;
                    sum += A.data[aIdx] * B.data[bIdx];
                }
                out[m * N + n] = this.alpha * sum;
            }
        }

        if (C) {
            for (let m = 0; m < M; m++) {
                for (let n = 0; n < N; n++) {
                    const ci = m * N + n;
                    // C is broadcastable — could be [1, N] or [M, N]
                    const cIdx = C.data.length === N ? n : ci % C.data.length;
                    out[ci] += this.beta * C.data[cIdx];
                }
            }
        }

        return [makeTensor(out, [M, N])];
    }
}

/**
 * Concat along axis (supports axis 0 and 1 for 2D tensors).
 */
class ConcatNode extends OnnxOpNode {
    private readonly axis: number;
    readonly outputShapes: number[][] = [];

    constructor(nodeInfo: OnnxNodeInfo) {
        super(nodeInfo);
        this.axis = this.attrInt("axis", 0);
    }

    execute(inputs: ITensor[]): ITensor[] {
        if (inputs.length === 0) return [makeTensor(new Float32Array(0), [0])];
        if (inputs.length === 1) return [makeTensor(new Float32Array(inputs[0].data), [...inputs[0].shape])];

        const axis = this.axis;

        if (axis === 0) {
            // Stack along rows: all must have same cols
            const cols = inputs[0].shape.length >= 2 ? inputs[0].shape[1] : inputs[0].data.length;
            let totalRows = 0;
            for (const inp of inputs) {
                totalRows += inp.shape.length >= 2 ? inp.shape[0] : 1;
            }
            const out = new Float32Array(totalRows * cols);
            let offset = 0;
            for (const inp of inputs) {
                out.set(inp.data, offset);
                offset += inp.data.length;
            }
            return [makeTensor(out, [totalRows, cols])];
        }

        if (axis === 1) {
            // Concat along columns: all must have same rows
            const rows = inputs[0].shape.length >= 2 ? inputs[0].shape[0] : 1;
            let totalCols = 0;
            const colsList: number[] = [];
            for (const inp of inputs) {
                const c = inp.shape.length >= 2 ? inp.shape[1] : inp.data.length;
                colsList.push(c);
                totalCols += c;
            }
            const out = new Float32Array(rows * totalCols);
            for (let r = 0; r < rows; r++) {
                let outCol = 0;
                for (let t = 0; t < inputs.length; t++) {
                    const cols = colsList[t];
                    const srcRow = inputs[t].shape.length >= 2 ? inputs[t].shape[1] : inputs[t].data.length;
                    for (let c = 0; c < cols; c++) {
                        out[r * totalCols + outCol + c] = inputs[t].data[r * srcRow + c];
                    }
                    outCol += cols;
                }
            }
            return [makeTensor(out, [rows, totalCols])];
        }

        throw new Error(`Concat axis=${axis} not supported (only 0 and 1)`);
    }
}

/**
 * Slice: column-based slicing for 2D tensors.
 * ONNX opset ≥10 uses tensor inputs for starts/ends/axes/steps.
 * Opset <10 uses attributes.
 * We support both: try tensor inputs first, fall back to attributes.
 */
class SliceNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];

    execute(inputs: ITensor[]): ITensor[] {
        const data = inputs[0];
        if (!data) return [makeTensor(new Float32Array(0), [0])];

        // Opset ≥10: starts, ends, axes, steps are tensor inputs
        const hasInputStarts = inputs.length >= 3 && inputs[1] && inputs[2];

        let start: number;
        let end: number;
        let axis: number;

        if (hasInputStarts) {
            start = Math.round(inputs[1].data[0]);
            end = Math.round(inputs[2].data[0]);
            axis = inputs.length >= 4 && inputs[3] ? Math.round(inputs[3].data[0]) : 0;
        } else {
            // Fall back to attributes (opset <10)
            start = this.attrInt("starts", 0);
            end = this.attrInt("ends", 0);
            axis = this.attrInt("axes", 1); // default axis=1 for column slicing
        }

        // Handle negative indices
        const dimSize = data.shape[axis] ?? data.data.length;
        if (start < 0) start = dimSize + start;
        if (end < 0) end = dimSize + end;
        if (end > dimSize || end > 2147483000) end = dimSize;
        start = Math.max(0, Math.min(start, dimSize));
        end = Math.max(start, Math.min(end, dimSize));
        const sliceLen = end - start;

        if (data.shape.length < 2 || axis === 0) {
            // 1D or axis=0: simple slice
            const sliced = data.data.slice(start, end);
            return [makeTensor(sliced, [sliceLen])];
        }

        // 2D, axis=1: slice columns
        const rows = data.shape[0];
        const cols = data.shape[1];
        const out = new Float32Array(rows * sliceLen);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < sliceLen; c++) {
                out[r * sliceLen + c] = data.data[r * cols + start + c];
            }
        }
        return [makeTensor(out, [rows, sliceLen])];
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
