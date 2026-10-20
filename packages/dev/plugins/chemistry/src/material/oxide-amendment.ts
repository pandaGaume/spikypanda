/**
 * Amending a published oxide analysis without editing it.
 *
 * A published table is a record of what someone else wrote down, and a
 * defect found in it later does not make that record wrong: it makes it
 * a record with a defect. So the table stays as published, byte for
 * byte, and the corrections live beside it, one row per changed cell,
 * each naming the figure it replaces and the document that authorised
 * the change. The corrected table is then computed at load rather than
 * kept as a second file, which is the point: there is exactly one
 * transcript of the published figures in the repository, and no second
 * copy to drift away from it.
 *
 * Three kinds of record, because three different things were found in
 * the one table this was written for.
 *
 * A "cell" row replaces one sample's figure for one oxide. It carries
 * the published figure as well as the corrected one, and applying it
 * FAILS if the published figure is not what the table actually holds.
 * That is the audit: a ledger row cannot quietly stop describing the
 * data it claims to amend, and a mistyped ledger is an error rather
 * than a silent edit. Either side may be "not-reported", which is how a
 * mislabelled row is moved from one heading to another: the figure is
 * withdrawn from the row that should not hold it and written into the
 * row that should. A blank is "not reported" and never zero here, for
 * the same reason as in `parseOxideTable`.
 *
 * A "recipe" row records that a sample's declared provenance is wrong
 * where its composition is not: no figure in this table changes, and a
 * consumer that mixes from the declared components has to know. A
 * "premise" row records a claim the data set asserts and never
 * measured. Neither changes a figure, and both travel with the sample
 * they are about, so code holding one sample can see what is asserted
 * about it rather than having to have read the document.
 *
 * The file format is a TSV with a named header row; blank lines and
 * lines opening with a hash are ignored:
 *
 *     kind     sample  oxide  published  corrected     authority  note
 *     cell     MgO-BL  P2O5   0.57       not-reported  16 s 4.3   ...
 *     premise  LHS-1D  -      -          -             16 s 3     ...
 *
 * A sample name matches the way the tools of this track match one, with
 * case, spaces and a zero read as the letter O forgiven, because the
 * three files of one data set rarely spell a sample the same way. The
 * forgiveness is per table: two tables may use one name for two
 * different samples, so a ledger belongs to one table and says which.
 */

import { parseChemicalFormula } from "spikypanda-core";
import type { IOxideTableResult, IOxideTableSample } from "./oxide-table.js";

/** What a ledger row does. See the module header. */
export type OxideAmendmentKind = "cell" | "recipe" | "premise";

/** One row of a ledger. */
export interface IOxideAmendment {
    readonly kind: OxideAmendmentKind;
    /** The sample the row is about, spelled as the ledger spells it. */
    readonly sample: string;
    /** The oxide, for a cell row; null for the other kinds. */
    readonly oxide: string | null;
    /** The figure the table is expected to hold, in weight per cent.
     *  Null is "not reported", which is not zero. Null throughout for a
     *  recipe or premise row, which amends no figure. */
    readonly published: number | null;
    /** The figure to put in its place, same convention. */
    readonly corrected: number | null;
    /** The document and section that authorised the row. Required: a
     *  change with no authority is an edit. */
    readonly authority: string;
    readonly note: string;
}

export interface IOxideAmendmentFile {
    readonly amendments: ReadonlyArray<IOxideAmendment>;
    readonly errors: ReadonlyArray<string>;
}

/** A sample of an amended table, carrying what was done to it. */
export interface IAmendedOxideTableSample extends IOxideTableSample {
    /** The cell rows applied to this sample, so the published figure and
     *  its authority are readable from the sample itself. */
    readonly amendments: ReadonlyArray<IOxideAmendment>;
    /** The recipe and premise rows about this sample. */
    readonly notes: ReadonlyArray<IOxideAmendment>;
}

/**
 * The amended table. Structurally an `IOxideTableResult`, so everything
 * that reads a published table reads this one unchanged.
 *
 * One field changes meaning: `publishedTotalWeightPercent` of an amended
 * sample is the sum of its AMENDED figures, because that is what every
 * consumer of it wants, and the published figure is recoverable from the
 * sample's own `amendments`.
 */
