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
    this._cfg   = null;
    this._t     = 0;
    this._meta  = null;   // built once from first tick's dt
}
MotorDcRuntime.prototype.init = function (cfg) {
    // The Sensors source accepts every motor field we expose (and a few
    // gravity ones we omit; passing them through is harmless).
    this._cfg   = cfg;
    this._motor = new Sensors.MotorCurrentSource(cfg);
    this._t = 0;
};
MotorDcRuntime.prototype.process = function (inputs, n, dt) {
    // Optional live duty-cycle control: first sample from the "dutyCycle"
    // input overrides cfg.pwmDutyCycle for this tick. Clamped to [0, 1].
    const dcIn = inputs.get("dutyCycle");
    if (dcIn && dcIn.samples && dcIn.samples.length > 0) {
        const d = dcIn.samples[0];
        if (isFinite(d)) {
            this._motor.cfg.pwmDutyCycle = Math.max(0, Math.min(1, d));
        }
    }
    // Optional live PWM frequency control: first sample from "pwmFrequency"
    // overrides cfg.pwmFrequencyHz. A spk.PWM node feeds both ports together.
    const freqIn = inputs.get("pwmFrequency");
    if (freqIn && freqIn.samples && freqIn.samples.length > 0) {
        const f = freqIn.samples[0];
        if (isFinite(f) && f > 0) {
            this._motor.cfg.pwmFrequencyHz = f;
        }
    }
    const current = new Float32Array(n);
    const theta   = new Float32Array(n);
    const omega   = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        const t = this._t + i * dt;
        // motor.signal(t) advances the source's internal state and returns
        // the armature current at t. Reading theta/omega afterwards gives
        // the kinematic state that produced this sample.
        current[i] = this._motor.signal(t);
        omega[i]   = this._motor.omega;
        theta[i]   = this._motor.theta(t);
    }
    const firstT = this._t;
    this._t += n * dt;
    const bars  = this._cfg.commutatorBars || 12;
    const fComm = omega[n - 1] / TWO_PI * bars;
    const speed = new Float32Array(n);
    for (let i = 0; i < n; i++) speed[i] = omega[i] / TWO_PI;
    // Build signal meta once (sampleRate known from dt).
    if (!this._meta && dt > 0) {
        const sr = Math.round(1 / dt);
        this._meta = {
            current: { kind: "signal", label: "current",  unit: "A",   sampleRate: sr },
            speed:   { kind: "signal", label: "speed",    unit: "rps", sampleRate: sr },
        };
    }
    return {
        current:    { samples: current, firstT: firstT, dt: dt },
        kinematics: { theta: theta, omega: omega, fComm: fComm, firstT: firstT, dt: dt },
        speed:      { samples: speed,   firstT: firstT, dt: dt },
    };
};
// Meta describes each output port's physical meaning. Built on first tick
// so sampleRate is known from dt. Exposed via getOutputMeta(portName).
MotorDcRuntime.prototype.getOutputMeta = function (port) {
    return (this._meta && this._meta[port]) || null;
};
MotorDcRuntime.prototype.dispose = function () { this._motor = null; this._cfg = null; this._meta = null; };

