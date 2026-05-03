// SpikyPanda - Motor Current Source
//
// Live signal preview + spectrum (FFT) on the left, motor / sensor / fault
// edit form on the right (tabbed). The Stream panel below registers the
// signal as a labeled stream on the SharedWorker registry so other tabs
// (labeled-capture, live-test, ...) can subscribe to it. All the physics,
// fault signatures and noise come from the @spiky-panda/sensors browser
// bundle. The stream registry / fan-out lives at www/js/registry-worker.js
// and is reached through www/js/stream-bus.js. Relative paths so any dev
// server (LiveServer, http-server, ...) regardless of document root.
import { StreamBus } from "../../../../../js/stream-bus.js";

(function () {
    "use strict";

    var Sensors = window.SpikypandaSensors;
    // SharedWorker URL is resolved relative to the PAGE (not this script),
    // so we use the same path as the import. All pages must agree on the
    // resolved absolute URL for the SharedWorker to share state.
    var bus = new StreamBus({ workerUrl: "../../../../../js/registry-worker.js" });

    // Single ring buffer drives both the time view (last TIME_VIEW_LEN samples
    // for a snappy, dense plot) and the FFT (full DISPLAY_LEN samples for
    // resolution). DISPLAY_LEN = 8192 gives bin width fs/8192 = 0.61 Hz at
    // fs = 5 kHz, which is fine enough to resolve broken-bar sidebands at
    // slip = 0.02 (sideband spacing 2 Hz). FFT_SIZE must be a power of 2.
    var DISPLAY_LEN = 8192;
    var FFT_SIZE = 8192;
    var TIME_VIEW_LEN = 2048;        // hard upper bound; actual span set by state.timeSpanS

    // ---- Built-in motor presets ------------------------------------------
    // Generic DC brushed motors. Real-world Mabuchi-style specs come later;
    // these are reasonable starting points for pipeline validation.
    // Default PWM driver: transparent (duty = 1, no chopping). Setting the
    // duty below 1 turns on the chopper and adds a ripple at pwmFrequencyHz
    // in the current spectrum, plus drops the equilibrium speed.
    // ---- UI strings (single source of truth for i18n) --------------------
    // All user-visible text lives here. Dynamic segments use {0}, {1} ...
    // placeholders; call fmt(str, a, b, ...) to expand.
    var STRINGS = {
        motor: {
            help:             "Healthy DC motor parameters. Signal model: i(t) = (V - Ke·omega) / R · (1 - exp(-t·R/L)) plus commutation ripple and harmonics.",
            presetSave:       "Save",
            presetSaveTitle:  "Save the current motor as a custom preset",
            presetSavePrompt: "Preset name?",
            presetSavedLog:   "Saved custom preset: {0}",
            presetLoadedLog:  "Loaded preset: {0}",
            // Field labels
            supplyV:          "Supply V",
            resistance:       "Resistance R",
            inductance:       "Inductance L",
            backEmf:          "Back-EMF Ke",
            speed:            "Speed (nominal)",
            commBars:         "Commutator bars",
            brushCount:       "Brush count",
            nomCurrent:       "Nominal current",
            loadFactor:       "Load factor",
            rippleFactor:     "Ripple factor",
            // Environment / gravity
            gravSection:      "Environment (gravity) - Experimental",
            gravToggle:       "Horizontal axis (gravity enabled)",
            gravHelp:         "Rotor weight deflects the shaft by δ = m·g / k, modulating the air gap at 1x fₘₑℎ: A ≈ I_eq · δ / g₀. Disable for vertical shaft or microgravity.",
            gravAmplitude:    "→ Derived amplitude",
            rotorMass:        "Rotor mass",
            airGap:           "Air gap g₀",
            bearingStiffness: "Bearing stiffness",
            // PWM
            pwmSection:       "PWM driver",
            pwmHelp:          "Input chopper. 100% power = transparent (motor sees V_supply directly). Reducing power activates the chopper and lowers the average voltage; speed drops.",
            pwmFrequency:     "PWM frequency",
            motorPower:       "Motor power",
            stallThreshold:   "→ Stall threshold",
            predictedSpeed:   "→ Predicted speed",
            stalled:          "STALLED",
        },
        // Units (shared across tabs)
        units: {
            V:   "V",
            Ohm: "Ohm",
            H:   "H",
            Vrps:"V/rps",
            rps: "rps",
            A:   "A",
            kg:  "kg",
            m:   "m",
            Nm:  "N/m",
            Hz:  "Hz",
            pct: "%",
        },
        sensor: {
            help:       "Acquisition profile applied on top of the clean physics: gain, bias, additive Gaussian noise. Seed the RNG to reproduce noise traces exactly across runs.",
            sampleRate: "Sample rate",
            noiseStd:   "Noise std",
            gain:       "Gain",
            bias:       "Bias",
            rngSeed:    "RNG seed",
        },
        fault: {
            noSelection:   "No fault selected. Pick one from the list on the left or add a new one.",
            displayName:   "Display name",
            severity:      "Severity (0-1)",
            bpfoFactor:    "BPFO factor",
            bpfiFactor:    "BPFI factor",
            brushHelp:     "Which brush is defective (0 to {0}). {1} brushes spaced {2}° apart. Sideband frequencies stay the same; the phase encodes which brush.",
            brushBtn:      "Brush {0} ({1}°)",
            totalBars:     "Total bars",
            totalBarsNote: "{0} (from motor)",
            brokenBars:    "Broken bars",
            brokenHint:    "0,1,2",
            brokenHelp:    "0-based bar positions, comma-separated. Quick fills:",
            contig:        "Contig {0}",
            distrib:       "Distrib {0}",
        },
        faultsList: {
            empty:          "No faults. The signal is the healthy motor.",
            incompat:       "Not applicable on a brushless motor. Switch to brushed to activate.",
            incompatBadge:  "(brushless only)",
            detailSeverity: "severity",
            removeBtnTitle: "Remove",
            cannotAdd:      "Cannot add {0} to a brushless motor.",
            addedLog:       "Added fault: {0}",
        },
        fftChip: {
            removeTitle: "Remove this snapshot",
        },
        stats: {
            stalled: "STALLED",
            mean:    "Mean",
            min:     "Min",
            max:     "Max",
            std:     "Std",
            speed:   "Speed",
            fs:      "fs",
            faults:  "Faults",
        },
        fftScale: {
            db:       "dB",
            lin:      "Lin",
            toDb:     "Switch to logarithmic (dB) scale",
            toLin:    "Switch to linear scale",
        },
        stream: {
            validName:        "Please enter a stream name",
            statusStopped:    "Stopped",
            statusLive:       "Live ({0} subs)",
            statusPaused:     "Paused ({0} subs)",
            statsLine:        "Stream <strong>{0}</strong> · published <strong>{1}</strong> samples · subs <strong>{2}</strong>",
            logStarted:       "Stream started: id={0}, name='{1}'",
            logPaused:        "Stream paused (still registered).",
            logResumed:       "Stream resumed.",
            logStopped:       "Stream stopped (unregistered).",
            logConfigChanged: "Stream config changed; re-registering with updated meta.",
            logBusConnected:  "Connected to stream registry. {0} stream(s) currently live.",
        },
        init: {
            bundleError: "SpikypandaSensors bundle not loaded. Check that bundle/spikypanda-sensors.js is present in packages/host/www/bundle/.",
            ready:       "Ready. Pick a motor preset, optionally add faults, then publish a stream.",
        },
    };

    // Color palette for fixed FFT snapshots. Rotates when more snapshots
    // are added than there are colors. Chosen for visibility on dark canvas.
    var SPECTRUM_COLORS = ["#ff6b6b", "#4ecdc4", "#ffe66d", "#a8e6cf", "#ff8b94", "#c5a3ff", "#ffa07a", "#98d8c8"];
    var _spectraIdCounter = 0;

    // Fault types that require a brushed commutator to be physically meaningful.
    // brushCount === 0 means brushless: these faults are greyed out in the
    // picker and shown disabled in the list.
    var BRUSHED_ONLY_FAULTS = [
        Sensors.MotorFaultType.BRUSH_FAULT,
        Sensors.MotorFaultType.BROKEN_BAR,
    ];

    function isBrushedOnlyFault(type) {
        return BRUSHED_ONLY_FAULTS.indexOf(type) !== -1;
    }

    function isBrushless() {
        return (state.motor.brushCount || 0) === 0;
    }

    // Mirrors computeGravEcc() in MotorCurrentSource.ts. Kept in JS so the
    // UI can display the derived amplitude live without re-instantiating the
    // source on every keystroke.
    var GRAVITY_G = 9.81;
    var TWO_PI_JS = 2 * Math.PI;
    function computeGravEcc(m) {
        if (m.rotorMass > 0 && m.airGap > 0 && m.bearingRadialStiffness > 0) {
            var keRad = m.backEmfConstant / TWO_PI_JS;
            var omega = TWO_PI_JS * m.motorSpeedRps;
            var Ieq = Math.max(0, (m.supplyVoltage - keRad * omega) / m.resistance);
            var delta = (m.rotorMass * GRAVITY_G) / m.bearingRadialStiffness;
            return Ieq * delta / m.airGap;
        }
        return 0;
    }

    var BUILTIN_PRESETS = {
        // Ke is set so back-EMF = 75 % of V_supply at rated speed.
        // This gives D_min = 25 %: the motor is PWM-controllable over the
        // full 0.25 - 1.0 duty range. Formula: Ke = 0.75 * V / motorSpeedRps.
        //
        // A_grav = I_eq * delta / g0  where delta = m*g / k_bearing.
        // 24V: I_eq=5 A, delta=4.9 µm, g0=0.5 mm → A ≈ 0.049 A (≈ 1 % of nominal)
        "DC Brushed 24V": {
            supplyVoltage: 24, resistance: 1.2, inductance: 0.01, backEmfConstant: 0.36,
            motorSpeedRps: 50, commutatorBars: 12, brushCount: 2, nominalCurrent: 5,
            loadFactor: 1.0, rippleFactor: 0.05,
            pwmFrequencyHz: 10000, pwmDutyCycle: 1.0,
            rotorMass: 0.15, airGap: 0.0005, bearingRadialStiffness: 300000,
            gravityEnabled: true,
        },
        // 12V: I_eq=5 A, delta=3.9 µm, g0=0.4 mm → A ≈ 0.049 A (≈ 1 % of nominal)
        "DC Brushed 12V": {
            supplyVoltage: 12, resistance: 0.6, inductance: 0.005, backEmfConstant: 0.30,
            motorSpeedRps: 30, commutatorBars: 8, brushCount: 2, nominalCurrent: 5,
            loadFactor: 1.0, rippleFactor: 0.06,
            pwmFrequencyHz: 10000, pwmDutyCycle: 1.0,
            rotorMass: 0.08, airGap: 0.0004, bearingRadialStiffness: 200000,
            gravityEnabled: true,
        },
        // 6V hobby: I_eq=5 A, delta=2.0 µm, g0=0.25 mm → A ≈ 0.039 A (≈ 0.8 % of nominal)
        "Hobby DC 6V": {
            supplyVoltage: 6, resistance: 0.3, inductance: 0.001, backEmfConstant: 0.045,
            motorSpeedRps: 100, commutatorBars: 5, brushCount: 2, nominalCurrent: 5,
            loadFactor: 1.0, rippleFactor: 0.08,
            pwmFrequencyHz: 20000, pwmDutyCycle: 1.0,
            rotorMass: 0.02, airGap: 0.00025, bearingRadialStiffness: 100000,
            gravityEnabled: true,
        },
    };
    var DEFAULT_MOTOR_NAME = "DC Brushed 24V";

    var DEFAULT_SENSOR = {
        sampleRateHz: 5000,
        noiseStd: 0.01,
        bias: 0.0,
        gain: 1.0,
        rngSeed: 1,
    };

    // ---- Application state -----------------------------------------------
    var state = {
        motor: clone(BUILTIN_PRESETS[DEFAULT_MOTOR_NAME]),
        motorPresetName: DEFAULT_MOTOR_NAME,
        sensor: clone(DEFAULT_SENSOR),
        // Each entry: { enabled: boolean, cfg: MotorFaultConfig }
        faults: [],
        selectedTab: "motor",
        selectedFaultIdx: null,
        // Time-view window length in seconds. 40 ms shows ~24 commutation
        // cycles at fComm=600 Hz (12 bars, 50 rps), which renders as a clean
        // visible wave rather than noise. The dropdown lets the user zoom.
        timeSpanS: 0.04,
        // Fixed FFT snapshots for overlay comparison. Each entry:
        //   { id, color, label, mag: Float32Array, maxBin, binHz, fs }
        fixedSpectra: [],
        fftLogScale: false,           // true = dB scale, false = linear
        sensorInstance: null,
        // Stream publish state. `id` is generated once per tab; `phase` is
        // "stopped" | "live" | "paused". `samplesPublished` is a running
        // total since the last Start. `subscribers` is the latest count
        // reported by the registry.
        stream: {
            id: "motor.dc." + Math.random().toString(36).slice(2, 10),
            connected: false,
            phase: "stopped",
            samplesPublished: 0,
            subscribers: 0,
        },
        activeMotor: null,            // MotorCurrentSource instance, for live omega readout
        live: {
            running: false,
            simTime: 0,
            buffer: new Float32Array(DISPLAY_LEN),
            bufferPos: 0,
            bufferFilled: 0,
            lastFrame: 0,
            frameCount: 0,
        },
    };

    var els = {};

    // ---- Small helpers ---------------------------------------------------
    function $(id) { return document.getElementById(id); }
    function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
    // Expand {0}, {1} ... placeholders in a STRINGS template.
    function fmt(tpl) {
        var a = arguments;
        return tpl.replace(/\{(\d+)\}/g, function (_, i) { return a[+i + 1]; });
    }

    function log(msg) {
        var ts = new Date().toLocaleTimeString();
        els.log.textContent += "[" + ts + "] " + msg + "\n";
        els.log.scrollTop = els.log.scrollHeight;
    }

    // ---- Source / sensor (re)build ---------------------------------------
    // Whenever motor, faults or sensor config change, we rebuild the active
    // source and wrap it in a fresh Sensor. This also resets the sim clock
    // and the live buffer so the user sees the new signal cleanly.
    function buildActiveSource() {
        var motorCfg = Object.assign({}, state.motor);
        // When gravity is toggled off, zero out the physical params so the source
        // derives A_grav = 0 (vertical-axis motor or microgravity).
        if (motorCfg.gravityEnabled === false) {
            motorCfg.rotorMass = 0;
            motorCfg.airGap = 0;
            motorCfg.bearingRadialStiffness = 0;
        }
        var motor = new Sensors.MotorCurrentSource(motorCfg);
        state.activeMotor = motor;   // track for live omega readout in stats
        var enabled = state.faults
            .filter(function (f) {
                // Skip brushed-only faults when the motor is brushless: they
                // have no physical basis and would pollute the signal.
                if (isBrushless() && isBrushedOnlyFault(f.cfg.type)) return false;
                return f.enabled;
            })
            .map(function (f) { return new Sensors.MotorFaultSource(f.cfg, motor); });
        if (enabled.length === 0) return motor;
        return new Sensors.CompositeSource([motor].concat(enabled));
    }

    function rebuildSensor() {
        // Keep broken-bar faults in sync with the motor's commutatorBars.
        // totalBars is a motor property; the fault only owns the subset of
        // broken indices within that range.
        state.faults.forEach(function (f) {
            if (f.cfg.type === Sensors.MotorFaultType.BROKEN_BAR) {
                f.cfg.totalBars = state.motor.commutatorBars;
                // Drop any index that no longer exists after a bar-count change.
                f.cfg.brokenIndices = (f.cfg.brokenIndices || []).filter(function (i) {
                    return i < f.cfg.totalBars;
                });
            }
        });
        var src = buildActiveSource();
        state.sensorInstance = new Sensors.Sensor(src, state.sensor);
        state.live.simTime = 0;
        state.live.bufferFilled = 0;
        state.live.bufferPos = 0;
        // When the motor is stopped we fill the buffer synchronously so the
        // canvas updates immediately when the user tweaks a parameter, even
        // without restarting the live loop.
        if (!state.live.running) fillBufferSync();
        // Push fresh meta to any subscribers if a stream is active.
        onConfigChanged();
    }

    // Synchronously pull DISPLAY_LEN samples from the current sensor into the
    // ring buffer and re-render the time and FFT canvases. Used when the motor
    // is stopped so the user sees the signal immediately after a config change.
    function fillBufferSync() {
        if (!state.sensorInstance) return;
        var dt = 1.0 / state.sensor.sampleRateHz;
        for (var i = 0; i < DISPLAY_LEN; i++) {
            var r = state.sensorInstance.next(state.live.simTime);
            state.live.buffer[state.live.bufferPos] = r.value;
            state.live.bufferPos = (state.live.bufferPos + 1) % DISPLAY_LEN;
            state.live.simTime += dt;
        }
        state.live.bufferFilled = DISPLAY_LEN;
        renderTime();
        renderFft();
        updateStats();
    }

    function updateToggleBtn() {
        if (!els.btnMotorToggle) return;
        var running = state.live.running;
        els.btnMotorToggle.textContent = running ? "▦ Stop" : "▶ Start";
        els.canvasTime.classList.toggle("motor-stopped", !running);
    }

    // ---- Live preview loop -----------------------------------------------
    // requestAnimationFrame-driven. Each frame we advance the sim clock by
    // the actual elapsed wall-clock dt (capped) and pull as many samples as
    // fit. Capture freezes the loop visually but the recorder stays in sync.
    function startLive() {
        if (state.live.running) return;
        state.live.running = true;
        state.live.lastFrame = performance.now();
        requestAnimationFrame(liveTick);
    }

    function liveTick(now) {
        if (!state.live.running) return;
        var dt = (now - state.live.lastFrame) / 1000;
        if (dt > 0.05) dt = 0.05;
        state.live.lastFrame = now;

        if (state.sensorInstance) {
            var n = Math.floor(dt * state.sensor.sampleRateHz);
            var sampleDt = 1.0 / state.sensor.sampleRateHz;
            // When the stream is "live", we collect this frame's samples
            // into a flat array and publish a single "data" message at the
            // end. Cheaper than one postMessage per sample (which is what
            // a naive bus.publish loop would do at fs kHz).
            var publishing = state.stream.phase === "live";
            var streamSamples = publishing ? new Array(n) : null;
            var streamFirstT = state.live.simTime;
            for (var i = 0; i < n; i++) {
                var r = state.sensorInstance.next(state.live.simTime);
                state.live.buffer[state.live.bufferPos] = r.value;
                state.live.bufferPos = (state.live.bufferPos + 1) % DISPLAY_LEN;
                state.live.simTime += sampleDt;
                if (publishing) streamSamples[i] = r.value;
            }
            if (publishing && n > 0) {
                bus.publish(state.stream.id, {
                    samples: streamSamples,
                    firstT: streamFirstT,
                    dt: sampleDt,
                });
                state.stream.samplesPublished += n;
                renderStreamStats();
            }
            if (state.live.bufferFilled < DISPLAY_LEN) {
                state.live.bufferFilled = Math.min(DISPLAY_LEN, state.live.bufferFilled + n);
            }
            state.live.frameCount++;

            renderTime();
            // FFT every 3rd frame to keep CPU low at high sample rates.
            if (state.live.frameCount % 3 === 0) renderFft();
            updateStats();
        }
        requestAnimationFrame(liveTick);
    }

    // Read the ring buffer in chronological order. The newest sample sits
    // at the end (index DISPLAY_LEN - 1).
    function getOrderedBuffer() {
        var out = new Float32Array(DISPLAY_LEN);
        var p = state.live.bufferPos;
        for (var i = 0; i < DISPLAY_LEN; i++) {
            out[i] = state.live.buffer[(p + i) % DISPLAY_LEN];
        }
        return out;
    }

    // ---- Time-domain rendering -------------------------------------------
    function renderTime() {
        var c = els.canvasTime;
        var w = c.width, h = c.height;
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = 1;
        for (var g = 0; g <= 4; g++) {
            var gy = (g / 4) * h;
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
        }

        var buf = getOrderedBuffer();
        // The time span is user-selectable (default 40 ms). A narrow window
        // shows individual commutation cycles clearly; a wide window shows
        // the slow envelope / fault modulation. The FFT always uses the full
        // DISPLAY_LEN buffer so frequency resolution is unaffected.
        var nTimeWanted = Math.round(state.timeSpanS * state.sensor.sampleRateHz);
        var nTime = Math.min(state.live.bufferFilled, nTimeWanted, DISPLAY_LEN);
        if (nTime < 2) return;
        var start = DISPLAY_LEN - nTime;

        var lo = Infinity, hi = -Infinity;
        for (var k = start; k < DISPLAY_LEN; k++) {
            var v = buf[k];
            if (v < lo) lo = v;
            if (v > hi) hi = v;
        }
        if (!isFinite(lo) || hi - lo < 1e-6) { lo = -1; hi = 1; }
        var pad = (hi - lo) * 0.1;
        lo -= pad; hi += pad;

        ctx.strokeStyle = "#00d4ff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (var j = start; j < DISPLAY_LEN; j++) {
            var x = ((j - start) / (DISPLAY_LEN - start - 1)) * w;
            var y = h - ((buf[j] - lo) / (hi - lo)) * h;
            if (j === start) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = "#888";
        ctx.font = "10px monospace";
        ctx.fillText(hi.toFixed(2) + " A", 4, 11);
        ctx.fillText(lo.toFixed(2) + " A", 4, h - 4);
        var spanS = nTime / state.sensor.sampleRateHz;
        ctx.fillText(spanS.toFixed(2) + " s", w - 50, h - 4);
    }

    // ---- FFT (iterative Cooley-Tukey, in-place) --------------------------
    // N must be a power of 2. Real signal goes in re; im is filled with zeros.
    function fft(re, im, N) {
        for (var i = 1, j = 0; i < N; i++) {
            var bit = N >> 1;
            for (; j & bit; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                var tr = re[i]; re[i] = re[j]; re[j] = tr;
                var ti = im[i]; im[i] = im[j]; im[j] = ti;
            }
        }
        for (var size = 2; size <= N; size *= 2) {
            var half = size / 2;
            var step = -2 * Math.PI / size;
            for (var off = 0; off < N; off += size) {
                for (var kk = 0; kk < half; kk++) {
                    var angle = step * kk;
                    var c = Math.cos(angle), s = Math.sin(angle);
                    var i1 = off + kk, i2 = i1 + half;
                    var ar = c * re[i2] - s * im[i2];
                    var ai = s * re[i2] + c * im[i2];
                    re[i2] = re[i1] - ar; im[i2] = im[i1] - ai;
                    re[i1] += ar; im[i1] += ai;
                }
            }
        }
    }

    // Compute the FFT magnitude spectrum from the current ring buffer.
    // Returns { mag, maxBin, binHz, fs } or null if not enough samples yet.
    // Shared between renderFft() (live redraw) and fixCurrentSpectrum() (snapshot).
    function computeFftMag() {
        if (state.live.bufferFilled < FFT_SIZE) return null;
        var buf = getOrderedBuffer();
        var samples = buf.subarray(DISPLAY_LEN - FFT_SIZE);

        // Detrend: subtract the mean before windowing. The motor current has
        // a large DC component (the operating-point I_DC ~ V/R) that would
        // otherwise dominate bin 0 and leak into the first few bins through
        // the Hann window, drowning out the AC content where the fault
        // signatures live. Standard practice in MCSA / vibration analysis.
        var meanFft = 0;
        for (var mi = 0; mi < FFT_SIZE; mi++) meanFft += samples[mi];
        meanFft /= FFT_SIZE;

        var re = new Float32Array(FFT_SIZE);
        var im = new Float32Array(FFT_SIZE);
        for (var i = 0; i < FFT_SIZE; i++) {
            // Hann window reduces spectral leakage so sideband peaks are
            // sharp enough to be visible.
            var ww = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FFT_SIZE - 1)));
            re[i] = (samples[i] - meanFft) * ww;
        }
        fft(re, im, FFT_SIZE);

        var fs = state.sensor.sampleRateHz;
        var binHz = fs / FFT_SIZE;
        // Show 0 .. fs/4 (skip the ultra-high half-band, mostly noise floor).
        var maxBin = Math.floor(FFT_SIZE / 4);
        var mag = new Float32Array(maxBin);
        for (var b = 0; b < maxBin; b++) {
            mag[b] = Math.sqrt(re[b] * re[b] + im[b] * im[b]) / FFT_SIZE;
        }
        return { mag: mag, maxBin: maxBin, binHz: binHz, fs: fs };
    }

    // Convert a raw magnitude array to display-ready values for renderFft.
    // Linear mode: returns mag unchanged; caller supplies the normalization max.
    // dB mode: converts to decibels relative to ref (the spectrum's own peak),
    //   clamps at DB_FLOOR, and remaps to [0,1] so drawSpectrum is called with
    //   globalMax = 1.0.  Noise floor sits at the bottom; peaks rise to the top.
    var DB_FLOOR = -60;
    function toDisplayMag(mag, n, ref) {
        if (!state.fftLogScale) return mag;
        var range = -DB_FLOOR;
        var out = new Float32Array(n);
        for (var b = 0; b < n; b++) {
            var db = 20 * Math.log10(Math.max(mag[b], 1e-12) / ref);
            out[b] = Math.max(0, (Math.max(DB_FLOOR, db) - DB_FLOOR) / range);
        }
        return out;
    }

    // Draw one spectrum onto ctx.
    // mode: "fill"   - filled area only (no stroke), good for the live background
    //       "stroke" - stroke line only (no fill),   good for fixed overlays
    //       "both"   - filled area + stroke,          legacy / rarely used
    // globalMax is the shared normalization denominator so all overlaid spectra
    // are on the same amplitude scale.
    function drawSpectrum(ctx, mag, maxBin, globalMax, color, alpha, w, h, mode) {
        ctx.save();
        var len = Math.min(maxBin, mag.length);
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (var bi = 0; bi < len; bi++) {
            var bx = (bi / (maxBin - 1)) * w;
            var by = h - (mag[bi] / globalMax) * h;
            ctx.lineTo(bx, by);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        if (mode === "fill" || mode === "both") {
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha;
            ctx.fill();
        }
        if (mode === "stroke" || mode === "both") {
            ctx.strokeStyle = color;
            ctx.lineWidth = mode === "stroke" ? 1.5 : 1.0;
            ctx.globalAlpha = alpha;
            ctx.stroke();
        }
        ctx.restore();
    }

    function renderFft() {
        var c = els.canvasFft;
        var w = c.width, h = c.height;
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(0, 0, w, h);

        if (state.live.bufferFilled < FFT_SIZE) {
            ctx.fillStyle = "#888";
            ctx.font = "11px monospace";
            ctx.fillText("Waiting for " + FFT_SIZE + " samples (" + state.live.bufferFilled + " / " + FFT_SIZE + ")...", 8, h / 2);
            return;
        }

        var live = computeFftMag();
        if (!live) return;

        // Grid
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = 1;
        for (var gi = 0; gi <= 4; gi++) {
            var gy2 = (gi / 4) * h;
            ctx.beginPath(); ctx.moveTo(0, gy2); ctx.lineTo(w, gy2); ctx.stroke();
        }

        // Each spectrum normalizes to its own peak. In dB mode toDisplayMag
        // converts the raw amplitudes to decibels (0 dB at peak, DB_FLOOR at
        // the bottom) before drawing.
        var liveMax = 0;
        for (var b = 0; b < live.maxBin; b++) {
            if (live.mag[b] > liveMax) liveMax = live.mag[b];
        }
        if (liveMax < 1e-9) liveMax = 1e-9;

        var liveDisp = toDisplayMag(live.mag, live.maxBin, liveMax);
        var liveNorm = state.fftLogScale ? 1.0 : liveMax;
        drawSpectrum(ctx, liveDisp, live.maxBin, liveNorm, "#00d4ff", 0.12, w, h, "fill");
        drawSpectrum(ctx, liveDisp, live.maxBin, liveNorm, "#00d4ff", 1.0, w, h, "stroke");

        state.fixedSpectra.forEach(function (snap) {
            var snapMax = 0;
            var n = Math.min(snap.maxBin, live.maxBin);
            for (var bi = 0; bi < n; bi++) {
                if (snap.mag[bi] > snapMax) snapMax = snap.mag[bi];
            }
            if (snapMax < 1e-9) snapMax = 1e-9;
            var snapDisp = toDisplayMag(snap.mag, n, snapMax);
            var snapNorm = state.fftLogScale ? 1.0 : snapMax;
            drawSpectrum(ctx, snapDisp, n, snapNorm, snap.color, 0.9, w, h, "stroke");
        });

        ctx.fillStyle = "#888";
        ctx.font = "10px monospace";
        ctx.fillText("0", 4, h - 4);
        var fMax = live.maxBin * live.binHz;
        ctx.fillText(fMax.toFixed(0) + " Hz", w - 60, h - 4);
        if (state.fftLogScale) {
            ctx.fillText("0 dB", 4, 11);
            ctx.fillText(Math.round(DB_FLOOR / 2) + " dB", 4, h / 2 + 5);
        } else {
            ctx.fillText("bin " + live.binHz.toFixed(2) + " Hz", 4, 11);
        }
    }

    // ---- FFT accumulator (fixed snapshot overlays) -----------------------

    // Freeze the current live spectrum into the accumulator. Each snapshot
    // gets an auto-assigned color from the palette and a label derived from
    // the stream-name input (the same name that gets registered on the bus)
    // so it is easy to recognise which scenario it came from.
    function fixCurrentSpectrum() {
        var result = computeFftMag();
        if (!result) { log("Not enough samples yet to snapshot the FFT."); return; }
        var colorIdx = state.fixedSpectra.length % SPECTRUM_COLORS.length;
        var id = ++_spectraIdCounter;
        var baseLabel = (els.streamName && els.streamName.value.trim()) || "snapshot";
        state.fixedSpectra.push({
            id: id,
            color: SPECTRUM_COLORS[colorIdx],
            label: baseLabel + " #" + id,
            mag: result.mag,
            maxBin: result.maxBin,
            binHz: result.binHz,
            fs: result.fs,
        });
        renderFixedSpectraList();
        log("Spectrum fixed: " + baseLabel + " #" + id + " (fs=" + result.fs + " Hz, bin=" + result.binHz.toFixed(2) + " Hz)");
    }

    function removeFixedSpectrum(id) {
        state.fixedSpectra = state.fixedSpectra.filter(function (s) { return s.id !== id; });
        renderFixedSpectraList();
    }

    function renderFixedSpectraList() {
        var acc = els.fftAccumulator;
        acc.innerHTML = "";
        state.fixedSpectra.forEach(function (snap) {
            var chip = document.createElement("div");
            chip.className = "fft-chip";

            var swatch = document.createElement("span");
            swatch.className = "fft-chip-swatch";
            swatch.style.background = snap.color;
            chip.appendChild(swatch);

            var lbl = document.createElement("span");
            lbl.className = "fft-chip-label";
            lbl.textContent = snap.label;
            chip.appendChild(lbl);

            var rm = document.createElement("button");
            rm.className = "fft-chip-remove";
            rm.textContent = "x";
            rm.title = STRINGS.fftChip.removeTitle;
            (function (snapId) {
                rm.onclick = function () { removeFixedSpectrum(snapId); };
            }(snap.id));
            chip.appendChild(rm);

            acc.appendChild(chip);
        });
    }

    function updateStats() {
        var n = state.live.bufferFilled;
        if (n < 1) return;
        var buf = getOrderedBuffer();
        var start = DISPLAY_LEN - n;
        var sum = 0, lo = Infinity, hi = -Infinity;
        for (var i = start; i < DISPLAY_LEN; i++) {
            var v = buf[i];
            sum += v;
            if (v < lo) lo = v;
            if (v > hi) hi = v;
        }
        var mean = sum / n;
        var sq = 0;
        for (var i2 = start; i2 < DISPLAY_LEN; i2++) {
            var dv = buf[i2] - mean; sq += dv * dv;
        }
        var std = Math.sqrt(sq / n);
        var nEnabled = state.faults.filter(function (f) { return f.enabled; }).length;
        var speedHtml = "";
        if (state.activeMotor) {
            var omegaRps = state.activeMotor.omega / (2 * Math.PI);
            var rpm = omegaRps * 60;
            var isStalled = omegaRps < 0.5 && (state.motor.pwmDutyCycle || 1) < 0.999;
            var ST = STRINGS.stats; var U = STRINGS.units;
            speedHtml = isStalled
                ? "<span>" + ST.speed + " <strong style='color:var(--error)'>" + ST.stalled + "</strong></span>"
                : "<span>" + ST.speed + " <strong>" + omegaRps.toFixed(1) + " rps (" + Math.round(rpm) + " rpm)</strong></span>";
        }
        var ST = STRINGS.stats; var U = STRINGS.units;
        els.signalStats.innerHTML =
            "<span>" + ST.mean + " <strong>" + mean.toFixed(3) + " " + U.A + "</strong></span>" +
            "<span>" + ST.min  + " <strong>" + lo.toFixed(3)   + " " + U.A + "</strong></span>" +
            "<span>" + ST.max  + " <strong>" + hi.toFixed(3)   + " " + U.A + "</strong></span>" +
            "<span>" + ST.std  + " <strong>" + std.toFixed(4)  + " " + U.A + "</strong></span>" +
            speedHtml +
            "<span>" + ST.fs     + " <strong>" + state.sensor.sampleRateHz + " " + U.Hz + "</strong></span>" +
            "<span>" + ST.faults + " <strong>" + nEnabled + "/" + state.faults.length + "</strong></span>";
    }

    // ---- Custom presets in localStorage ----------------------------------
    function customPresets() {
        try {
            var raw = localStorage.getItem("spikypanda.motor.presets");
            return raw ? (JSON.parse(raw) || {}) : {};
        } catch (e) { return {}; }
    }

    function setCustomPresets(obj) {
        try { localStorage.setItem("spikypanda.motor.presets", JSON.stringify(obj)); }
        catch (e) { log("Failed to save preset: " + e.message); }
    }

    // ---- Property panel rendering ----------------------------------------
    // Three tabs sharing the same DOM slot. The Fault tab is enabled only
    // when a fault is selected from the list; otherwise it shows a hint.
    function renderTab() {
        var content = els.tabContent;
        content.innerHTML = "";
        if (state.selectedTab === "motor") renderMotorTab(content);
        else if (state.selectedTab === "sensor") renderSensorTab(content);
        else if (state.selectedTab === "fault") renderFaultTab(content);
        document.querySelectorAll(".tab-btn").forEach(function (b) {
            b.classList.toggle("active", b.dataset.tab === state.selectedTab);
        });
    }

    // Creates a read-only display row with the same structure as an input row:
    // label (120px, right-aligned) + value span (flex:1, bold) + unit span
    // (36px, left-aligned). Returns the value span so the caller can update it.
    // Use this for derived/computed values that must align with editable fields.
    function addDisplayRow(parent, labelText, unitText) {
        var row = document.createElement("div");
        row.className = "form-row";
        var l = document.createElement("label"); l.textContent = labelText; row.appendChild(l);
        var val = document.createElement("span");
        val.style.cssText = "font-size:0.85em; font-weight:600; flex:1; min-width:0;";
        row.appendChild(val);
        var u = document.createElement("span"); u.className = "unit"; u.textContent = unitText || ""; row.appendChild(u);
        parent.appendChild(row);
        return val;
    }

    function renderMotorTab(parent) {
        var presets = customPresets();
        var bar = document.createElement("div");
        bar.className = "preset-bar";
        var sel = document.createElement("select");
        Object.keys(BUILTIN_PRESETS).forEach(function (name) {
            var o = document.createElement("option");
            o.value = "builtin:" + name; o.textContent = name;
            sel.appendChild(o);
        });
        Object.keys(presets).forEach(function (name) {
            var o = document.createElement("option");
            o.value = "custom:" + name; o.textContent = "* " + name;
            sel.appendChild(o);
        });
        sel.value = "builtin:" + state.motorPresetName;
        sel.onchange = function () {
            var v = sel.value;
            var idx = v.indexOf(":");
            var kind = v.substr(0, idx), name = v.substr(idx + 1);
            var src = kind === "builtin" ? BUILTIN_PRESETS[name] : presets[name];
            if (!src) return;
            state.motor = clone(src);
            state.motorPresetName = name;
            rebuildSensor();
            renderTab();
            log(fmt(STRINGS.motor.presetLoadedLog, name));
        };
        bar.appendChild(sel);
        var saveBtn = document.createElement("button");
        saveBtn.textContent = STRINGS.motor.presetSave;
        saveBtn.title = STRINGS.motor.presetSaveTitle;
        saveBtn.onclick = function () {
            var name = prompt(STRINGS.motor.presetSavePrompt);
            if (!name) return;
            var p = customPresets();
            p[name] = clone(state.motor);
            setCustomPresets(p);
            log(fmt(STRINGS.motor.presetSavedLog, name));
            renderTab();
        };
        bar.appendChild(saveBtn);
        parent.appendChild(bar);

        var help = document.createElement("p");
        help.className = "help";
        help.textContent = STRINGS.motor.help;
        parent.appendChild(help);

        // Forward-declare refresh helpers so any addMotorField closure can
        // reference them via their variable even before the implementations are
        // assigned later in this function.
        var refreshDmin = function() {};
        var refreshGravAmp = function() {};
        var refreshPredSpeed = function() {};
        function motorParamChange() { refreshDmin(); refreshPredSpeed(); }

        var S = STRINGS.motor; var U = STRINGS.units;
        addMotorField(parent, S.supplyV, "supplyVoltage", U.V, 0.5, false, function() {
            refreshGravAmp(); motorParamChange();
        }, { min: 0.1 });
        addMotorField(parent, S.resistance, "resistance", U.Ohm, 0.05, false, function() {
            refreshGravAmp(); motorParamChange();
        }, { min: 0.001 });
        addMotorField(parent, S.inductance, "inductance", U.H, 0.001, false, null, { min: 1e-6 });
        addMotorField(parent, S.backEmf, "backEmfConstant", U.Vrps, 0.005, false, function() {
            refreshGravAmp(); motorParamChange();
        }, { min: 0 });
        addMotorField(parent, S.speed, "motorSpeedRps", U.rps, 1, false, function() {
            refreshGravAmp(); motorParamChange();
        }, { min: 0.1 });
        addMotorField(parent, S.commBars, "commutatorBars", "", 1, true, null, { min: 1 });
        // 0 = brushless: brush/bar faults are automatically disabled.
        addMotorField(parent, S.brushCount, "brushCount", "", 1, true, function () {
            renderFaultsList();
            refreshFaultPicker();
        }, { min: 0 });
        addMotorField(parent, S.nomCurrent, "nominalCurrent", U.A, 0.1, false, null, { min: 0 });
        addMotorField(parent, S.loadFactor, "loadFactor", "", 0.05, false, motorParamChange, { min: 0 });
        addMotorField(parent, S.rippleFactor, "rippleFactor", "", 0.01, false, null, { min: 0, max: 1 });

        // ---- Environment / gravity ----------------------------------------
        var gravH = document.createElement("h3");
        gravH.textContent = STRINGS.motor.gravSection;
        parent.appendChild(gravH);

        // Gravity toggle: on = horizontal-axis motor under Earth gravity.
        // Off = vertical shaft, drone, or microgravity; no 1x fMech injection.
        var gravChkId = "gravEnabled_" + Math.random().toString(36).slice(2);
        var gravChk = document.createElement("input");
        gravChk.type = "checkbox";
        gravChk.id = gravChkId;
        gravChk.checked = (state.motor.gravityEnabled !== false);
        var gravToggleLbl = document.createElement("label");
        gravToggleLbl.htmlFor = gravChkId;
        gravToggleLbl.textContent = STRINGS.motor.gravToggle;
        var gravToggleRow = document.createElement("div");
        gravToggleRow.className = "form-check";
        gravToggleRow.appendChild(gravChk);
        gravToggleRow.appendChild(gravToggleLbl);
        parent.appendChild(gravToggleRow);

        // Collapsible container for the three physical params.
        var gravParams = document.createElement("div");
        gravParams.className = "form-group" + (gravChk.checked ? "" : " hidden");

        var gravHelp = document.createElement("p");
        gravHelp.className = "help";
        gravHelp.textContent = STRINGS.motor.gravHelp;
        gravParams.appendChild(gravHelp);

        var gravAmp = addDisplayRow(gravParams, S.gravAmplitude, U.A);

        addMotorField(gravParams, S.rotorMass, "rotorMass", U.kg, 0.01, false, function() { refreshGravAmp(); }, { min: 0 });
        addMotorField(gravParams, S.airGap, "airGap", U.m, 0.0001, false, function() { refreshGravAmp(); }, { min: 0 });
        addMotorField(gravParams, S.bearingStiffness, "bearingRadialStiffness", U.Nm, 10000, false, function() { refreshGravAmp(); }, { min: 0 });
        parent.appendChild(gravParams);

        gravChk.onchange = function() {
            state.motor.gravityEnabled = gravChk.checked;
            gravParams.classList.toggle("hidden", !gravChk.checked);
            rebuildSensor();
            refreshGravAmp();
        };

        // ---- PWM driver ---------------------------------------------------
        var pwmH = document.createElement("h3");
        pwmH.textContent = STRINGS.motor.pwmSection;
        parent.appendChild(pwmH);
        var pwmHelp = document.createElement("p");
        pwmHelp.className = "help";
        pwmHelp.textContent = STRINGS.motor.pwmHelp;
        parent.appendChild(pwmHelp);
        addMotorField(parent, S.pwmFrequency, "pwmFrequencyHz", U.Hz, 500, false, null, { min: 100 });

        // Throttle slider: 0-100 % display; state stores 0-1 internally.
        var throttleRow = document.createElement("div");
        throttleRow.className = "form-row";
        var throttleLbl = document.createElement("label"); throttleLbl.textContent = STRINGS.motor.motorPower; throttleRow.appendChild(throttleLbl);
        var initPct = Math.round((state.motor.pwmDutyCycle != null ? state.motor.pwmDutyCycle : 1) * 100);
        var throttleSlider = document.createElement("input");
        throttleSlider.type = "range"; throttleSlider.min = 0; throttleSlider.max = 100; throttleSlider.step = 1;
        throttleSlider.value = initPct;
        var throttleNum = document.createElement("input");
        throttleNum.type = "number"; throttleNum.className = "paired-number";
        throttleNum.min = 0; throttleNum.max = 100; throttleNum.step = 1; throttleNum.value = initPct;
        var throttleUnitSpan = document.createElement("span");
        throttleUnitSpan.className = "unit"; throttleUnitSpan.textContent = STRINGS.units.pct;
        // Wrap slider+number in .input-group so they occupy one grid cell (col 2).
        var throttleGrp = document.createElement("div"); throttleGrp.className = "input-group";
        throttleGrp.appendChild(throttleSlider); throttleGrp.appendChild(throttleNum);
        throttleRow.appendChild(throttleGrp); throttleRow.appendChild(throttleUnitSpan);
        parent.appendChild(throttleRow);

        // Derived display rows: same label + value + unit structure as input
        // rows so all columns align. addDisplayRow appends and returns the span.
        var dminVal = addDisplayRow(parent, STRINGS.motor.stallThreshold, "");
        var predSpeedVal = addDisplayRow(parent, STRINGS.motor.predictedSpeed, "");

        // ---- Assign real refresh implementations now that DOM is ready ---
        refreshDmin = function() {
            var m = state.motor;
            var keRad = m.backEmfConstant / TWO_PI_JS;
            var omega = TWO_PI_JS * m.motorSpeedRps;
            var Ieq = Math.max(0, (m.supplyVoltage - keRad * omega) / m.resistance);
            var dmin = Math.min(1, (m.resistance * Ieq * (m.loadFactor || 1)) / m.supplyVoltage);
            dminVal.textContent = (dmin * 100).toFixed(0) + " %";
            dminVal.style.color = dmin > 0.7 ? "var(--error)" : dmin > 0.4 ? "var(--warning, #f5a623)" : "var(--primary)";
        };

        refreshGravAmp = function() {
            var active = (state.motor.gravityEnabled !== false);
            gravAmp.textContent = active ? computeGravEcc(state.motor).toFixed(4) : "—";
            gravAmp.style.color = active ? "var(--primary)" : "var(--text-muted)";
        };

        refreshPredSpeed = function() {
            var m = state.motor;
            var D = m.pwmDutyCycle != null ? m.pwmDutyCycle : 1;
            var keRad = m.backEmfConstant / TWO_PI_JS;
            var omegaNom = TWO_PI_JS * m.motorSpeedRps;
            var IeqD1 = Math.max(0, (m.supplyVoltage - keRad * omegaNom) / m.resistance);
            var vDrop = m.resistance * IeqD1 * (m.loadFactor || 1);
            var omega = Math.max(0, (m.supplyVoltage * D - vDrop) / keRad);
            var rps = omega / TWO_PI_JS;
            var rpm = Math.round(omega * 60 / TWO_PI_JS);
            if (rps < 0.5) {
                predSpeedVal.textContent = STRINGS.motor.stalled;
                predSpeedVal.style.color = "var(--error)";
            } else {
                predSpeedVal.textContent = rps.toFixed(1) + " rps (" + rpm + " rpm)";
                predSpeedVal.style.color = "var(--primary)";
            }
        };

        function applyThrottle(pct) {
            var valid = isFinite(pct) && pct >= 0 && pct <= 100;
            throttleNum.classList.toggle("input-invalid", !valid);
            if (!valid) return;
            state.motor.pwmDutyCycle = pct / 100;
            if (document.activeElement !== throttleSlider) throttleSlider.value = pct;
            if (document.activeElement !== throttleNum) throttleNum.value = pct;
            rebuildSensor();
            refreshDmin();
            refreshPredSpeed();
        }
        throttleSlider.oninput = function() { applyThrottle(parseInt(throttleSlider.value, 10)); };
        throttleNum.oninput = function() { applyThrottle(parseInt(throttleNum.value, 10)); };

        // Initial population of all derived displays.
        refreshGravAmp();
        refreshDmin();
        refreshPredSpeed();
    }

    // constraints: optional { min, max, showSlider } object.
    // showSlider: renders a range slider paired with the number input, useful
    //   for bounded [0,1] parameters like duty cycle where live drag is useful.
    // Values outside [min, max] mark the input red and are rejected.
    function addMotorField(parent, label, key, unit, step, isInt, afterChange, constraints) {
        var row = document.createElement("div");
        row.className = "form-row";
        var l = document.createElement("label"); l.textContent = label; row.appendChild(l);

        var showSlider = constraints && constraints.showSlider;

        function applyMotorValue(v, inp, slid) {
            var valid = isFinite(v);
            if (valid && constraints) {
                if (constraints.min !== undefined && v < constraints.min) valid = false;
                if (constraints.max !== undefined && v > constraints.max) valid = false;
            }
            if (inp) inp.classList.toggle("input-invalid", !valid);
            if (!valid) return;
            state.motor[key] = v;
            if (slid && slid.value != v) slid.value = v;
            if (inp && showSlider && document.activeElement !== inp) inp.value = v.toFixed(inp.step && inp.step < 0.1 ? 2 : 1);
            rebuildSensor();
            if (afterChange) afterChange();
        }

        if (showSlider) {
            var slid = document.createElement("input");
            slid.type = "range";
            slid.min = constraints.min !== undefined ? constraints.min : 0;
            slid.max = constraints.max !== undefined ? constraints.max : 1;
            slid.step = step;
            slid.value = state.motor[key];

            var inp = document.createElement("input");
            inp.type = "number";
            inp.className = "paired-number";
            inp.value = state.motor[key];
            inp.step = step;
            inp.min = slid.min; inp.max = slid.max;

            slid.oninput = function () { applyMotorValue(parseFloat(slid.value), inp, null); };
            inp.oninput = function () {
                var v = isInt ? parseInt(inp.value, 10) : parseFloat(inp.value);
                applyMotorValue(v, inp, slid);
            };

            // Wrap in .input-group so slider+number occupy one grid cell (col 2).
            var grp = document.createElement("div"); grp.className = "input-group";
            grp.appendChild(slid); grp.appendChild(inp);
            row.appendChild(grp);
        } else {
            var inp = document.createElement("input");
            inp.type = "number"; inp.value = state.motor[key]; inp.step = step;
            if (constraints) {
                if (constraints.min !== undefined) inp.min = constraints.min;
                if (constraints.max !== undefined) inp.max = constraints.max;
            }
            inp.oninput = function () {
                var v = isInt ? parseInt(inp.value, 10) : parseFloat(inp.value);
                applyMotorValue(v, inp, null);
            };
            row.appendChild(inp);
        }

        var u = document.createElement("span"); u.className = "unit"; u.textContent = unit; row.appendChild(u);
        parent.appendChild(row);
    }

    function renderSensorTab(parent) {
        var help = document.createElement("p");
        help.className = "help";
        help.textContent = STRINGS.sensor.help;
        parent.appendChild(help);
        var U = STRINGS.units; var SS = STRINGS.sensor;
        addSensorField(parent, SS.sampleRate, "sampleRateHz", U.Hz, 100, true, { min: 100 });
        addSensorField(parent, SS.noiseStd, "noiseStd", U.A, 0.005, false, { min: 0 });
        addSensorField(parent, SS.gain, "gain", "", 0.05);        // negative gain (inversion) is intentional
        addSensorField(parent, SS.bias, "bias", U.A, 0.01);       // signed offset, no constraint
        addSensorField(parent, SS.rngSeed, "rngSeed", "", 1, true, { min: 0 });
    }

    function addSensorField(parent, label, key, unit, step, isInt, constraints) {
        var row = document.createElement("div");
        row.className = "form-row";
        var l = document.createElement("label"); l.textContent = label; row.appendChild(l);
        var inp = document.createElement("input");
        inp.type = "number"; inp.value = state.sensor[key]; inp.step = step;
        if (constraints) {
            if (constraints.min !== undefined) inp.min = constraints.min;
            if (constraints.max !== undefined) inp.max = constraints.max;
        }
        inp.oninput = function () {
            var v = isInt ? parseInt(inp.value, 10) : parseFloat(inp.value);
            var valid = isFinite(v);
            if (valid && constraints) {
                if (constraints.min !== undefined && v < constraints.min) valid = false;
                if (constraints.max !== undefined && v > constraints.max) valid = false;
            }
            inp.classList.toggle("input-invalid", !valid);
            if (!valid) return;
            state.sensor[key] = v;
            rebuildSensor();
        };
        row.appendChild(inp);
        var u = document.createElement("span"); u.className = "unit"; u.textContent = unit; row.appendChild(u);
        parent.appendChild(row);
    }

    function renderFaultTab(parent) {
        if (state.selectedFaultIdx === null || !state.faults[state.selectedFaultIdx]) {
            var msg = document.createElement("p");
            msg.className = "help";
            msg.textContent = STRINGS.fault.noSelection;
            parent.appendChild(msg);
            return;
        }
        var f = state.faults[state.selectedFaultIdx];
        var cfg = f.cfg;

        var h = document.createElement("h3");
        h.textContent = cfg.displayName + " (" + Sensors.motorFaultLabel(cfg.type) + ")";
        parent.appendChild(h);

        var help = document.createElement("p");
        help.className = "help";
        help.textContent = cfg.description;
        parent.appendChild(help);

        var SF = STRINGS.fault;
        addFaultField(parent, SF.displayName, "displayName", "text");
        addFaultField(parent, SF.severity, "severity", "number", 0.05, false, { min: 0, max: 1 });

        if (cfg.type === Sensors.MotorFaultType.BEARING_DEFECT) {
            addFaultField(parent, SF.bpfoFactor, "bpfoFactor", "number", 0.1, false, { min: 0.1 });
            addFaultField(parent, SF.bpfiFactor, "bpfiFactor", "number", 0.1, false, { min: 0.1 });
        } else if (cfg.type === Sensors.MotorFaultType.BRUSH_FAULT) {
            var N = state.motor.brushCount || 2;
            var brushHelp = document.createElement("p");
            brushHelp.className = "help";
            brushHelp.textContent = fmt(STRINGS.fault.brushHelp, N - 1, N, Math.round(360 / N));
            parent.appendChild(brushHelp);
            // Inline selector: one button per brush index so it is immediately visual.
            var brushBar = document.createElement("div");
            brushBar.className = "controls";
            brushBar.style.gap = "6px";
            brushBar.style.flexWrap = "wrap";
            for (var bi = 0; bi < N; bi++) {
                (function (idx) {
                    var b = document.createElement("button");
                    var angle = Math.round((360 * idx) / N);
                    b.textContent = fmt(STRINGS.fault.brushBtn, idx, angle);
                    b.style.fontSize = "0.78em";
                    b.style.padding = "3px 8px";
                    if ((cfg.faultyBrushIndex || 0) === idx) {
                        b.style.borderColor = "var(--primary)";
                        b.style.color = "var(--primary)";
                    }
                    b.onclick = function () {
                        cfg.faultyBrushIndex = idx;
                        rebuildSensor();
                        renderTab();
                    };
                    brushBar.appendChild(b);
                }(bi));
            }
            parent.appendChild(brushBar);
        } else if (cfg.type === Sensors.MotorFaultType.BROKEN_BAR) {
            // Total bars is derived from the motor's commutatorBars, not
            // settable on the fault itself. Show it read-only for reference.
            var barsRow = document.createElement("div");
            barsRow.className = "form-row";
            var barsLabel = document.createElement("label");
            barsLabel.textContent = STRINGS.fault.totalBars;
            barsRow.appendChild(barsLabel);
            var barsVal = document.createElement("span");
            barsVal.style.fontSize = "0.85em";
            barsVal.style.color = "var(--text-muted)";
            barsVal.textContent = fmt(STRINGS.fault.totalBarsNote, cfg.totalBars);
            barsRow.appendChild(barsVal);
            parent.appendChild(barsRow);

            addBrokenIndicesField(parent);
        }
        // misalignment, eccentricity, brush_fault: no extra knobs. They
        // inherit everything they need from the motor (rotation rate,
        // commutator bar count for brush) so the fault config carries only
        // its severity and presentation.
    }

    function addBrokenIndicesField(parent) {
        var f = state.faults[state.selectedFaultIdx];
        var cfg = f.cfg;
        var row = document.createElement("div");
        row.className = "form-row";
        var l = document.createElement("label"); l.textContent = STRINGS.fault.brokenBars; row.appendChild(l);
        var inp = document.createElement("input");
        inp.type = "text";
        inp.placeholder = STRINGS.fault.brokenHint;
        inp.value = (cfg.brokenIndices || []).join(",");
        inp.oninput = function () {
            var parts = inp.value.split(",")
                .map(function (s) { return parseInt(s.trim(), 10); })
                .filter(function (n) { return isFinite(n) && n >= 0 && n < cfg.totalBars; });
            cfg.brokenIndices = parts;
            renderFaultsList();
            rebuildSensor();
        };
        row.appendChild(inp);
        parent.appendChild(row);

        // Helper buttons: contiguous N, distributed N
        var help = document.createElement("p");
        help.className = "help";
        help.textContent = STRINGS.fault.brokenHelp;
        parent.appendChild(help);
        var bar = document.createElement("div");
        bar.className = "controls";
        bar.style.gap = "6px";
        bar.style.flexWrap = "wrap";
        [1, 2, 3, 4].forEach(function (n) {
            var b = document.createElement("button");
            b.textContent = fmt(STRINGS.fault.contig, n);
            b.style.fontSize = "0.75em";
            b.style.padding = "2px 6px";
            b.onclick = function () {
                cfg.brokenIndices = Sensors.contiguousBrokenBars(cfg.totalBars, n);
                renderTab();
                renderFaultsList();
                rebuildSensor();
            };
            bar.appendChild(b);
        });
        [2, 3, 4].forEach(function (n) {
            var b = document.createElement("button");
            b.textContent = fmt(STRINGS.fault.distrib, n);
            b.style.fontSize = "0.75em";
            b.style.padding = "2px 6px";
            b.onclick = function () {
                cfg.brokenIndices = Sensors.evenlyDistributedBrokenBars(cfg.totalBars, n);
                renderTab();
                renderFaultsList();
                rebuildSensor();
            };
            bar.appendChild(b);
        });
        parent.appendChild(bar);
    }

    function addFaultField(parent, label, key, type, step, isInt, constraints) {
        var f = state.faults[state.selectedFaultIdx];
        var cfg = f.cfg;
        var row = document.createElement("div");
        row.className = "form-row";
        var l = document.createElement("label"); l.textContent = label; row.appendChild(l);
        var inp = document.createElement("input");
        inp.type = type;
        inp.value = cfg[key] !== undefined ? cfg[key] : "";
        if (type === "number") {
            inp.step = step;
            if (constraints) {
                if (constraints.min !== undefined) inp.min = constraints.min;
                if (constraints.max !== undefined) inp.max = constraints.max;
            }
        }
        inp.oninput = function () {
            if (type === "number") {
                var v = isInt ? parseInt(inp.value, 10) : parseFloat(inp.value);
                var valid = isFinite(v);
                if (valid && constraints) {
                    if (constraints.min !== undefined && v < constraints.min) valid = false;
                    if (constraints.max !== undefined && v > constraints.max) valid = false;
                }
                inp.classList.toggle("input-invalid", !valid);
                if (!valid) return;
                cfg[key] = v;
            } else {
                cfg[key] = inp.value;
            }
            renderFaultsList();
            rebuildSensor();
        };
        row.appendChild(inp);
        parent.appendChild(row);
    }

    // ---- Faults list -----------------------------------------------------
    function renderFaultsList() {
        var list = els.faultsList;
        list.innerHTML = "";
        if (state.faults.length === 0) {
            var li0 = document.createElement("li");
            li0.className = "empty";
            li0.textContent = STRINGS.faultsList.empty;
            list.appendChild(li0);
            return;
        }
        state.faults.forEach(function (f, idx) {
            var li = document.createElement("li");
            var brushlessIncompat = isBrushless() && isBrushedOnlyFault(f.cfg.type);
            var classes = [];
            if (state.selectedFaultIdx === idx) classes.push("selected");
            if (!f.enabled || brushlessIncompat) classes.push("disabled");
            if (brushlessIncompat) classes.push("brushless-incompat");
            li.className = classes.join(" ");
            if (brushlessIncompat) li.title = STRINGS.faultsList.incompat;

            var cb = document.createElement("input");
            cb.type = "checkbox"; cb.checked = f.enabled; cb.disabled = brushlessIncompat;
            cb.onclick = function (e) {
                e.stopPropagation();
                f.enabled = cb.checked;
                rebuildSensor();
                renderFaultsList();
            };
            li.appendChild(cb);

            var detail = STRINGS.faultsList.detailSeverity + " " + Number(f.cfg.severity).toFixed(2);
            if (f.cfg.type === Sensors.MotorFaultType.BROKEN_BAR) {
                var ind = (f.cfg.brokenIndices || []).join(",");
                detail += " &middot; bars [" + ind + "] / " + f.cfg.totalBars;
            } else if (f.cfg.type === Sensors.MotorFaultType.BRUSH_FAULT) {
                var brushN = state.motor.brushCount || 2;
                var bIdx = f.cfg.faultyBrushIndex || 0;
                var bAngle = Math.round((360 * bIdx) / brushN);
                detail += " &middot; brush " + bIdx + " (" + bAngle + "°)";
            }
            if (brushlessIncompat) detail += " " + STRINGS.faultsList.incompatBadge;
            var name = document.createElement("div");
            name.className = "fault-name";
            name.innerHTML =
                "<div>" + f.cfg.displayName + "</div>" +
                "<div class='fault-meta'>" + detail + "</div>";
            li.appendChild(name);

            var rm = document.createElement("button");
            rm.className = "fault-remove"; rm.textContent = "x"; rm.title = STRINGS.faultsList.removeBtnTitle;
            rm.onclick = function (e) {
                e.stopPropagation();
                state.faults.splice(idx, 1);
                if (state.selectedFaultIdx === idx) state.selectedFaultIdx = null;
                else if (state.selectedFaultIdx !== null && state.selectedFaultIdx > idx) state.selectedFaultIdx--;
                rebuildSensor();
                renderFaultsList();
                updateFaultTab();
                if (state.selectedTab === "fault") renderTab();
            };
            li.appendChild(rm);

            li.onclick = function () {
                state.selectedFaultIdx = idx;
                state.selectedTab = "fault";
                updateFaultTab();
                renderTab();
                renderFaultsList();
            };
            list.appendChild(li);
        });
    }

    function updateFaultTab() {
        els.tabFault.disabled = (state.selectedFaultIdx === null || state.faults.length === 0);
    }

    // Update the add-fault <select> to disable options that are incompatible
    // with the current brushless setting. Called whenever brushless changes.
    function refreshFaultPicker() {
        var sel = $("addFaultType");
        if (!sel) return;
        Array.prototype.forEach.call(sel.options, function (opt) {
            var typeNum = parseInt(opt.value, 10);
            var incompat = isBrushless() && isBrushedOnlyFault(typeNum);
            opt.disabled = incompat;
            opt.style.color = incompat ? "var(--text-muted)" : "";
            if (incompat && opt.selected) {
                // Move selection to the first compatible option.
                Array.prototype.some.call(sel.options, function (o) {
                    if (!o.disabled) { sel.value = o.value; return true; }
                });
            }
        });
    }

    function addFault() {
        var typeNum = parseInt($("addFaultType").value, 10);
        if (isBrushless() && isBrushedOnlyFault(typeNum)) {
            log(fmt(STRINGS.faultsList.cannotAdd, Sensors.motorFaultLabel(typeNum)));
            return;
        }
        var params = { type: typeNum, severity: 0.5 };
        if (typeNum === Sensors.MotorFaultType.BROKEN_BAR) {
            // Default to a single broken bar at index 0 in a rotor matching
            // the motor's commutator-bar count.
            params.totalBars = state.motor.commutatorBars;
            params.brokenIndices = [0];
        } else if (typeNum === Sensors.MotorFaultType.BRUSH_FAULT) {
            params.faultyBrushIndex = 0;
        }
        var cfg = Sensors.makeMotorFault(params);
        state.faults.push({ enabled: true, cfg: cfg });
        state.selectedFaultIdx = state.faults.length - 1;
        state.selectedTab = "fault";
        rebuildSensor();
        updateFaultTab();
        renderFaultsList();
        renderTab();
        log(fmt(STRINGS.faultsList.addedLog, cfg.displayName));
    }

    // ---- Stream publish --------------------------------------------------
    // The page registers a single stream on the bus when the user hits Start
    // and re-registers (with the same id) any time the motor / sensor / fault
    // config changes while the stream is live. Subscribers see the new meta
    // through the registry's "streams-updated" broadcast.

    // Build the JSON-cloneable meta snapshot that travels with the stream
    // registration. Mirrors the scenarioMeta shape that LabeledRecorder
    // produces, so consumers can treat a registered stream identically to a
    // recorded scenario.
    function buildStreamMeta() {
        var motor = clone(state.motor);
        var enabled = state.faults.filter(function (f) {
            if (isBrushless() && isBrushedOnlyFault(f.cfg.type)) return false;
            return f.enabled;
        }).map(function (f) { return clone(f.cfg); });
        return {
            kind: "motor.current",
            units: STRINGS.units.A,
            sampleRateHz: state.sensor.sampleRateHz,
            sensor: clone(state.sensor),
            motor: motor,
            mechanicalFreqHz: motor.motorSpeedRps,
            faults: enabled.map(function (c) {
                var entry = {
                    typeId: c.type,
                    type: Sensors.motorFaultLabel(c.type),
                    displayName: c.displayName,
                    severity: c.severity,
                };
                if (c.type === Sensors.MotorFaultType.BROKEN_BAR) {
                    entry.totalBars = c.totalBars;
                    entry.brokenIndices = Array.from(c.brokenIndices);
                } else if (c.type === Sensors.MotorFaultType.BEARING_DEFECT) {
                    entry.bpfoFactor = c.bpfoFactor;
                    entry.bpfiFactor = c.bpfiFactor;
                }
                return entry;
            }),
        };
    }

    function streamName() {
        return (els.streamName && els.streamName.value.trim()) || state.stream.id;
    }

    // Register or re-register the stream with the current meta snapshot.
    // Idempotent on the worker side: same streamId just overwrites the entry
    // and triggers a streams-updated broadcast.
    function registerStream() {
        bus.registerStream(state.stream.id, {
            name: streamName(),
            meta: buildStreamMeta(),
        });
    }

    function setStreamPhase(phase) {
        state.stream.phase = phase;
        renderStreamControls();
        renderStreamStats();
    }

    function streamStart() {
        if (!state.stream.connected) return;
        if (state.stream.phase !== "stopped") return;
        if (!streamName()) { alert(STRINGS.stream.validName); return; }
        state.stream.samplesPublished = 0;
        registerStream();
        setStreamPhase("live");
        log(fmt(STRINGS.stream.logStarted, state.stream.id, streamName()));
    }

    function streamPause() {
        if (state.stream.phase === "live") {
            setStreamPhase("paused");
            log(STRINGS.stream.logPaused);
        } else if (state.stream.phase === "paused") {
            setStreamPhase("live");
            log(STRINGS.stream.logResumed);
        }
    }

    function streamStop() {
        if (state.stream.phase === "stopped") return;
        bus.unregisterStream(state.stream.id);
        setStreamPhase("stopped");
        log(STRINGS.stream.logStopped);
    }

    // Called by rebuildSensor() whenever motor/sensor/fault config changes.
    // While the stream is live or paused, push the new meta to subscribers.
    function onConfigChanged() {
        if (state.stream.phase !== "stopped" && state.stream.connected) {
            registerStream();
            log(STRINGS.stream.logConfigChanged);
        }
    }

    function renderStreamControls() {
        if (!els.btnStreamStart) return;
        var p = state.stream.phase;
        var connected = state.stream.connected;
        els.btnStreamStart.disabled = !connected || p !== "stopped";
        els.btnStreamPause.disabled = !connected || p === "stopped";
        els.btnStreamStop.disabled  = !connected || p === "stopped";
        els.btnStreamPause.textContent = p === "paused" ? "Resume" : "Pause";
        if (els.streamStatus) {
            var subs = state.stream.subscribers;
            var label = p === "live"   ? fmt(STRINGS.stream.statusLive, subs)
                      : p === "paused" ? fmt(STRINGS.stream.statusPaused, subs)
                      :                  STRINGS.stream.statusStopped;
            els.streamStatus.textContent = label;
            els.streamStatus.className = "capture-status" + (p === "live" ? " capturing"
                                                          : p === "paused" ? " done"
                                                          : "");
        }
    }

    function renderStreamStats() {
        if (!els.streamStats) return;
        els.streamStats.innerHTML = "<span>" + fmt(
            STRINGS.stream.statsLine,
            state.stream.id,
            state.stream.samplesPublished.toLocaleString(),
            state.stream.subscribers
        ) + "</span>";
    }

    // ---- Init ------------------------------------------------------------
    function init() {
        if (typeof Sensors === "undefined" || !Sensors.MotorCurrentSource) {
            document.body.innerHTML =
                "<div style='padding:40px; color:#f44; font-family:monospace;'>" + STRINGS.init.bundleError + "</div>";
            return;
        }

        els.canvasTime = $("canvasTime");
        els.canvasFft = $("canvasFft");
        els.fftAccumulator = $("fftAccumulator");
        els.btnMotorToggle = $("btnMotorToggle");
        $("timeSpan").onchange = function () {
            var v = parseFloat($("timeSpan").value);
            if (isFinite(v) && v > 0) state.timeSpanS = v;
        };
        els.btnMotorToggle.onclick = function () {
            if (state.live.running) {
                state.live.running = false;
            } else {
                startLive();
            }
            updateToggleBtn();
        };
        els.faultsList = $("faultsList");
        els.tabContent = $("tabContent");
        els.tabFault = $("tabFault");
        els.signalStats = $("signalStats");
        els.log = $("log");
        els.streamName = $("streamName");
        els.streamStatus = $("streamStatus");
        els.streamStats = $("streamStats");
        els.btnStreamStart = $("btnStreamStart");
        els.btnStreamPause = $("btnStreamPause");
        els.btnStreamStop = $("btnStreamStop");

        document.querySelectorAll(".tab-btn").forEach(function (b) {
            b.onclick = function () {
                if (b.disabled) return;
                state.selectedTab = b.dataset.tab;
                renderTab();
            };
        });

        $("btnAddFault").onclick = addFault;
        $("btnFixSpectrum").onclick = fixCurrentSpectrum;
        els.btnFftScale = $("btnFftScale");
        if (els.btnFftScale) {
            els.btnFftScale.onclick = function() {
                state.fftLogScale = !state.fftLogScale;
                els.btnFftScale.textContent = state.fftLogScale ? STRINGS.fftScale.lin : STRINGS.fftScale.db;
                els.btnFftScale.title = state.fftLogScale ? STRINGS.fftScale.toLin : STRINGS.fftScale.toDb;
                renderFft();
            };
        }
        els.btnStreamStart.onclick = streamStart;
        els.btnStreamPause.onclick = streamPause;
        els.btnStreamStop.onclick  = streamStop;

        // Bus wiring. Buttons stay disabled until the SharedWorker handshake.
        bus.on("connected", function () {
            state.stream.connected = true;
            renderStreamControls();
            bus.listStreams();
        });
        // Track our own subscribers count from the broadcast list. The
        // "streams-updated" message includes ALL streams; pull ours by id.
        var applyStreamsList = function (list) {
            var me = (list || []).find(function (s) { return s.streamId === state.stream.id; });
            state.stream.subscribers = me ? me.subscribers : 0;
            renderStreamStats();
            renderStreamControls();
        };
        bus.on("streams", function (m) {
            applyStreamsList(m.streams);
            log(fmt(STRINGS.stream.logBusConnected, (m.streams || []).length));
        });
        bus.on("streams-updated", function (m) { applyStreamsList(m.streams); });

        rebuildSensor();
        renderTab();
        renderFaultsList();
        updateFaultTab();
        refreshFaultPicker();
        startLive();
        updateToggleBtn();
        renderStreamControls();
        renderStreamStats();
        log(STRINGS.init.ready);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
