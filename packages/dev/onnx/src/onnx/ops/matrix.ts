import { normalizeAxis, strides, broadcastShape, broadcastIndex } from "./tensor-utils";
import type { ITensor, IKernelExecutionContext, INodeState, ISession } from "spikypanda-core";
import type { OnnxNodeInfo } from "../onnx-types";
import { OnnxOpNode, makeTensor, shapeSize, OnnxOpRegistry } from "../registry";

/**
 * MatMul: matrix multiplication A @ B.
 * Supports vector promotion and broadcast batch dimensions of arbitrary rank.
 * For 1D inputs: [K] treated as [1,K] or [K,1] as needed.
 */
class MatMulNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const [a, b] = inputs;
        if (!a.shape.length || !b.shape.length) throw new Error("MatMul requires rank >= 1");
        const av = a.shape.length === 1,
            bv = b.shape.length === 1;
        const as = av ? [1, ...a.shape] : a.shape;
        const bs = bv ? [...b.shape, 1] : b.shape;
        const [m, k] = as.slice(-2),
            [bk, n] = bs.slice(-2);
        if (k !== bk) throw new Error(`MatMul inner dimensions differ: ${k} != ${bk}`);
        const ab = as.slice(0, -2),
            bb = bs.slice(0, -2);
        const batch = broadcastShape(ab, bb);
        const out = new Float32Array(shapeSize(batch) * m * n);
        // Contiguous dot products avoid a cache miss for every weight in
        // large Transformer projections. Keep double accumulation before
        // the final FP32 store, as in the generic implementation.
        const bt = new Float32Array(b.data.length);
        for (let t = 0; t < shapeSize(bb); t++) for (let h = 0; h < k; h++) for (let j = 0; j < n; j++) bt[t * n * k + j * k + h] = b.data[t * k * n + h * n + j];
        for (let t = 0; t < shapeSize(batch); t++) {
            const ai = broadcastIndex(t, batch, ab) * m * k;
            const bi = broadcastIndex(t, batch, bb) * n * k;
            for (let i = 0; i < m; i++)
                for (let j = 0; j < n; j++) {
                    let sum = 0;
                    const aRow = ai + i * k,
                        bRow = bi + j * k;
                    for (let h = 0; h < k; h++) sum += a.data[aRow + h] * bt[bRow + h];
                    out[t * m * n + i * n + j] = sum;
                }
        }
        const shape = [...batch, ...(av ? [] : [m]), ...(bv ? [] : [n])];
        return [makeTensor(out, shape)];
    }
}

/**
 * Transpose: permute dimensions.
 * Supports arbitrary rank and the declared permutation.
 */
interface ITransposeCache {
    shape: number[];
    perm: number[];
    inputBits: Uint32Array;
    output: Float32Array;
}
interface ITransposeState extends INodeState {
    transposeCache?: ITransposeCache;
}

class TransposeNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    createNodeState(): ITransposeState {
        return { linksReady: 0 };
    }
    override reset(session: ISession): void {
        const state = session.nodeStateOf(this) as ITransposeState | undefined;
        if (state) state.transposeCache = undefined;
    }
    execute(inputs: ITensor[], context?: IKernelExecutionContext): ITensor[] {
        const inp = inputs[0],
            rank = inp.shape.length;
        const perm = this.attrInts("perm") ?? Array.from({ length: rank }, (_, i) => rank - 1 - i);
        if (perm.length !== rank || new Set(perm).size !== rank || perm.some((i) => !Number.isInteger(i) || i < 0 || i >= rank)) throw new Error("Invalid Transpose permutation");
        const shape = perm.map((i) => inp.shape[i]);
        const state = context?.nodeState as ITransposeState | undefined;
        const bits = inp.cacheable && state ? new Uint32Array(inp.data.buffer, inp.data.byteOffset, inp.data.length) : undefined;
        const cached = state?.transposeCache;
        if (
            bits &&
            cached &&
            cached.inputBits.length === bits.length &&
            cached.shape.length === rank &&
            cached.shape.every((d, i) => d === inp.shape[i]) &&
            cached.perm.every((d, i) => d === perm[i])
        ) {
            let equal = true;
            for (let i = 0; i < bits.length; i++)
                if (bits[i] !== cached.inputBits[i]) {
                    equal = false;
                    break;
                }
            if (equal) return [{ ...makeTensor(new Float32Array(cached.output), shape), cacheable: true }];
        }
        if (state) state.transposeCache = undefined;
        const sourceStrides = strides(inp.shape),
            out = new Float32Array(inp.data.length),
            sourceData = inp.data;
        if (rank === 2 && perm[0] === 1 && perm[1] === 0) {
            // Blocked 2D transpose keeps source and destination tiles in cache.
            const rows = inp.shape[0],
                columns = inp.shape[1],
                tile = 32;
            for (let row = 0; row < rows; row += tile)
                for (let col = 0; col < columns; col += tile)
                    for (let i = row; i < Math.min(row + tile, rows); i++) for (let j = col; j < Math.min(col + tile, columns); j++) out[j * rows + i] = sourceData[i * columns + j];
        } else if (out.length) {
            const mappedStrides = perm.map((i) => sourceStrides[i]);
            let block = 1,
                outerRank = rank;
            // A contiguous trailing block can be copied as a single span.
            for (let d = rank - 1; d >= 0; d--) {
                if (shape[d] !== 1 && mappedStrides[d] !== block) break;
                block *= shape[d];
                outerRank = d;
            }
            const coordinates = new Array<number>(outerRank).fill(0);
            let source = 0;
            for (let offset = 0; offset < out.length; offset += block) {
                if (block === 1) out[offset] = sourceData[source];
                else out.set(sourceData.subarray(source, source + block), offset);
                for (let d = outerRank - 1; d >= 0; d--) {
                    coordinates[d]++;
                    source += mappedStrides[d];
                    if (coordinates[d] < shape[d]) break;
                    coordinates[d] = 0;
                    source -= mappedStrides[d] * shape[d];
                }
            }
        }
        if (bits && state) {
            state.transposeCache = { shape: [...inp.shape], perm: [...perm], inputBits: new Uint32Array(bits), output: out };
            // Consumers receive an independent buffer, so mutating a result cannot poison the cache.
            return [{ ...makeTensor(new Float32Array(out), shape), cacheable: true }];
        }
        return [makeTensor(out, shape)];
    }
}

