/**
 * The self-absorption diagnostic, tested by absorbing a model spectrum.
 *
 * The tests work the way the other V1-B modules' do and the way a
 * recovery has to be tested: a depression is chosen, the forward
 * model's intensities are reduced by it, the result is handed to the
 * diagnostic, and the depression has to come back. On a real spectrum
 * there is nothing to compare an answer with.
 *
 * What is NOT tested here is a correction, because there is none. A
 * uniform slab failed its own internal consistency on this data set,
 * returning optical depths differing by factors of 2.4 to 5.7 for one
 * line depending on its partner, so no modelled factor multiplies an
 * intensity anywhere in this plugin. See
 * `internals/libs/14-SELF-ABSORPTION.md`.
 */
import { depressionClasses, findLinePairs, mixingSystematicDex, NIST_SPECIES, opticalDepthProxy, predictPairRatio, selfAbsorptionIndex } from "../../dev/plugins/spectroscopy/src";
import type { IAtomicLine } from "../../dev/plugins/spectroscopy/src";

const linesOf = (element: string, ionisation: number): ReadonlyArray<IAtomicLine> => NIST_SPECIES.find((s) => s.element === element && s.ionisation === ionisation)!.lines;

/** A line built to order, for the cases the catalogue does not contain. */
const line = (wavelengthNm: number, upper: number, lower: number, weight: number, probability: number): IAtomicLine => ({
    element: "Xx",
    ionisation: 0,
    wavelengthNm,
    relativeStrength: 1,
    verified: true,
    provenance: "test",
    transitionProbability: probability,
    upperLevelWeight: weight,
    upperLevelEnergyEv: upper,
    lowerLevelEnergyEv: lower,
    lowerLevelWeight: 1,
});

describe("findLinePairs", () => {
    it("finds a branching pair: one upper level, two lower ones", () => {
        const pairs = findLinePairs([line(400, 5, 1, 3, 1e8), line(500, 5, 2.0, 3, 5e7)]);
        expect(pairs).toHaveLength(1);
        expect(pairs[0].kind).toBe("branching");
        expect(pairs[0].upperSplitEv).toBe(0);
        // The stronger line is the one the model emits harder, which is
        // the one reabsorption bites first.
        expect(pairs[0].strong.wavelengthNm).toBe(400);
    });

    it("finds a doublet: one lower level, two upper ones close together", () => {
        const pairs = findLinePairs([line(400, 5, 0, 4, 1e8), line(420, 4.97, 0, 2, 1e8)]);
        expect(pairs).toHaveLength(1);
        expect(pairs[0].kind).toBe("doublet");
        expect(pairs[0].upperSplitEv).toBeCloseTo(0.03, 6);
    });

    it("refuses two upper levels too far apart to be one term", () => {
        // 0.3 eV is not a fine-structure split, so the ratio would carry
        // a Boltzmann factor big enough to be a thermometer rather than
        // a diagnostic.
        expect(findLinePairs([line(400, 5, 0, 4, 1e8), line(450, 4.7, 0, 2, 1e8)])).toHaveLength(0);
    });

    it("refuses lines the instrument cannot separate", () => {
        expect(findLinePairs([line(400, 5, 1, 3, 1e8), line(400.3, 5, 2, 3, 5e7)])).toHaveLength(0);
        expect(findLinePairs([line(400, 5, 1, 3, 1e8), line(400.3, 5, 2, 3, 5e7)], { minSeparationNm: 0.1 })).toHaveLength(1);
    });

    it("keeps one line per observed wavelength", () => {
        // Two catalogue rows at the same wavelength cannot be told apart
        // by a measurement, so pairing through one of them would compare
        // a measured blend against one component's atomic data.
        const pairs = findLinePairs([line(400, 5, 1, 3, 1e8), line(400, 5, 1.5, 3, 2e8), line(500, 5, 2, 3, 5e7)]);
        expect(pairs).toHaveLength(1);
        // The stronger of the two at 400 nm is the one kept.
        expect(pairs[0].strong.transitionProbability).toBe(2e8);
    });

    it("finds the pairs this data set actually used, in the shipped catalogue", () => {
        // Ca II H and K: the track called them a branching pair and they
        // are a doublet, sharing the GROUND state and split in their
        // upper levels by 27.6 meV. Getting the kind right matters
        // because only the doublet carries a Boltzmann factor.
        const caII = findLinePairs(linesOf("Ca", 1), { rangeNm: [260, 990] });
        const hk = caII.find((p) => Math.abs(p.strong.wavelengthNm - 393.366) < 0.01 && Math.abs(p.weak.wavelengthNm - 396.847) < 0.01);
        expect(hk).toBeDefined();
        expect(hk!.kind).toBe("doublet");
        expect(hk!.upperSplitEv).toBeCloseTo(0.0276, 3);
        expect(predictPairRatio(hk!, 9000)).toBeCloseTo(2.044, 2);

        // Al I 396.152 and 394.401 share an upper level exactly, which
        // is the one exact pair this sample gave.
        const alI = findLinePairs(linesOf("Al", 0), { rangeNm: [260, 990] });
        const al = alI.find((p) => Math.abs(p.strong.wavelengthNm - 396.152) < 0.01 && Math.abs(p.weak.wavelengthNm - 394.401) < 0.01);
        expect(al).toBeDefined();
        expect(al!.kind).toBe("branching");
        expect(predictPairRatio(al!, 9000)).toBeCloseTo(1.965, 2);
    });

    it("gives a branching pair a ratio that does not move with temperature, and a doublet one that barely does", () => {
        const branching = findLinePairs([line(400, 5, 1, 3, 1e8), line(500, 5, 2.0, 3, 5e7)])[0];
        expect(predictPairRatio(branching, 7000)).toBeCloseTo(predictPairRatio(branching, 14000), 12);

        // A doublet's split is the whole of its temperature dependence,
        // and over the plausible range it is about a per cent.
        const doublet = findLinePairs([line(400, 5, 0, 4, 1e8), line(420, 4.97, 0, 2, 1e8)])[0];
        const drift = Math.abs(predictPairRatio(doublet, 14000) / predictPairRatio(doublet, 7000) - 1);
        expect(drift).toBeGreaterThan(0.001);
        expect(drift).toBeLessThan(0.05);
    });
});

