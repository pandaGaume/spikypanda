/**
 * Phase 4 — cardriver ONNX export TS-only roundtrip.
 * Phase 5 — Python cross-validation artifact dump + reverse roundtrip.
 *
 * For each input format (raw3 / preformatted4):
 *   1. Build the cardriver pipeline with deterministic weights.
 *   2. Run the native pipeline → snapshot the embedding (ground truth).
 *   3. Build a kernel-only export subgraph (separate Kernel instances,
 *      sharing the same CnnInferenceRuntime so weights are identical).
 *   4. Export the subgraph to ONNX bytes via OnnxGraphExporter.
 *   5. Re-parse the bytes via OnnxParser and re-instantiate a ComputeGraph
 *      via OnnxGraphBuilder.
 *   6. Run inference on the imported graph with the same window and
 *      assert the resulting embedding matches the ground truth to a
 *      few decimal places.
 *
 * Phase 5 additions:
 *   7. Dump cardriver_ts.onnx + sample_window.json + ground_truth.json
 *      + weights.json to python/_artifacts/ for Python cross-validation.
 *   8. If python/_artifacts/cardriver_py.onnx exists (built by
 *      python/build_reference.py), re-import it via OnnxParser and
 *      check the resulting embedding still matches.
 */
import * as fs from "fs";
import * as path from "path";
import {
    ActivationFunctions,
    CnnBuilder,
    CnnInferenceRuntime,
    CnnLayerType,
    ComputeGraph,
    ICnnGraph,
    ICnnLayerDescriptor,
    ICnnSynapse,
    IConvKernel,
    IDataLink,
    IKernel,
    ITensor,
    PoolingType,
    RuntimeGraphBuilder,
    Session,
    Uniform,
} from "spikypanda-core";
import {
    OnnxExportRegistry,
    OnnxGraphBuilder,
    OnnxGraphExporter,
    OnnxOpRegistry,
    OnnxParser,
    registerActivationOps,
    registerConvOps,
    registerMathOps,
    registerMatrixOps,
    registerMiscOps,
    registerNormOps,
} from "spikypanda-onnx";
import {
    buildDrivingSignaturePipeline,
    CHANNELS,
    CnnAdapterKernel,
    EMBEDDING_SIZE,
    NormalizeKernel,
    NormKernel,
    registerCardriverOnnxSerializers,
    WINDOW_SIZE,
} from "spikypanda-applications-cardriver";

// ─── Helpers ─────────────────────────────────────────────────────────────

function makeImportRegistry(): OnnxOpRegistry {
    const r = new OnnxOpRegistry();
    registerMathOps(r);
    registerActivationOps(r);
    registerMatrixOps(r);
    registerConvOps(r);
    registerNormOps(r);
    registerMiscOps(r);
    return r;
}

function makeExportRegistry(): OnnxExportRegistry {
    const r = new OnnxExportRegistry();
    registerCardriverOnnxSerializers(r);
    return r;
}

function makeSeededCnn(): CnnInferenceRuntime {
    // Deterministic weight init via Uniform constants gives the same
    // weights across runs without needing a PRNG seed.
    const cnn = new CnnBuilder()
        .withInputLayer(WINDOW_SIZE, 1, CHANNELS)
        .withConvLayer({
            filters: 8, kernelSize: [1, 3],
            activation: ActivationFunctions.relu,
            weightInitializer: new Uniform(-0.05, 0.05),
            biasInit: 0,
        })
        .withConvLayer({
            filters: 16, kernelSize: [1, 3],
            activation: ActivationFunctions.relu,
            weightInitializer: new Uniform(-0.05, 0.05),
            biasInit: 0,
        })
        .withPoolLayer({ type: PoolingType.Avg, size: [1, WINDOW_SIZE - 4] })
        .withDenseLayer({
            units: EMBEDDING_SIZE,
            activation: ActivationFunctions.linear,
            weightInitializer: new Uniform(-0.1, 0.1),
            biasInit: 0,
        })
        .build();
    return new CnnInferenceRuntime(cnn, ActivationFunctions.relu);
}

