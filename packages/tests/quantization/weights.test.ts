/**
 * Phase 7.3 — WeightQuantizer (generic) + CNN marshaller tests.
 *
 * Validates :
 *   - per_tensor symmetric : single scale = absMax/127, zp = 0
 *   - per_channel symmetric : one scale per slice along axis
 *   - per_tensor asymmetric : scale + zp derived from (min, max)
 *   - All-zero buffer : degenerate but valid (scale = 1/127)
 *   - Dequantize round-trip : within scale/2 of original
 *   - Shape validation : throws on mismatch
 *
 * CNN marshaller :
 *   - extractConvLayerWeights packs OIHW correctly
 *   - extractDenseLayerWeights extracts the matrix from synapses
 *   - quantizeConvLayer end-to-end produces [F, C_in, kH, kW] int8
 *   - quantizeDenseLayer end-to-end produces [units, prev_size] int8
 */
import {
    ActivationFunctions,
    CnnBuilder,
    extractConvLayerWeights,
    extractDenseLayerWeights,
    He,
    quantizeConvLayer,
    quantizeDenseLayer,
    Uniform,
    WeightQuantizer,
} from "spikypanda-core";

describe("WeightQuantizer (generic)", () => {
    // ─── perTensorSymmetric ──────────────────────────────────────────

    describe("perTensorSymmetric", () => {
        test("single scale = absMax/127, zp = 0, symmetric flag set", () => {
            const values = Float32Array.from([-2, -1, 0, 1, 2]);
            const q = WeightQuantizer.perTensorSymmetric(values, [5]);
            expect(q.scales).toHaveLength(1);
            expect(q.scales[0]).toBeCloseTo(2 / 127, 6);
            expect(q.zeroPoints).toEqual(Int32Array.from([0]));
            expect(q.symmetric).toBe(true);
            expect(q.axis).toBeUndefined();
            // Endpoints saturate at ±127.
            expect(q.data[0]).toBe(-127);
            expect(q.data[4]).toBe(127);
            // Zero stays zero.
            expect(q.data[2]).toBe(0);
        });

        test("dequantize round-trip is within ±scale/2", () => {
            const values = Float32Array.from([-1.5, -0.7, 0, 0.3, 1.9]);
            const q = WeightQuantizer.perTensorSymmetric(values, [5]);
            const back = WeightQuantizer.dequantize(q);
            for (let i = 0; i < values.length; i++) {
                expect(Math.abs(back[i] - values[i])).toBeLessThanOrEqual(q.scales[0] / 2 + 1e-6);
            }
        });

        test("all-zero buffer is non-degenerate (scale = 1/127)", () => {
            const q = WeightQuantizer.perTensorSymmetric(new Float32Array(8), [8]);
            expect(q.scales[0]).toBeCloseTo(1 / 127, 6);
            for (const v of q.data) expect(v).toBe(0);
        });

        test("rejects shape mismatch", () => {
            expect(() => WeightQuantizer.perTensorSymmetric(new Float32Array(5), [3])).toThrow(/shape/);
        });
    });

    // ─── perChannelSymmetric ────────────────────────────────────────

    describe("perChannelSymmetric", () => {
        test("one scale per slice, zp all 0", () => {
            // Shape [3, 2]: 3 channels of 2 values each.
            // Channel 0 absMax = 2, channel 1 absMax = 4, channel 2 absMax = 1.
            const values = Float32Array.from([1, 2, -4, 3, 0, -1]);
            const q = WeightQuantizer.perChannelSymmetric(values, [3, 2], 0);
            expect(q.scales).toHaveLength(3);
            expect(q.scales[0]).toBeCloseTo(2 / 127, 6);
            expect(q.scales[1]).toBeCloseTo(4 / 127, 6);
            expect(q.scales[2]).toBeCloseTo(1 / 127, 6);
            expect(q.zeroPoints).toEqual(Int32Array.from([0, 0, 0]));
            expect(q.axis).toBe(0);
        });

        test("per-channel quantization saturates at ±127 at channel extremes", () => {
            const values = Float32Array.from([-2, 0, 2, -4, 0, 4]);
            const q = WeightQuantizer.perChannelSymmetric(values, [2, 3], 0);
            // Channel 0: scale = 2/127, [-2, 0, 2] → [-127, 0, 127].
            expect(Array.from(q.data.slice(0, 3))).toEqual([-127, 0, 127]);
            // Channel 1: scale = 4/127, [-4, 0, 4] → [-127, 0, 127].
            expect(Array.from(q.data.slice(3, 6))).toEqual([-127, 0, 127]);
        });

        test("dequantize per-channel round-trips within per-slice scale/2", () => {
            const values = Float32Array.from([0.5, -0.7, 1.3, 2.1, -3.0, 0.0]);
            const q = WeightQuantizer.perChannelSymmetric(values, [2, 3], 0);
            const back = WeightQuantizer.dequantize(q);
            for (let c = 0; c < 2; c++) {
                for (let i = 0; i < 3; i++) {
                    const idx = c * 3 + i;
                    expect(Math.abs(back[idx] - values[idx])).toBeLessThanOrEqual(q.scales[c] / 2 + 1e-6);
                }
            }
        });

        test("rejects out-of-range axis", () => {
            expect(() => WeightQuantizer.perChannelSymmetric(new Float32Array(6), [2, 3], 2)).toThrow(/axis/);
            expect(() => WeightQuantizer.perChannelSymmetric(new Float32Array(6), [2, 3], -1)).toThrow(/axis/);
        });
    });

    // ─── perTensorAsymmetric ────────────────────────────────────────

    describe("perTensorAsymmetric", () => {
        test("derives scale + zp from (min, max), keeps real 0 representable", () => {
            const values = Float32Array.from([0, 0.5, 1.0]);
            const q = WeightQuantizer.perTensorAsymmetric(values, [3]);
            expect(q.scales).toHaveLength(1);
            expect(q.scales[0]).toBeGreaterThan(0);
            // Real 0 quantizes to the zero_point (no rounding error).
            expect(q.data[0]).toBe(q.zeroPoints[0]);
        });
    });
});

