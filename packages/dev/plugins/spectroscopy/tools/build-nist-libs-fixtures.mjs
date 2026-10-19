/**
 * Turns the saved NIST LIBS pages into the fixtures the V1-B0 test reads.
 *
 * The NIST LIBS interface (https://physics.nist.gov/PhysRefData/ASD/LIBS/)
 * computes a Saha-LTE spectrum from the same atomic data our catalogue
 * is built from, by the same method: Saha for the ion populations,
 * Boltzmann for the level populations, optically thin plasma, lines
 * broadened by a Gaussian. It is therefore an INDEPENDENT
 * IMPLEMENTATION of the model this plugin implements, which is what
 * V1-B0 needs: a disagreement between the two is an error in one of the
 * codes, not a disagreement about physics.
 *
 * Each page carries two JavaScript arrays. `lines` is the atomic input:
 * one row per line, with the wavelength, the product g_k A_ki, and the
 * two level energies in cm^-1. `dataSticksArray` is the computed
 * result: one row per wavelength and one column per species, the column
 * header carrying the ion abundance the server found. Both are
 * extracted here into plain TSV, so the test reads numbers rather than
 * parsing HTML.
 *
 * Two kinds of file come out of it, because the two have different
 * lifetimes:
 *
 *   atomic-<element>.tsv   the atomic input, identical in every run of
 *                          that element, and the provenance check for
 *                          our own catalogue
 *   <run>.tsv              the intensities for one temperature, one
 *                          electron density and one composition
 *
 * Usage, from the repository root:
 *
 *     node packages/dev/plugins/spectroscopy/tools/build-nist-libs-fixtures.mjs \
 *          [source-directory] [output-directory]
 *
 * Defaults: `internals/libs/data/nist-libs-reference` and
 * `packages/tests/spectroscopy/fixtures/nist-libs`. The source
 * directory holds the gzipped pages as they were served, next to the
 * `.url` file recording the exact request; it lives in the private
 * research repository, which is why the extracted fixtures are
 * versioned here and the pages are not.
 */

import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, "..");
const repoRoot = resolve(pluginRoot, "../../../..");

const sourceDir = resolve(process.argv[2] ?? join(repoRoot, "internals/libs/data/nist-libs-reference"));
const outDir = resolve(process.argv[3] ?? join(repoRoot, "packages/tests/spectroscopy/fixtures/nist-libs"));

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

/** Ionisation stage from the roman numeral ASD spells species with. */
const STAGES = { I: 0, II: 1, III: 2, IV: 3, V: 4, VI: 5, VII: 6, VIII: 7, IX: 8, X: 9 };

/**
 * Runs whose intensities are extracted. The archive also holds
 * `fe100-t1.0ev-c1`, the same iron at the same temperature with the
 * third ion stage suppressed; it is kept there as the evidence that
 * suppressing a stage does not renormalise the other two, and it adds
 * nothing to the comparison, so it produces no fixture.
 */
const RUNS = new Set(["ca100-t0.7ev-c2", "ca100-t1.0ev-c2", "ca50si50-t1.0ev-c2", "fe100-t0.7ev-c2", "fe100-t1.0ev-c2", "si100-t0.7ev-c2", "si100-t1.0ev-c2"]);

/**
 * The bracketed literal that starts at `start`, by counting brackets.
 * Past their header these arrays hold no strings, so counting is safe.
 */
function bracketed(text, start) {
    let depth = 0;
    for (let i = start; i < text.length; i++) {
        if (text[i] === "[") depth++;
        else if (text[i] === "]" && --depth === 0) return text.slice(start, i + 1);
    }
    throw new Error("unterminated array");
}

/** One scalar the page declares as a JavaScript variable. */
function declared(text, name) {
    const m = new RegExp(`var ${name}\\s*=\\s*('([^']*)'|[^;]*);`).exec(text);
    if (!m) return null;
    return (m[2] ?? m[1]).trim();
}

/** The rows of a flat array of numeric tuples, as strings. */
function tuples(literal) {
    return [...literal.matchAll(/\[([^[\]]*)\]/g)].map((m) => m[1].split(","));
}

/**
 * The atomic input: `[wavelength_nm, g_k A_ki, E_k cm^-1, Z, stage,
 * E_i cm^-1]`, the stage being 1 for the neutral. The wavelength is
 * printed to five decimals, which is the key the intensity rows use.
 */
function atomicLines(page) {
    return tuples(bracketed(page, page.indexOf("var lines = ") + "var lines = ".length)).map((c) => ({
        wavelength: c[0].trim(),
        weightTimesProbability: Number(c[1]),
        upperEnergyCm: Number(c[2]),
        atomicNumber: Number(c[3]),
        ionisation: Number(c[4]) - 1,
        lowerEnergyCm: Number(c[5]),
    }));
}

/**
 * The computed intensities. One row per wavelength, so two lines of the
 * same species printed at the same wavelength appear as their SUM; the
 * test has to group its own lines the same way.
 */
