/**
 * The Boltzmann plot, tested against the model that produces it.
 *
 * The tests are built the way the measurement is checked: a temperature
 * is chosen, the forward model is asked for the intensities it implies,
 * those intensities are handed to the plot, and the temperature has to
 * come back. That closes the loop between the two halves of the track,
 * and it is the only way to test a recovery, since on a real spectrum
 * there is nothing to compare the answer with.
 *
 * The lines used are real ones, Ca II out of the shipped catalogue,
 * because the quantity being recovered depends on the spread of upper
 * level energies and a synthetic set would let that spread be chosen
 * conveniently.
 */
import { BOLTZMANN_CONSTANT, ELEMENTARY_CHARGE } from "spikypanda-core";
import {
    boltzmannFit,
    boltzmannOrdinate,
    computePhysicalEmissions,
    NIST_IONISATION_ENERGIES_EV,
    NIST_SPECIES,
    partitionFunction,
    sahaRatio,
    ionisationFractions,
    temperatureFromIonRatio,
} from "../../dev/plugins/spectroscopy/src";
import type { IBoltzmannPoint, IPhysicalModelData } from "../../dev/plugins/spectroscopy/src";

const DATA: IPhysicalModelData = {
    species: NIST_SPECIES.map((s) => ({ element: s.element, ionisation: s.ionisation, asdName: s.asdName, lines: s.lines, levels: s.levels })),
    ionisationEnergiesEv: NIST_IONISATION_ENERGIES_EV,
};

/**
 * The lines of one species as the model emits them at a temperature,
 * turned into Boltzmann points. This is the path a real measurement
 * takes, minus the measuring.
 */
function modelPoints(element: string, ionisation: number, temperatureK: number, floor = 0.01): IBoltzmannPoint[] {
    const r = computePhysicalEmissions({ [element]: 1 }, DATA, temperatureK, 1e17, 1);
    const mine = r.intensities.filter((i) => i.line.element === element && i.line.ionisation === ionisation);
    let max = 0;
    for (const i of mine) max = Math.max(max, i.intensity);
    return mine
        .filter((i) => i.intensity >= max * floor)
        .map((i) => ({
            wavelengthNm: i.line.wavelengthNm,
            upperLevelEnergyEv: i.line.upperLevelEnergyEv as number,
            lowerLevelEnergyEv: i.line.lowerLevelEnergyEv,
            upperLevelWeight: i.line.upperLevelWeight as number,
            transitionProbability: i.line.transitionProbability as number,
            // The model emits an energy per unit time, which is what the
            // ordinate expects; the wavelength factor inside it turns
            // that into the photon rate the populations drive.
            intensity: i.intensity,
        }));
}

describe("boltzmannOrdinate", () => {
    it("is the logarithm of the intensity times the wavelength over g A", () => {
        const p: IBoltzmannPoint = { wavelengthNm: 400, upperLevelEnergyEv: 3, upperLevelWeight: 4, transitionProbability: 1e8, intensity: 2 };
        // No lower level given, so the photon energy comes from the
        // wavelength and the ordinate is the classic ln(I lambda / g A)
        // up to the constant h c / e.
        expect(boltzmannOrdinate(p)).toBeCloseTo(Math.log((2 * 400e-9) / (((6.62607015e-34 * 299792458) / 1.602176634e-19) * 4 * 1e8)), 9);

        // With both levels, the photon energy is their difference.
        const withLower = { ...p, lowerLevelEnergyEv: 1 };
        expect(boltzmannOrdinate(withLower)).toBeCloseTo(Math.log(2 / (2 * 4 * 1e8)), 12);
    });

    it("refuses what has no logarithm instead of returning one", () => {
        const base: IBoltzmannPoint = { wavelengthNm: 400, upperLevelEnergyEv: 3, upperLevelWeight: 4, transitionProbability: 1e8, intensity: 2 };
        expect(Number.isNaN(boltzmannOrdinate({ ...base, intensity: 0 }))).toBe(true);
        expect(Number.isNaN(boltzmannOrdinate({ ...base, intensity: -1 }))).toBe(true);
        expect(Number.isNaN(boltzmannOrdinate({ ...base, upperLevelWeight: 0 }))).toBe(true);
        expect(Number.isNaN(boltzmannOrdinate({ ...base, transitionProbability: 0 }))).toBe(true);
    });
});

