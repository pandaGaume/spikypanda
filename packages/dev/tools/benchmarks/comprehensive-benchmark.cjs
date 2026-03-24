/**
 * Comprehensive Benchmark - CNN vs ViT MAE vs SAT Local
 *
 * Runs N repetitions across multiple grid sizes and latent dimensions.
 * Computes both standard MSE and sparse reconstruction metrics.
 * Outputs structured JSON results for report generation.
 *
 * Usage:
 *   node packages/dev/tools/benchmarks/comprehensive-benchmark.cjs [--runs N] [--output DIR]
 *
 * Default: 5 runs, output to packages/dev/tools/benchmarks/results/
 */

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Parse CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2);
let NUM_RUNS = 5;
let OUTPUT_DIR = path.join(__dirname, 'results');

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--runs' && args[i + 1]) NUM_RUNS = parseInt(args[++i]);
    if (args[i] === '--output' && args[i + 1]) OUTPUT_DIR = args[++i];
}

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Load SpikyPanda core
// ---------------------------------------------------------------------------
const bundlePath = path.join(__dirname, '..', '..', 'core', 'bundle', 'spikypanda-core.js');
const m = {};
const mod = { exports: m };
const fn = new Function('exports', 'module', fs.readFileSync(bundlePath, 'utf8') + '; return module.exports;');
fn(m, mod);
const S = mod.exports;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const CHANNELS = 6;
const CHANNEL_NAMES = ["Density", "Z_max", "Z_min", "Std_z", "Reflectivity", "Velocity"];
const SPARSE_THRESHOLDS = [0.1, 0.15, 0.1, 0.1, 0.1, 0.05];
const NUM_HEADS = 4;
const NUM_BLOCKS = 2;
const MLP_RATIO = 2;
const LR = 0.001;

// ---------------------------------------------------------------------------
// Test matrix
// ---------------------------------------------------------------------------
const GRID_CONFIGS = [
    { gridSize: 16, patchSize: 4, trainCount: 80, testCount: 20, epochs: 15 },
    { gridSize: 32, patchSize: 4, trainCount: 50, testCount: 20, epochs: 10 },
    { gridSize: 64, patchSize: 8, trainCount: 30, testCount: 10, epochs: 5 },
];

const LATENT_DIMS = [64, 128];

const ARCHITECTURES = ["CNN_Small", "ViT_MAE", "SAT_Local"];

