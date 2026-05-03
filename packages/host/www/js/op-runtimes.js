// Runtime implementations for SpikyPanda v1 ops.
//
// Each entry in OP_RUNTIMES is a constructor (`new R()` -> instance with
// init/process/dispose). The graph runner instantiates one per node and
// drives them every animation tick.
//
// Stream payload conventions:
//   - "float" port  ->  { samples: Float32Array, firstT, dt }
//   - "vec2" port (kinematics): { theta: Float32Array, omega: Float32Array,
//                                 firstT, dt }
//
// Phase 3a covers the four ops needed by the seed graph (MotorDC,
// MisalignmentFault, Sum, Sensor). The other faults / Gravity / Scope /
// DatasetCapture follow in Phase 3 follow-ups.

const Sensors = window.SpikypandaSensors;
const TWO_PI = 2 * Math.PI;

// ---- MotorDC ----------------------------------------------------------
// Wraps the existing Sensors.MotorCurrentSource (which exposes signal(t),
// omega, theta(t)) and emits two streams: clean armature current and the
// (theta, omega) kinematics that downstream faults read.
function MotorDcRuntime() {
    this._motor = null;
    this._t = 0;
}
MotorDcRuntime.prototype.init = function (cfg) {
    // The Sensors source accepts every motor field we expose (and a few
    // gravity ones we omit; passing them through is harmless).
    this._motor = new Sensors.MotorCurrentSource(cfg);
    this._t = 0;
};
MotorDcRuntime.prototype.process = function (_inputs, n, dt) {
    const current = new Float32Array(n);
    const theta = new Float32Array(n);
    const omega = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const t = this._t + i * dt;
        // motor.signal(t) advances the source's internal state and returns
        // the armature current at t. Reading theta/omega afterwards gives
        // the kinematic state that produced this sample.
        current[i] = this._motor.signal(t);
        omega[i] = this._motor.omega;
        theta[i] = this._motor.theta(t);
    }
    const firstT = this._t;
    this._t += n * dt;
    return {
        current:    { samples: current, firstT: firstT, dt: dt },
        kinematics: { theta: theta, omega: omega, firstT: firstT, dt: dt },
    };
};
MotorDcRuntime.prototype.dispose = function () { this._motor = null; };

// ---- MisalignmentFault ------------------------------------------------
// Reads the motor's kinematics stream and emits a current contribution at
// 1x and 2x mechanical frequency. Using theta directly (not fMech*t) so
// the formula stays correct under variable speed.
function MisalignmentFaultRuntime() { this._cfg = null; }
MisalignmentFaultRuntime.prototype.init = function (cfg) { this._cfg = cfg; };
MisalignmentFaultRuntime.prototype.process = function (inputs, n, dt) {
    const kin = inputs.get("kinematics");
    const out = new Float32Array(n);
    if (!kin || !kin.theta) {
        return { current: { samples: out, firstT: 0, dt: dt } };
    }
    // Propagate muted: if the motor (kinematics source) is paused, the fault
    // contribution is also silent so downstream (Sum, Sensor) see pure zeros.
    if (kin.muted) {
        return { current: { samples: out, firstT: kin.firstT, dt: dt, muted: true } };
    }
    const s = this._cfg.severity || 0;
    for (let i = 0; i < n; i++) {
        const th = kin.theta[i];
        out[i] = s * (0.30 * Math.sin(th) + 0.20 * Math.sin(2 * th));
    }
    return { current: { samples: out, firstT: kin.firstT, dt: dt } };
};
MisalignmentFaultRuntime.prototype.dispose = function () {};

// ---- Sum --------------------------------------------------------------
// Variadic. Iterates every wired input regardless of its index in the
// `in_<N>` series. Unconnected inputs simply do not appear in the inputs
// map, so we never need to look them up by name.
function SumRuntime() {}
SumRuntime.prototype.init = function () {};
SumRuntime.prototype.process = function (inputs, n, dt) {
    const out = new Float32Array(n);
    let firstT = 0;
    let any = false;
    let allMuted = true;
    inputs.forEach(function (inp /*, portName */) {
        if (!inp || !inp.samples) return;
        if (!any) { firstT = inp.firstT; any = true; }
        if (!inp.muted) allMuted = false;
        const s = inp.samples;
        const m = Math.min(n, s.length);
        for (let i = 0; i < m; i++) out[i] += s[i];
    });
    // All connected inputs muted (e.g. motor stopped, faults also muted)
    // -> propagate silence so Sensor skips noise.
    const muted = any && allMuted;
    return { out: { samples: out, firstT: firstT, dt: dt, muted: muted || undefined } };
};
SumRuntime.prototype.dispose = function () {};

