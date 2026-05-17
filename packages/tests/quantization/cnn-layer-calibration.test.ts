/**
 * Phase 7.4b — CnnLayerCalibrationHelper test.
 *
 * Runs a small CNN's inference on a deterministic sample set, then
 * verifies the helper produces:
 *   - one IQuantizationParams per layerDescriptor
 *   - non-degenerate (real) scales for layers that observed varied
 *     activations (Conv after Relu, Dense output)
 *   - the input layer's params match what the runtime's first layer
 *     activations cover
 *   - the result plugs straight into QuantizedCnnGraphBuilder
 *
 * The point of this test is to validate that we can produce real
 * per-layer activation params end-to-end, without stubbing.
 */
import {
    ActivationFunctions,
    CnnBuilder,
    CnnInferenceRuntime,
    CnnLayerCalibrationHelper,
    PoolingType,
    QuantizedCnnGraphBuilder,
    Uniform,
} from "spikypanda-core";

describe("CnnLayerCalibrationHelper", () => {
    function buildCnn() {
        return new CnnBuilder()
            .withInputLayer(4, 1, 1)
            .withConvLayer({
                filters: 3,
                kernelSize: [1, 2],
                activation: ActivationFunctions.relu,
                weightInitializer: new Uniform(-0.3, 0.3),
                biasInit: 0,
            })
            .withPoolLayer({ type: PoolingType.Max, size: [1, 3] })
            .withFlattenLayer()
            .withDenseLayer({
                units: 2,
                activation: ActivationFunctions.linear,
                weightInitializer: new Uniform(-0.5, 0.5),
            })
            .build();
    }

    function makeSamples(n: number): number[][] {
        const out: number[][] = [];
        for (let t = 0; t < n; t++) {
            out.push([
                Math.sin(t * 0.3),
                Math.cos(t * 0.4),
                0.5 * t - 1,
                Math.sin(t * 0.7) + 0.5,
            ]);
        }
        return out;
    }

    test("produces one IQuantizationParams per layer", () => {
        const cnn = buildCnn();
        const runtime = new CnnInferenceRuntime(cnn, ActivationFunctions.relu);
        const samples = makeSamples(10);
        const calib = CnnLayerCalibrationHelper.observe(cnn, runtime, samples);

        expect(calib.layerOutputParams).toHaveLength(cnn.layerDescriptors.length);
        for (const p of calib.layerOutputParams) {
            expect(p.scheme).toBe("per_tensor");
            expect(p.dtype).toBe("int8");
            expect(p.scales).toHaveLength(1);
            expect(p.zeroPoints).toHaveLength(1);
        }
    });

    test("post-Relu Conv layer has non-negative range (zero_point at the low end)", () => {
        // The Conv layer uses Relu activation; with samples that yield
        // a mix of activations, the observed range should be [0, max]
        // → zero_point lands at int8 lo (-128) so the integer grid
        // packs the positive range into [-128, 127].
        const cnn = buildCnn();
        const runtime = new CnnInferenceRuntime(cnn, ActivationFunctions.relu);
        const calib = CnnLayerCalibrationHelper.observe(cnn, runtime, makeSamples(20));
        const convOut = calib.layerOutputParams[1];
        // Asymmetric, non-symmetric.
        expect(convOut.symmetric).toBe(false);
        // Real 0 maps onto zero_point (Relu output min = 0).
        expect(convOut.zeroPoints[0]).toBe(-128);
        // Scale strictly positive.
        expect(convOut.scales[0]).toBeGreaterThan(0);
    });

    test("input layer params match the input samples' range", () => {
        const cnn = buildCnn();
        const runtime = new CnnInferenceRuntime(cnn, ActivationFunctions.relu);
        const samples = makeSamples(15);
        const calib = CnnLayerCalibrationHelper.observe(cnn, runtime, samples);

        // The input layer's output IS the input. The min/max we
        // observe should be the min/max of the sample values.
        let mn = Infinity, mx = -Infinity;
        for (const s of samples) for (const v of s) {
            if (v < mn) mn = v;
            if (v > mx) mx = v;
        }
        const inputP = calib.inputParams;
        const inputScale = inputP.scales[0];
        // Reconstructible range from (scale, zp): the integer span
        // is [-128, 127] = 255 levels.
        const reconstructedRange = inputScale * 255;
        // Approximate (we round in the param compute).
        const actualRange = mx - Math.min(mn, 0);  // asymmetric clamps lo to 0
        expect(Math.abs(reconstructedRange - actualRange)).toBeLessThan(inputScale * 2);
    });

    test("custom strategyFactory is honoured", () => {
        const cnn = buildCnn();
        const runtime = new CnnInferenceRuntime(cnn, ActivationFunctions.relu);
        let callCount = 0;
        const calib = CnnLayerCalibrationHelper.observe(cnn, runtime, makeSamples(3), {
            strategyFactory: () => {
                callCount++;
                return {
                    update: jest.fn(),
                    finalize: jest.fn(() => ({
                        scheme: "per_tensor",
                        dtype: "int8",
                        scales: Float32Array.from([0.5]),
                        zeroPoints: Int32Array.from([7]),
                        symmetric: false,
                    } as const)),
                    reset: jest.fn(),
                };
            },
        });
        // One strategy per layer (Input, Conv, Pool, Flatten, Dense = 5).
        expect(callCount).toBe(cnn.layerDescriptors.length);
        // Strategies' synthesized params propagate through.
        for (const p of calib.layerOutputParams) {
            expect(p.scales[0]).toBe(0.5);
            expect(p.zeroPoints[0]).toBe(7);
        }
    });

    test("result plugs straight into QuantizedCnnGraphBuilder.fromCalibration", () => {
        const cnn = buildCnn();
        const runtime = new CnnInferenceRuntime(cnn, ActivationFunctions.relu);
        const calib = CnnLayerCalibrationHelper.observe(cnn, runtime, makeSamples(10));
        const q = QuantizedCnnGraphBuilder.fromCalibration(cnn, calib);

        expect(q.layers).toHaveLength(cnn.layerDescriptors.length);
        expect(q.inputParams).toBe(calib.inputParams);
        // Conv + Dense layers got weights.
        const convLayer = q.layers[1];
        const denseLayer = q.layers[q.layers.length - 1];
        expect(convLayer.weights).toBeDefined();
        expect(denseLayer.weights).toBeDefined();
    });
});
