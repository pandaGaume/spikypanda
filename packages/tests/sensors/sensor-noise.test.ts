import { ConstantSource, Sensor } from "spikypanda-sensors";

describe("Sensor: noise / gain / bias", () => {
    it("returns the source value when noise/gain/bias are unset", () => {
        const source = new ConstantSource(2.5);
        const sensor = new Sensor(source, { sampleRateHz: 1000 });
        const r = sensor.next(0.5);
        expect(r.t).toBe(0.5);
        expect(r.value).toBe(2.5);
    });

    it("applies gain and bias deterministically", () => {
        const source = new ConstantSource(2.0);
        const sensor = new Sensor(source, { sampleRateHz: 1000, gain: 3, bias: -0.5 });
        expect(sensor.next(0).value).toBeCloseTo(3 * 2.0 - 0.5, 9);
    });

    it("noise has the expected std and the seed is reproducible", () => {
        const source = new ConstantSource(0);
        const a = new Sensor(source, { sampleRateHz: 1000, noiseStd: 0.5, rngSeed: 42 });
        const b = new Sensor(source, { sampleRateHz: 1000, noiseStd: 0.5, rngSeed: 42 });

        const N = 5000;
        const va: number[] = [];
        const vb: number[] = [];
        for (let i = 0; i < N; i++) {
            va.push(a.next(i / 1000).value);
            vb.push(b.next(i / 1000).value);
        }

        // Same seed → identical streams.
        for (let i = 0; i < N; i++) {
            expect(va[i]).toBe(vb[i]);
        }

        const mean = va.reduce((s, v) => s + v, 0) / N;
        const variance = va.reduce((s, v) => s + (v - mean) * (v - mean), 0) / N;
        const std = Math.sqrt(variance);

        expect(Math.abs(mean)).toBeLessThan(0.05);
        expect(Math.abs(std - 0.5)).toBeLessThan(0.05);
    });

    it("rejects sampleRateHz <= 0", () => {
        const source = new ConstantSource(0);
        expect(() => new Sensor(source, { sampleRateHz: 0 })).toThrow();
        expect(() => new Sensor(source, { sampleRateHz: -10 })).toThrow();
    });
});
