/**
 * SAT Benchmark - Phase 1: Statistical Validation
 *
 * Runs 10 independent trials for each architecture:
 *   - CNN Small (baseline)
 *   - ViT MAE (global attention)
 *   - SAT Local (R=1)
 *   - SAT Hierarchical (R=1,3)
 *   - SAT Progressive (R=1,inf)
 *
 * Reports: overall MSE, per-channel MSE, inference time, attention pairs
 * Output: JSON results + summary table
 *
 * Usage: node packages/dev/tools/benchmarks/sat-benchmark.cjs
 */

// Load SpikyPanda core via UMD workaround
const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '..', '..', 'core', 'bundle', 'spikypanda-core.js');
const m = {};
const mod = { exports: m };
const fn = new Function('exports', 'module', fs.readFileSync(bundlePath, 'utf8') + '; return module.exports;');
fn(m, mod);
const S = mod.exports;

// ===========================================================================
// Synthetic LiDAR Generator (copied from lidar.js)
// ===========================================================================
const CHANNELS = 6;
const CH_NAMES = ["Density", "Z_max", "Z_min", "Std_z", "Reflectivity", "Velocity"];

function gaussianNoise(sigma) {
    const u = 1 - Math.random();
    const v = 1 - Math.random();
    return sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }

function generateLidarGrid(size, sceneType) {
    const pixels = new Array(CHANNELS * size * size).fill(0);
    function set(ch, r, c, val) { pixels[ch * size * size + r * size + c] = clamp(val, 0, 1); }
    const cx = size / 2, cy = size / 2;
    const noise = () => gaussianNoise(0.03);

    switch (sceneType) {
        case "straight": {
            const roadW = size * 0.4;
            const roadL = cx - roadW / 2, roadR = cx + roadW / 2;
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
                if (c >= roadL && c <= roadR) {
                    set(0,r,c,0.8+noise()); set(1,r,c,0.05+noise()); set(2,r,c,0.0+noise());
                    set(3,r,c,0.02+noise()); set(4,r,c,0.7+noise()); set(5,r,c,0.0);
                } else {
                    set(0,r,c,0.5+noise()); set(1,r,c,0.3+0.2*Math.random()+noise()); set(2,r,c,0.0+noise());
                    set(3,r,c,0.3+0.2*Math.random()); set(4,r,c,0.3+noise()); set(5,r,c,0.0);
                }
            }
            break;
        }
        case "curved": {
            const roadW = size * 0.35, curveAmp = size * 0.2;
            for (let r = 0; r < size; r++) {
                const offset = Math.sin(r / size * Math.PI) * curveAmp;
                const roadC = cx + offset;
                for (let c = 0; c < size; c++) {
                    if (Math.abs(c - roadC) <= roadW / 2) {
                        set(0,r,c,0.8+noise()); set(1,r,c,0.05+noise()); set(2,r,c,0.0+noise());
                        set(3,r,c,0.02+noise()); set(4,r,c,0.7+noise()); set(5,r,c,0.0);
                    } else {
                        set(0,r,c,0.4+noise()); set(1,r,c,0.25+0.2*Math.random()); set(2,r,c,0.0+noise());
                        set(3,r,c,0.3+0.15*Math.random()); set(4,r,c,0.3+noise()); set(5,r,c,0.0);
                    }
                }
            }
            break;
        }
        case "intersection": {
            const roadW = size * 0.3;
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
                if (Math.abs(r - cy) <= roadW / 2 || Math.abs(c - cx) <= roadW / 2) {
                    set(0,r,c,0.85+noise()); set(1,r,c,0.05+noise()); set(2,r,c,0.0+noise());
                    set(3,r,c,0.02+noise()); set(4,r,c,0.7+noise()); set(5,r,c,0.0);
                } else {
                    set(0,r,c,0.5+noise()); set(1,r,c,0.35+0.15*Math.random()); set(2,r,c,0.0+noise());
                    set(3,r,c,0.25+0.15*Math.random()); set(4,r,c,0.3+noise()); set(5,r,c,0.0);
                }
            }
            break;
        }
        case "obstacles": {
            const roadW = size * 0.5;
            const roadL = cx - roadW / 2, roadR = cx + roadW / 2;
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
                if (c >= roadL && c <= roadR) {
                    set(0,r,c,0.8+noise()); set(1,r,c,0.05+noise()); set(2,r,c,0.0+noise());
                    set(3,r,c,0.02+noise()); set(4,r,c,0.7+noise()); set(5,r,c,0.0);
                } else {
                    set(0,r,c,0.3+noise()); set(1,r,c,0.2+0.1*Math.random()); set(2,r,c,0.0+noise());
                    set(3,r,c,0.2+0.1*Math.random()); set(4,r,c,0.3+noise()); set(5,r,c,0.0);
                }
            }
            const numObs = 2 + Math.floor(Math.random() * 3);
            for (let o = 0; o < numObs; o++) {
                const or_ = Math.floor(Math.random() * (size - 4));
                const oc = Math.floor(roadL + Math.random() * roadW);
                const oh = 2 + Math.floor(Math.random() * 3);
                const ow = 2 + Math.floor(Math.random() * 3);
                const isMoving = Math.random() > 0.5;
                for (let dr = 0; dr < oh && or_ + dr < size; dr++)
                    for (let dc = 0; dc < ow && oc + dc < size; dc++) {
                        set(0,or_+dr,oc+dc,0.9); set(1,or_+dr,oc+dc,0.5+0.3*Math.random());
                        set(2,or_+dr,oc+dc,0.05); set(3,or_+dr,oc+dc,0.05);
                        set(4,or_+dr,oc+dc,0.5+0.3*Math.random());
                        set(5,or_+dr,oc+dc,isMoving?0.5+0.5*Math.random():0);
                    }
            }
            break;
        }
        case "empty": {
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
                set(0,r,c,0.2+0.1*Math.random()+noise()); set(1,r,c,0.05+noise()); set(2,r,c,0.0+noise());
                set(3,r,c,0.03+noise()); set(4,r,c,0.25+0.1*Math.random()); set(5,r,c,0.0);
            }
            break;
        }
    }
    for (let i = 0; i < pixels.length; i++) pixels[i] = clamp(pixels[i], 0, 1);
    return pixels;
}

