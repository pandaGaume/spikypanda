// SpikyPanda - MOx Gas Discrimination (e-nose demo)
(function () {
    const S = SpikypandaCore;

    const logEl = document.getElementById("log");
    const statusEl = document.getElementById("status");
    const progressFill = document.getElementById("progressFill");
    const btnLoad = document.getElementById("btnLoad");
    const btnTrain = document.getElementById("btnTrain");
    const btnTest = document.getElementById("btnTest");
    const btnCopyLog = document.getElementById("btnCopyLog");
    const btnClearLog = document.getElementById("btnClearLog");
    const resultsPanel = document.getElementById("resultsPanel");
    const lossCanvas = document.getElementById("lossCanvas");
    const signalCanvas = document.getElementById("signalCanvas");
    const confusionDiv = document.getElementById("confusionMatrix");
    const presetSel = document.getElementById("preset");
    const presetInfo = document.getElementById("presetInfo");

    let trainData = null;
    let testData = null;
    let meta = null;
    let rnnGraph = null;
    let runtime = null;
    let trainer = null;
    const lossHistory = [];

    let CLASS_NAMES = ["Air", "Acetone", "HCl"];
    let NUM_CLASSES = 3;
    let SENSOR_LABELS = ["MOX 5", "MOX 9", "MOX 13", "MOX 21", "MOX 25"];

    // One color per sensor, used in the Rn signal canvas.
    const SENSOR_COLORS = ["#ff4444", "#ffaa22", "#44ff88", "#44aaff", "#cc77ff"];
    // Gas colors used in status hints.
    const GAS_COLORS = ["#88aaff", "#ffaa44", "#ff5566"];

    // Architecture presets. inputSize controls how many leading channels are fed
    // to the network. The JSON stores 23 channels, with the first 18 being base
    // (no derivatives) and the remaining 5 being the engineered dRn/dt features.
    const PRESETS = {
        "paper-lstm": {
            label: "Paper LSTM",
            cellType: "lstm",
            hiddenSize: 32,
            inputSize: 18,
            description:
                "<strong>Paper LSTM</strong> - Single LSTM cell, hidden=32, fed by the 18 base channels. " +
                "Measured at 91.9% accuracy, 53 neurons, 1696 synapses, 0.51 ms/window. Honest baseline: " +
                "reproduces the spirit of the paper's 5-layer LSTM with a single SpikyPanda layer.",
        },
        "compact-gru": {
            label: "Compact GRU",
            cellType: "gru",
            hiddenSize: 16,
            inputSize: 18,
            description:
                "<strong>Compact GRU</strong> - Single GRU cell, hidden=16, fed by the 18 base channels. " +
                "Measured at <strong>95.5% accuracy</strong>, 37 neurons, 592 synapses, 0.20 ms/window. " +
                "Champion preset and Pumba candidate: smallest footprint, beats the paper's 89.7% " +
                "(5-layer LSTM + distillation) by 5.8 points with best-weights checkpointing on top of " +
                "plain Adam.",
        },
        "enhanced-gru": {
            label: "Enhanced GRU",
            cellType: "gru",
            hiddenSize: 24,
            inputSize: 23,
            description:
                "<strong>Enhanced GRU</strong> - Single GRU cell, hidden=24, fed by all 23 channels " +
                "including the engineered <code>dRn/dt</code> derivatives. Measured at 90.4%, 50 neurons, " +
                "1200 synapses. Perfect Air recall, but the extra derivative features turn out to be " +
                "largely redundant with what the GRU already extracts internally.",
        },
    };

    function log(msg) {
        logEl.textContent += msg + "\n";
        logEl.scrollTop = logEl.scrollHeight;
    }
    function setStatus(msg) { statusEl.textContent = msg; }
    function setProgress(pct) { progressFill.style.width = pct + "%"; }

    // Compute the learning rate for a given epoch under one of the supported
    // schedules. Cosine decay smoothly drops the LR to 10% of its initial
    // value over the full training run (the classic anti-overfit schedule).
    // Cyclic runs two full sine waves and oscillates between 30% and 100%
    // of the base LR, which helps escape local minima while the amplitude
    // decay keeps late epochs gentle. cosine+kick follows the same cosine
    // curve but detects loss stagnation/rise and kicks the LR back up.
    // constant+kick stays at baseLr and temporarily boosts above it when
    // the loss starts to drift upward.
    function lrForEpoch(epoch, totalEpochs, baseLr, schedule) {
        if (schedule === "constant" || schedule === "constant+kick" || totalEpochs <= 1) return baseLr;
        const progress = epoch / (totalEpochs - 1); // 0 .. 1
        if (schedule === "cosine" || schedule === "cosine+kick") {
            const k = 0.5 * (1 + Math.cos(Math.PI * progress));
            return baseLr * (0.1 + 0.9 * k);
        }
        if (schedule === "cyclic") {
            const phase = 2 * Math.PI * 2 * progress; // 2 full cycles
            return baseLr * (0.65 + 0.35 * Math.sin(phase));
        }
        return baseLr;
    }

    // Compute the target LR for a kick under each schedule. cosine+kick bumps
    // back toward the initial baseLr (since the scheduled LR is already lower);
    // constant+kick pushes ABOVE baseLr to perturb a model that otherwise
    // stays at the ceiling.
    function kickTargetFor(schedule, scheduledLr, baseLr) {
        if (schedule === "cosine+kick") {
            return Math.min(baseLr, scheduledLr * 3);
        }
        if (schedule === "constant+kick") {
            return baseLr * 2;
        }
        return scheduledLr;
    }

    // Adaptive kick shared by cosine+kick and constant+kick. Tracks the loss
    // trajectory and bumps the LR to `kickTarget` whenever the loss rises
    // two epochs in a row. The kick persists for three epochs in total (one
    // trigger plus two held) so the optimizer actually has time to climb out
    // of the bad basin, and the rising streak is reset during the hold so the
    // exploration does not spuriously retrigger itself.
    function maybeKickLr(state, scheduledLr, kickTarget, avgLoss) {
        // Currently holding a kick LR from a previous trigger: keep pushing
        // at the elevated rate and ignore the rising-loss detector.
        if (state.holdRemaining > 0) {
            state.holdRemaining--;
            state.prevLoss = avgLoss;
            state.risingStreak = 0;
            return { lr: state.holdLr, kicked: false };
        }

        // Normal operation: track the rising-loss streak.
        if (state.prevLoss !== null) {
            if (avgLoss > state.prevLoss * 1.01) {
                state.risingStreak++;
            } else {
                state.risingStreak = 0;
            }
        }
        state.prevLoss = avgLoss;

        if (state.risingStreak >= 2) {
            // Fire a new kick: boost the LR to kickTarget to give the
            // optimizer enough energy to escape the local minimum it is
            // stuck in, and hold that level for two more epochs.
            state.holdLr = kickTarget;
            state.holdRemaining = 2;
            state.risingStreak = 0;
            state.kicks++;
            return { lr: kickTarget, kicked: true };
        }

        return { lr: scheduledLr, kicked: false };
    }

    // Best-weights checkpointing is provided by the shared helpers in
    // www/js/common.js: spSnapshotWeights, spRestoreWeights, and the
    // spCreateCheckpointer wrapper. They handle every SpikyPanda neuron/
    // synapse type (RNN, MLP, CNN shared kernels, ViT) so any other sample
    // can reuse the same mechanism with zero per-sample code.

    function updatePresetInfo() {
        const p = PRESETS[presetSel.value];
        if (p && presetInfo) presetInfo.innerHTML = p.description;
    }
    presetSel.addEventListener("change", updatePresetInfo);
    updatePresetInfo();

    // Copy-to-clipboard button for the training log. Uses the async clipboard
    // API when available and falls back to a document.execCommand path for
    // insecure origins (file://) where clipboard access is blocked.
    if (btnCopyLog) {
        btnCopyLog.addEventListener("click", function () {
            const text = logEl.textContent || "";
            const flashOk = function () {
                btnCopyLog.textContent = "Copied!";
                btnCopyLog.classList.add("copied");
                setTimeout(function () {
                    btnCopyLog.textContent = "Copy";
                    btnCopyLog.classList.remove("copied");
                }, 1500);
            };
            const flashFail = function () {
                btnCopyLog.textContent = "Failed";
                setTimeout(function () { btnCopyLog.textContent = "Copy"; }, 1500);
            };
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(flashOk).catch(flashFail);
                return;
            }
            try {
                const ta = document.createElement("textarea");
                ta.value = text;
                ta.style.position = "fixed";
                ta.style.top = "-1000px";
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                const ok = document.execCommand("copy");
                document.body.removeChild(ta);
                if (ok) flashOk(); else flashFail();
            } catch (e) {
                flashFail();
            }
        });
    }

    // Clear button: wipes the training log back to its empty-Ready state so
    // the next run starts fresh without previous preset noise.
    if (btnClearLog) {
        btnClearLog.addEventListener("click", function () {
            logEl.textContent = "Ready.\n";
            logEl.scrollTop = 0;
            btnClearLog.textContent = "Cleared";
            btnClearLog.classList.add("copied");
            setTimeout(function () {
                btnClearLog.textContent = "Clear";
                btnClearLog.classList.remove("copied");
            }, 1000);
        });
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

        const maxLoss = Math.max.apply(null, lossHistory);
        const minLoss = Math.min.apply(null, lossHistory);
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
        ctx.fillText("Epoch " + lossHistory.length, W - 60, H - 2);
    }

    // Render one window: Rn per sensor over time. Channels 3..7 of the 23-channel
    // vector hold Rn for the 5 sensors.
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
        const padL = 46, padR = 10, padT = 10, padB = 30;
        const plotW = W - padL - padR;
        const plotH = H - padT - padB;

        // Find min/max of Rn across all 5 sensors in this window for auto-scaling.
        let minV = Infinity, maxV = -Infinity;
        for (let t = 0; t < T; t++) {
            for (let s = 0; s < 5; s++) {
                const v = seq[t][3 + s];
                if (v < minV) minV = v;
                if (v > maxV) maxV = v;
            }
        }
        // Pad scale a bit so curves do not touch the borders.
        const mid = (minV + maxV) / 2;
        let half = Math.max((maxV - minV) / 2, 0.05) * 1.2;
        const yMin = mid - half;
        const yMax = mid + half;

        // Grid + y labels
        ctx.strokeStyle = "#1a2a3a";
        ctx.lineWidth = 0.5;
        ctx.fillStyle = "#888";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "right";
        for (let i = 0; i <= 4; i++) {
            const y = padT + i * plotH / 4;
            ctx.beginPath();
            ctx.moveTo(padL, y);
            ctx.lineTo(W - padR, y);
            ctx.stroke();
            const val = yMax - (i / 4) * (yMax - yMin);
            ctx.fillText(val.toFixed(3), padL - 4, y + 3);
        }

        // Horizontal line at Rn=1 if inside the view range (clean-air baseline).
        if (1 >= yMin && 1 <= yMax) {
            ctx.strokeStyle = "rgba(255,255,255,0.25)";
            ctx.setLineDash([4, 3]);
            const y1 = padT + (1 - (1 - yMin) / (yMax - yMin)) * plotH;
            ctx.beginPath();
            ctx.moveTo(padL, y1);
            ctx.lineTo(W - padR, y1);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw each sensor
        for (let s = 0; s < 5; s++) {
            ctx.strokeStyle = SENSOR_COLORS[s];
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let t = 0; t < T; t++) {
                const v = seq[t][3 + s];
                const x = padL + (t / (T - 1)) * plotW;
                const y = padT + (1 - (v - yMin) / (yMax - yMin)) * plotH;
                if (t === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Legend row
        ctx.textAlign = "left";
        for (let s = 0; s < 5; s++) {
            const lx = padL + s * 64;
            ctx.fillStyle = SENSOR_COLORS[s];
            ctx.fillRect(lx, H - 16, 12, 3);
            ctx.fillStyle = "#aaa";
            ctx.font = "10px sans-serif";
            ctx.fillText(SENSOR_LABELS[s], lx + 16, H - 11);
        }

        // Title
        ctx.fillStyle = GAS_COLORS[sample.label] || "#bbb";
        ctx.font = "11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Gas: " + CLASS_NAMES[sample.label] + " - " + T + " timesteps", W / 2, H - 2);
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

    function sliceChannels(sample, inputSize) {
        // Truncate each timestep to the first inputSize channels (the JSON layout
        // is designed so that the base features come first and the engineered
        // features come last).
        const seq = sample.sequence;
        const out = new Array(seq.length);
        for (let t = 0; t < seq.length; t++) {
            out[t] = seq[t].slice(0, inputSize);
        }
        return { sequence: out, label: sample.label };
    }

    btnLoad.addEventListener("click", async function () {
        btnLoad.disabled = true;
        setStatus("Loading MOx dataset...");
        log("Fetching train/test splits...");

        try {
            const trainResp = await fetch("../../data/mox/train.json");
            if (!trainResp.ok) throw new Error("train.json HTTP " + trainResp.status);
            const trainJson = await trainResp.json();
            const testResp = await fetch("../../data/mox/test.json");
            if (!testResp.ok) throw new Error("test.json HTTP " + testResp.status);
            const testJson = await testResp.json();

            meta = trainJson;
            CLASS_NAMES = trainJson.classes;
            NUM_CLASSES = CLASS_NAMES.length;
            if (trainJson.sensors && trainJson.sensors.length === 5) {
                SENSOR_LABELS = trainJson.sensors;
            }

            trainData = trainJson.samples.map(function (s) {
                return { sequence: s.sequence, label: s.label };
            });
            testData = testJson.samples.map(function (s) {
                return { sequence: s.sequence, label: s.label };
            });

            log("Loaded " + trainData.length + " train / " + testData.length + " test windows");
            log("Window size: " + trainJson.windowSize + ", channels: " + trainJson.channels +
                " (base " + trainJson.baseChannels + ")");
            log("Classes: " + CLASS_NAMES.join(", "));
            log("Sensors (fused): " + SENSOR_LABELS.join(", "));
        } catch (e) {
            log("ERROR loading data: " + e.message);
            log("Did you run: node scripts/prepare-mox.mjs ?");
            setStatus("Data load failed.");
            btnLoad.disabled = false;
            return;
        }

        if (trainData.length > 0) drawSignal(trainData[0]);

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

        const preset = PRESETS[presetSel.value];
        const epochs = parseInt(document.getElementById("epochs").value, 10);
        const lr = parseFloat(document.getElementById("lr").value);
        const numSamples = Math.min(parseInt(document.getElementById("numSamples").value, 10), trainData.length);
        const schedule = document.getElementById("lrSchedule").value;

        log("");
        log("Preset: " + preset.label + " - cell=" + preset.cellType.toUpperCase() +
            " hidden=" + preset.hiddenSize + " inputs=" + preset.inputSize);
        log("LR schedule: " + schedule + " (base " + lr + ")");
        setStatus("Building model...");

        try {
            rnnGraph = new S.RnnBuilder()
                .withInputSize(preset.inputSize)
                .withHiddenSize(preset.hiddenSize)
                .withOutputSize(NUM_CLASSES)
                .withCellType(preset.cellType === "lstm" ? S.RnnCellType.LSTM : S.RnnCellType.GRU)
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
        // CrossEntropy beats MSE for classification: sharper gradients when
        // the model is confidently wrong (o -> 0 or o -> 1) speeds convergence
        // and avoids the flat plateau we saw with MSE on this e-nose data.
        trainer = new S.RnnTrainingRuntime(
            rnnGraph,
            runtime,
            S.LossFunctions.CrossEntropy,
            lr,
            S.Optimizers.Adam()
        );

        // Prepare a sliced copy of the samples actually used, to avoid slicing
        // inside the tight inner loop.
        const trainSubset = trainData.slice(0, numSamples).map(function (s) {
            return sliceChannels(s, preset.inputSize);
        });

        setStatus("Training...");
        const totalSteps = epochs * trainSubset.length;
        let step = 0;

        // Adaptive kick state used only when schedule === "cosine+kick".
        // Tracks the rising loss trend across epochs to decide when to inject
        // extra LR and knock the model out of a bad local minimum.
        const kickState = {
            prevLoss: null,
            risingStreak: 0,
            holdLr: 0,
            holdRemaining: 0,
            kicks: 0,
        };

        // Best-weights checkpointer (shared helper from common.js). It
        // snapshots the graph whenever the epoch loss reaches a new minimum
        // after the warmup window, and restores the best snapshot before
        // the test phase runs. This is what the kick schedules need to show
        // their benefit: they find better basins transiently and would
        // otherwise drift out by the time we test.
        const checkpointer = spCreateCheckpointer(rnnGraph, { warmup: 5 });

        for (let epoch = 0; epoch < epochs; epoch++) {
            // Compute scheduled LR for this epoch. The RnnTrainingRuntime
            // exposes `learningRate` as TS-readonly but it is a plain JS
            // property at runtime, so in-place mutation is safe and cheap.
            let epochLr = lrForEpoch(epoch, epochs, lr, schedule);
            let kickedThisEpoch = false;
            if ((schedule === "cosine+kick" || schedule === "constant+kick") && lossHistory.length > 0) {
                const prevAvg = lossHistory[lossHistory.length - 1];
                const kickTarget = kickTargetFor(schedule, epochLr, lr);
                const kick = maybeKickLr(kickState, epochLr, kickTarget, prevAvg);
                epochLr = kick.lr;
                kickedThisEpoch = kick.kicked;
            }
            trainer.learningRate = epochLr;

            let epochLoss = 0;

            for (let i = 0; i < trainSubset.length; i++) {
                const sample = trainSubset[i];
                runtime.resetState();

                // One-hot target on every timestep. With sigmoid outputs the
                // old "neutral (1/3, 1/3, 1/3) for the first 75%" strategy
                // pushes the network toward an unreachable midpoint. Asking
                // for the correct label at every step gives consistent
                // gradients and converges cleanly under CrossEntropy.
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
                    setStatus("Epoch " + (epoch + 1) + "/" + epochs + " - Sample " + (i + 1) + "/" + trainSubset.length);
                    await new Promise(function (r) { setTimeout(r, 0); });
                }
            }

            const avgLoss = epochLoss / trainSubset.length;
            lossHistory.push(avgLoss);
            drawLossChart();

            const newBest = checkpointer.update(epoch, avgLoss);

            log("Epoch " + (epoch + 1) + "/" + epochs +
                " - lr=" + epochLr.toFixed(5) +
                (kickedThisEpoch ? " KICK" : "") +
                " - Avg Loss: " + avgLoss.toFixed(6) +
                (newBest ? " *" : ""));

            await new Promise(function (r) { setTimeout(r, 0); });
        }

        setProgress(100);
        if ((schedule === "cosine+kick" || schedule === "constant+kick") && kickState.kicks > 0) {
            log("Adaptive kicks fired: " + kickState.kicks);
        }
        const ckptInfo = checkpointer.restore();
        if (ckptInfo.hasCheckpoint) {
            log("Restored best weights from epoch " + ckptInfo.bestEpoch +
                " (loss " + ckptInfo.bestLoss.toFixed(6) + ")");
        }
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

        const preset = PRESETS[presetSel.value];
        setStatus("Running inference on test set...");
        log("Testing on " + testData.length + " windows with " + preset.label + "...");

        let correct = 0;
        const confMatrix = [];
        for (let i = 0; i < NUM_CLASSES; i++) {
            confMatrix.push(new Array(NUM_CLASSES).fill(0));
        }

        const t0 = performance.now();

        for (let i = 0; i < testData.length; i++) {
            const sample = sliceChannels(testData[i], preset.inputSize);
            runtime.resetState();

            const outputs = runtime.run(sample.sequence);
            const lastOutput = outputs[outputs.length - 1];

            let predicted = 0;
            for (let c = 1; c < lastOutput.length; c++) {
                if (lastOutput[c] > lastOutput[predicted]) predicted = c;
            }

            if (predicted === sample.label) correct++;
            confMatrix[sample.label][predicted]++;

            if (i % 20 === 0) {
                setStatus("Testing " + (i + 1) + "/" + testData.length + "...");
                await new Promise(function (r) { setTimeout(r, 0); });
            }
        }

        const elapsed = performance.now() - t0;
        const accuracy = correct / testData.length;

        log("Accuracy: " + (accuracy * 100).toFixed(1) + "% (" + correct + "/" + testData.length + ")");
        log("Inference time: " + elapsed.toFixed(0) + "ms (" + (elapsed / testData.length).toFixed(2) + "ms/window)");

        resultsPanel.style.display = "block";
        document.getElementById("accuracy").textContent = (accuracy * 100).toFixed(1) + "%";
        document.getElementById("finalLoss").textContent = lossHistory.length > 0 ? lossHistory[lossHistory.length - 1].toFixed(4) : "-";
        document.getElementById("inferenceTime").textContent = elapsed.toFixed(0) + "ms";
        document.getElementById("testCount").textContent = testData.length;

        await new Promise(function (r) { setTimeout(r, 50); });

        drawConfusionMatrix(confMatrix);
        if (testData.length > 0) drawSignal(testData[0]);

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
})();