describe("boltzmannFit, against the model it inverts", () => {
    for (const temperatureK of [7000, 9000, 12000]) {
        it(`recovers ${temperatureK} K from the Ca II lines the model emits there`, () => {
            const points = modelPoints("Ca", 1, temperatureK);
            // How many lines clear one per cent of the maximum depends
            // on the temperature itself: four at 7 000 K, more above.
            expect(points.length).toBeGreaterThanOrEqual(4);

            const fit = boltzmannFit(points);
            expect(fit.blocker).toBeNull();
            // Exact, not approximate: the plot inverts the same
            // expression the model evaluated, so anything beyond
            // floating point would be a mistake in one of the two.
            expect(fit.temperatureK).toBeCloseTo(temperatureK, 6);
            expect(fit.scatterDex).toBeLessThan(1e-12);
        });
    }

    it("has no usable lever on cool calcium, however exactly it inverts", () => {
        // The lever is not a property of the species, it is a property
        // of the species AT a temperature: which lines clear a
        // detection floor depends on the temperature being measured.
        // At 7 000 K the four visible Ca II lines span 0.028 eV of
        // upper level energy, against 3.9 eV at 9 000 K. The fit still
        // inverts noiseless data exactly, which is precisely why the
        // span has to be read alongside the answer: with any real
        // scatter a 0.028 eV lever measures nothing.
        const cool = boltzmannFit(modelPoints("Ca", 1, 7000));
        const warm = boltzmannFit(modelPoints("Ca", 1, 9000));
        expect(cool.energySpanEv).toBeLessThan(0.05);
        expect(warm.energySpanEv).toBeGreaterThan(3);

        // Give both the same five per cent scatter and the cool plot
        // falls apart while the warm one holds.
        const perturb = (points: IBoltzmannPoint[]) => points.map((p, k) => ({ ...p, intensity: p.intensity * (1 + 0.05 * Math.sin(k * 2.4)) }));
        const coolNoisy = boltzmannFit(perturb(modelPoints("Ca", 1, 7000)));
        const warmNoisy = boltzmannFit(perturb(modelPoints("Ca", 1, 9000)));
        expect(Math.abs(coolNoisy.temperatureK - 7000) / 7000).toBeGreaterThan(0.5);
        expect(Math.abs(warmNoisy.temperatureK - 9000) / 9000).toBeLessThan(0.1);
    });

    it("recovers a temperature from Ca I as well, on a shorter lever", () => {
        // Neutral calcium spans less energy than its ion, which is why
        // the protocol's cross-check between two stages is a check and
        // not a formality: the two plots do not have the same leverage.
        const fit = boltzmannFit(modelPoints("Ca", 0, 8000));
        expect(fit.blocker).toBeNull();
        expect(fit.temperatureK).toBeCloseTo(8000, 6);
    });

    it("turns a known scatter in the intensities into a scatter in dex", () => {
        // Half of the lines are moved up by ten per cent and half down,
        // which is 0.0414 dex either way.
        const points = modelPoints("Ca", 1, 9000).map((p, k) => ({ ...p, intensity: p.intensity * (k % 2 === 0 ? 1.1 : 0.9) }));
        const fit = boltzmannFit(points);
        expect(fit.scatterDex).toBeGreaterThan(0.02);
        expect(fit.scatterDex).toBeLessThan(0.06);
        // And the temperature survives it, because the perturbation is
        // not correlated with the energy.
        expect(fit.temperatureK).toBeGreaterThan(7000);
        expect(fit.temperatureK).toBeLessThan(12000);
    });

    it("weights a line by what its transition probability is worth", () => {
        // One line is moved by a factor three and declared uncertain to
        // a factor three. Weighted, it must not drag the temperature
        // the way it does unweighted.
        const clean = modelPoints("Ca", 1, 9000);
        const spoiled = clean.map((p, k) => (k === 0 ? { ...p, intensity: p.intensity * 3 } : p));
        const weighted = spoiled.map((p, k) => (k === 0 ? { ...p, relativeUncertainty: 1.1 } : { ...p, relativeUncertainty: 0.05 }));

        const unweightedError = Math.abs(boltzmannFit(spoiled).temperatureK - 9000);
        const weightedError = Math.abs(boltzmannFit(weighted).temperatureK - 9000);
        expect(weightedError).toBeLessThan(unweightedError / 2);
    });

    it("says why rather than returning a number it cannot stand behind", () => {
        const one: IBoltzmannPoint = { wavelengthNm: 400, upperLevelEnergyEv: 3, upperLevelWeight: 4, transitionProbability: 1e8, intensity: 2 };
        expect(boltzmannFit([one, one]).blocker).toMatch(/at least three/);

        // Three lines sharing an upper level: no lever at all.
        expect(boltzmannFit([one, { ...one, wavelengthNm: 401 }, { ...one, wavelengthNm: 402 }]).blocker).toMatch(/no lever/);

        // A rising population with energy is not thermal, and the fit
        // must say so rather than hand back a negative temperature.
        const rising = [0, 1, 2].map((k) => ({ ...one, upperLevelEnergyEv: 3 + k, intensity: 2 * Math.exp(k) }));
        const fit = boltzmannFit(rising);
        expect(fit.blocker).toMatch(/not thermal/);
        expect(Number.isNaN(fit.temperatureK)).toBe(true);
        // The slope is still reported, because it is the evidence.
        expect(fit.slopePerEv).toBeGreaterThan(0);
    });

    it("gives an uncertainty that shrinks as the lever grows", () => {
        // Same scatter, two energy spans: the longer lever must give the
        // tighter temperature. This is why a species with a narrow
        // range of upper levels cannot measure a temperature however
        // many lines it has.
        const perturb = (points: IBoltzmannPoint[]) => points.map((p, k) => ({ ...p, intensity: p.intensity * (1 + 0.05 * Math.sin(k * 2.4)) }));
        const wide = boltzmannFit(perturb(modelPoints("Ca", 1, 9000)));
        const narrow = boltzmannFit(perturb(modelPoints("Ca", 1, 9000).filter((p) => p.upperLevelEnergyEv < 4)));

        expect(narrow.energySpanEv).toBeLessThan(wide.energySpanEv);
        expect(narrow.temperatureUncertaintyK).toBeGreaterThan(wide.temperatureUncertaintyK);
    });
});