export interface IAmendedOxideTable extends IOxideTableResult {
    readonly samples: ReadonlyArray<IAmendedOxideTableSample>;
    /** Every row read, in file order, whether or not it changed a
     *  figure, so a consumer holding the table can list what the ledger
     *  asserts without reading the ledger. */
    readonly amendments: ReadonlyArray<IOxideAmendment>;
}

/** The token that means "no figure", on either side of a cell row. */
export const NOT_REPORTED = "not-reported";

const COLUMNS = ["kind", "sample", "oxide", "published", "corrected", "authority", "note"] as const;
const KINDS: ReadonlyArray<OxideAmendmentKind> = ["cell", "recipe", "premise"];

/** A sample name as a key: case, spacing and a zero-for-O all forgiven. */
export function normaliseSampleName(name: string): string {
    return name.toUpperCase().replace(/\s+/g, "").replace(/0/g, "O");
}

/** A figure cell: a weight per cent, or null for "not reported". */
function readFigure(cell: string): number | null | Error {
    if (cell === NOT_REPORTED) return null;
    const value = Number(cell);
    if (cell.length === 0 || !Number.isFinite(value)) return new Error(`"${cell}" is neither a number nor ${NOT_REPORTED}`);
    if (value < 0) return new Error(`${value} is negative`);
    return value;
}

/**
 * Read a ledger. Problems are collected rather than thrown, so one bad
 * row still yields the others.
 */
export function parseOxideAmendments(text: string): IOxideAmendmentFile {
    const rows = text
        .split(/\r?\n/)
        .filter((l) => l.trim().length > 0 && !l.trimStart().startsWith("#"))
        .map((l) => l.split("\t").map((c) => c.trim()));

    if (rows.length === 0) return { amendments: [], errors: ["the ledger has no header row"] };

    const header = rows[0].map((h) => h.toLowerCase());
    const missing = COLUMNS.filter((c) => !header.includes(c));
    if (missing.length > 0) return { amendments: [], errors: [`the header is missing the column or columns ${missing.join(", ")}`] };
    const at = (row: ReadonlyArray<string>, column: (typeof COLUMNS)[number]) => row[header.indexOf(column)] ?? "";

    const amendments: IOxideAmendment[] = [];
    const errors: string[] = [];

    for (let k = 1; k < rows.length; k++) {
        const row = rows[k];
        const where = `ledger row ${k}`;
        const kind = at(row, "kind") as OxideAmendmentKind;
        if (!KINDS.includes(kind)) {
            errors.push(`${where}: "${at(row, "kind")}" is not one of ${KINDS.join(", ")}`);
            continue;
        }
        const sample = at(row, "sample");
        const authority = at(row, "authority");
        const note = at(row, "note");
        if (sample.length === 0) {
            errors.push(`${where}: no sample named`);
            continue;
        }
        if (authority.length === 0) {
            errors.push(`${where}, ${sample}: no authority named, and a change with no authority is an edit`);
            continue;
        }

        if (kind !== "cell") {
            if (note.length === 0) {
                errors.push(`${where}, ${sample}: a ${kind} row carries nothing but its note, and the note is empty`);
                continue;
            }
            amendments.push({ kind, sample, oxide: null, published: null, corrected: null, authority, note });
            continue;
        }

        const oxide = at(row, "oxide");
        try {
            parseChemicalFormula(oxide);
        } catch (e) {
            errors.push(`${where}, ${sample}: "${oxide}" is not a formula: ${e instanceof Error ? e.message : String(e)}`);
            continue;
        }
        const published = readFigure(at(row, "published"));
        const corrected = readFigure(at(row, "corrected"));
        if (published instanceof Error || corrected instanceof Error) {
            const bad = published instanceof Error ? published : (corrected as Error);
            errors.push(`${where}, ${sample}, ${oxide}: ${bad.message}`);
            continue;
        }
        if (published === corrected) {
            errors.push(`${where}, ${sample}, ${oxide}: the published and the corrected figure are the same, so the row amends nothing`);
            continue;
        }
        amendments.push({ kind, sample, oxide, published, corrected, authority, note });
    }

    return { amendments, errors };
}