// ---------------------------------------------------------------------------
// Data generation
// ---------------------------------------------------------------------------
function gaussianNoise(sigma) {
    const u = 1 - Math.random();
    const v = 1 - Math.random();
    return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

function generateLidarGrid(size, sceneType) {
    const pixels = new Array(CHANNELS * size * size).fill(0);
    function set(ch, r, c, val) { pixels[ch * size * size + r * size + c] = clamp(val, 0, 1); }
    const cx = size / 2;
    const noise = () => gaussianNoise(0.03);

    switch (sceneType) {
        case "straight": {
            const roadW = size * 0.4, roadL = cx - roadW / 2, roadR = cx + roadW / 2;
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
                if (c >= roadL && c <= roadR) {
                    set(0,r,c,0.8+noise()); set(1,r,c,0.05+noise()); set(2,r,c,noise());
                    set(3,r,c,0.02+noise()); set(4,r,c,0.7+noise()); set(5,r,c,0);
                } else {
                    set(0,r,c,0.5+noise()); set(1,r,c,0.3+0.2*Math.random()); set(2,r,c,noise());
                    set(3,r,c,0.3+0.2*Math.random()); set(4,r,c,0.3+noise()); set(5,r,c,0);
                }
            }
            break;
        }
        case "curved": {
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
                const curve = cx + Math.sin(r / size * Math.PI) * size * 0.2;
                const roadW = size * 0.35;
                if (Math.abs(c - curve) < roadW / 2) {
                    set(0,r,c,0.8+noise()); set(1,r,c,0.05+noise()); set(2,r,c,noise());
                    set(3,r,c,0.02+noise()); set(4,r,c,0.7+noise()); set(5,r,c,0);
                } else {
                    set(0,r,c,0.4+noise()); set(1,r,c,0.4+0.2*Math.random()); set(2,r,c,noise());
                    set(3,r,c,0.35+0.15*Math.random()); set(4,r,c,0.25+noise()); set(5,r,c,0);
                }
            }
            break;
        }
        case "intersection": {
            const roadW = size * 0.3;
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
                const onHRoad = Math.abs(r - cx) < roadW / 2;
                const onVRoad = Math.abs(c - cx) < roadW / 2;
                if (onHRoad || onVRoad) {
                    set(0,r,c,0.85+noise()); set(1,r,c,0.05+noise()); set(2,r,c,noise());
                    set(3,r,c,0.02+noise()); set(4,r,c,0.75+noise()); set(5,r,c,0);
                } else {
                    set(0,r,c,0.45+noise()); set(1,r,c,0.35+0.15*Math.random()); set(2,r,c,noise());
                    set(3,r,c,0.25+0.15*Math.random()); set(4,r,c,0.3+noise()); set(5,r,c,0);
                }
            }
            break;
        }
        case "obstacles": {
            const roadW = size * 0.5, roadL = cx - roadW / 2, roadR = cx + roadW / 2;
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
                if (c >= roadL && c <= roadR) {
                    set(0,r,c,0.8+noise()); set(1,r,c,0.05+noise()); set(2,r,c,noise());
                    set(3,r,c,0.02+noise()); set(4,r,c,0.7+noise()); set(5,r,c,0);
                } else {
                    set(0,r,c,0.3+noise()); set(1,r,c,0.2+0.1*Math.random()); set(2,r,c,noise());
                    set(3,r,c,0.2+0.1*Math.random()); set(4,r,c,0.3+noise()); set(5,r,c,0);
                }
            }
            const numObs = 2 + Math.floor(Math.random() * 3);
            for (let o = 0; o < numObs; o++) {
                const or_ = Math.floor(Math.random() * (size - 4));
                const oc = Math.floor(roadL + Math.random() * roadW);
                const oh = 2 + Math.floor(Math.random() * Math.max(1, size / 8));
                const ow = 2 + Math.floor(Math.random() * Math.max(1, size / 8));
                const isMoving = Math.random() > 0.5;
                for (let dr = 0; dr < oh && or_ + dr < size; dr++)
                    for (let dc = 0; dc < ow && oc + dc < size; dc++) {
                        set(0,or_+dr,oc+dc,0.9); set(1,or_+dr,oc+dc,0.5+0.3*Math.random());
                        set(2,or_+dr,oc+dc,0.05); set(3,or_+dr,oc+dc,0.05);
                        set(4,or_+dr,oc+dc,0.5+0.3*Math.random());
                        set(5,or_+dr,oc+dc,isMoving ? 0.5+0.5*Math.random() : 0);
                    }
            }
            break;
        }
        case "empty": {
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
                set(0,r,c,0.1+noise()); set(1,r,c,noise()); set(2,r,c,noise());
                set(3,r,c,0.01+noise()); set(4,r,c,0.1+noise()); set(5,r,c,0);
            }
            break;
        }
    }
    for (let i = 0; i < pixels.length; i++) pixels[i] = clamp(pixels[i], 0, 1);
    return pixels;
}

function generateDataset(count, size) {
    const types = ["straight", "curved", "intersection", "obstacles", "empty"];
    const samples = [];
    for (let i = 0; i < count; i++) samples.push({ pixels: generateLidarGrid(size, types[i % types.length]) });
    return { count, width: size, height: size, channels: CHANNELS, samples };
}

