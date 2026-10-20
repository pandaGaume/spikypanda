/**
 * Confronting two published analyses of the same material.
 *
 * A published composition is a measurement, and a measurement without
 * a second opinion has no uncertainty. The only way to put a figure on
 * it is to find two routes to the same number and subtract them. This
 * module is the subtraction, and the three decisions it makes are the
 * reason it is here rather than inlined in a one-off script.
 *
 * **A blank stays a blank.** `parseOxideTable` already refuses to turn
 * "not reported" into zero, and a comparison must not undo that. An
 * oxide one analysis reports and the other does not is not a
 * disagreement of the reported value against zero: it is a key that
 * cannot be compared, and it is listed as such.
 *
 * **Iron is compared as iron.** Analyses report iron as Fe2O3, as FeO,
 * or as both, and which one they choose is a convention of the
 * laboratory and not a fact about the sample. Subtracting Fe2O3 from
 * FeO measures the convention. `elementWeightPercent` converts an
 * oxide analysis into grams of each element per hundred grams of
 * material, where the convention has gone and only the iron is left.
 *
 * **Nothing is normalised to a hundred.** Analyses close at 98 or 99
 * per cent, and scaling one of them up to a hundred would assume the
 * missing mass has the composition of the measured mass. That
 * assumption is a claim about the sample, not arithmetic, so it is left
 * to the caller: everything here is per hundred grams of material AS
 * PUBLISHED, and the two published totals are carried alongside the
 * differences so the caller can see how far from a hundred each route
 * sat.
 */

import { elementMassFractionsOf } from "spikypanda-core";
import type { IOxideTableSample } from "./oxide-table.js";

/** A weight per cent table: key to per cent. A key absent from the
 *  record was not reported, and is not zero. */
export type WeightPercentByKey = Readonly<Record<string, number>>;

/** Two routes to one key, and what separates them. */
export interface IAnalysisDifference {
    /** Oxide formula or element symbol, depending on the basis. */
    readonly key: string;
    /** The first route's figure, or null where it did not report the key. */
    readonly a: number | null;
    /** The second route's figure, or null where it did not report the key. */
    readonly b: number | null;
    /** `a - b`, in per cent by mass, so in PERCENTAGE POINTS. Null
     *  where either route is silent. */
    readonly difference: number | null;
    /** `a - b` over the mean of the two, dimensionless. The mean rather
     *  than one of the two, because neither route is the reference
     *  here: both are claims of equal standing. Null where either route
     *  is silent, or where both are zero. */
    readonly relativeDifference: number | null;
}

/** What a confrontation of two analyses came to. */
export interface IAnalysisComparison {
    /** Every key either route reported, sorted by descending
     *  |difference| first and then by name, so the worst offender is
     *  the first row and the silent keys are last. */
    readonly differences: ReadonlyArray<IAnalysisDifference>;
    /** Keys both routes reported: the ones that carry a difference. */
    readonly comparable: ReadonlyArray<string>;
    /** Keys only the first route reported. */
    readonly onlyInA: ReadonlyArray<string>;
    /** Keys only the second route reported. */
    readonly onlyInB: ReadonlyArray<string>;
    /** Median |difference| over the comparable keys, in percentage
     *  points. NaN when nothing is comparable. */
    readonly medianAbsoluteDifference: number;
    /** Largest |difference| over the comparable keys, in percentage
     *  points. NaN when nothing is comparable. */
    readonly maximumAbsoluteDifference: number;
    /** The key that largest difference belongs to, or null. */
    readonly worstKey: string | null;
    /** Root mean square of the differences over the comparable keys,
     *  in percentage points. NaN when nothing is comparable. */
    readonly rootMeanSquareDifference: number;
    /** What the first route's reported figures add up to, in per cent
     *  by mass, over ALL its keys and not only the comparable ones. See
     *  the module header: these are not normalised. */
    readonly totalA: number;
    /** The same for the second route. */
    readonly totalB: number;
}