function makeFakeSamples(count: number, channels: 3 | 4): number[][] {
    // Deterministic synthetic accel signal (mix of sinusoids).
    const out: number[][] = [];
    for (let t = 0; t < count; t++) {
        const ax = 0.1 + Math.sin(t * 0.2);
        const ay = -0.2 + Math.cos(t * 0.17);
        const az = 0.05 + Math.sin(t * 0.31 + 0.5);
        if (channels === 3) {
            out.push([ax, ay, az]);
        } else {
            const mag = Math.sqrt(ax * ax + ay * ay + az * az);
            out.push([ax, ay, az, mag]);
        }
    }
    return out;
}

function buildExportSubgraph(
    withNorm: boolean,
    cnnRuntime: CnnInferenceRuntime
): { graph: ComputeGraph; entry: IKernel; exit: IKernel } {
    const norm = withNorm ? new NormKernel() : null;
    const normalize = new NormalizeKernel(WINDOW_SIZE, CHANNELS);
    const cnnAdapter = new CnnAdapterKernel({
        runtime: cnnRuntime,
        windowSize: WINDOW_SIZE,
        channels: CHANNELS,
        outputSize: EMBEDDING_SIZE,
    });
    const chain: IKernel[] = norm ? [norm, normalize, cnnAdapter] : [normalize, cnnAdapter];
    const graph = new RuntimeGraphBuilder<IKernel, IDataLink>()
        .withMode("static")
        .withNodes(...chain)
        .withLinks(...chain)
        .build() as unknown as ComputeGraph;
    return { graph, entry: chain[0], exit: cnnAdapter };
}