// ---------------------------------------------------------------------------
// Model builders
// ---------------------------------------------------------------------------
function buildCNN(gridSize, latentDim) {
    const result = S.buildAutoencoderFromPreset("small", {
        width: gridSize, height: gridSize, channels: CHANNELS, latentDim
    });
    const aeRuntime = new S.CnnInferenceRuntime(result.autoencoder);
    const encRuntime = new S.CnnInferenceRuntime(result.encoder);
    const trainer = new S.CnnTrainingRuntime(
        result.autoencoder, aeRuntime, S.LossFunctions.MSE, LR, S.Optimizers.Adam()
    );
    return {
        name: "CNN_Small",
        train(sample) { return trainer.trainStep(sample, sample); },
        syncWeights() { S.AutoencoderBuilder.syncWeights(result); },
        infer(sample) {
            const output = aeRuntime.run(sample);
            encRuntime.deleteContext();
            return output;
        },
        profile: null, // CNN doesn't have per-phase profiler
    };
}

function buildViT(gridSize, patchSize, latentDim) {
    const vitConfig = {
        width: gridSize, height: gridSize, channels: CHANNELS,
        patchSize, embedDim: latentDim, numHeads: NUM_HEADS,
        numBlocks: NUM_BLOCKS, mlpRatio: MLP_RATIO,
        numClasses: gridSize * gridSize * CHANNELS,
    };
    const vitGraph = new S.VitBuilder().withConfig(vitConfig).build();
    const vitRuntime = new S.VitInferenceRuntime(vitGraph);
    vitRuntime.useSoftmax = false;
    const vitTrainer = new S.VitTrainingRuntime(vitGraph, vitRuntime, S.LossFunctions.MSE, LR, S.Optimizers.Adam());
    return {
        name: "ViT_MAE",
        train(sample) { return vitTrainer.trainStepMAE(sample); },
        syncWeights() {},
        infer(sample) { return vitRuntime.reconstructPatches(sample); },
        profile(sample) {
            vitRuntime.profiler.enabled = true;
            vitRuntime.profiler.reset();
            vitRuntime.reconstructPatches(sample);
            const summary = vitRuntime.profiler.getSummary();
            vitRuntime.profiler.enabled = false;
            return summary;
        },
    };
}

function buildSAT(gridSize, patchSize, latentDim) {
    const satConfig = {
        width: gridSize, height: gridSize, channels: CHANNELS,
        patchSize, embedDim: latentDim, numHeads: NUM_HEADS,
        numBlocks: NUM_BLOCKS, mlpRatio: MLP_RATIO, numClasses: 10,
        radius: [1, 1], patchDecode: true,
    };
    const satGraph = new S.SatBuilder().withConfig(satConfig).build();
    const satRuntime = new S.SatInferenceRuntime(satGraph);
    const satTrainer = new S.SatTrainingRuntime(satGraph, satRuntime, S.LossFunctions.MSE, LR);
    return {
        name: "SAT_Local",
        train(sample) { return satTrainer.trainStepMAE(sample); },
        syncWeights() {},
        infer(sample) { return satRuntime.reconstructPatches(sample); },
        profile(sample) {
            satRuntime.profiler.enabled = true;
            satRuntime.profiler.reset();
            satRuntime.reconstructPatches(sample);
            const summary = satRuntime.profiler.getSummary();
            satRuntime.profiler.enabled = false;
            return summary;
        },
    };
}

// ---------------------------------------------------------------------------
// Metrics computation
// ---------------------------------------------------------------------------
function computeMetrics(groundTruth, prediction, gridSize) {
    if (typeof S.computeReconstructionMetrics === "function") {
        return S.computeReconstructionMetrics(groundTruth, prediction, {
            width: gridSize, height: gridSize, channels: CHANNELS,
            channelNames: CHANNEL_NAMES,
            sparseThreshold: SPARSE_THRESHOLDS,
            topK: 0.05,
            minSparsePixels: 2,
        });
    }
    // Fallback: basic MSE only
    let mse = 0;
    for (let i = 0; i < groundTruth.length; i++) mse += (prediction[i] - groundTruth[i]) ** 2;
    mse /= groundTruth.length;
    return { globalMse: mse, globalRmse: Math.sqrt(mse), channels: [], avgSparseF1: 0, avgEnergyRetention: 0, avgTopKHitRate: 0, sparseChannelIndices: [], denseChannelIndices: [] };
}

