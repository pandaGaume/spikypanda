import { countOrdinalViolations, decodeHierarchicalClassification, decodeOneVsReference, decodeOrdinalClassification, summarizeClassification } from "spikypanda-core";

describe("SNN classification topology", () => {
    test("decodes independent class-vs-reference heads and reports ambiguity", () => {
        expect(decodeOneVsReference([-0.2, -0.1, -0.4, -0.3])).toEqual({
            predictedClass: 0,
            activeHeadCount: 0,
            winningMargin: -0.1,
        });
        expect(decodeOneVsReference([0.2, 0.7, -0.1, 0.4])).toEqual({
            predictedClass: 2,
            activeHeadCount: 3,
            winningMargin: 0.7,
        });
    });

    test("routes a hierarchical decision through the gate", () => {
        expect(decodeHierarchicalClassification(-0.01, [0, 2, 1, 0])).toBe(0);
        expect(decodeHierarchicalClassification(0.01, [0, 2, 1, 0])).toBe(2);
    });

    test("enforces the cumulative prefix during ordinal decoding", () => {
        const thresholds = [0, 0, 0, 0];
        expect(decodeOrdinalClassification([1, 1, -1, -1], thresholds)).toBe(2);
        expect(decodeOrdinalClassification([-1, 1, 1, 1], thresholds)).toBe(0);
        expect(countOrdinalViolations([-1, 1, 1, -1], thresholds)).toBe(1);
    });

    test("builds confusion, balanced accuracy and macro F1", () => {
        const summary = summarizeClassification([0, 0, 1, 1], [0, 1, 1, 1], 2);
        expect(summary.correct).toBe(3);
        expect(summary.accuracy).toBe(0.75);
        expect(summary.balancedAccuracy).toBe(0.75);
        expect(summary.macroF1).toBeCloseTo(0.7333333333);
        expect(summary.confusionMatrix).toEqual([
            [1, 1],
            [0, 2],
        ]);
    });

    test("rejects malformed topology inputs", () => {
        expect(() => decodeOneVsReference([])).toThrow(/at least one/i);
        expect(() => decodeOrdinalClassification([1], [])).toThrow(/equally sized/i);
        expect(() => summarizeClassification([0], [2], 2)).toThrow(/outside/i);
    });
});
