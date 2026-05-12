import * as fs from "fs";
import * as path from "path";
import { OnnxParser } from "../../dev/onnx/src/onnx/onnx-parser";
import { OnnxOpRegistry } from "../../dev/onnx/src/onnx/registry";
import { registerMathOps } from "../../dev/onnx/src/onnx/ops/math";
import { OnnxGraphBuilder } from "../../dev/onnx/src/onnx/graph-builder";
import type { ITensor } from "spikypanda-core";

const MODEL_PATH = path.resolve(
    __dirname,
    "../../../",
    "../CyanMycelium/models/imu/model_embed.onnx",
);

// External fixture (sibling CyanMycelium repo). Skip the suite cleanly when
// the file is absent so a fresh checkout does not red-flag the test runner.
const HAS_MODEL = fs.existsSync(MODEL_PATH);
const describeIf = HAS_MODEL ? describe : describe.skip;

describeIf("ONNX Runtime POC", () => {
    let modelBytes: Uint8Array;

    beforeAll(() => {
        modelBytes = new Uint8Array(fs.readFileSync(MODEL_PATH));
    });

    it("should register all required ops for model_embed", () => {
        const registry = new OnnxOpRegistry();
        registerMathOps(registry);

        const result = OnnxParser.parse(modelBytes)!;
        const opTypes = [...new Set(result.nodes.map((n) => n.opType))];

        for (const op of opTypes) {
            expect(registry.has(op)).toBe(true);
        }

        console.log(`Registered ops: ${registry.getRegistered().join(", ")}`);
        console.log(`Model requires: ${opTypes.join(", ")}`);
    });

    it("should build a compute graph from the ONNX model", () => {
        const registry = new OnnxOpRegistry();
        registerMathOps(registry);

        const result = OnnxParser.parse(modelBytes)!;
        const builder = new OnnxGraphBuilder(registry);
        const { graph, inputNames, outputNames } = builder.build(result);

        expect(graph).toBeDefined();
        expect(graph.nodes.length).toBeGreaterThan(0);
        expect(inputNames.length).toBeGreaterThan(0);
        expect(outputNames.length).toBeGreaterThan(0);

        console.log(`Graph nodes: ${graph.nodes.length}`);
        console.log(`Graph links: ${graph.links.length}`);
        console.log(`Inputs: ${inputNames.join(", ")}`);
        console.log(`Outputs: ${outputNames.join(", ")}`);
    });

    it("should execute the graph with dummy input", () => {
        const registry = new OnnxOpRegistry();
        registerMathOps(registry);

        const result = OnnxParser.parse(modelBytes)!;
        const builder = new OnnxGraphBuilder(registry);
        const { graph, inputNames } = builder.build(result);

        // Find input shape from model
        const inputInfo = result.inputs.find(
            (i) => !result.initializers.some((init) => init.name === i.name),
        );
        expect(inputInfo).toBeDefined();

        // Replace dynamic dims (0) with 1 for inference
        const inputShape = inputInfo!.shape.map((d) => (d <= 0 ? 1 : d));
        const inputSize = inputShape.reduce((a, b) => a * b, 1) || 6;

        // Create dummy input with realistic-ish values
        const dummyData = new Float32Array(inputSize);
        for (let i = 0; i < inputSize; i++) dummyData[i] = (i % 10) * 0.1;

        const dummyInput: ITensor = {
            data: dummyData,
            shape: inputShape,
            name: inputNames[0],
        };

        const externalInputs = new Map<string, ITensor>();
        externalInputs.set(inputNames[0], dummyInput);

        // Execute
        const results = graph.infer(externalInputs);
        expect(results).toBeDefined();
        expect(results.size).toBeGreaterThan(0);

        for (const [name, tensor] of results) {
            console.log(`Output "${name}": shape=[${tensor.shape}], data=[${tensor.data.slice(0, 5).join(", ")}${tensor.data.length > 5 ? "..." : ""}]`);
        }
    });
});
