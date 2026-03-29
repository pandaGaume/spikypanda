// =========================================================================
// SpikyPanda KWS Demo — Real ONNX inference in the browser
// =========================================================================

var LABELS = ["yes","no","up","down","left","right","on","off","stop","go","unknown","silence"];
var SAMPLE_RATE = 16000;
var N_MFCC = 40;
var N_FRAMES = 101;
var HOP_LENGTH = 160;
var N_FFT = 512;
var MODEL_URL = "../../dev/tools/kws/kws_conv_tiny.onnx";

var audioCtx = null;
var mediaStream = null;
var isListening = false;
var inferenceCount = 0;
var totalInferenceMs = 0;
var processorNode = null;
var audioBuffer = new Float32Array(SAMPLE_RATE);
var bufferPos = 0;

// ── ONNX runtime references ────────────────────────────────────────
var onnxGraph = null;
var onnxGraphGeneric = null;
var onnxGraphSpikyPanda = null;
var onnxInputNames = null;
var onnxModelLoaded = false;
var useSpikyPanda = true;

// ── Log ──────────────────────────────────────────────────────────────
function kwsLog(msg) {
    var el = document.getElementById("log");
    var time = new Date().toLocaleTimeString("en", { hour12: false });
    el.textContent += "[" + time + "] " + msg + "\n";
    el.scrollTop = el.scrollHeight;
}

// ── Keyword Grid ────────────────────────────────────────────────────
function buildGrid() {
    var grid = document.getElementById("keyword-grid");
    grid.innerHTML = "";
    for (var i = 0; i < LABELS.length; i++) {
        var el = document.createElement("div");
        el.className = "kws-keyword";
        el.id = "kw-" + LABELS[i];
        el.textContent = LABELS[i];
        grid.appendChild(el);
    }
}

function highlightKeyword(label, confidence) {
    document.querySelectorAll(".kws-keyword").forEach(function (el) {
        el.classList.remove("active");
    });
    var el = document.getElementById("kw-" + label);
    if (el) el.classList.add("active");

    var detected = document.getElementById("detected-word");
    detected.textContent = label === "silence" ? "--" : label.toUpperCase();
    detected.classList.add("flash");
    setTimeout(function () {
        detected.classList.remove("flash");
    }, 200);

    document.getElementById("confidence-text").textContent =
        (confidence * 100).toFixed(1) + "% confidence";
}

// ── MFCC ────────────────────────────────────────────────────────────
function melFilterbank(nMels, nFft, sampleRate) {
    var fMax = sampleRate / 2;
    var melMin = 2595 * Math.log10(1);
    var melMax = 2595 * Math.log10(1 + fMax / 700);
    var melPoints = new Float32Array(nMels + 2);
    for (var i = 0; i < nMels + 2; i++) {
        melPoints[i] = melMin + (melMax - melMin) * (i / (nMels + 1));
    }
    var hzPoints = Array.from(melPoints).map(function (m) {
        return 700 * (Math.pow(10, m / 2595) - 1);
    });
    var bins = hzPoints.map(function (h) {
        return Math.floor(((nFft + 1) * h) / sampleRate);
    });
    var nBins = nFft / 2 + 1;
    var fb = [];
    for (var m = 0; m < nMels; m++) {
        var row = new Float32Array(nBins);
        var left = bins[m], center = bins[m + 1], right = bins[m + 2];
        for (var k = left; k < center; k++) {
            if (k >= 0 && k < nBins)
                row[k] = (k - left) / Math.max(center - left, 1);
        }
        for (var k2 = center; k2 <= right; k2++) {
            if (k2 >= 0 && k2 < nBins)
                row[k2] = (right - k2) / Math.max(right - center, 1);
        }
        fb.push(row);
    }
    return fb;
}

function dctMatrix(nMfcc, nMels) {
    var dct = [];
    for (var k = 0; k < nMfcc; k++) {
        var row = new Float32Array(nMels);
        for (var n = 0; n < nMels; n++) {
            row[n] = Math.cos((Math.PI * k * (2 * n + 1)) / (2 * nMels));
        }
        dct.push(row);
    }
    return dct;
}

var melFB = melFilterbank(40, N_FFT, SAMPLE_RATE);
var dctMat = dctMatrix(N_MFCC, 40);

// Store mel spectrogram for visualization (before DCT)
var lastMelSpec = null;

