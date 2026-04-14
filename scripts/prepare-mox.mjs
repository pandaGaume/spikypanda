// Prepare MOx (metal oxide gas sensor) e-nose dataset for the SpikyPanda sample.
//
// Reads 5 time-aligned MOX sensor CSVs (MOX 5, 9, 13, 21, 25) from the
// DotVision experimental chamber dataset, fuses them into a multi-channel
// e-nose array, computes engineered derivative features, slices time windows
// and writes train.json / test.json to packages/host/www/data/mox/.
//
// Usage:
//   node scripts/prepare-mox.mjs \
//     --src "C:/Users/GuillaumePelletier/Documents/Projects/MOx/Data" \
//     --window 20 --stride 5 --train 600 --test 200
//
// Defaults target ~1.5 MB train + ~500 KB test so the demo stays browser friendly.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

// CLI args
const args = process.argv.slice(2);
const argVal = (name, def) => {
    const i = args.indexOf(name);
    return i >= 0 && i + 1 < args.length ? args[i + 1] : def;
};

const srcRoot = argVal("--src", "C:/Users/GuillaumePelletier/Documents/Projects/MOx/Data");
const windowSize = parseInt(argVal("--window", "20"), 10);
const stride = parseInt(argVal("--stride", "5"), 10);
const maxTrain = parseInt(argVal("--train", "600"), 10);
const maxTest = parseInt(argVal("--test", "200"), 10);
// Temporal decimation: collapse N consecutive native-rate rows into one
// averaged row before windowing. Raw CSVs are at 50 Hz; MOS sensor physics
// operates on second scale. With temporalStride=5 one window of 20 timesteps
// covers 20 * 5 * 20 ms = 2 s of physical time, which is closer to the
// actual response dynamics of the device.
const temporalStride = parseInt(argVal("--temporal-stride", "5"), 10);

const SENSORS = [5, 9, 13, 21, 25]; // sensors identified as most diagnostic in the paper
const CLASS_MAP = { "AIR": 0, "COV 1": 1, "COV 3": 2 };
const CLASS_NAMES = ["Air", "Acetone", "HCl"];
const NUM_CLASSES = CLASS_NAMES.length;

const outputDir = join(root, "packages", "host", "www", "data", "mox");
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

// ----------------------------- CSV parsing -----------------------------

function parseCsv(path) {
    const text = readFileSync(path, "utf-8");
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    const header = lines[0].split(";");
    const idx = {
        time: header.indexOf("time"),
        temperature: header.indexOf("temperature"),
        RH: header.indexOf("RH"),
        heat: header.indexOf("heat"),
        R: header.indexOf("R"),
        Ratio: header.indexOf("Ratio"),
        Difference: header.indexOf("Difference"),
        Gas: header.indexOf("Gas"),
    };
    const n = lines.length - 1;
    const time = new Float64Array(n);
    const temperature = new Float64Array(n);
    const RH = new Float64Array(n);
    const heat = new Float64Array(n);
    const R = new Float64Array(n);
    const Ratio = new Float64Array(n);
    const Difference = new Float64Array(n);
    const Gas = new Array(n);
    for (let i = 0; i < n; i++) {
        const parts = lines[i + 1].split(";");
        time[i] = parseFloat(parts[idx.time]);
        temperature[i] = parseFloat(parts[idx.temperature]);
        RH[i] = parseFloat(parts[idx.RH]);
        heat[i] = parseFloat(parts[idx.heat]);
        R[i] = parseFloat(parts[idx.R]);
        Ratio[i] = parseFloat(parts[idx.Ratio]);
        Difference[i] = parseFloat(parts[idx.Difference]);
        Gas[i] = parts[idx.Gas];
    }
    return { n, time, temperature, RH, heat, R, Ratio, Difference, Gas };
}

function loadSensors(dir, suffix) {
    const data = {};
    for (const n of SENSORS) {
        const path = join(dir, `mox_${n}${suffix}.csv`);
        if (!existsSync(path)) throw new Error(`Missing CSV: ${path}`);
        data[n] = parseCsv(path);
        console.log(`  loaded mox_${n}${suffix}.csv: ${data[n].n} rows`);
    }
    // Sanity: rows must match and Gas labels must agree
    const ref = data[SENSORS[0]];
    for (const n of SENSORS) {
        if (data[n].n !== ref.n)
            throw new Error(`Row count mismatch: mox_${n} has ${data[n].n}, expected ${ref.n}`);
    }
    for (let i = 0; i < ref.n; i++) {
        const g = ref.Gas[i];
        for (const n of SENSORS) {
            if (data[n].Gas[i] !== g) {
                throw new Error(`Gas label mismatch at row ${i}: mox_${SENSORS[0]}=${g}, mox_${n}=${data[n].Gas[i]}`);
            }
        }
    }
    return data;
}

