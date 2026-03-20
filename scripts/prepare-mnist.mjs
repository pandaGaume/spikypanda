import { existsSync, mkdirSync, readFileSync, writeFileSync, createWriteStream } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";
import { gunzipSync } from "zlib";
import https from "https";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

const MNIST_URL = "https://storage.googleapis.com/cvdf-datasets/mnist/";
const FILES = {
    trainImages: "train-images-idx3-ubyte.gz",
    trainLabels: "train-labels-idx1-ubyte.gz",
    testImages: "t10k-images-idx3-ubyte.gz",
    testLabels: "t10k-labels-idx1-ubyte.gz",
};

const cacheDir = join(root, "data", "mnist");
const outputDir = join(root, "packages", "host", "www", "data", "mnist");

// Parse CLI args
const args = process.argv.slice(2);
let maxTrain = 500;
let maxTest = 200;
for (let i = 0; i < args.length; i++) {
    if (args[i] === "--train" && args[i + 1]) maxTrain = parseInt(args[i + 1]);
    if (args[i] === "--test" && args[i + 1]) maxTest = parseInt(args[i + 1]);
}

function download(filename) {
    const dest = join(cacheDir, filename);
    if (existsSync(dest)) {
        console.log(`  cached: ${filename}`);
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        console.log(`  downloading: ${filename}...`);
        const file = createWriteStream(dest);
        https.get(MNIST_URL + filename, (res) => {
            res.pipe(file);
            file.on("finish", () => { file.close(); resolve(); });
        }).on("error", reject);
    });
}

function parseIDX3(buffer) {
    const magic = buffer.readUInt32BE(0);
    if (magic !== 2051) throw new Error(`Bad IDX3 magic: ${magic}`);
    const count = buffer.readUInt32BE(4);
    const rows = buffer.readUInt32BE(8);
    const cols = buffer.readUInt32BE(12);
    const size = rows * cols;
    const images = [];
    let off = 16;
    for (let i = 0; i < count; i++) {
        const px = new Array(size);
        for (let j = 0; j < size; j++) {
            px[j] = Math.round((buffer[off++] / 255.0) * 10000) / 10000;
        }
        images.push(px);
    }
    return { images, rows, cols };
}

function parseIDX1(buffer) {
    const magic = buffer.readUInt32BE(0);
    if (magic !== 2049) throw new Error(`Bad IDX1 magic: ${magic}`);
    const count = buffer.readUInt32BE(4);
    const labels = [];
    for (let i = 0; i < count; i++) labels.push(buffer[8 + i]);
    return labels;
}

function loadSet(imagesFile, labelsFile, maxSamples) {
    const imgBuf = gunzipSync(readFileSync(join(cacheDir, imagesFile)));
    const lblBuf = gunzipSync(readFileSync(join(cacheDir, labelsFile)));
    const { images, rows, cols } = parseIDX3(imgBuf);
    const labels = parseIDX1(lblBuf);
    const count = Math.min(maxSamples, images.length);
    const samples = [];
    for (let i = 0; i < count; i++) {
        samples.push({ label: labels[i], pixels: images[i] });
    }
    return { count, width: cols, height: rows, channels: 1, format: "CHW", samples };
}

async function main() {
    console.log("Preparing MNIST data...");
    console.log(`  train: ${maxTrain} samples, test: ${maxTest} samples`);

    mkdirSync(cacheDir, { recursive: true });
    mkdirSync(outputDir, { recursive: true });

    // Download
    console.log("\n1. Downloading MNIST files:");
    for (const f of Object.values(FILES)) {
        await download(f);
    }

    // Convert
    console.log("\n2. Converting to JSON:");

    const train = loadSet(FILES.trainImages, FILES.trainLabels, maxTrain);
    const trainPath = join(outputDir, "train.json");
    writeFileSync(trainPath, JSON.stringify(train));
    console.log(`  train.json: ${train.count} samples (${(readFileSync(trainPath).length / 1024).toFixed(0)} KB)`);

    const test = loadSet(FILES.testImages, FILES.testLabels, maxTest);
    const testPath = join(outputDir, "test.json");
    writeFileSync(testPath, JSON.stringify(test));
    console.log(`  test.json: ${test.count} samples (${(readFileSync(testPath).length / 1024).toFixed(0)} KB)`);

    console.log(`\nDone. Files written to ${outputDir}`);
}

main().catch(console.error);
