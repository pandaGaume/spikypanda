import type { ITensor } from "spikypanda-core";
import type { OnnxNodeInfo } from "../../onnx-types";

export const WEBGPU_OPERATORS = [
    "MatMul",
    "Gemm",
    "Add",
    "Sub",
    "Mul",
    "Div",
    "Pow",
    "Relu",
    "Sigmoid",
    "Tanh",
    "Erf",
    "Exp",
    "Sqrt",
    "Softmax",
    "LayerNormalization",
    "Transpose",
    "Gather",
    "Reshape",
    "Flatten",
    "Squeeze",
    "Unsqueeze",
] as const;
export interface IWebGpuOperatorPlan {
    shapes: number[][];
    code: string;
    groups: number;
    inputs: readonly ITensor[];
}
const size = (shape: readonly number[]) => shape.reduce((a, b) => a * b, 1);
const strides = (shape: readonly number[]) => shape.map((_, i) => size(shape.slice(i + 1)));
const uint = (n: number) => `${n}u`;
function axisOf(axis: number, rank: number): number {
    if (!Number.isInteger(axis) || axis < -rank || axis >= rank) throw new Error("Invalid operator axis");
    return axis < 0 ? axis + rank : axis;
}
function broadcast(a: number[], b: number[]): number[] {
    const rank = Math.max(a.length, b.length),
        shape = [];
    for (let i = 0; i < rank; i++) {
        const x = a[i - rank + a.length] ?? 1,
            y = b[i - rank + b.length] ?? 1;
        if (x !== y && x !== 1 && y !== 1) throw new Error("Incompatible broadcast dimensions");
        shape.push(x === 1 ? y : x);
    }
    return shape;
}
function index(output: number[], input: number[], variable = "i"): string {
    const os = strides(output),
        ins = strides(input),
        shift = output.length - input.length;
    return input.map((d, j) => (d === 1 ? "0u" : `((${variable}/${uint(Math.max(1, os[j + shift]))})%${uint(Math.max(1, d))})*${uint(ins[j])}`)).join("+") || "0u";
}
const erf = `fn erfValue(x:f32)->f32 {
 let t=1.0/(1.0+0.3275911*abs(x));
 let y=1.0-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*exp(-x*x);
 return select(-y,y,x>=0.0);
}`;
function bindings(n: number, outputs: number): string {
    return (
        Array.from({ length: n }, (_, i) => `@group(0) @binding(${i}) var<storage,read> a${i}:array<f32>;`).join("\n") +
        "\n" +
        Array.from({ length: outputs }, (_, i) => `@group(0) @binding(${n + i}) var<storage,read_write> y${i}:array<f32>;`).join("\n")
    );
}
/** Shader specialization uses shapes and ONNX attributes, never model weights or graph orchestration. */
export function planWebGpuOperator(op: string, inputs: readonly ITensor[], info?: OnnxNodeInfo, maxWorkgroups = 65535): IWebGpuOperatorPlan {
    if (!inputs.length) throw new Error("Operator requires inputs");
    for (const t of inputs)
        if (t.shape.some((d) => !Number.isSafeInteger(d) || d < 0) || !Number.isSafeInteger(size(t.shape)) || size(t.shape) > 0xffffffff)
            throw new Error("Unsupported tensor dimensions");
    for (const tensor of inputs) if (!tensor.storage && tensor.data.length !== size(tensor.shape)) throw new Error("CPU tensor data and shape differ");
    const attr = (name: string, value: number) => info?.attributes.get(name) ?? value;
    let shape = [...inputs[0].shape],
        body = "",
        work = size(shape),
        outputs = [shape],
        prelude = "",
        reduction = false,
        bound = inputs;
    const binary: Record<string, string> = { Add: "x+z", Sub: "x-z", Mul: "x*z", Div: "x/z", Pow: "powerValue(x,z)" };
    const unary: Record<string, string> = { Relu: "max(0.0,x)", Sigmoid: "1.0/(1.0+exp(-x))", Tanh: "tanh(x)", Erf: "erfValue(x)", Exp: "exp(x)", Sqrt: "sqrt(x)" };
    if (op === "Gemm") {
        if (inputs.length < 2 || inputs.length > 3) throw new Error("Gemm requires two matrices and an optional bias");
        const a = inputs[0].shape, b = inputs[1].shape;
        if (a.length !== 2 || b.length !== 2) throw new Error("Gemm requires rank-two matrices");
        const transA = attr("transA", 0), transB = attr("transB", 0);
        if (![0, 1].includes(transA) || ![0, 1].includes(transB)) throw new Error("Invalid Gemm transpose flag");
        const m = a[transA ? 1 : 0], k = a[transA ? 0 : 1], n = b[transB ? 0 : 1];
        if (k !== b[transB ? 1 : 0]) throw new Error("Gemm inner dimensions differ");
        const alpha = Math.fround(attr("alpha", 1)), beta = Math.fround(attr("beta", 1));
        if (!Number.isFinite(alpha) || !Number.isFinite(beta)) throw new Error("Gemm coefficients must be finite FP32 values");
        shape = [m, n]; outputs = [shape]; work = size(shape);
        const c = inputs[2]?.shape;
        if (c && (c.length > 2 || c.some((d, i) => d !== 1 && d !== shape[2 - c.length + i])))
            throw new Error("Gemm bias cannot broadcast to output");
        const ai = transA ? `k*${uint(m)}+row` : `row*${uint(k)}+k`;
        const bi = transB ? `col*${uint(k)}+k` : `k*${uint(n)}+col`;
        body = `let row=i/${uint(Math.max(1, n))};let col=i%${uint(Math.max(1, n))};var sum=0.0;` +
            `for(var k=0u;k<${uint(k)};k++){sum+=a0[${ai}]*a1[${bi}];}` +
            `y0[i]=${alpha.toExponential(9)}*sum${c ? `+${beta.toExponential(9)}*a2[${index(shape, c)}]` : ""};`;
    } else if (binary[op]) {
        if (inputs.length !== 2) throw new Error("Binary operator requires two inputs");
        shape = broadcast(shape, inputs[1].shape);
        outputs = [shape];
        work = size(shape);
        if (op === "Pow")
            prelude = `fn powerValue(x:f32,z:f32)->f32 {
 if(x<0.0){if(floor(z)!=z){return bitcast<f32>(bitcast<u32>(x)|0x7fc00000u);}let p=pow(-x,z);return select(-p,p,floor(z/2.0)*2.0==z);}return pow(x,z);
}`;
        body = `let x=a0[${index(shape, inputs[0].shape)}];let z=a1[${index(shape, inputs[1].shape)}];y0[i]=${binary[op]};`;
    } else if (unary[op]) {
        if (inputs.length !== 1) throw new Error("Unary operator requires one input");
        prelude = op === "Erf" ? erf : "";
        body = `let x=a0[i];y0[i]=${unary[op]};`;
    } else if (["Reshape", "Flatten", "Squeeze", "Unsqueeze"].includes(op)) {
        const original = [...shape],
            control = inputs[1];
        if (control?.storage) throw new Error("Shape and axes must remain CPU control data; explicit download required");
        const values = control ? Array.from(control.data) : info?.listAttributes?.get("axes");
        if (values?.some((v) => !Number.isSafeInteger(v))) throw new Error("Shape or axes must be integers");
        if (op === "Reshape") {
            if (!control) throw new Error("Reshape requires a shape input");
            const allowzero = attr("allowzero", 0);
            if (allowzero !== 0 && allowzero !== 1) throw new Error("Invalid allowzero");
            shape = values!.map((d, i) => (d === 0 && !allowzero ? original[i] ?? -2 : d));
            if (shape.some((d) => d < -1) || shape.filter((d) => d === -1).length > 1) throw new Error("Invalid reshape shape");
            const missing = shape.indexOf(-1);
            if (missing >= 0) {
                const known = size(shape.filter((d) => d !== -1));
                if (!known || size(original) % known) throw new Error("Cannot infer reshape dimension");
                shape[missing] = size(original) / known;
            }
            if (size(shape) !== size(original)) throw new Error("Reshape element count differs");
        } else if (op === "Flatten") {
            const a = attr("axis", 1),
                rank = shape.length;
            if (!Number.isInteger(a) || a < -rank || a > rank) throw new Error("Invalid flatten axis");
            const axis = a < 0 ? a + rank : a;
            shape = [size(shape.slice(0, axis)), size(shape.slice(axis))];
        } else if (op === "Squeeze") {
            const axes = values?.map((a) => axisOf(a, shape.length));
            if (axes && (new Set(axes).size !== axes.length || axes.some((a) => shape[a] !== 1))) throw new Error("Invalid squeeze axes");
            shape = shape.filter((d, i) => (axes ? !axes.includes(i) : d !== 1));
        } else {
            if (!values) throw new Error("Unsqueeze requires axes");
            const rank = shape.length + values.length,
                axes = values.map((a) => axisOf(a, rank));
            if (new Set(axes).size !== axes.length) throw new Error("Duplicate unsqueeze axes");
            let j = 0;
            shape = Array.from({ length: rank }, (_, i) => (axes.includes(i) ? 1 : original[j++]));
        }
        outputs = [shape];
        work = size(shape);
        bound = inputs.slice(0, 1);
        body = "y0[i]=a0[i];";
    } else if (op === "Transpose") {
        if (inputs.length !== 1) throw new Error("Transpose requires one input");
        const perm = info?.listAttributes?.get("perm") ?? shape.map((_, i) => shape.length - 1 - i);
        if (perm.length !== shape.length || new Set(perm).size !== shape.length || perm.some((p) => !Number.isInteger(p) || p < 0 || p >= shape.length))
            throw new Error("Invalid transpose permutation");
        const original = shape,
            st = strides(original);
        shape = perm.map((p) => original[p]);
        outputs = [shape];
        work = size(shape);
        const os = strides(shape);
        const offset = perm.map((p, j) => `((i/${uint(Math.max(1, os[j]))})%${uint(Math.max(1, shape[j]))})*${uint(st[p])}`).join("+") || "0u";
        body = `y0[i]=a0[${offset}];`;
    } else if (op === "Gather") {
        if (inputs.length !== 2) throw new Error("Gather requires indices");
        if (inputs[1].storage) throw new Error("Gather indices must remain CPU control data; explicit download required for device indices");
        const axis = axisOf(attr("axis", 0), shape.length),
            dim = shape[axis],
            inner = size(shape.slice(axis + 1)),
            n = size(inputs[1].shape);
        for (const v of inputs[1].data) if (!Number.isInteger(v) || v < -dim || v >= dim) throw new Error("Gather index out of range");
        shape = [...shape.slice(0, axis), ...inputs[1].shape, ...shape.slice(axis + 1)];
        outputs = [shape];
        work = size(shape);
        body = `let raw=i32(a1[(i/${uint(Math.max(1, inner))})%${uint(Math.max(1, n))}]);let j=u32(select(raw,raw+${dim},raw<0));y0[i]=a0[((i/${uint(Math.max(1, n * inner))})*${uint(dim)}+j)*${uint(inner)}+i%${uint(Math.max(1, inner))}];`;
    } else if (op === "Softmax" || op === "LayerNormalization") {
        const axis = axisOf(attr("axis", -1), shape.length),
            inner = op === "Softmax" ? size(shape.slice(axis + 1)) : 1;
        const width = op === "Softmax" ? shape[axis] : size(shape.slice(axis)),
            outer = size(shape.slice(0, axis));
        work = outer * inner;
        reduction = true;
        if (op === "Softmax" && inputs.length !== 1) throw new Error("Softmax requires one input");
        if (op === "LayerNormalization") {
            if (width === 0) throw new Error("LayerNormalization empty normalized dimension is unsupported");
            if (inputs.length < 2 || inputs.length > 3) throw new Error("LayerNormalization requires scale and optional bias");
            if (attr("stash_type", 1) !== 1) throw new Error("Only FP32 stash_type is supported");
            for (const t of inputs.slice(1))
                if (JSON.stringify(broadcast(shape, t.shape)) !== JSON.stringify(shape)) throw new Error("LayerNormalization parameter cannot broadcast");
            const epsilon = attr("epsilon", 1e-5);
            if (!Number.isFinite(epsilon) || epsilon < 0) throw new Error("Invalid epsilon");
            const statsShape = [...shape.slice(0, axis), ...shape.slice(axis).map(() => 1)];
            const count = info?.outputs.length ?? 1;
            if (count < 1 || count > 3) throw new Error("Invalid normalization outputs");
            outputs = [shape, statsShape, statsShape].slice(0, count);
        }
        prelude = "var<workgroup> scratch:array<f32,64>;";
        const reduce = (mode: string) => `scratch[lane]=value;workgroupBarrier();for(var step=32u;step>0u;step/=2u){if(lane<step){scratch[lane]=${mode};}workgroupBarrier();}`;
        const base = `let row=gid.x;let base=(row/${uint(Math.max(1, inner))})*${uint(width * inner)}+row%${uint(Math.max(1, inner))};`;
        if (op === "Softmax")
            body =
                base +
                `var value=-3.402823466e38;for(var j=lane;j<${uint(width)};j+=64u){value=max(value,a0[base+j*${uint(inner)}]);}` +
                reduce("max(scratch[lane],scratch[lane+step])") +
                `let maximum=scratch[0];workgroupBarrier();value=0.0;for(var j=lane;j<${uint(width)};j+=64u){value+=exp(a0[base+j*${uint(inner)}]-maximum);}` +
                reduce("scratch[lane]+scratch[lane+step]") +
                `let sum=scratch[0];for(var j=lane;j<${uint(width)};j+=64u){y0[base+j*${uint(inner)}]=exp(a0[base+j*${uint(inner)}]-maximum)/sum;}`;
        else
            body =
                base +
                `var value=0.0;for(var j=lane;j<${uint(width)};j+=64u){value+=a0[base+j];}` +
                reduce("scratch[lane]+scratch[lane+step]") +
                `let mean=scratch[0]/${Math.max(1, width)}.0;workgroupBarrier();value=0.0;for(var j=lane;j<${uint(width)};j+=64u){let d=a0[base+j]-mean;value+=d*d;}` +
                reduce("scratch[lane]+scratch[lane+step]") +
                `let inverse=inverseSqrt(scratch[0]/${Math.max(1, width)}.0+${attr("epsilon", 1e-5)});` +
                (outputs.length > 1 ? "if(lane==0u){y1[row]=mean;}" : "") +
                (outputs.length > 2 ? "if(lane==0u){y2[row]=inverse;}" : "") +
                `for(var j=lane;j<${uint(width)};j+=64u){let i=base+j;y0[i]=(a0[i]-mean)*inverse*a1[${index(shape, inputs[1].shape)}]${inputs[2] ? `+a2[${index(shape, inputs[2].shape)}]` : ""};}`;
    } else throw new Error(`Unsupported WebGPU operator: ${op}`);
    if (!reduction) work = Math.ceil(work / 64);
    // Zero-sized reductions produce no elements and no dispatch.
    if (!size(shape)) work = 0;
    for (const output of outputs) if (!Number.isSafeInteger(size(output)) || size(output) > 0xffffffff) throw new Error("Operator output exceeds uint32 indexing");
    const gridWidth = Math.max(1, Math.min(work, maxWorkgroups));
    if (reduction) body = body.replace("let row=gid.x;", `let row=gid.x+gid.y*${uint(gridWidth)};if(row>=${uint(work)}){return;}`);
    const code =
        bindings(bound.length, outputs.length) +
        "\n" +
        prelude +
        `\n@compute @workgroup_size(64) fn main(@builtin(global_invocation_id) global:vec3<u32>,@builtin(workgroup_id) gid:vec3<u32>,@builtin(local_invocation_index) lane:u32){` +
        (reduction ? body : `let i=global.x+global.y*${uint(gridWidth*64)};if(i>=${uint(size(shape))}){return;}${body}`) +
        "}";
    return { shapes: outputs, code, groups: work, inputs: bound };
}
