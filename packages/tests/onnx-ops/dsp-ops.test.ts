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
import { registerDspOps, enroll, serializeTemplate, deserializeTemplate, templateToTensor } from "../../dev/runtime/src/onnx/ops/dsp";

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

// ---------------------------------------------------------------------------
// Enrollment utility tests
// ---------------------------------------------------------------------------

describe("enroll / serializeTemplate / deserializeTemplate / templateToTensor", () => {
    const PARAMS = { sampleRate: 16000, nMfcc: 13, nFft: 256, hopLength: 128, nMels: 20 };
    // Synthetic audio: 1 second of a 440 Hz sine at 16 kHz
    function makeSine(freq: number, durationSamples: number, sr = 16000): Float32Array {
        const buf = new Float32Array(durationSamples);
        for (let i = 0; i < durationSamples; i++) {
            buf[i] = Math.sin(2 * Math.PI * freq * i / sr);
        }
        return buf;
    }

    it("single sample — produces correct shape", () => {
        const audio = makeSine(440, 16000);
        const tmpl = enroll([audio], PARAMS);
        expect(tmpl.shape[0]).toBe(PARAMS.nMfcc);          // n_mfcc rows
        expect(tmpl.shape[1]).toBeGreaterThan(0);           // at least 1 frame
        expect(tmpl.data.length).toBe(tmpl.shape[0] * tmpl.shape[1]);
    });

    it("multiple samples — same shape, data is the average", () => {
        const a = makeSine(440, 16000);
        const b = makeSine(440, 16000);
        const tmpl1 = enroll([a], PARAMS);
        const tmpl2 = enroll([a, b], PARAMS);
        // Both 440 Hz → identical MFCC → average equals the single sample
        expect(tmpl2.shape).toEqual(tmpl1.shape);
        for (let i = 0; i < tmpl1.data.length; i++) {
            expect(tmpl2.data[i]).toBeCloseTo(tmpl1.data[i], 3);
        }
    });

    it("different-length samples — normalizes to median frame count", () => {
        const short = makeSine(440, 8000);   // 0.5 s
        const long  = makeSine(440, 24000);  // 1.5 s
        const tmpl  = enroll([short, long], PARAMS);
        // median of two lengths: either of the two values, result must be >0
        expect(tmpl.shape[1]).toBeGreaterThan(0);
        expect(tmpl.data.length).toBe(tmpl.shape[0] * tmpl.shape[1]);
    });

    it("serialize → deserialize round-trips data exactly", () => {
        const audio = makeSine(440, 16000);
        const original = enroll([audio], PARAMS);
        const json = serializeTemplate(original);
        const restored = deserializeTemplate(json);

        expect(restored.shape).toEqual(original.shape);
        expect(restored.params).toEqual(original.params);
        for (let i = 0; i < original.data.length; i++) {
            expect(restored.data[i]).toBeCloseTo(original.data[i], 5);
        }
    });

    it("templateToTensor — returns ITensor with correct shape and data", () => {
        const audio = makeSine(440, 16000);
        const tmpl = enroll([audio], PARAMS);
        const tensor = templateToTensor(tmpl);
        expect(tensor.shape).toEqual([...tmpl.shape]);
        expect(tensor.data).toBe(tmpl.data);  // same reference, no copy
    });

    it("enroll + SpDTW — same name matches, different name does not", () => {
        const registry = new OnnxOpRegistry();
        registerDspOps(registry);

        const zephyr1 = makeSine(440, 16000);
        const zephyr2 = makeSine(440, 15800);  // slightly shorter, same pitch
        const other   = makeSine(880, 16000);  // very different

        const tmplZephyr = enroll([zephyr1, zephyr2], PARAMS);
        const tmplOther  = enroll([other], PARAMS);

        const liveZephyr = templateToTensor(enroll([zephyr1], PARAMS));
        const nodeInfo   = {
            opType: "SpDTW",
            inputs: ["live", "template"],
            outputs: ["distance"],
            attributes: buildAttributes({ normalize: 1 }),
        };
        const node = registry.create(nodeInfo as any, new Map()) as any;

        const dSame = node.execute([liveZephyr, templateToTensor(tmplZephyr)])[0].data[0] as number;
        const dDiff = node.execute([liveZephyr, templateToTensor(tmplOther)])[0].data[0] as number;

        expect(dSame).toBeLessThan(dDiff);  // same name is closer
    });
});

// ---------------------------------------------------------------------------
// SpDTW unit tests (self-contained, no external vectors needed)
// ---------------------------------------------------------------------------

