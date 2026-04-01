/**
 * DSP operators for audio preprocessing in the SpikyPanda ONNX pipeline.
 *
 * These are custom ops (not part of ONNX standard) that enable end-to-end
 * audio inference: raw audio → MFCC features → neural network → classification.
 *
 * FFT implementation ported from Guillaume Pelletier's dsp.js (Gaume/FFTPanel).
 *
 * Ops:
 *   SpFFT            — Cooley-Tukey radix-2 FFT, power spectrum output
 *   SpMelFilterbank   — Mel-scale triangular filterbank
 *   SpLogScale        — Element-wise log with floor
 *   SpDCT             — Type-II Discrete Cosine Transform
 *   SpMFCC            — Full MFCC pipeline (Window → FFT → Mel → Log → DCT)
 *   SpWindow          — Apply window function (Hann, Hamming, etc.)
 *   SpDTW             — Dynamic Time Warping distance between two MFCC sequences
 */

import type { ITensor } from "../../compute/compute.interfaces";
import type { OnnxNodeInfo } from "../onnx-types";
import { OnnxOpNode, makeTensor, OnnxOpRegistry } from "../registry";

// ═══════════════════════════════════════════════════════════════════════════
// FFT — Cooley-Tukey radix-2 (ported from dsp.js)
// ═══════════════════════════════════════════════════════════════════════════

class FFTEngine {
    readonly size: number;
    private reverseTable: Uint32Array;
    private sinTable: Float64Array;
    private cosTable: Float64Array;
    private real: Float64Array;
    private imag: Float64Array;

    constructor(size: number) {
        this.size = size;
        this.reverseTable = new Uint32Array(size);
        this.sinTable = new Float64Array(size);
        this.cosTable = new Float64Array(size);
        this.real = new Float64Array(size);
        this.imag = new Float64Array(size);

        // Build bit-reversal table
        let limit = 1;
        let bit = size >> 1;
        while (limit < size) {
            for (let i = 0; i < limit; i++) {
                this.reverseTable[i + limit] = this.reverseTable[i] + bit;
            }
            limit <<= 1;
            bit >>= 1;
        }

        // Pre-compute twiddle factors
        for (let i = 0; i < size; i++) {
            this.sinTable[i] = Math.sin(-Math.PI / i);
            this.cosTable[i] = Math.cos(-Math.PI / i);
        }
    }

