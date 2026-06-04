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

import type { ITensor } from "spikypanda-core";
import { cloneable, editable } from "spikypanda-core";
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
        this._loadReal(buffer);
        this._butterfly();
        const nBins = this.size / 2 + 1;
        const power = new Float32Array(nBins);
        for (let i = 0; i < nBins; i++) {
            power[i] = this.real[i] * this.real[i] + this.imag[i] * this.imag[i];
        }
        return power;
    }

    /**
     * Forward FFT. Returns the unique half of the spectrum as interleaved
     * real/imag pairs: [re_0, im_0, re_1, im_1, ..., re_{N/2}, im_{N/2}].
     * Length = 2 * (N/2 + 1).
     */
    forwardComplex(buffer: Float32Array): Float32Array {
        this._loadReal(buffer);
        this._butterfly();
        const nBins = this.size / 2 + 1;
        const out = new Float32Array(nBins * 2);
        for (let i = 0; i < nBins; i++) {
            out[i * 2] = this.real[i];
            out[i * 2 + 1] = this.imag[i];
        }
        return out;
    }

    /**
     * Inverse FFT from a Hermitian half-spectrum [re_0, im_0, ..., re_{N/2}, im_{N/2}]
     * back to an N-sample real-valued time-domain signal. Uses the conjugate
     * trick: ifft(X) = conj(fft(conj(X))) / N.
     */
    inverse(complexHalf: Float32Array): Float32Array {
        const N = this.size;
        const half = N >> 1;
        const reverseTable = this.reverseTable;
        const real = this.real;
        const imag = this.imag;

        // Expand the half-spectrum into a temporary full spectrum
        // (DC and Nyquist are real, every other bin mirrors as conjugate).
        const fullReal = new Float64Array(N);
        const fullImag = new Float64Array(N);
        fullReal[0] = complexHalf[0];
        fullReal[half] = complexHalf[half * 2];
        for (let k = 1; k < half; k++) {
            const re = complexHalf[k * 2];
            const im = complexHalf[k * 2 + 1];
            fullReal[k] = re;
            fullImag[k] = im;
            fullReal[N - k] = re;
            fullImag[N - k] = -im;
        }

        // Conjugate (IFFT trick) and bit-reverse permute in one pass.
        for (let i = 0; i < N; i++) {
            const j = reverseTable[i];
            real[i] = fullReal[j];
            imag[i] = -fullImag[j];
        }

        this._butterfly();

        const out = new Float32Array(N);
        const invN = 1 / N;
        for (let i = 0; i < N; i++) out[i] = real[i] * invN;
        return out;
    }

    private _loadReal(buffer: Float32Array): void {
        const N = this.size;
        const reverseTable = this.reverseTable;
        const real = this.real;
        const imag = this.imag;
        for (let i = 0; i < N; i++) {
            real[i] = buffer[reverseTable[i]] ?? 0;
            imag[i] = 0;
        }
    }

    private _butterfly(): void {
        const N = this.size;
        const real = this.real;
        const imag = this.imag;
        const cosTable = this.cosTable;
        const sinTable = this.sinTable;

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
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Window functions (ported from dsp.js)
//
// Window-type IDs are stable; new types append. Tukey carries an extra
// alpha parameter (taper fraction, 0..1) defaulted at the call site.
// ═══════════════════════════════════════════════════════════════════════════

export const WINDOW_HANN = 0;
export const WINDOW_HAMMING = 1;
export const WINDOW_BLACKMAN = 2;
export const WINDOW_BARTLETT = 3;
export const WINDOW_RECTANGULAR = 4;
export const WINDOW_TUKEY = 5;

function hannWindow(length: number, index: number): number {
    return 0.5 * (1 - Math.cos((2 * Math.PI * index) / (length - 1)));
}

function hammingWindow(length: number, index: number): number {
    return 0.54 - 0.46 * Math.cos((2 * Math.PI * index) / (length - 1));
}

function blackmanWindow(length: number, index: number): number {
    const x = (2 * Math.PI * index) / (length - 1);
    return 0.42 - 0.5 * Math.cos(x) + 0.08 * Math.cos(2 * x);
}

function bartlettWindow(length: number, index: number): number {
    const half = (length - 1) / 2;
    return 1 - Math.abs((index - half) / half);
}

function rectangularWindow(_length: number, _index: number): number {
    return 1;
}

function tukeyWindow(length: number, index: number, alpha: number): number {
    if (alpha <= 0) return 1;
    if (alpha >= 1) return hannWindow(length, index);
    const edge = (alpha * (length - 1)) / 2;
    if (index < edge) {
        return 0.5 * (1 + Math.cos(Math.PI * (index / edge - 1)));
    }
    if (index > length - 1 - edge) {
        return 0.5 * (1 + Math.cos(Math.PI * ((index - (length - 1 - edge)) / edge)));
    }
    return 1;
}

type WindowFn = (length: number, index: number) => number;

function windowFn(type: number, alpha: number): WindowFn {
    switch (type) {
        case WINDOW_HAMMING:
            return hammingWindow;
        case WINDOW_BLACKMAN:
            return blackmanWindow;
        case WINDOW_BARTLETT:
            return bartlettWindow;
        case WINDOW_RECTANGULAR:
            return rectangularWindow;
        case WINDOW_TUKEY:
            return (n, i) => tukeyWindow(n, i, alpha);
        case WINDOW_HANN:
        default:
            return hannWindow;
    }
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
        melPoints[i] = melMin + ((melMax - melMin) * i) / (nMels + 1);
    }

    // Convert to FFT bin indices
    const bins = new Int32Array(nMels + 2);
    for (let i = 0; i < nMels + 2; i++) {
        bins[i] = Math.floor(((nFft + 1) * melToHz(melPoints[i])) / sampleRate);
    }

    // Build triangular filters
    const fb: Float32Array[] = [];
    for (let m = 0; m < nMels; m++) {
        const row = new Float32Array(nBins);
        const left = bins[m],
            center = bins[m + 1],
            right = bins[m + 2];
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
            sum += input[n] * Math.cos((Math.PI * k * (2 * n + 1)) / (2 * N));
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
 * SpFFT: forward FFT of a 1D signal.
 * Input:  [samples] time-domain frame
 * Output depends on `output_type`:
 *   0 (power, default)   [nfft/2+1]
 *   1 (magnitude)        [nfft/2+1]
 *   2 (complex)          [nfft/2+1, 2]  interleaved real/imag
 * Attributes: nfft (default 512), output_type (default 0)
 */
export const FFT_OUTPUT_POWER = 0;
export const FFT_OUTPUT_MAGNITUDE = 1;
export const FFT_OUTPUT_COMPLEX = 2;

class SpFFTNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    @cloneable private _nfft: number;
    @cloneable private _outputType: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this._nfft = this.attrInt("nfft", 512);
        this._outputType = this.attrInt("output_type", FFT_OUTPUT_POWER);
    }

    @editable("number", { min: 16, step: 16, unit: "bins" })
    public get nfft(): number {
        return this._nfft;
    }
    public set nfft(v: number) {
        // FFT engine tables are sized to nfft; the shared module-level
        // cache (getFFTEngine) auto-builds a new one on first request,
        // so we only need to update the field — no per-instance cache
        // to invalidate.
        this.setField("nfft", this._nfft, v, (x) => {
            this._nfft = x;
        });
    }

    /**
     * Numeric output-type accessor, kept for backwards compatibility
     * with any external code that pokes the integer directly. NOT
     * decorated `@editable` anymore — the property panel exposes
     * `outputMode` (string dropdown) below instead, which is the
     * human-facing knob and maps to the same backing `_outputType`
     * field. Persistence still rides on the `@cloneable _outputType`
     * declaration above, so the value round-trips through save/load
     * even when the user only ever touched the `outputMode` editor.
     */
    public get outputType(): number {
        return this._outputType;
    }
    public set outputType(v: number) {
        this.setField("outputType", this._outputType, v, (x) => {
            this._outputType = x;
        });
        // Mirror so any `outputMode` observers (property panel string
        // editor) see the change too. Same underlying field, two views.
        this.notifyOutputModeChanged();
    }

    /**
     * String-enum editable for the FFT output type. Three values:
     *   "power"     — |X[k]|² (default, what most analysis pipelines want)
     *   "magnitude" — |X[k]|   (for direct amplitude readouts)
     *   "complex"   — interleaved Re/Im pairs (for downstream IFFT etc.)
     * Mapped onto the same `_outputType` integer field that `execute()`
     * switches on; no extra storage. Decorated `@editable("string", ...)`
     * with a pipe-separated unit, so the built-in string editor renders
     * a dropdown with these three options.
     */
    @editable("string", { unit: "power | magnitude | complex" })
    public get outputMode(): "power" | "magnitude" | "complex" {
        switch (this._outputType) {
            case FFT_OUTPUT_MAGNITUDE: return "magnitude";
            case FFT_OUTPUT_COMPLEX: return "complex";
            default: return "power";
        }
    }
    public set outputMode(v: "power" | "magnitude" | "complex") {
        const next =
            v === "magnitude" ? FFT_OUTPUT_MAGNITUDE :
            v === "complex" ? FFT_OUTPUT_COMPLEX :
            FFT_OUTPUT_POWER;
        // setField guards on equality so a no-op assign doesn't fire a
        // spurious notification. The propertyName is `outputMode` so
        // the editor's onPropertyChanged subscription matches the field
        // it actually rendered.
        this.setField("outputMode", this._outputType, next, (x) => {
            this._outputType = x;
        });
    }

    /**
     * Fire a synthetic `outputMode` notification whenever someone
     * touches the legacy numeric `outputType` setter. Keeps the
     * property-panel dropdown in sync with programmatic mutations
     * (e.g. a load path that writes `outputType = 1` directly, or a
     * graph deserialize that runs `_outputType = 1` and then calls
     * the setter). Cheap — short-circuits when nobody's listening.
     */
    private notifyOutputModeChanged(): void {
        const obs = this.onPropertyChanged;
        if (!obs.hasObservers()) return;
        obs.notifyObservers({
            object: this,
            previousValue: undefined,
            newValue: this.outputMode,
            propertyName: "outputMode",
        } as never);
    }

    execute(inputs: ITensor[]): ITensor[] {
        const signal = inputs[0];
        const engine = getFFTEngine(this._nfft);

        const frame = new Float32Array(this._nfft);
        const len = Math.min(signal.data.length, this._nfft);
        for (let i = 0; i < len; i++) frame[i] = signal.data[i];

        const nBins = this._nfft / 2 + 1;
        switch (this._outputType) {
            case FFT_OUTPUT_COMPLEX: {
                const complex = engine.forwardComplex(frame);
                return [makeTensor(complex, [nBins, 2])];
            }
            case FFT_OUTPUT_MAGNITUDE: {
                const power = engine.forward(frame);
                const mag = new Float32Array(nBins);
                for (let i = 0; i < nBins; i++) mag[i] = Math.sqrt(power[i]);
                return [makeTensor(mag, [nBins])];
            }
            case FFT_OUTPUT_POWER:
            default: {
                const power = engine.forward(frame);
                return [makeTensor(power, [nBins])];
            }
        }
    }
}

