import type { ITensor } from "../../compute/compute.interfaces";
import type { OnnxNodeInfo } from "../onnx-types";
import { OnnxOpNode, makeTensor, OnnxOpRegistry } from "../registry";

/**
 * MatMul: matrix multiplication A @ B.
 * Supports 2D [M,K] x [K,N] → [M,N].
 * For 1D inputs: [K] treated as [1,K] or [K,1] as needed.
 */
class MatMulNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const A = inputs[0];
        const B = inputs[1];

        let M: number, K: number, N: number;
        if (A.shape.length === 1) {
            M = 1; K = A.shape[0];
        } else {
            M = A.shape[0]; K = A.shape[1];
        }
        if (B.shape.length === 1) {
            N = 1;
        } else {
            N = B.shape[1];
        }

        const out = new Float32Array(M * N);
        for (let m = 0; m < M; m++) {
            for (let n = 0; n < N; n++) {
                let sum = 0;
                for (let k = 0; k < K; k++) {
                    const ai = A.shape.length === 1 ? k : m * K + k;
                    const bi = B.shape.length === 1 ? k : k * N + n;
                    sum += A.data[ai] * B.data[bi];
                }
                out[m * N + n] = sum;
            }
        }

        if (A.shape.length === 1 && B.shape.length === 1) return [makeTensor(out, [1])];
        if (A.shape.length === 1) return [makeTensor(out, [N])];
        if (B.shape.length === 1) return [makeTensor(out, [M])];
        return [makeTensor(out, [M, N])];
    }
}

/**
 * Transpose: permute dimensions.
 * Supports 2D (swap rows/cols) and 3D.
 */
class TransposeNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const inp = inputs[0];
        const rank = inp.shape.length;

        if (rank === 2) {
            const [rows, cols] = inp.shape;
            const out = new Float32Array(inp.data.length);
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    out[c * rows + r] = inp.data[r * cols + c];
                }
            }
            return [makeTensor(out, [cols, rows])];
        }

        if (rank === 3) {
            const [d0, d1, d2] = inp.shape;
            // Default perm: reverse → [d2, d1, d0]
            const out = new Float32Array(inp.data.length);
            for (let i = 0; i < d0; i++) {
                for (let j = 0; j < d1; j++) {
                    for (let k = 0; k < d2; k++) {
                        out[k * d1 * d0 + j * d0 + i] = inp.data[i * d1 * d2 + j * d2 + k];
                    }
                }
            }
            return [makeTensor(out, [d2, d1, d0])];
        }

        // 1D: noop
        return [makeTensor(new Float32Array(inp.data), [...inp.shape])];
    }
}

/**
 * Reshape: change shape without changing data.
 * Supports -1 for one inferred dimension.
 */
class ReshapeNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const data = inputs[0];
        const shapeT = inputs[1];
        if (!shapeT) return [makeTensor(new Float32Array(data.data), [...data.shape])];

        const newShape: number[] = [];
        let inferIdx = -1;
        let known = 1;
        for (let i = 0; i < shapeT.data.length; i++) {
            const d = Math.round(shapeT.data[i]);
            if (d === -1) {
                inferIdx = i;
                newShape.push(-1);
            } else if (d === 0) {
                // 0 means copy from input
                const dim = data.shape[i] ?? 1;
                newShape.push(dim);
                known *= dim;
            } else {
                newShape.push(d);
                known *= d;
            }
        }
        if (inferIdx >= 0) {
            newShape[inferIdx] = data.data.length / known;
        }

        return [makeTensor(new Float32Array(data.data), newShape)];
    }
}

/**
 * Flatten: collapse dims into 2D [batch, features].
 */
class FlattenNode extends OnnxOpNode {
    private readonly axis: number;
    readonly outputShapes: number[][] = [];
    constructor(info: OnnxNodeInfo) {
        super(info);
        this.axis = this.attrInt("axis", 1);
    }
    execute(inputs: ITensor[]): ITensor[] {
        const inp = inputs[0];
        const shape = inp.shape;
        let d0 = 1, d1 = 1;
        for (let i = 0; i < this.axis; i++) d0 *= shape[i] ?? 1;
        for (let i = this.axis; i < shape.length; i++) d1 *= shape[i] ?? 1;
        return [makeTensor(new Float32Array(inp.data), [d0, d1])];
    }
}

/**
 * Squeeze: remove dimensions of size 1.
 */
class SqueezeNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const inp = inputs[0];
        const axes = inputs.length >= 2 && inputs[1]
            ? Array.from(inputs[1].data).map(Math.round)
            : null;
        const newShape = axes
            ? inp.shape.filter((_, i) => !axes.includes(i))
            : inp.shape.filter((d) => d !== 1);
        if (newShape.length === 0) newShape.push(1);
        return [makeTensor(new Float32Array(inp.data), newShape)];
    }
}

/**
 * Unsqueeze: insert dimensions of size 1.
 */
class UnsqueezeNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const inp = inputs[0];
        const axesT = inputs[1];
        if (!axesT) return [makeTensor(new Float32Array(inp.data), [...inp.shape])];
        const axes = Array.from(axesT.data).map(Math.round).sort((a, b) => a - b);
        const newShape = [...inp.shape];
        for (const a of axes) {
            newShape.splice(a, 0, 1);
        }
        return [makeTensor(new Float32Array(inp.data), newShape)];
    }
}

/**
 * Gather: select elements along axis using indices.
 * Simplified: supports axis=0, 1D/2D.
 */
class GatherNode extends OnnxOpNode {
    private readonly axis: number;
    readonly outputShapes: number[][] = [];
    constructor(info: OnnxNodeInfo) {
        super(info);
        this.axis = this.attrInt("axis", 0);
    }
    execute(inputs: ITensor[]): ITensor[] {
        const data = inputs[0];
        const indices = inputs[1];
        if (!indices) return [makeTensor(new Float32Array(data.data), [...data.shape])];

        if (this.axis === 0 && data.shape.length === 2) {
            const cols = data.shape[1];
            const numIdx = indices.data.length;
            const out = new Float32Array(numIdx * cols);
            for (let i = 0; i < numIdx; i++) {
                const idx = Math.round(indices.data[i]);
                for (let c = 0; c < cols; c++) {
                    out[i * cols + c] = data.data[idx * cols + c];
                }
            }
            return [makeTensor(out, [numIdx, cols])];
        }

        // Fallback: 1D gather
        const out = new Float32Array(indices.data.length);
        for (let i = 0; i < indices.data.length; i++) {
            out[i] = data.data[Math.round(indices.data[i])] ?? 0;
        }
        return [makeTensor(out, [indices.data.length])];
    }
}

export function registerMatrixOps(registry: OnnxOpRegistry): void {
    registry.register("MatMul", (info) => new MatMulNode(info));
    registry.register("Transpose", (info) => new TransposeNode(info));
    registry.register("Reshape", (info) => new ReshapeNode(info));
    registry.register("Flatten", (info) => new FlattenNode(info));
    registry.register("Squeeze", (info) => new SqueezeNode(info));
    registry.register("Unsqueeze", (info) => new UnsqueezeNode(info));
    registry.register("Gather", (info) => new GatherNode(info));
}
