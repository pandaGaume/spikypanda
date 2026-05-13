/**
 * Phase 7.6 — end-to-end quantized round-trip TS-only.
 *
 *   FP32 CNN
 *     ↓ CnnLayerCalibrationHelper (per-layer activation params)
 *     ↓ QuantizedCnnGraphBuilder
 *     ↓ QuantizedCnnGraphOnnxExporter → bytes
 *     ↓ OnnxParser
 *     ↓ OnnxGraphBuilder (registerQuantOps registered)
 *     ↓ ComputeGraph.infer (fake-quant TS execution)
 *   ──> embedding
 *
 * The fake-quant embedding should match the FP32 native CNN's output
 * within a quantization-tolerance band (a few percent of the dynamic
 * range, depending on the bit width and the calibration quality).
 */
import {
    ActivationFunctions,
    CnnBuilder,
    CnnInferenceRuntime,
    CnnLayerCalibrationHelper,
    ITensor,
    QuantizedCnnGraphBuilder,
    Uniform,
} from "spikypanda-core";
import {
    DefaultOnnxExportContext,
    OnnxGraphBuilder,
    OnnxParser,
    OnnxWriter,
    QuantizedCnnGraphOnnxExporter,
    registerMathOps,
    registerActivationOps,
    registerMatrixOps,
    registerConvOps,
    registerMiscOps,
    registerQuantOps,
    OnnxOpRegistry,
} from "spikypanda-onnx";

function makeImportRegistry(): OnnxOpRegistry {
    const r = new OnnxOpRegistry();
    registerMathOps(r);
    registerActivationOps(r);
    registerMatrixOps(r);
    registerConvOps(r);
    registerMiscOps(r);
    registerQuantOps(r);
    return r;
}

function buildCnn() {
    return new CnnBuilder()
        .withInputLayer(6, 1, 1)
        .withConvLayer({
            filters: 2,
            kernelSize: [1, 3],
            activation: ActivationFunctions.relu,
            weightInitializer: new Uniform(-0.3, 0.3),
            biasInit: 0,
        })
        .withDenseLayer({
            units: 3,
            activation: ActivationFunctions.linear,
            weightInitializer: new Uniform(-0.4, 0.4),
            biasInit: 0,
        })
        .build();
}

function deterministicSamples(count: number, features: number = 6): number[][] {
    const basis = (t: number): number[] => [
        Math.sin(t * 0.3),
        Math.cos(t * 0.4),
        0.4 * t - 1,
        Math.sin(t * 0.7) + 0.2,
        -0.3 + Math.cos(t * 0.55),
        0.1 * t,
    ];
    const out: number[][] = [];
    for (let t = 0; t < count; t++) {
        out.push(basis(t).slice(0, features));
    }
    return out;
}

