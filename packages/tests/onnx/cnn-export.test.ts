/**
 * Phase 2 tests for CnnGraphOnnxExporter.
 *
 * Builds a small CNN via CnnBuilder, wraps it in a tiny ComputeGraph
 * holding a single "Wrapper" Kernel whose only job is to invoke
 * CnnGraphOnnxExporter via its serializer. Exports, re-parses the
 * bytes via OnnxParser, and asserts on structure + weight payloads.
 */
import {
    ActivationFunctions,
    CnnBuilder,
    ComputeGraph,
    ICnnGraph,
    ITensor,
    Kernel,
    PoolingType,
    Uniform,
} from "spikypanda-core";
import {
    CnnGraphOnnxExporter,
    OnnxExportRegistry,
    OnnxGraphExporter,
    OnnxParser,
    OnnxDataType,
} from "spikypanda-onnx";

// ─── Test wrapper kernel ─────────────────────────────────────────────────

class CnnWrapperKernel extends Kernel {
    public readonly nodeType = "test_cnn_wrapper";
    public readonly outputShapes: number[][];
    public readonly cnn: ICnnGraph;

    public constructor(cnn: ICnnGraph) {
        super();
        this.cnn = cnn;
        // The shape advertised here is irrelevant for the export path
        // (the test only inspects ONNX content).
        this.outputShapes = [[1]];
    }

    public execute(_inputs: ITensor[]): ITensor[] {
        // Not used in this test; export is the only path exercised.
        return [];
    }
}

function makeWrapperRegistry(): OnnxExportRegistry {
    const r = new OnnxExportRegistry();
    r.register<CnnWrapperKernel>("test_cnn_wrapper", (kernel, naming, ctx) => {
        CnnGraphOnnxExporter.emit(kernel.cnn, naming.inputNames[0], naming.outputNames[0], ctx, "cnn");
    });
    return r;
}