    /**
     * Forward FFT. Returns power spectrum [size/2 + 1].
     */
    forward(buffer: Float32Array): Float32Array {
        const N = this.size;
        const real = this.real;
        const imag = this.imag;
        const reverseTable = this.reverseTable;
        const cosTable = this.cosTable;
        const sinTable = this.sinTable;

        // Bit-reversal permutation
        for (let i = 0; i < N; i++) {
            real[i] = buffer[reverseTable[i]];
            imag[i] = 0;
        }

        // Butterfly stages
        let halfSize = 1;
        while (halfSize < N) {
            const phaseShiftStepReal = cosTable[halfSize];
            const phaseShiftStepImag = sinTable[halfSize];
            let currentPhaseShiftReal = 1;
            let currentPhaseShiftImag = 0;

            for (let fftStep = 0; fftStep < halfSize; fftStep++) {
                let i = fftStep;
                while (i < N) {
                    const off = i + halfSize;
                    const tr = currentPhaseShiftReal * real[off] - currentPhaseShiftImag * imag[off];
                    const ti = currentPhaseShiftReal * imag[off] + currentPhaseShiftImag * real[off];
                    real[off] = real[i] - tr;
                    imag[off] = imag[i] - ti;
                    real[i] += tr;
                    imag[i] += ti;
                    i += halfSize << 1;
                }
                const tmpReal = currentPhaseShiftReal;
                currentPhaseShiftReal = tmpReal * phaseShiftStepReal - currentPhaseShiftImag * phaseShiftStepImag;
                currentPhaseShiftImag = tmpReal * phaseShiftStepImag + currentPhaseShiftImag * phaseShiftStepReal;
            }
            halfSize <<= 1;
        }

        // Power spectrum
        const nBins = N / 2 + 1;
        const power = new Float32Array(nBins);
        for (let i = 0; i < nBins; i++) {
            power[i] = real[i] * real[i] + imag[i] * imag[i];
        }
        return power;
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Window functions (ported from dsp.js)
// ═══════════════════════════════════════════════════════════════════════════

function hannWindow(length: number, index: number): number {
    return 0.5 * (1 - Math.cos(2 * Math.PI * index / (length - 1)));
}

function hammingWindow(length: number, index: number): number {
    return 0.54 - 0.46 * Math.cos(2 * Math.PI * index / (length - 1));
}

// ═══════════════════════════════════════════════════════════════════════════
// Mel scale helpers
// ═══════════════════════════════════════════════════════════════════════════

function hzToMel(hz: number): number {
    return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel: number): number {
    return 700 * (Math.pow(10, mel / 2595) - 1);
}

function buildMelFilterbank(nMels: number, nFft: number, sampleRate: number): Float32Array[] {
    const nBins = nFft / 2 + 1;
    const melMin = hzToMel(0);
    const melMax = hzToMel(sampleRate / 2);

    // Mel-spaced center frequencies
    const melPoints = new Float32Array(nMels + 2);
    for (let i = 0; i < nMels + 2; i++) {
        melPoints[i] = melMin + (melMax - melMin) * i / (nMels + 1);
    }

    // Convert to FFT bin indices
    const bins = new Int32Array(nMels + 2);
    for (let i = 0; i < nMels + 2; i++) {
        bins[i] = Math.floor((nFft + 1) * melToHz(melPoints[i]) / sampleRate);
    }

    // Build triangular filters
    const fb: Float32Array[] = [];
    for (let m = 0; m < nMels; m++) {
        const row = new Float32Array(nBins);
        const left = bins[m], center = bins[m + 1], right = bins[m + 2];
        for (let k = left; k < center; k++) {
            if (k >= 0 && k < nBins) row[k] = (k - left) / Math.max(center - left, 1);
        }
        for (let k = center; k <= right; k++) {
            if (k >= 0 && k < nBins) row[k] = (right - k) / Math.max(right - center, 1);
        }
        fb.push(row);
    }
    return fb;
}

// ═══════════════════════════════════════════════════════════════════════════
// DCT Type-II
// ═══════════════════════════════════════════════════════════════════════════

function dctII(input: Float32Array, nOutput: number): Float32Array {
    const N = input.length;
    const out = new Float32Array(nOutput);
    for (let k = 0; k < nOutput; k++) {
        let sum = 0;
        for (let n = 0; n < N; n++) {
            sum += input[n] * Math.cos(Math.PI * k * (2 * n + 1) / (2 * N));
        }
        out[k] = sum * 2; // DCT-II standard scaling factor
    }
    return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// ONNX Op Nodes
// ═══════════════════════════════════════════════════════════════════════════

// FFT engine cache (avoid re-creating per frame)
const fftEngines = new Map<number, FFTEngine>();
function getFFTEngine(size: number): FFTEngine {
    let engine = fftEngines.get(size);
    if (!engine) {
        engine = new FFTEngine(size);
        fftEngines.set(size, engine);
    }
    return engine;
}

/**
 * SpFFT: compute power spectrum of a 1D signal.
 * Input:  [samples] — time-domain audio frame
 * Output: [nfft/2+1] — power spectrum
 * Attributes: nfft (default 512)
 */
class SpFFTNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    private readonly nfft: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.nfft = this.attrInt("nfft", 512);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const signal = inputs[0];
        const engine = getFFTEngine(this.nfft);

        // Pad or truncate to nfft
        const frame = new Float32Array(this.nfft);
        const len = Math.min(signal.data.length, this.nfft);
        for (let i = 0; i < len; i++) frame[i] = signal.data[i];

        const power = engine.forward(frame);
        return [makeTensor(power, [power.length])];
    }
}

/**
 * SpWindow: apply window function to audio frame.
 * Input:  [samples]
 * Output: [samples]
 * Attributes: window_type (0=hann, 1=hamming, default 0)
 */
class SpWindowNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    private readonly windowType: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.windowType = this.attrInt("window_type", 0);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const input = inputs[0];
        const out = new Float32Array(input.data.length);
        const N = input.data.length;
        const winFn = this.windowType === 1 ? hammingWindow : hannWindow;
        for (let i = 0; i < N; i++) {
            out[i] = input.data[i] * winFn(N, i);
        }
        return [makeTensor(out, [...input.shape])];
    }
}

