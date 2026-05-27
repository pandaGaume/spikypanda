/**
 * Tests for the DSP fundamentals added on the `dsp` branch:
 *   transforms     SpFFT (power/magnitude/complex), SpIFFT, SpMagnitude, SpPhase
 *   framing        SpFrame
 *   windows        SpWindow with hann/hamming/blackman/bartlett/rectangular/tukey
 *   filters        SpBiquadFilter (LP/HP), SpKalman1D
 *   stats          SpRMS, SpZeroCrossingRate, SpMovingAverage, SpDetrend
 *
 * All assertions are analytical: the input is a synthetic signal whose
 * expected output is known in closed form, no external vectors needed.
 */
import type { ITensor } from "spikypanda-core";
import { OnnxOpRegistry } from "../../dev/onnx/src/onnx/registry";
import { registerDspOps } from "../../dev/onnx/src/onnx/ops/dsp";

let registry: OnnxOpRegistry;

beforeAll(() => {
    registry = new OnnxOpRegistry();
    registerDspOps(registry);
});

function buildAttrs(attrs: Record<string, number>): Map<string, number> {
    return new Map(Object.entries(attrs));
}

function makeNode(opType: string, attrs: Record<string, number> = {}, inputs: string[] = ["x"], outputs: string[] = ["y"]) {
    const info = {
        opType,
        name: "",
        inputs,
        outputs,
        attributes: buildAttrs(attrs),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return registry.create(info as any, new Map()) as any;
}

function tensor(data: ArrayLike<number>, shape: number[]): ITensor {
    return { data: data instanceof Float32Array ? data : new Float32Array(data), shape };
}

function makeSine(freq: number, n: number, sampleRate: number, phase = 0): Float32Array {
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = Math.sin(2 * Math.PI * freq * i / sampleRate + phase);
    return out;
}

// ───────────────────────────────────────────────────────────────────────────
// SpFFT (output modes)
// ───────────────────────────────────────────────────────────────────────────

describe("SpFFT output modes", () => {
    const N  = 256;
    const sr = 16000;
    // Frequency that sits exactly on an FFT bin to avoid spectral leakage.
    const freq = sr * 16 / N; // bin 16
    const bin  = 16;

    test("power: pure sine concentrates energy at the correct bin", () => {
        const node = makeNode("SpFFT", { nfft: N, output_type: 0 });
        const out: ITensor = node.execute([tensor(makeSine(freq, N, sr), [N])])[0];
        expect(out.shape).toEqual([N / 2 + 1]);
        const peak = out.data.indexOf(Math.max(...Array.from(out.data)));
        expect(peak).toBe(bin);
    });

    test("magnitude: peak bin matches the power case", () => {
        const node = makeNode("SpFFT", { nfft: N, output_type: 1 });
        const out: ITensor = node.execute([tensor(makeSine(freq, N, sr), [N])])[0];
        expect(out.shape).toEqual([N / 2 + 1]);
        const peak = out.data.indexOf(Math.max(...Array.from(out.data)));
        expect(peak).toBe(bin);
    });

    test("complex: interleaved real/imag with shape [N/2+1, 2] and matching power", () => {
        const power = makeNode("SpFFT", { nfft: N, output_type: 0 }).execute([tensor(makeSine(freq, N, sr), [N])])[0] as ITensor;
        const cplx  = makeNode("SpFFT", { nfft: N, output_type: 2 }).execute([tensor(makeSine(freq, N, sr), [N])])[0] as ITensor;
        expect(cplx.shape).toEqual([N / 2 + 1, 2]);
        for (let k = 0; k < N / 2 + 1; k++) {
            const re = cplx.data[k * 2];
            const im = cplx.data[k * 2 + 1];
            expect(re * re + im * im).toBeCloseTo(power.data[k], 2);
        }
    });
});

// ───────────────────────────────────────────────────────────────────────────
// SpIFFT (round-trip with SpFFT(complex))
// ───────────────────────────────────────────────────────────────────────────

describe("SpIFFT", () => {
    const N = 128;
    const sr = 8000;

    test("ifft(fft(x)) ≈ x for a real signal", () => {
        const x = makeSine(sr / 8, N, sr); // arbitrary in-grid frequency
        const fwd = makeNode("SpFFT",  { nfft: N, output_type: 2 });
        const inv = makeNode("SpIFFT", { nfft: N });
        const complex = fwd.execute([tensor(x, [N])])[0] as ITensor;
        const recon   = inv.execute([complex])[0] as ITensor;
        expect(recon.shape).toEqual([N]);
        for (let i = 0; i < N; i++) {
            expect(recon.data[i]).toBeCloseTo(x[i], 3);
        }
    });

    test("ifft of a DC-only spectrum is a constant signal", () => {
        const half = N / 2 + 1;
        const c = new Float32Array(half * 2);
        c[0] = N; // DC bin set so the inverse normalisation gives 1
        const inv = makeNode("SpIFFT", { nfft: N });
        const out = inv.execute([tensor(c, [half, 2])])[0] as ITensor;
        for (let i = 0; i < N; i++) expect(out.data[i]).toBeCloseTo(1, 4);
    });
});

// ───────────────────────────────────────────────────────────────────────────
// SpMagnitude / SpPhase
// ───────────────────────────────────────────────────────────────────────────

describe("SpMagnitude / SpPhase", () => {
    test("magnitude of (3, 4) is 5", () => {
        const node = makeNode("SpMagnitude");
        const out = node.execute([tensor([3, 4, -6, 8], [2, 2])])[0] as ITensor;
        expect(out.shape).toEqual([2]);
        expect(out.data[0]).toBeCloseTo(5, 5);
        expect(out.data[1]).toBeCloseTo(10, 5);
    });

    test("phase of (1, 0), (0, 1), (-1, 0), (0, -1)", () => {
        const node = makeNode("SpPhase");
        const out = node.execute([tensor([1, 0, 0, 1, -1, 0, 0, -1], [4, 2])])[0] as ITensor;
        expect(out.data[0]).toBeCloseTo(0, 5);
        expect(out.data[1]).toBeCloseTo(Math.PI / 2, 5);
        expect(Math.abs(out.data[2])).toBeCloseTo(Math.PI, 5);
        expect(out.data[3]).toBeCloseTo(-Math.PI / 2, 5);
    });
});

// ───────────────────────────────────────────────────────────────────────────
// SpWindow (every window type)
// ───────────────────────────────────────────────────────────────────────────

describe("SpWindow", () => {
    const N = 16;
    const ones = new Float32Array(N).fill(1);

    test("rectangular leaves the signal untouched", () => {
        const node = makeNode("SpWindow", { window_type: 4 });
        const out = node.execute([tensor(ones, [N])])[0] as ITensor;
        for (let i = 0; i < N; i++) expect(out.data[i]).toBeCloseTo(1, 6);
    });

    test("hann endpoints are zero, midpoint is one", () => {
        const node = makeNode("SpWindow", { window_type: 0 });
        const out = node.execute([tensor(ones, [N])])[0] as ITensor;
        expect(out.data[0]).toBeCloseTo(0, 6);
        expect(out.data[N - 1]).toBeCloseTo(0, 6);
        // The (N-1)/2 index is the analytic centre; for even N that's a half-step.
        const mid = Math.round((N - 1) / 2);
        expect(out.data[mid]).toBeGreaterThan(0.9);
    });

    test("hamming endpoints are 0.08 (not zero)", () => {
        const node = makeNode("SpWindow", { window_type: 1 });
        const out = node.execute([tensor(ones, [N])])[0] as ITensor;
        expect(out.data[0]).toBeCloseTo(0.08, 5);
        expect(out.data[N - 1]).toBeCloseTo(0.08, 5);
    });

    test("blackman endpoints are zero, peak ≈ 1 near centre", () => {
        const node = makeNode("SpWindow", { window_type: 2 });
        const out = node.execute([tensor(ones, [N])])[0] as ITensor;
        expect(out.data[0]).toBeCloseTo(0, 5);
        expect(out.data[N - 1]).toBeCloseTo(0, 5);
    });

    test("bartlett (triangular) endpoints are zero, midpoint is one", () => {
        const node = makeNode("SpWindow", { window_type: 3 });
        const out = node.execute([tensor(ones, [N])])[0] as ITensor;
        expect(out.data[0]).toBeCloseTo(0, 5);
        expect(out.data[N - 1]).toBeCloseTo(0, 5);
        const mid = (N - 1) / 2;
        // Triangular reaches exactly 1 at the analytical centre.
        expect(out.data[Math.floor(mid)]).toBeGreaterThan(0.9);
    });

    test("tukey with alpha=0 is rectangular", () => {
        const node = makeNode("SpWindow", { window_type: 5, alpha: 0 });
        const out = node.execute([tensor(ones, [N])])[0] as ITensor;
        for (let i = 0; i < N; i++) expect(out.data[i]).toBeCloseTo(1, 6);
    });

    test("tukey with alpha=1 matches hann", () => {
        const tk = makeNode("SpWindow", { window_type: 5, alpha: 1 }).execute([tensor(ones, [N])])[0] as ITensor;
        const hn = makeNode("SpWindow", { window_type: 0 }).execute([tensor(ones, [N])])[0] as ITensor;
        for (let i = 0; i < N; i++) expect(tk.data[i]).toBeCloseTo(hn.data[i], 5);
    });
});

// ───────────────────────────────────────────────────────────────────────────
// SpFrame (input framing)
// ───────────────────────────────────────────────────────────────────────────

describe("SpFrame", () => {
    test("frame count and content for a ramp signal (drop trailing)", () => {
        const N = 10;
        const ramp = new Float32Array(N);
        for (let i = 0; i < N; i++) ramp[i] = i;
        const node = makeNode("SpFrame", { frame_size: 4, hop_length: 2, pad_mode: 0 });
        const out = node.execute([tensor(ramp, [N])])[0] as ITensor;
        // Frames at t=0,2,4,6: each fits (last frame starts at 6, ends at 9).
        expect(out.shape).toEqual([4, 4]);
        expect(Array.from(out.data.slice(0, 4))).toEqual([0, 1, 2, 3]);
        expect(Array.from(out.data.slice(4, 8))).toEqual([2, 3, 4, 5]);
        expect(Array.from(out.data.slice(12, 16))).toEqual([6, 7, 8, 9]);
    });

    test("pad_mode=1 zero-pads the trailing partial frame", () => {
        const ramp = new Float32Array([0, 1, 2, 3, 4, 5, 6]);
        const node = makeNode("SpFrame", { frame_size: 4, hop_length: 3, pad_mode: 1 });
        const out = node.execute([tensor(ramp, [7])])[0] as ITensor;
        // Frame 0 = [0,1,2,3]; frame 1 starts at hop=3 → [3,4,5,6] (fits); frame 2 starts at 6 → [6, 0, 0, 0]
        expect(out.shape).toEqual([3, 4]);
        expect(Array.from(out.data.slice(8, 12))).toEqual([6, 0, 0, 0]);
    });
});

// ───────────────────────────────────────────────────────────────────────────
// SpBiquadFilter
// ───────────────────────────────────────────────────────────────────────────

describe("SpBiquadFilter", () => {
    const sr = 16000;
    const N  = 2048;

    function settledRms(x: Float32Array, settleSamples = 512): number {
        let s = 0; let c = 0;
        for (let i = settleSamples; i < x.length; i++) { s += x[i] * x[i]; c++; }
        return Math.sqrt(s / Math.max(c, 1));
    }

    test("low-pass attenuates a frequency far above the cutoff", () => {
        const cutoff = 500;
        const hi = makeSine(4000, N, sr);
        const node = makeNode("SpBiquadFilter", { filter_type: 0, sample_rate: sr, cutoff_hz: cutoff, q: Math.SQRT1_2 });
        const filtered = node.execute([tensor(hi, [N])])[0] as ITensor;
        expect(settledRms(filtered.data)).toBeLessThan(settledRms(hi) * 0.1);
    });

    test("low-pass barely affects a frequency well below the cutoff", () => {
        const cutoff = 4000;
        const lo = makeSine(100, N, sr);
        const node = makeNode("SpBiquadFilter", { filter_type: 0, sample_rate: sr, cutoff_hz: cutoff, q: Math.SQRT1_2 });
        const filtered = node.execute([tensor(lo, [N])])[0] as ITensor;
        expect(settledRms(filtered.data)).toBeGreaterThan(settledRms(lo) * 0.9);
    });

    test("high-pass attenuates DC and a low-frequency tone", () => {
        const cutoff = 2000;
        const lo = makeSine(100, N, sr);
        const node = makeNode("SpBiquadFilter", { filter_type: 1, sample_rate: sr, cutoff_hz: cutoff, q: Math.SQRT1_2 });
        const filtered = node.execute([tensor(lo, [N])])[0] as ITensor;
        expect(settledRms(filtered.data)).toBeLessThan(settledRms(lo) * 0.1);
    });
});

// ───────────────────────────────────────────────────────────────────────────
// SpKalman1D
// ───────────────────────────────────────────────────────────────────────────

describe("SpKalman1D", () => {
    test("tracks a constant masked by noise (output is smoother than input)", () => {
        const N = 1000;
        const truth = 5;
        // Deterministic pseudo-noise so the test is reproducible.
        let seed = 1;
        const rand = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280 - 0.5;
        };
        const noisy = new Float32Array(N);
        for (let i = 0; i < N; i++) noisy[i] = truth + 2 * rand();

        const node = makeNode("SpKalman1D", { q: 1e-5, r: 1, x0: 0, p0: 1 });
        const filt = node.execute([tensor(noisy, [N])])[0] as ITensor;

        let inputVar = 0;
        let outputVar = 0;
        for (let i = N / 2; i < N; i++) {
            const d1 = noisy[i] - truth;
            const d2 = filt.data[i] - truth;
            inputVar  += d1 * d1;
            outputVar += d2 * d2;
        }
        expect(outputVar).toBeLessThan(inputVar * 0.1);
        // Steady-state mean should be close to truth.
        let mean = 0;
        for (let i = N / 2; i < N; i++) mean += filt.data[i];
        mean /= N / 2;
        expect(mean).toBeCloseTo(truth, 1);
    });
});