describe("SpDTW", () => {
    let registry: OnnxOpRegistry;

    beforeAll(() => {
        registry = new OnnxOpRegistry();
        registerDspOps(registry);
    });

    function makeDTWNode(attrs: Record<string, number> = {}) {
        const nodeInfo = {
            opType: "SpDTW",
            inputs: ["live", "template"],
            outputs: ["distance"],
            attributes: buildAttributes(attrs),
        };
        return registry.create(nodeInfo as any, new Map()) as any;
    }

    function runDTW(
        live: { shape: number[]; data: number[] },
        tmpl: { shape: number[]; data: number[] },
        attrs: Record<string, number> = {},
    ): number {
        const node = makeDTWNode(attrs);
        const outputs = node.execute([toTensor(live), toTensor(tmpl)]);
        expect(outputs[0].shape).toEqual([1]);
        return outputs[0].data[0] as number;
    }

    it("identical 1-feature sequences → distance = 0", () => {
        // live = tmpl = [[1, 2, 3]]  shape [1, 3]
        const seq = { shape: [1, 3], data: [1, 2, 3] };
        const d = runDTW(seq, seq, { normalize: 0 });
        expect(d).toBeCloseTo(0, 4);
    });

    it("identical sequences normalized → distance = 0", () => {
        const seq = { shape: [1, 3], data: [1, 2, 3] };
        const d = runDTW(seq, seq, { normalize: 1 });
        expect(d).toBeCloseTo(0, 4);
    });

    it("known 1-feature 2-frame sequences → correct raw DTW", () => {
        // live = [1, 2], tmpl = [3, 4]
        // dist matrix:
        //   (0,0)=2  (0,1)=3
        //   (1,0)=1  (1,1)=2
        // cost[0,0]=2, cost[0,1]=5, cost[1,0]=3, cost[1,1]=2+min(5,3,2)=4
        const live = { shape: [1, 2], data: [1, 2] };
        const tmpl = { shape: [1, 2], data: [3, 4] };
        const d = runDTW(live, tmpl, { normalize: 0 });
        expect(d).toBeCloseTo(4, 4);
    });

    it("normalized divides raw cost by n+m", () => {
        const live = { shape: [1, 2], data: [1, 2] };
        const tmpl = { shape: [1, 2], data: [3, 4] };
        const raw  = runDTW(live, tmpl, { normalize: 0 });  // 4
        const norm = runDTW(live, tmpl, { normalize: 1 });  // 4/(2+2) = 1
        expect(norm).toBeCloseTo(raw / (2 + 2), 4);
        expect(norm).toBeCloseTo(1.0, 4);
    });

    it("different-length sequences — DTW warps correctly", () => {
        // live = [1,2,3], tmpl = [1,3]  shape [1,*]
        // Optimal path: live[0]→tmpl[0], live[1]→tmpl[1], live[2]→tmpl[1]
        // cost = 0+|2-3|+|3-3| = 0+1+0 = 1
        const live = { shape: [1, 3], data: [1, 2, 3] };
        const tmpl = { shape: [1, 2], data: [1, 3] };
        const d = runDTW(live, tmpl, { normalize: 0 });
        expect(d).toBeCloseTo(1, 4);
    });

    it("2-feature sequences — euclidean distance across features", () => {
        // live frames: [1,2], [3,4], [5,6]  → shape [2, 3]
        // tmpl frames: [1,2], [5,6]         → shape [2, 2]
        // optimal path: 0→0 (dist 0), 1→1 (dist √8), 2→1 (dist 0)  total √8
        const live = { shape: [2, 3], data: [1, 3, 5,  2, 4, 6] };
        const tmpl = { shape: [2, 2], data: [1, 5,     2, 6]     };
        const d = runDTW(live, tmpl, { normalize: 0 });
        expect(d).toBeCloseTo(Math.sqrt(8), 3); // ≈ 2.828
    });

    it("Sakoe-Chiba band=0 (diagonal only) — identical sequences still 0", () => {
        const seq = { shape: [1, 3], data: [1, 2, 3] };
        const d = runDTW(seq, seq, { normalize: 0, band: 0 });
        expect(d).toBeCloseTo(0, 4);
    });

    it("output shape is always [1]", () => {
        const node = makeDTWNode();
        const out = node.execute([
            toTensor({ shape: [1, 4], data: [1, 2, 3, 4] }),
            toTensor({ shape: [1, 3], data: [1, 2, 3] }),
        ]);
        expect(out[0].shape).toEqual([1]);
        expect(out[0].data.length).toBe(1);
    });
});

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