function generateDataset(count, size) {
    const sceneTypes = ["straight", "curved", "intersection", "obstacles", "empty"];
    const samples = [];
    for (let i = 0; i < count; i++) {
        const type = sceneTypes[i % sceneTypes.length];
        samples.push({ label: sceneTypes.indexOf(type), pixels: generateLidarGrid(size, type) });
    }
    return { count, width: size, height: size, channels: CHANNELS, format: "CHW", samples };
}

// ===========================================================================
// Per-channel MSE computation
// ===========================================================================
function computePerChannelMSE(original, reconstructed, width, height, channels) {
    const perChannel = new Array(channels).fill(0);
    const pixelsPerChannel = width * height;
    for (let ch = 0; ch < channels; ch++) {
        let mse = 0;
        for (let i = 0; i < pixelsPerChannel; i++) {
            const idx = ch * pixelsPerChannel + i;
            const diff = (reconstructed[idx] || 0) - original[idx];
            mse += diff * diff;
        }
        perChannel[ch] = mse / pixelsPerChannel;
    }
    return perChannel;
}

// ===========================================================================
// Architecture builders
// ===========================================================================
const GRID_SIZE = 16;
const PATCH_SIZE = 4;
const EMBED_DIM = 64;
const NUM_HEADS = 4;
const NUM_BLOCKS = 2;
const MLP_RATIO = 2;
const EPOCHS = 20;
const LR = 0.001;
const TRAIN_COUNT = 100;
const TEST_COUNT = 20;
const NUM_RUNS = 10;

function buildAndTrainCNN(trainData, testData, presetName) {
    const aeResult = S.buildAutoencoderFromPreset(presetName, {
        width: GRID_SIZE, height: GRID_SIZE, channels: CHANNELS, latentDim: EMBED_DIM,
    });
    const ae = aeResult.autoencoder;
    const runtime = new S.CnnInferenceRuntime(ae);
    const trainer = new S.CnnTrainingRuntime(ae, runtime, S.LossFunctions.MSE, LR, S.Optimizers.Adam());

    // Train
    for (let epoch = 0; epoch < EPOCHS; epoch++) {
        for (const sample of trainData.samples) {
            trainer.trainStep(sample.pixels, sample.pixels);
        }
    }

    // Test
    runtime.deleteContext();
    trainer.deleteContext();

    const t0 = Date.now();
    const results = { overallMSE: 0, perChannelMSE: new Array(CHANNELS).fill(0), inferenceTime: 0, attentionPairs: 0 };

    for (const sample of testData.samples) {
        const output = runtime.run(sample.pixels);
        let mse = 0;
        for (let j = 0; j < sample.pixels.length; j++) {
            mse += (sample.pixels[j] - output[j]) ** 2;
        }
        results.overallMSE += mse / sample.pixels.length;

        const chMSE = computePerChannelMSE(sample.pixels, output, GRID_SIZE, GRID_SIZE, CHANNELS);
        for (let ch = 0; ch < CHANNELS; ch++) results.perChannelMSE[ch] += chMSE[ch];
    }

    results.inferenceTime = Date.now() - t0;
    results.overallMSE /= testData.count;
    for (let ch = 0; ch < CHANNELS; ch++) results.perChannelMSE[ch] /= testData.count;

    return results;
}