/**
 * SpMelFilterbank: apply mel-scale filterbank to a power spectrum.
 * Input:  [nfft/2+1] — power spectrum
 * Output: [n_mels] — mel energies
 * Attributes: n_mels (default 40), nfft (default 512), sample_rate (default 16000)
 */
class SpMelFilterbankNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    private fb: Float32Array[] | null = null;
    private readonly nMels: number;
    private readonly nfft: number;
    private readonly sampleRate: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.nMels = this.attrInt("n_mels", 40);
        this.nfft = this.attrInt("nfft", 512);
        this.sampleRate = this.attrInt("sample_rate", 16000);
    }

    execute(inputs: ITensor[]): ITensor[] {
        if (!this.fb) {
            this.fb = buildMelFilterbank(this.nMels, this.nfft, this.sampleRate);
        }
        const spectrum = inputs[0];
        const nBins = this.nfft / 2 + 1;
        const out = new Float32Array(this.nMels);
        for (let m = 0; m < this.nMels; m++) {
            let sum = 0;
            const row = this.fb[m];
            for (let k = 0; k < nBins; k++) {
                sum += row[k] * spectrum.data[k];
            }
            out[m] = sum;
        }
        return [makeTensor(out, [this.nMels])];
    }
}

/**
 * SpLogScale: element-wise log with floor.
 * Input:  [N]
 * Output: [N]
 * Attributes: floor (default 1e-10)
 */
class SpLogScaleNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    private readonly floor: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.floor = this.attr("floor", 1e-10);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const input = inputs[0];
        const out = new Float32Array(input.data.length);
        for (let i = 0; i < input.data.length; i++) {
            out[i] = Math.log(Math.max(input.data[i], this.floor));
        }
        return [makeTensor(out, [...input.shape])];
    }
}

/**
 * SpDCT: Type-II Discrete Cosine Transform.
 * Input:  [N]
 * Output: [n_output]
 * Attributes: n_output (default 40)
 */
class SpDCTNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    private readonly nOutput: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.nOutput = this.attrInt("n_output", 40);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const input = inputs[0];
        const out = dctII(input.data, this.nOutput);
        return [makeTensor(out, [this.nOutput])];
    }
}

/**
 * SpMFCC: complete MFCC pipeline in a single op.
 *
 * Input:  [samples] — 1D audio (e.g. 16000 samples = 1 second at 16kHz)
 * Output: [n_mfcc, n_frames] — MFCC feature matrix
 *
 * Attributes:
 *   sample_rate (default 16000)
 *   n_mfcc (default 40)
 *   n_fft (default 512)
 *   hop_length (default 160)
 *   n_mels (default 40)
 *   window_type (0=hann, 1=hamming, default 0)
 */
class SpMFCCNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    private readonly sampleRate: number;
    private readonly nMfcc: number;
    private readonly nFft: number;
    private readonly hopLength: number;
    private readonly nMels: number;
    private readonly windowType: number;
    private fb: Float32Array[] | null = null;
    private fftEngine: FFTEngine | null = null;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.sampleRate = this.attrInt("sample_rate", 16000);
        this.nMfcc = this.attrInt("n_mfcc", 40);
        this.nFft = this.attrInt("n_fft", 512);
        this.hopLength = this.attrInt("hop_length", 160);
        this.nMels = this.attrInt("n_mels", 40);
        this.windowType = this.attrInt("window_type", 0);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const audio = inputs[0].data;
        const nFrames = Math.floor((audio.length - this.nFft) / this.hopLength) + 1;

        // Lazy init
        if (!this.fb) this.fb = buildMelFilterbank(this.nMels, this.nFft, this.sampleRate);
        if (!this.fftEngine) this.fftEngine = getFFTEngine(this.nFft);

        const winFn = this.windowType === 1 ? hammingWindow : hannWindow;
        const nBins = this.nFft / 2 + 1;
        const mfcc = new Float32Array(this.nMfcc * nFrames);

        const frame = new Float32Array(this.nFft);
        const melSpec = new Float32Array(this.nMels);

        for (let t = 0; t < nFrames; t++) {
            const start = t * this.hopLength;

            // Window
            for (let i = 0; i < this.nFft; i++) {
                const idx = start + i;
                frame[i] = idx < audio.length ? audio[idx] * winFn(this.nFft, i) : 0;
            }

            // FFT → power spectrum
            const power = this.fftEngine.forward(frame);

            // Mel filterbank
            for (let m = 0; m < this.nMels; m++) {
                let sum = 0;
                const row = this.fb[m];
                for (let k = 0; k < nBins; k++) sum += row[k] * power[k];
                melSpec[m] = Math.log(Math.max(sum, 1e-10));
            }

            // DCT → MFCC
            for (let c = 0; c < this.nMfcc; c++) {
                let sum = 0;
                for (let m = 0; m < this.nMels; m++) {
                    sum += melSpec[m] * Math.cos(Math.PI * c * (2 * m + 1) / (2 * this.nMels));
                }
                mfcc[c * nFrames + t] = sum;
            }
        }

        return [makeTensor(mfcc, [this.nMfcc, nFrames])];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DTW — Dynamic Time Warping
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Euclidean distance between two frames extracted from [n_features, n_frames]
 * packed Float32Arrays.
 */
function frameDist(
    a: Float32Array, frameA: number, nFramesA: number,
    b: Float32Array, frameB: number, nFramesB: number,
    nFeatures: number,
): number {
    let sum = 0;
    for (let f = 0; f < nFeatures; f++) {
        const d = a[f * nFramesA + frameA] - b[f * nFramesB + frameB];
        sum += d * d;
    }
    return Math.sqrt(sum);
}

/**
 * DTW with optional Sakoe-Chiba band constraint.
 * Returns the accumulated cost at the end of the optimal warping path.
 * When normalize=true the cost is divided by (n+m) to be length-independent.
 */
function dtw(
    live: Float32Array, nFramesLive: number,
    tmpl: Float32Array, nFramesTmpl: number,
    nFeatures: number,
    band: number,       // Sakoe-Chiba radius, -1 = no constraint
    normalize: boolean,
): number {
    const n = nFramesLive;
    const m = nFramesTmpl;
    const INF = Infinity;

    // Cost matrix stored row-major: cost[i*m + j]
    const cost = new Float32Array(n * m).fill(INF);

    for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
            // Sakoe-Chiba band
            if (band >= 0 && Math.abs(i - j) > band) continue;

            const d = frameDist(live, i, n, tmpl, j, m, nFeatures);
            const top  = i > 0 ? cost[(i - 1) * m + j] : INF;
            const left = j > 0 ? cost[i * m + (j - 1)] : INF;
            const diag = (i > 0 && j > 0) ? cost[(i - 1) * m + (j - 1)] : INF;

            const prev = (i === 0 && j === 0) ? 0 : Math.min(top, left, diag);
            cost[i * m + j] = d + (prev === INF ? 0 : prev);
        }
    }

    const raw = cost[(n - 1) * m + (m - 1)];
    return normalize ? raw / (n + m) : raw;
}

