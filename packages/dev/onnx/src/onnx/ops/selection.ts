import type { ITensor } from "spikypanda-core";
import { OnnxOpNode, OnnxOpRegistry, makeTensor, shapeSize } from "../registry";
import { binaryTensor, broadcastShape, broadcastIndex, normalizeAxis } from "./tensor-utils";

class EqualNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [binaryTensor(inputs[0], inputs[1], (a, b) => Number(a === b))];
    }
}

class NotNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [
            makeTensor(
                Float32Array.from(inputs[0].data, (value) => Number(!value)),
                [...inputs[0].shape]
            ),
        ];
    }
}

class WhereNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const [condition, x, y] = inputs;
        const shape = broadcastShape(condition.shape, broadcastShape(x.shape, y.shape));
        const out = new Float32Array(shapeSize(shape));
        for (let i = 0; i < out.length; i++) {
            const source = condition.data[broadcastIndex(i, shape, condition.shape)] ? x : y;
            out[i] = source.data[broadcastIndex(i, shape, source.shape)];
        }
        return [makeTensor(out, shape)];
    }
}

class RangeNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        if (inputs.some((input) => input.data.length !== 1)) throw new Error("Range requires scalar inputs");
        const [start, end, delta] = inputs.map((input) => input.data[0]);
        if (![start, end, delta].every(Number.isFinite) || delta === 0) throw new Error("Invalid Range bounds");
        const count = Math.max(0, Math.ceil((end - start) / delta));
        const data = Float32Array.from({ length: count }, (_, i) => start + i * delta);
        return [makeTensor(data, [count])];
    }
}

class CumSumNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const [x, axisTensor] = inputs;
        if (axisTensor.data.length !== 1) throw new Error("CumSum requires a scalar axis");
        const axis = normalizeAxis(axisTensor.data[0], x.shape.length);
        const outer = shapeSize(x.shape.slice(0, axis)),
            inner = shapeSize(x.shape.slice(axis + 1)),
            width = x.shape[axis];
        const reverse = this.attrInt("reverse", 0) !== 0,
            exclusive = this.attrInt("exclusive", 0) !== 0;
        const out = new Float32Array(x.data.length);
        for (let o = 0; o < outer; o++)
            for (let i = 0; i < inner; i++) {
                let sum = 0;
                for (let k = 0; k < width; k++) {
                    const index = (o * width + (reverse ? width - 1 - k : k)) * inner + i;
                    if (exclusive) out[index] = sum;
                    sum += x.data[index];
                    if (!exclusive) out[index] = sum;
                }
            }
        return [makeTensor(out, [...x.shape])];
    }
}

export function registerSelectionOps(registry: OnnxOpRegistry): void {
    registry.register("Equal", (info) => new EqualNode(info));
    registry.register("Not", (info) => new NotNode(info));
    registry.register("Where", (info) => new WhereNode(info));
    registry.register("Range", (info) => new RangeNode(info));
    registry.register("CumSum", (info) => new CumSumNode(info));
}
