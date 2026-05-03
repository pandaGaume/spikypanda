// SpikyPanda - Motor Vibration RNN Demo
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

    let FAULT_NAMES = ["Normal", "Imbalance", "Bearing", "Misalignment"];
    let NUM_CLASSES = 4;
    const AXIS_COLORS = ["#ff4444", "#44ff44", "#4488ff"];
    const AXIS_NAMES = ["X", "Y", "Z"];

    function log(msg) {
        logEl.textContent += msg + "\n";
        logEl.scrollTop = logEl.scrollHeight;
    }
    function setStatus(msg) { statusEl.textContent = msg; }
    function setProgress(pct) { progressFill.style.width = pct + "%"; }

    // ====================== SYNTHETIC DATA GENERATOR ======================

    function gaussianNoise(sigma) {
        const u = 1 - Math.random();
        const v = 1 - Math.random();
        return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

    function generateVibrationSample(faultType, windowSize) {
        const sequence = [];
        const baseFreq = 50;
        const dt = 1 / 1000; // 1 kHz sampling

        for (let t = 0; t < windowSize; t++) {
            const time = t * dt;
            const angle = 2 * Math.PI * baseFreq * time;
            let x, y, z;

            switch (faultType) {
                case 0: {
                    // Normal: clean sine at ~50Hz + small noise
                    x = Math.sin(angle) + gaussianNoise(0.02);
                    y = Math.sin(angle + 2 * Math.PI / 3) + gaussianNoise(0.02);
                    z = Math.sin(angle + 4 * Math.PI / 3) + gaussianNoise(0.02);
                    break;
                }
                case 1: {
                    // Imbalance: sine + strong 2nd harmonic + noise
                    x = Math.sin(angle) + 0.5 * Math.sin(2 * angle) + gaussianNoise(0.06);
                    y = Math.sin(angle + 2 * Math.PI / 3) + 0.5 * Math.sin(2 * angle + 2 * Math.PI / 3) + gaussianNoise(0.06);
                    z = Math.sin(angle + 4 * Math.PI / 3) + 0.5 * Math.sin(2 * angle + 4 * Math.PI / 3) + gaussianNoise(0.06);
                    break;
                }
                case 2: {
                    // Bearing fault: sine + strong periodic impulses every 6 timesteps
                    x = Math.sin(angle) + gaussianNoise(0.03);
                    y = Math.sin(angle + 2 * Math.PI / 3) + gaussianNoise(0.03);
                    z = Math.sin(angle + 4 * Math.PI / 3) + gaussianNoise(0.03);
                    if (t % 6 === 0) {
                        x += 1.0;
                        y += 0.7;
                        z += 0.5;
                    }
                    if (t % 6 === 1) {
                        x += 0.5;
                        y += 0.35;
                        z += 0.25;
                    }
                    break;
                }
                case 3: {
                    // Misalignment: strong amplitude modulation + axis coupling
                    const modulation = 1 + 0.7 * Math.sin(2 * Math.PI * baseFreq * 0.25 * time);
                    x = modulation * Math.sin(angle) + 0.3 * Math.cos(angle * 0.5) + gaussianNoise(0.04);
                    y = modulation * Math.sin(angle + 2 * Math.PI / 3) + gaussianNoise(0.04);
                    z = modulation * 0.6 * Math.sin(angle + 4 * Math.PI / 3) + gaussianNoise(0.04);
                    break;
                }
            }

            // Normalize to [0, 1] via (signal + 1.5) / 3.0, clamped
            x = clamp((x + 1.5) / 3.0, 0, 1);
            y = clamp((y + 1.5) / 3.0, 0, 1);
            z = clamp((z + 1.5) / 3.0, 0, 1);

            sequence.push([x, y, z]);
        }

        return { sequence: sequence, label: faultType };
    }

    function generateSyntheticData(numSamples, windowSize) {
        const all = [];
        for (let i = 0; i < numSamples; i++) {
            const faultType = i % 4;
            all.push(generateVibrationSample(faultType, windowSize));
        }

        // Shuffle
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

        // Grid lines
        ctx.strokeStyle = "#1a2a3a";
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 5; i++) {
            const y = 10 + i * (H - 20) / 4;
            ctx.beginPath();
            ctx.moveTo(10, y);
            ctx.lineTo(W - 10, y);
            ctx.stroke();
        }

        // Loss curve
        ctx.strokeStyle = "#00d4ff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < lossHistory.length; i++) {
            const x = (i / (lossHistory.length - 1)) * (W - 20) + 10;
            const y = H - 10 - ((lossHistory[i] - minLoss) / range) * (H - 20);
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Labels
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

        // Grid
        ctx.strokeStyle = "#1a2a3a";
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 4; i++) {
            const y = padT + i * plotH / 4;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(W - padR, y);
            ctx.stroke();
        }

        // Y-axis labels
        ctx.fillStyle = "#888";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "right";
        for (let i = 0; i <= 4; i++) {
            const val = (1 - i / 4).toFixed(2);
            const y = padT + i * plotH / 4 + 3;
            ctx.fillText(val, padL - 4, y);
        }

        // Draw each axis
        for (let ch = 0; ch < 3; ch++) {
            ctx.strokeStyle = AXIS_COLORS[ch];
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
            ctx.fillStyle = AXIS_COLORS[ch];
            ctx.fillRect(lx, H - 15, 12, 3);
            ctx.fillStyle = "#aaa";
            ctx.font = "10px sans-serif";
            ctx.fillText(AXIS_NAMES[ch] + "-axis", lx + 16, H - 10);
        }

        // Title
        ctx.fillStyle = "#888";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Fault type: " + FAULT_NAMES[sample.label] + " (" + T + " timesteps)", W / 2, H - 2);
    }

    function drawConfusionMatrix(matrix) {
        confusionDiv.innerHTML = "";

        const table = document.createElement("table");
        table.className = "confusion-table";

        // Find max value for color scaling
        let maxVal = 1;
        for (let r = 0; r < NUM_CLASSES; r++) {
            for (let c = 0; c < NUM_CLASSES; c++) {
                if (matrix[r][c] > maxVal) maxVal = matrix[r][c];
            }
        }

        // Header row
        const headerRow = document.createElement("tr");
        const emptyTh = document.createElement("th");
        emptyTh.textContent = "Actual \\ Pred";
        headerRow.appendChild(emptyTh);
        for (let c = 0; c < NUM_CLASSES; c++) {
            const th = document.createElement("th");
            th.textContent = FAULT_NAMES[c];
            headerRow.appendChild(th);
        }
        table.appendChild(headerRow);

        // Data rows
        for (let r = 0; r < NUM_CLASSES; r++) {
            const tr = document.createElement("tr");
            const labelTd = document.createElement("td");
            labelTd.textContent = FAULT_NAMES[r];
            labelTd.className = "row-label";
            tr.appendChild(labelTd);
            for (let c = 0; c < NUM_CLASSES; c++) {
                const td = document.createElement("td");
                td.textContent = matrix[r][c];
                const intensity = matrix[r][c] / maxVal;
                if (r === c) {
                    // Diagonal (correct) - green tint
                    td.style.background = "rgba(0, 255, 100, " + (0.1 + intensity * 0.5) + ")";
                    td.style.color = "#fff";
                } else if (matrix[r][c] > 0) {
                    // Off-diagonal (errors) - red tint
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
        log("Loading vibration data...");

        const numSamples = parseInt(document.getElementById("numSamples").value);
        const windowSize = parseInt(document.getElementById("windowSize").value);

        let dataLoaded = false;

        // Try loading real data first
        try {
            const trainResp = await fetch("../../../data/motor/train.json");
            if (trainResp.ok) {
                const trainJson = await trainResp.json();
                const testResp = await fetch("../../../data/motor/test.json");
                const testJson = await testResp.json();

                trainData = trainJson.samples.map(function (s) {
                    return { sequence: s.sequence, label: s.label };
                });
                testData = testJson.samples.map(function (s) {
                    return { sequence: s.sequence, label: s.label };
                });

                if (trainJson.classes) {
                    FAULT_NAMES = trainJson.classes;
                    NUM_CLASSES = FAULT_NAMES.length;
                }
                log("Loaded real data: " + trainData.length + " train, " + testData.length + " test samples");
                log("Classes: " + FAULT_NAMES.join(", "));
                dataLoaded = true;
            }
        } catch (e) {
            // Fall through to synthetic
        }

        if (!dataLoaded) {
            log("Real data not available. Generating synthetic vibration data...");
            const data = generateSyntheticData(numSamples, windowSize);
            trainData = data.train;
            testData = data.test;
            log("Generated synthetic data: " + trainData.length + " train, " + testData.length + " test samples");
            log("Window size: " + windowSize + " timesteps x 3 channels (X, Y, Z)");
            log("Fault types: Normal, Imbalance, Bearing, Misalignment");
        }

        // Draw a sample signal
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

        log("Building RNN (" + cellType.toUpperCase() + ", hidden=" + hiddenSize + ")...");
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

                // Create targets: neutral for early timesteps, one-hot for last quarter
                // Early timesteps haven't seen enough signal to classify
                const oneHotLabel = new Array(NUM_CLASSES).fill(0);
                oneHotLabel[sample.label] = 1;
                const neutralVal = 1.0 / NUM_CLASSES;
                const neutral = new Array(NUM_CLASSES).fill(neutralVal);
                const targets = [];
                const labelStart = Math.floor(sample.sequence.length * 0.75);
                for (let t = 0; t < sample.sequence.length; t++) {
                    targets.push(t >= labelStart ? oneHotLabel.slice() : neutral.slice());
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
            // Take last timestep output
            const lastOutput = outputs[outputs.length - 1];

            // Argmax for predicted class
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

        // Show results panel
        resultsPanel.style.display = "block";
        document.getElementById("accuracy").textContent = (accuracy * 100).toFixed(1) + "%";
        document.getElementById("finalLoss").textContent = lossHistory.length > 0 ? lossHistory[lossHistory.length - 1].toFixed(4) : "-";
        document.getElementById("inferenceTime").textContent = elapsed.toFixed(0) + "ms";
        document.getElementById("testCount").textContent = testData.length;

        // Wait a tick for the panel to render before drawing canvas/table
        await new Promise(function (r) { setTimeout(r, 50); });

        // Draw confusion matrix
        drawConfusionMatrix(confMatrix);

        // Draw a test signal
        if (testData.length > 0) {
            drawSignal(testData[0]);
        }

        // Log confusion matrix as text
        log("");
        log("Confusion Matrix (rows=actual, cols=predicted):");
        let header = "".padEnd(14, " ");
        for (let c = 0; c < NUM_CLASSES; c++) {
            header += FAULT_NAMES[c].padStart(10, " ");
        }
        log(header);
        for (let r = 0; r < NUM_CLASSES; r++) {
            let row = FAULT_NAMES[r].padEnd(14, " ");
            for (let c = 0; c < NUM_CLASSES; c++) {
                row += String(confMatrix[r][c]).padStart(10, " ");
            }
            log(row);
        }

        setStatus("Done - Accuracy: " + (accuracy * 100).toFixed(1) + "% - " + elapsed.toFixed(0) + "ms");
        btnTrain.disabled = false;
        btnTest.disabled = false;
    });
})();
