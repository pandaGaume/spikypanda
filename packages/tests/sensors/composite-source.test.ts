import { CompositeSource, ConstantSource, SineSource } from "spikypanda-sensors";

describe("CompositeSource", () => {
    it("sums all child signals", () => {
        const a = new ConstantSource(1.5);
        const b = new ConstantSource(-0.5);
        const c = new SineSource({ frequencyHz: 10, amplitude: 2 });

        const composite = new CompositeSource([a, b, c]);
        const t = 0.025;
        const expected = 1.5 + (-0.5) + 2 * Math.sin(2 * Math.PI * 10 * t);
        expect(composite.signal(t)).toBeCloseTo(expected, 9);
    });

    it("inherits meta from the head source by default", () => {
        const a = new ConstantSource(1.0);
        const b = new ConstantSource(2.0);
        const composite = new CompositeSource([a, b]);
        expect(composite.meta().kind).toBe(a.meta().kind);
        expect(composite.meta().unit).toBe(a.meta().unit);
    });

    it("rejects empty source list", () => {
        expect(() => new CompositeSource([])).toThrow();
    });
});