/**
 * SpIFFT: inverse FFT from a Hermitian half-spectrum.
 * Input:  [nfft/2+1, 2] interleaved real/imag pairs
 * Output: [nfft] real time-domain samples
 * Attributes: nfft (default 512)
 */
class SpIFFTNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    @cloneable private _nfft: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this._nfft = this.attrInt("nfft", 512);
    }

    @editable("number", { min: 16, step: 16, unit: "bins" })
    public get nfft(): number {
        return this._nfft;
    }
    public set nfft(v: number) {
        this.setField("nfft", this._nfft, v, (x) => {
            this._nfft = x;
        });
    }

    execute(inputs: ITensor[]): ITensor[] {
        const engine = getFFTEngine(this._nfft);
        const time = engine.inverse(inputs[0].data);
        return [makeTensor(time, [this._nfft])];
    }
}

/**
 * SpMagnitude: |z| for a complex tensor stored as [..., 2] interleaved real/imag.
 * Output keeps every leading axis and drops the trailing 2.
 */
class SpMagnitudeNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];

    execute(inputs: ITensor[]): ITensor[] {
        const c = inputs[0];
        const n = c.data.length >> 1;
        const out = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const re = c.data[i * 2];
            const im = c.data[i * 2 + 1];
            out[i] = Math.sqrt(re * re + im * im);
        }
        const shape = c.shape.length >= 1 ? c.shape.slice(0, -1) : [n];
        return [makeTensor(out, shape)];
    }
}

