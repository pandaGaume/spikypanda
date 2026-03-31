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
// Registration
// ═══════════════════════════════════════════════════════════════════════════

export function registerDspOps(registry: OnnxOpRegistry): void {
    registry.register("SpFFT", (info) => new SpFFTNode(info));
    registry.register("SpWindow", (info) => new SpWindowNode(info));
    registry.register("SpMelFilterbank", (info) => new SpMelFilterbankNode(info));
    registry.register("SpLogScale", (info) => new SpLogScaleNode(info));
    registry.register("SpDCT", (info) => new SpDCTNode(info));
    registry.register("SpMFCC", (info) => new SpMFCCNode(info));
}