describe("selfAbsorptionIndex", () => {
    it("recovers the ratio of two depressions it was given", () => {
        // The strong line keeps 55 % of its light and the weak one 90 %:
        // the index has to come back as their ratio, because that is all
        // a pair can see.
        const predicted = 2.044;
        const measured = (predicted * 0.55) / 0.9;
        const reading = selfAbsorptionIndex(measured, predicted);
        expect(reading.blocker).toBeNull();
        expect(reading.index).toBeCloseTo(0.55 / 0.9, 12);
    });

    it("reads one when nothing absorbs", () => {
        const reading = selfAbsorptionIndex(1.965, 1.965);
        expect(reading.index).toBeCloseTo(1, 12);
        expect(reading.blocker).toBeNull();
    });

    it("refuses an index above one instead of reporting a weak result", () => {
        // Reabsorption can only take light from the stronger line, so a
        // stronger line brighter than atomic data allows is a blend or a
        // wrong probability. One pair of the six on this data set
        // announced itself that way in 21 of 27 readings.
        const reading = selfAbsorptionIndex(1.22 * 1.4, 1.22);
        expect(Number.isNaN(reading.index)).toBe(false);
        expect(reading.index).toBeCloseTo(1.4, 6);
        expect(reading.blocker).toMatch(/above one/);
        expect(reading.blocker).toMatch(/blend/);
    });

    it("tolerates a reading just above one, since the measurement has noise", () => {
        expect(selfAbsorptionIndex(1.02, 1.0).blocker).toBeNull();
        expect(selfAbsorptionIndex(1.2, 1.0).blocker).not.toBeNull();
    });

    it("says why on a ratio that is not a number", () => {
        expect(selfAbsorptionIndex(0, 2).blocker).toMatch(/measured ratio/);
        expect(selfAbsorptionIndex(-1, 2).blocker).toMatch(/measured ratio/);
        expect(selfAbsorptionIndex(2, 0).blocker).toMatch(/predicted ratio/);
        expect(selfAbsorptionIndex(2, Number.NaN).blocker).toMatch(/predicted ratio/);
    });
});

