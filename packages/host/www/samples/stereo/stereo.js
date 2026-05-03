// SpikyPanda — Stereo Depth Estimation Demo
(function () {
    const S = SpikypandaCore;

    const logEl = document.getElementById("log");
    const statusEl = document.getElementById("status");
    const progressFill = document.getElementById("progressFill");
    const btnGenerate = document.getElementById("btnGenerate");
    const btnTrain = document.getElementById("btnTrain");
    const btnTest = document.getElementById("btnTest");
    const resultsPanel = document.getElementById("resultsPanel");
    const lossCanvas = document.getElementById("lossCanvas");

    let trainSet = null;
    let testSet = null;
    let stereoGraph = null;
    let inferenceRuntime = null;
    let trainingRuntime = null;
    const lossHistory = [];

    // Preset parameters
    const PRESETS = {
        tiny: { width: 16, height: 16, maxDisparity: 8, outW: 14, outH: 14 },
        small: { width: 32, height: 32, maxDisparity: 16, outW: 28, outH: 28 },
    };

    function log(msg) {
        logEl.textContent += msg + "\n";
        logEl.scrollTop = logEl.scrollHeight;
    }
    function setStatus(msg) { statusEl.textContent = msg; }
    function setProgress(pct) { progressFill.style.width = pct + "%"; }

    // ====================== SYNTHETIC STEREO PAIR GENERATOR ======================

    function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

    function gaussianNoise(sigma) {
        const u = 1 - Math.random();
        const v = 1 - Math.random();
        return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    }

    /**
     * Generates a synthetic stereo pair with ground truth disparity.
     * Creates a simple 2D scene with rectangles at known depths.
     * Left image: grayscale scene.
     * Right image: same scene but rectangles shifted horizontally by disparity.
     * Ground truth: normalized disparity map (output resolution).
     */
    function generateStereoPair(width, height, outW, outH, maxDisparity, sceneType) {
        const leftPixels = new Array(width * height).fill(0);
        const rightPixels = new Array(width * height).fill(0);
        // Disparity map at full input resolution first
        const disparityFull = new Array(width * height).fill(0);

        // Background intensity and disparity (far away = low disparity)
        const bgIntensity = 0.1 + Math.random() * 0.15;
        const bgDisparity = 0; // background at infinity

        // Fill background — SAME texture in L and R (stereo sees the same scene)
        // Only sensor noise differs slightly between cameras
        for (let i = 0; i < width * height; i++) {
            const texture = bgIntensity + gaussianNoise(0.05); // shared texture
            const sensorNoise = 0.005; // tiny per-camera noise
            leftPixels[i] = clamp(texture + gaussianNoise(sensorNoise), 0, 1);
            rightPixels[i] = clamp(texture + gaussianNoise(sensorNoise), 0, 1);
            disparityFull[i] = bgDisparity;
        }

        // Scene-specific rectangles
        let rects = [];

        switch (sceneType) {
            case "empty":
                // Just background, no obstacles
                break;

            case "single": {
                // One rectangle at a random depth
                const depth = 2 + Math.random() * 6; // depth in arbitrary units
                const disp = Math.min(maxDisparity, Math.round(8 / depth)); // baseline*focal/depth
                const intensity = 0.4 + Math.random() * 0.5;
                const rw = 3 + Math.floor(Math.random() * (width / 3));
                const rh = 3 + Math.floor(Math.random() * (height / 3));
                const rx = Math.floor(Math.random() * (width - rw - disp));
                const ry = Math.floor(Math.random() * (height - rh));
                rects.push({ rx, ry, rw, rh, intensity, disp });
                break;
            }

            case "multiple": {
                // 2-3 rectangles at different depths
                const numRects = 2 + Math.floor(Math.random() * 2);
                for (let n = 0; n < numRects; n++) {
                    const depth = 1.5 + Math.random() * 7;
                    const disp = Math.min(maxDisparity, Math.round(8 / depth));
                    const intensity = 0.3 + Math.random() * 0.6;
                    const rw = 2 + Math.floor(Math.random() * (width / 4));
                    const rh = 2 + Math.floor(Math.random() * (height / 4));
                    const rx = Math.floor(Math.random() * Math.max(1, width - rw - disp));
                    const ry = Math.floor(Math.random() * Math.max(1, height - rh));
                    rects.push({ rx, ry, rw, rh, intensity, disp });
                }
                break;
            }

            case "corridor": {
                // Walls on left and right sides
                const wallWidth = 2 + Math.floor(Math.random() * 3);
                const wallIntensity = 0.5 + Math.random() * 0.3;

                // Left wall (close, high disparity)
                const leftDisp = Math.min(maxDisparity, 3 + Math.floor(Math.random() * 4));
                rects.push({
                    rx: 0, ry: 0, rw: wallWidth, rh: height,
                    intensity: wallIntensity, disp: leftDisp
                });

                // Right wall (close, high disparity)
                const rightDisp = Math.min(maxDisparity, 3 + Math.floor(Math.random() * 4));
                rects.push({
                    rx: Math.max(0, width - wallWidth - rightDisp), ry: 0,
                    rw: wallWidth, rh: height,
                    intensity: wallIntensity * 0.9, disp: rightDisp
                });

                // Optional obstacle in corridor
                if (Math.random() > 0.5) {
                    const depth = 2 + Math.random() * 4;
                    const disp = Math.min(maxDisparity, Math.round(8 / depth));
                    const obsW = 2 + Math.floor(Math.random() * 3);
                    const obsH = 2 + Math.floor(Math.random() * 3);
                    const ox = wallWidth + 1 + Math.floor(Math.random() * Math.max(1, width - 2 * wallWidth - obsW - disp));
                    const oy = Math.floor(Math.random() * Math.max(1, height - obsH));
                    rects.push({
                        rx: ox, ry: oy, rw: obsW, rh: obsH,
                        intensity: 0.6 + Math.random() * 0.3, disp: disp
                    });
                }
                break;
            }
        }

        // Render rectangles (later rects occlude earlier ones)
        // Key: SAME pixel value in L and R — only the position differs by disparity
        for (const rect of rects) {
            const { rx, ry, rw, rh, intensity, disp } = rect;
            // Pre-generate texture for this rectangle (shared between L and R)
            const rectTexture = [];
            for (let i = 0; i < rw * rh; i++) {
                rectTexture.push(clamp(intensity + gaussianNoise(0.03), 0, 1));
            }

            for (let r = ry; r < ry + rh && r < height; r++) {
                for (let c = rx; c < rx + rw && c < width; c++) {
                    const texIdx = (r - ry) * rw + (c - rx);
                    const pixVal = rectTexture[texIdx];

                    const idx = r * width + c;
                    leftPixels[idx] = pixVal;
                    disparityFull[idx] = disp / maxDisparity; // normalize to [0, 1]

                    // Right image: same texture, shifted left by disparity
                    const rc = c - disp;
                    if (rc >= 0 && rc < width) {
                        const rIdx = r * width + rc;
                        rightPixels[rIdx] = pixVal;
                    }
                }
            }
        }

        // Clamp all pixel values
        for (let i = 0; i < width * height; i++) {
            leftPixels[i] = clamp(leftPixels[i], 0, 1);
            rightPixels[i] = clamp(rightPixels[i], 0, 1);
            disparityFull[i] = clamp(disparityFull[i], 0, 1);
        }

        // Downsample disparity to output resolution if needed
        const disparity = new Array(outW * outH).fill(0);
        const scaleX = width / outW;
        const scaleY = height / outH;
        for (let r = 0; r < outH; r++) {
            for (let c = 0; c < outW; c++) {
                const srcR = Math.min(height - 1, Math.floor(r * scaleY));
                const srcC = Math.min(width - 1, Math.floor(c * scaleX));
                disparity[r * outW + c] = disparityFull[srcR * width + srcC];
            }
        }

        return { leftPixels, rightPixels, disparity, sceneType };
    }

    function generateDataset(count, width, height, outW, outH, maxDisparity) {
        const sceneTypes = ["empty", "single", "multiple", "corridor"];
        const samples = [];
        for (let i = 0; i < count; i++) {
            const type = sceneTypes[i % sceneTypes.length];
            const pair = generateStereoPair(width, height, outW, outH, maxDisparity, type);
            samples.push(pair);
        }
        return { count, width, height, outW, outH, maxDisparity, samples };
    }

    // ====================== VISUALIZATION ======================

    // Heat colormap: black -> blue -> cyan -> green -> yellow -> red -> white
    function heatColor(t) {
        t = clamp(t, 0, 1);
        let r, g, b;
        if (t < 0.2) {
            const s = t / 0.2;
            r = 0; g = 0; b = Math.round(128 + 127 * s);
        } else if (t < 0.4) {
            const s = (t - 0.2) / 0.2;
            r = 0; g = Math.round(255 * s); b = 255;
        } else if (t < 0.6) {
            const s = (t - 0.4) / 0.2;
            r = Math.round(255 * s); g = 255; b = Math.round(255 * (1 - s));
        } else if (t < 0.8) {
            const s = (t - 0.6) / 0.2;
            r = 255; g = Math.round(255 * (1 - s)); b = 0;
        } else {
            const s = (t - 0.8) / 0.2;
            r = 255; g = Math.round(255 * s); b = Math.round(255 * s);
        }
        return [r, g, b];
    }

    // Scale factor for rendering small grids larger
    const RENDER_SCALE = 6;

    function drawImage(pixels, w, h, canvas, mode, normalizeRange, forceMin, forceMax) {
        const scale = RENDER_SCALE;
        canvas.width = w * scale;
        canvas.height = h * scale;
        canvas.style.width = (w * scale) + "px";
        canvas.style.height = (h * scale) + "px";
        canvas.style.imageRendering = "pixelated";
        const ctx = canvas.getContext("2d");

        // Find min/max for normalization
        let minVal, maxVal;
        if (forceMin !== undefined && forceMax !== undefined) {
            minVal = forceMin;
            maxVal = forceMax;
        } else if (normalizeRange) {
            minVal = Infinity; maxVal = -Infinity;
            for (let i = 0; i < pixels.length; i++) {
                if (pixels[i] < minVal) minVal = pixels[i];
                if (pixels[i] > maxVal) maxVal = pixels[i];
            }
        } else {
            minVal = 0; maxVal = 1;
        }
        const range = maxVal - minVal || 1;

        for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
                const rawVal = pixels[r * w + c] || 0;
                const normVal = (rawVal - minVal) / range;

                let color;
                if (mode === "grayscale") {
                    const v = Math.round(clamp(normVal, 0, 1) * 255);
                    color = [v, v, v];
                } else {
                    color = heatColor(normVal);
                }

                ctx.fillStyle = `rgb(${color[0]},${color[1]},${color[2]})`;
                ctx.fillRect(c * scale, r * scale, scale, scale);
            }
        }
    }

    function makeGridItem(pixels, w, h, label, mode, normalizeRange, forceMin, forceMax) {
        const item = document.createElement("div");
        item.className = "grid-item";
        const canvas = document.createElement("canvas");
        drawImage(pixels, w, h, canvas, mode || "grayscale", normalizeRange || false, forceMin, forceMax);
        item.appendChild(canvas);
        const labelEl = document.createElement("div");
        labelEl.className = "ch-label";
        labelEl.textContent = label;
        item.appendChild(labelEl);
        return item;
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
        const presetValue = document.getElementById("preset").value;
        const count = parseInt(document.getElementById("numSamples").value);
        const p = PRESETS[presetValue];

        log(`Generating ${count} synthetic stereo pairs (${p.width}x${p.height}, maxDisp=${p.maxDisparity})...`);
        setStatus("Generating...");

        const testCount = Math.max(10, Math.floor(count * 0.2));
        trainSet = generateDataset(count, p.width, p.height, p.outW, p.outH, p.maxDisparity);
        testSet = generateDataset(testCount, p.width, p.height, p.outW, p.outH, p.maxDisparity);

        log(`Generated ${trainSet.count} train + ${testSet.count} test stereo pairs`);
        setStatus("Data ready. Click Train.");
        btnTrain.disabled = false;
    });

    btnTrain.addEventListener("click", async function () {
        btnTrain.disabled = true;
        btnTest.disabled = true;
        btnGenerate.disabled = true;
        lossHistory.length = 0;

        const presetValue = document.getElementById("preset").value;
        const epochs = parseInt(document.getElementById("epochs").value);
        const lr = parseFloat(document.getElementById("lr").value);

        log(`Building stereo CNN (${presetValue})...`);
        setStatus("Building model...");

        try {
            stereoGraph = S.buildStereoFromPreset(presetValue);
        } catch (e) {
            log("ERROR building model: " + e.message);
            setStatus("Build failed.");
            btnTrain.disabled = false;
            btnGenerate.disabled = false;
            return;
        }

        log(`Stereo CNN: ${stereoGraph.nodes.length} neurons, ${stereoGraph.links.length} synapses, ${stereoGraph.kernels.length} kernels`);
        log(`Cross-kernels: ${stereoGraph.crossKernels.length}, Shared-kernels: ${stereoGraph.sharedKernels.length}`);

        inferenceRuntime = new S.StereoInferenceRuntime(stereoGraph);
        trainingRuntime = new S.StereoTrainingRuntime(
            stereoGraph, inferenceRuntime, S.LossFunctions.MSE, lr, S.Optimizers.Adam()
        );

        setStatus("Training...");
        const totalSteps = epochs * trainSet.count;
        let step = 0;

        for (let epoch = 0; epoch < epochs; epoch++) {
            let epochLoss = 0;

            for (let i = 0; i < trainSet.count; i++) {
                const sample = trainSet.samples[i];
                const loss = trainingRuntime.trainStep(
                    sample.leftPixels, sample.rightPixels, sample.disparity
                );
                epochLoss += loss;
                step++;

                if (i % 5 === 0) {
                    setProgress((step / totalSteps) * 100);
                    setStatus(`Epoch ${epoch + 1}/${epochs} - Sample ${i + 1}/${trainSet.count}`);
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            const avgLoss = epochLoss / trainSet.count;
            lossHistory.push(avgLoss);
            drawLossChart();
            log(`Epoch ${epoch + 1}/${epochs} - Avg Loss: ${avgLoss.toFixed(6)}`);
        }

        setProgress(100);
        setStatus("Training complete. Click Test to evaluate.");
        log("Training finished.");
        btnTrain.disabled = false;
        btnTest.disabled = false;
        btnGenerate.disabled = false;
    });

    btnTest.addEventListener("click", async function () {
        if (!inferenceRuntime || !testSet) return;
        btnTest.disabled = true;
        btnTrain.disabled = true;

        setStatus("Running disparity estimation test...");

        let totalMse = 0;
        const results = [];
        const t0 = performance.now();

        for (let i = 0; i < testSet.count; i++) {
            const sample = testSet.samples[i];
            const output = inferenceRuntime.run(sample.leftPixels, sample.rightPixels);

            let mse = 0;
            for (let j = 0; j < sample.disparity.length; j++) {
                mse += Math.pow(sample.disparity[j] - (output[j] || 0), 2);
            }
            mse /= sample.disparity.length;
            totalMse += mse;

            results.push({
                leftPixels: sample.leftPixels,
                rightPixels: sample.rightPixels,
                groundTruth: sample.disparity,
                predicted: output,
                sceneType: sample.sceneType,
                mse,
            });

            if (i % 5 === 0) {
                setStatus(`Testing ${i + 1}/${testSet.count}...`);
                await new Promise(r => setTimeout(r, 0));
            }
        }

        const elapsed = performance.now() - t0;
        const avgMse = totalMse / testSet.count;

        log(`Disparity MSE: ${avgMse.toFixed(6)} - ${elapsed.toFixed(0)}ms (${testSet.count} samples)`);

        resultsPanel.style.display = "block";
        document.getElementById("mse").textContent = avgMse.toFixed(4);
        document.getElementById("rmse").textContent = Math.sqrt(avgMse).toFixed(4);
        document.getElementById("duration").textContent = elapsed.toFixed(0) + "ms";
        document.getElementById("samplesCount").textContent = testSet.count;

        const container = document.getElementById("reconstructions");
        container.innerHTML = "";
        const showCount = Math.min(5, results.length);

        for (let i = 0; i < showCount; i++) {
            const rec = results[i];
            const pair = document.createElement("div");
            pair.className = "sample-pair";

            // Left image (grayscale, fixed range 0-1)
            const leftCol = document.createElement("div");
            leftCol.appendChild(makeGridItem(
                rec.leftPixels, testSet.width, testSet.height,
                "Left Image", "grayscale", false
            ));
            pair.appendChild(leftCol);

            // Right image (grayscale, fixed range 0-1)
            const rightCol = document.createElement("div");
            rightCol.appendChild(makeGridItem(
                rec.rightPixels, testSet.width, testSet.height,
                "Right Image", "grayscale", false
            ));
            pair.appendChild(rightCol);

            // Find shared range from GT for consistent colormap
            let gtMin = Infinity, gtMax = -Infinity;
            for (let j = 0; j < rec.groundTruth.length; j++) {
                if (rec.groundTruth[j] < gtMin) gtMin = rec.groundTruth[j];
                if (rec.groundTruth[j] > gtMax) gtMax = rec.groundTruth[j];
            }
            // Also consider prediction range to catch overshoot
            for (let j = 0; j < rec.predicted.length; j++) {
                if (rec.predicted[j] < gtMin) gtMin = rec.predicted[j];
                if (rec.predicted[j] > gtMax) gtMax = rec.predicted[j];
            }

            // Ground truth disparity (heat colormap, shared range)
            const gtCol = document.createElement("div");
            gtCol.appendChild(makeGridItem(
                rec.groundTruth, testSet.outW, testSet.outH,
                "GT Disparity", "heat", false, gtMin, gtMax
            ));
            pair.appendChild(gtCol);

            // Predicted disparity (heat colormap, same range as GT)
            const predCol = document.createElement("div");
            predCol.appendChild(makeGridItem(
                rec.predicted, testSet.outW, testSet.outH,
                `Predicted (MSE: ${rec.mse.toFixed(4)})`, "heat", false, gtMin, gtMax
            ));
            pair.appendChild(predCol);

            // Scene type label
            const typeLabel = document.createElement("div");
            typeLabel.style.cssText = "font-size:0.7em; color:var(--text-muted); align-self:center;";
            typeLabel.textContent = rec.sceneType;
            pair.appendChild(typeLabel);

            container.appendChild(pair);
        }

        setStatus(`Done - MSE: ${avgMse.toFixed(4)} - ${elapsed.toFixed(0)}ms`);
        btnTrain.disabled = false;
        btnTest.disabled = false;
    });
})();
