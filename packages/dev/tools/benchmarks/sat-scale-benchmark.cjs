/**
 * SAT Scale Benchmark - Tests at different grid sizes with profiling
 *
 * Compares ViT MAE vs SAT Local at 16x16, 32x32, 64x64
 * Reports: training time, inference time, FLOPS breakdown per phase
 *
 * Usage: node packages/dev/tools/benchmarks/sat-scale-benchmark.cjs
 */

const fs = require('fs');
const path = require('path');

const bundlePath = path.join(__dirname, '..', '..', 'core', 'bundle', 'spikypanda-core.js');
const m = {};
const mod = { exports: m };
const fn = new Function('exports', 'module', fs.readFileSync(bundlePath, 'utf8') + '; return module.exports;');
fn(m, mod);
const S = mod.exports;

const CHANNELS = 6;

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
            const roadW = size * 0.4, roadL = cx - roadW / 2, roadR = cx + roadW / 2;
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
                if (c >= roadL && c <= roadR) { set(0,r,c,0.8+noise()); set(1,r,c,0.05+noise()); set(2,r,c,noise()); set(3,r,c,0.02+noise()); set(4,r,c,0.7+noise()); set(5,r,c,0); }
                else { set(0,r,c,0.5+noise()); set(1,r,c,0.3+0.2*Math.random()); set(2,r,c,noise()); set(3,r,c,0.3+0.2*Math.random()); set(4,r,c,0.3+noise()); set(5,r,c,0); }
            } break;
        }
        case "obstacles": {
            const roadW = size * 0.5, roadL = cx - roadW / 2, roadR = cx + roadW / 2;
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
                if (c >= roadL && c <= roadR) { set(0,r,c,0.8+noise()); set(1,r,c,0.05+noise()); set(2,r,c,noise()); set(3,r,c,0.02+noise()); set(4,r,c,0.7+noise()); set(5,r,c,0); }
                else { set(0,r,c,0.3+noise()); set(1,r,c,0.2+0.1*Math.random()); set(2,r,c,noise()); set(3,r,c,0.2+0.1*Math.random()); set(4,r,c,0.3+noise()); set(5,r,c,0); }
            }
            const numObs = 2 + Math.floor(Math.random() * 3);
            for (let o = 0; o < numObs; o++) {
                const or_ = Math.floor(Math.random() * (size - 4));
                const oc = Math.floor(roadL + Math.random() * roadW);
                const oh = 2 + Math.floor(Math.random() * 3), ow = 2 + Math.floor(Math.random() * 3);
                const isMoving = Math.random() > 0.5;
                for (let dr = 0; dr < oh && or_ + dr < size; dr++)
                    for (let dc = 0; dc < ow && oc + dc < size; dc++) {
                        set(0,or_+dr,oc+dc,0.9); set(1,or_+dr,oc+dc,0.5+0.3*Math.random());
                        set(2,or_+dr,oc+dc,0.05); set(3,or_+dr,oc+dc,0.05);
                        set(4,or_+dr,oc+dc,0.5+0.3*Math.random()); set(5,or_+dr,oc+dc,isMoving?0.5+0.5*Math.random():0);
                    }
            } break;
        }
        default: {
            for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
                set(0,r,c,0.5+noise()); set(1,r,c,0.2+0.2*Math.random()); set(2,r,c,noise());
                set(3,r,c,0.15+0.1*Math.random()); set(4,r,c,0.4+noise()); set(5,r,c,0);
            } break;
        }
    }
    for (let i = 0; i < pixels.length; i++) pixels[i] = clamp(pixels[i], 0, 1);
    return pixels;
}

function generateDataset(count, size) {
    const types = ["straight", "obstacles", "straight", "obstacles", "straight"];
    const samples = [];
    for (let i = 0; i < count; i++) samples.push({ pixels: generateLidarGrid(size, types[i % types.length]) });
    return { count, width: size, height: size, channels: CHANNELS, samples };
}

