import type { ITensor } from "../../compute/compute.interfaces";
import { OnnxOpNode, makeTensor, OnnxOpRegistry } from "./registry";
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
    private readonly axis: number;
    readonly outputShapes: number[][] = [];
    constructor(info: OnnxNodeInfo) {
        super(info);
        this.axis = this.attrInt("axis", -1);
    }
    execute(inputs: ITensor[]): ITensor[] {
        const inp = inputs[0];
        const shape = inp.shape;
        const rank = shape.length;
        const axis = this.axis < 0 ? rank + this.axis : this.axis;

        if (rank <= 1 || axis === rank - 1) {
            // Softmax over last dim
            const cols = shape[rank - 1] ?? inp.data.length;
            const rows = inp.data.length / cols;
            const out = new Float32Array(inp.data.length);
            for (let r = 0; r < rows; r++) {
                let maxVal = -Infinity;
                for (let c = 0; c < cols; c++) maxVal = Math.max(maxVal, inp.data[r * cols + c]);
                let sum = 0;
                for (let c = 0; c < cols; c++) {
                    out[r * cols + c] = Math.exp(inp.data[r * cols + c] - maxVal);
                    sum += out[r * cols + c];
                }
                for (let c = 0; c < cols; c++) out[r * cols + c] /= sum;
            }
            return [makeTensor(out, [...shape])];
        }
        // Fallback: flatten softmax
        return [unaryMap(inp, (x) => x)];
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

export function registerActivationOps(registry: OnnxOpRegistry): void {
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
