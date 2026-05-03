// SpikyPanda - Motor Current (Broken Rotor Bar) RNN Demo
//
// Companion to the Motor Vibration sample. Same training/test/visualization
// pipeline, but the three input channels are stator phase currents (Ia, Ib,
// Ic) instead of accelerometer axes (X, Y, Z), and the classes are the five
// rotor states from the UFU Broken Rotor Bar dataset
// (Healthy + 1..4 broken bars).
//
// Data source:
//   packages/host/www/data/motor_current/train.json
//   packages/host/www/data/motor_current/test.json
// Generate both with:
//   python packages/dev/tools/python/prepare_motor_current.py \
//       --source-dir packages/host/www/data/motor_current
// (see packages/dev/tools/python/README.md for the dataset list)
(function () {
    const S = SpikypandaCore;

    const logEl = document.getElementById("log");
    const statusEl = document.getElementById("status");
    const progressFill = document.getElementById("progressFill");
    const btnLoad = document.getElementById("btnLoad");
    const btnTrain = document.getElementById("btnTrain");
    const btnTest = document.getElementById("btnTest");
    const resultsPanel = document.getElementById("resultsPanel");
    const lossCanvas = document.getElementById("lossCanvas");
    const signalCanvas = document.getElementById("signalCanvas");
    const confusionDiv = document.getElementById("confusionMatrix");

    let trainData = null;
    let testData = null;
    let rnnGraph = null;
    let runtime = null;
    let trainer = null;
    const lossHistory = [];

    // Default class list matches the synthetic fallback below. When real data
    // (UFU .mat) is loaded via prepare_motor_current.py, the JSON exposes a
    // `classes` array which overrides these names (typically 5 rotor states).
    let CLASS_NAMES = ["Normal", "OpenPhase", "ShortCircuit", "Unbalanced"];
    let NUM_CLASSES = CLASS_NAMES.length;

    // Three phase currents: A (red), B (green), C (blue).
    const PHASE_COLORS = ["#ff4444", "#44ff44", "#4488ff"];
    const PHASE_NAMES = ["Ia", "Ib", "Ic"];

    function log(msg) {
        logEl.textContent += msg + "\n";
        logEl.scrollTop = logEl.scrollHeight;
    }
    function setStatus(msg) { statusEl.textContent = msg; }
    function setProgress(pct) { progressFill.style.width = pct + "%"; }

    // ====================== SYNTHETIC DATA GENERATOR ======================
    //
    // Used when real UFU data is unavailable. Generates 4 classes of 3-phase
    // sinusoidal currents at 60 Hz, with fault signatures matching the
    // synthetic fallback in prepare_motor_current.py:
    //   0 Normal        - balanced 3-phase sinusoid
    //   1 OpenPhase     - phase A collapses to 0
    //   2 ShortCircuit  - phase A amplitude elevated + 3rd harmonic
    //   3 Unbalanced    - asymmetric amplitudes across phases

    function gaussianNoise(sigma) {
        const u = 1 - Math.random();
        const v = 1 - Math.random();
        return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

    function generateCurrentSample(faultType, windowSize) {
        const sequence = [];
        const baseFreq = 60;           // Hz (line frequency)
        const dt = 1 / 1000;           // 1 kHz effective sample rate
        const phaseNoise = (Math.random() - 0.5) * 0.2;

        for (let t = 0; t < windowSize; t++) {
            const angle = 2 * Math.PI * baseFreq * t * dt + phaseNoise;
            let ia, ib, ic, n;

            switch (faultType) {
                case 0: // Normal: balanced 3-phase
                    ia = Math.sin(angle);
                    ib = Math.sin(angle - 2 * Math.PI / 3);
                    ic = Math.sin(angle + 2 * Math.PI / 3);
                    n = 0.02;
                    break;
                case 1: // Open phase A
                    ia = 0;
                    ib = 1.15 * Math.sin(angle - 2 * Math.PI / 3);
                    ic = 1.15 * Math.sin(angle + 2 * Math.PI / 3);
                    n = 0.03;
                    break;
                case 2: // Short circuit on A: elevated + harmonic
                    ia = 1.6 * Math.sin(angle) + 0.35 * Math.sin(3 * angle);
                    ib = Math.sin(angle - 2 * Math.PI / 3) + 0.1 * Math.sin(3 * angle);
                    ic = Math.sin(angle + 2 * Math.PI / 3) + 0.1 * Math.sin(3 * angle);
                    n = 0.05;
                    break;
                case 3: // Unbalanced amplitudes + small phase drift
                default:
                    ia = 1.2 * Math.sin(angle);
                    ib = 0.8 * Math.sin(angle - 2 * Math.PI / 3 + 0.15);
                    ic = 1.0 * Math.sin(angle + 2 * Math.PI / 3 - 0.10);
                    n = 0.04;
                    break;
            }

            ia += gaussianNoise(n);
            ib += gaussianNoise(n);
            ic += gaussianNoise(n);

            // Map roughly [-2, 2] A to [0, 1]
            ia = clamp((ia + 2.0) / 4.0, 0, 1);
            ib = clamp((ib + 2.0) / 4.0, 0, 1);
            ic = clamp((ic + 2.0) / 4.0, 0, 1);

            sequence.push([ia, ib, ic]);
        }

        return { sequence: sequence, label: faultType };
    }

    function generateSyntheticData(numSamples, windowSize) {
        const all = [];
        for (let i = 0; i < numSamples; i++) {
            // Cycle through the 4 synthetic classes
            const faultType = i % 4;
            all.push(generateCurrentSample(faultType, windowSize));
        }

        // Fisher-Yates shuffle
        for (let i = all.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = all[i];
            all[i] = all[j];
            all[j] = tmp;
        }

        // 80/20 split
        const splitIdx = Math.floor(numSamples * 0.8);
        return {
            train: all.slice(0, splitIdx),
            test: all.slice(splitIdx)
        };
    }

    // ====================== VISUALIZATION ======================

    function drawLossChart() {
        const canvas = lossCanvas;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        const ctx = canvas.getContext("2d");
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        const W = rect.width, H = rect.height;

        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(0, 0, W, H);

        if (lossHistory.length < 2) return;

        const maxLoss = Math.max(...lossHistory);
        const minLoss = Math.min(...lossHistory);
        const range = maxLoss - minLoss || 1;

        ctx.strokeStyle = "#1a2a3a";
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 5; i++) {
            const y = 10 + i * (H - 20) / 4;
            ctx.beginPath();
            ctx.moveTo(10, y);
            ctx.lineTo(W - 10, y);
            ctx.stroke();
        }

        ctx.strokeStyle = "#00d4ff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < lossHistory.length; i++) {
            const x = (i / (lossHistory.length - 1)) * (W - 20) + 10;
            const y = H - 10 - ((lossHistory[i] - minLoss) / range) * (H - 20);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        ctx.fillStyle = "#888";
        ctx.font = "10px sans-serif";
        ctx.fillText(maxLoss.toFixed(4), 2, 12);
        ctx.fillText(minLoss.toFixed(4), 2, H - 2);
        ctx.fillText("Epoch 1", 10, H - 2);
        ctx.fillText("Epoch " + lossHistory.length, W - 50, H - 2);
    }

    function drawSignal(sample) {
        const canvas = signalCanvas;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        const ctx = canvas.getContext("2d");
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        const W = rect.width, H = rect.height;

        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(0, 0, W, H);

        const seq = sample.sequence;
        const T = seq.length;
        const padL = 40, padR = 10, padT = 10, padB = 25;
        const plotW = W - padL - padR;
        const plotH = H - padT - padB;

        ctx.strokeStyle = "#1a2a3a";
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = padT + i * plotH / 4;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(W - padR, y);
            ctx.stroke();
        }

        ctx.fillStyle = "#888";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "right";
        for (let i = 0; i <= 4; i++) {
            const val = (1 - i / 4).toFixed(2);
            const y = padT + i * plotH / 4 + 3;
            ctx.fillText(val, padL - 4, y);
        }

        // Draw each phase
        for (let ch = 0; ch < 3; ch++) {
            ctx.strokeStyle = PHASE_COLORS[ch];
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            for (let t = 0; t < T; t++) {
                const x = padL + (t / (T - 1)) * plotW;
                const y = padT + (1 - seq[t][ch]) * plotH;
                if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Legend
        ctx.textAlign = "left";
        for (let ch = 0; ch < 3; ch++) {
            const lx = padL + ch * 60;
            ctx.fillStyle = PHASE_COLORS[ch];
            ctx.fillRect(lx, H - 15, 12, 3);
            ctx.fillStyle = "#aaa";
            ctx.font = "10px sans-serif";
            ctx.fillText(PHASE_NAMES[ch], lx + 16, H - 10);
        }

        // Title
        ctx.fillStyle = "#888";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(
            "Rotor state: " + CLASS_NAMES[sample.label] + " (" + T + " timesteps)",
            W / 2, H - 2
        );
    }

    function drawConfusionMatrix(matrix) {
        confusionDiv.innerHTML = "";

        const table = document.createElement("table");
        table.className = "confusion-table";

        let maxVal = 1;
        for (let r = 0; r < NUM_CLASSES; r++) {
            for (let c = 0; c < NUM_CLASSES; c++) {
                if (matrix[r][c] > maxVal) maxVal = matrix[r][c];
            }
        }

        const headerRow = document.createElement("tr");
        const emptyTh = document.createElement("th");
        emptyTh.textContent = "Actual \\ Pred";
        headerRow.appendChild(emptyTh);
        for (let c = 0; c < NUM_CLASSES; c++) {
            const th = document.createElement("th");
            th.textContent = CLASS_NAMES[c];
            headerRow.appendChild(th);
        }
        table.appendChild(headerRow);

        for (let r = 0; r < NUM_CLASSES; r++) {
            const tr = document.createElement("tr");
            const labelTd = document.createElement("td");
            labelTd.textContent = CLASS_NAMES[r];
            labelTd.className = "row-label";
            tr.appendChild(labelTd);
            for (let c = 0; c < NUM_CLASSES; c++) {
                const td = document.createElement("td");
                td.textContent = matrix[r][c];
                const intensity = matrix[r][c] / maxVal;
                if (r === c) {
                    td.style.background = "rgba(0, 255, 100, " + (0.1 + intensity * 0.5) + ")";
                    td.style.color = "#fff";
                } else if (matrix[r][c] > 0) {
                    td.style.background = "rgba(255, 50, 50, " + (0.1 + intensity * 0.5) + ")";
                    td.style.color = "#fff";
                } else {
                    td.style.background = "rgba(255, 255, 255, 0.03)";
                    td.style.color = "#666";
                }
                tr.appendChild(td);
            }
            table.appendChild(tr);
        }

        confusionDiv.appendChild(table);
    }

    // ====================== DATA LOADING ======================

    btnLoad.addEventListener("click", async function () {
        btnLoad.disabled = true;
        setStatus("Loading data...");
        log("Loading 3-phase current data...");

        const numSamples = parseInt(document.getElementById("numSamples").value);
        const windowSize = parseInt(document.getElementById("windowSize").value);

        let dataLoaded = false;

        // Prefer real data generated by prepare_motor_current.py
        try {
            const trainResp = await fetch("../../data/motor_current/train.json");
            if (trainResp.ok) {
                const trainJson = await trainResp.json();
                const testResp = await fetch("../../data/motor_current/test.json");
                const testJson = await testResp.json();

                trainData = trainJson.samples.map(function (s) {
                    return { sequence: s.sequence, label: s.label };
                });
                testData = testJson.samples.map(function (s) {
                    return { sequence: s.sequence, label: s.label };
                });

                if (trainJson.classes) {
                    CLASS_NAMES = trainJson.classes;
                    NUM_CLASSES = CLASS_NAMES.length;
                }
                log("Loaded real data: " + trainData.length + " train, " + testData.length + " test samples");
                log("Classes: " + CLASS_NAMES.join(", "));
                dataLoaded = true;
            }
        } catch (e) {
            // Fall through to synthetic
        }

        if (!dataLoaded) {
            log("Real data not available. Generating synthetic 3-phase current data...");
            const data = generateSyntheticData(numSamples, windowSize);
            trainData = data.train;
            testData = data.test;
            // Synthetic fallback always uses the 4-class electrical fault set
            CLASS_NAMES = ["Normal", "OpenPhase", "ShortCircuit", "Unbalanced"];
            NUM_CLASSES = CLASS_NAMES.length;
            log("Generated synthetic data: " + trainData.length + " train, " + testData.length + " test samples");
            log("Window size: " + windowSize + " timesteps x 3 channels (Ia, Ib, Ic)");
            log("Classes: " + CLASS_NAMES.join(", "));
        }

        if (trainData.length > 0) {
            drawSignal(trainData[0]);
        }

        setStatus("Data ready. Click Train.");
        setProgress(0);
        btnLoad.disabled = false;
        btnTrain.disabled = false;
    });

    // ====================== TRAINING ======================

    btnTrain.addEventListener("click", async function () {
        if (!trainData) return;
        btnTrain.disabled = true;
        btnTest.disabled = true;
        btnLoad.disabled = true;
        lossHistory.length = 0;

        const cellType = document.getElementById("cellType").value;
        const hiddenSize = parseInt(document.getElementById("hiddenSize").value);
        const epochs = parseInt(document.getElementById("epochs").value);
        const lr = parseFloat(document.getElementById("lr").value);

        log("Building RNN (" + cellType.toUpperCase() + ", hidden=" + hiddenSize + ", out=" + NUM_CLASSES + ")...");
        setStatus("Building model...");

        try {
            rnnGraph = new S.RnnBuilder()
                .withInputSize(3)
                .withHiddenSize(hiddenSize)
                .withOutputSize(NUM_CLASSES)
                .withCellType(cellType === "lstm" ? S.RnnCellType.LSTM : S.RnnCellType.GRU)
                .withOutputActivation(S.ActivationFunctions.sigmoid)
                .build();
        } catch (e) {
            log("ERROR building model: " + e.message);
            setStatus("Build failed.");
            btnTrain.disabled = false;
            btnLoad.disabled = false;
            return;
        }

        log("RNN graph: " + rnnGraph.nodes.length + " neurons, " + rnnGraph.links.length + " synapses");

        runtime = new S.RnnInferenceRuntime(rnnGraph);
        trainer = new S.RnnTrainingRuntime(
            rnnGraph,
            runtime,
            S.LossFunctions.MSE,
            lr,
            S.Optimizers.Adam()
        );

        setStatus("Training...");
        const totalSteps = epochs * trainData.length;
        let step = 0;

        for (let epoch = 0; epoch < epochs; epoch++) {
            let epochLoss = 0;

            for (let i = 0; i < trainData.length; i++) {
                const sample = trainData[i];
                runtime.resetState();

                // Many-to-one classification: enforce the same one-hot
                // target at every timestep. The "neutral for the first
                // 75 %, one-hot for the last 25 %" trick borrowed from
                // the vibration sample creates an optimum-trap at uniform
                // 1/N outputs (matching the neutral target gives MSE = 0
                // on most timesteps), which prevents the optimizer from
                // ever producing confident class predictions. With 5
                // broken-bar classes and 256-step windows that trap was
                // severe enough to keep accuracy at chance (~20 %).
                // Forcing the one-hot label everywhere gives the
                // optimizer a clear gradient direction; the LSTM hidden
                // state still smoothly evolves toward the correct
                // prediction over time, the early-timestep loss is just
                // higher because there is less context.
                const oneHotLabel = new Array(NUM_CLASSES).fill(0);
                oneHotLabel[sample.label] = 1;
                const targets = [];
                for (let t = 0; t < sample.sequence.length; t++) {
                    targets.push(oneHotLabel.slice());
                }

                const loss = trainer.trainStep(sample.sequence, targets);
                epochLoss += loss;
                step++;

                if (i % 10 === 0) {
                    setProgress((step / totalSteps) * 100);
                    setStatus("Epoch " + (epoch + 1) + "/" + epochs + " - Sample " + (i + 1) + "/" + trainData.length);
                    await new Promise(function (r) { setTimeout(r, 0); });
                }
            }

            const avgLoss = epochLoss / trainData.length;
            lossHistory.push(avgLoss);
            drawLossChart();
            log("Epoch " + (epoch + 1) + "/" + epochs + " - Avg Loss: " + avgLoss.toFixed(6));

            await new Promise(function (r) { setTimeout(r, 0); });
        }

        setProgress(100);
        setStatus("Training complete. Click Test to evaluate.");
        log("Training finished.");
        btnTrain.disabled = false;
        btnTest.disabled = false;
        btnLoad.disabled = false;
        if (btnExport) btnExport.disabled = false;
    });

    // ====================== TESTING ======================

    btnTest.addEventListener("click", async function () {
        if (!runtime || !testData) return;
        btnTest.disabled = true;
        btnTrain.disabled = true;

        setStatus("Running inference on test set...");
        log("Testing on " + testData.length + " samples...");

        let correct = 0;
        const confMatrix = [];
        for (let i = 0; i < NUM_CLASSES; i++) {
            confMatrix.push(new Array(NUM_CLASSES).fill(0));
        }

        const t0 = performance.now();

        for (let i = 0; i < testData.length; i++) {
            const sample = testData[i];
            runtime.resetState();

            const outputs = runtime.run(sample.sequence);
            const lastOutput = outputs[outputs.length - 1];

            let predicted = 0;
            for (let c = 1; c < lastOutput.length; c++) {
                if (lastOutput[c] > lastOutput[predicted]) predicted = c;
            }

            if (predicted === sample.label) correct++;
            confMatrix[sample.label][predicted]++;

            if (i % 10 === 0) {
                setStatus("Testing " + (i + 1) + "/" + testData.length + "...");
                await new Promise(function (r) { setTimeout(r, 0); });
            }
        }

        const elapsed = performance.now() - t0;
        const accuracy = correct / testData.length;

        log("Accuracy: " + (accuracy * 100).toFixed(1) + "% (" + correct + "/" + testData.length + ")");
        log("Inference time: " + elapsed.toFixed(0) + "ms (" + (elapsed / testData.length).toFixed(1) + "ms/sample)");

        resultsPanel.style.display = "block";
        document.getElementById("accuracy").textContent = (accuracy * 100).toFixed(1) + "%";
        document.getElementById("finalLoss").textContent = lossHistory.length > 0 ? lossHistory[lossHistory.length - 1].toFixed(4) : "-";
        document.getElementById("inferenceTime").textContent = elapsed.toFixed(0) + "ms";
        document.getElementById("testCount").textContent = testData.length;

        await new Promise(function (r) { setTimeout(r, 50); });

        drawConfusionMatrix(confMatrix);

        if (testData.length > 0) {
            drawSignal(testData[0]);
        }

        // Log confusion matrix as text
        log("");
        log("Confusion Matrix (rows=actual, cols=predicted):");
        let header = "".padEnd(14, " ");
        for (let c = 0; c < NUM_CLASSES; c++) {
            header += CLASS_NAMES[c].padStart(10, " ");
        }
        log(header);
        for (let r = 0; r < NUM_CLASSES; r++) {
            let row = CLASS_NAMES[r].padEnd(14, " ");
            for (let c = 0; c < NUM_CLASSES; c++) {
                row += String(confMatrix[r][c]).padStart(10, " ");
            }
            log(row);
        }

        setStatus("Done - Accuracy: " + (accuracy * 100).toFixed(1) + "% - " + elapsed.toFixed(0) + "ms");
        btnTrain.disabled = false;
        btnTest.disabled = false;
    });

    // ====================== ONNX EXPORT ======================
    //
    // Exports the trained LSTM as an ONNX model with a custom
    // EnvelopeRMS preprocessing op. The ONNX graph is:
    //
    //   Input: envelope [seq_len, 1, 3]
    //     -> LSTM (hidden_size=H)
    //     -> Gemm (H -> NUM_CLASSES)
    //     -> Sigmoid
    //   Output: probabilities [1, NUM_CLASSES]
    //
    // A custom op node "com.dotvision.EnvelopeRMS" is prepended to
    // document the preprocessing parameters. On CyanMycelium/ESP32
    // this op is implemented in C firmware; on desktop onnxruntime it
    // can be registered as a Python custom op for validation.
    //
    // ----------------------------------------------------------------
    // CYAN MYCELIUM INTEROP NOTES (2026-04-26, motor_current_lstm.onnx)
    // ----------------------------------------------------------------
    //
    // The "standard" mode export was loaded into CyanMycelium's
    // OnnxGraphBuilder for a parse + topology probe. Three findings to
    // keep in mind next time we touch this export, listed in order of
    // ownership:
    //
    // 1) [SPIKYPANDA EXPORT] All initializers are also re-listed in
    //    graph.input below (see the "Initializers declared as inputs
    //    (ONNX convention for static weights)" block). That convention
    //    was the legacy ONNX form (IR <= 3); since IR 4 the recommended
    //    layout is initializer-only, no duplicate input entry. Some
    //    runtimes (CyanMycelium today) do not deduplicate, so every
    //    weight tensor surfaces in the runtime's "external inputs" list
    //    and pollutes the SetInput() API of the consumer. Fix on this
    //    side: when emitting the model.inputs list further down, only
    //    include the truly external tensors (envelope_raw in standard /
    //    custom modes, envelope_seq in none mode). The runtime fix
    //    (initializer-vs-input dedup) is tracked separately on the
    //    CyanMycelium side.
    //
    // 2) [SPIKYPANDA EXPORT] In "standard" mode, the preprocessing
    //    subgraph (ReduceMean -> Sub -> Mul -> Add -> Clip[0,1])
    //    duplicates what _normalize_window_centered already does in
    //    prepare_motor_current.py. The browser sample feeds the LSTM
    //    directly with the JSON `sequence` (already centered + clipped),
    //    so the input contract for the exported ONNX is "raw envelope,
    //    UNNORMALIZED" -- the host that consumes the .onnx is expected
    //    to provide unnormalized 3-channel envelope samples and let the
    //    graph normalize them. That is intentional for embedded targets
    //    where the firmware computes the envelope but cannot easily
    //    reproduce the per-window centering; it is NOT the contract a
    //    casual ORT user would assume. The input name `envelope_raw`
    //    encodes that intent -- do not rename it to `sequence` or
    //    `input` without revisiting which side does the normalization.
    //
    // 3) [CYAN MYCELIUM] The Clip op was missing runtime-input support
    //    (opset >= 11 form, where min/max are tensor inputs instead of
    //    attributes). This export uses that form ("clip_01" with inputs
    //    [env_shifted, const_zero, const_one], no attributes), so the
    //    CyanMycelium ClipNode now resolves min/max lazily from
    //    Opsc[1]/Opsc[2] on the first Activate. Fixed in
    //    include/nodes/unary/cm_clip.hpp. No action needed on this side.
    //
    // ----------------------------------------------------------------

    var btnExport = document.getElementById("btnExport");
    if (btnExport) {
        btnExport.addEventListener("click", function () {
            if (!rnnGraph) {
                log("ERROR: Train a model first before exporting.");
                return;
            }
            if (typeof SpikypandaRuntime === "undefined") {
                log("ERROR: spikypanda-runtime.js not loaded (OnnxWriter unavailable).");
                return;
            }

            var exportMode = document.getElementById("exportMode").value;
            log("Exporting ONNX model (mode: " + exportMode + ")...");

            try {
                var onnxBytes = exportToOnnx(rnnGraph, NUM_CLASSES, exportMode);
                log("ONNX model size: " + onnxBytes.length + " bytes");

                // Trigger browser download
                var blob = new Blob([onnxBytes], { type: "application/octet-stream" });
                var url = URL.createObjectURL(blob);
                var a = document.createElement("a");
                a.href = url;
                a.download = "motor_current_lstm.onnx";
                a.click();
                URL.revokeObjectURL(url);

                log("Downloaded: motor_current_lstm.onnx");
                setStatus("ONNX model exported.");
            } catch (e) {
                log("ERROR exporting ONNX: " + e.message);
            }
        });
    }

    function exportToOnnx(graph, numClasses, mode) {
        var R = SpikypandaRuntime;
        var FLOAT = 1; // OnnxDataType.FLOAT

        // Extract graph dimensions
        var inputNeurons = graph.inputs;
        var hiddenNeurons = graph.hiddens;
        var outputNeurons = graph.outputs;
        var inputSize = inputNeurons.length;   // 3
        var hiddenSize = hiddenNeurons.length;  // 32
        var outputSize = outputNeurons.length;  // 5

        log("  Architecture: input=" + inputSize + ", hidden=" + hiddenSize + ", output=" + outputSize);

        // ---- Extract LSTM weights ----
        // SpikyPanda gate order: [0:forget, 1:input, 2:candidate, 3:output]
        // ONNX LSTM gate order:  [0:input, 1:output, 2:forget, 3:candidate]
        // Remap: SP[0]->ONNX[2], SP[1]->ONNX[0], SP[2]->ONNX[3], SP[3]->ONNX[1]
        var GATE_MAP = [2, 0, 3, 1]; // SP gate g -> ONNX gate GATE_MAP[g]

        // W: input-to-hidden weights [1, 4*H, inputSize]
        // Each RnnSynapse connects one input neuron to one hidden neuron
        // with weights[0..3] for the 4 gates.
        var W = new Float32Array(4 * hiddenSize * inputSize);
        for (var i = 0; i < inputSize; i++) {
            var inp = inputNeurons[i];
            // Get outgoing RnnSynapses from this input neuron
            var synapses = [];
            if (inp.onsc) {
                for (var si = 0; si < inp.onsc.length; si++) {
                    var syn = inp.onsc[si];
                    if (syn.weights && syn.weights.length === 4) {
                        synapses.push(syn);
                    }
                }
            }
            // synapses[j] connects input[i] to hidden[j]
            for (var j = 0; j < hiddenSize && j < synapses.length; j++) {
                for (var g = 0; g < 4; g++) {
                    var onnxGate = GATE_MAP[g];
                    // W layout: [onnxGate * H + j, i] row-major -> flat index
                    W[onnxGate * hiddenSize * inputSize + j * inputSize + i] = synapses[j].weights[g];
                }
            }
        }

        // R: hidden-to-hidden recurrent weights [1, 4*H, H]
        var Rec = new Float32Array(4 * hiddenSize * hiddenSize);
        for (var i = 0; i < hiddenSize; i++) {
            var hid = hiddenNeurons[i];
            // Recurrent synapses: from hidden[i] to hidden[j]
            var recSynapses = [];
            if (hid.onsc) {
                for (var si = 0; si < hid.onsc.length; si++) {
                    var syn = hid.onsc[si];
                    if (syn.weights && syn.weights.length === 4) {
                        recSynapses.push(syn);
                    }
                }
            }
            for (var j = 0; j < hiddenSize && j < recSynapses.length; j++) {
                for (var g = 0; g < 4; g++) {
                    var onnxGate = GATE_MAP[g];
                    Rec[onnxGate * hiddenSize * hiddenSize + j * hiddenSize + i] = recSynapses[j].weights[g];
                }
            }
        }

        // B: biases [1, 8*H] (first 4*H = W biases, next 4*H = R biases = 0)
        var B = new Float32Array(8 * hiddenSize);
        for (var j = 0; j < hiddenSize; j++) {
            var neuron = hiddenNeurons[j];
            // SP biases: biasForget, biasInput, biasCandidate, biasOutput
            // ONNX order: input, output, forget, candidate
            B[0 * hiddenSize + j] = neuron.biasInput;      // ONNX gate 0 = input
            B[1 * hiddenSize + j] = neuron.biasOutput;     // ONNX gate 1 = output
            B[2 * hiddenSize + j] = neuron.biasForget;     // ONNX gate 2 = forget
            B[3 * hiddenSize + j] = neuron.biasCandidate;  // ONNX gate 3 = candidate
            // R biases (indices 4*H .. 8*H) are zero
        }

        // ---- Extract output layer weights ----
        // OutputNeurons are MlpNeurons with .bias and incoming Synapses with .weight
        var Wout = new Float32Array(outputSize * hiddenSize);
        var Bout = new Float32Array(outputSize);
        for (var o = 0; o < outputSize; o++) {
            var outN = outputNeurons[o];
            Bout[o] = outN.bias;
            // Incoming synapses from hidden neurons
            if (outN.opsc) {
                for (var si = 0; si < outN.opsc.length && si < hiddenSize; si++) {
                    var syn = outN.opsc[si];
                    Wout[o * hiddenSize + si] = syn.weight;
                }
            }
        }

        log("  Extracted: W[" + W.length + "], R[" + Rec.length + "], B[" + B.length +
            "], Wout[" + Wout.length + "], Bout[" + Bout.length + "]");

        // ---- Build ONNX model ----
        var model = {
            irVersion: 8,
            graphName: "motor_current_lstm",
            nodes: [],
            initializers: [],
            inputs: [],
            outputs: [],
            valueInfos: [],
        };

        // Preprocessing subgraph depends on export mode:
        //   "custom"   -> single com.dotvision.EnvelopeCenter node
        //   "standard" -> ReduceMean + Sub + Mul + Add + Clip (5 standard ops)
        //   "none"     -> no preprocessing, LSTM takes centered input directly
        var lstmInputName = "envelope_seq"; // default: pre-centered

        if (mode === "custom") {
            model.nodes.push({
                name: "centering",
                opType: "com.dotvision.EnvelopeCenter",
                inputs: ["envelope_raw"],
                outputs: ["envelope_centered"],
                attributes: new Map([["gain", 6.0], ["since_version", 1]]),
            });
            lstmInputName = "envelope_centered_seq";
        } else if (mode === "standard") {
            // ReduceMean(axes=[0], keepdims=1): compute per-channel mean
            model.nodes.push({
                name: "reduce_mean",
                opType: "ReduceMean",
                inputs: ["envelope_raw"],
                outputs: ["env_mean"],
                attributes: new Map([["axes", 0], ["keepdims", 1]]),
            });
            // Sub: centered = raw - mean
            model.nodes.push({
                name: "sub_mean",
                opType: "Sub",
                inputs: ["envelope_raw", "env_mean"],
                outputs: ["env_centered"],
                attributes: new Map(),
            });
            // Mul: scaled = centered * gain
            model.nodes.push({
                name: "mul_gain",
                opType: "Mul",
                inputs: ["env_centered", "const_gain"],
                outputs: ["env_scaled"],
                attributes: new Map(),
            });
            // Add: shifted = scaled + 0.5
            model.nodes.push({
                name: "add_offset",
                opType: "Add",
                inputs: ["env_scaled", "const_half"],
                outputs: ["env_shifted"],
                attributes: new Map(),
            });
            // Clip: clamped = clip(shifted, 0, 1)
            model.nodes.push({
                name: "clip_01",
                opType: "Clip",
                inputs: ["env_shifted", "const_zero", "const_one"],
                outputs: ["envelope_centered"],
                attributes: new Map(),
            });
            // Constants for the standard ops
            model.initializers.push({ name: "const_gain", dataType: FLOAT, dims: [], floatData: new Float32Array([6.0]) });
            model.initializers.push({ name: "const_half", dataType: FLOAT, dims: [], floatData: new Float32Array([0.5]) });
            model.initializers.push({ name: "const_zero", dataType: FLOAT, dims: [], floatData: new Float32Array([0.0]) });
            model.initializers.push({ name: "const_one", dataType: FLOAT, dims: [], floatData: new Float32Array([1.0]) });
            lstmInputName = "envelope_centered_seq";
        }
        // mode === "none": no preprocessing nodes, lstmInputName stays "envelope_seq"

        // If preprocessing is present, add a Reshape to go from [64, 3] to [64, 1, 3]
        if (mode !== "none") {
            model.nodes.push({
                name: "reshape_to_seq",
                opType: "Reshape",
                inputs: ["envelope_centered", "reshape_seq_shape"],
                outputs: [lstmInputName],
                attributes: new Map(),
            });
            model.initializers.push({
                name: "reshape_seq_shape", dataType: 7,
                dims: [3],
                rawData: new Uint8Array(new BigInt64Array([64n, 1n, BigInt(inputSize)]).buffer),
            });
        }

        // LSTM node
        model.nodes.push({
            name: "lstm",
            opType: "LSTM",
            inputs: [lstmInputName, "W", "R", "B"],
            outputs: ["lstm_out", "lstm_h"],
            attributes: new Map([
                ["hidden_size", hiddenSize],
                ["direction", 0],
            ]),
        });

        // Reshape LSTM output from [1,1,H] to [1,H]
        model.nodes.push({
            name: "reshape",
            opType: "Reshape",
            inputs: ["lstm_h", "reshape_shape"],
            outputs: ["lstm_flat"],
            attributes: new Map(),
        });

        // Output layer: Gemm (Y = X * W^T + B)
        model.nodes.push({
            name: "output_gemm",
            opType: "Gemm",
            inputs: ["lstm_flat", "W_out", "B_out"],
            outputs: ["logits"],
            attributes: new Map([
                ["transB", 1],
            ]),
        });

        // Sigmoid
        model.nodes.push({
            name: "sigmoid",
            opType: "Sigmoid",
            inputs: ["logits"],
            outputs: ["probabilities"],
            attributes: new Map(),
        });

        // Initializers (weight tensors)
        model.initializers.push({ name: "W", dataType: FLOAT, dims: [1, 4 * hiddenSize, inputSize], floatData: W });
        model.initializers.push({ name: "R", dataType: FLOAT, dims: [1, 4 * hiddenSize, hiddenSize], floatData: Rec });
        model.initializers.push({ name: "B", dataType: FLOAT, dims: [1, 8 * hiddenSize], floatData: B });
        model.initializers.push({ name: "W_out", dataType: FLOAT, dims: [outputSize, hiddenSize], floatData: Wout });
        model.initializers.push({ name: "B_out", dataType: FLOAT, dims: [outputSize], floatData: Bout });
        model.initializers.push({
            name: "reshape_shape", dataType: 7, // INT64
            dims: [2],
            rawData: new Uint8Array(new BigInt64Array([1n, BigInt(hiddenSize)]).buffer),
        });

        // Graph inputs (depend on mode)
        if (mode !== "none") {
            // Modes "custom" and "standard": input is uncentered envelope [64, 3]
            model.inputs.push({ name: "envelope_raw", type: 0, elemType: FLOAT, shape: [64, inputSize] });
        } else {
            // Mode "none": input is pre-centered, already shaped for LSTM [64, 1, 3]
            model.inputs.push({ name: "envelope_seq", type: 0, elemType: FLOAT, shape: [64, 1, inputSize] });
        }
        // Initializers declared as inputs (ONNX convention for static weights)
        model.inputs.push({ name: "W", type: 0, elemType: FLOAT, shape: [1, 4 * hiddenSize, inputSize] });
        model.inputs.push({ name: "R", type: 0, elemType: FLOAT, shape: [1, 4 * hiddenSize, hiddenSize] });
        model.inputs.push({ name: "B", type: 0, elemType: FLOAT, shape: [1, 8 * hiddenSize] });
        model.inputs.push({ name: "W_out", type: 0, elemType: FLOAT, shape: [outputSize, hiddenSize] });
        model.inputs.push({ name: "B_out", type: 0, elemType: FLOAT, shape: [outputSize] });
        model.inputs.push({ name: "reshape_shape", type: 0, elemType: 7, shape: [2] });
        if (mode !== "none") {
            model.inputs.push({ name: "reshape_seq_shape", type: 0, elemType: 7, shape: [3] });
        }

        // Graph outputs
        model.outputs.push({ name: "probabilities", type: 0, elemType: FLOAT, shape: [1, outputSize] });

        // Intermediate value infos
        if (mode !== "none") {
            model.valueInfos.push({ name: "envelope_centered", type: 0, elemType: FLOAT, shape: [64, inputSize] });
            model.valueInfos.push({ name: "envelope_centered_seq", type: 0, elemType: FLOAT, shape: [64, 1, inputSize] });
        }
        if (mode === "standard") {
            model.valueInfos.push({ name: "env_mean", type: 0, elemType: FLOAT, shape: [1, inputSize] });
            model.valueInfos.push({ name: "env_centered", type: 0, elemType: FLOAT, shape: [64, inputSize] });
            model.valueInfos.push({ name: "env_scaled", type: 0, elemType: FLOAT, shape: [64, inputSize] });
            model.valueInfos.push({ name: "env_shifted", type: 0, elemType: FLOAT, shape: [64, inputSize] });
        }
        model.valueInfos.push({ name: "lstm_out", type: 0, elemType: FLOAT, shape: [64, 1, hiddenSize] });
        model.valueInfos.push({ name: "lstm_h", type: 0, elemType: FLOAT, shape: [1, 1, hiddenSize] });
        model.valueInfos.push({ name: "lstm_flat", type: 0, elemType: FLOAT, shape: [1, hiddenSize] });
        model.valueInfos.push({ name: "logits", type: 0, elemType: FLOAT, shape: [1, outputSize] });

        return R.OnnxWriter.serialize(model);
    }
})();