function averageMetrics(allMetrics) {
    if (allMetrics.length === 0) return null;
    const avg = JSON.parse(JSON.stringify(allMetrics[0]));
    for (let i = 1; i < allMetrics.length; i++) {
        const m = allMetrics[i];
        avg.globalMse += m.globalMse;
        avg.avgSparseF1 += m.avgSparseF1;
        avg.avgEnergyRetention += m.avgEnergyRetention;
        avg.avgTopKHitRate += m.avgTopKHitRate;
        for (let c = 0; c < avg.channels.length; c++) {
            for (const k of ["mse", "sparseMse", "sparseRecall", "sparsePrecision", "sparseF1", "energyRetention", "topKHitRate"]) {
                avg.channels[c][k] += m.channels[c][k];
            }
        }
    }
    const n = allMetrics.length;
    avg.globalMse /= n;
    avg.globalRmse = Math.sqrt(avg.globalMse);
    avg.avgSparseF1 /= n;
    avg.avgEnergyRetention /= n;
    avg.avgTopKHitRate /= n;
    for (let c = 0; c < avg.channels.length; c++) {
        for (const k of ["mse", "sparseMse", "sparseRecall", "sparsePrecision", "sparseF1", "energyRetention", "topKHitRate"]) {
            avg.channels[c][k] /= n;
        }
        avg.channels[c].rmse = Math.sqrt(avg.channels[c].mse);
    }
    return avg;
}

// ---------------------------------------------------------------------------
// Run a single experiment
// ---------------------------------------------------------------------------
function runExperiment(archName, gridSize, patchSize, latentDim, trainData, testData, epochs) {
    let model;
    try {
        if (archName === "CNN_Small") model = buildCNN(gridSize, latentDim);
        else if (archName === "ViT_MAE") model = buildViT(gridSize, patchSize, latentDim);
        else if (archName === "SAT_Local") model = buildSAT(gridSize, patchSize, latentDim);
        else throw new Error(`Unknown architecture: ${archName}`);
    } catch (e) {
        console.log(`    SKIP ${archName} (build failed: ${e.message})`);
        return null;
    }

    // Training
    const convergence = [];
    const trainStart = Date.now();
    for (let epoch = 0; epoch < epochs; epoch++) {
        let epochLoss = 0;
        for (const sample of trainData.samples) epochLoss += model.train(sample.pixels);
        const avgLoss = epochLoss / trainData.count;
        convergence.push(avgLoss);
    }
    if (archName === "CNN_Small") model.syncWeights();
    const trainTimeMs = Date.now() - trainStart;

    // Profiling (one sample)
    let profileSummary = null;
    if (model.profile) {
        try { profileSummary = model.profile(testData.samples[0].pixels); } catch (e) {}
    }

    // Testing with metrics
    const allSampleMetrics = [];
    const inferStart = Date.now();
    for (const sample of testData.samples) {
        const output = model.infer(sample.pixels);
        const outputArray = Array.isArray(output) ? output : Array.from(output || []);
        // Pad output if needed
        while (outputArray.length < sample.pixels.length) outputArray.push(0);
        const metrics = computeMetrics(sample.pixels, outputArray, gridSize);
        allSampleMetrics.push(metrics);
    }
    const inferTimeMs = Date.now() - inferStart;

    const avgMetrics = averageMetrics(allSampleMetrics);

    return {
        architecture: archName,
        gridSize,
        latentDim,
        patchSize,
        epochs,
        trainTimeMs,
        inferTimeMs,
        inferPerSampleMs: inferTimeMs / testData.count,
        convergence,
        globalMse: avgMetrics.globalMse,
        globalRmse: avgMetrics.globalRmse,
        avgSparseF1: avgMetrics.avgSparseF1,
        avgEnergyRetention: avgMetrics.avgEnergyRetention,
        avgTopKHitRate: avgMetrics.avgTopKHitRate,
        perChannel: avgMetrics.channels.map(ch => ({
            name: ch.name,
            mse: ch.mse,
            sparseF1: ch.sparseF1,
            sparseRecall: ch.sparseRecall,
            sparsePrecision: ch.sparsePrecision,
            energyRetention: ch.energyRetention,
            topKHitRate: ch.topKHitRate,
            sparsity: ch.sparsity,
        })),
        sparseChannelIndices: avgMetrics.sparseChannelIndices,
        profile: profileSummary ? {
            totalTimeMs: profileSummary.totalTimeMs,
            totalFlops: profileSummary.totalFlops,
            totalAttentionPairs: profileSummary.totalAttentionPairs,
            phases: profileSummary.phases.map(p => ({
                name: p.name, timeMs: p.timeMs, timePct: p.timePct,
                flops: p.flops, flopsPct: p.flopsPct, attentionPairs: p.attentionPairs,
            })),
        } : null,
    };
}