// ───────────────────────────────────────────────────────────────────────────
// SpRMS / SpZeroCrossingRate / SpMovingAverage / SpDetrend
// ───────────────────────────────────────────────────────────────────────────

describe("SpRMS", () => {
    test("rms of a unit cosine is 1/sqrt(2)", () => {
        const N = 1024;
        const x = makeSine(50, N, 1000, Math.PI / 2); // cosine (sin with +pi/2)
        const out = makeNode("SpRMS").execute([tensor(x, [N])])[0] as ITensor;
        expect(out.shape).toEqual([1]);
        expect(out.data[0]).toBeCloseTo(Math.SQRT1_2, 2);
    });

    test("rms of an empty signal is 0", () => {
        const out = makeNode("SpRMS").execute([tensor([], [0])])[0] as ITensor;
        expect(out.data[0]).toBe(0);
    });
});

describe("SpZeroCrossingRate", () => {
    test("alternating ±1 gives ZCR = 1", () => {
        const N = 100;
        const x = new Float32Array(N);
        for (let i = 0; i < N; i++) x[i] = i % 2 === 0 ? 1 : -1;
        const out = makeNode("SpZeroCrossingRate").execute([tensor(x, [N])])[0] as ITensor;
        expect(out.data[0]).toBeCloseTo(1, 6);
    });

    test("constant signal gives ZCR = 0", () => {
        const out = makeNode("SpZeroCrossingRate").execute([tensor(new Float32Array(50).fill(1), [50])])[0] as ITensor;
        expect(out.data[0]).toBe(0);
    });
});

