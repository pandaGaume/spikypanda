import { normalizeAxis } from "./tensor-utils";
import type { ITensor } from "spikypanda-core";
import { OnnxOpNode, makeTensor, OnnxOpRegistry } from "../registry";
import type { OnnxNodeInfo } from "../onnx-types";

function unaryMap(inp: ITensor, fn: (x: number) => number): ITensor {
    const out = new Float32Array(inp.data.length);
    for (let i = 0; i < inp.data.length; i++) out[i] = fn(inp.data[i]);
    return makeTensor(out, [...inp.shape]);
}

class ReluNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [unaryMap(inputs[0], (x) => Math.max(0, x))];
    }
}

class SigmoidNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [unaryMap(inputs[0], (x) => 1 / (1 + Math.exp(-x)))];
    }
}

class TanhNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [unaryMap(inputs[0], Math.tanh)];
    }
}

class LeakyReluNode extends OnnxOpNode {
    private readonly alpha: number;
    readonly outputShapes: number[][] = [];
    constructor(info: OnnxNodeInfo) {
        super(info);
        this.alpha = this.attr("alpha", 0.01);
    }
    execute(inputs: ITensor[]): ITensor[] {
        const a = this.alpha;
        return [unaryMap(inputs[0], (x) => (x >= 0 ? x : a * x))];
    }
}

class ClipNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const min = inputs.length >= 2 && inputs[1] ? inputs[1].data[0] : -Infinity;
        const max = inputs.length >= 3 && inputs[2] ? inputs[2].data[0] : Infinity;
        return [unaryMap(inputs[0], (x) => Math.min(Math.max(x, min), max))];
    }
}

class SoftmaxNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        const inp = inputs[0],
            shape = inp.shape;
        const axis = normalizeAxis(this.attrInt("axis", -1), shape.length);
        const width = shape[axis],
            inner = shape.slice(axis + 1).reduce((a, b) => a * b, 1);
        const outer = shape.slice(0, axis).reduce((a, b) => a * b, 1);
        const out = new Float32Array(inp.data.length);
        for (let o = 0; o < outer; o++)
            for (let j = 0; j < inner; j++) {
                const base = o * width * inner + j;
                let max = -Infinity;
                for (let c = 0; c < width; c++) max = Math.max(max, inp.data[base + c * inner]);
                let sum = 0;
                for (let c = 0; c < width; c++) {
                    const value = Math.exp(inp.data[base + c * inner] - max);
                    out[base + c * inner] = value;
                    sum += value;
                }
                for (let c = 0; c < width; c++) out[base + c * inner] /= sum;
            }
        return [makeTensor(out, [...shape])];
    }
}

class ExpNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [unaryMap(inputs[0], Math.exp)];
    }
}

class LogNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [unaryMap(inputs[0], Math.log)];
    }
}

class SqrtNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [unaryMap(inputs[0], Math.sqrt)];
    }
}

class AbsNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [unaryMap(inputs[0], Math.abs)];
    }
}

class NegNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [unaryMap(inputs[0], (x) => -x)];
    }
}

function erf(x: number): number {
    const sign = x < 0 ? -1 : 1;
    const a = Math.abs(x),
        t = 1 / (1 + 0.3275911 * a);
    return sign * (1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a));
}

class ErfNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    execute(inputs: ITensor[]): ITensor[] {
        return [unaryMap(inputs[0], erf)];
    }
}

export function registerActivationOps(registry: OnnxOpRegistry): void {
    registry.register("Erf", (info) => new ErfNode(info));
    registry.register("Relu", (info) => new ReluNode(info));
    registry.register("Sigmoid", (info) => new SigmoidNode(info));
    registry.register("Tanh", (info) => new TanhNode(info));
    registry.register("LeakyRelu", (info) => new LeakyReluNode(info));
    registry.register("Clip", (info) => new ClipNode(info));
    registry.register("Softmax", (info) => new SoftmaxNode(info));
    registry.register("Exp", (info) => new ExpNode(info));
    registry.register("Log", (info) => new LogNode(info));
    registry.register("Sqrt", (info) => new SqrtNode(info));
    registry.register("Abs", (info) => new AbsNode(info));
    registry.register("Neg", (info) => new NegNode(info));
}