/**
 * Apply a ledger to a published table.
 *
 * A row whose published figure is not what the table holds is reported
 * and NOT applied, and so is a row naming a sample the table does not
 * have: the ledger has to keep describing the data it amends.
 */
export function applyOxideAmendments(table: IOxideTableResult, amendments: ReadonlyArray<IOxideAmendment>): IAmendedOxideTable {
    const errors: string[] = [...table.errors];
    const oxides: string[] = [...table.oxides];
    const figures: Array<Record<string, number>> = table.samples.map((s) => ({ ...s.oxidesWeightPercent }));
    const applied: IOxideAmendment[][] = table.samples.map(() => []);
    const notes: IOxideAmendment[][] = table.samples.map(() => []);

    // Sample index by forgiven name, with a collision reported rather
    // than resolved: two tables of one data set may use one name twice,
    // and guessing which is meant is exactly the silent error this
    // module exists to prevent.
    const byName = new Map<string, number>();
    const collided = new Set<string>();
    table.samples.forEach((s, k) => {
        const key = normaliseSampleName(s.name);
        if (byName.has(key)) collided.add(key);
        else byName.set(key, k);
    });
    for (const key of collided) errors.push(`the table has two samples whose names both read as "${key}", so a ledger row cannot name one of them`);

    const seen = new Set<string>();

    for (const amendment of amendments) {
        const key = normaliseSampleName(amendment.sample);
        if (collided.has(key)) continue; // reported above
        const index = byName.get(key);
        if (index === undefined) {
            errors.push(`the table has no sample "${amendment.sample}", named by a ${amendment.kind} row`);
            continue;
        }

        if (amendment.kind !== "cell") {
            notes[index].push(amendment);
            continue;
        }

        const oxide = amendment.oxide as string;
        const once = `${key}\t${oxide}`;
        if (seen.has(once)) {
            errors.push(`${amendment.sample}, ${oxide}: amended twice`);
            continue;
        }
        seen.add(once);

        const held = figures[index][oxide];
        const holds = held === undefined ? null : held;
        const describes = amendment.published === null ? holds === null : holds !== null && Math.abs(holds - amendment.published) <= 1e-9;
        if (!describes) {
            const was = holds === null ? NOT_REPORTED : String(holds);
            const claimed = amendment.published === null ? NOT_REPORTED : String(amendment.published);
            errors.push(`${amendment.sample}, ${oxide}: the table holds ${was} where the ledger says ${claimed} was published, so the ledger no longer describes the table`);
            continue;
        }

        if (amendment.corrected === null) delete figures[index][oxide];
        else {
            figures[index][oxide] = amendment.corrected;
            if (!oxides.includes(oxide)) oxides.push(oxide);
        }
        applied[index].push(amendment);
    }

    const samples = table.samples.map((sample, k) => ({
        ...sample,
        oxidesWeightPercent: Object.freeze({ ...figures[k] }),
        publishedTotalWeightPercent: Object.values(figures[k]).reduce((a, b) => a + b, 0),
        amendments: Object.freeze([...applied[k]]) as ReadonlyArray<IOxideAmendment>,
        notes: Object.freeze([...notes[k]]) as ReadonlyArray<IOxideAmendment>,
    }));

    return { samples, oxides, errors, amendments: [...amendments] };
}

/**
 * The one call a consumer needs: a published table and its ledger, both
 * as text, read and amended together. `parse` is `parseOxideTable`,
 * passed in rather than imported so this module stays a pure amendment
 * layer over whatever table reader a caller has.
 */
export function amendOxideTable(tableText: string, ledgerText: string, parse: (text: string) => IOxideTableResult): IAmendedOxideTable {
    const ledger = parseOxideAmendments(ledgerText);
    const amended = applyOxideAmendments(parse(tableText), ledger.amendments);
    return { ...amended, errors: [...amended.errors, ...ledger.errors] };
}
