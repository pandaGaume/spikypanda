/**
 * Measuring self-absorption, and nothing else.
 *
 * A plasma reabsorbs its own light. The strongest lines lose the most,
 * so a measured spectrum is not the spectrum the atoms emitted, and the
 * forward model of this plugin computes the latter. The gap between
 * them is the dominant error of V1-B
 * (`internals/libs/13-V1B-FIRST-FIT.md`).
 *
 * This module MEASURES that gap. It does not correct it, and the
 * refusal is a measurement rather than a preference: a uniform slab,
 * the standard first model, was tested on this data set and failed its
 * own internal consistency, returning optical depths that differed by
 * factors of 2.4 to 5.7 for ONE line depending on which partner it was
 * compared against. `internals/libs/14-SELF-ABSORPTION.md` has the
 * numbers. Multiplying an intensity by a factor from a model the data
 * has already excluded would make a spectrum look corrected without
 * being so, which is worse than leaving it visibly uncorrected.
 *
 * What is here instead:
 *
 *   - the pairs of lines whose ratio is fixed by atomic data, so a
 *     departure from it measures reabsorption and cannot be blamed on
 *     the plasma's temperature, density or composition;
 *   - the index that departure gives, with the flag that says a reading
 *     is impossible;
 *   - the quantity that orders lines by how deeply they sit in their
 *     own absorbers, so a fit can choose lines whose depression is
 *     alike;
 *   - what mixing unlike lines costs, in the unit a Boltzmann plot's
 *     tolerance is stated in.
 *
 * The last one is the point. A Boltzmann plot is not broken by
 * self-absorption: a depression that is the same on every line shifts
 * only the intercept, which carries the species' density and is unknown
 * anyway. It is broken by the VARIATION of self-absorption across its
 * lines, which tilts the slope and so moves the temperature.
 */

import { BOLTZMANN_CONSTANT, ELEMENTARY_CHARGE } from "spikypanda-core";
import type { IAtomicLine } from "../lines/lines.catalog.js";

/** kT in electronvolts at a temperature in kelvin. */
const thermalEv = (temperatureK: number) => (BOLTZMANN_CONSTANT * temperatureK) / ELEMENTARY_CHARGE;

/**
 * Two lines whose intensity ratio is fixed by atomic data.
 *
 * `branching` is the exact case: one upper level, two lower ones. The
 * two lines share g_k, E_k, the population of that level and the
 * partition function, so their ratio depends on nothing else at all.
 *
 * `doublet` is the fine-structure case: one lower level, two upper
 * levels of the same term. The ratio then carries one Boltzmann factor
 * over a split of a few tens of millielectronvolts, which over the
 * plausible temperature range moves it by about a per cent. Ca II H and
 * K are this kind, which is worth naming because this track has been
 * calling them a branching pair.
 */
export interface ILinePair {
    readonly kind: "branching" | "doublet";
    readonly element: string;
    readonly ionisation: number;
    /** The line the model makes stronger, which reabsorption bites first. */
    readonly strong: IAtomicLine;
    readonly weak: IAtomicLine;
    /** Separation of the upper levels [eV]: zero for a branching pair. */
    readonly upperSplitEv: number;
}

export interface IFindPairOptions {
    /** Wavelength window to search [nm]. */
    readonly rangeNm?: readonly [number, number];
    /** Widest upper-level split a doublet may have [eV]. Beyond a true
     *  fine-structure spacing the two levels are not one term and the
     *  ratio stops being a diagnostic. */
    readonly maxDoubletSplitEv?: number;
    /** Smallest wavelength separation [nm]: two lines closer than the
     *  instrument can resolve are measured as one. */
    readonly minSeparationNm?: number;
}

/**
 * Every pair of a species' lines whose ratio atomic data fixes.
 *
 * One observed wavelength gives one line. Where the catalogue lists two
 * transitions at the same wavelength to the picometre, no measurement
 * can tell them apart, so pairing through one of them would compare a
 * measured blend against one component's atomic data; the stronger is
 * kept and the rest dropped.
 */