function buildAndTrainViTMAE(trainData, testData) {
    const outputSize = GRID_SIZE * GRID_SIZE * CHANNELS;
    const config = {
        width: GRID_SIZE, height: GRID_SIZE, channels: CHANNELS,
        patchSize: PATCH_SIZE, embedDim: EMBED_DIM, numHeads: NUM_HEADS,
        numBlocks: NUM_BLOCKS, mlpRatio: MLP_RATIO, numClasses: outputSize,
    };
    const graph = new S.VitBuilder().withConfig(config).build();
    const runtime = new S.VitInferenceRuntime(graph);
    runtime.useSoftmax = false;
    const trainer = new S.VitTrainingRuntime(graph, runtime, S.LossFunctions.MSE, LR, S.Optimizers.Adam());

    for (let epoch = 0; epoch < EPOCHS; epoch++) {
        for (const sample of trainData.samples) {
            trainer.trainStepMAE(sample.pixels);
        }
    }

    const t0 = Date.now();
    const results = { overallMSE: 0, perChannelMSE: new Array(CHANNELS).fill(0), inferenceTime: 0, attentionPairs: 0 };

    for (const sample of testData.samples) {
        const output = runtime.reconstructPatches(sample.pixels);
        let mse = 0;
        for (let j = 0; j < sample.pixels.length; j++) {
            mse += (sample.pixels[j] - (output[j] || 0)) ** 2;
        }
        results.overallMSE += mse / sample.pixels.length;

        const chMSE = computePerChannelMSE(sample.pixels, output, GRID_SIZE, GRID_SIZE, CHANNELS);
        for (let ch = 0; ch < CHANNELS; ch++) results.perChannelMSE[ch] += chMSE[ch];
    }

    results.inferenceTime = Date.now() - t0;
    results.overallMSE /= testData.count;
    for (let ch = 0; ch < CHANNELS; ch++) results.perChannelMSE[ch] /= testData.count;

    return results;
}

function buildAndTrainSAT(trainData, testData, radius) {
    const satConfig = {
        width: GRID_SIZE, height: GRID_SIZE, channels: CHANNELS,
        patchSize: PATCH_SIZE, embedDim: EMBED_DIM, numHeads: NUM_HEADS,
        numBlocks: NUM_BLOCKS, mlpRatio: MLP_RATIO, numClasses: 10,
        radius: radius, patchDecode: true,
    };
    const graph = new S.SatBuilder().withConfig(satConfig).build();
    const runtime = new S.SatInferenceRuntime(graph);
    const trainer = new S.SatTrainingRuntime(graph, runtime, S.LossFunctions.MSE, LR);

    for (let epoch = 0; epoch < EPOCHS; epoch++) {
        for (const sample of trainData.samples) {
            trainer.trainStepMAE(sample.pixels);
        }
    }

    const t0 = Date.now();
    const results = { overallMSE: 0, perChannelMSE: new Array(CHANNELS).fill(0), inferenceTime: 0, attentionPairs: 0 };

    for (const sample of testData.samples) {
        const output = runtime.reconstructPatches(sample.pixels);
        let mse = 0;
        for (let j = 0; j < sample.pixels.length; j++) {
            mse += (sample.pixels[j] - (output[j] || 0)) ** 2;
        }
        results.overallMSE += mse / sample.pixels.length;

        const chMSE = computePerChannelMSE(sample.pixels, output, GRID_SIZE, GRID_SIZE, CHANNELS);
        for (let ch = 0; ch < CHANNELS; ch++) results.perChannelMSE[ch] += chMSE[ch];

        results.attentionPairs = runtime.attentionPairsComputed;
    }

    results.inferenceTime = Date.now() - t0;
    results.overallMSE /= testData.count;
    for (let ch = 0; ch < CHANNELS; ch++) results.perChannelMSE[ch] /= testData.count;

    return results;
}