describe("Phase 7.6 — quantized CNN ONNX round-trip in TS", () => {
    test("fake-quant inference reproduces FP32 native CNN within quantization tolerance", () => {
        // 1. Build & "train" CNN (deterministic init substitutes for training).
        const cnn = buildCnn();
        const runtime = new CnnInferenceRuntime(cnn, ActivationFunctions.relu);

        // 2. Calibrate per-layer with a representative sample set.
        const calibrationSamples = deterministicSamples(20);
        const calib = CnnLayerCalibrationHelper.observe(cnn, runtime, calibrationSamples);

        // 3. Assemble the quantized graph.
        const qcnn = QuantizedCnnGraphBuilder.fromCalibration(cnn, calib);

        // 4. Export → bytes (with proper graph input/output declarations
        //    so the imported graph's infer() works).
        const ctx = new DefaultOnnxExportContext();
        QuantizedCnnGraphOnnxExporter.emit(qcnn, "x", "y", ctx, "qcnn");
        const bytes = OnnxWriter.serialize({
            irVersion: 8,
            graphName: "quantized-roundtrip-test",
            nodes: ctx.nodes,
            initializers: ctx.initializers,
            inputs: [
                { name: "x", type: 1, elemType: 1, shape: [1, 1, 1, 6] },
            ],
            outputs: [
                { name: "y", type: 2, elemType: 1, shape: [1, 3] },
            ],
            valueInfos: [],
        });
        expect(bytes.byteLength).toBeGreaterThan(0);

        // 5. Re-parse and re-instantiate.
        const parsed = OnnxParser.parse(bytes);
        expect(parsed).not.toBeNull();
        const importRegistry = makeImportRegistry();
        const builder = new OnnxGraphBuilder(importRegistry);
        const { graph: imported } = builder.build(parsed!);

        // 6. Run inference on a fresh sample (not in the calibration set)
        //    through BOTH the FP32 native CNN and the fake-quant ONNX
        //    graph, then compare.
        const testInput = [0.4, -0.6, 0.1, 0.8, -0.2, 0.55];
        const fp32Output = runtime.run(testInput);
        expect(fp32Output).toHaveLength(3);

        // ONNX import: feed [1, 1, 1, 6] NCHW tensor at "x", read [1, 3] at "y".
        const inputTensor: ITensor = {
            data: Float32Array.from(testInput),
            shape: [1, 1, 1, 6],
            name: "x",
        };
        const results = imported.infer(new Map([["x", inputTensor]]));
        const yTensor = results.get("y");
        expect(yTensor).toBeDefined();
        expect(yTensor!.data).toHaveLength(3);

        // Tolerance: PTQ on a tiny untrained CNN with min/max calibration
        // on a small sample set yields error in the order of a few percent
        // of the calibration dynamic range (which dominates here, since
        // weights are random). We bound the error by a fraction of the
        // FP32 output magnitude, with an absolute floor for tiny outputs.
        const maxAbs = Math.max(...fp32Output.map(Math.abs));
        const tolerance = Math.max(0.05, 0.25 * maxAbs);
        for (let i = 0; i < 3; i++) {
            const diff = Math.abs(yTensor!.data[i] - fp32Output[i]);
            expect(diff).toBeLessThan(tolerance);
        }
    });

    test("imported graph carries quantization metadata on intermediate tensors", () => {
        const cnn = new CnnBuilder()
            .withInputLayer(4, 1, 1)
            .withConvLayer({
                filters: 2,
                kernelSize: [1, 2],
                activation: ActivationFunctions.relu,
                weightInitializer: new Uniform(-0.2, 0.2),
            })
            .build();
        const runtime = new CnnInferenceRuntime(cnn, ActivationFunctions.relu);
        const calib = CnnLayerCalibrationHelper.observe(cnn, runtime, deterministicSamples(6, 4));
        const qcnn = QuantizedCnnGraphBuilder.fromCalibration(cnn, calib);
        const ctx = new DefaultOnnxExportContext();
        QuantizedCnnGraphOnnxExporter.emit(qcnn, "x", "y", ctx, "qcnn");
        const bytes = OnnxWriter.serialize({
            irVersion: 8, graphName: "quant-meta",
            nodes: ctx.nodes, initializers: ctx.initializers,
            inputs: [{ name: "x", type: 1, elemType: 1, shape: [1, 1, 1, 4] }],
            outputs: [{ name: "y", type: 2, elemType: 1, shape: [1, 2, 1, 3] }],
            valueInfos: [],
        });
        const parsed = OnnxParser.parse(bytes)!;
        const { graph: imported } = new OnnxGraphBuilder(makeImportRegistry()).build(parsed);

        const inp: ITensor = { data: Float32Array.from([0.1, -0.2, 0.3, 0.4]), shape: [1, 1, 1, 4], name: "x" };
        imported.infer(new Map([["x", inp]]));

        // Walk imported.nodes and look for a QLinearConv kernel's output
        // tensor — it should be tagged with quantization metadata.
        const qconv = imported.nodes.find((n) => (n as { opType?: string }).opType === "QLinearConv") as { bag?: { lastOutputs?: ITensor[] } } | undefined;
        expect(qconv).toBeDefined();
        const conv_out = qconv?.bag?.lastOutputs?.[0];
        expect(conv_out).toBeDefined();
        expect(conv_out!.quantization).toBeDefined();
        expect(conv_out!.quantization!.dtype).toBe("int8");
    });
});