/**
 * SpPhase: atan2(im, re) for a complex tensor stored as [..., 2] interleaved.
 */
class SpPhaseNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];

    execute(inputs: ITensor[]): ITensor[] {
        const c = inputs[0];
        const n = c.data.length >> 1;
        const out = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            out[i] = Math.atan2(c.data[i * 2 + 1], c.data[i * 2]);
        }
        const shape = c.shape.length >= 1 ? c.shape.slice(0, -1) : [n];
        return [makeTensor(out, shape)];
    }
}

/**
 * SpWindow: apply a window function to a 1D frame.
 * Input:  [samples]
 * Output: [samples]
 * Attributes:
 *   window_type   0=hann (default), 1=hamming, 2=blackman, 3=bartlett, 4=rectangular, 5=tukey
 *   alpha         Tukey taper fraction in [0, 1] (default 0.5; ignored for other types)
 */
class SpWindowNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    @cloneable private _windowType: number;
    @cloneable private _alpha: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this._windowType = this.attrInt("window_type", WINDOW_HANN);
        this._alpha = this.attr("alpha", 0.5);
    }

    @editable("number", { min: 0, max: 5, step: 1, unit: "0=hann 1=hamm 2=black 3=bart 4=rect 5=tukey" })
    public get windowType(): number {
        return this._windowType;
    }
    public set windowType(v: number) {
        this.setField("windowType", this._windowType, v, (x) => {
            this._windowType = x;
        });
    }

    @editable("number", { min: 0, max: 1, step: 0.05 })
    public get alpha(): number {
        return this._alpha;
    }
    public set alpha(v: number) {
        this.setField("alpha", this._alpha, v, (x) => {
            this._alpha = x;
        });
    }

    execute(inputs: ITensor[]): ITensor[] {
        const input = inputs[0];
        const N = input.data.length;
        const out = new Float32Array(N);
        const fn = windowFn(this._windowType, this._alpha);
        for (let i = 0; i < N; i++) {
            out[i] = input.data[i] * fn(N, i);
        }
        return [makeTensor(out, [...input.shape])];
    }
}

/**
 * SpFrame: slice a 1D signal into overlapping frames.
 * Input:  [samples]
 * Output: [n_frames, frame_size]
 * Attributes:
 *   frame_size   number of samples per frame (default 512)
 *   hop_length   stride between consecutive frames (default 256)
 *   pad_mode     0=drop trailing partial frame (default), 1=zero-pad it
 */
class SpFrameNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    @cloneable private _frameSize: number;
    @cloneable private _hopLength: number;
    @cloneable private _padMode: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this._frameSize = this.attrInt("frame_size", 512);
        this._hopLength = this.attrInt("hop_length", 256);
        this._padMode = this.attrInt("pad_mode", 0);
    }

    @editable("number", { min: 2, step: 2, unit: "samples" })
    public get frameSize(): number {
        return this._frameSize;
    }
    public set frameSize(v: number) {
        this.setField("frameSize", this._frameSize, v, (x) => {
            this._frameSize = x;
        });
    }

    @editable("number", { min: 1, step: 1, unit: "samples" })
    public get hopLength(): number {
        return this._hopLength;
    }
    public set hopLength(v: number) {
        this.setField("hopLength", this._hopLength, v, (x) => {
            this._hopLength = x;
        });
    }

    @editable("number", { min: 0, max: 1, step: 1, unit: "0=drop 1=zero-pad" })
    public get padMode(): number {
        return this._padMode;
    }
    public set padMode(v: number) {
        this.setField("padMode", this._padMode, v, (x) => {
            this._padMode = x;
        });
    }

    execute(inputs: ITensor[]): ITensor[] {
        const x = inputs[0].data;
        const N = x.length;
        const F = this._frameSize;
        const H = this._hopLength;

        let nFrames: number;
        if (this._padMode === 1) {
            // Every start index < N produces a frame (trailing samples are zero-padded).
            nFrames = N <= 0 ? 0 : Math.floor((N - 1) / H) + 1;
        } else {
            // Only frames that fit entirely within the signal.
            nFrames = N < F ? 0 : Math.floor((N - F) / H) + 1;
        }

        const out = new Float32Array(nFrames * F);
        for (let t = 0; t < nFrames; t++) {
            const start = t * H;
            const copyLen = Math.min(F, Math.max(0, N - start));
            for (let i = 0; i < copyLen; i++) out[t * F + i] = x[start + i];
        }
        return [makeTensor(out, [nFrames, F])];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Filters
// ═══════════════════════════════════════════════════════════════════════════

export const BIQUAD_LOWPASS = 0;
export const BIQUAD_HIGHPASS = 1;
export const BIQUAD_BANDPASS = 2;
export const BIQUAD_NOTCH = 3;

/**
 * Compute RBJ-cookbook biquad coefficients normalized by a0.
 * Returns { b0, b1, b2, a1, a2 } ready for Direct Form I:
 *   y[n] = b0*x[n] + b1*x[n-1] + b2*x[n-2] - a1*y[n-1] - a2*y[n-2]
 */
function biquadCoeffs(
    type: number,
    fs: number,
    f0: number,
    q: number
): {
    b0: number;
    b1: number;
    b2: number;
    a1: number;
    a2: number;
} {
    const w0 = (2 * Math.PI * f0) / fs;
    const cosw = Math.cos(w0);
    const sinw = Math.sin(w0);
    const alpha = sinw / (2 * Math.max(q, 1e-6));
    const a0 = 1 + alpha;

    let b0: number, b1: number, b2: number, a1: number, a2: number;
    switch (type) {
        case BIQUAD_HIGHPASS:
            b0 = (1 + cosw) / 2;
            b1 = -(1 + cosw);
            b2 = (1 + cosw) / 2;
            a1 = -2 * cosw;
            a2 = 1 - alpha;
            break;
        case BIQUAD_BANDPASS:
            b0 = alpha;
            b1 = 0;
            b2 = -alpha;
            a1 = -2 * cosw;
            a2 = 1 - alpha;
            break;
        case BIQUAD_NOTCH:
            b0 = 1;
            b1 = -2 * cosw;
            b2 = 1;
            a1 = -2 * cosw;
            a2 = 1 - alpha;
            break;
        case BIQUAD_LOWPASS:
        default:
            b0 = (1 - cosw) / 2;
            b1 = 1 - cosw;
            b2 = (1 - cosw) / 2;
            a1 = -2 * cosw;
            a2 = 1 - alpha;
            break;
    }
    return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

/**
 * SpBiquadFilter: RBJ biquad applied forward over a 1D signal.
 * Input:  [samples]
 * Output: [samples]
 * Attributes:
 *   filter_type   0=LP (default), 1=HP, 2=BP, 3=Notch
 *   sample_rate   Hz, default 16000
 *   cutoff_hz     center/cutoff frequency, default 1000
 *   q             quality factor, default 0.7071 (Butterworth for LP/HP)
 *
 * State is reset to zero at the start of every execute() call (stateless
 * per inference). For streaming use, run repeated calls with concatenated
 * inputs or hold an external state buffer.
 */
class SpBiquadFilterNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    @cloneable private _filterType: number;
    @cloneable private _sampleRate: number;
    @cloneable private _cutoffHz: number;
    @cloneable private _q: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this._filterType = this.attrInt("filter_type", BIQUAD_LOWPASS);
        this._sampleRate = this.attrInt("sample_rate", 16000);
        this._cutoffHz = this.attr("cutoff_hz", 1000);
        this._q = this.attr("q", Math.SQRT1_2);
    }

    @editable("number", { min: 0, max: 3, step: 1, unit: "0=LP 1=HP 2=BP 3=Notch" })
    public get filterType(): number {
        return this._filterType;
    }
    public set filterType(v: number) {
        this.setField("filterType", this._filterType, v, (x) => {
            this._filterType = x;
        });
    }

    @editable("number", { min: 1, step: 1, unit: "Hz" })
    public get sampleRate(): number {
        return this._sampleRate;
    }
    public set sampleRate(v: number) {
        this.setField("sampleRate", this._sampleRate, v, (x) => {
            this._sampleRate = x;
        });
    }

    @editable("number", { min: 0, step: 10, unit: "Hz" })
    public get cutoffHz(): number {
        return this._cutoffHz;
    }
    public set cutoffHz(v: number) {
        this.setField("cutoffHz", this._cutoffHz, v, (x) => {
            this._cutoffHz = x;
        });
    }

    @editable("number", { min: 0.01, step: 0.1 })
    public get q(): number {
        return this._q;
    }
    public set q(v: number) {
        this.setField("q", this._q, v, (x) => {
            this._q = x;
        });
    }

    execute(inputs: ITensor[]): ITensor[] {
        const x = inputs[0].data;
        const N = x.length;
        const out = new Float32Array(N);
        const { b0, b1, b2, a1, a2 } = biquadCoeffs(this._filterType, this._sampleRate, this._cutoffHz, this._q);

        let x1 = 0,
            x2 = 0,
            y1 = 0,
            y2 = 0;
        for (let n = 0; n < N; n++) {
            const xn = x[n];
            const yn = b0 * xn + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
            out[n] = yn;
            x2 = x1;
            x1 = xn;
            y2 = y1;
            y1 = yn;
        }
        return [makeTensor(out, [...inputs[0].shape])];
    }
}