function computeMFCC(audioData) {
    var nBins = N_FFT / 2 + 1;
    var mfcc = new Float32Array(N_MFCC * N_FRAMES);
    var melViz = new Float32Array(40 * N_FRAMES); // for spectrogram display
    for (var t = 0; t < N_FRAMES; t++) {
        var start = t * HOP_LENGTH;
        var frame = new Float32Array(N_FFT);
        for (var i = 0; i < N_FFT && start + i < audioData.length; i++) {
            var w = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (N_FFT - 1)));
            frame[i] = audioData[start + i] * w;
        }
        var spectrum = new Float32Array(nBins);
        for (var k = 0; k < nBins; k++) {
            var re = 0, im = 0;
            for (var n = 0; n < N_FFT; n++) {
                var angle = (-2 * Math.PI * k * n) / N_FFT;
                re += frame[n] * Math.cos(angle);
                im += frame[n] * Math.sin(angle);
            }
            spectrum[k] = re * re + im * im;
        }
        var melSpec = new Float32Array(40);
        for (var m = 0; m < 40; m++) {
            var sum = 0;
            for (var k2 = 0; k2 < nBins; k2++) sum += melFB[m][k2] * spectrum[k2];
            melSpec[m] = Math.log(Math.max(sum, 1e-10));
            melViz[m * N_FRAMES + t] = melSpec[m]; // store for viz
        }
        for (var c = 0; c < N_MFCC; c++) {
            var sum2 = 0;
            for (var m2 = 0; m2 < 40; m2++) sum2 += dctMat[c][m2] * melSpec[m2];
            mfcc[c * N_FRAMES + t] = sum2;
        }
    }
    lastMelSpec = melViz;
    return mfcc;
}

// ── Softmax ─────────────────────────────────────────────────────────
function softmax(logits) {
    var max = -Infinity;
    for (var i = 0; i < logits.length; i++)
        if (logits[i] > max) max = logits[i];
    var exps = [];
    var sum = 0;
    for (var i2 = 0; i2 < logits.length; i2++) {
        exps[i2] = Math.exp(logits[i2] - max);
        sum += exps[i2];
    }
    for (var i3 = 0; i3 < exps.length; i3++) exps[i3] /= sum;
    return exps;
}

// ── ONNX Inference ──────────────────────────────────────────────────
function runInference(mfccData) {
    var t0 = performance.now();
    var logits;

    if (onnxModelLoaded && onnxGraph) {
        // Real SpikyPanda ONNX inference
        var inputTensor = {
            data: mfccData,
            shape: [1, N_MFCC, N_FRAMES],
            name: onnxInputNames[0],
        };
        var externalInputs = new Map();
        externalInputs.set(onnxInputNames[0], inputTensor);

        var results = onnxGraph.run(externalInputs);
        var output = results.values().next().value;
        logits = Array.from(output.data);
    } else {
        // Fallback: silence
        logits = new Array(12).fill(0);
        logits[11] = 1.0;
    }

    return { logits: logits, inferenceMs: performance.now() - t0 };
}

