/**
 * Phase 7.4 — QuantizedCnnGraphBuilder end-to-end test.
 *
 * Builds a small Conv→Relu→Pool→Flatten→Dense CNN, runs calibration
 * via the runner, then assembles a QuantizedCnnGraph and asserts on
 * the resulting structure :
 *   - one QuantizedCnnLayer per source layer
 *   - Conv layer carries int8 OIHW weights + per-channel scales + FP32 bias
 *   - Dense layer carries int8 [units, prev] weights + per-tensor scale + FP32 bias
 *   - Pool / Flatten / Input layers carry no weights but still have outputParams
 *   - Spatial metadata (kernelSize, stride, padding, poolType) is preserved
 *   - Activation function is preserved on Conv (relu) and Dense (linear)
 */
import {
    ActivationFunctions,
    CalibrationRunner,
    CnnBuilder,
    CnnInferenceRuntime,
    CnnLayerType,
    ComputeGraph,
    IQuantizationParams,
    ITensor,
    Kernel,
    PoolingType,
    QuantizedCnnGraphBuilder,
    Uniform,
} from "spikypanda-core";

class CnnWrapperKernel extends Kernel {
    public readonly nodeType = "test_cnn_wrap";
    public readonly outputShapes: number[][];
    private readonly _runtime: CnnInferenceRuntime;

    public constructor(runtime: CnnInferenceRuntime, outputSize: number) {
        super();
        this._runtime = runtime;
        this.outputShapes = [[outputSize]];
    }

    public execute(inputs: ITensor[]): ITensor[] {
        const inp = inputs[0];
        const out = this._runtime.run(Array.from(inp.data));
        return [{ data: Float32Array.from(out), shape: [out.length] }];
    }
}

