// ═══════════════════════════════════════════════════════════════════════════
// Étape B — spectral NN substrate replayed as green tests.
//
// Proves H1 in the real engine: K sub-paths superposed on one edge re-separate
// by the SpectralSynapse's complex per-band transfer with inter-band leakage
// < 5 %, the phase applied per band is readable at the output, and the whole
// thing runs inside a RuntimeGraph + Session through a NeuralRunner.
//
// Everything imports from `spikypanda-core` only (the substrate lives in core:
// SpectralSynapse/SpectralNeuron + the SpectralInferenceRuntime, backed by the
// core/dsp FFT brick). `TokenSource`/`TokenCollector` are the shared DSP test
// fixtures.
// ═══════════════════════════════════════════════════════════════════════════

import {
    assertInharmonic,
    Channel,
    getFFTEngine,
    GraphBuilder,
    ISpectralGraph,
    RuntimeGraphBuilder,
    RuntimeNode,
    Session,
    SpectralInferenceRuntime,
    SpectralNeuron,
    SpectralRunnerBuilder,
    SpectralSynapse,
} from "spikypanda-core";
import { TokenCollector, TokenSource } from "../dsp/helpers";

// ── Fixture constants ──────────────────────────────────────────────────────
const NFFT = 256;
const FS = 1024; // Hz -> bin spacing = FS / NFFT = 4 Hz
const HALF = 1; // band-pass half-width in bins
// Carriers on EXACT bins (12/30/50), inharmonic & non-overlapping.
const BANDS = [48, 120, 200];

const binOf = (f: number): number => Math.round((f * NFFT) / FS);
const zeros = (n: number): number[] => new Array(n).fill(0);
const ones = (n: number): number[] => new Array(n).fill(1);

/** Composite = Σ_b amps[b]·sin(2π·bands[b]·n/FS + phases[b]) over NFFT samples. */
function synthComposite(bands: number[], amps: number[], phases: number[] = zeros(bands.length)): number[] {
    const out = new Array(NFFT).fill(0);
    for (let b = 0; b < bands.length; b++) {
        const a = amps[b];
        if (!a) continue;
        const w = (2 * Math.PI * bands[b]) / FS;
        const ph = phases[b] ?? 0;
        for (let n = 0; n < NFFT; n++) out[n] += a * Math.sin(w * n + ph);
    }
    return out;
}

/** Complex half-spectrum [re,im,...] of a time frame, via the core/dsp brick. */
function fftHalf(frame: number[]): Float32Array {
    return getFFTEngine(NFFT).forwardComplex(Float32Array.from(frame));
}
const magAt = (X: Float32Array, bin: number): number => Math.hypot(X[2 * bin], X[2 * bin + 1]);
const phaseAt = (X: Float32Array, bin: number): number => Math.atan2(X[2 * bin + 1], X[2 * bin]);

/** Energy of `frame` in band `b` (sum |X|² over the band's half-width window). */
function energyAtBand(frame: number[], bands: number[], b: number): number {
    const X = fftHalf(frame);
    const c = binOf(bands[b]);
    let e = 0;
    for (let k = c - HALF; k <= c + HALF; k++) {
        if (k < 0 || k > NFFT / 2) continue;
        e += X[2 * k] * X[2 * k] + X[2 * k + 1] * X[2 * k + 1];
    }
    return e;
}

/** Wrap an angle to (-π, π]. */
const wrapPi = (x: number): number => {
    let y = (x + Math.PI) % (2 * Math.PI);
    if (y < 0) y += 2 * Math.PI;
    return y - Math.PI;
};

/** input SpectralNeuron → SpectralSynapse → output SpectralNeuron. */
function buildGraph(bands: number[], gain: number[], phase: number[], coupling?: { re: number; im: number }[][]) {
    const input = new SpectralNeuron(NFFT, FS, HALF);
    const output = new SpectralNeuron(NFFT, FS, HALF);
    const syn = new SpectralSynapse(input, output, bands, gain, phase, coupling);
    const graph = new GraphBuilder<SpectralNeuron, SpectralSynapse>().withNodes(input, output).withLinks(syn).build();
    return { input, output, syn, graph: graph as unknown as ISpectralGraph };
}

