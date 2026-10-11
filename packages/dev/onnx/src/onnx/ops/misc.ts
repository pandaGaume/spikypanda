import { OnnxDataType } from "../onnx-types";
import { binaryTensor, normalizeAxis, broadcastShape, broadcastIndex } from "./tensor-utils";
import type { ITensor } from "spikypanda-core";
import type { OnnxNodeInfo } from "../onnx-types";
import { OnnxOpNode, makeTensor, getInitializerData, OnnxOpRegistry } from "../registry";

class DivNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [binaryTensor(inputs[0], inputs[1], (a, b) => a / b)];
    }
}

class PowNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [binaryTensor(inputs[0], inputs[1], Math.pow)];
    }
}

class ReduceMeanNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const x = inputs[0];
        const raw = inputs[1] ? Array.from(inputs[1].data) : this.attrInts("axes");
        if (raw?.length === 0 && this.attrInt("noop_with_empty_axes", 0)) return [makeTensor(new Float32Array(x.data), [...x.shape])];
        const axes = raw?.length ? raw.map((a) => normalizeAxis(a, x.shape.length)) : x.shape.map((_, i) => i);
        if (new Set(axes).size !== axes.length) throw new Error("Duplicate reduction axes");
        const keep = this.attrInt("keepdims", 1) !== 0;
        const shape = x.shape.flatMap((d, i) => (axes.includes(i) ? (keep ? [1] : []) : [d]));
        const out = new Float32Array(shape.reduce((a, b) => a * b, 1));
        for (let i = 0; i < x.data.length; i++) {
            let rem = i,
                index = 0,
                stride = 1;
            for (let d = x.shape.length - 1; d >= 0; d--) {
                const coordinate = rem % x.shape[d];
                rem = Math.floor(rem / x.shape[d]);
                if (!axes.includes(d)) {
                    index += coordinate * stride;
                    stride *= x.shape[d];
                }
            }
            out[index] += x.data[i];
        }
        const count = axes.reduce((n, a) => n * x.shape[a], 1);
        for (let i = 0; i < out.length; i++) out[i] /= count;
        return [makeTensor(out, shape)];
    }
}

/**
 * ReduceL2: sqrt(sum(x^2)) along the given axes.
 *
 * Like ReduceMean / ReduceSum, our infrastructure only reads scalar
 * attributes, so this implementation supports a single axis (the
 * common case `axes=[-1]`). Extension to multi-axis reduce is left
 * for when a client demands it.
 */
class ReduceL2Node extends OnnxOpNode {
    private readonly axis: number;
    private readonly keepdims: boolean;
    readonly outputShapes: number[][] = [];

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.axis = this.attrInt("axes", -1);
        this.keepdims = this.attrInt("keepdims", 1) !== 0;
    }

    execute(inputs: ITensor[]): ITensor[] {
        const X = inputs[0];
        const shape = X.shape;
        const rank = shape.length;
        const axis = this.axis < 0 ? rank + this.axis : this.axis;

        if (rank === 2 && axis === 1) {
            const rows = shape[0],
                cols = shape[1];
            const out = new Float32Array(rows);
            for (let r = 0; r < rows; r++) {
                let s = 0;
                for (let c = 0; c < cols; c++) {
                    const v = X.data[r * cols + c];
                    s += v * v;
                }
                out[r] = Math.sqrt(s);
            }
            return [makeTensor(out, this.keepdims ? [rows, 1] : [rows])];
        }
        if (rank === 2 && axis === 0) {
            const rows = shape[0],
                cols = shape[1];
            const out = new Float32Array(cols);
            for (let c = 0; c < cols; c++) {
                let s = 0;
                for (let r = 0; r < rows; r++) {
                    const v = X.data[r * cols + c];
                    s += v * v;
                }
                out[c] = Math.sqrt(s);
            }
            return [makeTensor(out, this.keepdims ? [1, cols] : [cols])];
        }

        // Fallback: reduce all
        let s = 0;
        for (let i = 0; i < X.data.length; i++) s += X.data[i] * X.data[i];
        return [makeTensor(new Float32Array([Math.sqrt(s)]), [1])];
    }
}

class ReduceSumNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const x = inputs[0];
        const raw = inputs[1] ? Array.from(inputs[1].data) : this.attrInts("axes");
        if (raw?.length === 0 && this.attrInt("noop_with_empty_axes", 0)) return [makeTensor(new Float32Array(x.data), [...x.shape])];
        const axes = raw?.length ? raw.map((a) => normalizeAxis(a, x.shape.length)) : x.shape.map((_, i) => i);
        if (new Set(axes).size !== axes.length) throw new Error("Duplicate reduction axes");
        const keep = this.attrInt("keepdims", 1) !== 0;
        const shape = x.shape.flatMap((d, i) => (axes.includes(i) ? (keep ? [1] : []) : [d]));
        const out = new Float32Array(shape.reduce((a, b) => a * b, 1));
        for (let i = 0; i < x.data.length; i++) {
            let rem = i,
                index = 0,
                stride = 1;
            for (let d = x.shape.length - 1; d >= 0; d--) {
                const coordinate = rem % x.shape[d];
                rem = Math.floor(rem / x.shape[d]);
                if (!axes.includes(d)) {
                    index += coordinate * stride;
                    stride *= x.shape[d];
                }
            }
            out[index] += x.data[i];
        }

        return [makeTensor(out, shape)];
    }
}

class IdentityNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [makeTensor(new Float32Array(inputs[0].data), [...inputs[0].shape])];
    }
}

class CastNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const x = inputs[0],
            to = this.attrInt("to", OnnxDataType.FLOAT);
        let convert: (value: number) => number;
        if (to === OnnxDataType.FLOAT) convert = (v) => v;
        else if (to === OnnxDataType.BOOL) convert = (v) => Number(v !== 0);
        else if (to === OnnxDataType.INT32 || to === OnnxDataType.INT64)
            convert = (v) => {
                const integer = Math.trunc(v);
                if (!Number.isFinite(integer) || Math.abs(integer) > 16777216) throw new Error("Cast integer is outside exact FP32 range");
                return integer;
            };
        else throw new Error(`Unsupported Cast dtype: ${to}`);
        return [makeTensor(Float32Array.from(x.data, convert), [...x.shape])];
    }
}

class ShapeNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const shape = inputs[0].shape;
        return [makeTensor(new Float32Array(shape), [shape.length])];
    }
}

class ConstantOfShapeNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const shapeT = inputs[0];
        const shape = Array.from(shapeT.data).map(Math.round);
        let size = 1;
        for (const d of shape) size *= d;
        // Try tensor attribute "value" first (TensorProto), fall back to scalar
        let val = 0;
        const valueTensor = this.attrTensor("value");
        if (valueTensor) {
            const data = getInitializerData(valueTensor);
            if (data.length > 0) val = data[0];
        } else {
            val = this.attr("value", 0);
        }
        const out = new Float32Array(size).fill(val);
        return [makeTensor(out, shape)];
    }
}

/**
 * Pad: pad a tensor. Simplified: 2D constant padding.
 */
class PadNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const X = inputs[0];
        const pads = inputs.length >= 2 && inputs[1] ? inputs[1] : null;
        if (!pads || X.shape.length !== 2) {
            return [makeTensor(new Float32Array(X.data), [...X.shape])];
        }
        const val = inputs.length >= 3 && inputs[2] ? inputs[2].data[0] : 0;
        const [rows, cols] = X.shape;
        const p = Array.from(pads.data).map(Math.round);
        // pads format: [top, left, bottom, right] for 2D
        const top = p[0] ?? 0,
            left = p[1] ?? 0,
            bottom = p[2] ?? 0,
            right = p[3] ?? 0;
        const newRows = rows + top + bottom;
        const newCols = cols + left + right;
        const out = new Float32Array(newRows * newCols).fill(val);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                out[(r + top) * newCols + (c + left)] = X.data[r * cols + c];
            }
        }
        return [makeTensor(out, [newRows, newCols])];
    }
}

class MinNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const out = new Float32Array(inputs[0].data);
        for (let t = 1; t < inputs.length; t++) {
            for (let i = 0; i < out.length; i++) {
                out[i] = Math.min(out[i], inputs[t].data[i % inputs[t].data.length]);
            }
        }
        return [makeTensor(out, [...inputs[0].shape])];
    }
}

class MaxNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const out = new Float32Array(inputs[0].data);
        for (let t = 1; t < inputs.length; t++) {
            for (let i = 0; i < out.length; i++) {
                out[i] = Math.max(out[i], inputs[t].data[i % inputs[t].data.length]);
            }
        }
        return [makeTensor(out, [...inputs[0].shape])];
    }
}

/**
 * Constant: produces a constant tensor from attributes.
 * The value comes from a tensor attribute "value".
 */
class ConstantNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(): ITensor[] {
        const valueTensor = this.attrTensor("value");
        if (valueTensor) {
            const data = getInitializerData(valueTensor);
            return [makeTensor(new Float32Array(data), [...valueTensor.dims])];
        }
        // Scalar fallback
        const val = this.attr("value_float", 0);
        return [makeTensor(new Float32Array([val]), [1])];
    }
}

/**
 * Expand: broadcast a tensor to a target shape.
 * Input 0: data tensor
 * Input 1: shape tensor (int64 values as float)
 */
class ExpandNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const [data, target] = inputs;
        const requested = Array.from(target.data);
        if (requested.some((d) => !Number.isInteger(d) || d < 0)) throw new Error("Invalid Expand shape");
        const shape = broadcastShape(data.shape, requested);
        const out = new Float32Array(shape.reduce((a, b) => a * b, 1));
        for (let i = 0; i < out.length; i++) out[i] = data.data[broadcastIndex(i, shape, data.shape)];
        return [makeTensor(out, shape)];
    }
}

export function registerMiscOps(registry: OnnxOpRegistry): void {
    registry.register("Div", (info) => new DivNode(info));
    registry.register("Pow", (info) => new PowNode(info));
    registry.register("ReduceMean", (info) => new ReduceMeanNode(info));
    registry.register("ReduceSum", (info) => new ReduceSumNode(info));
    registry.register("ReduceL2", (info) => new ReduceL2Node(info));
    registry.register("Identity", (info) => new IdentityNode(info));
    registry.register("Cast", (info) => new CastNode(info));
    registry.register("Shape", (info) => new ShapeNode(info));
    registry.register("ConstantOfShape", (info) => new ConstantOfShapeNode(info));
    registry.register("Pad", (info) => new PadNode(info));
    registry.register("Min", (info) => new MinNode(info));
    registry.register("Max", (info) => new MaxNode(info));
    registry.register("Constant", (info) => new ConstantNode(info));
    registry.register("Expand", (info) => new ExpandNode(info));
}