describe("QuantizedCnnGraphBuilder", () => {
    /**
     * Calibrate using the wrapper-kernel's inputs only. The CNN's
     * internal layer outputs are NOT observed by this calibration,
     * so we fake them with reasonable params for the structural
     * tests below (Phase 7.5 will provide a proper hook to capture
     * inner-CNN activations).
     */
    function buildAndQuantize() {
        const cnn = new CnnBuilder()
            .withInputLayer(4, 1, 1)
            .withConvLayer({
                filters: 3,
                kernelSize: [1, 2],
                activation: ActivationFunctions.relu,
                weightInitializer: new Uniform(-0.2, 0.2),
                biasInit: 0.05,
            })
            .withPoolLayer({ type: PoolingType.Max, size: [1, 3] })
            .withFlattenLayer()
            .withDenseLayer({
                units: 2,
                activation: ActivationFunctions.linear,
                weightInitializer: new Uniform(-0.4, 0.4),
                biasInit: -0.1,
            })
            .build();

        const runtime = new CnnInferenceRuntime(cnn, ActivationFunctions.relu);
        const wrap = new CnnWrapperKernel(runtime, 2);
        wrap.id = "wrap";
        const graph = new ComputeGraph([wrap], [], "static");

        // Calibration with deterministic samples.
        const runner = new CalibrationRunner(graph);
        const samples = Array.from({ length: 8 }, (_, t) =>
            new Map<string, ITensor>([
                ["wrap", { data: Float32Array.from([Math.sin(t * 0.3), Math.cos(t * 0.4), 0.5 * t - 1, Math.sin(t * 0.7)]), shape: [4] }],
            ])
        );
        runner.observe(samples);

        const inputParams = runner.getInputParams().get("wrap")!;

        // Synthesize layerOutputParams: the wrapper calibration only
        // observed the CNN's final output. For the internal layers we
        // construct stub params with reasonable ranges (the structure
        // tests below don't depend on the precise values).
        const stub = (min: number, max: number): IQuantizationParams => ({
            scheme: "per_tensor",
            dtype: "int8",
            scales: Float32Array.from([(max - min) / 255]),
            zeroPoints: Int32Array.from([Math.round(-128 - min / ((max - min) / 255))]),
            symmetric: false,
        });

        const layerOutputParams: IQuantizationParams[] = [
            inputParams,             // 0: Input (= CNN input params)
            stub(-1, 1),             // 1: Conv (post-Relu, ≥ 0 in practice but stub is fine)
            stub(0, 1),              // 2: Pool (Max non-negative after Relu)
            stub(0, 1),              // 3: Flatten (identity)
            runner.getActivationParams().get(wrap)![0], // 4: Dense (= wrapper output)
        ];

        const q = QuantizedCnnGraphBuilder.fromCalibration(cnn, {
            inputParams,
            layerOutputParams,
        });
        return { cnn, q };
    }

    test("one QuantizedCnnLayer per source layer", () => {
        const { cnn, q } = buildAndQuantize();
        expect(q.layers).toHaveLength(cnn.layerDescriptors.length);
        expect(q.source).toBe(cnn);
    });

    test("Conv layer carries int8 OIHW weights + per-channel scales + FP32 bias", () => {
        const { q } = buildAndQuantize();
        const conv = q.layers[1];
        expect(conv.type).toBe(CnnLayerType.Conv);
        expect(conv.weights).toBeDefined();
        const w = conv.weights!;
        // Cin=1, F=3, kH=1, kW=2.
        expect(w.shape).toEqual([3, 1, 1, 2]);
        expect(w.axis).toBe(0);
        expect(w.scales).toHaveLength(3);
        expect(w.zeroPoints).toEqual(Int32Array.from([0, 0, 0]));
        expect(w.symmetric).toBe(true);
        expect(w.data).toBeInstanceOf(Int8Array);
        expect(conv.bias).toBeInstanceOf(Float32Array);
        expect(conv.bias!).toHaveLength(3);
        for (const b of conv.bias!) expect(b).toBeCloseTo(0.05, 5);
    });

    test("Dense layer carries int8 [units, prev_size] weights + per-tensor scale + FP32 bias", () => {
        const { q } = buildAndQuantize();
        const dense = q.layers[q.layers.length - 1];
        expect(dense.type).toBe(CnnLayerType.Dense);
        expect(dense.weights).toBeDefined();
        const w = dense.weights!;
        // units = 2, prev_size = 3 (Conv outputs 3 channels × W=3 after Conv,
        // then Pool kernel=3 → Pool outputs 3 × W=1 = 3 elements, then
        // Flatten → 3).
        expect(w.shape[0]).toBe(2);
        expect(w.scales).toHaveLength(1);
        expect(w.axis).toBeUndefined();
        expect(w.symmetric).toBe(true);
        expect(dense.bias).toBeInstanceOf(Float32Array);
        expect(dense.bias!).toHaveLength(2);
        for (const b of dense.bias!) expect(b).toBeCloseTo(-0.1, 5);
    });

    test("Pool / Flatten / Input layers have no weights but carry outputParams", () => {
        const { q } = buildAndQuantize();
        for (const layer of q.layers) {
            if (layer.type !== CnnLayerType.Conv && layer.type !== CnnLayerType.Dense) {
                expect(layer.weights).toBeUndefined();
                expect(layer.bias).toBeUndefined();
            }
            expect(layer.outputParams).toBeDefined();
        }
    });

    test("Conv spatial metadata is preserved", () => {
        const { q } = buildAndQuantize();
        const conv = q.layers[1];
        expect(conv.kernelSize).toEqual([1, 2]);
        expect(conv.stride).toEqual([1, 1]);
        expect(conv.padding).toEqual([0, 0]);
        expect(conv.activation).toBe(ActivationFunctions.relu);
    });

    test("Pool layer keeps poolType and kernelSize", () => {
        const { q } = buildAndQuantize();
        const pool = q.layers[2];
        expect(pool.type).toBe(CnnLayerType.Pool);
        expect(pool.poolType).toBe(PoolingType.Max);
        expect(pool.kernelSize).toEqual([1, 3]);
    });

    test("Dense layer's activation function is preserved", () => {
        const { q } = buildAndQuantize();
        const dense = q.layers[q.layers.length - 1];
        expect(dense.activation).toBe(ActivationFunctions.linear);
    });

    test("inputParams is exposed at the top level", () => {
        const { q } = buildAndQuantize();
        expect(q.inputParams).toBeDefined();
        expect(q.inputParams.scheme).toBe("per_tensor");
    });

    test("rejects layerOutputParams of wrong length", () => {
        const cnn = new CnnBuilder()
            .withInputLayer(4, 1, 1)
            .withFlattenLayer()
            .build();
        // 2 layers in the CNN; supplying 1 should fail.
        const stub: IQuantizationParams = {
            scheme: "per_tensor",
            dtype: "int8",
            scales: Float32Array.from([1 / 127]),
            zeroPoints: Int32Array.from([0]),
            symmetric: true,
        };
        expect(() =>
            QuantizedCnnGraphBuilder.fromCalibration(cnn, {
                inputParams: stub,
                layerOutputParams: [stub],
            })
        ).toThrow(/does not match/);
    });

    test("frozen output discourages mutation", () => {
        const { q } = buildAndQuantize();
        expect(Object.isFrozen(q)).toBe(true);
        expect(Object.isFrozen(q.layers)).toBe(true);
        for (const layer of q.layers) {
            expect(Object.isFrozen(layer)).toBe(true);
        }
    });
});