export function findLinePairs(lines: ReadonlyArray<IAtomicLine>, options: IFindPairOptions = {}): ILinePair[] {
    const [low, high] = options.rangeNm ?? [0, Infinity];
    const maxSplit = options.maxDoubletSplitEv ?? 0.04;
    const minSeparation = options.minSeparationNm ?? 1;

    const complete = lines.filter(
        (l) =>
            l.wavelengthNm >= low &&
            l.wavelengthNm <= high &&
            l.upperLevelEnergyEv !== undefined &&
            l.lowerLevelEnergyEv !== undefined &&
            l.transitionProbability !== undefined &&
            l.upperLevelWeight !== undefined
    );

    const strongestAt = new Map<string, IAtomicLine>();
    for (const l of complete) {
        const key = l.wavelengthNm.toFixed(3);
        const held = strongestAt.get(key);
        const weight = (x: IAtomicLine) => (x.upperLevelWeight ?? 0) * (x.transitionProbability ?? 0);
        if (!held || weight(l) > weight(held)) strongestAt.set(key, l);
    }
    const distinct = [...strongestAt.values()];

    const out: ILinePair[] = [];
    for (let a = 0; a < distinct.length; a++) {
        for (let b = a + 1; b < distinct.length; b++) {
            const x = distinct[a];
            const y = distinct[b];
            const upperSplit = Math.abs((x.upperLevelEnergyEv as number) - (y.upperLevelEnergyEv as number));
            const lowerSplit = Math.abs((x.lowerLevelEnergyEv as number) - (y.lowerLevelEnergyEv as number));
            if (Math.abs(x.wavelengthNm - y.wavelengthNm) < minSeparation) continue;
            // The same transition twice is not a pair.
            if (upperSplit < 1e-9 && lowerSplit < 1e-9) continue;

            const branching = upperSplit < 1e-9 && x.upperLevelWeight === y.upperLevelWeight && lowerSplit >= 1e-9;
            // Requiring the shared lower level is what keeps a doublet a
            // real one rather than an accidental coincidence of two
            // level energies.
            const doublet = lowerSplit < 1e-9 && upperSplit >= 1e-9 && upperSplit <= maxSplit;
            if (!branching && !doublet) continue;

            const emitted = (l: IAtomicLine) =>
                (l.upperLevelWeight as number) * (l.transitionProbability as number) * ((l.upperLevelEnergyEv as number) - (l.lowerLevelEnergyEv as number));
            const [strong, weak] = emitted(x) >= emitted(y) ? [x, y] : [y, x];
            out.push({ kind: branching ? "branching" : "doublet", element: strong.element, ionisation: strong.ionisation, strong, weak, upperSplitEv: upperSplit });
        }
    }
    return out;
}

/**
 * The intensity ratio a pair has when nothing reabsorbs it, as an
 * energy flux: g_k A_ki (E_k - E_i), with the Boltzmann factor that a
 * doublet's split carries and a branching pair's does not.
 *
 * The photon energy is the difference of the two levels rather than
 * h c / lambda, for the reason `transitionEnergyEv` gives: the
 * published wavelength above 200 nm is the wavelength in air.
 */
export function predictPairRatio(pair: ILinePair, temperatureK: number): number {
    const ktEv = thermalEv(temperatureK);
    const weight = (l: IAtomicLine) =>
        (l.upperLevelWeight as number) *
        (l.transitionProbability as number) *
        ((l.upperLevelEnergyEv as number) - (l.lowerLevelEnergyEv as number)) *
        Math.exp(-(l.upperLevelEnergyEv as number) / ktEv);
    return weight(pair.strong) / weight(pair.weak);
}

/** What a measured pair ratio says. */
export interface ISelfAbsorptionReading {
    /** Measured over predicted. One is optically thin, below one is
     *  reabsorption, above one is impossible. */
    readonly index: number;
    /** Why this reading cannot be believed, or null. */
    readonly blocker: string | null;
}

/**
 * The index a measured ratio gives against the predicted one.
 *
 * An index above one is reported as a blocker rather than as a weak
 * result. Self-absorption can only remove light from the stronger line,
 * so a stronger line that is brighter than atomic data allows means a
 * blend, a wrong transition probability or the wrong feature measured.
 * On this data set one pair of the six announced itself that way, in 21
 * of its 27 readings.
 */
export function selfAbsorptionIndex(measuredRatio: number, predictedRatio: number, tolerance = 0.05): ISelfAbsorptionReading {
    if (!(measuredRatio > 0) || !Number.isFinite(measuredRatio)) return { index: NaN, blocker: "the measured ratio is not a positive number" };
    if (!(predictedRatio > 0) || !Number.isFinite(predictedRatio)) return { index: NaN, blocker: "the predicted ratio is not a positive number" };
    const index = measuredRatio / predictedRatio;
    if (index > 1 + tolerance) {
        return {
            index,
            blocker: `the index is ${index.toFixed(3)}, above one: the stronger line is brighter than its atomic data allows, which reabsorption cannot do, so this pair is measuring a blend or carrying a wrong transition probability`,
        };
    }
    return { index, blocker: null };
}