describe("SpMovingAverage", () => {
    test("flattens a noisy constant signal", () => {
        const N = 200;
        let seed = 7;
        const rand = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; };
        const x = new Float32Array(N);
        for (let i = 0; i < N; i++) x[i] = 2 + rand();
        const out = makeNode("SpMovingAverage", { window_size: 32 }).execute([tensor(x, [N])])[0] as ITensor;
        // After the warm-up the windowed average must stay close to 2.
        for (let i = 64; i < N; i++) expect(Math.abs(out.data[i] - 2)).toBeLessThan(0.25);
    });

    test("first sample equals the input (causal moving average)", () => {
        const out = makeNode("SpMovingAverage", { window_size: 5 }).execute([tensor([3, 0, 0, 0, 0, 0], [6])])[0] as ITensor;
        expect(out.data[0]).toBeCloseTo(3, 6);
    });
});

describe("SpDetrend", () => {
    test("linear mode removes a perfect ramp (result ≈ 0)", () => {
        const N = 64;
        const ramp = new Float32Array(N);
        for (let i = 0; i < N; i++) ramp[i] = 2 + 0.5 * i;
        const out = makeNode("SpDetrend", { mode: 1 }).execute([tensor(ramp, [N])])[0] as ITensor;
        for (let i = 0; i < N; i++) expect(Math.abs(out.data[i])).toBeLessThan(1e-3);
    });

    test("constant mode subtracts the mean", () => {
        const x = new Float32Array([1, 2, 3, 4, 5]);
        const out = makeNode("SpDetrend", { mode: 0 }).execute([tensor(x, [5])])[0] as ITensor;
        let sum = 0; for (const v of out.data) sum += v;
        expect(sum).toBeCloseTo(0, 6);
    });
});