// ===========================================================================
// Test configurations
// ===========================================================================
const configs = [
    { gridSize: 16, patchSize: 4, trainCount: 50, testCount: 10, epochs: 10 },
    { gridSize: 32, patchSize: 4, trainCount: 30, testCount: 10, epochs: 5 },
    { gridSize: 64, patchSize: 8, trainCount: 20, testCount: 5, epochs: 3 },
];

const EMBED_DIM = 64;
const NUM_HEADS = 4;
const NUM_BLOCKS = 2;
const MLP_RATIO = 2;
const LR = 0.001;

console.log("SAT Scale Benchmark - ViT MAE vs SAT Local at multiple grid sizes\n");
console.log("=".repeat(90));

for (const cfg of configs) {
    const { gridSize, patchSize, trainCount, testCount, epochs } = cfg;
    const numPatches = (gridSize / patchSize) ** 2;
    const numTokens = numPatches + 1;

    console.log(`\n${"=".repeat(90)}`);
    console.log(`Grid: ${gridSize}x${gridSize}x${CHANNELS}, Patch: ${patchSize}x${patchSize}, Tokens: ${numTokens}, Epochs: ${epochs}`);
    console.log(`${"=".repeat(90)}`);

    const trainData = generateDataset(trainCount, gridSize);
    const testData = generateDataset(testCount, gridSize);

    // --- ViT MAE ---
    console.log(`\n--- ViT MAE (global attention) ---`);
    const vitConfig = {
        width: gridSize, height: gridSize, channels: CHANNELS,
        patchSize, embedDim: EMBED_DIM, numHeads: NUM_HEADS,
        numBlocks: NUM_BLOCKS, mlpRatio: MLP_RATIO,
        numClasses: gridSize * gridSize * CHANNELS,
    };
    const vitGraph = new S.VitBuilder().withConfig(vitConfig).build();
    const vitRuntime = new S.VitInferenceRuntime(vitGraph);
    vitRuntime.useSoftmax = false;
    const vitTrainer = new S.VitTrainingRuntime(vitGraph, vitRuntime, S.LossFunctions.MSE, LR, S.Optimizers.Adam());

    const vitTrainStart = Date.now();
    for (let epoch = 0; epoch < epochs; epoch++) {
        let loss = 0;
        for (const sample of trainData.samples) loss += vitTrainer.trainStepMAE(sample.pixels);
        console.log(`  Epoch ${epoch + 1}/${epochs} - MSE: ${(loss / trainCount).toFixed(6)}`);
    }
    const vitTrainTime = Date.now() - vitTrainStart;

    // Profile one sample
    vitRuntime.profiler.enabled = true;
    vitRuntime.profiler.reset();
    vitRuntime.reconstructPatches(testData.samples[0].pixels);
    const vitProfile = vitRuntime.profiler.getSummary();
    vitRuntime.profiler.enabled = false;

    // Test
    const vitTestStart = Date.now();
    let vitMSE = 0;
    for (const sample of testData.samples) {
        const output = vitRuntime.reconstructPatches(sample.pixels);
        for (let j = 0; j < sample.pixels.length; j++) vitMSE += ((output[j] || 0) - sample.pixels[j]) ** 2;
    }
    const vitTestTime = Date.now() - vitTestStart;
    vitMSE /= testCount * gridSize * gridSize * CHANNELS;

    console.log(`  Training: ${vitTrainTime}ms`);
    console.log(`  Test MSE: ${vitMSE.toFixed(6)} (${vitTestTime}ms for ${testCount} samples)`);
    console.log(`  Profile (1 sample):`);
    console.log(vitRuntime.profiler.toString());

    // --- SAT Local ---
    console.log(`\n--- SAT Local R=1 ---`);
    const satConfig = {
        width: gridSize, height: gridSize, channels: CHANNELS,
        patchSize, embedDim: EMBED_DIM, numHeads: NUM_HEADS,
        numBlocks: NUM_BLOCKS, mlpRatio: MLP_RATIO, numClasses: 10,
        radius: [1, 1], patchDecode: true,
    };
    const satGraph = new S.SatBuilder().withConfig(satConfig).build();
    const satRuntime = new S.SatInferenceRuntime(satGraph);
    const satTrainer = new S.SatTrainingRuntime(satGraph, satRuntime, S.LossFunctions.MSE, LR);

    const satTrainStart = Date.now();
    for (let epoch = 0; epoch < epochs; epoch++) {
        let loss = 0;
        for (const sample of trainData.samples) loss += satTrainer.trainStepMAE(sample.pixels);
        console.log(`  Epoch ${epoch + 1}/${epochs} - MSE: ${(loss / trainCount).toFixed(6)}`);
    }
    const satTrainTime = Date.now() - satTrainStart;

    // Profile one sample
    satRuntime.profiler.enabled = true;
    satRuntime.profiler.reset();
    satRuntime.reconstructPatches(testData.samples[0].pixels);
    const satProfile = satRuntime.profiler.getSummary();
    satRuntime.profiler.enabled = false;

    // Test
    const satTestStart = Date.now();
    let satMSE = 0;
    for (const sample of testData.samples) {
        const output = satRuntime.reconstructPatches(sample.pixels);
        for (let j = 0; j < sample.pixels.length; j++) satMSE += ((output[j] || 0) - sample.pixels[j]) ** 2;
    }
    const satTestTime = Date.now() - satTestStart;
    satMSE /= testCount * gridSize * gridSize * CHANNELS;

    console.log(`  Training: ${satTrainTime}ms`);
    console.log(`  Test MSE: ${satMSE.toFixed(6)} (${satTestTime}ms for ${testCount} samples)`);
    console.log(`  Profile (1 sample):`);
    console.log(satRuntime.profiler.toString());

    // --- Comparison ---
    console.log(`\n--- Comparison at ${gridSize}x${gridSize} ---`);
    console.log(`  Training speedup: ${(vitTrainTime / satTrainTime).toFixed(2)}x (ViT: ${vitTrainTime}ms, SAT: ${satTrainTime}ms)`);
    console.log(`  Inference speedup: ${(vitTestTime / satTestTime).toFixed(2)}x (ViT: ${vitTestTime}ms, SAT: ${satTestTime}ms)`);
    console.log(`  FLOPS ratio: ${(vitProfile.totalFlops / satProfile.totalFlops).toFixed(2)}x (ViT: ${vitProfile.totalFlops}, SAT: ${satProfile.totalFlops})`);
    console.log(`  Attn pairs ratio: ${(vitProfile.totalAttentionPairs / satProfile.totalAttentionPairs).toFixed(1)}x (ViT: ${vitProfile.totalAttentionPairs}, SAT: ${satProfile.totalAttentionPairs})`);
    console.log(`  MSE: ViT=${vitMSE.toFixed(6)}, SAT=${satMSE.toFixed(6)}`);

    // Phase-by-phase comparison
    console.log(`\n  Phase-by-phase comparison:`);
    console.log(`  ${"Phase".padEnd(20)} ${"ViT Time%".padEnd(12)} ${"SAT Time%".padEnd(12)} ${"ViT FLOPS%".padEnd(12)} ${"SAT FLOPS%".padEnd(12)}`);
    console.log(`  ${"-".repeat(68)}`);
    const phaseNames = ["patch_embedding", "layernorm", "attention_qkv", "attention_scores", "attention_proj", "mlp", "head", "patch_decoder"];
    for (const phaseName of phaseNames) {
        const vp = vitProfile.phases.find(p => p.name === phaseName);
        const sp = satProfile.phases.find(p => p.name === phaseName);
        const vTimePct = vp ? vp.timePct.toFixed(1) + "%" : "-";
        const sTimePct = sp ? sp.timePct.toFixed(1) + "%" : "-";
        const vFlopsPct = vp ? vp.flopsPct.toFixed(1) + "%" : "-";
        const sFlopsPct = sp ? sp.flopsPct.toFixed(1) + "%" : "-";
        console.log(`  ${phaseName.padEnd(20)} ${vTimePct.padEnd(12)} ${sTimePct.padEnd(12)} ${vFlopsPct.padEnd(12)} ${sFlopsPct.padEnd(12)}`);
    }
}

console.log(`\n${"=".repeat(90)}`);
console.log("Benchmark complete.");