/** Forward pass through the substrate (uses the module-level BANDS). */
function runFwd(gain: number[], phase: number[], composite: number[], coupling?: { re: number; im: number }[][]): number[] {
    const { graph } = buildGraph(BANDS, gain, phase, coupling);
    return new SpectralInferenceRuntime(graph).run(composite);
}

// ── The band grid must be inharmonic (Decision 001) ────────────────────────
describe("assertInharmonic", () => {
    test("accepts the exact-bin inharmonic grid", () => {
        expect(() => assertInharmonic(BANDS)).not.toThrow();
    });
    test("rejects a harmonic grid (100=2×50, 150=3×50)", () => {
        expect(() => assertInharmonic([50, 100, 150])).toThrow(/harmonic/);
    });
    test("rejects a sum/difference collision (170 = 50 + 120)", () => {
        expect(() => assertInharmonic([50, 120, 170])).toThrow(/intermodulation/);
    });
});

// ── SpectralSynapse / SpectralNeuron clone + serialize ─────────────────────
describe("SpectralSynapse clone / serialize", () => {
    const gain = [1, 0.5, 0.3];
    const phase = [0, Math.PI / 2, Math.PI];

    test("clone() is a deep, independent copy", () => {
        const s = new SpectralSynapse(new SpectralNeuron(), new SpectralNeuron(), BANDS, gain, phase);
        const c = s.clone();
        expect(c).not.toBe(s);
        expect(Array.from(c.bands)).toEqual(BANDS);
        expect(c.gain).toEqual(gain);
        expect(c.phase).toEqual(phase);
        // mutating the clone must not touch the original (deep copy)
        c.gain[0] = 9;
        expect(s.gain[0]).toBe(1);
    });

    test("serialize() emits the @cloneable transfer fields", () => {
        const s = new SpectralSynapse(new SpectralNeuron(), new SpectralNeuron(), BANDS, gain, phase);
        const blob = s.serialize();
        expect(blob.bands).toEqual(BANDS);
        expect(blob.gain).toEqual(gain);
        expect(blob.phase).toEqual(phase);
    });

    test("SpectralNeuron clones its FFT config", () => {
        const n = new SpectralNeuron(128, 2048, 2);
        const c = n.clone();
        expect(c).not.toBe(n);
        expect(c.nfft).toBe(128);
        expect(c.sampleRate).toBe(2048);
        expect(c.bandHalfWidthBins).toBe(2);
    });
});

// ── Inter-band leakage < 5 % ───────────────────────────────────────────────
describe("inter-band leakage", () => {
    function measureLeakage(bands: number[]): number[] {
        const gain = ones(bands.length);
        const phase = zeros(bands.length);
        const leak: number[] = [];
        for (let b = 0; b < bands.length; b++) {
            const onlyB = bands.map((_, i) => (i === b ? 1 : 0));
            const exceptB = bands.map((_, i) => (i === b ? 0 : 1));

            const gU = buildGraph(bands, gain, phase).graph;
            const useful = new SpectralInferenceRuntime(gU).run(synthComposite(bands, onlyB));
            const eUseful = energyAtBand(useful, bands, b);

            const gL = buildGraph(bands, gain, phase).graph;
            const leaked = new SpectralInferenceRuntime(gL).run(synthComposite(bands, exceptB));
            const eLeak = energyAtBand(leaked, bands, b);

            leak.push(eLeak / Math.max(eUseful, 1e-12));
        }
        return leak;
    }

    test("K = 2 bands stay below 5 %", () => {
        for (const l of measureLeakage([48, 120])) expect(l).toBeLessThan(0.05);
    });

    test("K = 3 bands stay below 5 %", () => {
        for (const l of measureLeakage(BANDS)) expect(l).toBeLessThan(0.05);
    });
});

