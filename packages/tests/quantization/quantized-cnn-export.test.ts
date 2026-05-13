/**
 * Phase 7.5 — QuantizedCnnGraphOnnxExporter test.
 *
 * Builds a small CNN, calibrates per-layer, quantizes, exports
 * to ONNX bytes, then re-parses the bytes via OnnxParser and asserts
 * on the resulting ONNX content (no inference comparison yet — that
 * needs Phase 7.6's TS fake-quant ops, or onnxruntime in Python):
 *
 *   - Expected sequence: QuantizeLinear → QLinearConv → Relu → ...
 *     → QLinearMatMul → Add → DequantizeLinear
 *   - Conv layer initializers: int8 OIHW weights, fp32[F] scales,
 *     int8[F] zero_points (all 0), int32[F] biases, scalar scales/zps
 *   - Dense layer initializers: int8 [prev, units] (transposed),
 *     fp32[1] scale, int8[1] zp, int8[units] bias, scalar scales/zps
 *   - Topology: pre-bracketed by Q, post-bracketed by DQ, FP32 boundary
 */
import {
    ActivationFunctions,
    CnnBuilder,
    CnnInferenceRuntime,
    CnnLayerCalibrationHelper,
    PoolingType,
    QuantizedCnnGraphBuilder,
    Uniform,
} from "spikypanda-core";
import {
    DefaultOnnxExportContext,
    OnnxDataType,
    OnnxParser,
    OnnxWriter,
    QuantizedCnnGraphOnnxExporter,
} from "spikypanda-onnx";

// ─── Helpers ─────────────────────────────────────────────────────────────

function buildQuantizedCnn() {
    const cnn = new CnnBuilder()
        .withInputLayer(6, 1, 1)
        .withConvLayer({
            filters: 2,
            kernelSize: [1, 3],
            activation: ActivationFunctions.relu,
            weightInitializer: new Uniform(-0.3, 0.3),
            biasInit: 0,
        })
        .withPoolLayer({ type: PoolingType.Avg, size: [1, 2] })
        .withFlattenLayer()
        .withDenseLayer({
            units: 3,
            activation: ActivationFunctions.linear,
            weightInitializer: new Uniform(-0.4, 0.4),
            biasInit: 0.1,
        })
        .build();
    const runtime = new CnnInferenceRuntime(cnn, ActivationFunctions.relu);
    const samples: number[][] = [];
    for (let t = 0; t < 12; t++) {
        samples.push([
            Math.sin(t * 0.3),
            Math.cos(t * 0.4),
            0.4 * t - 1,
            Math.sin(t * 0.7) + 0.2,
            -0.3 + Math.cos(t * 0.55),
            0.1 * t,
        ]);
    }
    const calib = CnnLayerCalibrationHelper.observe(cnn, runtime, samples);
    const q = QuantizedCnnGraphBuilder.fromCalibration(cnn, calib);
    return q;
}