/**
 * Reshape: change shape without changing data.
 * Supports -1 for one inferred dimension.
 */
class ReshapeNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const [data, target] = inputs;
        if (!target) throw new Error("Reshape requires a shape tensor");
        const allowzero = this.attrInt("allowzero", 0) !== 0;
        let inferred = -1;
        const shape = Array.from(target.data, (d, i) => {
            if (!Number.isInteger(d) || d < -1) throw new Error("Invalid Reshape dimension");
            if (d === -1) {
                if (inferred >= 0) throw new Error("Reshape permits only one inferred dimension");
                inferred = i;
                return -1;
            }
            if (d === 0 && !allowzero) {
                if (i >= data.shape.length) throw new Error("Reshape copied dimension is absent");
                return data.shape[i];
            }
            return d;
        });
        const known = shape.filter((d) => d !== -1).reduce((a, b) => a * b, 1);
        if (inferred >= 0) {
            if (!known || data.data.length % known !== 0) throw new Error("Cannot infer Reshape dimension");
            shape[inferred] = data.data.length / known;
        }
        if (shapeSize(shape) !== data.data.length) throw new Error("Reshape element count differs");
        return [makeTensor(new Float32Array(data.data), shape)];
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
        let d0 = 1,
            d1 = 1;
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
        const raw = inputs[1] ? Array.from(inputs[1].data) : this.attrInts("axes");
        const axes = raw?.map((a) => normalizeAxis(a, inp.shape.length));
        if (axes && (new Set(axes).size !== axes.length || axes.some((a) => inp.shape[a] !== 1))) throw new Error("Invalid Squeeze axes");
        const shape = inp.shape.filter((d, i) => (axes ? !axes.includes(i) : d !== 1));
        return [makeTensor(new Float32Array(inp.data), shape)];
    }
}

/**
 * Unsqueeze: insert dimensions of size 1.
 */
class UnsqueezeNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const inp = inputs[0];
        const raw = inputs[1] ? Array.from(inputs[1].data) : this.attrInts("axes");
        if (!raw) throw new Error("Unsqueeze requires axes");
        const axes = raw.map((a) => normalizeAxis(a, inp.shape.length + raw.length)).sort((a, b) => a - b);
        if (new Set(axes).size !== axes.length) throw new Error("Duplicate Unsqueeze axes");
        const shape = [...inp.shape];
        for (const a of axes) shape.splice(a, 0, 1);
        return [makeTensor(new Float32Array(inp.data), shape)];
    }
}

/**
 * Gather: select elements along axis using indices.
 * Preserves the complete indices shape and supports any axis.
 */
class GatherNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const [data, indices] = inputs;
        if (!indices) throw new Error("Gather requires indices");
        const axis = normalizeAxis(this.attrInt("axis", 0), data.shape.length);
        const dim = data.shape[axis];
        const outer = shapeSize(data.shape.slice(0, axis)),
            inner = shapeSize(data.shape.slice(axis + 1));
        const shape = [...data.shape.slice(0, axis), ...indices.shape, ...data.shape.slice(axis + 1)];
        const out = new Float32Array(shapeSize(shape));
        for (let o = 0; o < outer; o++)
            for (let i = 0; i < indices.data.length; i++) {
                let index = indices.data[i];
                if (!Number.isInteger(index) || index < -dim || index >= dim) throw new Error(`Gather index out of range: ${index}`);
                if (index < 0) index += dim;
                const start = (o * dim + index) * inner;
                out.set(data.data.subarray(start, start + inner), (o * indices.data.length + i) * inner);
            }
        return [makeTensor(out, shape)];
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