// ---- MotorPMSM --------------------------------------------------------
// Wraps the full PmsmSimulation host (machine + FOC + SVPWM + inverter +
// housing + gravity context + env nodes + faults) and emits 12 output
// streams. Built via Sensors.buildPmsmSource so the orchestration order
// (env.preStep -> faults.preStep -> FOC -> modulator -> inverter ->
// machine -> faults.postStep -> env.postStep -> housing) is the exact
// same path the unit / integration tests exercise.
function MotorPmsmRuntime() {
    this._source = null;
    this._host   = null;
    this._t      = 0;
    this._meta   = null;
    this._cfg    = null;
}
MotorPmsmRuntime.prototype.init = function (cfg) {
    this._cfg = cfg;
    this._t   = 0;

    const transform = cfg.orientation === "verticalUp"   ? Sensors.MotorTransform.verticalUp()
                    : cfg.orientation === "verticalDown" ? Sensors.MotorTransform.verticalDown()
                    :                                       Sensors.MotorTransform.horizontal();
    const field = cfg.gravityField === "microgravity" ? Sensors.GravityField.microgravity()
                                                      : Sensors.GravityField.earth();
    // Hold mutable refs so wired gravity/bodyTransform inputs can update them each tick.
    this._gravityField   = field;
    this._motorTransform = transform;

    const envDefaults = Sensors.MAXON_ECX_PRIME_ENV_DEFAULTS;

    // Fault nodes are injected via setFaultNodes() after all graph nodes are
    // initialized. The executor calls it in Phase C once it can look up which
    // fault_* input slots are connected. Until then the motor runs fault-free.
    this._pendingFaultConfigs = [];
    const faultsBuilder = () => this._buildFaults();

    const envBuilder = function (_sim, gv) {
        const env = [];
        if (cfg.enableRotorSag) {
            env.push(new Sensors.RotorSagModel({
                rotorMass:              envDefaults.rotorMass,
                bearingRadialStiffness: envDefaults.bearingRadialStiffness,
                airGap:                 envDefaults.airGap,
                umpRadialStiffness:     envDefaults.umpRadialStiffness,
            }, gv));
        }
        if (cfg.enableBearingPreload) {
            env.push(new Sensors.BearingPreloadModel({
                rotorMass:            envDefaults.rotorMass,
                nominalAxialPreload:  envDefaults.nominalAxialPreload,
                nominalRadialPreload: envDefaults.nominalRadialPreload,
            }, gv));
        }
        if (cfg.enableMountingCompliance) {
            env.push(new Sensors.MountingComplianceModel({
                motorMass: envDefaults.motorMass,
            }, gv));
        }
        return env;
    };

    this._source = Sensors.buildPmsmSource({
        label:           "node",
        motorTransform:  transform,
        gravityField:    field,
        speedTargetRps:  cfg.speedTargetRps,
        loadTorque:      cfg.loadTorque,
        inverter:        { vBus: cfg.vBus },
        svpwm:           { pwmFrequencyHz: cfg.pwmFrequencyHz },
        envBuilder:      envBuilder,
        faultsBuilder:   faultsBuilder,
    });
    this._host = this._source.host;
};
// Called by the executor (Phase C) after all fault_* inputs are resolved.
// faultNodes: [{ op: string, config: object, enabled: boolean }, ...]
MotorPmsmRuntime.prototype.setFaultNodes = function (faultNodes) {
    this._pendingFaultConfigs = faultNodes || [];
};
MotorPmsmRuntime.prototype._buildFaults = function () {
    const faults = [];
    for (const fn of this._pendingFaultConfigs) {
        if (!fn.enabled) continue;
        const cfg = fn.config;
        switch (fn.op) {
            case "spk.FaultPmsm.Imbalance":
                if (Sensors.ImbalanceFault)
                    faults.push(new Sensors.ImbalanceFault({ severity: cfg.severity }));
                break;
            case "spk.FaultPmsm.Eccentricity":
                if (Sensors.EccentricityFault)
                    faults.push(new Sensors.EccentricityFault({ severity: cfg.severity }));
                break;
            case "spk.FaultPmsm.WindingShort":
                if (Sensors.WindingShortFault)
                    faults.push(new Sensors.WindingShortFault({ severity: cfg.severity, phase: cfg.phase || 0 }));
                break;
            case "spk.FaultPmsm.BearingWear":
                if (Sensors.BearingWearFault)
                    faults.push(new Sensors.BearingWearFault({ severity: cfg.severity }));
                break;
        }
    }
    return faults;
};
MotorPmsmRuntime.prototype.process = function (inputs, n, dt) {
    // Optional live overrides : speed target (rps) and load torque (N.m).
    const stIn = inputs.get("speedTarget");
    if (stIn && stIn.samples && stIn.samples.length > 0) {
        const v = stIn.samples[0];
        if (isFinite(v)) this._host.setSpeedTarget(2 * Math.PI * v);
    }
    const lIn = inputs.get("loadTorque");
    if (lIn && lIn.samples && lIn.samples.length > 0) {
        const v = lIn.samples[0];
        if (isFinite(v)) this._host.machine.setLoadTorque(v);
    }

    // Live gravity vector override (from WorldGravity node).
    // When the source is disabled (muted) the executor zeros its output, so
    // passing the zeroed vector through switches the motor to microgravity.
    const gravIn = inputs.get("gravity");
    if (gravIn && gravIn.x && gravIn.x.length > 0 && this._gravityField) {
        this._gravityField.setWorldGravity([gravIn.x[0], gravIn.y[0], gravIn.z[0]]);
    }

    // Live body transform override (from BodyTransform node, row-major 4x4).
    const btIn = inputs.get("bodyTransform");
    if (btIn && !btIn.muted && btIn.m && btIn.m.length === 16 && this._motorTransform) {
        const m = btIn.m;
        this._motorTransform.setRotationMatrix(
            [[m[0], m[1], m[2]], [m[4], m[5], m[6]], [m[8], m[9], m[10]]],
            "live",
        );
    }

    const ia = new Float32Array(n);
    const ib = new Float32Array(n);
    const ic = new Float32Array(n);
    const id = new Float32Array(n);
    const iq = new Float32Array(n);
    const om = new Float32Array(n);
    const th = new Float32Array(n);
    const tq = new Float32Array(n);
    const ax = new Float32Array(n);
    const ay = new Float32Array(n);
    const az = new Float32Array(n);
    const vb = new Float32Array(n);

    const firstT  = this._t;
    const machine = this._host.machine;
    const housing = this._host.housing;
    const inverter = this._host.inverter;

    for (let i = 0; i < n; i++) {
        const t = this._t + i * dt;
        this._host.advance(t);
        const iAbc = machine.iAbc();
        ia[i] = iAbc[0]; ib[i] = iAbc[1]; ic[i] = iAbc[2];
        id[i] = machine.iD; iq[i] = machine.iQ;
        om[i] = machine.omegaM; th[i] = machine.thetaM;
        tq[i] = machine.electromagneticTorque();
        ax[i] = housing.acceleration(0);
        ay[i] = housing.acceleration(1);
        az[i] = housing.acceleration(2);
        vb[i] = inverter.vBus;
    }
    this._t += n * dt;

    if (!this._meta && dt > 0) {
        const sr = Math.round(1 / dt);
        this._meta = {
            i_a:       { kind: "signal", label: "i_a",       unit: "A",     sampleRate: sr },
            i_b:       { kind: "signal", label: "i_b",       unit: "A",     sampleRate: sr },
            i_c:       { kind: "signal", label: "i_c",       unit: "A",     sampleRate: sr },
            i_d:       { kind: "signal", label: "i_d",       unit: "A",     sampleRate: sr },
            i_q:       { kind: "signal", label: "i_q",       unit: "A",     sampleRate: sr },
            omega:     { kind: "signal", label: "omega",     unit: "rad/s", sampleRate: sr },
            theta:     { kind: "signal", label: "theta",     unit: "rad",   sampleRate: sr },
            torque_em: { kind: "signal", label: "torque_em", unit: "N.m",   sampleRate: sr },
            accel_x:   { kind: "signal", label: "accel_x",   unit: "m/s2",  sampleRate: sr },
            accel_y:   { kind: "signal", label: "accel_y",   unit: "m/s2",  sampleRate: sr },
            accel_z:   { kind: "signal", label: "accel_z",   unit: "m/s2",  sampleRate: sr },
            v_bus:     { kind: "signal", label: "v_bus",     unit: "V",     sampleRate: sr },
        };
    }

    const wrap = function (samples) { return { samples: samples, firstT: firstT, dt: dt }; };
    return {
        i_a:       wrap(ia),
        i_b:       wrap(ib),
        i_c:       wrap(ic),
        i_d:       wrap(id),
        i_q:       wrap(iq),
        omega:     wrap(om),
        theta:     wrap(th),
        torque_em: wrap(tq),
        accel_x:   wrap(ax),
        accel_y:   wrap(ay),
        accel_z:   wrap(az),
        v_bus:     wrap(vb),
    };
};
MotorPmsmRuntime.prototype.getOutputMeta = function (port) {
    return (this._meta && this._meta[port]) || null;
};
MotorPmsmRuntime.prototype.dispose = function () {
    this._source         = null;
    this._host           = null;
    this._cfg            = null;
    this._gravityField   = null;
    this._motorTransform = null;
    this._meta   = null;
};

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
    this._cfg        = null;
    this._rng        = 0;
    this._sampleRate = 0;
}
SensorRuntime.prototype.init = function (cfg) {
    this._cfg        = cfg;
    this._rng        = (cfg.rngSeed | 0) || 1;
    this._sampleRate = cfg.sampleRateHz || 0;
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
    // Cache sampleRate from dt for getOutputMeta queries.
    if (dt > 0 && !this._sampleRate) this._sampleRate = Math.round(1 / dt);
    return { out: { samples: out, firstT: inp.firstT, dt: dt } };
};
// getOutputMeta: returns signal meta for the "out" port.
// The Sensor is a transparent ADC — it inherits label/unit from upstream.
// Callers that need those should traverse the graph to the source runtime.
SensorRuntime.prototype.getOutputMeta = function (port) {
    if (port !== "out") return null;
    return { kind: "signal", label: "signal", unit: "", sampleRate: this._sampleRate || 0 };
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
    this._size       = 0;
    this._hopSize    = 0;
    this._windowType = "hann";
    this._inBuf      = null;
    this._inPos      = 0;
    this._mag        = null;
    this._window     = null;
    this._t          = 0;
    this._re         = null;
    this._im         = null;
    this._meta       = null;   // built once on first complete frame (needs dt)
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

    // hopSize: how many new samples advance the window between frames.
    // Default = size (no overlap). Clamp to [1, size].
    let hop = cfg && cfg.hopSize ? cfg.hopSize | 0 : size;
    hop = Math.min(Math.max(1, hop), size);
    this._hopSize = hop;

    this._inBuf = new Float32Array(size);
    this._inPos = 0;
    // Magnitude output excludes the DC bin (bin 0). For a non-zero-mean
    // signal the DC term swamps everything in linear scale and the auto-
    // ranging Scope hides the rest of the spectrum at the noise floor.
    // Caller sees `size/2 - 1` bins starting at the lowest non-DC bin.
    this._mag = new Float32Array(size / 2 - 1);
    this._re = new Float32Array(size);
    this._im = new Float32Array(size);
    this._window = new Float32Array(size);
    const wt = (cfg && cfg.windowType) ? cfg.windowType : "hann";
    this._windowType = wt;
    for (let i = 0; i < size; i++) {
        const x = TWO_PI * i / (size - 1);
        switch (wt) {
            case "rect":
                this._window[i] = 1;
                break;
            case "hamming":
                // Higher peak sidelobe than Hann (-43 dB) but slightly better
                // frequency resolution. Good middle-ground for MCSA.
                this._window[i] = 0.54 - 0.46 * Math.cos(x);
                break;
            case "blackman":
                // Three-term Blackman: -58 dB sidelobes, wide main lobe.
                // Recommended for broken-bar detection: sidebands sit only
                // 1-4 Hz from the fundamental at typical slip values.
                this._window[i] = 0.42 - 0.5 * Math.cos(x) + 0.08 * Math.cos(2 * x);
                break;
            case "flattop":
                // Flat-top (ISO 18431-2 coefficients): nearly flat passband,
                // best amplitude accuracy. Use when estimating fault severity
                // from sideband magnitude rather than just detecting presence.
                this._window[i] =  1.0
                    - 1.93  * Math.cos(x)
                    + 1.29  * Math.cos(2 * x)
                    - 0.388 * Math.cos(3 * x)
                    + 0.032 * Math.cos(4 * x);
                break;
            default: // "hann"
                // Hann: -32 dB sidelobes, good all-round default.
                this._window[i] = 0.5 * (1 - Math.cos(x));
                break;
        }
    }
    // dcRemoval defaults to true: subtract the block mean before windowing so
    // the motor's DC offset does not swamp the harmonics via spectral leakage.
    this._dcRemoval = !cfg || cfg.dcRemoval !== false;
    this._meta = null;   // reset on reconfigure so meta gets rebuilt with new hopSize
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

            // firstT of this frame: the buffer currently holds exactly _size
            // samples. The most recent sample is at batch position i, so the
            // first sample of the window was (_size - 1) steps earlier.
            // This formula is correct for both overlapping and non-overlapping
            // modes because the buffer always holds exactly _size samples.
            const frameFirstT = inp.firstT + (i + 1 - this._size) * dt;

            // Build meta once per init: frequency axis + timing descriptors.
            // DC bin (k=0) is skipped, so mag[k] corresponds to FFT bin k+1:
            //   f(k) = (k+1) * sampleRate / fftSize
            if (!this._meta && dt > 0) {
                const sr   = Math.round(1 / dt);
                const bins = this._size / 2 - 1;
                const fa   = new Array(bins);
                for (let b = 0; b < bins; b++) {
                    fa[b] = parseFloat(((b + 1) * sr / this._size).toFixed(2));
                }
                this._meta = {
                    kind:          "spectrum",
                    label:         "FFT",
                    unit:          "magnitude",
                    bins:          bins,
                    sampleRate:    sr,
                    fftSize:       this._size,
                    hopSize:       this._hopSize,
                    windowType:    this._windowType,
                    resolution:    parseFloat((sr / this._size).toFixed(2)),
                    nyquist:       parseFloat((sr / 2).toFixed(2)),
                    frequencyAxis: fa,
                };
            }

            frameOut = {
                samples: new Float32Array(this._mag),
                firstT:  frameFirstT,
                dt:      dt,
                frame:   true,
            };

            // Sliding window: keep the last (size - hopSize) samples so the
            // next frame overlaps the current one by that amount.
            // When hopSize === size (default) this reduces to a full clear.
            const keep = this._size - this._hopSize;
            if (keep > 0) {
                // Shift the tail of the buffer to position 0.
                this._inBuf.copyWithin(0, this._hopSize, this._size);
            }
            this._inPos = keep;
        }
    }
    return frameOut ? { spectrum: frameOut } : {};
};

