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
var onnxInputNames = null;
var onnxModelLoaded = false;

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

function computeMFCC(audioData) {
    var nBins = N_FFT / 2 + 1;
    var mfcc = new Float32Array(N_MFCC * N_FRAMES);
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
        }
        for (var c = 0; c < N_MFCC; c++) {
            var sum2 = 0;
            for (var m2 = 0; m2 < 40; m2++) sum2 += dctMat[c][m2] * melSpec[m2];
            mfcc[c * N_FRAMES + t] = sum2;
        }
    }
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

            var registry = RT.createDefaultRegistry();
            var builder = new RT.OnnxGraphBuilder(registry);
            var result = builder.build(parsed);

            onnxGraph = result.graph;
            onnxInputNames = result.inputNames;
            onnxModelLoaded = true;

            kwsLog("Graph built: " + onnxGraph.nodes.length + " compute nodes, " + onnxGraph.links.length + " links");
            kwsLog("Input: " + onnxInputNames.join(", "));
            kwsLog("ONNX pipeline ready - real inference active");
            document.getElementById("info-model").textContent =
                "kws_conv_tiny (6,156 params / " + (bytes.length / 1024).toFixed(0) + " KB) - LOADED";
        })
        .catch(function (err) {
            kwsLog("ERROR loading model: " + err.message);
        });
}

// ── Spectrogram Visualization ───────────────────────────────────────
function clearSpectrogram() {
    var spectCanvas = document.getElementById("spectrogram");
    var ctx = spectCanvas.getContext("2d");
    var w = (spectCanvas.width = spectCanvas.clientWidth * window.devicePixelRatio);
    var h = (spectCanvas.height = spectCanvas.clientHeight * window.devicePixelRatio);
    ctx.fillStyle = "#0a0a1a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#333";
    ctx.font = (12 * window.devicePixelRatio) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Spectrogram — click Start Listening", w / 2, h / 2);
}

function drawSpectrogram(mfccData, audioLevel) {
    var spectCanvas = document.getElementById("spectrogram");
    var spectCtx = spectCanvas.getContext("2d");
    var w = (spectCanvas.width = spectCanvas.clientWidth * window.devicePixelRatio);
    var h = (spectCanvas.height = spectCanvas.clientHeight * window.devicePixelRatio);
    spectCtx.fillStyle = "#0a0a1a";
    spectCtx.fillRect(0, 0, w, h);

    // Draw MFCC heatmap
    var cellW = w / N_FRAMES;
    var cellH = (h - 16 * window.devicePixelRatio) / N_MFCC; // leave room for level bar
    var min = Infinity, max = -Infinity;
    for (var i = 0; i < mfccData.length; i++) {
        if (mfccData[i] < min) min = mfccData[i];
        if (mfccData[i] > max) max = mfccData[i];
    }
    var range = max - min || 1;
    for (var c = 0; c < N_MFCC; c++) {
        for (var t = 0; t < N_FRAMES; t++) {
            var v = (mfccData[c * N_FRAMES + t] - min) / range;
            // Viridis-like colormap: dark purple -> blue -> teal -> yellow
            var r = Math.floor(Math.min(255, v * v * 300 + 20));
            var g = Math.floor(Math.min(255, v * 220 + 10));
            var b = Math.floor(Math.min(255, (1 - v * 0.5) * 200 + 40));
            spectCtx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
            spectCtx.fillRect(t * cellW, c * cellH, cellW + 1, cellH + 1);
        }
    }

    // Draw audio level bar at bottom
    var barY = h - 12 * window.devicePixelRatio;
    var barH = 8 * window.devicePixelRatio;
    var levelW = Math.min(w, w * audioLevel * 10); // amplify for visibility
    spectCtx.fillStyle = "#333";
    spectCtx.fillRect(0, barY, w, barH);
    var levelColor = audioLevel > 0.05 ? "#00d4ff" : audioLevel > 0.01 ? "#4a8" : "#555";
    spectCtx.fillStyle = levelColor;
    spectCtx.fillRect(0, barY, levelW, barH);

    // Level label
    spectCtx.fillStyle = "#888";
    spectCtx.font = (9 * window.devicePixelRatio) + "px sans-serif";
    spectCtx.textAlign = "right";
    spectCtx.fillText("level: " + (audioLevel * 100).toFixed(1) + "%", w - 4, barY - 2);
}

// ── Audio Processing Loop ───────────────────────────────────────────
function processAudio() {
    if (!isListening) return;

    // Compute audio level (RMS)
    var sumSq = 0;
    for (var i = 0; i < audioBuffer.length; i++) sumSq += audioBuffer[i] * audioBuffer[i];
    var audioLevel = Math.sqrt(sumSq / audioBuffer.length);

    var mfcc = computeMFCC(audioBuffer);
    drawSpectrogram(mfcc, audioLevel);

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

// ── Init ────────────────────────────────────────────────────────────
buildGrid();
clearSpectrogram();
kwsLog("SpikyPanda KWS Demo loaded");
kwsLog("Classes: " + LABELS.join(", "));
document.getElementById("info-model").textContent = "kws_conv_tiny (6,156 params / 25 KB) - loading...";
loadOnnxModel();