// Collapse N consecutive rows into one averaged row. Skips any block whose
// gas label is not homogeneous to avoid blending AIR into a gas injection.
function temporalAverage(sensorData, gasRef, n) {
    if (n <= 1) return { data: sensorData, gas: gasRef };
    const rawLen = gasRef.length;
    const outLen = Math.floor(rawLen / n);
    const outGas = new Array(outLen);
    const keep = new Array(outLen);
    const outData = {};
    for (const k of SENSORS) {
        outData[k] = {
            n: outLen,
            time: new Float64Array(outLen),
            temperature: new Float64Array(outLen),
            RH: new Float64Array(outLen),
            heat: new Float64Array(outLen),
            R: new Float64Array(outLen),
            Ratio: new Float64Array(outLen),
            Difference: new Float64Array(outLen),
            Gas: new Array(outLen),
        };
    }
    for (let i = 0; i < outLen; i++) {
        const start = i * n;
        const first = gasRef[start];
        let pure = true;
        for (let t = 1; t < n; t++) {
            if (gasRef[start + t] !== first) { pure = false; break; }
        }
        keep[i] = pure;
        outGas[i] = pure ? first : null;
        for (const k of SENSORS) {
            const src = sensorData[k];
            const dst = outData[k];
            let st = 0, rh = 0, ht = 0, r = 0, rt = 0, df = 0;
            for (let t = 0; t < n; t++) {
                st += src.temperature[start + t];
                rh += src.RH[start + t];
                ht += src.heat[start + t];
                r += src.R[start + t];
                rt += src.Ratio[start + t];
                df += src.Difference[start + t];
            }
            dst.time[i] = src.time[start];
            dst.temperature[i] = st / n;
            dst.RH[i] = rh / n;
            dst.heat[i] = ht / n;
            dst.R[i] = r / n;
            dst.Ratio[i] = rt / n;
            dst.Difference[i] = df / n;
            dst.Gas[i] = outGas[i];
        }
    }
    console.log(`  temporal avg (x${n}): ${rawLen} -> ${outLen} rows, pure blocks: ${keep.filter((x) => x).length}`);
    return { data: outData, gas: outGas };
}

// ----------------------------- Normalization -----------------------------

function medianOfAir(sensor) {
    const vals = [];
    for (let i = 0; i < sensor.n; i++) {
        if (sensor.Gas[i] === "AIR") vals.push(sensor.R[i]);
    }
    vals.sort((a, b) => a - b);
    return vals.length > 0 ? vals[Math.floor(vals.length / 2)] : 1;
}

function round4(x) {
    if (!Number.isFinite(x)) return 0;
    return Math.round(x * 10000) / 10000;
}

// ----------------------------- Feature extraction -----------------------------
//
// Channel layout (23 per timestep):
//   0          temperature (shared)
//   1          RH          (shared)
//   2          heat        (shared)
//   3 .. 7     Rn   per sensor, centered: 5 * (R/R0 - 1)
//   8 .. 12    Rratio-1 per sensor (x5 amplification)
//   13 .. 17   Difference per sensor (scaled)
//   18 .. 22   dRn/dt per sensor, clipped to [-2, 2]
//
// The demo can feed the first 18 channels (base) or all 23 (with derivatives).
//
// Rn centering: in clean air R == R0 so the raw ratio sits at 1. Without
// centering the network must learn to amplify tiny deviations around 1,
// which produces weak gradients in practice. We center and scale so that
// "clean air" maps to 0 and typical gas responses land in roughly [-2, 0.5].

const CHANNELS = 23;

function buildFeatureMatrix(sensorData) {
    const ref = sensorData[SENSORS[0]];
    const n = ref.n;
    const R0 = {};
    for (const k of SENSORS) R0[k] = medianOfAir(sensorData[k]);
    console.log("  R0 baselines:", R0);

    // Pre-compute Rn series per sensor for derivative step.
    const Rn = {};
    for (const k of SENSORS) {
        const arr = new Float64Array(n);
        const base = R0[k] || 1;
        for (let i = 0; i < n; i++) arr[i] = sensorData[k].R[i] / base;
        Rn[k] = arr;
    }

    // Build feature matrix row by row.
    const features = new Array(n);
    for (let i = 0; i < n; i++) {
        const row = new Array(CHANNELS);
        // Shared features (averaged across sensors to reduce tiny discrepancies).
        let tSum = 0, rhSum = 0, htSum = 0;
        for (const k of SENSORS) {
            tSum += sensorData[k].temperature[i];
            rhSum += sensorData[k].RH[i];
            htSum += sensorData[k].heat[i];
        }
        const avg = SENSORS.length;
        row[0] = (tSum / avg - 25) / 15;       // ambient temperature, centered
        row[1] = (rhSum / avg) / 100;           // relative humidity 0..1
        row[2] = (htSum / avg) / 200;           // heater setpoint 0..1
        // Per-sensor features
        for (let s = 0; s < SENSORS.length; s++) {
            const k = SENSORS[s];
            const sen = sensorData[k];
            row[3 + s] = 5 * (Rn[k][i] - 1);                 // Rn centered, amplified
            row[8 + s] = (sen.Ratio[i] - 1) * 5;              // centered ratio, amplified
            row[13 + s] = sen.Difference[i] / 500;             // scaled difference
            // Centered derivative of Rn, clipped to remove outliers.
            let d = 0;
            if (i > 0 && i < n - 1) d = (Rn[k][i + 1] - Rn[k][i - 1]) * 0.5 * 25;
            if (d > 2) d = 2;
            else if (d < -2) d = -2;
            row[18 + s] = d;
        }
        features[i] = row;
    }
    return features;
}