// ---------------------------------------------------------------------------
// Main benchmark loop
// ---------------------------------------------------------------------------
console.log("=".repeat(100));
console.log("COMPREHENSIVE BENCHMARK - CNN vs ViT MAE vs SAT Local");
console.log(`Runs: ${NUM_RUNS} | Grids: ${GRID_CONFIGS.map(c => c.gridSize + "x" + c.gridSize).join(", ")} | Latent: ${LATENT_DIMS.join(", ")}`);
console.log(`Output: ${OUTPUT_DIR}`);
console.log("=".repeat(100));

const allResults = [];
const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
let totalExperiments = GRID_CONFIGS.length * LATENT_DIMS.length * ARCHITECTURES.length * NUM_RUNS;
let completed = 0;

for (const gridCfg of GRID_CONFIGS) {
    const { gridSize, patchSize, trainCount, testCount, epochs } = gridCfg;

    for (const latentDim of LATENT_DIMS) {
        console.log(`\n${"=".repeat(80)}`);
        console.log(`Grid: ${gridSize}x${gridSize} | Patch: ${patchSize}x${patchSize} | Latent: ${latentDim} | Epochs: ${epochs}`);
        console.log("=".repeat(80));

        for (const archName of ARCHITECTURES) {
            const runResults = [];

            for (let run = 0; run < NUM_RUNS; run++) {
                completed++;
                process.stdout.write(`  [${completed}/${totalExperiments}] ${archName} latent=${latentDim} run ${run + 1}/${NUM_RUNS}...`);

                // Fresh data each run for statistical independence
                const trainData = generateDataset(trainCount, gridSize);
                const testData = generateDataset(testCount, gridSize);

                const result = runExperiment(archName, gridSize, patchSize, latentDim, trainData, testData, epochs);
                if (result) {
                    result.run = run;
                    runResults.push(result);
                    console.log(` MSE=${result.globalMse.toFixed(4)} F1=${result.avgSparseF1.toFixed(3)} ERR=${result.avgEnergyRetention.toFixed(3)} train=${result.trainTimeMs}ms`);
                } else {
                    console.log(` SKIPPED`);
                }
            }

            if (runResults.length > 0) {
                // Compute statistics across runs
                const stats = computeRunStats(runResults);
                allResults.push(stats);

                console.log(`  >> ${archName}: MSE=${stats.mse.mean.toFixed(4)}+/-${stats.mse.std.toFixed(4)} | F1=${stats.sparseF1.mean.toFixed(3)}+/-${stats.sparseF1.std.toFixed(3)} | ERR=${stats.err.mean.toFixed(3)} | Train=${stats.trainTime.mean.toFixed(0)}ms`);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------
function computeRunStats(runs) {
    const mseValues = runs.map(r => r.globalMse);
    const f1Values = runs.map(r => r.avgSparseF1);
    const errValues = runs.map(r => r.avgEnergyRetention);
    const topKValues = runs.map(r => r.avgTopKHitRate);
    const trainValues = runs.map(r => r.trainTimeMs);
    const inferValues = runs.map(r => r.inferPerSampleMs);

    // Per-channel stats
    const channelStats = [];
    if (runs[0].perChannel.length > 0) {
        for (let c = 0; c < runs[0].perChannel.length; c++) {
            channelStats.push({
                name: runs[0].perChannel[c].name,
                mse: statSummary(runs.map(r => r.perChannel[c].mse)),
                sparseF1: statSummary(runs.map(r => r.perChannel[c].sparseF1)),
                sparseRecall: statSummary(runs.map(r => r.perChannel[c].sparseRecall)),
                energyRetention: statSummary(runs.map(r => r.perChannel[c].energyRetention)),
                topKHitRate: statSummary(runs.map(r => r.perChannel[c].topKHitRate)),
            });
        }
    }

    return {
        architecture: runs[0].architecture,
        gridSize: runs[0].gridSize,
        latentDim: runs[0].latentDim,
        patchSize: runs[0].patchSize,
        epochs: runs[0].epochs,
        numRuns: runs.length,
        mse: statSummary(mseValues),
        sparseF1: statSummary(f1Values),
        err: statSummary(errValues),
        topK: statSummary(topKValues),
        trainTime: statSummary(trainValues),
        inferTime: statSummary(inferValues),
        channelStats,
        convergence: runs.map(r => r.convergence),
        profile: runs[0].profile,
        sparseChannelIndices: runs[0].sparseChannelIndices,
        rawRuns: runs,
    };
}

function statSummary(values) {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return { mean, std, min, max, values };
}

// ---------------------------------------------------------------------------
// Output results
// ---------------------------------------------------------------------------

// 1. Full JSON with all data
const fullResultsPath = path.join(OUTPUT_DIR, `benchmark-full-${timestamp}.json`);
fs.writeFileSync(fullResultsPath, JSON.stringify(allResults, null, 2));
console.log(`\nFull results: ${fullResultsPath}`);

// 2. Summary CSV for easy import into Excel/Sheets
const csvPath = path.join(OUTPUT_DIR, `benchmark-summary-${timestamp}.csv`);
const csvHeader = "Architecture,Grid,Latent,Runs,MSE_mean,MSE_std,SparseF1_mean,SparseF1_std,ERR_mean,ERR_std,TopK_mean,TopK_std,TrainTime_ms,InferTime_ms_per_sample";
const csvRows = allResults.map(r =>
    `${r.architecture},${r.gridSize}x${r.gridSize},${r.latentDim},${r.numRuns},` +
    `${r.mse.mean.toFixed(6)},${r.mse.std.toFixed(6)},` +
    `${r.sparseF1.mean.toFixed(4)},${r.sparseF1.std.toFixed(4)},` +
    `${r.err.mean.toFixed(4)},${r.err.std.toFixed(4)},` +
    `${r.topK.mean.toFixed(4)},${r.topK.std.toFixed(4)},` +
    `${r.trainTime.mean.toFixed(0)},${r.inferTime.mean.toFixed(2)}`
);
fs.writeFileSync(csvPath, [csvHeader, ...csvRows].join("\n"));
console.log(`Summary CSV: ${csvPath}`);

// 3. Per-channel CSV
const channelCsvPath = path.join(OUTPUT_DIR, `benchmark-channels-${timestamp}.csv`);
const chHeader = "Architecture,Grid,Latent,Channel,MSE_mean,MSE_std,SparseF1_mean,SparseF1_std,Recall_mean,ERR_mean,TopK_mean";
const chRows = [];
for (const r of allResults) {
    for (const ch of r.channelStats) {
        chRows.push(
            `${r.architecture},${r.gridSize}x${r.gridSize},${r.latentDim},${ch.name},` +
            `${ch.mse.mean.toFixed(6)},${ch.mse.std.toFixed(6)},` +
            `${ch.sparseF1.mean.toFixed(4)},${ch.sparseF1.std.toFixed(4)},` +
            `${ch.sparseRecall.mean.toFixed(4)},` +
            `${ch.energyRetention.mean.toFixed(4)},` +
            `${ch.topKHitRate.mean.toFixed(4)}`
        );
    }
}
fs.writeFileSync(channelCsvPath, [chHeader, ...chRows].join("\n"));
console.log(`Channel CSV: ${channelCsvPath}`);

// 4. Convergence data (loss per epoch per run)
const convPath = path.join(OUTPUT_DIR, `benchmark-convergence-${timestamp}.json`);
const convData = allResults.map(r => ({
    architecture: r.architecture,
    gridSize: r.gridSize,
    latentDim: r.latentDim,
    convergence: r.convergence,
}));
fs.writeFileSync(convPath, JSON.stringify(convData, null, 2));
console.log(`Convergence: ${convPath}`);

// 5. Profiler data
const profilerPath = path.join(OUTPUT_DIR, `benchmark-profiler-${timestamp}.json`);
const profilerData = allResults.filter(r => r.profile).map(r => ({
    architecture: r.architecture,
    gridSize: r.gridSize,
    latentDim: r.latentDim,
    profile: r.profile,
}));
fs.writeFileSync(profilerPath, JSON.stringify(profilerData, null, 2));
console.log(`Profiler: ${profilerPath}`);

// ---------------------------------------------------------------------------
// Print summary table
// ---------------------------------------------------------------------------
console.log(`\n${"=".repeat(120)}`);
console.log("SUMMARY TABLE");
console.log("=".repeat(120));
console.log(
    "Architecture".padEnd(16) +
    "Grid".padEnd(10) +
    "Latent".padEnd(8) +
    "MSE (mean+/-std)".padEnd(22) +
    "Sparse F1".padEnd(16) +
    "ERR".padEnd(12) +
    "TopK".padEnd(12) +
    "Train(ms)".padEnd(12) +
    "Infer(ms/s)"
);
console.log("-".repeat(120));

for (const r of allResults) {
    console.log(
        r.architecture.padEnd(16) +
        `${r.gridSize}x${r.gridSize}`.padEnd(10) +
        String(r.latentDim).padEnd(8) +
        `${r.mse.mean.toFixed(4)}+/-${r.mse.std.toFixed(4)}`.padEnd(22) +
        `${r.sparseF1.mean.toFixed(3)}+/-${r.sparseF1.std.toFixed(3)}`.padEnd(16) +
        `${r.err.mean.toFixed(3)}`.padEnd(12) +
        `${r.topK.mean.toFixed(3)}`.padEnd(12) +
        `${r.trainTime.mean.toFixed(0)}`.padEnd(12) +
        `${r.inferTime.mean.toFixed(1)}`
    );
}

// Per-channel F1 for sparse channels
console.log(`\n${"=".repeat(100)}`);
console.log("PER-CHANNEL SPARSE F1 (Z_max and Velocity)");
console.log("=".repeat(100));
console.log(
    "Architecture".padEnd(16) +
    "Grid".padEnd(10) +
    "Latent".padEnd(8) +
    "Z_max F1".padEnd(14) +
    "Z_max Recall".padEnd(14) +
    "Velocity F1".padEnd(14) +
    "Velocity Recall"
);
console.log("-".repeat(100));

for (const r of allResults) {
    const zmax = r.channelStats[1]; // Z_max = channel 1
    const vel = r.channelStats[5];  // Velocity = channel 5
    console.log(
        r.architecture.padEnd(16) +
        `${r.gridSize}x${r.gridSize}`.padEnd(10) +
        String(r.latentDim).padEnd(8) +
        `${zmax.sparseF1.mean.toFixed(3)}`.padEnd(14) +
        `${zmax.sparseRecall.mean.toFixed(3)}`.padEnd(14) +
        `${vel.sparseF1.mean.toFixed(3)}`.padEnd(14) +
        `${vel.sparseRecall.mean.toFixed(3)}`
    );
}

console.log(`\n${"=".repeat(100)}`);
console.log("Benchmark complete.");
console.log(`Output files in: ${OUTPUT_DIR}`);
console.log(`  - benchmark-full-${timestamp}.json (all raw data)`);
console.log(`  - benchmark-summary-${timestamp}.csv (overview)`);
console.log(`  - benchmark-channels-${timestamp}.csv (per-channel)`);
console.log(`  - benchmark-convergence-${timestamp}.json (loss curves)`);
console.log(`  - benchmark-profiler-${timestamp}.json (FLOPS/timing)`);
