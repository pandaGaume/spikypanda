// =========================================================================
// SpikyPanda KWS Demo — Real ONNX inference in the browser
// =========================================================================

var LABELS = ["yes","no","up","down","left","right","on","off","stop","go","unknown","silence"];
var SAMPLE_RATE = 16000;
var N_MFCC = 40;
var N_FRAMES = 101;
var HOP_LENGTH = 160;
var N_FFT = 512;
var MODEL_URL = "models/kws_conv_tiny.onnx";

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
var onnxInputNames = null;
var onnxModelLoaded = false;
var onnxModelBytes = null; // raw bytes kept for lazy rebuild
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

// ── MFCC via SpikyPanda DSP node ────────────────────────────────────
var mfccNode = null; // lazy-initialized SpMFCC node from runtime

function getOrCreateMfccNode() {
    if (mfccNode) return mfccNode;
    var RT = window.SpikypandaRuntime;
    if (!RT) return null;

    // Create a SpMFCC op node via the registry
    var registry = RT.createDefaultRegistry();
    var nodeInfo = {
        opType: "SpMFCC",
        inputs: ["audio"],
        outputs: ["mfcc"],
        attributes: new Map([
            ["sample_rate", SAMPLE_RATE],
            ["n_mfcc", N_MFCC],
            ["n_fft", N_FFT],
            ["hop_length", HOP_LENGTH],
            ["n_mels", 40],
            ["window_type", 0],
        ]),
    };
    mfccNode = registry.create(nodeInfo, new Map());
    kwsLog("SpMFCC node created (FFT Cooley-Tukey + Mel + DCT)");
    return mfccNode;
}

function computeMFCC(audioData) {
    var node = getOrCreateMfccNode();
    if (node) {
        // Use SpikyPanda DSP pipeline: Window → FFT → Mel → Log → DCT
        var inputTensor = { data: audioData, shape: [audioData.length], name: "audio" };
        var outputs = node.execute([inputTensor]);
        return outputs[0].data; // [n_mfcc, n_frames]
    }
    // Fallback: zeros (should not happen if runtime is loaded)
    return new Float32Array(N_MFCC * N_FRAMES);
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
function runInference(mfccData, nFrames) {
    var t0 = performance.now();
    var logits;
    nFrames = nFrames || N_FRAMES;

    if (onnxModelLoaded && onnxGraph) {
        // Real SpikyPanda ONNX inference
        var inputTensor = {
            data: mfccData,
            shape: [1, N_MFCC, nFrames],
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

            onnxModelBytes = bytes;
            buildGraph(useSpikyPanda);
            onnxModelLoaded = true;

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

    var mfccData = computeMFCC(audioBuffer);
    var nFrames = mfccData.length / N_MFCC;
    drawWaveform(audioBuffer, audioLevel);

    var result = runInference(mfccData, nFrames);
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

// ── Graph build (lazy) ──────────────────────────────────────────────
function buildGraph(native) {
    var RT = window.SpikypandaRuntime;
    if (!RT || !onnxModelBytes) return;

    var parsed = RT.OnnxParser.parse(onnxModelBytes);
    if (!parsed) return;

    var registry = (native && RT.createSpikyPandaRegistry)
        ? RT.createSpikyPandaRegistry()
        : RT.createDefaultRegistry();
    var builder = new RT.OnnxGraphBuilder(registry);
    var result = builder.build(parsed);

    onnxGraph = result.graph;
    onnxInputNames = result.inputNames;

    var label = native ? "spikypanda" : "generic";
    kwsLog("Graph built (" + label + "): " + onnxGraph.nodes.length + " nodes, " + onnxGraph.links.length + " links");
    document.getElementById("backend-label").textContent = label;
}

// ── Backend switch ──────────────────────────────────────────────────
function switchBackend(useNative) {
    useSpikyPanda = useNative;
    if (onnxModelLoaded) {
        buildGraph(useSpikyPanda);
    }
}

// ── Init ────────────────────────────────────────────────────────────
buildGrid();
clearSpectrogram();
kwsLog("SpikyPanda KWS Demo loaded");
kwsLog("Classes: " + LABELS.join(", "));
document.getElementById("info-model").textContent = "kws_conv_tiny (6,156 params / 25 KB) - loading...";
loadOnnxModel();
