/**
 * Demo-model artifact export (same test-as-generator pattern as the
 * cardriver ONNX artifact dump): writes the deterministic, fixed-weight
 * demo models the EDITOR graphs reference into
 * packages/host/www/data/models/, then proves each file round-trips
 * through the validated loader.
 *
 *   - motorwatch-encoder-demo.onnx : the encoder the motorwatch-r385
 *     graph's model node asks for ("drop motorwatch-encoder-demo.onnx"),
 *     input "current_window" (1, 1, 64), output "embedding" (1, 5).
 *   - motorwatch-diagnostic-demo.onnx : a 3-cause differential head
 *     over the l2-normalized embedding (nominal / overload_step /
 *     fan_quadratic), the same shape the central station pushes.
 *
 * The bytes are pure functions of the fixed weights in helpers.ts:
 * re-running this suite regenerates byte-identical files, so they are
 * safe to version and safe to delete (one jest run brings them back).
 */
import * as fs from "fs";
import * as path from "path";
import { OnnxParser } from "spikypanda-onnx";
import { OnnxModelGraph } from "../../dev/plugins/onnx/src/graphs/model.graph";
import { sha256Hex } from "../../dev/plugins/onnx/src/graphs/sha256";
import { buildDiagnosticBytes, buildEncoderBytes, ENCODER_DIM } from "./helpers";

const MODELS_DIR = path.resolve(__dirname, "../../host/www/data/models");
const FRAME = 64;

/** Demo diagnostic head: scores = e W + viscousFriction for causes
 *  [nominal, overload_step, fan_quadratic]. Columns favor, in order:
 *  the low band + bias (nominal), band 2 (overload), band 3 + slope
 *  (quadratic), mirroring the calibrated r385 e2e weighting. */
function buildDemoDiagnosticBytes(): Uint8Array {
    // Row-major [ENCODER_DIM][3]: embedding dims are
    // [band1, band2, band3, |slope|, bias].
    // prettier-ignore
    const weights = [
        //  nominal  overload  fan_quadratic
        1.0, 0.5, -0.5,
        -1.0, 2.5, 0.5,
        -1.5, -0.5, 3.0,
        0.0, 0.0, 1.0,
        2.0, -1.0, -1.0,
    ];
    const bias = [0.0, 0.0, 0.0];
    return buildDiagnosticBytes(ENCODER_DIM, 3, weights, bias);
}

describe("demo model artifacts (packages/host/www/data/models)", () => {
    beforeAll(() => {
        fs.mkdirSync(MODELS_DIR, { recursive: true });
    });

    test("motorwatch-encoder-demo.onnx is written and loads through the validated channel", () => {
        const bytes = buildEncoderBytes(FRAME);
        const file = path.join(MODELS_DIR, "motorwatch-encoder-demo.onnx");
        fs.writeFileSync(file, bytes);

        const graph = new OnnxModelGraph();
        const report = graph.loadModelValidated(fs.readFileSync(file), {
            name: "motorwatch-encoder-demo.onnx",
            expectInputShape: [1, 1, FRAME],
            expectOutputCount: 1,
        });
        expect(report.ok).toBe(true);
        expect(report.inputNames).toEqual(["current_window"]);
        expect(report.outputNames).toEqual(["embedding"]);
        // Deterministic artifact: re-synthesis gives the same bytes.
        expect(sha256Hex(buildEncoderBytes(FRAME))).toBe(sha256Hex(bytes));
    });

    test("motorwatch-encoder-demo.onnx carries the DriverV2 demo topology (3x Conv1d + GAP + Gemm head)", () => {
        const parsed = OnnxParser.parse(buildEncoderBytes(FRAME));
        expect(parsed).not.toBeNull();
        if (!parsed) return;

        // Topology parity with the DriverV2 reference encoder: exactly
        // three Conv stages and one GlobalAveragePool, Gemm head after
        // the Flatten (fixed handcrafted weights, NOT trained).
        const opTypes = parsed.nodes.map((n) => n.opType);
        expect(opTypes).toEqual(["Conv", "Relu", "Conv", "Relu", "Conv", "Relu", "GlobalAveragePool", "Flatten", "Gemm"]);
        expect(opTypes.filter((op) => op === "Conv")).toHaveLength(3);
        expect(opTypes.filter((op) => op === "GlobalAveragePool")).toHaveLength(1);

        // Parameter budget: every float initializer element is a weight
        // or a bias. 8x1x5+8 + 2x(8x8x3+8) + 8x5+5 = 493.
        const paramCount = parsed.initializers.reduce((sum, t) => sum + t.dims.reduce((a, b) => a * b, 1), 0);
        // eslint-disable-next-line no-console
        console.log(`motorwatch-encoder-demo.onnx parameters (weights + biases): ${paramCount}`);
        expect(paramCount).toBe(493);
    });

    test("motorwatch-diagnostic-demo.onnx is written and matches the 3-cause contract", () => {
        const bytes = buildDemoDiagnosticBytes();
        const file = path.join(MODELS_DIR, "motorwatch-diagnostic-demo.onnx");
        fs.writeFileSync(file, bytes);

        const graph = new OnnxModelGraph();
        const report = graph.loadModelValidated(fs.readFileSync(file), {
            name: "motorwatch-diagnostic-demo.onnx",
            expectInputShape: [1, ENCODER_DIM],
            expectOutputShape: [1, 3],
        });
        expect(report.ok).toBe(true);
        expect(report.outputNames).toEqual(["cause_scores"]);
        expect(sha256Hex(buildDemoDiagnosticBytes())).toBe(sha256Hex(bytes));
    });
});