describe("opticalDepthProxy", () => {
    it("rises with the transition probability and falls with the lower level", () => {
        const base = line(400, 5, 1, 3, 1e8);
        expect(opticalDepthProxy(line(400, 5, 1, 3, 2e8), 9000)).toBeCloseTo(2 * opticalDepthProxy(base, 9000), 6);
        // A lower level further up holds fewer absorbers, so the line is
        // thinner, which is why a ground-state line is the worst case.
        expect(opticalDepthProxy(line(400, 5, 3, 3, 1e8), 9000)).toBeLessThan(opticalDepthProxy(base, 9000));
    });

    it("puts a ground-state line of calcium above its metastable partner", () => {
        // Ca II 393.366 starts from the ground state and 866.214 from
        // the 3d level 1.69 eV up. The measurement makes the first more
        // depressed, 0.602 against 0.670, and the proxy has to order
        // them the same way or it is not the right ordering quantity.
        const caII = linesOf("Ca", 1);
        const at = (nm: number) => caII.find((l) => Math.abs(l.wavelengthNm - nm) < 0.01)!;
        expect(opticalDepthProxy(at(393.366), 9000)).toBeGreaterThan(opticalDepthProxy(at(866.214), 9000));
    });

    it("refuses a line missing what it needs", () => {
        expect(Number.isNaN(opticalDepthProxy({ ...line(400, 5, 1, 3, 1e8), transitionProbability: undefined }, 9000))).toBe(true);
        expect(Number.isNaN(opticalDepthProxy({ ...line(400, 5, 1, 3, 1e8), lowerLevelEnergyEv: undefined }, 9000))).toBe(true);
    });
});

describe("depressionClasses", () => {
    it("groups lines by decade of depth and leaves out what it cannot judge", () => {
        const set = [line(400, 5, 0, 3, 1e8), line(401, 5, 0, 3, 1.5e8), line(402, 5, 4, 3, 1e8), { ...line(403, 5, 0, 3, 1e8), transitionProbability: undefined }];
        const classes = depressionClasses(set, 9000);
        expect(classes.length).toBeGreaterThanOrEqual(2);
        // The two ground-state lines within 1.5x of each other share a
        // decade; the one starting 4 eV up does not.
        const total = classes.reduce((n, c) => n + c.lines.length, 0);
        expect(total).toBe(3);
        // Sorted shallowest first, so a caller can take the thin end.
        for (let k = 1; k < classes.length; k++) expect(classes[k].decade).toBeGreaterThan(classes[k - 1].decade);
    });

    it("spans the real catalogue over many decades, which is why a class is a decade wide", () => {
        const classes = depressionClasses(linesOf("Ca", 1), 9000);
        expect(classes.length).toBeGreaterThan(4);
        const span = classes[classes.length - 1].highestProxy / classes[0].lowestProxy;
        expect(span).toBeGreaterThan(1e4);
    });
});

describe("mixingSystematicDex", () => {
    it("prices the choice this data set measured", () => {
        // The ground-state class reads 0.602 and the above-2-eV class
        // 0.791. Mixing them puts this much into a Boltzmann plot, whose
        // whole tolerance is 0.15 dex.
        const cost = mixingSystematicDex(0.602, 0.791);
        expect(cost).toBeCloseTo(0.1186, 4);
        expect(cost / 0.15).toBeGreaterThan(0.75);
    });

    it("is zero when two classes are depressed alike, which is the whole point", () => {
        // A depression that is the same on every line moves only the
        // intercept, which carries the species' density and is unknown
        // anyway. It is the VARIATION that tilts a Boltzmann plot.
        expect(mixingSystematicDex(0.4, 0.4)).toBe(0);
        expect(mixingSystematicDex(1, 1)).toBe(0);
    });

    it("is symmetric and refuses what has no logarithm", () => {
        expect(mixingSystematicDex(0.5, 0.8)).toBeCloseTo(mixingSystematicDex(0.8, 0.5), 12);
        expect(Number.isNaN(mixingSystematicDex(0, 0.5))).toBe(true);
        expect(Number.isNaN(mixingSystematicDex(0.5, -1))).toBe(true);
    });
});