// ── Load ONNX Model ────────────────────────────────────────────────
function loadOnnxModel() {
    var RT = window.SpikypandaRuntime;
    if (!RT) {
        kwsLog("SpikypandaRuntime bundle not found - inference disabled");
        return;
    }

    kwsLog("Loading ONNX model...");

    fetch(MODEL_URL)
        .then(function (resp) {
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            return resp.arrayBuffer();
        })
        .then(function (buf) {
            var bytes = new Uint8Array(buf);
            kwsLog("Model loaded: " + (bytes.length / 1024).toFixed(1) + " KB");

            var parsed = RT.OnnxParser.parse(bytes);
            if (!parsed) {
                kwsLog("ERROR: Failed to parse ONNX model");
                return;
            }
            kwsLog("Parsed: " + parsed.nodes.length + " nodes, " + parsed.initializers.length + " initializers");

            var ops = [];
            for (var i = 0; i < parsed.nodes.length; i++) {
                var op = parsed.nodes[i].opType;
                if (ops.indexOf(op) === -1) ops.push(op);
            }
            kwsLog("Ops: " + ops.join(", "));

            // Build both graphs: generic and SpikyPanda native
            var genericRegistry = RT.createDefaultRegistry();
            var genericBuilder = new RT.OnnxGraphBuilder(genericRegistry);
            var genericResult = genericBuilder.build(parsed);
            onnxGraphGeneric = genericResult.graph;

            if (RT.createSpikyPandaRegistry) {
                var spRegistry = RT.createSpikyPandaRegistry();
                var spBuilder = new RT.OnnxGraphBuilder(spRegistry);
                // Re-parse because build() mutates node state
                var parsed2 = RT.OnnxParser.parse(bytes);
                var spResult = spBuilder.build(parsed2);
                onnxGraphSpikyPanda = spResult.graph;
                kwsLog("Built 2 graphs: generic (" + genericResult.graph.nodes.length + " nodes) + spikypanda (" + spResult.graph.nodes.length + " nodes)");
            } else {
                onnxGraphSpikyPanda = onnxGraphGeneric;
                kwsLog("Built graph: " + genericResult.graph.nodes.length + " nodes (SpikyPanda registry not available)");
            }

            onnxInputNames = genericResult.inputNames;
            onnxGraph = useSpikyPanda ? onnxGraphSpikyPanda : onnxGraphGeneric;
            onnxModelLoaded = true;

            kwsLog("Input: " + onnxInputNames.join(", "));
            kwsLog("Active backend: " + (useSpikyPanda ? "spikypanda" : "generic"));
            kwsLog("ONNX pipeline ready - toggle checkbox to compare backends");
            document.getElementById("info-model").textContent =
                "kws_conv_tiny (6,156 params / " + (bytes.length / 1024).toFixed(0) + " KB) - LOADED";
        })
        .catch(function (err) {
            kwsLog("ERROR loading model: " + err.message);
        });
}

// ── Spectrogram Visualization ───────────────────────────────────────
function clearSpectrogram() {
    var canvas = document.getElementById("spectrogram");
    var ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1;
    var w = (canvas.width = canvas.clientWidth * dpr);
    var h = (canvas.height = canvas.clientHeight * dpr);
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#1a3050";
    ctx.beginPath();
    ctx.moveTo(0, h * 0.5);
    ctx.lineTo(w, h * 0.5);
    ctx.stroke();
    ctx.fillStyle = "#333";
    ctx.font = (12 * dpr) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Audio waveform — click Start Listening", w / 2, h * 0.5 - 10 * dpr);
}

function drawWaveform(audioData, audioLevel) {
    var canvas = document.getElementById("spectrogram");
    var ctx = canvas.getContext("2d");
    var dpr = window.devicePixelRatio || 1;
    var w = (canvas.width = canvas.clientWidth * dpr);
    var h = (canvas.height = canvas.clientHeight * dpr);

    // Background
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, w, h);

    // Center line
    var midY = h * 0.5;
    ctx.strokeStyle = "#1a3050";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(w, midY);
    ctx.stroke();

    // Waveform
    var len = audioData.length;
    var step = len / w;
    ctx.strokeStyle = "#00d4ff";
    ctx.lineWidth = 1.5 * dpr;
    ctx.beginPath();
    for (var x = 0; x < w; x++) {
        var idx = Math.floor(x * step);
        var val = audioData[idx] || 0;
        var y = midY - val * midY * 0.9; // scale to 90% of half-height
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Level indicator (top-right)
    var levelPct = (audioLevel * 100).toFixed(1);
    ctx.fillStyle = audioLevel > 0.05 ? "#00d4ff" : audioLevel > 0.01 ? "#4a8" : "#555";
    ctx.font = "bold " + (11 * dpr) + "px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(levelPct + "%", w - 6 * dpr, 14 * dpr);

    // Time markers
    ctx.fillStyle = "#444";
    ctx.font = (9 * dpr) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("0s", 4 * dpr, h - 4 * dpr);
    ctx.fillText("0.5s", w * 0.5, h - 4 * dpr);
    ctx.fillText("1s", w - 8 * dpr, h - 4 * dpr);
}