/**
 * SpDTW: Dynamic Time Warping distance between two MFCC sequences.
 *
 * Typical use: detect a spoken name by comparing incoming audio against a
 * per-asset enrolled template.  A low distance means the sequences match.
 *
 * Inputs:
 *   [0]  live     — MFCC of incoming audio     [n_features, n_frames_live]
 *   [1]  template — MFCC of enrolled reference [n_features, n_frames_template]
 *
 * Output: [1] — DTW distance (lower = closer match)
 *
 * Attributes:
 *   normalize  (0=raw, 1=divide by n+m,  default 1)
 *   band       (Sakoe-Chiba radius, -1=no constraint, default -1)
 */
class SpDTWNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    private readonly normalize: boolean;
    private readonly band: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this.normalize = this.attrInt("normalize", 1) !== 0;
        this.band = this.attrInt("band", -1);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const live = inputs[0];
        const tmpl = inputs[1];

        // Both inputs must be [n_features, n_frames] — same feature dimension
        const nFeatures = live.shape[0];
        const nFramesLive = live.shape[1] ?? 1;
        const nFramesTmpl = tmpl.shape[1] ?? 1;

        const distance = dtw(
            live.data, nFramesLive,
            tmpl.data, nFramesTmpl,
            nFeatures,
            this.band,
            this.normalize,
        );

        return [makeTensor(new Float32Array([distance]), [1])];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Enrollment utility
// ═══════════════════════════════════════════════════════════════════════════

export interface MfccParams {
    sampleRate?: number;   // default 16000
    nMfcc?: number;        // default 40
    nFft?: number;         // default 512
    hopLength?: number;    // default 160
    nMels?: number;        // default 40
    windowType?: number;   // 0=hann, 1=hamming, default 0
}

export interface DtwTemplate {
    data: Float32Array;    // [n_mfcc, n_frames]
    shape: [number, number];
    params: Required<MfccParams>;
}

/**
 * Compute MFCC for a single raw audio buffer using the same internal
 * pipeline as SpMFCC.  Returns [n_mfcc, n_frames].
 */
function mfccFromAudio(audio: Float32Array, p: Required<MfccParams>): { data: Float32Array; nFrames: number } {
    const nFrames = Math.floor((audio.length - p.nFft) / p.hopLength) + 1;
    if (!mfccFromAudio._fb) { /* lazy init below */ }

    const fb = buildMelFilterbank(p.nMels, p.nFft, p.sampleRate);
    const engine = getFFTEngine(p.nFft);
    const winFn = p.windowType === 1 ? hammingWindow : hannWindow;
    const nBins = p.nFft / 2 + 1;
    const mfcc = new Float32Array(p.nMfcc * nFrames);
    const frame = new Float32Array(p.nFft);
    const melSpec = new Float32Array(p.nMels);

    for (let t = 0; t < nFrames; t++) {
        const start = t * p.hopLength;
        for (let i = 0; i < p.nFft; i++) {
            const idx = start + i;
            frame[i] = idx < audio.length ? audio[idx] * winFn(p.nFft, i) : 0;
        }
        const power = engine.forward(frame);
        for (let m = 0; m < p.nMels; m++) {
            let sum = 0;
            for (let k = 0; k < nBins; k++) sum += fb[m][k] * power[k];
            melSpec[m] = Math.log(Math.max(sum, 1e-10));
        }
        for (let c = 0; c < p.nMfcc; c++) {
            let sum = 0;
            for (let m = 0; m < p.nMels; m++) {
                sum += melSpec[m] * Math.cos(Math.PI * c * (2 * m + 1) / (2 * p.nMels));
            }
            mfcc[c * nFrames + t] = sum;
        }
    }
    return { data: mfcc, nFrames };
}
// ts requires property to exist for the lazy-init trick above
mfccFromAudio._fb = null as null;

/**
 * Linearly resample an MFCC matrix [n_mfcc, srcFrames] to [n_mfcc, dstFrames].
 * Used to normalize frame counts before averaging multiple enrollment samples.
 */