// ===========================================================================
// Main benchmark
// ===========================================================================
const architectures = [
    { name: "CNN_Small", fn: (tr, te) => buildAndTrainCNN(tr, te, "small") },
    { name: "ViT_MAE", fn: (tr, te) => buildAndTrainViTMAE(tr, te) },
    { name: "SAT_Local_R1", fn: (tr, te) => buildAndTrainSAT(tr, te, [1, 1]) },
    { name: "SAT_Hierarchical_R1_3", fn: (tr, te) => buildAndTrainSAT(tr, te, [1, 3]) },
    { name: "SAT_Progressive_R1_inf", fn: (tr, te) => buildAndTrainSAT(tr, te, [1, Infinity]) },
];

const allResults = {};

console.log(`\nSAT Benchmark - Phase 1: Statistical Validation`);
console.log(`Grid: ${GRID_SIZE}x${GRID_SIZE}x${CHANNELS}, Patch: ${PATCH_SIZE}, Embed: ${EMBED_DIM}`);
console.log(`Epochs: ${EPOCHS}, LR: ${LR}, Train: ${TRAIN_COUNT}, Test: ${TEST_COUNT}`);
console.log(`Runs per architecture: ${NUM_RUNS}\n`);

for (const arch of architectures) {
    console.log(`--- ${arch.name} ---`);
    const runs = [];

    for (let run = 0; run < NUM_RUNS; run++) {
        // Generate fresh data each run (different random seed effect)
        const trainData = generateDataset(TRAIN_COUNT, GRID_SIZE);
        const testData = generateDataset(TEST_COUNT, GRID_SIZE);

        const result = arch.fn(trainData, testData);
        runs.push(result);
        process.stdout.write(`  Run ${run + 1}/${NUM_RUNS}: MSE=${result.overallMSE.toFixed(6)}\n`);
    }

    // Compute statistics
    const mseValues = runs.map(r => r.overallMSE);
    const mean = mseValues.reduce((a, b) => a + b, 0) / NUM_RUNS;
    const std = Math.sqrt(mseValues.reduce((a, b) => a + (b - mean) ** 2, 0) / NUM_RUNS);

    const perChMean = new Array(CHANNELS).fill(0);
    const perChStd = new Array(CHANNELS).fill(0);
    for (let ch = 0; ch < CHANNELS; ch++) {
        const chValues = runs.map(r => r.perChannelMSE[ch]);
        perChMean[ch] = chValues.reduce((a, b) => a + b, 0) / NUM_RUNS;
        perChStd[ch] = Math.sqrt(chValues.reduce((a, b) => a + (b - perChMean[ch]) ** 2, 0) / NUM_RUNS);
    }

    const avgInference = runs.reduce((a, r) => a + r.inferenceTime, 0) / NUM_RUNS;
    const avgAttnPairs = runs.reduce((a, r) => a + r.attentionPairs, 0) / NUM_RUNS;

    allResults[arch.name] = {
        runs,
        stats: {
            mseMean: mean, mseStd: std,
            perChannelMSE: perChMean.map((m, i) => ({ channel: CH_NAMES[i], mean: m, std: perChStd[i] })),
            avgInferenceMs: avgInference,
            avgAttentionPairs: avgAttnPairs,
        },
    };

    console.log(`  Mean MSE: ${mean.toFixed(6)} +/- ${std.toFixed(6)}`);
    console.log(`  Inference: ${avgInference.toFixed(0)}ms, Attn pairs: ${avgAttnPairs.toFixed(0)}`);
    console.log();
}

// ===========================================================================
// Summary table
// ===========================================================================
console.log("\n===== SUMMARY TABLE =====\n");
console.log("Architecture".padEnd(28) + "MSE (mean +/- std)".padEnd(24) + "Inference".padEnd(12) + "Attn pairs");
console.log("-".repeat(80));

for (const [name, data] of Object.entries(allResults)) {
    const s = data.stats;
    const mseTxt = `${s.mseMean.toFixed(6)} +/- ${s.mseStd.toFixed(6)}`;
    console.log(name.padEnd(28) + mseTxt.padEnd(24) + `${s.avgInferenceMs.toFixed(0)}ms`.padEnd(12) + s.avgAttentionPairs.toFixed(0));
}

console.log("\n===== PER-CHANNEL MSE =====\n");
console.log("Architecture".padEnd(28) + CH_NAMES.map(n => n.padEnd(14)).join(""));
console.log("-".repeat(28 + 14 * CHANNELS));

for (const [name, data] of Object.entries(allResults)) {
    const chTxt = data.stats.perChannelMSE.map(c => `${c.mean.toFixed(4)}`.padEnd(14)).join("");
    console.log(name.padEnd(28) + chTxt);
}

// Save full results as JSON
const outputPath = path.join(__dirname, 'sat-benchmark-results.json');
fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
console.log(`\nFull results saved to: ${outputPath}`);
