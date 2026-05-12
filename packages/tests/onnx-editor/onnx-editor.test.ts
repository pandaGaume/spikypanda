import * as fs from "fs";
import * as path from "path";
import { OnnxParser } from "../../dev/onnx/src/onnx/onnx-parser";
import { onnxToGraph } from "../../dev/onnx-editor/src/onnx-adapter";

const MODEL_PATH = path.resolve(
    __dirname,
    "../../../",
    "../CyanMycelium/models/imu/model_embed.onnx",
);

// The fixture lives in the sibling CyanMycelium repo, which is not part of
// SpikyPanda's working tree. Skip the suite cleanly when the file is absent
// so a fresh checkout does not red-flag the test runner; the assertions only
// make sense when the artifact is present.
const HAS_MODEL = fs.existsSync(MODEL_PATH);
const describeIf = HAS_MODEL ? describe : describe.skip;

describeIf("ONNX Editor", () => {
    let modelBytes: Uint8Array;

    beforeAll(() => {
        modelBytes = new Uint8Array(fs.readFileSync(MODEL_PATH));
    });

    it("should parse model_embed.onnx without errors", () => {
        const result = OnnxParser.parse(modelBytes);
        expect(result).not.toBeNull();
        expect(result!.nodes.length).toBeGreaterThan(0);
        expect(result!.graphName).toBeTruthy();
    });

    it("should convert ONNX to graph defs", () => {
        const result = OnnxParser.parse(modelBytes)!;
        const graph = onnxToGraph(result);

        expect(graph.nodes.length).toBeGreaterThan(0);
        expect(graph.connections.length).toBeGreaterThan(0);

        // Every ONNX operator node should be present
        for (const n of result.nodes) {
            const found = graph.nodes.find(
                (gn) => gn.data && (gn.data as Record<string, unknown>).opType === n.opType,
            );
            expect(found).toBeDefined();
        }

        // Graph inputs should produce Input nodes
        const inputNodes = graph.nodes.filter(
            (n) => n.data && (n.data as Record<string, unknown>).kind === "input",
        );
        const nonInitInputs = result.inputs.filter(
            (inp) => !result.initializers.some((init) => init.name === inp.name),
        );
        expect(inputNodes.length).toBe(nonInitInputs.length);

        // Graph outputs should produce Output nodes
        const outputNodes = graph.nodes.filter(
            (n) => n.data && (n.data as Record<string, unknown>).kind === "output",
        );
        expect(outputNodes.length).toBe(result.outputs.length);
    });

    it("should have valid connections (no dangling references)", () => {
        const result = OnnxParser.parse(modelBytes)!;
        const graph = onnxToGraph(result);

        const nodeIds = new Set(graph.nodes.map((n) => n.onnxId));

        for (const conn of graph.connections) {
            expect(nodeIds.has(conn.fromNodeId)).toBe(true);
            expect(nodeIds.has(conn.toNodeId)).toBe(true);
        }
    });

    it("should color-code operators by type", () => {
        const result = OnnxParser.parse(modelBytes)!;
        const graph = onnxToGraph(result);

        for (const n of graph.nodes) {
            expect(n.color).toBeDefined();
            expect(n.color!.startsWith("#")).toBe(true);
        }
    });

    it("should log model summary", () => {
        const result = OnnxParser.parse(modelBytes)!;
        const graph = onnxToGraph(result);

        const opTypes = result.nodes.map((n) => n.opType);
        const uniqueOps = [...new Set(opTypes)].sort();

        console.log(`Model: ${result.graphName}`);
        console.log(`ONNX nodes: ${result.nodes.length}`);
        console.log(`Initializers: ${result.initializers.length}`);
        console.log(`Graph inputs: ${result.inputs.length}`);
        console.log(`Graph outputs: ${result.outputs.length}`);
        console.log(`Editor nodes: ${graph.nodes.length}`);
        console.log(`Editor connections: ${graph.connections.length}`);
        console.log(`Op types: ${uniqueOps.join(", ")}`);
    });
});
