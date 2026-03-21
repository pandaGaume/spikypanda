// LiDAR Autoencoder Benchmark Script for SpikyPanda
// Runs comprehensive benchmarks for scientific paper results
// Uses CommonJS (.cjs) to avoid ESM "type":"module" conflict

const fs = require('fs');
const path = require('path');

// Load the UMD bundle via Function constructor
const m = {};
const mod = { exports: m };
const bundlePath = path.join(__dirname, 'packages/dev/core/bundle/spikypanda-core.js');
const bundleCode = fs.readFileSync(bundlePath, 'utf8');
const fn = new Function('exports', 'module', bundleCode + '; return module.exports;');
fn(m, mod);
const S = mod.exports;

// ====================== SYNTHETIC LIDAR GENERATOR ======================

const CHANNELS = 6;

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

    const cx = size / 2, cy = size / 2;
    const noise = () => gaussianNoise(0.03);

    switch (sceneType) {
        case "straight": {
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

const SCENE_TYPES = ["straight", "curved", "intersection", "obstacles", "empty"];

function generateDataset(count, size) {
    const samples = [];
    for (let i = 0; i < count; i++) {
        const type = SCENE_TYPES[i % SCENE_TYPES.length];
        const pixels = generateLidarGrid(size, type);
        samples.push({ label: SCENE_TYPES.indexOf(type), type, pixels });
    }
    return { count, width: size, height: size, channels: CHANNELS, samples };
}

function generateDatasetByType(countPerType, size) {
    const byType = {};
    for (const type of SCENE_TYPES) {
        const samples = [];
        for (let i = 0; i < countPerType; i++) {
            samples.push({ type, pixels: generateLidarGrid(size, type) });
        }
        byType[type] = samples;
    }
    return byType;
}

// ====================== BENCHMARK UTILITIES ======================

function computeMSE(original, reconstructed) {
    let sum = 0;
    for (let i = 0; i < original.length; i++) {
        const d = original[i] - reconstructed[i];
        sum += d * d;
    }
    return sum / original.length;
}

function trainAndEvaluate(preset, width, height, channels, latentDim, trainData, testData, epochs, lr) {
    // Build model
    const aeResult = S.buildAutoencoderFromPreset(preset, { width, height, channels, latentDim });
    const ae = aeResult.autoencoder;
    const modelInfo = {
        neurons: ae.nodes.length,
        synapses: ae.links.length,
        kernels: ae.kernels.length,
    };

    // Create runtimes
    const aeRuntime = new S.CnnInferenceRuntime(ae);
    const aeTrainer = new S.CnnTrainingRuntime(ae, aeRuntime, S.LossFunctions.MSE, lr, S.Optimizers.Adam());

    // Train
    const epochLosses = [];
    const trainStart = Date.now();
    for (let epoch = 0; epoch < epochs; epoch++) {
        let epochLoss = 0;
        for (let i = 0; i < trainData.length; i++) {
            const loss = aeTrainer.trainStep(trainData[i].pixels, trainData[i].pixels);
            epochLoss += loss;
        }
        epochLosses.push(epochLoss / trainData.length);
    }
    const trainTimeMs = Date.now() - trainStart;

    // Sync weights
    S.AutoencoderBuilder.syncWeights(aeResult);

    // Clear contexts before test
    aeRuntime.deleteContext();
    aeTrainer.deleteContext();

    // Evaluate on test set
    let totalMse = 0;
    const inferenceStart = Date.now();
    for (let i = 0; i < testData.length; i++) {
        const output = aeRuntime.run(testData[i].pixels);
        totalMse += computeMSE(testData[i].pixels, output);
    }
    const inferenceTimeMs = Date.now() - inferenceStart;
    const avgMse = totalMse / testData.length;

    return {
        modelInfo,
        epochLosses,
        trainTimeMs,
        testMSE: avgMse,
        testRMSE: Math.sqrt(avgMse),
        inferenceTimeMs,
        inferencePerSampleMs: inferenceTimeMs / testData.length,
        aeResult,
        aeRuntime,
    };
}

// ====================== RUN BENCHMARKS ======================

console.log("=".repeat(80));
console.log("SpikyPanda LiDAR Autoencoder - Comprehensive Benchmark Report");
console.log("=".repeat(80));
console.log(`Date: ${new Date().toISOString()}`);
console.log(`Platform: ${process.platform} ${process.arch}`);
console.log(`Node.js: ${process.version}`);
console.log();

const allResults = {};

// ---- BENCHMARK 1: Architecture Comparison ----
console.log("-".repeat(80));
console.log("BENCHMARK 1: Architecture Comparison (16x16x6, latentDim=64)");
console.log("-".repeat(80));

const trainSet16 = generateDataset(100, 16);
const testSet16 = generateDataset(50, 16);

const archResults = {};
for (const preset of ["tiny", "small"]) {
    console.log(`  Training ${preset} preset...`);
    const res = trainAndEvaluate(
        preset, 16, 16, 6, 64,
        trainSet16.samples, testSet16.samples,
        10, 0.003
    );
    archResults[preset] = {
        neurons: res.modelInfo.neurons,
        synapses: res.modelInfo.synapses,
        kernels: res.modelInfo.kernels,
        finalTrainMSE: res.epochLosses[res.epochLosses.length - 1],
        testMSE: res.testMSE,
        testRMSE: res.testRMSE,
        trainTimeMs: res.trainTimeMs,
        inferencePerSampleMs: res.inferencePerSampleMs,
    };
    console.log(`    Test MSE: ${res.testMSE.toFixed(6)}, RMSE: ${res.testRMSE.toFixed(6)}`);
    console.log(`    Train time: ${res.trainTimeMs}ms, Inference: ${res.inferencePerSampleMs.toFixed(2)}ms/sample`);
    console.log(`    Model: ${res.modelInfo.neurons} neurons, ${res.modelInfo.synapses} synapses, ${res.modelInfo.kernels} kernels`);
}
allResults.architectureComparison = archResults;

// ---- BENCHMARK 2: Latent Dimension Impact ----
console.log();
console.log("-".repeat(80));
console.log("BENCHMARK 2: Latent Dimension Impact (tiny preset, 16x16x6)");
console.log("-".repeat(80));

const latentResults = {};
for (const latentDim of [16, 32, 64, 128]) {
    console.log(`  Training with latentDim=${latentDim}...`);
    const res = trainAndEvaluate(
        "tiny", 16, 16, 6, latentDim,
        trainSet16.samples, testSet16.samples,
        10, 0.003
    );
    latentResults[latentDim] = {
        neurons: res.modelInfo.neurons,
        synapses: res.modelInfo.synapses,
        finalTrainMSE: res.epochLosses[res.epochLosses.length - 1],
        testMSE: res.testMSE,
        testRMSE: res.testRMSE,
        trainTimeMs: res.trainTimeMs,
        inferencePerSampleMs: res.inferencePerSampleMs,
        compressionRatio: (16 * 16 * 6) / latentDim,
    };
    console.log(`    Test MSE: ${res.testMSE.toFixed(6)}, RMSE: ${res.testRMSE.toFixed(6)}, Compression: ${((16*16*6)/latentDim).toFixed(1)}x`);
}
allResults.latentDimensionImpact = latentResults;

// ---- BENCHMARK 3: Training Convergence ----
console.log();
console.log("-".repeat(80));
console.log("BENCHMARK 3: Training Convergence (tiny, latentDim=64, 100 samples, 10 epochs, lr=0.003)");
console.log("-".repeat(80));

const convRes = trainAndEvaluate(
    "tiny", 16, 16, 6, 64,
    trainSet16.samples, testSet16.samples,
    10, 0.003
);
const convergenceResults = {
    epochMSE: convRes.epochLosses.map((mse, i) => ({ epoch: i + 1, mse })),
    finalTrainMSE: convRes.epochLosses[convRes.epochLosses.length - 1],
    testMSE: convRes.testMSE,
    testRMSE: convRes.testRMSE,
    totalTrainTimeMs: convRes.trainTimeMs,
};
for (const entry of convergenceResults.epochMSE) {
    console.log(`  Epoch ${entry.epoch}: MSE = ${entry.mse.toFixed(6)}`);
}
console.log(`  Final test MSE: ${convRes.testMSE.toFixed(6)}`);
allResults.trainingConvergence = convergenceResults;

// ---- BENCHMARK 4: Per-Scene-Type Reconstruction Quality ----
console.log();
console.log("-".repeat(80));
console.log("BENCHMARK 4: Per-Scene-Type Reconstruction Quality");
console.log("-".repeat(80));

// Train a model on mixed data
console.log("  Training model on mixed data (100 samples, 10 epochs)...");
const mixedRes = trainAndEvaluate(
    "tiny", 16, 16, 6, 64,
    trainSet16.samples, testSet16.samples,
    10, 0.003
);

// Now test per scene type
const perSceneTestData = generateDatasetByType(10, 16); // 10 test samples per type
const sceneResults = {};

// Clear context before per-type testing
mixedRes.aeRuntime.deleteContext();

for (const sceneType of SCENE_TYPES) {
    let totalMse = 0;
    const samples = perSceneTestData[sceneType];
    for (const sample of samples) {
        const output = mixedRes.aeRuntime.run(sample.pixels);
        totalMse += computeMSE(sample.pixels, output);
    }
    const avgMse = totalMse / samples.length;
    sceneResults[sceneType] = {
        testMSE: avgMse,
        testRMSE: Math.sqrt(avgMse),
        numSamples: samples.length,
    };
    console.log(`  ${sceneType.padEnd(14)}: MSE = ${avgMse.toFixed(6)}, RMSE = ${Math.sqrt(avgMse).toFixed(6)}`);
}
allResults.perSceneTypeQuality = sceneResults;

// ---- BENCHMARK 5: Resolution Impact ----
console.log();
console.log("-".repeat(80));
console.log("BENCHMARK 5: Resolution Impact (tiny preset, latentDim=64)");
console.log("-".repeat(80));

const resolutionResults = {};
for (const size of [8, 16]) {
    console.log(`  Training with ${size}x${size}x6 input...`);
    const trainData = generateDataset(100, size);
    const testData = generateDataset(50, size);
    const res = trainAndEvaluate(
        "tiny", size, size, 6, 64,
        trainData.samples, testData.samples,
        10, 0.003
    );
    resolutionResults[`${size}x${size}`] = {
        inputSize: size * size * 6,
        neurons: res.modelInfo.neurons,
        synapses: res.modelInfo.synapses,
        kernels: res.modelInfo.kernels,
        finalTrainMSE: res.epochLosses[res.epochLosses.length - 1],
        testMSE: res.testMSE,
        testRMSE: res.testRMSE,
        trainTimeMs: res.trainTimeMs,
        inferencePerSampleMs: res.inferencePerSampleMs,
        compressionRatio: (size * size * 6) / 64,
    };
    console.log(`    Input dims: ${size}x${size}x6 = ${size*size*6} values`);
    console.log(`    Test MSE: ${res.testMSE.toFixed(6)}, RMSE: ${res.testRMSE.toFixed(6)}`);
    console.log(`    Compression: ${((size*size*6)/64).toFixed(1)}x, Train: ${res.trainTimeMs}ms`);
}
allResults.resolutionImpact = resolutionResults;

// ====================== SUMMARY TABLES ======================
console.log();
console.log("=".repeat(80));
console.log("STRUCTURED RESULTS (JSON)");
console.log("=".repeat(80));
console.log(JSON.stringify(allResults, null, 2));

// ====================== FORMATTED TABLES ======================
console.log();
console.log("=".repeat(80));
console.log("FORMATTED TABLES FOR PAPER");
console.log("=".repeat(80));

// Table 1: Architecture Comparison
console.log();
console.log("Table 1: Architecture Comparison (16x16x6, latentDim=64, 10 epochs, lr=0.003)");
console.log("-".repeat(90));
console.log("Preset  | Neurons | Synapses | Kernels | Train MSE   | Test MSE    | Test RMSE   | Train(ms) | Inf(ms/s)");
console.log("-".repeat(90));
for (const [preset, r] of Object.entries(archResults)) {
    console.log(`${preset.padEnd(7)} | ${String(r.neurons).padEnd(7)} | ${String(r.synapses).padEnd(8)} | ${String(r.kernels).padEnd(7)} | ${r.finalTrainMSE.toFixed(6).padEnd(11)} | ${r.testMSE.toFixed(6).padEnd(11)} | ${r.testRMSE.toFixed(6).padEnd(11)} | ${String(r.trainTimeMs).padEnd(9)} | ${r.inferencePerSampleMs.toFixed(2)}`);
}

// Table 2: Latent Dimension
console.log();
console.log("Table 2: Latent Dimension Impact (tiny preset, 16x16x6, 10 epochs)");
console.log("-".repeat(90));
console.log("LatDim | Compress | Neurons | Synapses | Train MSE   | Test MSE    | Test RMSE   | Train(ms)");
console.log("-".repeat(90));
for (const [dim, r] of Object.entries(latentResults)) {
    console.log(`${String(dim).padEnd(6)} | ${(r.compressionRatio.toFixed(1)+'x').padEnd(8)} | ${String(r.neurons).padEnd(7)} | ${String(r.synapses).padEnd(8)} | ${r.finalTrainMSE.toFixed(6).padEnd(11)} | ${r.testMSE.toFixed(6).padEnd(11)} | ${r.testRMSE.toFixed(6).padEnd(11)} | ${r.trainTimeMs}`);
}

// Table 3: Convergence
console.log();
console.log("Table 3: Training Convergence (tiny, latentDim=64, 100 samples, lr=0.003)");
console.log("-".repeat(30));
console.log("Epoch | MSE");
console.log("-".repeat(30));
for (const e of convergenceResults.epochMSE) {
    console.log(`${String(e.epoch).padEnd(5)} | ${e.mse.toFixed(6)}`);
}
console.log(`Test  | ${convergenceResults.testMSE.toFixed(6)}`);

// Table 4: Per-Scene
console.log();
console.log("Table 4: Per-Scene-Type Reconstruction Quality (tiny, latentDim=64)");
console.log("-".repeat(50));
console.log("Scene Type     | Test MSE    | Test RMSE");
console.log("-".repeat(50));
for (const [type, r] of Object.entries(sceneResults)) {
    console.log(`${type.padEnd(14)} | ${r.testMSE.toFixed(6).padEnd(11)} | ${r.testRMSE.toFixed(6)}`);
}

// Table 5: Resolution
console.log();
console.log("Table 5: Resolution Impact (tiny, latentDim=64, 10 epochs)");
console.log("-".repeat(100));
console.log("Resolution | Input Size | Compress | Neurons | Synapses | Train MSE   | Test MSE    | Test RMSE   | Train(ms)");
console.log("-".repeat(100));
for (const [res, r] of Object.entries(resolutionResults)) {
    console.log(`${res.padEnd(10)} | ${String(r.inputSize).padEnd(10)} | ${(r.compressionRatio.toFixed(1)+'x').padEnd(8)} | ${String(r.neurons).padEnd(7)} | ${String(r.synapses).padEnd(8)} | ${r.finalTrainMSE.toFixed(6).padEnd(11)} | ${r.testMSE.toFixed(6).padEnd(11)} | ${r.testRMSE.toFixed(6).padEnd(11)} | ${r.trainTimeMs}`);
}

console.log();
console.log("=".repeat(80));
console.log("BENCHMARK COMPLETE");
console.log("=".repeat(80));