function resampleMfcc(src: Float32Array, nMfcc: number, srcFrames: number, dstFrames: number): Float32Array {
    const out = new Float32Array(nMfcc * dstFrames);
    for (let t = 0; t < dstFrames; t++) {
        const srcT = t * (srcFrames - 1) / Math.max(dstFrames - 1, 1);
        const lo = Math.floor(srcT);
        const hi = Math.min(lo + 1, srcFrames - 1);
        const frac = srcT - lo;
        for (let c = 0; c < nMfcc; c++) {
            out[c * dstFrames + t] =
                src[c * srcFrames + lo] * (1 - frac) +
                src[c * srcFrames + hi] * frac;
        }
    }
    return out;
}

/**
 * Enroll a name from one or more raw audio recordings.
 *
 * Each sample is processed through the MFCC pipeline, resampled to the
 * median frame count, then averaged element-wise to produce a single
 * robust template ready to be injected into SpDTW as input[1].
 *
 * @param samples   One or more Float32Array of raw PCM audio (same sample rate)
 * @param params    MFCC parameters — must match those used during inference
 * @returns         DtwTemplate ready for use with injectTemplate()
 *
 * @example
 * const template = enroll([recording1, recording2], { sampleRate: 16000 });
 * // At inference time:
 * externalInputs.set("dtw_template", injectTemplate(template));
 */
export function enroll(samples: Float32Array[], params: MfccParams = {}): DtwTemplate {
    if (samples.length === 0) throw new Error("enroll: at least one sample required");

    const p: Required<MfccParams> = {
        sampleRate: params.sampleRate ?? 16000,
        nMfcc:      params.nMfcc      ?? 40,
        nFft:       params.nFft       ?? 512,
        hopLength:  params.hopLength  ?? 160,
        nMels:      params.nMels      ?? 40,
        windowType: params.windowType ?? 0,
    };

    // Compute MFCC for each sample
    const computed = samples.map((s) => mfccFromAudio(s, p));

    // Normalize to median frame count
    const frameCounts = computed.map((c) => c.nFrames).sort((a, b) => a - b);
    const targetFrames = frameCounts[Math.floor(frameCounts.length / 2)];

    // Resample and average
    const avg = new Float32Array(p.nMfcc * targetFrames);
    for (const { data, nFrames } of computed) {
        const resampled = nFrames === targetFrames
            ? data
            : resampleMfcc(data, p.nMfcc, nFrames, targetFrames);
        for (let i = 0; i < avg.length; i++) avg[i] += resampled[i];
    }
    for (let i = 0; i < avg.length; i++) avg[i] /= samples.length;

    return { data: avg, shape: [p.nMfcc, targetFrames], params: p };
}

/**
 * Serialize a DtwTemplate to a plain JSON-safe object for storage
 * (localStorage, IndexedDB, asset config file, etc.).
 */
export function serializeTemplate(t: DtwTemplate): { data: number[]; shape: [number, number]; params: Required<MfccParams> } {
    return { data: Array.from(t.data), shape: t.shape, params: t.params };
}

/**
 * Deserialize a stored template back to a DtwTemplate.
 */
export function deserializeTemplate(raw: ReturnType<typeof serializeTemplate>): DtwTemplate {
    return { data: new Float32Array(raw.data), shape: raw.shape, params: raw.params };
}

/**
 * Wrap a DtwTemplate as an ITensor ready to inject into graph.run()
 * as the "dtw_template" external input.
 */
export function templateToTensor(t: DtwTemplate): ITensor {
    return { data: t.data, shape: [...t.shape] };
}

// ═══════════════════════════════════════════════════════════════════════════
// Registration
// ═══════════════════════════════════════════════════════════════════════════

export function registerDspOps(registry: OnnxOpRegistry): void {
    registry.register("SpFFT", (info) => new SpFFTNode(info));
    registry.register("SpWindow", (info) => new SpWindowNode(info));
    registry.register("SpMelFilterbank", (info) => new SpMelFilterbankNode(info));
    registry.register("SpLogScale", (info) => new SpLogScaleNode(info));
    registry.register("SpDCT", (info) => new SpDCTNode(info));
    registry.register("SpMFCC", (info) => new SpMFCCNode(info));
    registry.register("SpDTW", (info) => new SpDTWNode(info));
}