function stickIntensities(page) {
    const array = bracketed(page, page.indexOf("var dataSticksArray=") + "var dataSticksArray=".length);
    const headerEnd = array.indexOf("}]") + 2;
    const labels = [...array.slice(0, headerEnd).matchAll(/label:'([^']*)'/g)].map((m) => m[1]);

    // Column 0 is the wavelength; the others are species, each labelled
    // `Fe II (9.5e-01)`, the number being the server's Saha result times
    // the atom fraction of the element.
    const species = labels.slice(1).map((label) => {
        const m = /^([A-Z][a-z]?)\s+([IVX]+)\s*\(([^)]*)\)$/.exec(label);
        if (!m) throw new Error(`unreadable species label: ${label}`);
        return { element: m[1], ionisation: STAGES[m[2]], abundance: Number(m[3]), label };
    });

    const rows = [];
    for (const cells of tuples(array.slice(headerEnd))) {
        if (cells.length !== labels.length) throw new Error(`row of ${cells.length} cells, expected ${labels.length}`);
        const wavelength = cells[0].trim();
        if (!Number.isFinite(Number(wavelength))) continue;
        for (let k = 1; k < cells.length; k++) {
            const cell = cells[k].trim();
            if (cell === "null" || cell === "") continue;
            rows.push({ wavelength, species: species[k - 1], intensity: Number(cell) });
        }
    }
    return { species, rows };
}

const CITATION = [
    "# NIST LIBS Database, simulated Saha-LTE spectrum.",
    "# Kramida, A., Olsen, K., and Ralchenko, Yu. NIST LIBS Database,",
    "# National Institute of Standards and Technology, Gaithersburg, MD.",
    "# https://physics.nist.gov/PhysRefData/ASD/LIBS/",
    "# Extracted by packages/dev/plugins/spectroscopy/tools/build-nist-libs-fixtures.mjs",
];

if (!existsSync(sourceDir)) {
    console.error(`No source directory at ${sourceDir}.`);
    console.error("The saved pages live in the private research repository; pass their path as the first argument.");
    process.exit(1);
}
mkdirSync(outDir, { recursive: true });

/** Atomic tables, keyed by element: the same in every run, written once. */
const atomic = new Map();
const written = [];

for (const name of readdirSync(sourceDir).sort()) {
    if (!name.endsWith(".html.gz")) continue;
    const key = name.slice(0, -".html.gz".length);
    const raw = readFileSync(join(sourceDir, name));
    const page = gunzipSync(raw).toString("utf8");

    const urlFile = join(sourceDir, `${key}.url`);
    const provenance = [
        `# source-page: ${name}`,
        `# source-sha256: ${sha256(raw)}`,
        `# source-request: ${existsSync(urlFile) ? readFileSync(urlFile, "utf8").trim() : "not recorded"}`,
    ];

    // The atomic table: one element at a time, and only from a run that
    // carries that element alone, so a mixture cannot truncate it.
    const lines = atomicLines(page);
    const elements = new Set(lines.map((l) => l.atomicNumber));
    if (elements.size === 1) {
        const element = /^([A-Z][a-z]?)/.exec(declared(page, "composition"))[1];
        if (!atomic.has(element)) {
            const cmPerEv = declared(page, "cmeV");
            const body = [
                ...CITATION,
                ...provenance,
                `# element: ${element}`,
                `# cm-per-ev: ${cmPerEv}`,
                "# weight-times-probability: g_k A_ki in s^-1, the product the page publishes",
                "# wavelength: air above 200 nm, in nm, printed as the intensity rows key it",
                "# Two lines of one species can share a printed wavelength; the intensity file",
                "# then carries their sum on a single row.",
                "wavelength_nm\tionisation\tweight_times_probability\tupper_energy_cm\tlower_energy_cm",
                ...lines.map((l) => `${l.wavelength}\t${l.ionisation}\t${l.weightTimesProbability}\t${l.upperEnergyCm}\t${l.lowerEnergyCm}`),
            ].join("\n");
            const file = `atomic-${element.toLowerCase()}.tsv`;
            writeFileSync(join(outDir, file), `${body}\n`, "utf8");
            atomic.set(element, lines.length);
            written.push({ file, rows: lines.length, bytes: body.length });
        }
    }

    if (!RUNS.has(key)) continue;

    const { species, rows } = stickIntensities(page);
    const body = [
        ...CITATION,
        ...provenance,
        `# composition: ${declared(page, "composition")}`,
        `# temperature-ev: ${declared(page, "temp")}`,
        `# electron-density-cm3: ${declared(page, "eden")}`,
        `# server-scale-constant: ${declared(page, "koeff")}`,
        "# intensity: energy flux in an arbitrary unit, INCLUDING the atom fraction of the",
        "#            element and the ion abundance of the species (int_scale=1 on the form)",
        "# abundance: the server's Saha result for the species times the element's atom",
        "#            fraction, over the THREE lowest stages, rounded by the server to two",
        "#            significant figures",
        ...species.map((s) => `# species\t${s.element}\t${s.ionisation}\t${s.abundance}\t${s.label}`),
        "wavelength_nm\telement\tionisation\tintensity",
        ...rows.map((r) => `${r.wavelength}\t${r.species.element}\t${r.species.ionisation}\t${r.intensity}`),
    ].join("\n");

    writeFileSync(join(outDir, `${key}.tsv`), `${body}\n`, "utf8");
    written.push({ file: `${key}.tsv`, rows: rows.length, bytes: body.length });
}

if (written.length === 0) {
    console.error(`No saved page found in ${sourceDir}.`);
    process.exit(1);
}

let total = 0;
for (const w of written) {
    total += w.bytes;
    console.log(`${w.file.padEnd(24)} ${String(w.rows).padStart(6)} rows, ${(w.bytes / 1024).toFixed(0)} KB`);
}
console.log(`\n${written.length} fixtures, ${(total / 1024).toFixed(0)} KB, written to ${outDir}`);