function emit(qcnn: ReturnType<typeof buildQuantizedCnn>) {
    const ctx = new DefaultOnnxExportContext();
    QuantizedCnnGraphOnnxExporter.emit(qcnn, "x", "y", ctx, "qcnn");
    return ctx;
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("QuantizedCnnGraphOnnxExporter", () => {
    test("emits the expected op sequence (Quantize → QLinearConv → Relu → Pool → Flatten → QLinearMatMul → Add → Dequantize)", () => {
        const qcnn = buildQuantizedCnn();
        const ctx = emit(qcnn);

        const opTypes = ctx.nodes.map((n) => n.opType);
        // QuantizeLinear at entry.
        expect(opTypes[0]).toBe("QuantizeLinear");
        // DequantizeLinear at exit.
        expect(opTypes[opTypes.length - 1]).toBe("DequantizeLinear");
        // Core quantized ops present in order.
        expect(opTypes).toContain("QLinearConv");
        expect(opTypes).toContain("Relu");
        expect(opTypes).toContain("AveragePool");
        expect(opTypes).toContain("Flatten");
        expect(opTypes).toContain("QLinearMatMul");
        // Bias add after QLinearMatMul.
        expect(opTypes).toContain("Add");

        // Order: QLinearConv comes before Relu (post-Conv activation).
        const convIdx = opTypes.indexOf("QLinearConv");
        const reluIdx = opTypes.indexOf("Relu");
        expect(convIdx).toBeLessThan(reluIdx);
        // QLinearMatMul comes before its Add.
        const matmulIdx = opTypes.indexOf("QLinearMatMul");
        const addIdx = opTypes.indexOf("Add");
        expect(matmulIdx).toBeLessThan(addIdx);
    });

    test("Conv emits the full QLinearConv initializer set with correct dtypes", () => {
        const qcnn = buildQuantizedCnn();
        const ctx = emit(qcnn);
        const inits = new Map(ctx.initializers.map((i) => [i.name, i]));
        const convNode = ctx.nodes.find((n) => n.opType === "QLinearConv")!;
        expect(convNode.inputs).toHaveLength(9);
        // The 8 named initializers (the 1st input is the upstream tensor).
        const [, xScale, xZp, w, wScale, wZp, yScale, yZp, bias] = convNode.inputs;

        expect(inits.get(xScale)?.dataType).toBe(OnnxDataType.FLOAT);
        expect(inits.get(xZp)?.dataType).toBe(OnnxDataType.INT8);
        expect(inits.get(w)?.dataType).toBe(OnnxDataType.INT8);
        expect(inits.get(w)?.dims).toEqual([2, 1, 1, 3]);  // OIHW: F=2, Cin=1, kH=1, kW=3
        expect(inits.get(wScale)?.dataType).toBe(OnnxDataType.FLOAT);
        expect(inits.get(wScale)?.dims).toEqual([2]);      // per-channel, F entries
        expect(inits.get(wZp)?.dataType).toBe(OnnxDataType.INT8);
        expect(inits.get(wZp)?.dims).toEqual([2]);         // per-channel zero_points
        expect(inits.get(yScale)?.dataType).toBe(OnnxDataType.FLOAT);
        expect(inits.get(yZp)?.dataType).toBe(OnnxDataType.INT8);
        expect(inits.get(bias)?.dataType).toBe(OnnxDataType.INT32);
        expect(inits.get(bias)?.dims).toEqual([2]);        // [F]
    });

    test("QLinearMatMul emits 8 inputs (no separate bias) + Add for the bias", () => {
        const qcnn = buildQuantizedCnn();
        const ctx = emit(qcnn);
        const matmul = ctx.nodes.find((n) => n.opType === "QLinearMatMul")!;
        expect(matmul.inputs).toHaveLength(8);
        // Weight is transposed to [prev_size, units].
        const wName = matmul.inputs[3];
        const w = ctx.initializers.find((i) => i.name === wName)!;
        const [prevSize, units] = w.dims;
        expect(units).toBe(3);
        expect(prevSize).toBeGreaterThan(0);
        // Bias added separately as int8 via an Add op consuming the
        // QLinearMatMul output.
        const add = ctx.nodes.find((n) => n.opType === "Add")!;
        expect(add.inputs[0]).toBe(matmul.outputs[0]);
    });

    test("entry QuantizeLinear and exit DequantizeLinear bracket the int8 inner graph", () => {
        const qcnn = buildQuantizedCnn();
        const ctx = emit(qcnn);
        const q = ctx.nodes[0];
        const dq = ctx.nodes[ctx.nodes.length - 1];
        expect(q.opType).toBe("QuantizeLinear");
        expect(q.inputs[0]).toBe("x");                          // FP32 graph input
        expect(dq.opType).toBe("DequantizeLinear");
        expect(dq.outputs[0]).toBe("y");                        // FP32 graph output
    });

    test("end-to-end: serialize → re-parse via OnnxParser", () => {
        const qcnn = buildQuantizedCnn();
        const ctx = emit(qcnn);
        const bytes = OnnxWriter.serialize({
            irVersion: 8,
            graphName: "quantized-cnn-test",
            nodes: ctx.nodes,
            initializers: ctx.initializers,
            inputs: [],
            outputs: [],
            valueInfos: [],
        });
        const parsed = OnnxParser.parse(bytes);
        expect(parsed).not.toBeNull();
        if (!parsed) return;
        // Same number of nodes + initializers as we emitted.
        expect(parsed.nodes).toHaveLength(ctx.nodes.length);
        expect(parsed.initializers).toHaveLength(ctx.initializers.length);
        // int8 initializers came back with dataType = INT8.
        const wEntries = parsed.initializers.filter((t) => t.dataType === OnnxDataType.INT8);
        expect(wEntries.length).toBeGreaterThan(0);
        // QLinearConv kernel_shape attribute round-trips as list.
        const qconv = parsed.nodes.find((n) => n.opType === "QLinearConv")!;
        expect(qconv.listAttributes?.get("kernel_shape")).toEqual([1, 3]);
    });
});