describe("temperatureFromIonRatio", () => {
    /**
     * The ratio the model predicts between the strongest Ca II line and
     * the strongest Ca I line, as a function of temperature. This is
     * the function a measurement is inverted against.
     */
    const predicted = (temperatureK: number): number => {
        const r = computePhysicalEmissions({ Ca: 1 }, DATA, temperatureK, 1e17, 1);
        const strongest = (stage: number) => r.intensities.filter((i) => i.line.ionisation === stage).reduce((best, i) => (i.intensity > best ? i.intensity : best), 0);
        return strongest(1) / strongest(0);
    };

    it("inverts the model's own ion to neutral ratio", () => {
        for (const truth of [7000, 9000, 11000]) {
            const { temperatureK, blocker } = temperatureFromIonRatio(predicted(truth), NIST_IONISATION_ENERGIES_EV["Ca I"], 1e17, predicted);
            expect(blocker).toBeNull();
            expect(temperatureK).toBeCloseTo(truth, 2);
        }
    });

    it("agrees with the slope, which is what the protocol's M4 asks", () => {
        // The two readings are independent: the slope never touches the
        // ionisation balance and the ratio never touches a single
        // species' level populations. Agreement means the plasma is in
        // equilibrium across the stages as well as within one.
        const truth = 9000;
        const fromSlope = boltzmannFit(modelPoints("Ca", 1, truth)).temperatureK;
        const fromRatio = temperatureFromIonRatio(predicted(truth), NIST_IONISATION_ENERGIES_EV["Ca I"], 1e17, predicted).temperatureK;
        expect(Math.abs(fromSlope - fromRatio) / truth).toBeLessThan(0.01);
    });

    it("says the ratio is out of reach rather than extrapolating", () => {
        const far = temperatureFromIonRatio(1e9, NIST_IONISATION_ENERGIES_EV["Ca I"], 1e17, predicted);
        expect(far.blocker).toMatch(/outside what the model can produce/);
        expect(Number.isNaN(far.temperatureK)).toBe(true);
    });

    it("refuses a ratio that is not positive", () => {
        expect(temperatureFromIonRatio(0, 6.11, 1e17, predicted).blocker).toMatch(/not positive/);
    });

    it("is consistent with the Saha balance it comes from", () => {
        // A sanity anchor outside the plot: at 9000 K and 1e17 cm^-3
        // calcium is mostly ionised, so the ion lines must dominate.
        const u = (stage: 0 | 1) => partitionFunction(NIST_SPECIES.find((s) => s.element === "Ca" && s.ionisation === stage)!.levels, 9000).value;
        const fractions = ionisationFractions([sahaRatio(u(0), u(1), NIST_IONISATION_ENERGIES_EV["Ca I"], 9000, 1e17)]);
        expect(fractions[1]).toBeGreaterThan(0.8);
        expect(predicted(9000)).toBeGreaterThan(1);
        // And kT at 9000 K is the usual 0.776 eV, which every tolerance
        // in the protocol is stated against.
        expect((BOLTZMANN_CONSTANT * 9000) / ELEMENTARY_CHARGE).toBeCloseTo(0.7756, 4);
    });
});