// ── Phase read (Decision 001: the latent is complex) ───────────────────────
describe("phase transfer", () => {
    test("a per-band phase φ_b is readable at the output; magnitude scales by g_b", () => {
        const b = 1; // 120 Hz
        const phiIn = 0.7;
        const phiB = Math.PI / 3;
        const g = 0.8;
        const gain = BANDS.map((_, i) => (i === b ? g : 1));
        const phase = BANDS.map((_, i) => (i === b ? phiB : 0));

        const amps = BANDS.map((_, i) => (i === b ? 1 : 0));
        const phasesIn = BANDS.map((_, i) => (i === b ? phiIn : 0));
        const composite = synthComposite(BANDS, amps, phasesIn);
        const out = runFwd(gain, phase, composite);

        const c = binOf(BANDS[b]);
        const Xin = fftHalf(composite);
        const Xout = fftHalf(out);
        // relative phase shift = φ_b (convention cancels in the difference)
        expect(Math.abs(wrapPi(phaseAt(Xout, c) - phaseAt(Xin, c) - phiB))).toBeLessThan(0.02);
        // magnitude scaled by the band gain
        expect(Math.abs(magAt(Xout, c) / magAt(Xin, c) - g)).toBeLessThan(0.02);
    });

    test("φ_b = 0 reduces to the real Étape A (output ≈ g·input)", () => {
        const g = 0.6;
        const gain = ones(BANDS.length).map(() => g);
        const phase = zeros(BANDS.length);
        const composite = synthComposite(BANDS, ones(BANDS.length));
        const out = runFwd(gain, phase, composite);

        let maxErr = 0;
        for (let n = 0; n < NFFT; n++) maxErr = Math.max(maxErr, Math.abs(out[n] - g * composite[n]));
        expect(maxErr).toBeLessThan(0.02);
    });
});

// ── Isolation: one band's weight only moves that band ──────────────────────
describe("band isolation", () => {
    test("changing a single w_b moves only its band", () => {
        const composite = synthComposite(BANDS, ones(BANDS.length));
        const base = runFwd(ones(BANDS.length), zeros(BANDS.length), composite);
        const modGain = BANDS.map((_, i) => (i === 1 ? 0.3 : 1));
        const mod = runFwd(modGain, zeros(BANDS.length), composite);

        const Xbase = fftHalf(base);
        const Xmod = fftHalf(mod);
        for (let b = 0; b < BANDS.length; b++) {
            const c = binOf(BANDS[b]);
            const ratio = magAt(Xmod, c) / magAt(Xbase, c);
            expect(Math.abs(ratio - (b === 1 ? 0.3 : 1))).toBeLessThan(0.02);
        }
    });
});

// ── Engine integration: runs inside a RuntimeGraph + Session ───────────────
describe("engine integration (NeuralRunner)", () => {
    test("the SpectralRunnerBuilder output matches the direct forward pass", () => {
        const gain = ones(BANDS.length).map(() => 0.7);
        const phase = zeros(BANDS.length);
        const composite = synthComposite(BANDS, ones(BANDS.length));

        const expected = new SpectralInferenceRuntime(buildGraph(BANDS, gain, phase).graph).run(composite);

        const runner = new SpectralRunnerBuilder().withGraph(buildGraph(BANDS, gain, phase).graph).build();
        const src = new TokenSource([composite]);
        const sink = new TokenCollector();
        const outer = new RuntimeGraphBuilder<RuntimeNode, Channel>()
            .withMode("dynamic")
            .withNodes(src, runner, sink)
            .withChannel(src, runner, 0)
            .withChannel(runner, sink, 0)
            .build();
        new Session(outer).run(0);

        expect(sink.tokens.length).toBe(1);
        const got = sink.tokens[0] as number[];
        expect(got.length).toBe(expected.length);
        let maxErr = 0;
        for (let n = 0; n < got.length; n++) maxErr = Math.max(maxErr, Math.abs(got[n] - expected[n]));
        expect(maxErr).toBeLessThan(1e-4);
    });
});