// getOutputMeta: called by DatasetWidget after at least one frame has been
// processed (so this._meta is populated). Returns null before first frame.
FftRuntime.prototype.getOutputMeta = function (port) {
    if (port !== "spectrum") return null;
    return this._meta || null;
};
FftRuntime.prototype.dispose = function () {
    this._inBuf = this._mag = this._re = this._im = this._window = this._meta = null;
    this._windowType = "hann";
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

// ---- Constant (fixed float signal) ------------------------------------
function ConstantRuntime() { this._cfg = null; }
ConstantRuntime.prototype.init = function (cfg) { this._cfg = cfg; };
ConstantRuntime.prototype.process = function (_inputs, n, dt) {
    const val = (this._cfg && this._cfg.value != null) ? this._cfg.value : 0;
    const out = new Float32Array(n).fill(val);
    return { out: { samples: out, firstT: 0, dt: dt } };
};
ConstantRuntime.prototype.dispose = function () {};

// ---- Ramp (linear sweep) -----------------------------------------------
// Sweeps from `start` to `end` over `durationS` seconds, then clamps or
// loops back. Time is tracked internally from the first process() call.
function RampRuntime() {
    this._cfg = null;
    this._t = 0;
}
RampRuntime.prototype.init = function (cfg) {
    this._cfg = cfg;
    this._t = 0;
};
RampRuntime.prototype.process = function (_inputs, n, dt) {
    const cfg   = this._cfg;
    const start = cfg.start     != null ? cfg.start     : 0;
    const end   = cfg.end       != null ? cfg.end       : 1;
    const dur   = cfg.durationS != null ? cfg.durationS : 5;
    const loop  = !!cfg.loop;
    const out   = new Float32Array(n);
    const done  = new Float32Array(n);
    for (let i = 0; i < n; i++) {
        let t = this._t + i * dt;
        if (loop && dur > 0) t = t % dur;
        const alpha = dur > 0 ? Math.min(1, t / dur) : 1;
        out[i]  = start + (end - start) * alpha;
        // ended = 1.0 once the ramp has fully completed (non-looping only).
        done[i] = (!loop && dur > 0 && (this._t + i * dt) >= dur) ? 1.0 : 0.0;
    }
    const firstT = this._t;
    this._t += n * dt;
    return {
        out:   { samples: out,  firstT: firstT, dt: dt },
        ended: { samples: done, firstT: firstT, dt: dt },
    };
};
RampRuntime.prototype.dispose = function () {};

// ---- PWM driver -------------------------------------------------------
// Emits frequencyHz and dutyCycle as constant float streams from config.
// Both outputs are simply the configured scalar repeated n times — no
// actual square wave is generated; the motor physics model uses them as
// parameters. Re-read from cfg each tick so property-panel edits take
// effect immediately (same live-edit pattern as ConstantRuntime).
function PwmRuntime() { this._cfg = null; }
PwmRuntime.prototype.init = function (cfg) { this._cfg = cfg; };
PwmRuntime.prototype.process = function (_inputs, n, dt) {
    const cfg  = this._cfg;
    const freq = (cfg && cfg.frequencyHz != null) ? cfg.frequencyHz : 10000;
    const duty = (cfg && cfg.dutyCycle   != null) ? cfg.dutyCycle   : 1.0;
    return {
        frequencyHz: { samples: new Float32Array(n).fill(freq), firstT: 0, dt: dt },
        dutyCycle:   { samples: new Float32Array(n).fill(duty), firstT: 0, dt: dt },
    };
};
// Live update from a widget: overwrite one config key and it will be
// reflected in the very next process() call (re-reads cfg each tick).
PwmRuntime.prototype.setConfig = function (key, value) {
    if (this._cfg) this._cfg[key] = value;
};
PwmRuntime.prototype.dispose = function () {};

// ---- Switch (binary mux) ----------------------------------------------
// Per-sample: if select[i] < threshold → out[i] = a[i], else out[i] = b[i].
// Missing inputs fall back to 0 so a partially-wired node is safe.
function SwitchRuntime() { this._cfg = null; }
SwitchRuntime.prototype.init = function (cfg) { this._cfg = cfg; };
SwitchRuntime.prototype.process = function (inputs, n, dt) {
    const aIn  = inputs.get("a");
    const bIn  = inputs.get("b");
    const selIn = inputs.get("select");
    const thresh = (this._cfg && this._cfg.threshold != null) ? this._cfg.threshold : 0.5;
    const out  = new Float32Array(n);
    const firstT = (aIn || bIn || selIn || {}).firstT || 0;
    for (let i = 0; i < n; i++) {
        const a   = (aIn   && aIn.samples)   ? (aIn.samples[i]   || 0) : 0;
        const b   = (bIn   && bIn.samples)   ? (bIn.samples[i]   || 0) : 0;
        const sel = (selIn && selIn.samples)  ? (selIn.samples[i] || 0) : 0;
        out[i] = sel < thresh ? a : b;
    }
    return { out: { samples: out, firstT: firstT, dt: dt } };
};
SwitchRuntime.prototype.dispose = function () {};

// ---- BearingFault -----------------------------------------------------
// BPFO / BPFI harmonics in the theta domain (correct under variable speed).
// bpfoFactor and bpfiFactor default to 4.5 / 5.5 (6-ball bearing geometry).
function BearingFaultRuntime() { this._cfg = null; }
BearingFaultRuntime.prototype.init = function (cfg) { this._cfg = cfg; };
BearingFaultRuntime.prototype.process = function (inputs, n, dt) {
    const kin = inputs.get("kinematics");
    const out = new Float32Array(n);
    if (!kin || !kin.theta) {
        return { current: { samples: out, firstT: 0, dt: dt } };
    }
    if (kin.muted) {
        return { current: { samples: out, firstT: kin.firstT, dt: dt, muted: true } };
    }
    const s    = this._cfg.severity   || 0;
    const bpfo = this._cfg.bpfoFactor || 4.5;
    const bpfi = this._cfg.bpfiFactor || 5.5;
    for (let i = 0; i < n; i++) {
        const th = kin.theta[i];
        out[i] = s * 0.20 * (Math.sin(bpfo * th) + Math.sin(bpfi * th));
    }
    return { current: { samples: out, firstT: kin.firstT, dt: dt } };
};
BearingFaultRuntime.prototype.dispose = function () {};

// ---- BrokenBarFault ---------------------------------------------------
// Rotor asymmetry sidebands at fElec * (1 ± 2k*slip) for k = 1..N_broken.
// Uses absolute time (kin.firstT + i*dt) because the sideband frequencies
// are electrical, not mechanical. fElec (Hz) and slip must be in the config.
function BrokenBarFaultRuntime() {
    this._cfg = null;
    this._brokenCount = 0;
}
BrokenBarFaultRuntime.prototype.init = function (cfg) {
    this._cfg = cfg;
    // brokenIndices is a comma-separated string ("0" = 1 bar, "0,3" = 2 bars).
    const raw = String(cfg.brokenIndices || "0");
    this._brokenCount = raw.split(",").filter(function (s) {
        return s.trim() !== "";
    }).length;
};
BrokenBarFaultRuntime.prototype.process = function (inputs, n, dt) {
    const kin = inputs.get("kinematics");
    const out = new Float32Array(n);
    if (!kin || !kin.theta) {
        return { current: { samples: out, firstT: 0, dt: dt } };
    }
    if (kin.muted) {
        return { current: { samples: out, firstT: kin.firstT, dt: dt, muted: true } };
    }
    const s    = this._cfg.severity || 0;
    const N    = this._brokenCount  || 1;
    // fComm comes from the motor kinematics (commutator bars × omega).
    // slip is the only fault-specific electrical parameter: how far the
    // sidebands are offset from the fundamental commutation frequency.
    const fComm = kin.fComm || 600;   // Hz; fallback if motor not connected
    const slip  = this._cfg.slip || 0.02;
    const wComm = TWO_PI * fComm;
    for (let i = 0; i < n; i++) {
        const t = kin.firstT + i * dt;
        let v = 0;
        for (let k = 1; k <= N; k++) {
            const amp = s * (0.20 + 0.15 * N) / k;
            v += amp * (Math.sin(wComm * (1 - 2 * k * slip) * t)
                      + Math.sin(wComm * (1 + 2 * k * slip) * t));
        }
        out[i] = v;
    }
    return { current: { samples: out, firstT: kin.firstT, dt: dt } };
};
BrokenBarFaultRuntime.prototype.dispose = function () {};

// ---- EccentricityFault ------------------------------------------------
// Static / dynamic eccentricity: air-gap modulation at fMech creates
// sidebands around fElec. Modeled as sin(theta) * sin(2pi*fElec*t) so
// the mechanical envelope tracks actual rotor position.
function EccentricityFaultRuntime() { this._cfg = null; }
EccentricityFaultRuntime.prototype.init = function (cfg) { this._cfg = cfg; };
EccentricityFaultRuntime.prototype.process = function (inputs, n, dt) {
    const kin = inputs.get("kinematics");
    const out = new Float32Array(n);
    if (!kin || !kin.theta) {
        return { current: { samples: out, firstT: 0, dt: dt } };
    }
    if (kin.muted) {
        return { current: { samples: out, firstT: kin.firstT, dt: dt, muted: true } };
    }
    const s     = this._cfg.severity || 0;
    // Air-gap modulation: mechanical envelope (sin theta) × commutation
    // carrier (sin fComm*t). fComm from kinematics, owned by the motor.
    const fComm = kin.fComm || 600;
    const wComm = TWO_PI * fComm;
    for (let i = 0; i < n; i++) {
        const t = kin.firstT + i * dt;
        out[i] = s * Math.sin(kin.theta[i]) * Math.sin(wComm * t);
    }
    return { current: { samples: out, firstT: kin.firstT, dt: dt } };
};
EccentricityFaultRuntime.prototype.dispose = function () {};

// ---- BrushFault -------------------------------------------------------
// Commutation ripple at 10x and 30x mechanical frequency (theta domain).
// faultyBrushIndex is metadata only in this model; it does not alter the
// formula (a real model would add a per-bar phase offset).
function BrushFaultRuntime() { this._cfg = null; }
BrushFaultRuntime.prototype.init = function (cfg) { this._cfg = cfg; };
BrushFaultRuntime.prototype.process = function (inputs, n, dt) {
    const kin = inputs.get("kinematics");
    const out = new Float32Array(n);
    if (!kin || !kin.theta) {
        return { current: { samples: out, firstT: 0, dt: dt } };
    }
    if (kin.muted) {
        return { current: { samples: out, firstT: kin.firstT, dt: dt, muted: true } };
    }
    const s = this._cfg.severity || 0;
    for (let i = 0; i < n; i++) {
        const th = kin.theta[i];
        out[i] = s * (0.40 * Math.sin(10 * th) + 0.10 * Math.sin(30 * th));
    }
    return { current: { samples: out, firstT: kin.firstT, dt: dt } };
};
BrushFaultRuntime.prototype.dispose = function () {};

// ---- GravityModulation ------------------------------------------------
// Gravity sag modulates the air gap at 1x mechanical frequency. Amplitude
// derives from shaft mass, air gap, and bearing radial stiffness. The
// result scales with equivalentCurrent so it stays in ampere units.
function GravityModulationRuntime() {
    this._cfg = null;
    this._amp = 0;
}
GravityModulationRuntime.prototype.init = function (cfg) {
    this._cfg = cfg;
    const m  = cfg.rotorMass              || 0.15;
    const g0 = cfg.airGap                 || 0.0005;
    const k  = cfg.bearingRadialStiffness || 300000;
    const I  = cfg.equivalentCurrent      || 5.0;
    this._amp = I * (m * 9.81) / (k * g0);
};
GravityModulationRuntime.prototype.process = function (inputs, n, dt) {
    const kin = inputs.get("kinematics");
    const out = new Float32Array(n);
    if (!kin || !kin.theta) {
        return { current: { samples: out, firstT: 0, dt: dt } };
    }
    if (kin.muted) {
        return { current: { samples: out, firstT: kin.firstT, dt: dt, muted: true } };
    }
    const amp = this._amp;
    for (let i = 0; i < n; i++) {
        out[i] = amp * Math.sin(kin.theta[i]);
    }
    return { current: { samples: out, firstT: kin.firstT, dt: dt } };
};
GravityModulationRuntime.prototype.dispose = function () {};

// ---- DatasetCapture ---------------------------------------------------
// Multi-channel labeled window recorder. `in_0` drives capture cadence:
//   - frame payload (FFT):   one record per frame, channels saved as arrays.
//   - time-domain stream:    accumulate until windowS seconds, then save.
// Other ports (`in_1`, `in_2`, …) are sampled at the same moment.
// Captured windows live in this._windows; the play-panel widget reads them
// via getWindows() and exports JSON/CSV on demand.
function DatasetCaptureRuntime() {
    this._cfg               = null;
    this._label             = "healthy";
    this._capturing         = false;
    this._windows           = [];
    this._timeBufs          = new Map();
    this._lastFrames        = new Map();
    this._sampleRate        = 5000;
    this._classNames        = ["healthy"];
    // Wall-clock anchoring: set when startCapture() is called.
    // _captureStartEpochUs : Unix epoch at capture start in integer microseconds.
    //   Integer µs avoids float64 precision loss at 10^15 scale. At 5 kHz
    //   one sample = 200 µs, which is exactly representable.
    // _captureStartEpochS  : same value in seconds (kept for JSON/CSV headers).
    // _captureFirstPhysT   : firstT of the very first captured frame/sample,
    //   used to convert physical simulation time → offset from session start.
    this._captureStartEpochUs = 0;
    this._captureStartEpochS  = 0;
    this._captureFirstPhysT   = null;
}
DatasetCaptureRuntime.prototype.init = function (cfg) {
    this._cfg                = cfg;
    this._label              = (cfg && cfg.label) || "healthy";
    this._capturing          = false;
    this._windows            = [];
    this._timeBufs.clear();
    this._lastFrames.clear();
    this._classNames          = this._parseClassNames(cfg);
    this._captureStartEpochUs = 0;
    this._captureStartEpochS  = 0;
    this._captureFirstPhysT   = null;
};
DatasetCaptureRuntime.prototype._parseClassNames = function (cfg) {
    const raw = (cfg && cfg.classNames) ? String(cfg.classNames) : "";
    const names = raw.split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    return names.length ? names : [(cfg && cfg.label) || "healthy"];
};
DatasetCaptureRuntime.prototype.process = function (inputs, n, dt) {
    // Refresh classNames in case the property panel updated cfg live.
    this._classNames = this._parseClassNames(this._cfg);

    // --- Resolve active label for this tick --------------------------------
    // labelIndex input (float): floor → index into classNames.
    // When unwired or out of range, fall back to static cfg.label.
    const labelIn = inputs.get("labelIndex");
    if (labelIn && labelIn.samples && labelIn.samples.length > 0) {
        const idx = Math.round(labelIn.samples[labelIn.samples.length - 1]);
        const resolved = this._classNames[Math.max(0, idx)];
        this._label = resolved || this._label;
    }

    if (!this._capturing) return {};

    const maxW = (this._cfg && this._cfg.maxWindows) || 500;
    if (this._windows.length >= maxW) return {};

    if (dt > 0) this._sampleRate = Math.round(1 / dt);

    const primary = inputs.get("in_0");
    if (!primary || !primary.samples) return {};

    // Collect variadic sidecar channels (in_1, in_2, …)
    const sideKeys = [];
    let i = 1;
    while (inputs.has("in_" + i)) { sideKeys.push("in_" + i); i++; }

    sideKeys.forEach(function (key) {
        const ch = inputs.get(key);
        if (!ch || !ch.samples) return;
        if (ch.frame) {
            this._lastFrames.set(key, Array.from(ch.samples));
        } else {
            this._lastFrames.set(key, [ch.samples[ch.samples.length - 1]]);
        }
    }, this);

    // Frame-driven path (FFT or any frame-flagged payload)
    if (primary.frame) {
        // Anchor the first frame's physT so we can convert simulation time
        // to absolute wall-clock time for all subsequent frames.
        const physT = primary.firstT || 0;
        if (this._captureFirstPhysT === null) this._captureFirstPhysT = physT;
        const offsetS  = physT - this._captureFirstPhysT;
        // tUs: integer Unix microseconds — exact at any sample rate up to MHz.
        // t:   float seconds — kept for human readability in JSON/CSV headers.
        const tUs  = this._captureStartEpochUs + Math.round(offsetS * 1e6);
        const tS   = this._captureStartEpochS  + offsetS;
        const channels = [Array.from(primary.samples)];
        sideKeys.forEach(function (key) {
            channels.push(this._lastFrames.get(key) || []);
        }, this);
        this._windows.push({ label: this._label, t: tS, tUs: tUs, channels: channels });
        return {};
    }

    // Time-domain accumulation path
    if (!this._timeBufs.has("in_0")) this._timeBufs.set("in_0", []);
    const buf0 = this._timeBufs.get("in_0");
    for (let j = 0; j < primary.samples.length; j++) buf0.push(primary.samples[j]);

    sideKeys.forEach(function (key) {
        if (!this._timeBufs.has(key)) this._timeBufs.set(key, []);
        const ch = inputs.get(key);
        if (!ch || !ch.samples) return;
        const buf = this._timeBufs.get(key);
        for (let j = 0; j < ch.samples.length; j++) buf.push(ch.samples[j]);
    }, this);

    // Anchor first-physT for time-domain path using the batch's firstT.
    const batchPhysT = primary.firstT || 0;
    if (this._captureFirstPhysT === null) this._captureFirstPhysT = batchPhysT;

    const winSamples = Math.max(1, Math.round(((this._cfg && this._cfg.windowS) || 1.0) * this._sampleRate));
    while (buf0.length >= winSamples && this._windows.length < maxW) {
        const physOffsetS  = this._windows.length * winSamples / this._sampleRate;
        const tUs          = this._captureStartEpochUs + Math.round(physOffsetS * 1e6);
        const tS           = this._captureStartEpochS  + physOffsetS;
        const channels = [buf0.splice(0, winSamples)];
        sideKeys.forEach(function (key) {
            const buf = this._timeBufs.get(key) || [];
            channels.push(buf.splice(0, Math.min(winSamples, buf.length)));
        }, this);
        this._windows.push({ label: this._label, t: tS, tUs: tUs, channels: channels });
    }
    return {};
};

// ---- Public API (called by DatasetWidget) ----------------------------
DatasetCaptureRuntime.prototype.startCapture  = function () {
    // Wall-clock anchor at µs resolution.
    // performance.timeOrigin + performance.now() gives absolute time in
    // fractional ms (sub-ms precision, browser-clamped to ~100 µs for
    // security). At 100 kHz one sample = 10 µs; this gives ±~1 sample
    // alignment accuracy between independently started files.
    // Date.now() alone would only give ±100 samples at 100 kHz.
    const nowMs = (typeof performance !== "undefined")
        ? performance.timeOrigin + performance.now()
        : Date.now();
    this._captureStartEpochUs = Math.round(nowMs * 1000);  // µs, integer
    this._captureStartEpochS  = nowMs / 1000;
    this._captureFirstPhysT   = null;
    this._capturing           = true;
};
DatasetCaptureRuntime.prototype.stopCapture   = function () {
    this._capturing = false;
    this._timeBufs.clear();   // discard partial window on stop
};
DatasetCaptureRuntime.prototype.getCaptureStartEpochS  = function () {
    return this._captureStartEpochS;
};
DatasetCaptureRuntime.prototype.getCaptureStartEpochUs = function () {
    return this._captureStartEpochUs;
};
DatasetCaptureRuntime.prototype.isCapturing   = function () { return this._capturing; };
DatasetCaptureRuntime.prototype.currentLabel  = function () { return this._label; };
DatasetCaptureRuntime.prototype.classNames    = function () { return this._classNames.slice(); };
DatasetCaptureRuntime.prototype.setLabel      = function (label) {
    this._label = label;
    if (this._cfg) this._cfg.label = label;
};
DatasetCaptureRuntime.prototype.getWindows    = function () { return this._windows; };
DatasetCaptureRuntime.prototype.getClasses    = function () {
    const seen = new Set();
    this._windows.forEach(function (w) { seen.add(w.label); });
    return Array.from(seen);
};
DatasetCaptureRuntime.prototype.clearWindows  = function () {
    this._windows = [];
    this._timeBufs.clear();
};
DatasetCaptureRuntime.prototype.dispose       = function () {
    this._windows = [];
    this._timeBufs.clear();
    this._lastFrames.clear();
};

// ---- WorldGravity runtime ---------------------------------------------
// Emits a constant gravity vec3 each tick. Direction is normalised at
// init time; magnitude scales the unit vector.
function WorldGravityRuntime() { this._x = 0; this._y = 0; this._z = -1; this._mag = 9.81; }
WorldGravityRuntime.prototype.init = function (cfg) {
    const dx = cfg.dx || 0, dy = cfg.dy || 0, dz = (cfg.dz !== undefined ? cfg.dz : -1);
    const len = Math.sqrt(dx*dx + dy*dy + dz*dz) || 1;
    this._mag = cfg.magnitude !== undefined ? cfg.magnitude : 9.81;
    this._x = dx / len * this._mag;
    this._y = dy / len * this._mag;
    this._z = dz / len * this._mag;
};
WorldGravityRuntime.prototype.process = function (_inputs, n, dt) {
    const x = new Float32Array(n).fill(this._x);
    const y = new Float32Array(n).fill(this._y);
    const z = new Float32Array(n).fill(this._z);
    return { gravity: { x, y, z, firstT: 0, dt, muted: false } };
};

// ---- BodyTransform runtime --------------------------------------------
// Converts ZYX Euler angles (roll, pitch, yaw in degrees, Unreal convention)
// to a row-major 4x4 rotation matrix. R = Rz(yaw) * Ry(pitch) * Rx(roll).
// Falls back to config defaults for any unwired input.
const DEG2RAD = Math.PI / 180;
function BodyTransformRuntime() { this._cfg = { roll: 0, pitch: 0, yaw: 0 }; }
BodyTransformRuntime.prototype.init = function (cfg) { this._cfg = cfg || { roll: 0, pitch: 0, yaw: 0 }; };
BodyTransformRuntime.prototype.process = function (inputs, _n, dt) {
    const scalar = function (port, def) {
        const sig = inputs && inputs[port];
        if (sig && sig.samples && sig.samples.length) return sig.samples[0];
        return def;
    };
    const roll  = scalar("roll",  this._cfg.roll  || 0) * DEG2RAD;
    const pitch = scalar("pitch", this._cfg.pitch || 0) * DEG2RAD;
    const yaw   = scalar("yaw",   this._cfg.yaw   || 0) * DEG2RAD;
    const cx = Math.cos(roll),  sx = Math.sin(roll);
    const cy = Math.cos(pitch), sy = Math.sin(pitch);
    const cz = Math.cos(yaw),   sz = Math.sin(yaw);
    // R = Rz * Ry * Rx (row-major 4x4, rotation only).
    const m = new Float32Array(16);
    m[0]  = cz * cy;
    m[1]  = cz * sy * sx - sz * cx;
    m[2]  = cz * sy * cx + sz * sx;
    m[4]  = sz * cy;
    m[5]  = sz * sy * sx + cz * cx;
    m[6]  = sz * sy * cx - cz * sx;
    m[8]  = -sy;
    m[9]  = cy * sx;
    m[10] = cy * cx;
    m[15] = 1;
    return { transform: { m, firstT: 0, dt, muted: false } };
};

// ---- SyncDetect (lock-in amplifier) -----------------------------------
// Extracts amplitude and phase at a tracked frequency using synchronous
// demodulation followed by a first-order IIR low-pass filter.
//
// When `omega` (rad/s) is wired: f = harmonic * omega / (2*pi).
// Otherwise uses the `freqHz` config value directly.
//
// Scaling: multiply by 2 to recover the true peak amplitude of a sinusoid,
// because IQ demodulation halves the amplitude (product-to-sum identity).
function SyncDetectRuntime() {
    this._phi        = 0;
    this._I          = 0;
    this._Q          = 0;
    this._freqHz     = 50;
    this._harmonic   = 1;
    this._lpfCutoff  = 5;
}
SyncDetectRuntime.prototype.init = function (cfg) {
    this._freqHz    = cfg.freqHz     !== undefined ? cfg.freqHz     : 50;
    this._harmonic  = cfg.harmonic   !== undefined ? cfg.harmonic   : 1;
    this._lpfCutoff = cfg.lpfCutoffHz !== undefined ? cfg.lpfCutoffHz : 5;
    this._phi = 0;
    this._I   = 0;
    this._Q   = 0;
};
SyncDetectRuntime.prototype.process = function (inputs, n, dt) {
    const sigIn   = inputs.get("signal");
    const omegaIn = inputs.get("omega");
    const mag = new Float32Array(n);
    const phs = new Float32Array(n);
    const TWO_PI = 2 * Math.PI;
    const tau   = 1.0 / (TWO_PI * this._lpfCutoff);
    const alpha = dt / (tau + dt);
    for (let i = 0; i < n; i++) {
        const x = (sigIn  && !sigIn.muted  && sigIn.samples)  ? sigIn.samples[i]  : 0;
        const w = (omegaIn && !omegaIn.muted && omegaIn.samples) ? omegaIn.samples[i] : this._freqHz * TWO_PI;
        const f = (w / TWO_PI) * this._harmonic;
        this._phi += TWO_PI * f * dt;
        if (this._phi >= TWO_PI) this._phi -= TWO_PI;
        // Demodulate: multiply by reference cosine and sine
        this._I = alpha * (x * Math.cos(this._phi)) + (1 - alpha) * this._I;
        this._Q = alpha * (x * Math.sin(this._phi)) + (1 - alpha) * this._Q;
        // *2 to recover true peak amplitude (product-to-sum halves it)
        mag[i] = 2 * Math.sqrt(this._I * this._I + this._Q * this._Q);
        phs[i] = Math.atan2(this._Q, this._I);
    }
    return {
        magnitude: { samples: mag, firstT: 0, dt, muted: false },
        phase:     { samples: phs, firstT: 0, dt, muted: false },
    };
};

// ---- Registry ---------------------------------------------------------
// Keys are op ids; values are constructor functions. The runner does
// `new OP_RUNTIMES[node.op]()` to get an instance per node.
export const OP_RUNTIMES = {
    "spk.Constant":             ConstantRuntime,
    "spk.Ramp":                 RampRuntime,
    "spk.PWM":                  PwmRuntime,
    "spk.MotorDC":              MotorDcRuntime,
    "spk.MotorPMSM":            MotorPmsmRuntime,
    "spk.MisalignmentFault":    MisalignmentFaultRuntime,
    "spk.BearingFault":         BearingFaultRuntime,
    "spk.BrokenBarFault":       BrokenBarFaultRuntime,
    "spk.EccentricityFault":    EccentricityFaultRuntime,
    "spk.BrushFault":           BrushFaultRuntime,
    "spk.GravityModulation":    GravityModulationRuntime,
    "spk.WorldGravity":         WorldGravityRuntime,
    "spk.BodyTransform":        BodyTransformRuntime,
    "spk.Switch":               SwitchRuntime,
    "spk.Sum":                  SumRuntime,
    "spk.DatasetCapture":       DatasetCaptureRuntime,
    "spk.Sensor":               SensorRuntime,
    "spk.FFT":                  FftRuntime,
    "spk.SyncDetect":           SyncDetectRuntime,
};

export function hasRuntime(opId) {
    return Object.prototype.hasOwnProperty.call(OP_RUNTIMES, opId);
}