/**
 * SpKalman1D: scalar (1D) Kalman filter applied sample-by-sample.
 * Random-walk model: x_{k+1} = x_k + w_k, z_k = x_k + v_k.
 * Input:  [samples]
 * Output: [samples] filtered estimates
 * Attributes:
 *   q     process noise variance (default 1e-4)
 *   r     measurement noise variance (default 1e-2)
 *   x0    initial state (default 0)
 *   p0    initial covariance (default 1)
 */
class SpKalman1DNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    @cloneable private _q: number;
    @cloneable private _r: number;
    @cloneable private _x0: number;
    @cloneable private _p0: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this._q = this.attr("q", 1e-4);
        this._r = this.attr("r", 1e-2);
        this._x0 = this.attr("x0", 0);
        this._p0 = this.attr("p0", 1);
    }

    @editable("number", { min: 0, step: 1e-5 })
    public get q(): number {
        return this._q;
    }
    public set q(v: number) {
        this.setField("q", this._q, v, (x) => {
            this._q = x;
        });
    }

    @editable("number", { min: 0, step: 1e-3 })
    public get r(): number {
        return this._r;
    }
    public set r(v: number) {
        this.setField("r", this._r, v, (x) => {
            this._r = x;
        });
    }

    @editable("number")
    public get x0(): number {
        return this._x0;
    }
    public set x0(v: number) {
        this.setField("x0", this._x0, v, (x) => {
            this._x0 = x;
        });
    }

    @editable("number", { min: 0 })
    public get p0(): number {
        return this._p0;
    }
    public set p0(v: number) {
        this.setField("p0", this._p0, v, (x) => {
            this._p0 = x;
        });
    }

    execute(inputs: ITensor[]): ITensor[] {
        const z = inputs[0].data;
        const N = z.length;
        const out = new Float32Array(N);
        let x = this._x0;
        let p = this._p0;
        for (let n = 0; n < N; n++) {
            p = p + this._q;
            const k = p / (p + this._r);
            x = x + k * (z[n] - x);
            p = (1 - k) * p;
            out[n] = x;
        }
        return [makeTensor(out, [...inputs[0].shape])];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Output analysis primitives
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SpRMS: scalar root-mean-square of a 1D signal.
 * Output: [1]
 */
class SpRMSNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];

    execute(inputs: ITensor[]): ITensor[] {
        const x = inputs[0].data;
        const N = x.length;
        let sum = 0;
        for (let i = 0; i < N; i++) sum += x[i] * x[i];
        const rms = N > 0 ? Math.sqrt(sum / N) : 0;
        return [makeTensor(new Float32Array([rms]), [1])];
    }
}

/**
 * SpZeroCrossingRate: fraction of consecutive sample pairs with opposite
 * signs. Output: [1] in [0, 1].
 */
class SpZeroCrossingRateNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];

    execute(inputs: ITensor[]): ITensor[] {
        const x = inputs[0].data;
        const N = x.length;
        if (N < 2) return [makeTensor(new Float32Array([0]), [1])];
        let crossings = 0;
        let prevSign = x[0] >= 0 ? 1 : -1;
        for (let i = 1; i < N; i++) {
            const sign = x[i] >= 0 ? 1 : -1;
            if (sign !== prevSign) crossings++;
            prevSign = sign;
        }
        return [makeTensor(new Float32Array([crossings / (N - 1)]), [1])];
    }
}

/**
 * SpMovingAverage: causal simple moving average over window_size samples.
 * Input:  [samples]
 * Output: [samples] (first window_size-1 samples are averaged over the partial window)
 * Attributes: window_size (default 5)
 */
class SpMovingAverageNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    @cloneable private _windowSize: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this._windowSize = Math.max(1, this.attrInt("window_size", 5));
    }

    @editable("number", { min: 1, step: 1, unit: "samples" })
    public get windowSize(): number {
        return this._windowSize;
    }
    public set windowSize(v: number) {
        const next = Math.max(1, Math.floor(v));
        this.setField("windowSize", this._windowSize, next, (x) => {
            this._windowSize = x;
        });
    }

    execute(inputs: ITensor[]): ITensor[] {
        const x = inputs[0].data;
        const N = x.length;
        const W = this._windowSize;
        const out = new Float32Array(N);
        let sum = 0;
        for (let i = 0; i < N; i++) {
            sum += x[i];
            if (i >= W) sum -= x[i - W];
            const count = Math.min(i + 1, W);
            out[i] = sum / count;
        }
        return [makeTensor(out, [...inputs[0].shape])];
    }
}

/**
 * SpDetrend: remove the constant (mode=0) or linear (mode=1) trend.
 * Input:  [samples]
 * Output: [samples]
 * Attributes: mode (default 1 = linear)
 */
class SpDetrendNode extends OnnxOpNode {
    readonly outputShapes: number[][] = [];
    @cloneable private _mode: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this._mode = this.attrInt("mode", 1);
    }

    @editable("number", { min: 0, max: 1, step: 1, unit: "0=constant 1=linear" })
    public get mode(): number {
        return this._mode;
    }
    public set mode(v: number) {
        this.setField("mode", this._mode, v, (x) => {
            this._mode = x;
        });
    }

    execute(inputs: ITensor[]): ITensor[] {
        const x = inputs[0].data;
        const N = x.length;
        const out = new Float32Array(N);
        if (N === 0) return [makeTensor(out, [...inputs[0].shape])];

        if (this._mode === 0) {
            let mean = 0;
            for (let i = 0; i < N; i++) mean += x[i];
            mean /= N;
            for (let i = 0; i < N; i++) out[i] = x[i] - mean;
        } else {
            // Least-squares fit y = a*i + b over i = 0..N-1.
            let sumX = 0,
                sumY = 0,
                sumXY = 0,
                sumXX = 0;
            for (let i = 0; i < N; i++) {
                sumX += i;
                sumY += x[i];
                sumXY += i * x[i];
                sumXX += i * i;
            }
            const denom = N * sumXX - sumX * sumX;
            const a = denom !== 0 ? (N * sumXY - sumX * sumY) / denom : 0;
            const b = (sumY - a * sumX) / N;
            for (let i = 0; i < N; i++) out[i] = x[i] - (a * i + b);
        }
        return [makeTensor(out, [...inputs[0].shape])];
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
    @cloneable private _nMels: number;
    @cloneable private _nfft: number;
    @cloneable private _sampleRate: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this._nMels = this.attrInt("n_mels", 40);
        this._nfft = this.attrInt("nfft", 512);
        this._sampleRate = this.attrInt("sample_rate", 16000);
    }

    @editable("number", { min: 1, step: 1, unit: "bands" })
    public get nMels(): number {
        return this._nMels;
    }
    public set nMels(v: number) {
        this.setField("nMels", this._nMels, v, (x) => {
            this._nMels = x;
            this.fb = null;
        });
    }

    @editable("number", { min: 16, step: 16, unit: "bins" })
    public get nfft(): number {
        return this._nfft;
    }
    public set nfft(v: number) {
        this.setField("nfft", this._nfft, v, (x) => {
            this._nfft = x;
            this.fb = null;
        });
    }

    @editable("number", { min: 1, step: 1, unit: "Hz" })
    public get sampleRate(): number {
        return this._sampleRate;
    }
    public set sampleRate(v: number) {
        this.setField("sampleRate", this._sampleRate, v, (x) => {
            this._sampleRate = x;
            this.fb = null;
        });
    }

    execute(inputs: ITensor[]): ITensor[] {
        if (!this.fb) {
            this.fb = buildMelFilterbank(this._nMels, this._nfft, this._sampleRate);
        }
        const spectrum = inputs[0];
        const nBins = this._nfft / 2 + 1;
        const out = new Float32Array(this._nMels);
        for (let m = 0; m < this._nMels; m++) {
            let sum = 0;
            const row = this.fb[m];
            for (let k = 0; k < nBins; k++) {
                sum += row[k] * spectrum.data[k];
            }
            out[m] = sum;
        }
        return [makeTensor(out, [this._nMels])];
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
    @cloneable private _floor: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this._floor = this.attr("floor", 1e-10);
    }

    @editable("number", { min: 0, step: 1e-12 })
    public get floor(): number {
        return this._floor;
    }
    public set floor(v: number) {
        this.setField("floor", this._floor, v, (x) => {
            this._floor = x;
        });
    }

    execute(inputs: ITensor[]): ITensor[] {
        const input = inputs[0];
        const out = new Float32Array(input.data.length);
        for (let i = 0; i < input.data.length; i++) {
            out[i] = Math.log(Math.max(input.data[i], this._floor));
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
    @cloneable private _nOutput: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this._nOutput = this.attrInt("n_output", 40);
    }

    @editable("number", { min: 1, step: 1, unit: "coeffs" })
    public get nOutput(): number {
        return this._nOutput;
    }
    public set nOutput(v: number) {
        this.setField("nOutput", this._nOutput, v, (x) => {
            this._nOutput = x;
        });
    }

    execute(inputs: ITensor[]): ITensor[] {
        const input = inputs[0];
        const out = dctII(input.data, this._nOutput);
        return [makeTensor(out, [this._nOutput])];
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
    @cloneable private _sampleRate: number;
    @cloneable private _nMfcc: number;
    @cloneable private _nFft: number;
    @cloneable private _hopLength: number;
    @cloneable private _nMels: number;
    @cloneable private _windowType: number;
    private fb: Float32Array[] | null = null;
    private fftEngine: FFTEngine | null = null;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this._sampleRate = this.attrInt("sample_rate", 16000);
        this._nMfcc = this.attrInt("n_mfcc", 40);
        this._nFft = this.attrInt("n_fft", 512);
        this._hopLength = this.attrInt("hop_length", 160);
        this._nMels = this.attrInt("n_mels", 40);
        this._windowType = this.attrInt("window_type", 0);
    }

    // Mel + FFT caches are sized by (n_mels, n_fft, sample_rate); any
    // change invalidates them so the next execute() rebuilds.
    private _invalidateCaches(): void {
        this.fb = null;
        this.fftEngine = null;
    }

    @editable("number", { min: 1, step: 1, unit: "Hz" })
    public get sampleRate(): number {
        return this._sampleRate;
    }
    public set sampleRate(v: number) {
        this.setField("sampleRate", this._sampleRate, v, (x) => {
            this._sampleRate = x;
            this._invalidateCaches();
        });
    }

    @editable("number", { min: 1, step: 1, unit: "coeffs" })
    public get nMfcc(): number {
        return this._nMfcc;
    }
    public set nMfcc(v: number) {
        this.setField("nMfcc", this._nMfcc, v, (x) => {
            this._nMfcc = x;
        });
    }

    @editable("number", { min: 16, step: 16, unit: "bins" })
    public get nFft(): number {
        return this._nFft;
    }
    public set nFft(v: number) {
        this.setField("nFft", this._nFft, v, (x) => {
            this._nFft = x;
            this._invalidateCaches();
        });
    }

    @editable("number", { min: 1, step: 1, unit: "samples" })
    public get hopLength(): number {
        return this._hopLength;
    }
    public set hopLength(v: number) {
        this.setField("hopLength", this._hopLength, v, (x) => {
            this._hopLength = x;
        });
    }

    @editable("number", { min: 1, step: 1, unit: "bands" })
    public get nMels(): number {
        return this._nMels;
    }
    public set nMels(v: number) {
        this.setField("nMels", this._nMels, v, (x) => {
            this._nMels = x;
            this._invalidateCaches();
        });
    }

    @editable("number", { min: 0, max: 1, step: 1, unit: "0=hann 1=hamm" })
    public get windowType(): number {
        return this._windowType;
    }
    public set windowType(v: number) {
        this.setField("windowType", this._windowType, v, (x) => {
            this._windowType = x;
        });
    }

    execute(inputs: ITensor[]): ITensor[] {
        const audio = inputs[0].data;
        const nFrames = Math.floor((audio.length - this._nFft) / this._hopLength) + 1;

        // Lazy init
        if (!this.fb) this.fb = buildMelFilterbank(this._nMels, this._nFft, this._sampleRate);
        if (!this.fftEngine) this.fftEngine = getFFTEngine(this._nFft);

        const winFn = this._windowType === 1 ? hammingWindow : hannWindow;
        const nBins = this._nFft / 2 + 1;
        const mfcc = new Float32Array(this._nMfcc * nFrames);

        const frame = new Float32Array(this._nFft);
        const melSpec = new Float32Array(this._nMels);

        for (let t = 0; t < nFrames; t++) {
            const start = t * this._hopLength;

            // Window
            for (let i = 0; i < this._nFft; i++) {
                const idx = start + i;
                frame[i] = idx < audio.length ? audio[idx] * winFn(this._nFft, i) : 0;
            }

            // FFT → power spectrum
            const power = this.fftEngine.forward(frame);

            // Mel filterbank
            for (let m = 0; m < this._nMels; m++) {
                let sum = 0;
                const row = this.fb[m];
                for (let k = 0; k < nBins; k++) sum += row[k] * power[k];
                melSpec[m] = Math.log(Math.max(sum, 1e-10));
            }

            // DCT → MFCC
            for (let c = 0; c < this._nMfcc; c++) {
                let sum = 0;
                for (let m = 0; m < this._nMels; m++) {
                    sum += melSpec[m] * Math.cos((Math.PI * c * (2 * m + 1)) / (2 * this._nMels));
                }
                mfcc[c * nFrames + t] = sum;
            }
        }

        return [makeTensor(mfcc, [this._nMfcc, nFrames])];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// DTW — Dynamic Time Warping
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Euclidean distance between two frames extracted from [n_features, n_frames]
 * packed Float32Arrays.
 */
function frameDist(a: Float32Array, frameA: number, nFramesA: number, b: Float32Array, frameB: number, nFramesB: number, nFeatures: number): number {
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
    live: Float32Array,
    nFramesLive: number,
    tmpl: Float32Array,
    nFramesTmpl: number,
    nFeatures: number,
    band: number, // Sakoe-Chiba radius, -1 = no constraint
    normalize: boolean
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
            const top = i > 0 ? cost[(i - 1) * m + j] : INF;
            const left = j > 0 ? cost[i * m + (j - 1)] : INF;
            const diag = i > 0 && j > 0 ? cost[(i - 1) * m + (j - 1)] : INF;

            const prev = i === 0 && j === 0 ? 0 : Math.min(top, left, diag);
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
    @cloneable private _normalize: boolean;
    @cloneable private _band: number;

    constructor(info: OnnxNodeInfo) {
        super(info);
        this._normalize = this.attrInt("normalize", 1) !== 0;
        this._band = this.attrInt("band", -1);
    }

    @editable("boolean")
    public get normalize(): boolean {
        return this._normalize;
    }
    public set normalize(v: boolean) {
        this.setField("normalize", this._normalize, v, (x) => {
            this._normalize = x;
        });
    }

    @editable("number", { min: -1, step: 1, unit: "frames (-1=no constraint)" })
    public get band(): number {
        return this._band;
    }
    public set band(v: number) {
        this.setField("band", this._band, v, (x) => {
            this._band = x;
        });
    }

    execute(inputs: ITensor[]): ITensor[] {
        const live = inputs[0];
        const tmpl = inputs[1];

        // Both inputs must be [n_features, n_frames] — same feature dimension
        const nFeatures = live.shape[0];
        const nFramesLive = live.shape[1] ?? 1;
        const nFramesTmpl = tmpl.shape[1] ?? 1;

        const distance = dtw(live.data, nFramesLive, tmpl.data, nFramesTmpl, nFeatures, this._band, this._normalize);

        return [makeTensor(new Float32Array([distance]), [1])];
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// Enrollment utility
// ═══════════════════════════════════════════════════════════════════════════

export interface MfccParams {
    sampleRate?: number; // default 16000
    nMfcc?: number; // default 40
    nFft?: number; // default 512
    hopLength?: number; // default 160
    nMels?: number; // default 40
    windowType?: number; // 0=hann, 1=hamming, default 0
}

export interface DtwTemplate {
    data: Float32Array; // [n_mfcc, n_frames]
    shape: [number, number];
    params: Required<MfccParams>;
}

/**
 * Compute MFCC for a single raw audio buffer using the same internal
 * pipeline as SpMFCC.  Returns [n_mfcc, n_frames].
 */
function mfccFromAudio(audio: Float32Array, p: Required<MfccParams>): { data: Float32Array; nFrames: number } {
    const nFrames = Math.floor((audio.length - p.nFft) / p.hopLength) + 1;
    if (!mfccFromAudio._fb) {
        /* lazy init below */
    }

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
                sum += melSpec[m] * Math.cos((Math.PI * c * (2 * m + 1)) / (2 * p.nMels));
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
        const srcT = (t * (srcFrames - 1)) / Math.max(dstFrames - 1, 1);
        const lo = Math.floor(srcT);
        const hi = Math.min(lo + 1, srcFrames - 1);
        const frac = srcT - lo;
        for (let c = 0; c < nMfcc; c++) {
            out[c * dstFrames + t] = src[c * srcFrames + lo] * (1 - frac) + src[c * srcFrames + hi] * frac;
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
        nMfcc: params.nMfcc ?? 40,
        nFft: params.nFft ?? 512,
        hopLength: params.hopLength ?? 160,
        nMels: params.nMels ?? 40,
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
        const resampled = nFrames === targetFrames ? data : resampleMfcc(data, p.nMfcc, nFrames, targetFrames);
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
    registry.register("SpIFFT", (info) => new SpIFFTNode(info));
    registry.register("SpMagnitude", (info) => new SpMagnitudeNode(info));
    registry.register("SpPhase", (info) => new SpPhaseNode(info));
    registry.register("SpWindow", (info) => new SpWindowNode(info));
    registry.register("SpFrame", (info) => new SpFrameNode(info));
    registry.register("SpMelFilterbank", (info) => new SpMelFilterbankNode(info));
    registry.register("SpLogScale", (info) => new SpLogScaleNode(info));
    registry.register("SpDCT", (info) => new SpDCTNode(info));
    registry.register("SpMFCC", (info) => new SpMFCCNode(info));
    registry.register("SpDTW", (info) => new SpDTWNode(info));
    registry.register("SpBiquadFilter", (info) => new SpBiquadFilterNode(info));
    registry.register("SpKalman1D", (info) => new SpKalman1DNode(info));
    registry.register("SpRMS", (info) => new SpRMSNode(info));
    registry.register("SpZeroCrossingRate", (info) => new SpZeroCrossingRateNode(info));
    registry.register("SpMovingAverage", (info) => new SpMovingAverageNode(info));
    registry.register("SpDetrend", (info) => new SpDetrendNode(info));
}
