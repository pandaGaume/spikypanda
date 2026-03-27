import { OnnxParser, OnnxParseResult } from "../../dev/runtime/src/onnx/onnx-parser";
import { OnnxWriter } from "../../dev/runtime/src/onnx/onnx-writer";
import { OnnxDataType, OnnxLinkType } from "../../dev/runtime/src/onnx/onnx-types";

/**
 * Build a synthetic OnnxParseResult that exercises every field path
 * the writer/parser pair supports.
 */
function buildTestModel(): OnnxParseResult {
    return {
        irVersion: 8,
        graphName: "test-graph",
        nodes: [
            {
                name: "conv1",
                opType: "Conv",
                inputs: ["X", "W"],
                outputs: ["Y"],
                attributes: new Map<string, number>([
                    ["kernel_size", 3],
                    ["dilations", 1],
                    ["strides", 1],
                    ["pads", 0],
                ]),
            },
            {
                name: "relu1",
                opType: "Relu",
                inputs: ["Y"],
                outputs: ["Z"],
                attributes: new Map<string, number>(),
            },
            {
                name: "scale1",
                opType: "Mul",
                inputs: ["Z", "alpha"],
                outputs: ["out"],
                attributes: new Map<string, number>([
                    ["scale_factor", 0.5], // float attribute
                ]),
            },
        ],
        initializers: [
            {
                name: "W",
                dataType: OnnxDataType.FLOAT,
                dims: [1, 1, 3, 3],
                floatData: new Float32Array([1, 0, -1, 2, 0, -2, 1, 0, -1]),
            },
            {
                name: "alpha",
                dataType: OnnxDataType.FLOAT,
                dims: [1],
                floatData: new Float32Array([0.5]),
            },
        ],
        inputs: [
            {
                name: "X",
                type: OnnxLinkType.INPUT,
                elemType: OnnxDataType.FLOAT,
                shape: [1, 1, 28, 28],
            },
        ],
        outputs: [
            {
                name: "out",
                type: OnnxLinkType.OUTPUT,
                elemType: OnnxDataType.FLOAT,
                shape: [1, 1, 26, 26],
            },
        ],
        valueInfos: [
            {
                name: "Y",
                type: OnnxLinkType.UNKNOWN,
                elemType: OnnxDataType.FLOAT,
                shape: [1, 1, 26, 26],
            },
            {
                name: "Z",
                type: OnnxLinkType.UNKNOWN,
                elemType: OnnxDataType.FLOAT,
                shape: [1, 1, 26, 26],
            },
        ],
    };
}

describe("ONNX roundtrip (serialize → parse)", () => {
    const original = buildTestModel();
    const bytes = OnnxWriter.serialize(original);
    const parsed = OnnxParser.parse(bytes);

    it("should parse back successfully", () => {
        expect(parsed).not.toBeNull();
    });

    it("should preserve irVersion", () => {
        expect(parsed!.irVersion).toBe(original.irVersion);
    });

    it("should preserve graphName", () => {
        expect(parsed!.graphName).toBe(original.graphName);
    });

    // ── Nodes ────────────────────────────────────────────────────────────

    it("should preserve node count", () => {
        expect(parsed!.nodes).toHaveLength(original.nodes.length);
    });

    it("should preserve node fields", () => {
        for (let i = 0; i < original.nodes.length; i++) {
            const src = original.nodes[i];
            const dst = parsed!.nodes[i];
            expect(dst.name).toBe(src.name);
            expect(dst.opType).toBe(src.opType);
            expect(dst.inputs).toEqual(src.inputs);
            expect(dst.outputs).toEqual(src.outputs);
        }
    });

    it("should preserve integer attributes", () => {
        const src = original.nodes[0].attributes;
        const dst = parsed!.nodes[0].attributes;
        expect(dst.get("kernel_size")).toBe(src.get("kernel_size"));
        expect(dst.get("strides")).toBe(src.get("strides"));
        expect(dst.get("pads")).toBe(src.get("pads"));
    });

    it("should preserve float attributes", () => {
        const dst = parsed!.nodes[2].attributes;
        expect(dst.get("scale_factor")).toBeCloseTo(0.5, 5);
    });

    // ── Initializers ─────────────────────────────────────────────────────

    it("should preserve initializer count", () => {
        expect(parsed!.initializers).toHaveLength(original.initializers.length);
    });

    it("should preserve initializer metadata", () => {
        for (let i = 0; i < original.initializers.length; i++) {
            const src = original.initializers[i];
            const dst = parsed!.initializers[i];
            expect(dst.name).toBe(src.name);
            expect(dst.dataType).toBe(src.dataType);
            expect(dst.dims).toEqual(src.dims);
        }
    });

    it("should preserve initializer float data", () => {
        for (let i = 0; i < original.initializers.length; i++) {
            const src = original.initializers[i];
            const dst = parsed!.initializers[i];
            expect(dst.floatData).toBeDefined();
            expect(dst.floatData!.length).toBe(src.floatData!.length);
            for (let j = 0; j < src.floatData!.length; j++) {
                expect(dst.floatData![j]).toBeCloseTo(src.floatData![j], 5);
            }
        }
    });

    // ── Inputs / Outputs / ValueInfos ────────────────────────────────────

    it("should preserve inputs", () => {
        expect(parsed!.inputs).toHaveLength(original.inputs.length);
        for (let i = 0; i < original.inputs.length; i++) {
            expect(parsed!.inputs[i].name).toBe(original.inputs[i].name);
            expect(parsed!.inputs[i].elemType).toBe(original.inputs[i].elemType);
            expect(parsed!.inputs[i].shape).toEqual(original.inputs[i].shape);
        }
    });

    it("should preserve outputs", () => {
        expect(parsed!.outputs).toHaveLength(original.outputs.length);
        for (let i = 0; i < original.outputs.length; i++) {
            expect(parsed!.outputs[i].name).toBe(original.outputs[i].name);
            expect(parsed!.outputs[i].elemType).toBe(original.outputs[i].elemType);
            expect(parsed!.outputs[i].shape).toEqual(original.outputs[i].shape);
        }
    });

    it("should preserve valueInfos", () => {
        expect(parsed!.valueInfos).toHaveLength(original.valueInfos.length);
        for (let i = 0; i < original.valueInfos.length; i++) {
            expect(parsed!.valueInfos[i].name).toBe(original.valueInfos[i].name);
            expect(parsed!.valueInfos[i].elemType).toBe(original.valueInfos[i].elemType);
            expect(parsed!.valueInfos[i].shape).toEqual(original.valueInfos[i].shape);
        }
    });

    // ── Double roundtrip ─────────────────────────────────────────────────

    it("should survive a double roundtrip", () => {
        const bytes2 = OnnxWriter.serialize(parsed!);
        const parsed2 = OnnxParser.parse(bytes2);
        expect(parsed2).not.toBeNull();
        expect(parsed2!.irVersion).toBe(original.irVersion);
        expect(parsed2!.graphName).toBe(original.graphName);
        expect(parsed2!.nodes).toHaveLength(original.nodes.length);
        expect(parsed2!.initializers).toHaveLength(original.initializers.length);
    });
});
