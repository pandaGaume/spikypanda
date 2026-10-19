/**
 * Reading a published oxide analysis into material components.
 *
 * An elemental analysis of a rock, a soil or a simulant is almost never
 * published as elements. It comes as oxide weight per cent, by the
 * convention of X-ray fluorescence and wet chemistry: SiO2, Al2O3, CaO,
 * Fe2O3, FeO, and so on, oxides down the rows and samples across the
 * columns. That layout is what this module reads, and what it produces
 * is the one-line component list `Chemistry.Material:material` already
 * accepts, so a published analysis becomes a material with no number
 * retyped by hand.
 *
 * Two decisions worth stating, because both are claims and not just
 * arithmetic:
 *
 * **A blank is "not reported", never zero.** The two look the same in a
 * table and mean different things: an oxide reported at 0.00 was looked
 * for and not found, an oxide left blank was not reported at all, and
 * frequently because it is subsumed in another row. An analysis giving
 * Fe2O3 for some samples and FeO for others is the usual case, not a
 * defect: both are iron, and both are passed through as components so
 * the resolver adds their iron together.
 *
 * **The published total is carried, never quietly fixed.** Analyses do
 * not add up to a hundred: volatiles, water, carbonate and elements
 * outside the method all go missing, and a published sum of 98 % is
 * normal while 88 % is a warning. `resolveElementalComposition`
 * normalises by whatever total it is given, which assumes the
 * unaccounted mass has the same elemental makeup as the accounted mass.
 * That assumption is harmless at 98 % and false at 88 %, so the total
 * is reported here and the caller decides, rather than this module
 * hiding the question.
 */

import { parseChemicalFormula } from "spikypanda-core";
import type { IMaterialComponent } from "spikypanda-core";

/** One sample's analysis, as published. */
export interface IOxideTableSample {
    readonly name: string;
    /** Oxide formula to weight per cent. Oxides left blank are absent
     *  from this record rather than present at zero. */
    readonly oxidesWeightPercent: Readonly<Record<string, number>>;
    /** What the published figures add up to, in weight per cent. A
     *  hundred means the analysis closes; see the module header. */
    readonly publishedTotalWeightPercent: number;
}

export interface IOxideTableResult {
    readonly samples: ReadonlyArray<IOxideTableSample>;
    /** Oxide names in the order the table gives them. */
    readonly oxides: ReadonlyArray<string>;
    /** What could not be read, one message per problem, so a table with
     *  one bad cell still yields its other samples. */
    readonly errors: ReadonlyArray<string>;
}

/**
 * Read a table of oxide weight per cent: oxides down the rows, samples
 * across the columns, tab-separated, the first row naming the samples
 * and the first cell of every row naming its oxide.
 *
 * The first header cell is a label for the oxide column and is ignored,
 * whatever it says.
 */
export function parseOxideTable(text: string): IOxideTableResult {
    const rows = text
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0)
        .map((l) => l.split("\t"));

    if (rows.length < 2) return { samples: [], oxides: [], errors: ["the table has no data row"] };

    const names = rows[0].slice(1).map((n) => n.trim());
    const errors: string[] = [];
    const oxides: string[] = [];
    // Accumulated per sample index, so one pass over the rows is enough.
    const perSample: Array<Record<string, number>> = names.map(() => ({}));

    for (const row of rows.slice(1)) {
        const oxide = (row[0] ?? "").trim();
        if (oxide.length === 0) continue;
        try {
            parseChemicalFormula(oxide);
        } catch (e) {
            errors.push(`row "${oxide}" is not a formula: ${e instanceof Error ? e.message : String(e)}`);
            continue;
        }
        oxides.push(oxide);

        for (let k = 0; k < names.length; k++) {
            const cell = (row[k + 1] ?? "").trim();
            if (cell.length === 0) continue; // not reported, see the header
            const value = Number(cell);
            if (!Number.isFinite(value)) {
                errors.push(`${names[k]}, ${oxide}: "${cell}" is not a number`);
                continue;
            }
            if (value < 0) {
                errors.push(`${names[k]}, ${oxide}: ${value} is negative`);
                continue;
            }
            perSample[k][oxide] = value;
        }
    }

    const samples = names
        .map((name, k) => ({
            name,
            oxidesWeightPercent: Object.freeze({ ...perSample[k] }),
            publishedTotalWeightPercent: Object.values(perSample[k]).reduce((a, b) => a + b, 0),
        }))
        .filter((s) => s.name.length > 0 && Object.keys(s.oxidesWeightPercent).length > 0);

    return { samples, oxides, errors };
}

/**
 * One sample's analysis as components for `resolveElementalComposition`
 * on a MASS basis. The weight per cents are passed through as given,
 * unnormalised, so the resolver's own normalisation is the only one and
 * `publishedTotalWeightPercent` stays the record of what was published.
 */
export function oxideComponents(sample: IOxideTableSample): IMaterialComponent[] {
    return Object.entries(sample.oxidesWeightPercent).map(([formula, weightPercent]) => ({ formula, fraction: weightPercent }));
}

/**
 * One sample's analysis as the one-line text `Chemistry.Material:material`
 * takes in its `components` field, on a mass basis.
 *
 * `digits` is how many decimals to keep; the default of three is below
 * anything an XRF analysis resolves and keeps the line readable.
 */
export function oxideComponentsLine(sample: IOxideTableSample, digits = 3): string {
    return oxideComponents(sample)
        .map((c) => `${c.formula}:${Number(c.fraction.toFixed(digits))}`)
        .join(", ");
}