// ----------------------------- Windowing -----------------------------

function extractWindows(features, gas, window, stride) {
    const windows = [];
    for (let start = 0; start + window <= features.length; start += stride) {
        const first = gas[start];
        let sameLabel = true;
        for (let t = 1; t < window; t++) {
            if (gas[start + t] !== first) { sameLabel = false; break; }
        }
        if (!sameLabel) continue;
        if (!(first in CLASS_MAP)) continue;
        const seq = new Array(window);
        for (let t = 0; t < window; t++) {
            const row = features[start + t];
            const rounded = new Array(CHANNELS);
            for (let c = 0; c < CHANNELS; c++) rounded[c] = round4(row[c]);
            seq[t] = rounded;
        }
        windows.push({ sequence: seq, label: CLASS_MAP[first] });
    }
    return windows;
}

function balanceAndLimit(windows, maxTotal) {
    const perClass = Math.floor(maxTotal / NUM_CLASSES);
    const buckets = [[], [], []];
    for (const w of windows) buckets[w.label].push(w);
    for (const b of buckets) {
        // Shuffle deterministically with a simple Fisher-Yates using a fixed seed.
        let seed = 1337;
        for (let i = b.length - 1; i > 0; i--) {
            seed = (seed * 1103515245 + 12345) & 0x7fffffff;
            const j = seed % (i + 1);
            [b[i], b[j]] = [b[j], b[i]];
        }
    }
    const balanced = [];
    for (const b of buckets) {
        const take = Math.min(perClass, b.length);
        for (let i = 0; i < take; i++) balanced.push(b[i]);
    }
    // Interleave classes in final order.
    let seed = 424242;
    for (let i = balanced.length - 1; i > 0; i--) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        const j = seed % (i + 1);
        [balanced[i], balanced[j]] = [balanced[j], balanced[i]];
    }
    return balanced;
}

function classCounts(windows) {
    const counts = new Array(NUM_CLASSES).fill(0);
    for (const w of windows) counts[w.label]++;
    return counts;
}

// ----------------------------- Main -----------------------------

function buildSplit(dir, suffix, maxCount) {
    console.log(`\n>> Processing ${dir} (${suffix})`);
    const sensorDataRaw = loadSensors(dir, suffix);
    const gasRaw = sensorDataRaw[SENSORS[0]].Gas;
    const { data: sensorData, gas } = temporalAverage(sensorDataRaw, gasRaw, temporalStride);
    const features = buildFeatureMatrix(sensorData);
    const raw = extractWindows(features, gas, windowSize, stride);
    console.log(`  raw pure-label windows: ${raw.length}, class counts: ${classCounts(raw).join("/")}`);
    const balanced = balanceAndLimit(raw, maxCount);
    console.log(`  balanced kept: ${balanced.length}, class counts: ${classCounts(balanced).join("/")}`);
    return balanced;
}

function writeJson(path, payload) {
    const json = JSON.stringify(payload);
    writeFileSync(path, json);
    const sizeKb = (json.length / 1024).toFixed(1);
    console.log(`  wrote ${path} (${sizeKb} KB)`);
}

console.log(`MOx preparation`);
console.log(`  source: ${srcRoot}`);
console.log(`  window=${windowSize} stride=${stride} temporalStride=${temporalStride} maxTrain=${maxTrain} maxTest=${maxTest}`);
console.log(`  effective window duration: ${(windowSize * temporalStride * 0.02).toFixed(2)} s`);

const trainWindows = buildSplit(join(srcRoot, "Data_train"), "_new", maxTrain);
const testWindows = buildSplit(join(srcRoot, "Data_test"), "_test", maxTest);

const metaBase = {
    windowSize,
    stride,
    temporalStride,
    effectiveWindowSec: +(windowSize * temporalStride * 0.02).toFixed(2),
    channels: CHANNELS,
    baseChannels: 18,
    classes: CLASS_NAMES,
    sensors: SENSORS.map((n) => `MOX ${n}`),
    channelLayout: {
        shared: ["temperature", "RH", "heat"],
        perSensorBase: ["Rn", "Ratio-1", "Difference/500"],
        perSensorEngineered: ["dRn/dt"],
    },
};

writeJson(join(outputDir, "train.json"), { ...metaBase, samples: trainWindows });
writeJson(join(outputDir, "test.json"), { ...metaBase, samples: testWindows });

console.log("\nDone.");