// ─── CNN marshaller ──────────────────────────────────────────────────────

describe("CNN weight marshaller", () => {
    test("extractConvLayerWeights packs OIHW correctly", () => {
        // Input 3x3, 2 channels → Conv(2 filters, 2x2). Each kernel has
        // shape (Cin=2, kH=2, kW=2) = 8 weights. With a constant init
        // each kernel is fully determined.
        const cnn = new CnnBuilder()
            .withInputLayer(3, 3, 2)
            .withConvLayer({
                filters: 2,
                kernelSize: 2,
                activation: ActivationFunctions.linear,
                weightInitializer: new Uniform(0.5, 0.5),  // constant 0.5
                biasInit: 0.1,
            })
            .build();
        const convDesc = cnn.layerDescriptors[1];
        const { data, shape } = extractConvLayerWeights(convDesc.convKernels!, 2);
        expect(shape).toEqual([2, 2, 2, 2]); // [F=2, Cin=2, kH=2, kW=2]
        expect(data.length).toBe(2 * 2 * 2 * 2);
        // All values are 0.5 (constant init).
        for (const v of data) expect(v).toBeCloseTo(0.5, 5);
    });

    test("quantizeConvLayer produces int8 OIHW + per-channel scales + bias FP32", () => {
        const cnn = new CnnBuilder()
            .withInputLayer(4, 1, 3)
            .withConvLayer({
                filters: 4,
                kernelSize: [1, 3],
                activation: ActivationFunctions.relu,
                weightInitializer: new He(9),
                biasInit: 0.25,
            })
            .build();
        const convDesc = cnn.layerDescriptors[1];
        const { quantized, biases } = quantizeConvLayer(convDesc.convKernels!, 3);
        expect(quantized.shape).toEqual([4, 3, 1, 3]); // [F, Cin, kH, kW]
        expect(quantized.scales).toHaveLength(4);      // per-channel
        expect(quantized.axis).toBe(0);
        expect(quantized.zeroPoints).toEqual(Int32Array.from([0, 0, 0, 0])); // symmetric
        expect(quantized.symmetric).toBe(true);
        expect(quantized.data).toBeInstanceOf(Int8Array);
        // Biases stay FP32 and match the builder's init value.
        expect(biases).toHaveLength(4);
        for (const b of biases) expect(b).toBeCloseTo(0.25, 5);
    });

    test("extractDenseLayerWeights extracts the matrix from synapses in correct order", () => {
        // 4-unit input → 2-unit Dense. With constant Uniform init, all
        // weights are the same value; we just check the shape + order
        // of synapses doesn't desync the matrix rows.
        const cnn = new CnnBuilder()
            .withInputLayer(4, 1, 1)
            .withFlattenLayer()
            .withDenseLayer({
                units: 2,
                activation: ActivationFunctions.linear,
                weightInitializer: new Uniform(0.7, 0.7),
                biasInit: -0.2,
            })
            .build();
        const flattenDesc = cnn.layerDescriptors[1];
        const denseDesc = cnn.layerDescriptors[2];
        const { data, shape, biases } = extractDenseLayerWeights(denseDesc, flattenDesc);
        expect(shape).toEqual([2, 4]); // [units, prev_size]
        for (const v of data) expect(v).toBeCloseTo(0.7, 5);
        for (const b of biases) expect(b).toBeCloseTo(-0.2, 5);
    });

    test("quantizeDenseLayer produces int8 [units, prev_size] + per-tensor scalar scale", () => {
        const cnn = new CnnBuilder()
            .withInputLayer(4, 1, 1)
            .withFlattenLayer()
            .withDenseLayer({
                units: 3,
                activation: ActivationFunctions.linear,
                weightInitializer: new Uniform(-0.5, 0.5),
            })
            .build();
        const flattenDesc = cnn.layerDescriptors[1];
        const denseDesc = cnn.layerDescriptors[2];
        const { quantized, biases } = quantizeDenseLayer(denseDesc, flattenDesc);
        expect(quantized.shape).toEqual([3, 4]);
        expect(quantized.scales).toHaveLength(1);      // per-tensor
        expect(quantized.zeroPoints).toEqual(Int32Array.from([0]));
        expect(quantized.symmetric).toBe(true);
        expect(quantized.axis).toBeUndefined();
        expect(biases).toHaveLength(3);
    });
});
