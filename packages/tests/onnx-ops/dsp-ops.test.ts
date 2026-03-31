/**
 * DSP operator conformance tests.
 *
 * Compares SpikyPanda DSP ops (SpFFT, SpMelFilterbank, SpDCT, SpMFCC, etc.)
 * against numpy/scipy reference vectors.
 */
import * as fs from "fs";
import * as path from "path";
import type { ITensor } from "../../dev/runtime/src/compute/compute.interfaces";
import { OnnxOpRegistry } from "../../dev/runtime/src/onnx/registry";
import { registerDspOps } from "../../dev/runtime/src/onnx/ops/dsp";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DspTestCase {
    op: string;
    input: { shape: number[]; data: number[] };
    output: { shape: number[]; data: number[] };
    attrs: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const VECTORS_PATH = path.resolve(__dirname, "dsp-test-vectors.json");
let testCases: DspTestCase[] = [];
let registry: OnnxOpRegistry;

function toTensor(v: { shape: number[]; data: number[] }): ITensor {
    return { data: new Float32Array(v.data), shape: [...v.shape] };
}

function buildAttributes(attrs: Record<string, number>): Map<string, number> {
    const map = new Map<string, number>();
    for (const [k, v] of Object.entries(attrs)) {
        map.set(k, v);
    }
    return map;
}

beforeAll(() => {
    if (!fs.existsSync(VECTORS_PATH)) {
        throw new Error(
            `DSP test vectors not found at ${VECTORS_PATH}.\n` +
            `Run: python packages/tests/onnx-ops/generate_dsp_vectors.py`,
        );
    }
    testCases = JSON.parse(fs.readFileSync(VECTORS_PATH, "utf-8"));

    registry = new OnnxOpRegistry();
    registerDspOps(registry);
});

// ---------------------------------------------------------------------------
// Tolerance
// ---------------------------------------------------------------------------

const DEFAULT_ATOL = 1e-2; // DSP ops have larger floating-point differences due to FFT precision
const DEFAULT_RTOL = 1e-2;

function assertClose(actual: Float32Array, expected: Float32Array, label: string, atol = DEFAULT_ATOL, rtol = DEFAULT_RTOL) {
    expect(actual.length).toBe(expected.length);
    let maxDiff = 0;
    let maxIdx = 0;
    for (let i = 0; i < expected.length; i++) {
        const diff = Math.abs(actual[i] - expected[i]);
        const tol = atol + rtol * Math.abs(expected[i]);
        if (diff > maxDiff) { maxDiff = diff; maxIdx = i; }
        if (diff > tol) {
            throw new Error(
                `${label} mismatch at index ${i}: got ${actual[i]}, expected ${expected[i]} (diff=${diff}, tol=${tol})\n` +
                `Max diff so far: ${maxDiff} at index ${maxIdx}`,
            );
        }
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("DSP ops vs numpy/scipy reference", () => {
    it("should have DSP test vectors loaded", () => {
        expect(testCases.length).toBeGreaterThan(0);
        console.log(`Loaded ${testCases.length} DSP test vectors`);
    });

    const vectorsRaw = fs.existsSync(path.resolve(__dirname, "dsp-test-vectors.json"))
        ? JSON.parse(fs.readFileSync(path.resolve(__dirname, "dsp-test-vectors.json"), "utf-8")) as DspTestCase[]
        : [];

    for (const tc of vectorsRaw) {
        // Map op name: SpWindow_hamming → SpWindow with window_type=1
        const opType = tc.op.replace(/_hamming$/, "");

        it(`${tc.op} — matches numpy/scipy reference`, () => {
            expect(registry.has(opType)).toBe(true);

            const nodeInfo = {
                opType,
                inputs: ["input"],
                outputs: ["output"],
                attributes: buildAttributes(tc.attrs),
            };

            const node = registry.create(nodeInfo as any, new Map());
            const inputs = [toTensor(tc.input)];
            const outputs = (node as any).execute(inputs);
            const expected = toTensor(tc.output);

            expect(outputs.length).toBeGreaterThanOrEqual(1);
            const actual = outputs[0] as ITensor;

            // Shape check
            expect(actual.data.length).toBe(expected.data.length);

            // Value check
            assertClose(actual.data, expected.data, tc.op);
        });
    }
});