/** The median of a list, which is sorted in place. */
function median(values: number[]): number {
    if (values.length === 0) return Number.NaN;
    values.sort((x, y) => x - y);
    const mid = values.length >> 1;
    return values.length % 2 === 1 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

/**
 * Subtract two weight per cent tables, key by key.
 *
 * Both arguments are per hundred grams of material as published, and
 * the result is in the same unit: a `difference` is a number of
 * percentage points, which is what a reader of a composition table
 * needs, and a `relativeDifference` is the same thing divided by the
 * size of what is compared, which is what a reader of a trace oxide
 * needs. A major oxide at 50 % and a trace at 0.1 % are not
 * commensurable in either unit alone, which is why both are given.
 */
export function compareWeightPercent(a: WeightPercentByKey, b: WeightPercentByKey): IAnalysisComparison {
    const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
    const comparable: string[] = [];
    const onlyInA: string[] = [];
    const onlyInB: string[] = [];
    const differences: IAnalysisDifference[] = [];

    for (const key of keys) {
        const left = key in a ? a[key] : null;
        const right = key in b ? b[key] : null;
        if (left !== null && right !== null) comparable.push(key);
        else if (left !== null) onlyInA.push(key);
        else onlyInB.push(key);

        const difference = left !== null && right !== null ? left - right : null;
        const scale = left !== null && right !== null ? (Math.abs(left) + Math.abs(right)) / 2 : 0;
        differences.push({
            key,
            a: left,
            b: right,
            difference,
            relativeDifference: difference !== null && scale > 0 ? difference / scale : null,
        });
    }

    // The worst row first: a reader of a comparison looks for the
    // disagreement, not for the alphabet. Silent keys sort last, since
    // they carry no difference to rank.
    differences.sort((x, y) => {
        const dx = x.difference === null ? -1 : Math.abs(x.difference);
        const dy = y.difference === null ? -1 : Math.abs(y.difference);
        return dy - dx || x.key.localeCompare(y.key);
    });

    let maximumAbsoluteDifference = Number.NaN;
    let worstKey: string | null = null;
    const absolute: number[] = [];
    let sumOfSquares = 0;
    for (const key of comparable) {
        const d = (a[key] as number) - (b[key] as number);
        absolute.push(Math.abs(d));
        sumOfSquares += d * d;
        if (worstKey === null || Math.abs(d) > maximumAbsoluteDifference) {
            maximumAbsoluteDifference = Math.abs(d);
            worstKey = key;
        }
    }

    return {
        differences,
        comparable: [...comparable].sort(),
        onlyInA: onlyInA.sort(),
        onlyInB: onlyInB.sort(),
        medianAbsoluteDifference: median(absolute),
        maximumAbsoluteDifference,
        worstKey,
        rootMeanSquareDifference: comparable.length > 0 ? Math.sqrt(sumOfSquares / comparable.length) : Number.NaN,
        totalA: Object.values(a).reduce((s, v) => s + v, 0),
        totalB: Object.values(b).reduce((s, v) => s + v, 0),
    };
}

/**
 * One sample's analysis as grams of each element per hundred grams of
 * material, as published.
 *
 * This is the basis on which two analyses can actually be subtracted.
 * It is NOT a mass fraction: the figures add up to the published total
 * and never to a hundred, and that is the point.
 * `resolveElementalComposition` gives a normalised vector, which is
 * what the forward model wants and what a comparison must avoid,
 * because normalising folds the unaccounted mass into every element at
 * once.
 *
 * Oxygen accumulates from every oxide, so an analysis that splits iron
 * between Fe2O3 and FeO gives one iron figure and one oxygen figure,
 * and the reporting convention is gone.
 */
export function elementWeightPercent(sample: IOxideTableSample): WeightPercentByKey {
    const out: Record<string, number> = {};
    for (const [oxide, weightPercent] of Object.entries(sample.oxidesWeightPercent)) {
        for (const [symbol, share] of Object.entries(elementMassFractionsOf(oxide))) {
            out[symbol] = (out[symbol] ?? 0) + weightPercent * share;
        }
    }
    return Object.freeze(out);
}

/** One weighed part of a mixture: whose analysis, and how much of it. */
export interface IMixturePart {
    readonly sample: IOxideTableSample;
    /** Mass actually weighed out, in grams. */
    readonly massGrams: number;
}

/** A mixture's composition, computed rather than measured. */
export interface IComputedMixture extends IOxideTableSample {
    /** Total mass weighed out, in grams: the sum of the parts. */
    readonly totalMassGrams: number;
    /** Per oxide, the share of the mixture's MASS that came from a part
     *  which reported that oxide. One means every part reported it and
     *  the computed figure is complete; less than one means the figure
     *  is a lower bound, because a part that may well contain the oxide
     *  did not say so. An oxide no part reported is absent, not zero. */
    readonly oxideCoverage: Readonly<Record<string, number>>;
}

/**
 * The composition of a mixture, from its parts' compositions and the
 * masses weighed out.
 *
 * This is a third route to a composition, by arithmetic rather than by
 * measurement, and it is exact to the extent that the parts' analyses
 * are right, the balance is right and the mixture is homogeneous. Set
 * against the mixture's own measured analysis it separates none of the
 * three on its own, but it bounds them together, which is more than one
 * analysis alone can do.
 *
 * A blank in a part is a contribution of zero FROM THAT PART ONLY, and
 * `oxideCoverage` records how much of the mass that silence covers, so
 * a figure assembled from a partial silence is never mistaken for a
 * complete one. Propagating the silence to the mixture instead would
 * throw away the part of the mixture that was reported.
 */
export function mixByMass(parts: ReadonlyArray<IMixturePart>, name: string): IComputedMixture {
    if (parts.length === 0) throw new Error(`${name}: a mixture needs at least one part`);
    for (const part of parts) {
        if (!Number.isFinite(part.massGrams) || part.massGrams < 0) {
            throw new Error(`${name}: part "${part.sample.name}" has mass ${part.massGrams} g`);
        }
    }

    const totalMassGrams = parts.reduce((s, p) => s + p.massGrams, 0);
    if (totalMassGrams === 0) throw new Error(`${name}: the parts weigh nothing`);

    const oxides: Record<string, number> = {};
    const covered: Record<string, number> = {};
    for (const part of parts) {
        const share = part.massGrams / totalMassGrams;
        for (const [oxide, weightPercent] of Object.entries(part.sample.oxidesWeightPercent)) {
            oxides[oxide] = (oxides[oxide] ?? 0) + share * weightPercent;
            covered[oxide] = (covered[oxide] ?? 0) + share;
        }
    }

    return {
        name,
        oxidesWeightPercent: Object.freeze(oxides),
        publishedTotalWeightPercent: Object.values(oxides).reduce((s, v) => s + v, 0),
        totalMassGrams,
        oxideCoverage: Object.freeze(covered),
    };
}
