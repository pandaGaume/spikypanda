/**
 * KWS model pipeline test — validates that the keyword spotting models
 * can be parsed, graph-built, and executed through the full SpikyPanda pipeline.
 */
import * as fs from "fs";
import * as path from "path";
import type { ITensor } from "../../dev/runtime/src/compute/compute.interfaces";
import { OnnxParser } from "../../dev/runtime/src/onnx/onnx-parser";
import { OnnxGraphBuilder } from "../../dev/runtime/src/onnx/graph-builder";
import { createDefaultRegistry, createSpikyPandaRegistry } from "../../dev/runtime/src/onnx/ops/index";

const KWS_DIR = path.resolve(__dirname, "../../dev/tools/kws");

const MODELS = [
    { file: "kws_conv_tiny.onnx", name: "KWS Conv Tiny (6K params)" },
    { file: "kws_conv_gru.onnx", name: "KWS Conv+GRU (14K params)" },
];

describe("KWS model pipeline", () => {
    for (const { file, name } of MODELS) {
        const modelPath = path.join(KWS_DIR, file);
        if (!fs.existsSync(modelPath)) continue;

        describe(name, () => {
            let modelBytes: Uint8Array;

            beforeAll(() => {
                modelBytes = new Uint8Array(fs.readFileSync(modelPath));
            });

            it("should parse the ONNX model", () => {
                const result = OnnxParser.parse(modelBytes);
                expect(result).not.toBeNull();
                expect(result!.nodes.length).toBeGreaterThan(0);
                console.log(`  ${name}: ${result!.nodes.length} nodes, ${result!.initializers.length} initializers`);
                console.log(`  Ops: ${[...new Set(result!.nodes.map(n => n.opType))].join(", ")}`);
            });

            it("should build a compute graph (generic registry)", () => {
                const result = OnnxParser.parse(modelBytes)!;
                const registry = createDefaultRegistry();
                const builder = new OnnxGraphBuilder(registry);
                const { graph, inputNames, outputNames } = builder.build(result);

                expect(graph).toBeDefined();
                expect(graph.nodes.length).toBeGreaterThan(0);
                expect(inputNames.length).toBeGreaterThan(0);
                expect(outputNames.length).toBeGreaterThan(0);
                console.log(`  Graph: ${graph.nodes.length} nodes, ${graph.links.length} links`);
                console.log(`  Inputs: ${inputNames.join(", ")}`);
                console.log(`  Outputs: ${outputNames.join(", ")}`);
            });

            it("should execute with dummy MFCC input (generic)", () => {
                const result = OnnxParser.parse(modelBytes)!;
                const registry = createDefaultRegistry();
                const builder = new OnnxGraphBuilder(registry);
                const { graph, inputNames } = builder.build(result);

                // Dummy MFCC: [1, 40, 101]
                const inputSize = 1 * 40 * 101;
                const dummyData = new Float32Array(inputSize);
                for (let i = 0; i < inputSize; i++) dummyData[i] = Math.random() * 2 - 1;

                const externalInputs = new Map<string, ITensor>();
                externalInputs.set(inputNames[0], {
                    data: dummyData,
                    shape: [1, 40, 101],
                    name: inputNames[0],
                });

                const results = graph.run(externalInputs);
                expect(results.size).toBeGreaterThan(0);

                const output = [...results.values()][0];
                expect(output).toBeDefined();
                expect(output.data.length).toBe(12); // 12 classes
                console.log(`  Output logits: [${Array.from(output.data).map(v => v.toFixed(3)).join(", ")}]`);

                // Softmax check: logits should be finite
                for (const v of output.data) {
                    expect(isFinite(v)).toBe(true);
                }
            });

            it("should execute with SpikyPanda native registry", () => {
                const result = OnnxParser.parse(modelBytes)!;
                const registry = createSpikyPandaRegistry();
                const builder = new OnnxGraphBuilder(registry);
                const { graph, inputNames } = builder.build(result);

                const inputSize = 1 * 40 * 101;
                const dummyData = new Float32Array(inputSize);
                for (let i = 0; i < inputSize; i++) dummyData[i] = Math.random() * 2 - 1;

                const externalInputs = new Map<string, ITensor>();
                externalInputs.set(inputNames[0], {
                    data: dummyData,
                    shape: [1, 40, 101],
                    name: inputNames[0],
                });

                const results = graph.run(externalInputs);
                expect(results.size).toBeGreaterThan(0);

                const output = [...results.values()][0];
                expect(output.data.length).toBe(12);
                for (const v of output.data) {
                    expect(isFinite(v)).toBe(true);
                }
            });
        });
    }
});
