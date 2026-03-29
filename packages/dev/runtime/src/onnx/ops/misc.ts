import type { ITensor } from "../../compute/compute.interfaces";
import type { OnnxNodeInfo } from "../onnx-types";
import { OnnxOpNode, makeTensor, getInitializerData, OnnxOpRegistry } from "../registry";

class DivNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const a = inputs[0], b = inputs[1];
        const size = Math.max(a.data.length, b.data.length);
        const out = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            out[i] = a.data[i % a.data.length] / b.data[i % b.data.length];
        }
        return [makeTensor(out, a.data.length >= b.data.length ? [...a.shape] : [...b.shape])];
    }
}

class PowNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const a = inputs[0], b = inputs[1];
        const size = Math.max(a.data.length, b.data.length);
        const out = new Float32Array(size);
        for (let i = 0; i < size; i++) {
            out[i] = Math.pow(a.data[i % a.data.length], b.data[i % b.data.length]);
        }
        return [makeTensor(out, a.data.length >= b.data.length ? [...a.shape] : [...b.shape])];
    }
}

class ReduceMeanNode extends OnnxOpNode {
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

        if (rank === 2) {
            if (axis === 1) {
                const rows = shape[0];
                const cols = shape[1];
                const out = new Float32Array(rows);
                for (let r = 0; r < rows; r++) {
                    let sum = 0;
                    for (let c = 0; c < cols; c++) sum += X.data[r * cols + c];
                    out[r] = sum / cols;
                }
                return [makeTensor(out, this.keepdims ? [rows, 1] : [rows])];
            }
            if (axis === 0) {
                const rows = shape[0];
                const cols = shape[1];
                const out = new Float32Array(cols);
                for (let c = 0; c < cols; c++) {
                    let sum = 0;
                    for (let r = 0; r < rows; r++) sum += X.data[r * cols + c];
                    out[c] = sum / rows;
                }
                return [makeTensor(out, this.keepdims ? [1, cols] : [cols])];
            }
        }

        // Fallback: reduce all
        let sum = 0;
        for (let i = 0; i < X.data.length; i++) sum += X.data[i];
        return [makeTensor(new Float32Array([sum / X.data.length]), [1])];
    }
}

class ReduceSumNode extends OnnxOpNode {
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
            const rows = shape[0], cols = shape[1];
            const out = new Float32Array(rows);
            for (let r = 0; r < rows; r++) {
                let sum = 0;
                for (let c = 0; c < cols; c++) sum += X.data[r * cols + c];
                out[r] = sum;
            }
            return [makeTensor(out, this.keepdims ? [rows, 1] : [rows])];
        }

        let sum = 0;
        for (let i = 0; i < X.data.length; i++) sum += X.data[i];
        return [makeTensor(new Float32Array([sum]), [1])];
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
        // All data is Float32 in our runtime — cast is a no-op
        return [makeTensor(new Float32Array(inputs[0].data), [...inputs[0].shape])];
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
        const top = p[0] ?? 0, left = p[1] ?? 0, bottom = p[2] ?? 0, right = p[3] ?? 0;
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
        const data = inputs[0];
        const shapeT = inputs[1];
        const targetShape = Array.from(shapeT.data).map(Math.round);

        // Compute output size
        let outSize = 1;
        for (const d of targetShape) outSize *= d;

        // If shapes are identical, return copy
        if (data.data.length === outSize) {
            return [makeTensor(new Float32Array(data.data), targetShape)];
        }

        // Broadcast: align shapes right, expand dims of size 1
        const srcShape = data.shape;
        const rank = targetShape.length;
        const srcPadded: number[] = [];
        for (let i = 0; i < rank; i++) {
            const si = i - (rank - srcShape.length);
            srcPadded.push(si >= 0 ? srcShape[si] : 1);
        }

        const out = new Float32Array(outSize);
        // Compute strides for source and output
        const outStrides: number[] = new Array(rank);
        const srcStrides: number[] = new Array(rank);
        outStrides[rank - 1] = 1;
        srcStrides[rank - 1] = 1;
        for (let i = rank - 2; i >= 0; i--) {
            outStrides[i] = outStrides[i + 1] * targetShape[i + 1];
            srcStrides[i] = srcStrides[i + 1] * srcPadded[i + 1];
        }

        for (let idx = 0; idx < outSize; idx++) {
            let srcIdx = 0;
            let rem = idx;
            for (let d = 0; d < rank; d++) {
                const coord = Math.floor(rem / outStrides[d]);
                rem %= outStrides[d];
                // If source dim is 1, broadcast (use coord 0)
                srcIdx += (srcPadded[d] === 1 ? 0 : coord) * srcStrides[d];
            }
            out[idx] = data.data[srcIdx];
        }

        return [makeTensor(out, targetShape)];
    }
}

export function registerMiscOps(registry: OnnxOpRegistry): void {
    registry.register("Div", (info) => new DivNode(info));
    registry.register("Pow", (info) => new PowNode(info));
    registry.register("ReduceMean", (info) => new ReduceMeanNode(info));
    registry.register("ReduceSum", (info) => new ReduceSumNode(info));
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