// ── Audio Processing Loop ───────────────────────────────────────────
function processAudio() {
    if (!isListening) return;

    // Compute audio level (RMS)
    var sumSq = 0;
    for (var i = 0; i < audioBuffer.length; i++) sumSq += audioBuffer[i] * audioBuffer[i];
    var audioLevel = Math.sqrt(sumSq / audioBuffer.length);

    var mfcc = computeMFCC(audioBuffer);
    drawWaveform(audioBuffer, audioLevel);

    var result = runInference(mfcc);
    var probs = softmax(result.logits);
    inferenceCount++;
    totalInferenceMs += result.inferenceMs;

    var bestIdx = 0;
    for (var i2 = 1; i2 < probs.length; i2++) {
        if (probs[i2] > probs[bestIdx]) bestIdx = i2;
    }
    highlightKeyword(LABELS[bestIdx], probs[bestIdx]);

    document.getElementById("info-inference").innerHTML =
        "Avg: " + (totalInferenceMs / inferenceCount).toFixed(1) + " ms<br/>" +
        "Runs: " + inferenceCount + "<br/>" +
        (onnxModelLoaded ? "ONNX pipeline active" : "Placeholder");

    if (LABELS[bestIdx] !== "silence" && LABELS[bestIdx] !== "unknown" && probs[bestIdx] > 0.3) {
        kwsLog("Detected: " + LABELS[bestIdx] + " (" + (probs[bestIdx] * 100).toFixed(1) + "%)");
    }

    if (isListening) setTimeout(processAudio, 250);
}

// ── Start / Stop ────────────────────────────────────────────────────
async function startListening() {
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: SAMPLE_RATE,
        });
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: { sampleRate: SAMPLE_RATE, channelCount: 1, echoCancellation: true },
        });
        var source = audioCtx.createMediaStreamSource(mediaStream);
        processorNode = audioCtx.createScriptProcessor(4096, 1, 1);
        processorNode.onaudioprocess = function (e) {
            var input = e.inputBuffer.getChannelData(0);
            for (var i = 0; i < input.length; i++) {
                audioBuffer[bufferPos % SAMPLE_RATE] = input[i];
                bufferPos++;
            }
        };
        source.connect(processorNode);
        processorNode.connect(audioCtx.destination);

        isListening = true;
        document.getElementById("btn-start").disabled = true;
        document.getElementById("btn-stop").disabled = false;
        document.getElementById("status-box").classList.add("listening");
        document.getElementById("status").textContent = "Listening...";
        document.getElementById("confidence-text").textContent = "Listening...";

        kwsLog("Microphone started (16kHz mono)");
        kwsLog("Pipeline: MFCC(40x101) > " + (onnxModelLoaded ? "ONNX graph.run()" : "placeholder") + " > 12 classes");
        setTimeout(processAudio, 500);
    } catch (err) {
        kwsLog("ERROR: " + err.message);
        document.getElementById("status").textContent = "Microphone access denied";
    }
}

function stopListening() {
    isListening = false;
    if (processorNode) { processorNode.disconnect(); processorNode = null; }
    if (mediaStream) { mediaStream.getTracks().forEach(function (t) { t.stop(); }); mediaStream = null; }
    if (audioCtx) { audioCtx.close(); audioCtx = null; }

    document.getElementById("btn-start").disabled = false;
    document.getElementById("btn-stop").disabled = true;
    document.getElementById("status-box").classList.remove("listening");
    document.getElementById("detected-word").textContent = "--";
    document.getElementById("status").textContent = "";
    document.getElementById("confidence-text").textContent = "Stopped";

    // Reset spectrogram
    clearSpectrogram();

    // Reset keyword highlights
    document.querySelectorAll(".kws-keyword").forEach(function (el) {
        el.classList.remove("active");
    });

    kwsLog("Stopped. " + inferenceCount + " inferences, avg " +
        (totalInferenceMs / Math.max(inferenceCount, 1)).toFixed(1) + "ms");
}

// ── Backend switch ──────────────────────────────────────────────────
function switchBackend(useNative) {
    useSpikyPanda = useNative;
    if (onnxModelLoaded) {
        onnxGraph = useSpikyPanda ? onnxGraphSpikyPanda : onnxGraphGeneric;
        var label = useSpikyPanda ? "spikypanda" : "generic";
        document.getElementById("backend-label").textContent = label;
        kwsLog("Switched to " + label + " backend");
    }
}

// ── Init ────────────────────────────────────────────────────────────
buildGrid();
clearSpectrogram();
kwsLog("SpikyPanda KWS Demo loaded");
kwsLog("Classes: " + LABELS.join(", "));
document.getElementById("info-model").textContent = "kws_conv_tiny (6,156 params / 25 KB) - loading...";
loadOnnxModel();