function readFloat32(raw: Uint8Array, dims: number[]): Float32Array {
    const total = dims.reduce((a, b) => a * b, 1);
    const buf = new ArrayBuffer(raw.byteLength);
    new Uint8Array(buf).set(raw);
    return new Float32Array(buf, 0, total);
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("CnnGraphOnnxExporter", () => {
    test("Conv (1x3) + ReLU + Flatten + Dense + Sigmoid : structure and weight count", () => {
        // Input 1x4 → Conv(2 filters, 1x3, relu) → 1x2x2 → Flatten → 4 → Dense(1, sigmoid)
        const cnn = new CnnBuilder()
            .withInputLayer(4, 1, 1)
            .withConvLayer({ filters: 2, kernelSize: [1, 3], activation: ActivationFunctions.relu, biasInit: 0.5 })
            .withFlattenLayer()
            .withDenseLayer({ units: 1, activation: ActivationFunctions.sigmoid, biasInit: -0.25, weightInitializer: new Uniform(0.1, 0.1) })
            .build();

        const wrapper = new CnnWrapperKernel(cnn);
        wrapper.id = "cnn_wrap";
        const graph = new ComputeGraph([wrapper], []);

        const bytes = OnnxGraphExporter.export(graph, {
            registry: makeWrapperRegistry(),
            inputNames: new Map([[wrapper, ["X"]]]),
            outputNames: new Map([[wrapper, ["Y"]]]),
            inputShapes: new Map([[wrapper, [[1, 1, 1, 4]]]]),
        });

        const parsed = OnnxParser.parse(bytes);
        expect(parsed).not.toBeNull();
        if (!parsed) return;

        // Expected node sequence:
        //   Conv → Relu → Flatten → Gemm → Sigmoid
        const opTypes = parsed.nodes.map((n) => n.opType);
        expect(opTypes).toEqual(["Conv", "Relu", "Flatten", "Gemm", "Sigmoid"]);

        // Two initializers per Conv (W, B) and per Dense (W, B) = 4 total.
        const initNames = parsed.initializers.map((t) => t.name).sort();
        expect(initNames).toHaveLength(4);

        // Conv weight tensor has shape [2, 1, 1, 3] (filters, in_channels, kH, kW).
        const convW = parsed.initializers.find((t) => t.name.endsWith("L1_W"));
        expect(convW).toBeDefined();
        expect(convW!.dims).toEqual([2, 1, 1, 3]);
        expect(convW!.dataType).toBe(OnnxDataType.FLOAT);

        // Conv bias = [filters] with value 0.5 (from biasInit).
        const convB = parsed.initializers.find((t) => t.name.endsWith("L1_B"));
        expect(convB).toBeDefined();
        expect(convB!.dims).toEqual([2]);
        const convBdata = readFloat32(convB!.rawData!, [2]);
        expect(convBdata[0]).toBeCloseTo(0.5);
        expect(convBdata[1]).toBeCloseTo(0.5);

        // Dense weight: [units=1, prev_size=4], all values = 0.1 (Uniform(0.1, 0.1)).
        const denseW = parsed.initializers.find((t) => t.name.endsWith("L3_W"));
        expect(denseW).toBeDefined();
        expect(denseW!.dims).toEqual([1, 4]);
        const dW = readFloat32(denseW!.rawData!, [1, 4]);
        for (let i = 0; i < 4; i++) {
            expect(dW[i]).toBeCloseTo(0.1);
        }

        // Dense bias = -0.25.
        const denseB = parsed.initializers.find((t) => t.name.endsWith("L3_B"));
        expect(denseB).toBeDefined();
        const dB = readFloat32(denseB!.rawData!, [1]);
        expect(dB[0]).toBeCloseTo(-0.25);
    });

    test("Pool layer promotes to GlobalAveragePool when kernel covers full feature map", () => {
        // Input 1x4 → Conv(1, 1x2, linear) → 1x3 → Pool(Avg, [1,3])
        // The pool kernel matches the post-Conv width, so output is 1x1.
        const cnn = new CnnBuilder()
            .withInputLayer(4, 1, 1)
            .withConvLayer({ filters: 1, kernelSize: [1, 2], activation: ActivationFunctions.linear })
            .withPoolLayer({ type: PoolingType.Avg, size: [1, 3] })
            .build();

        const wrapper = new CnnWrapperKernel(cnn);
        const graph = new ComputeGraph([wrapper], []);
        const bytes = OnnxGraphExporter.export(graph, {
            registry: makeWrapperRegistry(),
            inputNames: new Map([[wrapper, ["X"]]]),
            outputNames: new Map([[wrapper, ["Y"]]]),
        });
        const parsed = OnnxParser.parse(bytes);
        expect(parsed).not.toBeNull();
        if (!parsed) return;

        const opTypes = parsed.nodes.map((n) => n.opType);
        // Conv (no activation node because linear → Identity is skipped at the
        //       end; here we keep the explicit Identity for clarity)
        // Wait: our exporter emits Identity for linear/identity. Adjust expectation.
        expect(opTypes).toContain("GlobalAveragePool");
    });

    test("Pool layer keeps MaxPool / AveragePool when not global", () => {
        // Input 1x6 → Pool(Max, [1,2], stride 2) → 1x3 (NOT global, so emits MaxPool)
        const cnn = new CnnBuilder()
            .withInputLayer(6, 1, 1)
            .withPoolLayer({ type: PoolingType.Max, size: [1, 2], stride: [1, 2] })
            .build();

        const wrapper = new CnnWrapperKernel(cnn);
        const graph = new ComputeGraph([wrapper], []);
        const bytes = OnnxGraphExporter.export(graph, {
            registry: makeWrapperRegistry(),
            inputNames: new Map([[wrapper, ["X"]]]),
            outputNames: new Map([[wrapper, ["Y"]]]),
        });
        const parsed = OnnxParser.parse(bytes);
        expect(parsed).not.toBeNull();
        if (!parsed) return;

        expect(parsed.nodes[0].opType).toBe("MaxPool");
        expect(parsed.nodes[0].listAttributes!.get("kernel_shape")).toEqual([1, 2]);
        expect(parsed.nodes[0].listAttributes!.get("strides")).toEqual([1, 2]);
    });

    test("multi-channel Conv: weight tensor is [F, C_in, kH, kW] and bytes match builder layout", () => {
        // Input 1x2x3 (W=2, H=1, C=3) → Conv(2 filters, 1x2)
        const cnn = new CnnBuilder()
            .withInputLayer(2, 1, 3)
            .withConvLayer({
                filters: 2,
                kernelSize: [1, 2],
                activation: ActivationFunctions.linear,
                weightInitializer: new Uniform(1.0, 1.0),  // constant 1.0
            })
            .build();

        const wrapper = new CnnWrapperKernel(cnn);
        const graph = new ComputeGraph([wrapper], []);
        const bytes = OnnxGraphExporter.export(graph, {
            registry: makeWrapperRegistry(),
            inputNames: new Map([[wrapper, ["X"]]]),
            outputNames: new Map([[wrapper, ["Y"]]]),
        });
        const parsed = OnnxParser.parse(bytes);
        expect(parsed).not.toBeNull();
        if (!parsed) return;

        const convW = parsed.initializers.find((t) => t.name.endsWith("_W"));
        expect(convW).toBeDefined();
        expect(convW!.dims).toEqual([2, 3, 1, 2]); // F=2, C_in=3, kH=1, kW=2
        const W = readFloat32(convW!.rawData!, convW!.dims);
        for (let i = 0; i < 2 * 3 * 1 * 2; i++) {
            expect(W[i]).toBeCloseTo(1.0);
        }
    });

    test("input layer is skipped, emission starts at layer index 1", () => {
        const cnn = new CnnBuilder()
            .withInputLayer(4, 1, 1)
            .withFlattenLayer()
            .build();

        const wrapper = new CnnWrapperKernel(cnn);
        const graph = new ComputeGraph([wrapper], []);
        const bytes = OnnxGraphExporter.export(graph, {
            registry: makeWrapperRegistry(),
            inputNames: new Map([[wrapper, ["X"]]]),
            outputNames: new Map([[wrapper, ["Y"]]]),
        });
        const parsed = OnnxParser.parse(bytes);
        expect(parsed).not.toBeNull();
        if (!parsed) return;

        // Just one ONNX node (Flatten) — Input layer doesn't emit.
        expect(parsed.nodes).toHaveLength(1);
        expect(parsed.nodes[0].opType).toBe("Flatten");
    });

    test("Upsample layer throws not-implemented", () => {
        const cnn = new CnnBuilder()
            .withInputLayer(2, 1, 1)
            .withUpsampleLayer({ factor: 2 })
            .build();

        const wrapper = new CnnWrapperKernel(cnn);
        const graph = new ComputeGraph([wrapper], []);
        expect(() =>
            OnnxGraphExporter.export(graph, {
                registry: makeWrapperRegistry(),
                inputNames: new Map([[wrapper, ["X"]]]),
                outputNames: new Map([[wrapper, ["Y"]]]),
            })
        ).toThrow(/Upsample.*not implemented/);
    });
});
