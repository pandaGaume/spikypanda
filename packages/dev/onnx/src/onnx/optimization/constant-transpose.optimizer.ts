import type { IOptimizer } from "spikypanda-core";
import type { OnnxParseResult } from "../onnx-parser";
import { OnnxDataType, onnxDataTypeSize } from "../onnx-types";
import type { OnnxTensorInfo, OnnxNodeInfo } from "../onnx-types";
import { strides } from "../ops/tensor-utils";

export interface IConstantTransposeFold {
    node: string;
    input: string;
    output: string;
    permutation: number[];
    inputShape: number[];
    outputShape: number[];
    dataType: OnnxDataType;
    bytes: number;
}
export interface IConstantTransposeOptimizerOptions {
    readonly resolveExternalData?: (tensor: OnnxTensorInfo) => Uint8Array;
    readonly onFold?: (fold: IConstantTransposeFold) => void;
}

/** Fold standard ONNX constant Transpose nodes before materializing a runtime graph. */
export class OnnxConstantTransposeOptimizer implements IOptimizer<OnnxParseResult> {
    constructor(private readonly options: IConstantTransposeOptimizerOptions = {}) {}

    optimize(graph: OnnxParseResult): OnnxParseResult {
        const publicInputs = new Set(graph.inputs.map((x) => x.name));
        const constants = new Map(graph.initializers.filter((x) => !publicInputs.has(x.name)).map((x) => [x.name, x]));
        const initializers = new Map<string, OnnxTensorInfo>(graph.initializers.map((x) => [x.name, { ...x, dims: [...x.dims], externalData: x.externalData && new Map(x.externalData) }]));
        const nodes: OnnxNodeInfo[] = [];
        const foldedSources = new Set<string>();
        for (const node of graph.nodes) {
            const standard = !node.domain || node.domain === "ai.onnx";
            if (standard && node.opType === "Constant" && node.outputs.length === 1) {
                const tensor = node.tensorAttributes?.get("value");
                if (tensor) constants.set(node.outputs[0], { ...tensor, name: node.outputs[0] });
            }
            const source = standard && node.opType === "Transpose" && node.inputs.length === 1 && node.outputs.length === 1 ? constants.get(node.inputs[0]) : undefined;
            if (!source || !onnxDataTypeSize(source.dataType)) {
                nodes.push(this.cloneNode(node));
                continue;
            }
            const rank = source.dims.length;
            const perm = node.listAttributes?.get("perm") ?? Array.from({ length: rank }, (_, i) => rank - 1 - i);
            if (perm.length !== rank || new Set(perm).size !== rank || perm.some((i) => !Number.isInteger(i) || i < 0 || i >= rank))
                throw new Error(`Invalid constant Transpose permutation: ${node.name}`);
            if (source.dims.some((d) => !Number.isSafeInteger(d) || d < 0)) throw new Error(`Invalid constant tensor dimensions: ${source.name}`);
            const bytes = this.readData(source),
                size = onnxDataTypeSize(source.dataType);
            const count = source.dims.reduce((a, b) => a * b, 1);
            if (!Number.isSafeInteger(count) || bytes.byteLength !== count * size) throw new Error(`Constant tensor byte size differs: ${source.name}`);
            const dims = perm.map((i) => source.dims[i]);
            const result: OnnxTensorInfo = { name: node.outputs[0], dataType: source.dataType, dims, rawData: this.transpose(bytes, source.dims, perm, size) };
            initializers.set(result.name, result);
            constants.set(result.name, result);
            foldedSources.add(source.name);
            this.options.onFold?.({
                node: node.name,
                input: source.name,
                output: result.name,
                permutation: [...perm],
                inputShape: [...source.dims],
                outputShape: [...dims],
                dataType: source.dataType,
                bytes: bytes.byteLength,
            });
        }
        // Keep weights shared by another consumer or exposed at the graph boundary.
        const used = new Set([...nodes.flatMap((n) => n.inputs), ...graph.outputs.map((x) => x.name), ...graph.inputs.map((x) => x.name)]);
        const retained = nodes.filter((n) => !(n.opType === "Constant" && (!n.domain || n.domain === "ai.onnx") && n.outputs.every((x) => foldedSources.has(x) && !used.has(x))));
        const live = new Set([...retained.flatMap((n) => n.inputs), ...graph.outputs.map((x) => x.name), ...graph.inputs.map((x) => x.name)]);
        for (const name of foldedSources) if (!live.has(name)) initializers.delete(name);
        return {
            ...graph,
            nodes: retained,
            initializers: [...initializers.values()],
            inputs: graph.inputs.map((x) => ({ ...x, shape: [...x.shape] })),
            outputs: graph.outputs.map((x) => ({ ...x, shape: [...x.shape] })),
            valueInfos: graph.valueInfos.filter((x) => !foldedSources.has(x.name) || live.has(x.name)).map((x) => ({ ...x, shape: [...x.shape] })),
        };
    }

    private cloneNode(node: OnnxNodeInfo): OnnxNodeInfo {
        return {
            ...node,
            inputs: [...node.inputs],
            outputs: [...node.outputs],
            attributes: new Map(node.attributes),
            listAttributes: node.listAttributes && new Map([...node.listAttributes].map(([k, v]) => [k, [...v]])),
            tensorAttributes: node.tensorAttributes && new Map([...node.tensorAttributes].map(([k, v]) => [k, { ...v, dims: [...v.dims] }])),
        };
    }
    private readData(tensor: OnnxTensorInfo): Uint8Array {
        if (tensor.rawData) return tensor.rawData;
        if (tensor.floatData && tensor.dataType === OnnxDataType.FLOAT) return new Uint8Array(tensor.floatData.buffer, tensor.floatData.byteOffset, tensor.floatData.byteLength);
        if (tensor.externalData?.size && this.options.resolveExternalData) return this.options.resolveExternalData(tensor);
        if (tensor.dims.some((d) => d === 0)) return new Uint8Array();
        throw new Error(`Constant transpose requires tensor data: ${tensor.name}`);
    }
    private transpose(bytes: Uint8Array, dims: number[], perm: number[], size: number): Uint8Array {
        const out = new Uint8Array(bytes.length),
            shape = perm.map((i) => dims[i]);
        if (!out.length) return out;
        const srcStrides = strides(dims),
            mapped = perm.map((i) => srcStrides[i]);
        // Integer views preserve FP32 bit patterns, including NaN payloads.
        if (size === 4 && bytes.byteOffset % 4 === 0 && dims.length === 2 && perm[0] === 1 && perm[1] === 0) {
            const src = new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4),
                dst = new Uint32Array(out.buffer);
            const [rows, columns] = dims;
            for (let row = 0; row < rows; row += 32)
                for (let col = 0; col < columns; col += 32)
                    for (let i = row; i < Math.min(row + 32, rows); i++) for (let j = col; j < Math.min(col + 32, columns); j++) dst[j * rows + i] = src[i * columns + j];
        } else {
            const coordinates = new Array<number>(shape.length).fill(0);
            let source = 0;
            for (let target = 0; target < out.length; target += size) {
                out.set(bytes.subarray(source * size, (source + 1) * size), target);
                for (let d = shape.length - 1; d >= 0; d--) {
                    coordinates[d]++;
                    source += mapped[d];
                    if (coordinates[d] < shape[d]) break;
                    coordinates[d] = 0;
                    source -= mapped[d] * shape[d];
                }
            }
        }
        return out;
    }
}
