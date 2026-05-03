// SpikyPanda — MNIST CNN Demo
(function () {
    const S = SpikypandaCore;

    const logEl = document.getElementById("log");
    const statusEl = document.getElementById("status");
    const progressFill = document.getElementById("progressFill");
    const btnTrain = document.getElementById("btnTrain");
    const btnTest = document.getElementById("btnTest");
    const resultsPanel = document.getElementById("resultsPanel");

    let trainData = null;
    let testData = null;
    let graph = null;
    let runtime = null;
    let trainer = null;

    function log(msg) {
        logEl.textContent += msg + "\n";
        logEl.scrollTop = logEl.scrollHeight;
    }

    function setStatus(msg) { statusEl.textContent = msg; }
    function setProgress(pct) { progressFill.style.width = pct + "%"; }

    function drawDigit(pixels, w, h, canvas) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = (w * 2) + "px";
        canvas.style.height = (h * 2) + "px";
        const ctx = canvas.getContext("2d");
        const imgData = ctx.createImageData(w, h);
        for (let i = 0; i < w * h; i++) {
            const v = Math.round(pixels[i] * 255);
            imgData.data[i * 4] = v;
            imgData.data[i * 4 + 1] = v;
            imgData.data[i * 4 + 2] = v;
            imgData.data[i * 4 + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
    }

    // Load data
    async function loadData() {
        setStatus("Loading MNIST data...");
        try {
            const [trainResp, testResp] = await Promise.all([
                fetch("data/train.json"),
                fetch("data/test.json"),
            ]);
            if (!trainResp.ok || !testResp.ok) throw new Error("Failed to load data files. Run: node scripts/prepare-mnist.mjs");
            trainData = await trainResp.json();
            testData = await testResp.json();
            log(`Loaded ${trainData.count} train + ${testData.count} test samples (${trainData.width}x${trainData.height}x${trainData.channels})`);
            setStatus("Ready. Select a preset and click Train.");
        } catch (e) {
            log("ERROR: " + e.message);
            setStatus("Failed to load data. Run: node scripts/prepare-mnist.mjs");
            btnTrain.disabled = true;
        }
    }

    let modelType = "cnn"; // "cnn" or "vit"

    // Build model (CNN or ViT)
    function buildModel() {
        const presetValue = document.getElementById("preset").value;
        const lr = parseFloat(document.getElementById("lr").value);

        if (presetValue.startsWith("vit-")) {
            // Vision Transformer
            modelType = "vit";
            const vitPreset = presetValue === "vit-tiny" ? S.VitPresets.tiny : S.VitPresets.small;
            const config = {
                ...vitPreset,
                width: trainData.width,
                height: trainData.height,
                channels: trainData.channels,
                numClasses: 10,
            };
            graph = new S.VitBuilder().withConfig(config).build();
            runtime = new S.VitInferenceRuntime(graph);
            trainer = new S.VitTrainingRuntime(graph, runtime, S.LossFunctions.CrossEntropy, lr, S.Optimizers.Adam());
            log(`Built ViT (${presetValue}): ${graph.nodes.length} neurons, ${graph.links.length} synapses, embed=${config.embedDim}, heads=${config.numHeads}, blocks=${config.numBlocks}`);
        } else {
            // CNN
            modelType = "cnn";
            graph = S.buildCnnFromPreset(presetValue, {
                width: trainData.width,
                height: trainData.height,
                channels: trainData.channels,
                numClasses: 10,
            });
            runtime = new S.CnnInferenceRuntime(graph);
            trainer = new S.CnnTrainingRuntime(graph, runtime, S.LossFunctions.CrossEntropy, lr, S.Optimizers.Adam());
            log(`Built CNN (${presetValue}): ${graph.nodes.length} neurons, ${graph.links.length} synapses, ${graph.kernels.length} kernels`);
        }
    }

    // Train
    async function train() {
        btnTrain.disabled = true;
        btnTest.disabled = true;
        const epochs = parseInt(document.getElementById("epochs").value);

        buildModel();
        setStatus("Training...");

        const totalSteps = epochs * trainData.count;
        let step = 0;

        for (let epoch = 0; epoch < epochs; epoch++) {
            let epochLoss = 0;

            for (let i = 0; i < trainData.count; i++) {
                const sample = trainData.samples[i];
                const loss = trainer.trainStep(sample.pixels, oneHot(sample.label, 10));
                epochLoss += loss;
                step++;

                if (i % 10 === 0) {
                    setProgress((step / totalSteps) * 100);
                    setStatus(`Epoch ${epoch + 1}/${epochs} — Sample ${i + 1}/${trainData.count}`);
                    await new Promise(r => setTimeout(r, 0));
                }
            }

            const avgLoss = epochLoss / trainData.count;
            log(`Epoch ${epoch + 1}/${epochs} — Avg loss: ${avgLoss.toFixed(6)}`);
        }

        setProgress(100);
        setStatus("Training complete. Click Test to evaluate.");
        log("Training finished.");
        btnTrain.disabled = false;
        btnTest.disabled = false;
    }

    // Test
    async function test() {
        if (!runtime || !testData) return;
        btnTest.disabled = true;
        btnTrain.disabled = true;

        setStatus("Running inference on test set...");

        if (runtime.deleteContext) runtime.deleteContext();
        if (trainer.deleteContext) trainer.deleteContext();
        if (runtime.clearContext) runtime.clearContext();

        let correctCount = 0;
        const predictions = [];

        const t0 = performance.now();

        for (let i = 0; i < testData.count; i++) {
            const sample = testData.samples[i];
            const output = runtime.run(sample.pixels);
            const predicted = argmax(output);
            const correct = predicted === sample.label;
            if (correct) correctCount++;
            predictions.push({ label: sample.label, predicted, correct, pixels: sample.pixels });

            if (i % 20 === 0) {
                setStatus(`Testing ${i + 1}/${testData.count}...`);
                await new Promise(r => setTimeout(r, 0));
            }
        }

        const elapsed = performance.now() - t0;
        const acc = (correctCount / testData.count * 100).toFixed(1);

        log(`Accuracy: ${acc}% (${correctCount}/${testData.count}) — ${elapsed.toFixed(0)}ms`);

        // Show results
        resultsPanel.style.display = "block";
        document.getElementById("accuracy").textContent = acc + "%";
        document.getElementById("correct").textContent = correctCount;
        document.getElementById("total").textContent = testData.count;
        document.getElementById("duration").textContent = elapsed.toFixed(0) + "ms";

        // Render prediction grid (first 60 samples)
        const grid = document.getElementById("predGrid");
        grid.innerHTML = "";
        const showCount = Math.min(60, predictions.length);
        for (let i = 0; i < showCount; i++) {
            const p = predictions[i];
            const div = document.createElement("div");
            div.className = "digit";
            const canvas = document.createElement("canvas");
            drawDigit(p.pixels, testData.width, testData.height, canvas);
            div.appendChild(canvas);
            const span = document.createElement("span");
            span.className = "pred " + (p.correct ? "correct" : "wrong");
            span.textContent = `${p.predicted}` + (p.correct ? " \u2713" : ` \u2717(${p.label})`);
            div.appendChild(span);
            grid.appendChild(div);
        }

        setStatus(`Done — Accuracy: ${acc}% — ${elapsed.toFixed(0)}ms`);
        btnTrain.disabled = false;
        btnTest.disabled = false;
    }

    btnTrain.addEventListener("click", train);
    btnTest.addEventListener("click", test);

    loadData();
})();
