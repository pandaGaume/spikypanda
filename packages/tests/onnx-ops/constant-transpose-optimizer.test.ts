import type { IOptimizer } from "spikypanda-core";
import { OnnxConstantTransposeOptimizer } from "../../dev/onnx/src/onnx/optimization/constant-transpose.optimizer";
import { OnnxDataType, OnnxLinkType } from "../../dev/onnx/src/onnx/onnx-types";
import type { OnnxParseResult } from "../../dev/onnx/src/onnx/onnx-parser";
import { OnnxGraphBuilder } from "../../dev/onnx/src/onnx/graph-builder";
import { createRegistry } from "../../dev/onnx/src/onnx/ops";
function model(): OnnxParseResult {
    return {
        irVersion: 8,
        graphName: "weights",
        nodes: [{ name: "transpose", opType: "Transpose", inputs: ["w"], outputs: ["y"], attributes: new Map(), listAttributes: new Map([["perm", [1, 0]]]) }],
        initializers: [{ name: "w", dataType: OnnxDataType.FLOAT, dims: [2, 3], floatData: Float32Array.from([1, 2, 3, 4, 5, 6]) }],
        inputs: [],
        outputs: [{ name: "y", elemType: OnnxDataType.FLOAT, shape: [3, 2], type: OnnxLinkType.OUTPUT }],
        valueInfos: [],
    };
}
describe("IOptimizer constant Transpose pass", () => {
    test("graph in, new graph out: removes constant operator and matches native inference", () => {
        const input = model(),
            optimizer: IOptimizer<OnnxParseResult> = new OnnxConstantTransposeOptimizer();
        const output = optimizer.optimize(input);
        expect(output).not.toBe(input);
        expect(output.nodes).toHaveLength(0);
        expect(output.initializers.map((x) => x.name)).toEqual(["y"]);
        expect(input.nodes).toHaveLength(1);
        expect(input.initializers[0].dims).toEqual([2, 3]);
        expect(Array.from(input.initializers[0].floatData!)).toEqual([1, 2, 3, 4, 5, 6]);
        const before = new OnnxGraphBuilder(createRegistry()).build(input).graph.infer().get("y")!;
        const after = new OnnxGraphBuilder(createRegistry()).build(output).graph.infer().get("y")!;
        expect(after.shape).toEqual(before.shape);
        expect(Array.from(after.data)).toEqual(Array.from(before.data));
        expect(optimizer.optimize(output).nodes).toHaveLength(0);
    });
    test("preserves shared weights and public graph boundaries; does not fold overridable inputs", () => {
        const input = model();
        input.outputs.push({ name: "w", elemType: OnnxDataType.FLOAT, shape: [2, 3], type: OnnxLinkType.OUTPUT });
        expect(new OnnxConstantTransposeOptimizer().optimize(input).initializers.map((x) => x.name)).toEqual(["w", "y"]);
        input.inputs.push({ name: "w", elemType: OnnxDataType.FLOAT, shape: [2, 3], type: OnnxLinkType.INPUT });
        expect(new OnnxConstantTransposeOptimizer().optimize(input).nodes).toHaveLength(1);
        const dynamic = model();
        dynamic.initializers = [];
        dynamic.inputs = [{ name: "w", elemType: OnnxDataType.FLOAT, shape: [2, 3], type: OnnxLinkType.INPUT }];
        expect(new OnnxConstantTransposeOptimizer().optimize(dynamic).nodes).toHaveLength(1);
        const custom = model();
        custom.nodes[0].domain = "vendor";
        expect(new OnnxConstantTransposeOptimizer().optimize(custom).nodes).toHaveLength(1);
    });
    test("folds chains and Constant tensors, retaining only the final initializer", () => {
        const input = model();
        input.nodes.push({ ...input.nodes[0], name: "second", inputs: ["y"], outputs: ["z"] });
        input.outputs[0].name = "z";
        input.outputs[0].shape = [2, 3];
        const out = new OnnxConstantTransposeOptimizer().optimize(input);
        expect(out.nodes).toHaveLength(0);
        expect(out.initializers.map((x) => x.name)).toEqual(["z"]);
        expect(Array.from(new Float32Array(out.initializers[0].rawData!.buffer))).toEqual([1, 2, 3, 4, 5, 6]);
        const constant = model();
        const tensor = constant.initializers.pop()!;
        constant.nodes.unshift({ name: "source", opType: "Constant", inputs: [], outputs: ["w"], attributes: new Map(), tensorAttributes: new Map([["value", tensor]]) });
        expect(new OnnxConstantTransposeOptimizer().optimize(constant).nodes).toHaveLength(0);
    });
    test("external byte views preserve all FP32 bits and fail on invalid data or permutations", () => {
        const input = model(),
            bits = new Uint32Array([99, 0x80000000, 0x7fa00001, 0x3f800000, 0x40000000, 0x40400000, 0x40800000, 99]);
        input.initializers[0].floatData = undefined;
        input.initializers[0].externalData = new Map([["location", "weights.bin"]]);
        const optimizer = new OnnxConstantTransposeOptimizer({ resolveExternalData: () => new Uint8Array(bits.buffer, 4, 24) });
        const out = optimizer.optimize(input);
        expect(Array.from(new Uint32Array(out.initializers[0].rawData!.buffer))).toEqual([0x80000000, 0x40000000, 0x7fa00001, 0x40400000, 0x3f800000, 0x40800000]);
        expect(() => new OnnxConstantTransposeOptimizer().optimize(input)).toThrow("requires tensor data");
        input.nodes[0].listAttributes!.set("perm", [0, 0]);
        expect(() => optimizer.optimize(input)).toThrow("permutation");
        input.nodes[0].listAttributes!.set("perm", [1, 0]);
        input.initializers[0].dims = [2, 4];
        expect(() => optimizer.optimize(input)).toThrow("byte size");
    });
    test("default permutation, scalar and empty tensors retain dimensions and bytes", () => {
        for (const dims of [[], [0, 3], [2, 1, 3]]) {
            const input = model();
            input.nodes[0].listAttributes = undefined;
            input.initializers[0].dims = dims;
            input.initializers[0].floatData = Float32Array.from({ length: dims.reduce((a, b) => a * b, 1) }, (_, i) => i + 1);
            const output = new OnnxConstantTransposeOptimizer().optimize(input);
            expect(output.initializers[0].dims).toEqual([...dims].reverse());
            expect(output.initializers[0].rawData!.byteLength).toBe(input.initializers[0].floatData!.byteLength);
            expect(Array.from(new Float32Array(output.initializers[0].rawData!.buffer))).toEqual(dims.length===3?[1,4,2,5,3,6]:Array.from(input.initializers[0].floatData!));
        }
    });
    test("integer weights and unaligned raw views are transposed without numeric conversion", () => {
        const integer=model();integer.initializers[0].dims=[2,2];integer.initializers[0].dataType=OnnxDataType.INT64;integer.initializers[0].floatData=undefined;
        const values=new BigInt64Array([9007199254740993n,-9007199254740993n,7n,8n]);integer.initializers[0].rawData=new Uint8Array(values.buffer);
        const result=new OnnxConstantTransposeOptimizer().optimize(integer);
        expect(Array.from(new BigInt64Array(result.initializers[0].rawData!.buffer))).toEqual([values[0],values[2],values[1],values[3]]);
        const unaligned=model();const buffer=new Uint8Array(25);buffer.set(new Uint8Array(unaligned.initializers[0].floatData!.buffer),1);
        unaligned.initializers[0].floatData=undefined;unaligned.initializers[0].rawData=buffer.subarray(1);
        expect(Array.from(new Float32Array(new OnnxConstantTransposeOptimizer().optimize(unaligned).initializers[0].rawData!.buffer))).toEqual([1,4,2,5,3,6]);
    });

});
