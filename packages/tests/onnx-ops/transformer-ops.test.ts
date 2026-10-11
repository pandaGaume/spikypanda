import * as fs from "fs";
import * as path from "path";
import type { ITensor } from "spikypanda-core";
import { createRegistry } from "../../dev/onnx/src/onnx/ops";
import { OnnxParser } from "../../dev/onnx/src/onnx/onnx-parser";
import { OnnxGraphBuilder } from "../../dev/onnx/src/onnx/graph-builder";
import { OnnxLinkType, OnnxDataType } from "../../dev/onnx/src/onnx/onnx-types";

interface ITensorVector {
    shape: number[];
    data: number[];
}
interface ITransformerCase {
    name: string;
    modelFile: string;
    inputs: Record<string, ITensorVector>;
    outputs: Record<string, ITensorVector>;
}
const cases: ITransformerCase[] = JSON.parse(fs.readFileSync(path.join(__dirname, "transformer-vectors.json"), "utf8"));

function check(actual: ITensor, expected: ITensorVector): void {
    expect(actual).toBeDefined();
    expect(actual.shape).toEqual(expected.shape);
    expect(actual.data.length).toBe(expected.data.length);
    for (let i = 0; i < actual.data.length; i++) {
        expect(Math.abs(actual.data[i] - expected.data[i])).toBeLessThanOrEqual(3e-5 + 3e-5 * Math.abs(expected.data[i]));
    }
}

describe("Transformer ONNX Runtime conformance", () => {
    test("External weights are restored only through an explicit host resolver", () => {
        const model = OnnxParser.parse(new Uint8Array(fs.readFileSync(path.join(__dirname, "models", "transformer-external.onnx"))))!;
        expect(model.initializers[0].externalData?.get("location")).toBe("transformer-external.data");
        const builder = new OnnxGraphBuilder(createRegistry());
        expect(() => builder.build(model)).toThrow("host resolver");
        const { graph } = builder.build(model, { resolveExternalData: () => new Uint8Array(fs.readFileSync(path.join(__dirname, "models", "transformer-external.data"))) });
        check(graph.infer(new Map([["x", { data: new Float32Array([2, 3]), shape: [1, 2] }]])).get("y")!, { shape: [1, 2], data: [11, 16] });
    });

    test.each(cases)("$name", (vector) => {
        const bytes = fs.readFileSync(path.join(__dirname, "models", vector.modelFile));

        const model = OnnxParser.parse(new Uint8Array(bytes));
        expect(model).not.toBeNull();
        const { graph } = new OnnxGraphBuilder(createRegistry()).build(model!);
        const feeds = new Map(Object.entries(vector.inputs).map(([name, v]) => [name, { data: new Float32Array(v.data), shape: v.shape }]));
        const result = graph.infer(feeds);
        // Multiple outputs on one sink are held as positional lastOutputs.
        for (const [name, expected] of Object.entries(vector.outputs)) {
            const producer = model!.nodes.find((n) => n.outputs.includes(name));
            const kernel = graph.nodes.find((n) => n.id === (producer?.outputs[0] ?? name));
            const actual = result.get(name) ?? kernel?.bag?.lastOutputs?.[producer!.outputs.indexOf(name)];
            check(actual!, expected);
        }
    });

    test("Unknown domain-qualified operators cannot produce a partial graph", () => {
        const model = OnnxParser.parse(new Uint8Array(fs.readFileSync(path.join(__dirname, "models", cases[0].modelFile))))!;
        model.nodes[0].domain = "unsupported.vendor";
        expect(() => new OnnxGraphBuilder(createRegistry()).build(model)).toThrow("unsupported.vendor.MatMul");
    });

    test("One graph accepts successive dynamic batch and sequence shapes", () => {
        const encoders = cases.filter((c) => c.name.startsWith("encoder-"));
        const model = OnnxParser.parse(new Uint8Array(fs.readFileSync(path.join(__dirname, "models", encoders[0].modelFile))))!;
        expect(model.inputs.find((input) => input.name === "ids")!.shape).toEqual([0, 0]);
        const { graph } = new OnnxGraphBuilder(createRegistry()).build(model);
        for (const vector of encoders) {
            const feeds = new Map(Object.entries(vector.inputs).map(([name, v]) => [name, { shape: v.shape, data: new Float32Array(v.data) }]));
            check(graph.infer(feeds).get("logits")!, vector.outputs.logits);
        }
    });

    test("Gather rejects out-of-range indices", () => {
        const op = createRegistry().create({ name: "g", opType: "Gather", inputs: ["x", "i"], outputs: ["y"], attributes: new Map() }, new Map());
        expect(() =>
            op.execute([
                { shape: [2], data: new Float32Array([1, 2]) },
                { shape: [1], data: new Float32Array([2]) },
            ])
        ).toThrow("out of range");
    });

    test("MatMul rejects incompatible contraction dimensions", () => {
        const op = createRegistry().create({ name: "m", opType: "MatMul", inputs: ["a", "b"], outputs: ["y"], attributes: new Map() }, new Map());
        expect(() =>
            op.execute([
                { shape: [2, 3], data: new Float32Array(6) },
                { shape: [4, 2], data: new Float32Array(8) },
            ])
        ).toThrow("inner dimensions");
    });

    test("LayerNorm auxiliary outputs retain their producer index across fan-out", () => {
        const model = OnnxParser.parse(new Uint8Array(fs.readFileSync(path.join(__dirname, "models", "transformer-layernorm-stats.onnx"))))!;
        model.nodes.push({ name: "copy", opType: "Identity", inputs: ["mean"], outputs: ["mean_copy"], attributes: new Map() });
        model.nodes.push({ name: "copy2", opType: "Identity", inputs: ["mean"], outputs: ["mean_copy2"], attributes: new Map() });
        model.outputs = ["mean_copy", "mean_copy2"].map((name) => ({ name, type: OnnxLinkType.OUTPUT, elemType: OnnxDataType.FLOAT, shape: [2, 1, 1] }));
        const vector = cases.find((c) => c.name === "layernorm-stats")!;
        const { graph } = new OnnxGraphBuilder(createRegistry()).build(model);
        const feeds = new Map(Object.entries(vector.inputs).map(([name, v]) => [name, { shape: v.shape, data: new Float32Array(v.data) }]));
        const results = graph.infer(feeds);
        check(results.get("mean_copy")!, vector.outputs.mean);
        check(results.get("mean_copy2")!, vector.outputs.mean);
    });
});
