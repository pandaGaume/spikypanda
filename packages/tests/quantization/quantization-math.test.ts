/**
 * Phase 7.1 — unit tests for the quantization math primitives.
 * Validates round-half-even semantics, scalar quantize/dequantize
 * round-trip, per-tensor and per-channel tensor encoding,
 * saturation at int8/uint8 bounds, and parameter computation from
 * (min, max) and (absMax) ranges.
 */
import {
    asymmetricParamsFromRange,
    dequantizeScalar,
    dequantizeTensor,
    dtypeBounds,
    fakeQuantizeTensor,
    IQuantizationParams,
    quantizeScalar,
    quantizeTensor,
    roundHalfEven,
    symmetricParamsFromAbsMax,
} from "spikypanda-core";

describe("quantization math", () => {
    // ─── roundHalfEven ───────────────────────────────────────────────

    describe("roundHalfEven", () => {
        test.each([
            [0.5, 0],     // .5 → even (0)
            [1.5, 2],     // .5 → even (2)
            [2.5, 2],     // .5 → even (2)
            [3.5, 4],     // .5 → even (4)
            [-0.5, 0],    // -.5 → even (0)
            [-1.5, -2],   // -.5 → even (-2)
            [-2.5, -2],   // -.5 → even (-2)
            [1.49999, 1],
            [1.50001, 2],
            [0, 0],
        ])("roundHalfEven(%p) = %p", (input, expected) => {
            // Numeric equality (Object.is treats -0 and 0 as distinct,
            // so we use === to compare loosely).
            expect(roundHalfEven(input) === expected).toBe(true);
        });

        test("roundHalfEven(-0) is numerically 0", () => {
            // Math.floor(-0) is -0; we don't try to canonicalize the
            // sign of zero. Test that the value is numerically zero.
            expect(roundHalfEven(-0) === 0).toBe(true);
        });

        test("preserves NaN / ±Inf", () => {
            expect(Number.isNaN(roundHalfEven(NaN))).toBe(true);
            expect(roundHalfEven(Infinity)).toBe(Infinity);
            expect(roundHalfEven(-Infinity)).toBe(-Infinity);
        });
    });

    // ─── dtypeBounds ────────────────────────────────────────────────

    test("dtypeBounds returns the correct integer ranges", () => {
        expect(dtypeBounds("int8")).toEqual({ lo: -128, hi: 127 });
        expect(dtypeBounds("uint8")).toEqual({ lo: 0, hi: 255 });
    });

    // ─── quantizeScalar / dequantizeScalar ──────────────────────────

    describe("quantizeScalar / dequantizeScalar", () => {
        test("int8 round-trip preserves quantizable values exactly", () => {
            const scale = 0.1;
            const zp = 0;
            // Values that lie exactly on the integer grid round-trip exactly.
            for (const v of [-12.7, -1.0, 0, 0.5, 1.0, 12.7]) {
                const q = quantizeScalar(v, scale, zp, "int8");
                const back = dequantizeScalar(q, scale, zp);
                expect(Math.abs(back - v)).toBeLessThan(1e-6);
            }
        });

        test("saturates at int8 bounds", () => {
            const scale = 0.1, zp = 0;
            expect(quantizeScalar(1e9, scale, zp, "int8")).toBe(127);
            expect(quantizeScalar(-1e9, scale, zp, "int8")).toBe(-128);
        });

        test("saturates at uint8 bounds", () => {
            const scale = 0.1, zp = 0;
            expect(quantizeScalar(1e9, scale, zp, "uint8")).toBe(255);
            expect(quantizeScalar(-1e9, scale, zp, "uint8")).toBe(0);
        });

        test("uint8 with zero_point > 0 maps signed input to unsigned grid", () => {
            // scale=0.1, zp=128 → real value -12.8 quantizes to 0,
            //                     0 quantizes to 128, 12.7 quantizes to 255.
            const scale = 0.1, zp = 128;
            expect(quantizeScalar(0, scale, zp, "uint8")).toBe(128);
            expect(quantizeScalar(-12.8, scale, zp, "uint8")).toBe(0);
            expect(quantizeScalar(12.7, scale, zp, "uint8")).toBe(255);
        });

        test("uses banker's rounding (.5 → even)", () => {
            // scale=1, zp=0, value=0.5: round_half_even(0.5)=0.
            expect(quantizeScalar(0.5, 1, 0, "int8")).toBe(0);
            // value=1.5: round_half_even(1.5)=2.
            expect(quantizeScalar(1.5, 1, 0, "int8")).toBe(2);
            // value=-0.5: round_half_even(-0.5)=0.
            expect(quantizeScalar(-0.5, 1, 0, "int8")).toBe(0);
        });

        test("degenerate scale falls back to zero_point", () => {
            // scale = 0 is invalid but we cope: bucket everything at zp.
            expect(quantizeScalar(123, 0, 5, "int8")).toBe(5);
            expect(quantizeScalar(-123, NaN, 5, "int8")).toBe(5);
        });
    });

    // ─── asymmetricParamsFromRange ──────────────────────────────────

    describe("asymmetricParamsFromRange", () => {
        test("maps a balanced range to a symmetric int8 grid", () => {
            const p = asymmetricParamsFromRange(-1, 1, "int8");
            // hi - lo = 255 over real range 2 → scale = 2/255 ≈ 0.00784.
            expect(p.scale).toBeCloseTo(2 / 255, 5);
            // zero_point: round(-128 - (-1)/scale) = round(0) = 0.
            expect(p.zeroPoint).toBe(0);
        });

        test("maps a positive-only range so real 0 falls on the integer grid", () => {
            // min = 0.5 gets clamped to 0 to keep 0 representable.
            const p = asymmetricParamsFromRange(0.5, 1, "uint8");
            // After clamp: lo_r = 0, hi_r = 1 → scale = 1/255.
            expect(p.scale).toBeCloseTo(1 / 255, 5);
            // zero_point: round(0 - 0/scale) = 0.
            expect(p.zeroPoint).toBe(0);
            // Real 0 → quantized 0 (no error).
            expect(quantizeScalar(0, p.scale, p.zeroPoint, "uint8")).toBe(0);
        });

        test("degenerate (min === max) yields scale=1, zp at the dtype origin", () => {
            const p = asymmetricParamsFromRange(0, 0, "int8");
            expect(p.scale).toBe(1);
            // With scale=1, lo_r=0, lo=-128: zp = round(-128 - 0) = -128.
            expect(p.zeroPoint).toBe(-128);
        });
    });

    // ─── symmetricParamsFromAbsMax ─────────────────────────────────

    describe("symmetricParamsFromAbsMax", () => {
        test("scale = absMax/127, zp = 0", () => {
            const p = symmetricParamsFromAbsMax(0.5, "int8");
            expect(p.scale).toBeCloseTo(0.5 / 127, 6);
            expect(p.zeroPoint).toBe(0);
        });

        test("absMax = 0 falls back to scale = 1/127 (no /0)", () => {
            const p = symmetricParamsFromAbsMax(0, "int8");
            expect(p.scale).toBeCloseTo(1 / 127, 6);
            expect(p.zeroPoint).toBe(0);
        });

        test("rejects uint8 (symmetric is signed-only)", () => {
            expect(() => symmetricParamsFromAbsMax(1, "uint8")).toThrow();
        });
    });

    // ─── quantizeTensor / dequantizeTensor (per_tensor) ─────────────

    test("per_tensor quantize/dequantize round-trips an aligned tensor", () => {
        const data = Float32Array.from([-1, -0.5, 0, 0.5, 1]);
        const t = { data, shape: [5] };
        const params: IQuantizationParams = {
            scheme: "per_tensor",
            dtype: "int8",
            scales: Float32Array.from([1 / 127]),
            zeroPoints: Int32Array.from([0]),
            symmetric: true,
        };
        const q = quantizeTensor(t, params);
        const back = dequantizeTensor(q);
        for (let i = 0; i < data.length; i++) {
            // Within a half-step.
            expect(Math.abs(back.data[i] - data[i])).toBeLessThan(params.scales[0]);
        }
        // int8 grid: -127, -64 (around -0.5), 0, 64 (around 0.5), 127.
        expect(Array.from(q.data as Int8Array)).toEqual([-127, -64, 0, 64, 127]);
    });

    // ─── quantizeTensor (per_channel) ──────────────────────────────

    test("per_channel quantize uses per-slice scales along the axis", () => {
        // Shape [2, 3]: two channels of 3 values each, axis=0.
        // Channel 0 has range [-4, 4]; channel 1 has range [-2, 2].
        const data = Float32Array.from([-4, 0, 4, -2, 0, 2]);
        const t = { data, shape: [2, 3] };
        // Symmetric per_channel: scale[c] = absMax[c] / 127.
        const params: IQuantizationParams = {
            scheme: "per_channel",
            dtype: "int8",
            scales: Float32Array.from([4 / 127, 2 / 127]),
            zeroPoints: Int32Array.from([0, 0]),
            axis: 0,
            symmetric: true,
        };
        const q = quantizeTensor(t, params);
        // Both channels should saturate at ±127 at the extremes.
        expect(Array.from(q.data as Int8Array)).toEqual([-127, 0, 127, -127, 0, 127]);
    });

    // ─── fakeQuantizeTensor ─────────────────────────────────────────

    test("fakeQuantizeTensor returns a Float32 ITensor whose values lie on the integer grid", () => {
        const data = Float32Array.from([-1, -0.5, 0, 0.5, 1]);
        const t = { data, shape: [5] };
        const params: IQuantizationParams = {
            scheme: "per_tensor",
            dtype: "int8",
            scales: Float32Array.from([1 / 127]),
            zeroPoints: Int32Array.from([0]),
            symmetric: true,
        };
        const fq = fakeQuantizeTensor(t, params);
        expect(fq.data).toBeInstanceOf(Float32Array);
        // Every value must be an integer multiple of scale (modulo FP32 noise).
        const scale = params.scales[0];
        for (const v of fq.data) {
            const rem = (v / scale) - Math.round(v / scale);
            expect(Math.abs(rem)).toBeLessThan(1e-3);
        }
        // The quantization metadata is attached for downstream consumers.
        expect(fq.quantization).toBe(params);
    });
});
