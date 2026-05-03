// SpikyPanda — LiDAR Autoencoder Demo
(function () {
    const S = SpikypandaCore;

    const logEl = document.getElementById("log");
    const statusEl = document.getElementById("status");
    const progressFill = document.getElementById("progressFill");
    const btnGenerate = document.getElementById("btnGenerate");
    const btnTrain = document.getElementById("btnTrain");
    const btnTest = document.getElementById("btnTest");
    const btnExport = document.getElementById("btnExport");
    const resultsPanel = document.getElementById("resultsPanel");
    const lossCanvas = document.getElementById("lossCanvas");

    let dataset = null;
    let testSet = null;
    let aeResult = null;
    let aeRuntime = null;
    let aeTrainer = null;
    let encRuntime = null;
    const lossHistory = [];
    let modelType = "cnn"; // "cnn" or "vit"

    // ViT/SAT autoencoder state
    let vitGraph = null;
    let vitRuntime = null;
    let vitTrainer = null;

    const CHANNELS = 6;
    const CH_NAMES = ["Density", "Z max", "Z min", "Std(z)", "Reflectivity", "Velocity"];
    const CH_COLORS = [
        [0, 200, 255],   // cyan
        [255, 100, 0],   // orange
        [0, 255, 100],   // green
        [255, 255, 0],   // yellow
        [180, 180, 180], // gray
        [255, 50, 50],   // red
    ];

    function log(msg) {
        logEl.textContent += msg + "\n";
        logEl.scrollTop = logEl.scrollHeight;
    }
    function setStatus(msg) { statusEl.textContent = msg; }
    function setProgress(pct) { progressFill.style.width = pct + "%"; }

    // ====================== SYNTHETIC LIDAR GENERATOR ======================

    function gaussianNoise(sigma) {
        const u = 1 - Math.random();
        const v = 1 - Math.random();
        return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

    function generateLidarGrid(size, sceneType) {
        const pixels = new Array(CHANNELS * size * size).fill(0);

        function set(ch, r, c, val) {
            pixels[ch * size * size + r * size + c] = clamp(val, 0, 1);
        }
        function get(ch, r, c) {
            return pixels[ch * size * size + r * size + c];
        }

        const cx = size / 2, cy = size / 2;
        const noise = () => gaussianNoise(0.03);

        switch (sceneType) {
            case "straight": {
                // Central road band (width ~40% of grid)
                const roadW = size * 0.4;
                const roadL = cx - roadW / 2, roadR = cx + roadW / 2;
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        if (c >= roadL && c <= roadR) {
                            set(0, r, c, 0.8 + noise());
                            set(1, r, c, 0.05 + noise());
                            set(2, r, c, 0.0 + noise());
                            set(3, r, c, 0.02 + noise());
                            set(4, r, c, 0.7 + noise());
                            set(5, r, c, 0.0);
                        } else {
                            set(0, r, c, 0.5 + noise());
                            set(1, r, c, 0.3 + 0.2 * Math.random() + noise());
                            set(2, r, c, 0.0 + noise());
                            set(3, r, c, 0.3 + 0.2 * Math.random());
                            set(4, r, c, 0.3 + noise());
                            set(5, r, c, 0.0);
                        }
                    }
                }
                break;
            }
            case "curved": {
                const roadW = size * 0.35;
                const curveAmp = size * 0.2;
                for (let r = 0; r < size; r++) {
                    const offset = Math.sin(r / size * Math.PI) * curveAmp;
                    const roadC = cx + offset;
                    for (let c = 0; c < size; c++) {
                        const dist = Math.abs(c - roadC);
                        if (dist <= roadW / 2) {
                            set(0, r, c, 0.8 + noise());
                            set(1, r, c, 0.05 + noise());
                            set(2, r, c, 0.0 + noise());
                            set(3, r, c, 0.02 + noise());
                            set(4, r, c, 0.7 + noise());
                            set(5, r, c, 0.0);
                        } else {
                            set(0, r, c, 0.4 + noise());
                            set(1, r, c, 0.25 + 0.2 * Math.random());
                            set(2, r, c, 0.0 + noise());
                            set(3, r, c, 0.3 + 0.15 * Math.random());
                            set(4, r, c, 0.3 + noise());
                            set(5, r, c, 0.0);
                        }
                    }
                }
                break;
            }
            case "intersection": {
                const roadW = size * 0.3;
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        const inHRoad = Math.abs(r - cy) <= roadW / 2;
                        const inVRoad = Math.abs(c - cx) <= roadW / 2;
                        if (inHRoad || inVRoad) {
                            set(0, r, c, 0.85 + noise());
                            set(1, r, c, 0.05 + noise());
                            set(2, r, c, 0.0 + noise());
                            set(3, r, c, 0.02 + noise());
                            set(4, r, c, 0.7 + noise());
                            set(5, r, c, 0.0);
                        } else {
                            set(0, r, c, 0.5 + noise());
                            set(1, r, c, 0.35 + 0.15 * Math.random());
                            set(2, r, c, 0.0 + noise());
                            set(3, r, c, 0.25 + 0.15 * Math.random());
                            set(4, r, c, 0.3 + noise());
                            set(5, r, c, 0.0);
                        }
                    }
                }
                break;
            }
            case "obstacles": {
                // Road with random obstacles
                const roadW = size * 0.5;
                const roadL = cx - roadW / 2, roadR = cx + roadW / 2;
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        if (c >= roadL && c <= roadR) {
                            set(0, r, c, 0.8 + noise());
                            set(1, r, c, 0.05 + noise());
                            set(2, r, c, 0.0 + noise());
                            set(3, r, c, 0.02 + noise());
                            set(4, r, c, 0.7 + noise());
                            set(5, r, c, 0.0);
                        } else {
                            set(0, r, c, 0.3 + noise());
                            set(1, r, c, 0.2 + 0.1 * Math.random());
                            set(2, r, c, 0.0 + noise());
                            set(3, r, c, 0.2 + 0.1 * Math.random());
                            set(4, r, c, 0.3 + noise());
                            set(5, r, c, 0.0);
                        }
                    }
                }
                // Add 2-4 random rectangular obstacles on the road
                const numObs = 2 + Math.floor(Math.random() * 3);
                for (let o = 0; o < numObs; o++) {
                    const or_ = Math.floor(Math.random() * (size - 4));
                    const oc = Math.floor(roadL + Math.random() * roadW);
                    const oh = 2 + Math.floor(Math.random() * 3);
                    const ow = 2 + Math.floor(Math.random() * 3);
                    const isMoving = Math.random() > 0.5;
                    for (let dr = 0; dr < oh && or_ + dr < size; dr++) {
                        for (let dc = 0; dc < ow && oc + dc < size; dc++) {
                            set(0, or_ + dr, oc + dc, 0.9);
                            set(1, or_ + dr, oc + dc, 0.5 + 0.3 * Math.random());
                            set(2, or_ + dr, oc + dc, 0.05);
                            set(3, or_ + dr, oc + dc, 0.05);
                            set(4, or_ + dr, oc + dc, 0.5 + 0.3 * Math.random());
                            set(5, or_ + dr, oc + dc, isMoving ? 0.5 + 0.5 * Math.random() : 0);
                        }
                    }
                }
                break;
            }
            case "empty": {
                // Open field with sparse returns
                for (let r = 0; r < size; r++) {
                    for (let c = 0; c < size; c++) {
                        set(0, r, c, 0.2 + 0.1 * Math.random() + noise());
                        set(1, r, c, 0.05 + noise());
                        set(2, r, c, 0.0 + noise());
                        set(3, r, c, 0.03 + noise());
                        set(4, r, c, 0.25 + 0.1 * Math.random());
                        set(5, r, c, 0.0);
                    }
                }
                break;
            }
        }

        for (let i = 0; i < pixels.length; i++) {
            pixels[i] = clamp(pixels[i], 0, 1);
        }

        return pixels;
    }

    function generateDataset(count, size) {
        const sceneTypes = ["straight", "curved", "intersection", "obstacles", "empty"];
        const samples = [];
        for (let i = 0; i < count; i++) {
            const type = sceneTypes[i % sceneTypes.length];
            const pixels = generateLidarGrid(size, type);
            samples.push({ label: sceneTypes.indexOf(type), pixels });
        }
        return { count, width: size, height: size, channels: CHANNELS, format: "CHW", samples };
    }

    // ====================== VISUALIZATION ======================

    function drawChannel(pixels, ch, w, h, canvas, colorTint) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = (w * 3) + "px";
        canvas.style.height = (h * 3) + "px";
        const ctx = canvas.getContext("2d");
        const imgData = ctx.createImageData(w, h);
        for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
                const val = pixels[ch * w * h + r * w + c];
                const idx = (r * w + c) * 4;
                imgData.data[idx] = Math.round(val * colorTint[0]);
                imgData.data[idx + 1] = Math.round(val * colorTint[1]);
                imgData.data[idx + 2] = Math.round(val * colorTint[2]);
                imgData.data[idx + 3] = 255;
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    function drawChannelRow(pixels, w, h, container) {
        const row = document.createElement("div");
        row.className = "grid-row";
        for (let ch = 0; ch < CHANNELS; ch++) {
            const item = document.createElement("div");
            item.className = "grid-item";
            const canvas = document.createElement("canvas");
            drawChannel(pixels, ch, w, h, canvas, CH_COLORS[ch]);
            item.appendChild(canvas);
            const label = document.createElement("div");
            label.className = "ch-label";
            label.textContent = CH_NAMES[ch];
            item.appendChild(label);
            row.appendChild(item);
        }
        container.appendChild(row);
    }

    function drawLatentVector(values, container) {
        const bar = document.createElement("div");
        bar.className = "latent-bar";
        const maxVal = Math.max(...values.map(Math.abs), 0.01);
        for (const v of values) {
            const div = document.createElement("div");
            div.className = "bar";
            const h = Math.round(Math.abs(v) / maxVal * 36) + 2;
            div.style.height = h + "px";
            div.style.background = v >= 0 ? "#00d4ff" : "#ff4444";
            bar.appendChild(div);
        }
        container.appendChild(bar);
    }

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
    }

    // ====================== ACTIONS ======================

    btnGenerate.addEventListener("click", function () {
        const size = parseInt(document.getElementById("resolution").value);
        const count = parseInt(document.getElementById("numSamples").value);

        log(`Generating ${count} synthetic LiDAR grids (${size}x${size}x${CHANNELS})...`);
        setStatus("Generating...");

        const testCount = Math.max(10, Math.floor(count * 0.2));
        dataset = generateDataset(count, size);
        testSet = generateDataset(testCount, size);

        log(`Generated ${dataset.count} train + ${testSet.count} test samples`);
        setStatus("Data ready. Click Train.");
        btnTrain.disabled = false;
    });

    // ====================== ViT AUTOENCODER ======================
    // Uses ViT with sigmoid output as autoencoder
    // numClasses = output pixels, trained with MSE + full backprop

    btnTrain.addEventListener("click", async function () {
        btnTrain.disabled = true;
        btnTest.disabled = true;
        btnGenerate.disabled = true;
        lossHistory.length = 0;

        const presetValue = document.getElementById("preset").value;
        const latentDim = parseInt(document.getElementById("latentDim").value);
        const epochs = parseInt(document.getElementById("epochs").value);
        const lr = parseFloat(document.getElementById("lr").value);

        if (presetValue.startsWith("vit-") || presetValue.startsWith("sat-")) {
            // ====================== ViT / SAT PATH ======================
            modelType = "vit"; // both use the same test path
            const size = dataset.width;
            const patchSize = size <= 8 ? 2 : size >= 64 ? 8 : 4;
            const isSat = presetValue.startsWith("sat-");

            try {
                if (isSat) {
                    // SAT - Spatial Attention Transformer
                    const satPresetMap = {
                        "sat-local": S.SatPresets.local,
                        "sat-hierarchical": S.SatPresets.hierarchical,
                        "sat-progressive": S.SatPresets.progressive,
                    };
                    const basePreset = satPresetMap[presetValue] || S.SatPresets.local;
                    const satConfig = {
                        ...basePreset,
                        width: size, height: size, channels: CHANNELS,
                        patchSize,
                        embedDim: latentDim,
                        numHeads: Math.min(4, latentDim),
                        patchDecode: true,
                    };
                    vitGraph = new S.SatBuilder().withConfig(satConfig).build();
                    vitRuntime = new S.SatInferenceRuntime(vitGraph);
                    vitTrainer = new S.SatTrainingRuntime(vitGraph, vitRuntime, S.LossFunctions.MSE, lr);
                    const radiusStr = vitGraph.radiusPerBlock.map(r => r === Infinity ? "inf" : r).join(",");
                    log(`SAT MAE: ${vitGraph.numPatches} patches, embed=${latentDim}, radius=[${radiusStr}], attn pairs=[${vitGraph.attentionPairsPerBlock.join(",")}]`);
                } else {
                    // ViT - full attention
                    const config = {
                        width: size, height: size, channels: CHANNELS,
                        patchSize,
                        embedDim: latentDim,
                        numHeads: Math.min(4, latentDim),
                        numBlocks: 2,
                        mlpRatio: 2,
                        numClasses: size * size * CHANNELS,
                    };
                    vitGraph = new S.VitBuilder().withConfig(config).build();
                    vitRuntime = new S.VitInferenceRuntime(vitGraph);
                    vitRuntime.useSoftmax = false;
                    vitTrainer = new S.VitTrainingRuntime(vitGraph, vitRuntime, S.LossFunctions.MSE, lr, S.Optimizers.Adam());
                    log(`ViT MAE: ${vitGraph.numPatches} patches, embed=${latentDim}, full attention`);
                }
            } catch (e) {
                log("ERROR building model: " + e.message);
                setStatus("Build failed.");
                btnTrain.disabled = false;
                btnGenerate.disabled = false;
                return;
            }

            setStatus("Training (full backprop)...");
            const totalSteps = epochs * dataset.count;
            let step = 0;

            for (let epoch = 0; epoch < epochs; epoch++) {
                let epochLoss = 0;

                for (let i = 0; i < dataset.count; i++) {
                    const sample = dataset.samples[i];
                    const loss = vitTrainer.trainStepMAE(sample.pixels);
                    epochLoss += loss;
                    step++;

                    if (i % 2 === 0) {
                        setProgress((step / totalSteps) * 100);
                        setStatus(`Epoch ${epoch + 1}/${epochs} - Sample ${i + 1}/${dataset.count}`);
                        await new Promise(r => setTimeout(r, 0));
                    }
                }

                const avgLoss = epochLoss / dataset.count;
                lossHistory.push(avgLoss);
                drawLossChart();
                log(`Epoch ${epoch + 1}/${epochs} - Avg MSE: ${avgLoss.toFixed(6)}`);
            }

            setProgress(100);
            setStatus("Training complete. Click Test to evaluate.");
            log("ViT training finished.");
            btnTrain.disabled = false;
            btnTest.disabled = false;
            btnGenerate.disabled = false;

        } else {
            // ====================== CNN PATH ======================
            modelType = "cnn";
            log(`Building autoencoder (${presetValue}, latent=${latentDim})...`);
            setStatus("Building model...");

            try {
                aeResult = S.buildAutoencoderFromPreset(presetValue, {
                    width: dataset.width,
                    height: dataset.height,
                    channels: dataset.channels,
                    latentDim: latentDim,
                });
            } catch (e) {
                log("ERROR building model: " + e.message);
                setStatus("Build failed.");
                btnTrain.disabled = false;
                btnGenerate.disabled = false;
                return;
            }

            const ae = aeResult.autoencoder;
            log(`Autoencoder: ${ae.nodes.length} neurons, ${ae.links.length} synapses, ${ae.kernels.length} kernels`);

            aeRuntime = new S.CnnInferenceRuntime(ae);

            // Build loss function
            const channelWeights = [
                parseFloat(document.getElementById("w0").value),
                parseFloat(document.getElementById("w1").value),
                parseFloat(document.getElementById("w2").value),
                parseFloat(document.getElementById("w3").value),
                parseFloat(document.getElementById("w4").value),
                parseFloat(document.getElementById("w5").value),
            ];
            const isWeighted = channelWeights.some(w => w !== 1);
            let lossFn = S.LossFunctions.MSE;
            if (isWeighted) {
                lossFn = new S.WeightedChannelLoss(S.LossFunctions.MSE, channelWeights, dataset.width, dataset.height);
                log(`Channel weights: [${channelWeights.join(", ")}]`);
            }

            aeTrainer = new S.CnnTrainingRuntime(ae, aeRuntime, lossFn, lr, S.Optimizers.Adam());

            setStatus("Training...");
            const totalSteps = epochs * dataset.count;
            let step = 0;

            for (let epoch = 0; epoch < epochs; epoch++) {
                let epochLoss = 0;

                for (let i = 0; i < dataset.count; i++) {
                    const sample = dataset.samples[i];
                    const loss = aeTrainer.trainStep(sample.pixels, sample.pixels);
                    epochLoss += loss;
                    step++;

                    if (i % 5 === 0) {
                        setProgress((step / totalSteps) * 100);
                        setStatus(`Epoch ${epoch + 1}/${epochs} - Sample ${i + 1}/${dataset.count}`);
                        await new Promise(r => setTimeout(r, 0));
                    }
                }

                const avgLoss = epochLoss / dataset.count;
                lossHistory.push(avgLoss);
                drawLossChart();
                log(`Epoch ${epoch + 1}/${epochs} - Avg MSE: ${avgLoss.toFixed(6)}`);
            }

            S.AutoencoderBuilder.syncWeights(aeResult);
            encRuntime = new S.CnnInferenceRuntime(aeResult.encoder);

            setProgress(100);
            setStatus("Training complete. Click Test to evaluate.");
            log("Training finished.");
            btnTrain.disabled = false;
            btnTest.disabled = false;
            btnExport.disabled = false;
            btnGenerate.disabled = false;
        }
    });

    btnTest.addEventListener("click", async function () {
        if (modelType === "vit" && !vitRuntime) return;
        if (modelType === "cnn" && !aeRuntime) return;
        if (!testSet) return;
        btnTest.disabled = true;
        btnTrain.disabled = true;

        setStatus("Running reconstruction test...");

        if (modelType === "cnn") {
            aeRuntime.deleteContext();
            aeTrainer.deleteContext();
        }

        let totalMse = 0;
        const reconstructions = [];
        const t0 = performance.now();

        for (let i = 0; i < testSet.count; i++) {
            const sample = testSet.samples[i];
            let output, latent;

            if (modelType === "vit") {
                output = vitRuntime.reconstructPatches(sample.pixels);
                latent = vitRuntime.tokens[0].slice();
                // Log attention pairs on first sample
                if (i === 0) {
                    // Enable profiler for first sample only
                    vitRuntime.profiler.enabled = true;
                    vitRuntime.profiler.reset();
                    vitRuntime.reconstructPatches(sample.pixels);
                    log(`\n--- Profiler (1 sample) ---`);
                    log(vitRuntime.profiler.toString());
                    vitRuntime.profiler.enabled = false;
                }
            } else {
                output = aeRuntime.run(sample.pixels);
                encRuntime.deleteContext();
                latent = encRuntime.run(sample.pixels);
            }

            let mse = 0;
            for (let j = 0; j < sample.pixels.length; j++) {
                mse += Math.pow(sample.pixels[j] - (output[j] || 0), 2);
            }
            mse /= sample.pixels.length;
            totalMse += mse;

            reconstructions.push({ original: sample.pixels, reconstructed: output, latent, mse });

            if (i % 5 === 0) {
                setStatus(`Testing ${i + 1}/${testSet.count}...`);
                await new Promise(r => setTimeout(r, 0));
            }
        }

        const elapsed = performance.now() - t0;
        const avgMse = totalMse / testSet.count;

        log(`Reconstruction MSE: ${avgMse.toFixed(6)} — ${elapsed.toFixed(0)}ms (${testSet.count} samples)`);

        // Compute sparse reconstruction metrics (averaged over all test samples)
        const channelNames = ["Density", "Z max", "Z min", "Std(z)", "Reflectivity", "Velocity"];
        const sparseThresholds = [0.1, 0.15, 0.1, 0.1, 0.1, 0.05]; // Lower threshold for velocity
        let aggregatedMetrics = null;

        if (typeof S.computeReconstructionMetrics === "function") {
            // Compute per-sample then average
            const allMetrics = [];
            for (const rec of reconstructions) {
                const m = S.computeReconstructionMetrics(rec.original, rec.reconstructed, {
                    width: testSet.width, height: testSet.height, channels: 6,
                    channelNames,
                    sparseThreshold: sparseThresholds,
                    topK: 0.05,
                    minSparsePixels: 2,
                });
                allMetrics.push(m);
            }

            // Average metrics across samples
            if (allMetrics.length > 0) {
                aggregatedMetrics = JSON.parse(JSON.stringify(allMetrics[0]));
                for (let s = 1; s < allMetrics.length; s++) {
                    const m = allMetrics[s];
                    aggregatedMetrics.globalMse += m.globalMse;
                    aggregatedMetrics.avgSparseF1 += m.avgSparseF1;
                    aggregatedMetrics.avgEnergyRetention += m.avgEnergyRetention;
                    aggregatedMetrics.avgTopKHitRate += m.avgTopKHitRate;
                    aggregatedMetrics.avgContrastPreservation += m.avgContrastPreservation;
                    for (let c = 0; c < 6; c++) {
                        for (const k of ["mse", "sparseMse", "sparseRecall", "sparsePrecision", "sparseF1", "energyRetention", "topKHitRate", "contrastPreservation"]) {
                            aggregatedMetrics.channels[c][k] += m.channels[c][k];
                        }
                    }
                }
                const n = allMetrics.length;
                aggregatedMetrics.globalMse /= n;
                aggregatedMetrics.globalRmse = Math.sqrt(aggregatedMetrics.globalMse);
                aggregatedMetrics.avgSparseF1 /= n;
                aggregatedMetrics.avgEnergyRetention /= n;
                aggregatedMetrics.avgTopKHitRate /= n;
                aggregatedMetrics.avgContrastPreservation /= n;
                for (let c = 0; c < 6; c++) {
                    for (const k of ["mse", "sparseMse", "sparseRecall", "sparsePrecision", "sparseF1", "energyRetention", "topKHitRate", "contrastPreservation"]) {
                        aggregatedMetrics.channels[c][k] /= n;
                    }
                    aggregatedMetrics.channels[c].rmse = Math.sqrt(aggregatedMetrics.channels[c].mse);
                }

                // Display sparse metrics table
                const panel = document.getElementById("sparseMetricsPanel");
                const tbody = document.querySelector("#sparseMetricsTable tbody");
                tbody.innerHTML = "";
                for (const ch of aggregatedMetrics.channels) {
                    const isSparse = aggregatedMetrics.sparseChannelIndices.includes(ch.channel);
                    const tr = document.createElement("tr");
                    tr.className = isSparse ? "sparse-row" : "dense-row";
                    tr.innerHTML = `
                        <td>${ch.name || "Ch" + ch.channel}</td>
                        <td>${ch.mse.toFixed(4)}</td>
                        <td>${isSparse ? ch.sparseRecall.toFixed(3) : "-"}</td>
                        <td>${isSparse ? ch.sparsePrecision.toFixed(3) : "-"}</td>
                        <td>${isSparse ? ch.sparseF1.toFixed(3) : "-"}</td>
                        <td>${isSparse ? ch.energyRetention.toFixed(3) : "-"}</td>
                        <td>${isSparse ? ch.topKHitRate.toFixed(3) : "-"}</td>
                        <td>${isSparse ? ch.contrastPreservation.toFixed(3) : "-"}</td>
                        <td class="${isSparse ? "type-sparse" : "type-dense"}">${isSparse ? "SPARSE" : "DENSE"}</td>
                    `;
                    tbody.appendChild(tr);
                }

                const summary = document.getElementById("sparseMetricsSummary");
                summary.innerHTML = `Avg Sparse F1: <b>${aggregatedMetrics.avgSparseF1.toFixed(3)}</b> | ` +
                    `Avg Energy Retention: <b>${aggregatedMetrics.avgEnergyRetention.toFixed(3)}</b> | ` +
                    `Avg Top-K Hit: <b>${aggregatedMetrics.avgTopKHitRate.toFixed(3)}</b> | ` +
                    `Avg Contrast: <b>${aggregatedMetrics.avgContrastPreservation.toFixed(3)}</b>`;
                panel.style.display = "block";

                log(`\nSparse Metrics: F1=${aggregatedMetrics.avgSparseF1.toFixed(3)}, ERR=${aggregatedMetrics.avgEnergyRetention.toFixed(3)}, TopK=${aggregatedMetrics.avgTopKHitRate.toFixed(3)}`);
            }
        }

        resultsPanel.style.display = "block";
        document.getElementById("mse").textContent = avgMse.toFixed(4);
        document.getElementById("rmse").textContent = Math.sqrt(avgMse).toFixed(4);
        document.getElementById("duration").textContent = elapsed.toFixed(0) + "ms";
        document.getElementById("samplesCount").textContent = testSet.count;

        const container = document.getElementById("reconstructions");
        container.innerHTML = "";
        const showCount = Math.min(5, reconstructions.length);
        const sceneTypes = ["straight", "curved", "intersection", "obstacles", "empty"];

        for (let i = 0; i < showCount; i++) {
            const rec = reconstructions[i];
            const pair = document.createElement("div");
            pair.className = "sample-pair";

            const origCol = document.createElement("div");
            const origLabel = document.createElement("div");
            origLabel.className = "pair-label";
            origLabel.textContent = `Original (${sceneTypes[i % sceneTypes.length]})`;
            origCol.appendChild(origLabel);
            drawChannelRow(rec.original, testSet.width, testSet.height, origCol);
            pair.appendChild(origCol);

            const recCol = document.createElement("div");
            const recLabel = document.createElement("div");
            recLabel.className = "pair-label";
            recLabel.textContent = `Reconstructed (MSE: ${rec.mse.toFixed(4)})`;
            recCol.appendChild(recLabel);
            drawChannelRow(rec.reconstructed, testSet.width, testSet.height, recCol);
            pair.appendChild(recCol);

            const latentCol = document.createElement("div");
            const latentLabel = document.createElement("div");
            latentLabel.className = "pair-label";
            latentLabel.textContent = `Latent (${rec.latent.length}d)`;
            latentCol.appendChild(latentLabel);
            drawLatentVector(rec.latent, latentCol);
            pair.appendChild(latentCol);

            container.appendChild(pair);
        }

        setStatus(`Done — MSE: ${avgMse.toFixed(4)} — ${elapsed.toFixed(0)}ms`);
        btnTrain.disabled = false;
        btnTest.disabled = false;
    });

    btnExport.addEventListener("click", function () {
        if (!aeResult) return;

        const enc = aeResult.encoder;
        const data = {
            layerDescriptors: enc.layerDescriptors.map(d => ({
                type: d.type, width: d.width, height: d.height, channels: d.channels,
            })),
            kernels: enc.kernels.map(k => ({
                height: k.height, width: k.width, inputChannels: k.inputChannels,
                weights: Array.from(k.weights), bias: k.bias,
            })),
            denseWeights: [],
        };

        for (const desc of enc.layerDescriptors) {
            if (desc.type === "dense") {
                const layerWeights = [];
                for (const neuron of desc.neurons) {
                    const synapses = neuron.opsc() || [];
                    layerWeights.push({
                        bias: neuron.bias,
                        weights: synapses.map(s => s.weight),
                    });
                }
                data.denseWeights.push(layerWeights);
            }
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "lidar-encoder-weights.json";
        a.click();
        URL.revokeObjectURL(url);
        log("Encoder weights exported to lidar-encoder-weights.json");
    });
})();