/**
 * How deeply a line sits in its own absorbers, in arbitrary units.
 *
 * The frequency-integrated absorption cross-section of a line goes as
 * lambda^2 g_k A_ki / g_i, and the population of its lower level as
 * g_i exp(-E_i / kT), so the g_i cancels and the optical depth at the
 * line centre goes as lambda^4 g_k A_ki exp(-E_i / kT) for a fixed
 * width in wavelength.
 *
 * What it leaves out, and this is why it orders lines rather than
 * predicting a depression:
 *
 *   - the **column density of the species**, which depends on how much
 *     material the pulse removed and how the plume expanded. On this
 *     data set that term varied enough between samples of the same
 *     composition to break any relation between the index and the
 *     abundance;
 *   - the **partition function** of the species. The population of the
 *     lower level is `g_i exp(-E_i / kT) / U_s(T)` and only the `g_i`
 *     cancels against the cross-section above. `U_s` is common to every
 *     line of one species, so it drops out of the ranking this function
 *     is for, and it does NOT drop out of any comparison BETWEEN
 *     species: `U(Ca I) / U(Ca II)` runs from 1.18 at 9 000 K to 3.58
 *     at 12 877 K on the shipped catalogue;
 *   - the correction for **stimulated emission**, `1 - exp(-hc/lambda kT)`,
 *     since what absorbs is the lower level minus what the upper level
 *     puts back. Being a function of the wavelength it does not cancel
 *     even within a species: 0.942 at Ca II 393.366 against 0.725 at
 *     Ca II 866.214, both at 12 877 K.
 *
 * A caller comparing two species, or two lines far apart in wavelength,
 * has to supply all three. `internals/libs/23-ABSORBING-LAYER-TESTS.md`
 * is the measurement that found the last two missing from a caller that
 * did not.
 */
export function opticalDepthProxy(line: IAtomicLine, temperatureK: number): number {
    const gk = line.upperLevelWeight;
    const aki = line.transitionProbability;
    const ei = line.lowerLevelEnergyEv;
    if (gk === undefined || aki === undefined || ei === undefined || !(line.wavelengthNm > 0)) return NaN;
    return gk * aki * Math.pow(line.wavelengthNm, 4) * Math.exp(-ei / thermalEv(temperatureK));
}

/** A set of lines whose depression should be alike. */
export interface IDepressionClass {
    /** Decade of the optical depth proxy, so a class spans a factor ten. */
    readonly decade: number;
    readonly lines: ReadonlyArray<IAtomicLine>;
    readonly lowestProxy: number;
    readonly highestProxy: number;
}

/**
 * Group lines by how deeply they sit, so a fit can take one group.
 *
 * A decade is the unit because the proxy spans many orders over a
 * species' lines while the depression it produces spans a factor two:
 * the relation is far from linear, and no finer grouping is justified
 * by what has been measured.
 */
export function depressionClasses(lines: ReadonlyArray<IAtomicLine>, temperatureK: number): IDepressionClass[] {
    const byDecade = new Map<number, IAtomicLine[]>();
    for (const l of lines) {
        const proxy = opticalDepthProxy(l, temperatureK);
        if (!(proxy > 0)) continue;
        const decade = Math.floor(Math.log10(proxy));
        if (!byDecade.has(decade)) byDecade.set(decade, []);
        byDecade.get(decade)!.push(l);
    }
    return [...byDecade]
        .sort((a, b) => a[0] - b[0])
        .map(([decade, group]) => {
            const proxies = group.map((l) => opticalDepthProxy(l, temperatureK));
            return { decade, lines: group, lowestProxy: Math.min(...proxies), highestProxy: Math.max(...proxies) };
        });
}

/**
 * What mixing two depressions costs a Boltzmann plot, in dex.
 *
 * A Boltzmann plot's ordinate is a logarithm, so two groups of lines
 * depressed by different factors are displaced from each other by the
 * logarithm of the ratio of those factors. That displacement is a
 * systematic the plot cannot distinguish from physics, and its
 * tolerance is quoted in dex, which is why this returns that unit.
 *
 * It takes measured indices, not modelled ones. There is no model here
 * that predicts a depression, which is the whole finding of
 * `14-SELF-ABSORPTION.md`; what there is, is a measurement of two
 * classes, and this prices the decision to mix them.
 */
export function mixingSystematicDex(indexOfOneClass: number, indexOfAnother: number): number {
    if (!(indexOfOneClass > 0) || !(indexOfAnother > 0)) return NaN;
    return Math.abs(Math.log10(indexOfOneClass / indexOfAnother));
}