// ---- Sensor (ADC) -----------------------------------------------------
// Gain + bias + Gaussian noise. Sample rate is inherited from the input
// stream's dt; this node does not resample.
//
// Mulberry32 RNG state advanced per sample so the noise trace is
// reproducible from a seed. Box-Muller takes two uniforms per Gaussian.
function mulberry32Step(state) {
    state = (state + 0x6D2B79F5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return [(((t ^ (t >>> 14)) >>> 0) / 4294967296), state];
}

function SensorRuntime() {
    this._cfg = null;
    this._rng = 0;
}
SensorRuntime.prototype.init = function (cfg) {
    this._cfg = cfg;
    this._rng = (cfg.rngSeed | 0) || 1;
};
SensorRuntime.prototype.process = function (inputs, n, dt) {
    const inp = inputs.get("in");
    const out = new Float32Array(n);
    if (!inp || !inp.samples) {
        return { out: { samples: out, firstT: 0, dt: dt } };
    }
    // Muted upstream (motor paused, all sources silent): pass through zeros
    // without adding noise so the scope shows a clean flat line.
    if (inp.muted) {
        return { out: { samples: out, firstT: inp.firstT, dt: dt, muted: true } };
    }
    const gain = this._cfg.gain != null ? this._cfg.gain : 1;
    const bias = this._cfg.bias || 0;
    const noiseStd = this._cfg.noiseStd || 0;
    let r = this._rng;
    for (let i = 0; i < n; i++) {
        let noise = 0;
        if (noiseStd > 0) {
            // Box-Muller: two uniforms per Gaussian.
            const a = mulberry32Step(r); const u1 = a[0]; r = a[1];
            const b = mulberry32Step(r); const u2 = b[0]; r = b[1];
            const mag = Math.sqrt(-2 * Math.log(u1 || 1e-9));
            noise = noiseStd * mag * Math.cos(TWO_PI * u2);
        }
        out[i] = gain * inp.samples[i] + bias + noise;
    }
    this._rng = r;
    return { out: { samples: out, firstT: inp.firstT, dt: dt } };
};
SensorRuntime.prototype.dispose = function () {};

// ---- FFT (Hann-windowed magnitude spectrum) ---------------------------
// Iterative Cooley-Tukey, in-place, on `size` real samples (size must be
// a power of 2). Buffers the input stream until a full window is ready,
// then emits one magnitude frame; remains silent in between (the executor
// handles missing port outputs as "publish nothing this tick"). Each
// emitted payload carries `frame: true` so a Scope downstream replaces
// its display buffer rather than appending.
function FftRuntime() {
    this._size = 0;
    this._inBuf = null;
    this._inPos = 0;
    this._mag = null;
    this._window = null;
    this._t = 0;
    this._re = null;
    this._im = null;
}

FftRuntime.prototype.init = function (cfg) {
    let size = cfg && cfg.size ? cfg.size | 0 : 1024;
    // Snap to power of 2 (FFT requires it).
    if ((size & (size - 1)) !== 0 || size < 2) {
        let p = 2;
        while (p < size) p <<= 1;
        size = p;
    }
    this._size = size;
    this._inBuf = new Float32Array(size);
    this._inPos = 0;
    // Magnitude output excludes the DC bin (bin 0). For a non-zero-mean
    // signal the DC term swamps everything in linear scale and the auto-
    // ranging Scope hides the rest of the spectrum at the noise floor.
    // Caller sees `size/2 - 1` bins starting at the lowest non-DC bin.
    this._mag = new Float32Array(size / 2 - 1);
    this._re = new Float32Array(size);
    this._im = new Float32Array(size);
    const useHann = !cfg || cfg.windowType !== "rect";
    this._window = new Float32Array(size);
    if (useHann) {
        for (let i = 0; i < size; i++) {
            this._window[i] = 0.5 * (1 - Math.cos(TWO_PI * i / (size - 1)));
        }
    } else {
        for (let i = 0; i < size; i++) this._window[i] = 1;
    }
    // dcRemoval defaults to true: subtract the block mean before windowing so
    // the motor's DC offset does not swamp the harmonics via spectral leakage.
    this._dcRemoval = !cfg || cfg.dcRemoval !== false;
    this._t = 0;
};

FftRuntime.prototype.process = function (inputs, n, dt) {
    const inp = inputs.get("in");
    if (!inp || !inp.samples) return {};
    const samples = inp.samples;
    let frameOut = null;
    for (let i = 0; i < samples.length; i++) {
        this._inBuf[this._inPos++] = samples[i];
        if (this._inPos >= this._size) {
            // Optional DC removal (default: on). Subtract the block mean before
            // windowing so the motor's DC offset does not leak into the low bins
            // and swamp the harmonics under auto-scale.
            let mean = 0;
            if (this._dcRemoval) {
                for (let k = 0; k < this._size; k++) mean += this._inBuf[k];
                mean /= this._size;
            }

            // Window into re; clear im. FFT in place.
            for (let k = 0; k < this._size; k++) {
                this._re[k] = (this._inBuf[k] - mean) * this._window[k];
                this._im[k] = 0;
            }
            fft(this._re, this._im, this._size);
            // Magnitude over the first half (real signal symmetry).
            // DC bin (k=0) is now near-zero by construction so we can include
            // it or skip it — we keep starting at k=1 to avoid plotting the
            // residual rounding noise at exactly 0 Hz.
            // this._mag has length size/2 - 1.
            const half = this._size / 2;
            for (let k = 1; k < half; k++) {
                this._mag[k - 1] = Math.sqrt(this._re[k] * this._re[k] + this._im[k] * this._im[k]);
            }
            // Capture frame; only emit the LAST one if multiple complete
            // in one tick (rare except at very high sample rates).
            frameOut = {
                samples: new Float32Array(this._mag),
                firstT: inp.firstT + (i + 1 - this._size) * dt,
                dt: dt,
                frame: true,
            };
            this._inPos = 0;
        }
    }
    return frameOut ? { spectrum: frameOut } : {};
};

FftRuntime.prototype.dispose = function () {
    this._inBuf = this._mag = this._re = this._im = this._window = null;
};

// In-place iterative Cooley-Tukey on length-N arrays (N power of 2).
function fft(re, im, N) {
    for (let i = 1, j = 0; i < N; i++) {
        let bit = N >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            const tr = re[i]; re[i] = re[j]; re[j] = tr;
            const ti = im[i]; im[i] = im[j]; im[j] = ti;
        }
    }
    for (let size = 2; size <= N; size *= 2) {
        const half = size / 2;
        const step = -2 * Math.PI / size;
        for (let off = 0; off < N; off += size) {
            for (let kk = 0; kk < half; kk++) {
                const angle = step * kk;
                const wr = Math.cos(angle);
                const wi = Math.sin(angle);
                const tr = wr * re[off + kk + half] - wi * im[off + kk + half];
                const ti = wr * im[off + kk + half] + wi * re[off + kk + half];
                re[off + kk + half] = re[off + kk] - tr;
                im[off + kk + half] = im[off + kk] - ti;
                re[off + kk] += tr;
                im[off + kk] += ti;
            }
        }
    }
}

// ---- Registry ---------------------------------------------------------
// Keys are op ids; values are constructor functions. The runner does
// `new OP_RUNTIMES[node.op]()` to get an instance per node.
export const OP_RUNTIMES = {
    "spk.MotorDC":           MotorDcRuntime,
    "spk.MisalignmentFault": MisalignmentFaultRuntime,
    "spk.Sum":               SumRuntime,
    "spk.Sensor":            SensorRuntime,
    "spk.FFT":               FftRuntime,
};

export function hasRuntime(opId) {
    return Object.prototype.hasOwnProperty.call(OP_RUNTIMES, opId);
}
