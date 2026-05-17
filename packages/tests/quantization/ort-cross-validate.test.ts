/**
 * Cross-validation against onnxruntime.
 *
 * The TS round-trip test (`quantized-roundtrip.test.ts`) checks our
 * fake-quant import against the *FP32* native CNN — that's a "did
 * quantization preserve the answer" test. It does NOT prove that our
 * TS implementations of QLinearConv / QLinearMatMul / QuantizeLinear /
 * DequantizeLinear actually agree with the ONNX spec : a buggy TS impl
 * could happen to land near the FP32 answer for one tolerance band.
 *
 * This test closes that loop. It exports the same quantized graph, runs
 * inference twice — once through our TS pipeline, once through Python's
 * onnxruntime (the reference int8 kernel implementation) — and compares
 * the two outputs. They should agree to within rounding noise, because
 * both are computing the *same* int8 ONNX graph with the *same* QLinear
 * semantics on the *same* input.
 *
 * If they differ by more than ~1e-4, that's a real semantic gap in our
 * TS QLinear ops — independent of how well quantization preserves the
 * FP32 answer.
 *
 * The test is gated on Python + onnxruntime being available; if either
 * is missing the test is skipped (it prints a hint, doesn't fail).
 */
import { execFileSync, spawnSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

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

function deterministicSamples(count: number): number[][] {
    const out: number[][] = [];
    for (let t = 0; t < count; t++) {
        out.push([
            Math.sin(t * 0.3),
            Math.cos(t * 0.4),
            0.4 * t - 1,
            Math.sin(t * 0.7) + 0.2,
            -0.3 + Math.cos(t * 0.55),
            0.1 * t,
        ]);
    }
    return out;
}

function pythonAvailable(): { exe: string; reason?: string } | null {
    // Try `python` first, then `python3`. We probe both for onnxruntime.
    for (const exe of ["python", "python3"]) {
        try {
            const r = spawnSync(exe, ["-c", "import onnxruntime, onnx, numpy"], {
                stdio: "pipe",
            });
            if (r.status === 0) return { exe };
        } catch {
            // try next
        }
    }
    return null;
}

describe("Phase 7.6 — cross-validate TS fake-quant against onnxruntime", () => {
    const probe = pythonAvailable();
    const itOrSkip = probe ? test : test.skip;

    itOrSkip("TS fake-quant agrees with ORT on the same exported graph", () => {
        // ── 1. Build, calibrate, quantize, export. ──────────────────
        const cnn = buildCnn();
        const runtime = new CnnInferenceRuntime(cnn, ActivationFunctions.relu);
        const calib = CnnLayerCalibrationHelper.observe(cnn, runtime, deterministicSamples(20));
        const qcnn = QuantizedCnnGraphBuilder.fromCalibration(cnn, calib);

        const ctx = new DefaultOnnxExportContext();
        QuantizedCnnGraphOnnxExporter.emit(qcnn, "x", "y", ctx, "qcnn");
        const bytes = OnnxWriter.serialize({
            irVersion: 8,
            graphName: "qcnn-cross-validate",
            nodes: ctx.nodes,
            initializers: ctx.initializers,
            inputs: [{ name: "x", type: 1, elemType: 1, shape: [1, 1, 1, 6] }],
            outputs: [{ name: "y", type: 2, elemType: 1, shape: [1, 3] }],
            valueInfos: [],
        });

        // ── 2. Run inference on both pipelines. ─────────────────────
        const testInput = [0.4, -0.6, 0.1, 0.8, -0.2, 0.55];

        // FP32 native (for context).
        const fp32Output = runtime.run(testInput);

        // TS fake-quant: re-parse, re-build, infer.
        const parsed = OnnxParser.parse(bytes)!;
        const { graph: imported } = new OnnxGraphBuilder(makeImportRegistry()).build(parsed);
        const inputTensor: ITensor = {
            data: Float32Array.from(testInput),
            shape: [1, 1, 1, 6],
            name: "x",
        };
        const results = imported.infer(new Map([["x", inputTensor]]));
        const tsFakeQuant = Array.from(results.get("y")!.data);

        // ── 3. Dump artifacts to a temp directory. ──────────────────
        const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "qcnn-xv-"));
        try {
            fs.writeFileSync(path.join(tmp, "qcnn.onnx"), Buffer.from(bytes));
            fs.writeFileSync(
                path.join(tmp, "input.json"),
                JSON.stringify({ name: "x", shape: [1, 1, 1, 6], data: testInput })
            );
            fs.writeFileSync(path.join(tmp, "ts_fake_quant.json"), JSON.stringify(tsFakeQuant));
            fs.writeFileSync(path.join(tmp, "fp32_native.json"), JSON.stringify(fp32Output));

            // ── 4. Shell out to Python / onnxruntime. ───────────────
            const script = path.resolve(__dirname, "scripts", "verify-with-ort.py");
            const out = execFileSync(probe!.exe, [script, tmp], { encoding: "utf-8" });
            // eslint-disable-next-line no-console
            console.log(out);

            // ── 5. Parse verdict.json and assert. ───────────────────
            const verdict = JSON.parse(
                fs.readFileSync(path.join(tmp, "verdict.json"), "utf-8")
            ) as {
                max_abs_diff_ts_vs_ort: number;
                max_abs_diff_fp32_vs_ort: number;
                ts_fake_quant: number[];
                ort_output: number[];
            };

            // TS fake-quant should match ORT bit-for-bit modulo float
            // rounding (both are FP32 simulations of int8 kernels). 1e-4
            // is generous : in practice the difference should be much
            // tighter when our impl is correct.
            expect(verdict.max_abs_diff_ts_vs_ort).toBeLessThan(1e-4);
        } finally {
            // Leave the tmp dir on failure (handy for inspection), wipe on success.
            // Jest's expect throws synchronously, so reaching this `finally` after
            // a failure means we keep the directory; after success we tidy up.
            // We detect by checking whether jest currently has a failure flag — a
            // bit awkward, so we use the simpler rule: always remove. If you need
            // to inspect, rerun and add a `console.log(tmp)` before the assertion.
            try {
                fs.rmSync(tmp, { recursive: true, force: true });
            } catch {
                /* ignore */
            }
        }
    });
});
