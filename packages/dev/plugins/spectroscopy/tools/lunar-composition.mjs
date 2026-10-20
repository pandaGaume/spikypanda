/**
 * The lunar composition table of the regolith simulant set, corrected.
 *
 * Every tool of this track that needs a sample's composition reads it
 * from one transcript of the publication's own table, which is never
 * edited, plus a ledger of corrections beside it. The ledger names, for
 * each cell it changes, the figure as published and the document that
 * authorised the change, and applying it fails loudly if the published
 * figure is no longer what the table holds. See
 * `packages/dev/plugins/chemistry/src/material/oxide-amendment.ts` for
 * the format and `internals/libs/16-GROUND-TRUTH-UNCERTAINTY.md`
 * section 4 for the four defects it carries.
 *
 * A tool that wants the table as published, defects and all, calls
 * `chemistry.parseOxideTable` on `LUNAR_TABLE_PATH` itself. Nothing
 * here hides that file.
 */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../../..");
const fixtures = join(repoRoot, "packages/tests/chemistry/fixtures");

/** The publication's table, transcribed and never edited. */
export const LUNAR_TABLE_PATH = join(fixtures, "moon-regolith-simulants-oxides.tsv");
/** The corrections applied to it, with their authority. */
export const LUNAR_LEDGER_PATH = join(fixtures, "moon-regolith-simulants-oxides.amendments.tsv");

const oneLine = (text, width = 120) => (text.length <= width ? text : `${text.slice(0, width - 1)}…`);

/**
 * Read the table and its ledger together.
 *
 * `chemistry` is the compiled chemistry plugin, with both
 * `dist/material/oxide-table.js` and `dist/material/oxide-amendment.js`
 * spread into it. A disagreement between the ledger and the table is
 * fatal: a tool that quotes a composition has to know which one it
 * quoted.
 */
export function amendedLunarTable(chemistry, { quiet = false } = {}) {
    const table = chemistry.amendOxideTable(readFileSync(LUNAR_TABLE_PATH, "utf8"), readFileSync(LUNAR_LEDGER_PATH, "utf8"), chemistry.parseOxideTable);

    if (table.errors.length > 0) {
        console.error("the published lunar table and its ledger of corrections do not agree, so no composition here can be quoted:");
        for (const error of table.errors) console.error(`  ${error}`);
        process.exit(1);
    }

    if (!quiet) {
        const cells = table.amendments.filter((a) => a.kind === "cell");
        const touched = new Set(cells.map((a) => a.sample)).size;
        console.log(`composition: the published lunar table, corrected in ${cells.length} cells over ${touched} samples`);
        console.log("  authority: internals/libs/16-GROUND-TRUTH-UNCERTAINTY.md section 4, cell by cell in the ledger beside the fixture");
        for (const note of table.amendments.filter((a) => a.kind !== "cell")) {
            console.log(`  ${note.kind.padEnd(7)} ${note.sample}: ${oneLine(note.note)}`);
        }
    }

    return table;
}