function flattenSamples(samples: number[][]): Float32Array {
    const C = samples[0].length;
    const T = samples.length;
    const out = new Float32Array(T * C);
    for (let t = 0; t < T; t++) {
        for (let c = 0; c < C; c++) {
            out[t * C + c] = samples[t][c];
        }
    }
    return out;
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe("cardriver ONNX export → re-import TS roundtrip", () => {
    test("withNorm: true (raw 3-axis input) — embedding matches after roundtrip", () => {
        // 1. Build cardriver with seeded CNN.
        const samples = makeFakeSamples(WINDOW_SIZE, 3);
        const cnn = makeSeededCnn();
        const pipe = buildDrivingSignaturePipeline({ samples, cnn, withNorm: true });

        // 2. Run native → ground truth embedding.
        const session = new Session(pipe.graph);
        for (let t = 0; t < WINDOW_SIZE; t++) session.run(t);
        expect(pipe.sink.received.length).toBe(1);
        const groundTruth = pipe.sink.received[0].data;
        expect(groundTruth.length).toBe(EMBEDDING_SIZE);

        // 3. Build the export subgraph (separate kernel instances,
        //    shared CNN runtime so weights match).
        const sub = buildExportSubgraph(true, cnn);

        // 4. Export to ONNX bytes.
        const bytes = OnnxGraphExporter.export(sub.graph, {
            registry: makeExportRegistry(),
            graphName: "cardriver_raw3",
            inputNames: new Map([[sub.entry, ["accel_window"]]]),
            outputNames: new Map([[sub.exit, ["embedding"]]]),
            inputShapes: new Map([[sub.entry, [[WINDOW_SIZE, 3]]]]),
            outputShapes: new Map([[sub.exit, [[EMBEDDING_SIZE]]]]),
        });
        expect(bytes.byteLength).toBeGreaterThan(0);

        // 5. Re-parse + re-instantiate.
        const parsed = OnnxParser.parse(bytes);
        expect(parsed).not.toBeNull();
        const builder = new OnnxGraphBuilder(makeImportRegistry());
        const { graph: imported } = builder.build(parsed!);

        // 6. Feed the same window and compare.
        const window: ITensor = {
            data: flattenSamples(samples),
            shape: [WINDOW_SIZE, 3],
            name: "accel_window",
        };
        const results = imported.infer(new Map([["accel_window", window]]));
        const embedding = results.get("embedding");
        expect(embedding).toBeDefined();
        expect(embedding!.data.length).toBe(EMBEDDING_SIZE);

        for (let i = 0; i < EMBEDDING_SIZE; i++) {
            expect(Math.abs(embedding!.data[i] - groundTruth[i])).toBeLessThan(5e-3);
        }
    });

    test("withNorm: false (preformatted 4-channel input) — embedding matches after roundtrip", () => {
        const samples = makeFakeSamples(WINDOW_SIZE, 4);
        const cnn = makeSeededCnn();
        const pipe = buildDrivingSignaturePipeline({ samples, cnn, withNorm: false });
        expect(pipe.normKernel).toBeNull();

        const session = new Session(pipe.graph);
        for (let t = 0; t < WINDOW_SIZE; t++) session.run(t);
        expect(pipe.sink.received.length).toBe(1);
        const groundTruth = pipe.sink.received[0].data;

        const sub = buildExportSubgraph(false, cnn);

        const bytes = OnnxGraphExporter.export(sub.graph, {
            registry: makeExportRegistry(),
            graphName: "cardriver_pre4",
            inputNames: new Map([[sub.entry, ["accel_window"]]]),
            outputNames: new Map([[sub.exit, ["embedding"]]]),
            inputShapes: new Map([[sub.entry, [[WINDOW_SIZE, 4]]]]),
            outputShapes: new Map([[sub.exit, [[EMBEDDING_SIZE]]]]),
        });

        const parsed = OnnxParser.parse(bytes);
        const builder = new OnnxGraphBuilder(makeImportRegistry());
        const { graph: imported } = builder.build(parsed!);

        const window: ITensor = {
            data: flattenSamples(samples),
            shape: [WINDOW_SIZE, 4],
            name: "accel_window",
        };
        const results = imported.infer(new Map([["accel_window", window]]));
        const embedding = results.get("embedding")!;

        for (let i = 0; i < EMBEDDING_SIZE; i++) {
            expect(Math.abs(embedding.data[i] - groundTruth[i])).toBeLessThan(5e-3);
        }
    });
});

// ═══════════════════════════════════════════════════════════════════════════
// Phase 5 — Python cross-validation artifacts
// ═══════════════════════════════════════════════════════════════════════════

const PY_DIR = path.resolve(__dirname, "python");
const ARTIFACTS_DIR = path.join(PY_DIR, "_artifacts");

function ensureArtifactsDir(): void {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

interface NamedTensor {
    shape: number[];
    data: number[];
}

/**
 * Pack the CNN's weights as a Python-friendly JSON blob. Layout
 * matches ONNX NCHW (conv W = [F, C_in, kH, kW], dense W = [units,
 * prev_size]).
 */
function dumpCnnWeights(cnn: ICnnGraph): Record<string, NamedTensor> {
    const out: Record<string, NamedTensor> = {};
    let convIdx = 0;
    let denseIdx = 0;

    for (let i = 1; i < cnn.layerDescriptors.length; i++) {
        const desc: ICnnLayerDescriptor = cnn.layerDescriptors[i];
        const prev = cnn.layerDescriptors[i - 1];
        if (desc.type === CnnLayerType.Conv) {
            const kernels = desc.convKernels!;
            const [kH, kW] = desc.kernelSize!;
            const F = kernels.length;
            const Cin = prev.channels;
            const W: number[] = [];
            const B: number[] = [];
            for (let f = 0; f < F; f++) {
                const k: IConvKernel = kernels[f];
                // Repack channel-major (ic, kr, kc) -> NCHW (f, ic, kr, kc)
                for (let ic = 0; ic < Cin; ic++) {
                    for (let kr = 0; kr < kH; kr++) {
                        for (let kc = 0; kc < kW; kc++) {
                            W.push(k.weights[ic * kH * kW + kr * kW + kc]);
                        }
                    }
                }
                B.push(k.bias);
            }
            out[`conv${convIdx}_W`] = { shape: [F, Cin, kH, kW], data: W };
            out[`conv${convIdx}_B`] = { shape: [F], data: B };
            convIdx++;
        }
        if (desc.type === CnnLayerType.Dense) {
            const units = desc.neurons.length;
            const prevSize = prev.neurons.length;
            const W = new Float32Array(units * prevSize);
            const B: number[] = [];
            const prevIdx = new Map(prev.neurons.map((n, k) => [n, k]));
            for (let u = 0; u < units; u++) {
                const neuron = desc.neurons[u];
                B.push(neuron.bias);
                const incoming = neuron.opsc<ICnnSynapse>();
                for (const syn of incoming) {
                    const j = prevIdx.get(syn.oini as never);
                    if (j === undefined) continue;
                    W[u * prevSize + j] = syn.weight;
                }
            }
            out[`dense${denseIdx}_W`] = { shape: [units, prevSize], data: Array.from(W) };
            out[`dense${denseIdx}_B`] = { shape: [units], data: B };
            denseIdx++;
        }
    }
    return out;
}

describe("cardriver Phase 5 — Python cross-validation artifacts", () => {
    test("withNorm:true — dump cardriver_ts.onnx + window + ground_truth + weights for Python", () => {
        ensureArtifactsDir();
        const samples = makeFakeSamples(WINDOW_SIZE, 3);
        const cnn = makeSeededCnn();
        const pipe = buildDrivingSignaturePipeline({ samples, cnn, withNorm: true });

        const session = new Session(pipe.graph);
        for (let t = 0; t < WINDOW_SIZE; t++) session.run(t);
        const groundTruth = Array.from(pipe.sink.received[0].data);

        const sub = buildExportSubgraph(true, cnn);
        const bytes = OnnxGraphExporter.export(sub.graph, {
            registry: makeExportRegistry(),
            graphName: "cardriver_raw3",
            inputNames: new Map([[sub.entry, ["accel_window"]]]),
            outputNames: new Map([[sub.exit, ["embedding"]]]),
            inputShapes: new Map([[sub.entry, [[WINDOW_SIZE, 3]]]]),
            outputShapes: new Map([[sub.exit, [[EMBEDDING_SIZE]]]]),
        });

        fs.writeFileSync(path.join(ARTIFACTS_DIR, "cardriver_ts.onnx"), bytes);
        fs.writeFileSync(
            path.join(ARTIFACTS_DIR, "sample_window.json"),
            JSON.stringify({ shape: [WINDOW_SIZE, 3], data: Array.from(flattenSamples(samples)) }, null, 2)
        );
        fs.writeFileSync(
            path.join(ARTIFACTS_DIR, "ground_truth.json"),
            JSON.stringify({ shape: [EMBEDDING_SIZE], data: groundTruth }, null, 2)
        );
        fs.writeFileSync(
            path.join(ARTIFACTS_DIR, "weights.json"),
            JSON.stringify({
                eps: pipe.normalizeKernel.eps,
                weights: dumpCnnWeights(cnn.graph),
            }, null, 2)
        );

        // Sanity assertions on what we just wrote.
        expect(fs.statSync(path.join(ARTIFACTS_DIR, "cardriver_ts.onnx")).size).toBeGreaterThan(0);
        expect(groundTruth).toHaveLength(EMBEDDING_SIZE);
    });

    test("reverse roundtrip via Python-generated cardriver_py.onnx (skipped if file absent)", () => {
        const pyOnnxPath = path.join(ARTIFACTS_DIR, "cardriver_py.onnx");
        if (!fs.existsSync(pyOnnxPath)) {
            console.warn(`[Phase 5.4] skipping: ${pyOnnxPath} not found. Run python/build_reference.py first.`);
            return;
        }

        const groundTruth = (JSON.parse(fs.readFileSync(path.join(ARTIFACTS_DIR, "ground_truth.json"), "utf8")) as NamedTensor).data;
        const windowSpec = JSON.parse(fs.readFileSync(path.join(ARTIFACTS_DIR, "sample_window.json"), "utf8")) as NamedTensor;

        const bytes = new Uint8Array(fs.readFileSync(pyOnnxPath));
        const parsed = OnnxParser.parse(bytes);
        expect(parsed).not.toBeNull();
        const builder = new OnnxGraphBuilder(makeImportRegistry());
        const { graph: imported } = builder.build(parsed!);

        const window: ITensor = {
            data: Float32Array.from(windowSpec.data),
            shape: windowSpec.shape,
            name: "accel_window",
        };
        const results = imported.infer(new Map([["accel_window", window]]));
        const embedding = results.get("embedding");
        expect(embedding).toBeDefined();

        for (let i = 0; i < EMBEDDING_SIZE; i++) {
            expect(Math.abs(embedding!.data[i] - groundTruth[i])).toBeLessThan(5e-3);
        }
    });
});
