/**
 * Putting a figure on the uncertainty of a published composition.
 *
 * The regolith simulant data set of V1-B
 * (`internals/libs/data/README.md` section 2 bis) gives one composition
 * per sample and no uncertainty on it. An inversion benchmark built on
 * a ground truth with no error bar produces numbers that cannot be
 * compared with each other, let alone with the literature, so the error
 * bar has to come from somewhere. It comes from inside the data set:
 * three routes lead to the composition of the same material, and
 * subtracting them is the only measurement of the ground truth's
 * uncertainty that exists without a second laboratory.
 *
 * The three routes:
 *
 * 1. **The authors' table**, `Moon_concentrations.txt`, thirteen oxides
 *    for each of twenty-one lunar samples. Read with `parseOxideTable`,
 *    which keeps a blank as "not reported".
 * 2. **The manufacturer's fact sheets**, nine PDF slides inside the
 *    archive, each with a bulk chemistry panel measured by a named
 *    laboratory. Read with `factsheet-pdf.mjs`.
 * 3. **The balance**, `Mixed_regoliths_ratios.docx`, which gives for
 *    every mixed sample its two commercial components and the mass of
 *    each to a hundredth of a gram on thirty grams. A mixture's
 *    composition follows from its components' by arithmetic, with no
 *    measurement of the mixture itself.
 *
 * What is compared, and how the three traps are handled:
 *
 * - **A blank is never a zero.** `compareWeightPercent` lists a key
 *   only one route reported as incomparable instead of subtracting the
 *   reported figure from nothing.
 * - **Iron is compared as iron.** The table reports Fe2O3 for one
 *   sample and FeO for the next, so every comparison is run a second
 *   time on `elementWeightPercent`, where the reporting convention has
 *   gone. The elemental comparison is the one the verdict is read from.
 * - **Nothing is normalised to a hundred.** Every figure here is per
 *   hundred grams of material AS PUBLISHED. The published totals are
 *   printed next to each other so the gap to a hundred is visible, and
 *   `resolveElementalComposition`, which would normalise, is not used
 *   for any comparison: at 98 % its normalisation is harmless and at
 *   88 % it is false, and a comparison must not depend on which.
 *
 * Usage, from the repository root:
 *
 *     node packages/dev/plugins/chemistry/tools/compare-simulant-ground-truth.mjs \
 *          --archive internals/libs/data/spectra/regolith-simulants/Data.zip \
 *          --xrf     internals/libs/data/spectra/regolith-simulants/Moon_concentrations.txt \
 *          --ratios  internals/libs/data/spectra/regolith-simulants/Mixed_regoliths_ratios.docx \
 *          [--mars-xrf internals/libs/data/spectra/regolith-simulants/Mars_concentrations.txt] \
 *          [--json <file>]
 *
 * Every path is an argument: the archive is 2.25 GB and lives in the
 * private research repository, so nothing here may assume a location.
 * `--mars-xrf` adds the martian half as a cross-check; the lunar half
 * is the only one whose analyses close, and the verdict is read from it
 * alone.
 */

import { createHash } from "node:crypto";
import { closeSync, fstatSync, openSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inflateRawSync } from "node:zlib";
import { readBulkChemistry, readFactsheetRuns } from "./factsheet-pdf.mjs";

const here = dirname(fileURLToPath(import.meta.url));

// ── reading a zip, for bytes rather than for text ────────────────────

/**
 * One entry of a zip archive, as bytes.
 *
 * The spectroscopy track has a reader for this archive already, but it
 * returns text, which a PDF is not, and it is built for the spectra
 * rather than for the nine small files next to them. This reads through
 * a file descriptor at offsets for the same reason that one does: the
 * archive is larger than a Node buffer, so `readFileSync` throws on it,
 * and reading the central directory plus one entry touches a few
 * megabytes whatever the archive weighs. The same reader serves the
 * `.docx`, which is a zip too.
 */
function openZip(path) {
    const fd = openSync(path, "r");
    const size = fstatSync(fd).size;

    const readAt = (position, length) => {
        const buffer = Buffer.allocUnsafe(length);
        let read = 0;
        while (read < length) {
            const n = readSync(fd, buffer, read, length - read, position + read);
            if (n === 0) break;
            read += n;
        }
        return read === length ? buffer : buffer.subarray(0, read);
    };

    const tailLength = Math.min(size, 65557);
    const tail = readAt(size - tailLength, tailLength);
    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
        if (tail.readUInt32LE(i) === 0x06054b50) {
            eocd = i;
            break;
        }
    }
    if (eocd < 0) {
        closeSync(fd);
        throw new Error(`${path} is not a zip: no end-of-central-directory record`);
    }

    const count = tail.readUInt16LE(eocd + 10);
    const directoryOffset = tail.readUInt32LE(eocd + 16);
    if (directoryOffset === 0xffffffff) {
        closeSync(fd);
        throw new Error(`${path} has a zip64 central directory, which this reader does not handle`);
    }
    const directory = readAt(directoryOffset, tail.readUInt32LE(eocd + 12));

    const entries = [];
    let offset = 0;
    for (let k = 0; k < count; k++) {
        if (directory.readUInt32LE(offset) !== 0x02014b50) throw new Error(`central directory entry ${k} of ${path} is malformed`);
        const nameLength = directory.readUInt16LE(offset + 28);
        entries.push({
            name: directory.toString("utf8", offset + 46, offset + 46 + nameLength),
            method: directory.readUInt16LE(offset + 10),
            compressedSize: directory.readUInt32LE(offset + 20),
            localOffset: directory.readUInt32LE(offset + 42),
        });
        offset += 46 + nameLength + directory.readUInt16LE(offset + 30) + directory.readUInt16LE(offset + 32);
    }

    return {
        entries,
        sizeBytes: size,
        bytes(name) {
            const entry = entries.find((e) => e.name === name);
            if (!entry) throw new Error(`no entry "${name}" in ${path}`);
            // The local header repeats the name and extra field, whose
            // lengths are what locate the data; its extra field may
            // differ from the directory's, so it is read, not assumed.
            const header = readAt(entry.localOffset, 30);
            const raw = readAt(entry.localOffset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28), entry.compressedSize);
            if (entry.method === 0) return raw;
            if (entry.method === 8) return inflateRawSync(raw);
            throw new Error(`${name}: compression method ${entry.method} is neither stored nor deflate`);
        },
        close() {
            closeSync(fd);
        },
    };
}

// ── reading the balance sheet ────────────────────────────────────────

/** The text of a Word paragraph or cell, with its runs joined. */
function wordText(xml) {
    return [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
        .map((m) => m[1])
        .join("")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .trim();
}

/**
 * The mixing table: for each mixed sample, its two components and the
 * mass weighed out of each.
 *
 * The document holds two tables, one per planet, each introduced by a
 * full-width heading row that says which. The tables have to be read in
 * that order and kept apart, because one label, `Na2O-AL`, appears in
 * BOTH, which is a typo in the martian half; merging the tables would
 * silently give a lunar sample a martian recipe.
 *
 * The labels are also spelt inconsistently: `Al203` for `Al2O3`,
 * `TIO2` for `TiO2`, `Na20` for `Na2O`. They are canonicalised the same
 * way the sample names of the composition table are, which is upper
 * case with the spaces removed and a zero read as the letter O, since
 * no correct name here contains a zero.
 */
function readMixingTable(documentXml) {
    const sets = new Map();
    let current = null;

    for (const table of documentXml.matchAll(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>/g)) {
        for (const row of table[0].matchAll(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g)) {
            const cells = [...row[0].matchAll(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g)].map((c) => wordText(c[0]));
            const joined = cells.join(" ");

            const heading = /\b(Moon|Mars)\b/i.exec(joined);
            if (cells.length <= 1 && heading) {
                current = heading[1].toLowerCase() === "moon" ? "Moon" : "Mars";
                if (!sets.has(current)) sets.set(current, []);
                continue;
            }
            if (current === null) continue;
            if (/Mixed label/i.test(joined)) continue;

            // Label, component A, mass A, a spacer, component B, mass B,
            // total. The spacer is an empty column of the layout.
            const label = cells[0];
            const values = cells.filter((c) => c.length > 0);
            if (values.length < 5) continue;
            const massA = Number(values[2]);
            const massB = Number(values[4]);
            if (!Number.isFinite(massA) || !Number.isFinite(massB)) continue;

            sets.get(current).push({
                label,
                key: canonical(label),
                parts: [
                    { name: values[1], key: canonical(values[1]), massGrams: massA },
                    { name: values[3], key: canonical(values[3]), massGrams: massB },
                ],
                declaredTotalGrams: values.length > 5 ? Number(values[5]) : Number.NaN,
            });
        }
    }
    return sets;
}

/** A sample name as a key: case, spacing and a zero-for-O all forgiven. */
function canonical(name) {
    return name
        .toUpperCase()
        .replace(/\s+/g, "")
        .replace(/0/g, "O");
}

// ── reporting ────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flag = (name, fallback = null) => {
    const i = argv.indexOf(`--${name}`);
    return i < 0 ? fallback : (argv[i + 1] ?? "");
};

const archivePath = flag("archive");
const xrfPath = flag("xrf");
const ratiosPath = flag("ratios");
const marsXrfPath = flag("mars-xrf");
const jsonPath = flag("json");

if (!archivePath || !xrfPath || !ratiosPath) {
    console.error("Usage: node compare-simulant-ground-truth.mjs --archive <Data.zip> --xrf <Moon_concentrations.txt> --ratios <Mixed_regoliths_ratios.docx> [--mars-xrf <Mars_concentrations.txt>] [--json <file>]");
    console.error("The data set is not in this repository: it is gigabytes of spectra, so every path is an argument.");
    process.exit(1);
}

// The chemistry plugin's compiled output, which holds the comparison
// logic and its tests. Built with:
//     npx tsc -b packages/dev/plugins/chemistry/tsconfig.build.json
const chemistry = await import(pathToFileURL(resolve(flag("chemistry", join(here, "..", "dist")), "index.js")).href);
const { compareWeightPercent, elementWeightPercent, mixByMass, parseOxideTable } = chemistry;

/**
 * A file's SHA-256, so a figure in a document can be traced to bytes.
 *
 * Streamed through a fixed buffer rather than read whole: the archive
 * is 2.25 GB and a Node buffer stops at 2 GiB, so the obvious one-liner
 * throws on the largest input this tool has.
 */
function digest(path) {
    const hash = createHash("sha256");
    const fd = openSync(path, "r");
    const buffer = Buffer.allocUnsafe(1 << 20);
    try {
        for (;;) {
            const read = readSync(fd, buffer, 0, buffer.length, null);
            if (read === 0) break;
            hash.update(buffer.subarray(0, read));
        }
    } finally {
        closeSync(fd);
    }
    return hash.digest("hex");
}

/** Today, where the machine is, so a dated report is not dated tomorrow. */
function today() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const lines = [];
const say = (text = "") => {
    lines.push(text);
    console.log(text);
};

const f = (value, digits = 3) => (value === null || !Number.isFinite(value) ? "-" : value.toFixed(digits));
/** The key that disagrees most, or "none" when nothing disagrees: a
 *  table of exact zeros must not appear to single one of them out. */
const worst = (comparison) => (comparison.maximumAbsoluteDifference > 0 ? (comparison.worstKey ?? "-") : "none");
const pct = (value, digits = 2) => (value === null || !Number.isFinite(value) ? "-" : `${(value * 100).toFixed(digits)} %`);

/** The median of a list, which is sorted in place. */
function median(values) {
    if (values.length === 0) return Number.NaN;
    values.sort((a, b) => a - b);
    const mid = values.length >> 1;
    return values.length % 2 === 1 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
}

say("# The ground truth of the regolith simulant set, confronted with itself");
say();
say(`Run on ${today()}.`);
say();
say("## Sources");
say();
for (const [label, path] of [
    ["archive", archivePath],
    ["authors' lunar table", xrfPath],
    ["balance sheet", ratiosPath],
    ...(marsXrfPath ? [["authors' martian table", marsXrfPath]] : []),
]) {
    say(`- ${label}: \`${path}\``);
    say(`  sha256 \`${digest(path)}\``);
}

// ── route 1: the authors' tables ─────────────────────────────────────

const lunar = parseOxideTable(readFileSync(xrfPath, "utf8"));
if (lunar.errors.length > 0) for (const e of lunar.errors) say(`- the lunar table: ${e}`);
const martian = marsXrfPath ? parseOxideTable(readFileSync(marsXrfPath, "utf8")) : { samples: [], oxides: [], errors: [] };
if (martian.errors.length > 0) for (const e of martian.errors) say(`- the martian table: ${e}`);

// One lookup per planet, never a merged one. The balance sheet gives
// the label `Na2O-AL` to a lunar mixture AND to a martian one, which is
// a typo in its martian half, and a merged map would quietly hand a
// martian recipe the lunar sample's analysis.
const byKey = { Moon: new Map(), Mars: new Map() };
for (const sample of lunar.samples) byKey.Moon.set(canonical(sample.name), sample);
for (const sample of martian.samples) byKey.Mars.set(canonical(sample.name), sample);
const anySet = (key) => byKey.Moon.get(key) ?? byKey.Mars.get(key);

/**
 * The one place a recipe's label and its column's name differ.
 *
 * The balance sheet's martian half calls a mixture `Na2O-AL`, with the
 * lunar suffix, and the martian composition table calls the same column
 * plain `Na2O`. Both are wrong in different ways and they are the same
 * sample: the alias is written out here rather than guessed by a
 * fuzzy match, so that the defect stays visible and no other label can
 * be bent into a neighbour by accident.
 */
const SAMPLE_ALIASES = { Moon: {}, Mars: { "NA2O-AL": "NA2O" } };
const resolveSample = (set, key) => byKey[set].get(key) ?? byKey[set].get(SAMPLE_ALIASES[set][key] ?? "");

say();
say(`The authors' lunar table holds ${lunar.samples.length} samples over ${lunar.oxides.length} oxide rows.`);
if (marsXrfPath) say(`Its martian table holds ${martian.samples.length} samples over ${martian.oxides.length} oxide rows.`);

// ── route 2: the manufacturer's fact sheets ──────────────────────────

const archive = openZip(archivePath);
const factsheetEntries = archive.entries.filter((e) => /Sample_Factsheets\/.+\.pdf$/i.test(e.name));

const factsheets = [];
for (const entry of factsheetEntries) {
    const base = entry.name.slice(entry.name.lastIndexOf("/") + 1);
    const simulant = /^([a-z]{3}-1[a-z]?)/i.exec(base);
    const bytes = archive.bytes(entry.name);
    const chemistryPanel = readBulkChemistry(readFactsheetRuns(bytes));
    factsheets.push({
        file: base,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        name: simulant ? simulant[1].toUpperCase() : base,
        key: simulant ? canonical(simulant[1]) : canonical(base),
        chemistry: chemistryPanel,
    });
}
archive.close();

say();
say("## Route 2, the manufacturer's fact sheets");
say();
say(`${factsheetEntries.length} fact sheets in the archive. The bulk chemistry panel of each, as read from the slide:`);
say();
say("| sheet | simulant | oxides | oxide sum | LOI | declared total | sum + LOI - total |");
say("|---|---|---:|---:|---:|---:|---:|");
for (const sheet of factsheets) {
    if (!sheet.chemistry) {
        say(`| \`${sheet.file}\` | ${sheet.name} | none | - | - | - | - |`);
        continue;
    }
    const c = sheet.chemistry;
    const sum = Object.values(c.oxidesWeightPercent).reduce((a, b) => a + b, 0);
    const closure = c.declaredTotal === null ? Number.NaN : sum + (c.lossOnIgnition ?? 0) - c.declaredTotal;
    say(`| \`${sheet.file}\` | ${sheet.name} | ${c.order.length} | ${f(sum, 2)} | ${c.lossOnIgnition === null ? "-" : f(c.lossOnIgnition, 2)} | ${c.declaredTotal === null ? "-" : f(c.declaredTotal, 2)} | ${f(closure, 2)} |`);
    for (const problem of c.problems) say(`| | | | | | | ${problem} |`);
}
say();
say("The last column is the extraction's own check: a sheet's oxides plus its loss on ignition");
say("should be the total it declares. Any sheet off by more than a rounding was read wrong.");

// ── comparison A: the authors' table against the fact sheet ──────────

say();
say("## Comparison A, the authors' table against the manufacturer's fact sheet");
say();
say("Per hundred grams of material as published, with no normalisation on either side.");
say("Loss on ignition is not an oxide and is excluded from the oxide comparison; it reappears");
say("in the closure discussion below.");

const comparisonA = [];
for (const sheet of factsheets) {
    if (!sheet.chemistry) continue;
    const authors = anySet(sheet.key);
    if (!authors) continue;

    const sheetSample = { name: `${sheet.name} fact sheet`, oxidesWeightPercent: sheet.chemistry.oxidesWeightPercent, publishedTotalWeightPercent: Object.values(sheet.chemistry.oxidesWeightPercent).reduce((a, b) => a + b, 0) };
    const onOxides = compareWeightPercent(authors.oxidesWeightPercent, sheetSample.oxidesWeightPercent);
    const onElements = compareWeightPercent(elementWeightPercent(authors), elementWeightPercent(sheetSample));
    comparisonA.push({ sample: authors.name, key: sheet.key, set: byKey.Moon.has(sheet.key) ? "Moon" : "Mars", sheet: sheet.file, lossOnIgnition: sheet.chemistry.lossOnIgnition, onOxides, onElements });
}

say();
say("| sample | set | oxides compared | median |diff| pp | max |diff| pp | worst oxide | authors' total | sheet's total |");
say("|---|---|---:|---:|---:|---|---:|---:|");
for (const row of comparisonA) {
    say(`| ${row.sample} | ${row.set} | ${row.onOxides.comparable.length} | ${f(row.onOxides.medianAbsoluteDifference)} | ${f(row.onOxides.maximumAbsoluteDifference)} | ${worst(row.onOxides)} | ${f(row.onOxides.totalA, 2)} | ${f(row.onOxides.totalB, 2)} |`);
}

say();
say("Oxide by oxide, every sample that has both routes:");
say();
for (const row of comparisonA) {
    say(`### ${row.sample}, authors' table against \`${row.sheet}\``);
    say();
    say("| oxide | authors | fact sheet | difference pp | relative |");
    say("|---|---:|---:|---:|---:|");
    for (const d of row.onOxides.differences) {
        say(`| ${d.key} | ${d.a === null ? "not reported" : f(d.a, 3)} | ${d.b === null ? "not reported" : f(d.b, 3)} | ${f(d.difference)} | ${pct(d.relativeDifference)} |`);
    }
    const ironA = row.onElements.differences.find((d) => d.key === "Fe");
    say();
    say(`On the element basis, iron: authors ${f(ironA?.a ?? null)} against ${f(ironA?.b ?? null)} g per 100 g, difference ${f(ironA?.difference ?? null)}.`);
    say(`Largest elemental difference ${f(row.onElements.maximumAbsoluteDifference)} pp on ${row.onElements.worstKey ?? "-"}.`);
    if (row.lossOnIgnition !== null) say(`The sheet also declares ${f(row.lossOnIgnition, 2)} wt % loss on ignition, which the authors' table does not carry.`);
    say();
}

// ── comparison B: the balance against the authors' table ─────────────

const ratiosZip = openZip(ratiosPath);
const mixingTable = readMixingTable(ratiosZip.bytes("word/document.xml").toString("utf8"));
ratiosZip.close();

say("## Comparison B, the balance against the authors' table");
say();
say("A mixture's composition from its components' analyses and the masses weighed out, against");
say("the mixture's own analysis. A disagreement here is the balance, the homogeneity of the");
say("mixture or the analysis, and the three are bounded together rather than separated.");
say();
say("A component silent about an oxide contributes zero of it, and the share of the mixture's");
say("mass that silence covers is reported, so a figure assembled from a partial silence is not");
say("read as a complete one.");

const comparisonB = { Moon: [], Mars: [] };
for (const [set, recipes] of mixingTable) {
    say();
    say(`### ${set}, ${recipes.length} mixtures`);
    say();
    const missing = [];
    const rows = [];
    for (const recipe of recipes) {
        const measured = resolveSample(set, recipe.key);
        const parts = recipe.parts.map((p) => ({ ...p, sample: resolveSample(set, p.key) }));
        if (!measured || parts.some((p) => !p.sample)) {
            missing.push(`${recipe.label}: ${!measured ? "no analysis of the mixture" : `no analysis of ${parts.filter((p) => !p.sample).map((p) => p.name).join(" and ")}`}`);
            continue;
        }
        const computed = mixByMass(
            parts.map((p) => ({ sample: p.sample, massGrams: p.massGrams })),
            `${recipe.label} computed`
        );
        const onOxides = compareWeightPercent(computed.oxidesWeightPercent, measured.oxidesWeightPercent);
        const onElements = compareWeightPercent(elementWeightPercent(computed), elementWeightPercent(measured));
        const weighedSum = recipe.parts.reduce((a, p) => a + p.massGrams, 0);
        rows.push({ recipe, parts, measured, computed, onOxides, onElements, balanceMismatchGrams: Number.isFinite(recipe.declaredTotalGrams) ? weighedSum - recipe.declaredTotalGrams : Number.NaN });
    }
    comparisonB[set] = rows;

    say("| mixture | components | masses g | elements compared | median |diff| pp | max |diff| pp | worst element | computed total | measured total |");
    say("|---|---|---|---:|---:|---:|---|---:|---:|");
    for (const r of rows) {
        say(
            `| ${r.recipe.label} | ${r.recipe.parts.map((p) => p.name).join(" + ")} | ${r.recipe.parts.map((p) => f(p.massGrams, 2)).join(" + ")} | ${r.onElements.comparable.length} | ${f(r.onElements.medianAbsoluteDifference)} | ${f(r.onElements.maximumAbsoluteDifference)} | ${worst(r.onElements)} | ${f(r.onElements.totalA, 2)} | ${f(r.onElements.totalB, 2)} |`
        );
    }
    for (const m of missing) say(`| ${m} | | | | | | | | |`);

    const partial = new Set();
    for (const r of rows) for (const [oxide, coverage] of Object.entries(r.computed.oxideCoverage)) if (coverage < 0.999) partial.add(oxide);
    if (partial.size > 0) {
        say();
        say(`Oxides no single mixture had both components reporting: ${[...partial].sort().join(", ")}. Their computed figures are lower bounds.`);
    }
}

// ── comparison C: is the mixture row a measurement at all? ───────────

/**
 * The bare iron figure of an analysis, whatever row it sits in.
 *
 * Not the elemental iron: the NUMBER as published, added over the Fe2O3
 * and FeO rows without converting either. That is a quantity with no
 * physical meaning, and it is computed here for exactly that reason. If
 * a mixture's published iron figure equals the mass-weighted mean of
 * its components' published iron figures, then whoever filled the row
 * added the two numbers without reading their headings, and the row is
 * arithmetic on labels rather than a measurement of iron.
 */
function bareIronFigure(sample) {
    return (sample.oxidesWeightPercent.Fe2O3 ?? 0) + (sample.oxidesWeightPercent.FeO ?? 0);
}

/** Which iron row an analysis uses. */
function ironRows(sample) {
    return ["Fe2O3", "FeO"].filter((k) => k in sample.oxidesWeightPercent);
}

say();
say("## Comparison C, is a mixture's row a measurement at all?");
say();
say("Comparison B found the two routes agreeing to a thousandth of a percentage point on every");
say("element but iron, which is not how two measurements of one powder behave. So the question");
say("becomes whether the mixture rows were measured at all, and it has an answer: a row that is");
say("the mass-weighted mean of its components' rows TO THE LAST PUBLISHED DIGIT was not weighed");
say("out and analysed, it was computed.");
say();
say("The threshold below is 0.005 percentage points, half the last digit of a figure published to");
say("two decimals: a residual under it cannot be distinguished from the rounding of the");
say("arithmetic itself.");

const ROUNDING_FLOOR = 0.005;
const comparisonC = { Moon: [], Mars: [] };

for (const set of ["Moon", "Mars"]) {
    const rows = comparisonB[set];
    if (rows.length === 0) continue;

    say();
    say(`### ${set}`);
    say();
    say("| mixture | oxides compared | oxides above the floor | which, and by how much | iron rows: components -> mixture | bare iron residual pp |");
    say("|---|---:|---:|---|---|---:|");

    for (const r of rows) {
        // Only the oxides both components reported: a partial silence
        // makes the computed figure a lower bound, which is not a
        // residual to judge arithmetic by.
        const complete = r.onOxides.differences.filter((d) => d.difference !== null && (r.computed.oxideCoverage[d.key] ?? 0) > 0.999);
        const above = complete.filter((d) => Math.abs(d.difference) > ROUNDING_FLOOR);

        const componentIron = r.parts.reduce((a, p) => a + p.massGrams * bareIronFigure(p.sample), 0) / r.computed.totalMassGrams;
        const bareResidual = bareIronFigure(r.measured) - componentIron;
        const rowsUsed = `${r.parts.map((p) => ironRows(p.sample).join("+") || "none").join(", ")} -> ${ironRows(r.measured).join("+") || "none"}`;

        comparisonC[set].push({
            mixture: r.recipe.label,
            oxidesCompared: complete.length,
            aboveFloor: above.map((d) => ({ oxide: d.key, differencePp: d.difference })),
            componentBareIron: componentIron,
            measuredBareIron: bareIronFigure(r.measured),
            bareIronResidualPp: bareResidual,
            ironRows: rowsUsed,
            balanceMismatchGrams: r.balanceMismatchGrams,
        });

        say(
            `| ${r.recipe.label} | ${complete.length} | ${above.length} | ${above.length === 0 ? "none" : above.map((d) => `${d.key} ${d.difference >= 0 ? "+" : ""}${f(d.difference, 3)}`).join(", ")} | ${rowsUsed} | ${bareResidual >= 0 ? "+" : ""}${f(bareResidual, 3)} |`
        );
    }

    const ironExact = comparisonC[set].filter((c) => Math.abs(c.bareIronResidualPp) <= ROUNDING_FLOOR).length;
    const oxidesExact = comparisonC[set].filter((c) => c.aboveFloor.length === 0).length;
    say();
    say(`${oxidesExact} of ${comparisonC[set].length} mixtures reproduce every shared oxide to within the rounding floor.`);
    say(`${ironExact} of ${comparisonC[set].length} reproduce the BARE iron figure, added across the Fe2O3 and FeO rows without converting.`);

    // What the iron row costs if it is read as the heading says.
    const ironRatios = comparisonB[set]
        .map((r) => {
            const d = r.onElements.differences.find((x) => x.key === "Fe");
            return d && d.a !== null && d.b !== null && d.a !== 0 ? d.b / d.a : Number.NaN;
        })
        .filter(Number.isFinite);
    if (ironRatios.length > 0) {
        say(
            `Taken at its heading, the mixtures' iron is ${pct(1 - median([...ironRatios]), 2)} below the iron their components carry, median over ${ironRatios.length} mixtures ` +
                `(the FeO to Fe2O3 mass ratio is ${f(2 * 71.8444 / 159.6882, 4)}, so reading an FeO figure as Fe2O3 loses ${pct(1 - (2 * 71.8444) / 159.6882 / 1, 2)} of the compound and ${pct(1 - 0.6994 / 0.7773, 2)} of the iron).`
        );
    }

    const mismatched = comparisonC[set].filter((c) => Number.isFinite(c.balanceMismatchGrams) && Math.abs(c.balanceMismatchGrams) > 0.005);
    say(`Balance sheet: ${mismatched.length} of ${comparisonC[set].length} recipes whose two masses do not add up to the total they declare.`);
}

// ── comparison D: which pair actually explains a mixture? ────────────

say();
say("## Comparison D, which pair of end-members actually explains each mixture?");
say();
say("Comparison C left a handful of mixtures whose oxides do not follow from the components the");
say("balance sheet names. A mixture whose row IS arithmetic has a pair that reproduces it, so the");
say("pair can be searched for instead of assumed: the masses are kept exactly as weighed and");
say("every pair of end-members is tried in both orders, ranked by the root mean square residual");
say("over the oxides all three analyses report.");
say();
say("A declared pair that is not the best pair is a mislabelled recipe, and that is a different");
say("defect from a mistyped cell: the sample exists and is well described, by another recipe.");

/** The end-members of a set: the samples no recipe is built from. */
function endMembersOf(set) {
    const built = new Set(comparisonB[set].map((r) => (resolveSample(set, r.recipe.key) ?? { name: "" }).name).map(canonical));
    return [...byKey[set].values()].filter((sample) => !built.has(canonical(sample.name)));
}

/** End-members whose analyses are the same record, oxide for oxide. */
function twinsAmong(samples) {
    const groups = new Map();
    for (const sample of samples) {
        const key = Object.entries(sample.oxidesWeightPercent)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([oxide, value]) => `${oxide}=${value}`)
            .join(",");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(sample.name);
    }
    return [...groups.values()].filter((names) => names.length > 1);
}

const comparisonD = { Moon: [], Mars: [] };
for (const set of ["Moon", "Mars"]) {
    const rows = comparisonB[set];
    if (rows.length === 0) continue;

    const endMembers = endMembersOf(set);

    say();
    say(`### ${set}, over ${endMembers.length} end-members`);
    say();
    const twins = twinsAmong(endMembers);
    if (twins.length > 0) {
        say("End-members whose analyses are the SAME record, oxide for oxide:");
        for (const group of twins) say(`- ${group.join(" and ")}`);
        say();
        say("The table gives these the same composition, so no comparison can tell them apart and");
        say(`the ${endMembers.length} end-members rest on ${endMembers.length - twins.reduce((a, g) => a + g.length - 1, 0)} distinct analyses. A pair that swaps one twin for another is a tie,`);
        say("not a better fit, and is reported as such below.");
        say();
    }
    say("| mixture | declared pair | declared RMS pp | best pair | best RMS pp | verdict |");
    say("|---|---|---:|---|---:|---|");

    for (const r of rows) {
        const candidates = [];
        for (let i = 0; i < endMembers.length; i++) {
            for (let k = 0; k < endMembers.length; k++) {
                if (i === k) continue;
                const trial = mixByMass(
                    [
                        { sample: endMembers[i], massGrams: r.recipe.parts[0].massGrams },
                        { sample: endMembers[k], massGrams: r.recipe.parts[1].massGrams },
                    ],
                    "trial"
                );
                const comparison = compareWeightPercent(trial.oxidesWeightPercent, r.measured.oxidesWeightPercent);
                // Only oxides both end-members reported: a partial
                // silence biases the residual and would favour whichever
                // pair says least.
                const shared = comparison.differences.filter((d) => d.difference !== null && (trial.oxideCoverage[d.key] ?? 0) > 0.999);
                if (shared.length === 0) continue;
                candidates.push({
                    pair: [endMembers[i].name, endMembers[k].name],
                    oxides: shared.length,
                    rms: Math.sqrt(shared.reduce((a, d) => a + d.difference * d.difference, 0) / shared.length),
                });
            }
        }
        candidates.sort((a, b) => a.rms - b.rms);
        const declared = candidates.find((c) => canonical(c.pair[0]) === r.recipe.parts[0].key && canonical(c.pair[1]) === r.recipe.parts[1].key);
        const best = candidates[0];
        // A tie, down to floating point, is a tie: two end-members with
        // the same analysis give the same residual, and calling one of
        // them the better explanation would be an artefact of the sort.
        const sameAsDeclared = Boolean(declared && best && declared.rms - best.rms <= 1e-9);

        comparisonD[set].push({
            mixture: r.recipe.label,
            declaredPair: r.recipe.parts.map((part) => part.name),
            declaredRmsPp: declared ? declared.rms : Number.NaN,
            bestPair: best ? best.pair : null,
            bestRmsPp: best ? best.rms : Number.NaN,
            bestIsDeclared: sameAsDeclared,
        });

        say(
            `| ${r.recipe.label} | ${r.recipe.parts.map((part) => part.name).join(" + ")} | ${f(declared ? declared.rms : Number.NaN)} | ${best ? best.pair.join(" + ") : "-"} | ${f(best ? best.rms : Number.NaN)} | ${sameAsDeclared ? "declared pair is as good as any" : "another pair fits better"} |`
        );
    }

    const disagreeing = comparisonD[set].filter((c) => !c.bestIsDeclared);
    say();
    say(`${comparisonD[set].length - disagreeing.length} of ${comparisonD[set].length} mixtures are explained as well as anything can by the pair the balance sheet declares.`);
    for (const c of disagreeing) {
        say(`- ${c.mixture}: declared ${c.declaredPair.join(" + ")} at ${f(c.declaredRmsPp)} pp, best ${c.bestPair.join(" + ")} at ${f(c.bestRmsPp)} pp.`);
    }
}

// ── the reporting floor ──────────────────────────────────────────────

say();
say("## The reporting floor, the one uncertainty that can be computed");
say();
say("The end-member analyses are published to one decimal of weight per cent, so each oxide");
say("carries a quantisation of a tenth of a point whatever the laboratory did. Read as a uniform");
say("distribution of width 0.1 wt %, that is a standard uncertainty of 0.1 over the square root");
say("of twelve, so 0.0289 wt % per oxide, and it reaches an element through the element's mass");
say("share inside each oxide it appears in, added in quadrature because the roundings are");
say("independent of each other.");
say();
say("This is a FLOOR and not the uncertainty: it is what the publication costs even if the");
say("measurement behind it were perfect.");

const DIGIT_STEP = 0.1;
const roundingSigma = DIGIT_STEP / Math.sqrt(12);

const floorByElement = new Map();
const lunarEndMembers = endMembersOf("Moon");

for (const sample of lunarEndMembers) {
    const squares = new Map();
    for (const oxide of Object.keys(sample.oxidesWeightPercent)) {
        // One point of one oxide, run through the comparison module's own
        // converter, says how much of each element a point of that oxide
        // carries; the floor and the comparison then share one definition.
        const unit = elementWeightPercent({ name: oxide, oxidesWeightPercent: { [oxide]: 1 }, publishedTotalWeightPercent: 1 });
        for (const [element, share] of Object.entries(unit)) squares.set(element, (squares.get(element) ?? 0) + share * share);
    }
    const levels = elementWeightPercent(sample);
    for (const [element, sumOfSquares] of squares) {
        if (!floorByElement.has(element)) floorByElement.set(element, []);
        floorByElement.get(element).push({ sample: sample.name, sigma: roundingSigma * Math.sqrt(sumOfSquares), level: levels[element] ?? 0 });
    }
}

say();
say("| element | end-members | mean level g/100 g | floor pp | floor relative |");
say("|---|---:|---:|---:|---:|");
const floor = [];
for (const [element, entries] of [...floorByElement].sort((a, b) => b[1].reduce((s, e) => s + e.level, 0) / b[1].length - a[1].reduce((s, e) => s + e.level, 0) / a[1].length)) {
    const level = entries.reduce((s, e) => s + e.level, 0) / entries.length;
    const sigma = Math.max(...entries.map((e) => e.sigma));
    floor.push({ element, endMembers: entries.length, meanLevel: level, floorPp: sigma, floorRelative: level > 0 ? sigma / level : Number.NaN });
    say(`| ${element} | ${entries.length} | ${f(level, 2)} | ${f(sigma)} | ${pct(level > 0 ? sigma / level : Number.NaN)} |`);
}
say();
say("`floor pp` is the worst of the six lunar end-members, in grams of the element per hundred");
say("grams of material, and `mean level` is that element's mean over the same six.");

// ── the verdict ──────────────────────────────────────────────────────

/**
 * The per-element summary of a set of mixture comparisons.
 *
 * `bias` is the mean signed difference and separates a systematic
 * disagreement from scatter; `RMS` is the figure to carry as a standard
 * uncertainty; `max` is what the worst sample actually did. All three
 * are in grams of the element per hundred grams of material, which is
 * the only basis on which a major oxide and a trace are both honest.
 */
function verdict(rows, pick, label) {
    const byElement = new Map();
    for (const r of rows) {
        for (const d of pick(r).differences) {
            if (d.difference === null) continue;
            if (!byElement.has(d.key)) byElement.set(d.key, { differences: [], relatives: [], levels: [] });
            const bucket = byElement.get(d.key);
            bucket.differences.push(d.difference);
            bucket.relatives.push(Math.abs(d.relativeDifference ?? Number.NaN));
            bucket.levels.push(((d.a ?? 0) + (d.b ?? 0)) / 2);
        }
    }

    say();
    say(`### ${label}`);
    say();
    say("| element | mixtures | mean level g/100 g | bias pp | RMS pp | max pp | median relative | max relative |");
    say("|---|---:|---:|---:|---:|---:|---:|---:|");
    const out = [];
    const meanLevel = (bucket) => bucket.levels.reduce((a, v) => a + v, 0) / bucket.levels.length;
    for (const [element, bucket] of [...byElement].sort((a, b) => meanLevel(b[1]) - meanLevel(a[1]))) {
        const n = bucket.differences.length;
        const level = meanLevel(bucket);
        const bias = bucket.differences.reduce((a, v) => a + v, 0) / n;
        const rms = Math.sqrt(bucket.differences.reduce((a, v) => a + v * v, 0) / n);
        const worstOne = bucket.differences.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
        const finite = bucket.relatives.filter(Number.isFinite);
        const medianRelative = median([...finite]);
        const maxRelative = finite.reduce((m, v) => Math.max(m, v), 0);
        out.push({ element, mixtures: n, meanLevelGramsPer100g: level, biasPp: bias, rmsPp: rms, maxPp: worstOne, medianRelative, maxRelative });
        say(`| ${element} | ${n} | ${f(level, 2)} | ${bias >= 0 ? "+" : ""}${f(bias)} | ${f(rms)} | ${f(worstOne)} | ${pct(medianRelative)} | ${pct(maxRelative)} |`);
    }
    return out;
}

say();
say("## The verdict, element by element");
say();
say("Read from the lunar mixtures. The lunar analyses close at 98.1 to 101.6 wt %, so the gap to a");
say("hundred changes nothing there; the martian ones reach 88.3 wt % and are a cross-check, never");
say("a bound. Nothing below is normalised: every figure is grams of the element per hundred grams");
say("of material as published, on both sides of every subtraction.");

// Which mixtures are defective rather than uncertain. The threshold is
// ten times the rounding floor of comparison C: the residuals of the
// sound mixtures stop at 0.012 pp and the defective ones start at
// 0.267, so any cut between the two gives the same three names, and
// this one is stated rather than chosen to fit.
const DEFECT_THRESHOLD = 0.05;
const defective = new Set(
    comparisonC.Moon.filter((c) => c.aboveFloor.some((d) => Math.abs(d.differencePp) > DEFECT_THRESHOLD)).map((c) => c.mixture)
);

const asPublished = verdict(comparisonB.Moon, (r) => r.onElements, "Moon, as published, all 15 mixtures");

say();
say(`Defective mixtures, by a residual above ${f(DEFECT_THRESHOLD, 2)} pp on an oxide both components reported: ${defective.size === 0 ? "none" : [...defective].join(", ")}.`);
say("Those are mistyped cells, not uncertainty, and they are what the oxygen, aluminium,");
say("titanium and phosphorus rows above are made of.");

// The iron correction. Comparison C showed that a mixture's iron figure
// is its components' figures averaged without converting, under an
// Fe2O3 heading. Reading that heading as FeO is the correction, and
// applying it here measures what it is worth rather than asserting it.
const corrected = comparisonB.Moon.filter((r) => !defective.has(r.recipe.label)).map((r) => {
    const { Fe2O3, ...rest } = r.measured.oxidesWeightPercent;
    const relabelled = Fe2O3 === undefined ? r.measured.oxidesWeightPercent : { ...rest, FeO: (rest.FeO ?? 0) + Fe2O3 };
    const measured = { name: `${r.measured.name} with its iron row read as FeO`, oxidesWeightPercent: relabelled, publishedTotalWeightPercent: Object.values(relabelled).reduce((a, b) => a + b, 0) };
    return { ...r, onElementsCorrected: compareWeightPercent(elementWeightPercent(r.computed), elementWeightPercent(measured)) };
});

// The correction recovers the iron only where both components reported
// it the same way. Where one component reports Fe2O3 and the other FeO,
// the published figure is the sum of two incommensurable numbers and no
// relabelling can undo it, so the two cases are kept apart rather than
// averaged into one misleading residual.
const unambiguous = corrected.filter((r) => r.parts.every((part) => "FeO" in part.sample.oxidesWeightPercent && !("Fe2O3" in part.sample.oxidesWeightPercent)));
const mixedConvention = corrected.filter((r) => !unambiguous.includes(r));

const afterCorrections = verdict(unambiguous, (r) => r.onElementsCorrected, `Moon, after both corrections, the ${unambiguous.length} mixtures whose two components report iron the same way`);

say();
say("The two corrections are: the three defective mixtures dropped, and every mixture's Fe2O3");
say("row read as the FeO figure it actually holds. What is left is the residual of the authors'");
say("own arithmetic, which is the rounding of their spreadsheet, except on oxygen.");
say();
say("Oxygen keeps a residual because a mixture's column does not always carry the rows its");
say("components carry: a trace oxide reported for a component and left out of the mixture takes");
say("its oxygen with it, and oxygen is the one element every oxide contributes to, so every such");
say("omission lands on it.");
say();
say("| oxide | mixtures whose column omits it | largest oxygen it takes with it pp |");
say("|---|---:|---:|");
const omitted = new Map();
for (const r of unambiguous) {
    for (const oxide of r.onElementsCorrected === undefined ? [] : r.onOxides.onlyInA) {
        if (oxide === "FeO" || oxide === "Fe2O3") continue; // the iron row, already corrected above
        const oxygen = (elementWeightPercent({ name: oxide, oxidesWeightPercent: { [oxide]: r.computed.oxidesWeightPercent[oxide] ?? 0 }, publishedTotalWeightPercent: 0 }).O ?? 0);
        if (!omitted.has(oxide)) omitted.set(oxide, { mixtures: 0, worstOxygen: 0 });
        const entry = omitted.get(oxide);
        entry.mixtures++;
        entry.worstOxygen = Math.max(entry.worstOxygen, oxygen);
    }
}
for (const [oxide, entry] of [...omitted].sort((a, b) => b[1].worstOxygen - a[1].worstOxygen)) {
    say(`| ${oxide} | ${entry.mixtures} of ${unambiguous.length} | ${f(entry.worstOxygen)} |`);
}
if (omitted.size === 0) say("| none | | |");

if (mixedConvention.length > 0) {
    verdict(mixedConvention, (r) => r.onElementsCorrected, `Moon, the ${mixedConvention.length} mixtures that add an FeO figure to an Fe2O3 figure`);
    say();
    say(`These are ${mixedConvention.map((r) => r.recipe.label).join(", ")}, each built with LHS-1E, the one end-member whose`);
    say("iron is reported as Fe2O3 while the other five report FeO. Their published iron figure is a");
    say("sum of two quantities that are not the same quantity, so no reading of the heading recovers");
    say("it: iron and the oxygen that comes with it stay wrong whichever heading is believed. The");
    say("figures in this table are what reading the row as FeO leaves, which is the better of the two");
    say("readings and still not right.");
    say();
    say("| mixture | components | computed Fe g/100 g | Fe as FeO g/100 g | Fe as Fe2O3 g/100 g |");
    say("|---|---|---:|---:|---:|");
    for (const r of mixedConvention) {
        const computedIron = elementWeightPercent(r.computed).Fe ?? Number.NaN;
        const figure = r.measured.oxidesWeightPercent.Fe2O3 ?? r.measured.oxidesWeightPercent.FeO ?? Number.NaN;
        say(`| ${r.recipe.label} | ${r.recipe.parts.map((part) => part.name).join(" + ")} | ${f(computedIron)} | ${f(figure * (55.845 / 71.8444))} | ${f(figure * ((2 * 55.845) / 159.6882))} |`);
    }
    say();
    say("`computed Fe` is the iron the components actually carry, which is the figure to use for");
    say("these four if they are used at all.");
}

const martianVerdict = comparisonB.Mars.length > 0 ? verdict(comparisonB.Mars, (r) => r.onElements, `Mars, cross-check only, ${comparisonB.Mars.length} mixtures`) : [];

say();
say("## What to carry downstream");
say();
say("The three routes are not three. The authors' analysis of every commercial end-member is the");
say("manufacturer's fact sheet transcribed, to the digit, with the loss-on-ignition row dropped;");
say("the mixtures are arithmetic on those same figures. So the data set holds one analysis per");
say("material and no replicate of anything, and the accuracy of its ground truth CANNOT be");
say("bounded from inside it. What the three routes do bound is its internal consistency, and");
say("that is what the tables above measure.");
say();
say("For a benchmark the figure to quote per element is therefore the larger of two things:");
say("the reporting floor, which is what the published precision costs and is the only");
say("uncertainty computable here, and the residual after corrections over the mixtures whose");
say("iron convention is unambiguous, which is what the authors' own arithmetic leaves. Both are");
say("tabulated above and neither is an accuracy.");

// Every element the end-members report, not only the ones a mixture
// happens to test: an element with no mixture behind it still has a
// reporting floor, and leaving it out of the table would read as
// though it had no uncertainty at all.
const carry = [];
for (const floorEntry of floor) {
    const residual = afterCorrections.find((x) => x.element === floorEntry.element);
    const quote = Math.max(floorEntry.floorPp, residual ? residual.rmsPp : 0);
    carry.push({
        element: floorEntry.element,
        // The level over the six end-members rather than over the
        // comparison subset: it is the composition of the materials, so
        // a relative figure read against it means the same thing for
        // every element.
        meanLevelGramsPer100g: floorEntry.meanLevel,
        endMembersReporting: floorEntry.endMembers,
        floorPp: floorEntry.floorPp,
        residualRmsPp: residual ? residual.rmsPp : null,
        residualMixtures: residual ? residual.mixtures : 0,
        quotePp: quote,
        quoteRelative: floorEntry.meanLevel > 0 ? quote / floorEntry.meanLevel : Number.NaN,
    });
}

say();
say("| element | end-members | mean level g/100 g | reporting floor pp | residual RMS pp | mixtures | to quote pp | to quote relative |");
say("|---|---:|---:|---:|---:|---:|---:|---:|");
for (const c of carry) {
    say(
        `| ${c.element} | ${c.endMembersReporting} | ${f(c.meanLevelGramsPer100g, 2)} | ${f(c.floorPp)} | ${c.residualRmsPp === null ? "not tested" : f(c.residualRmsPp)} | ${c.residualMixtures} | ${f(c.quotePp)} | ${pct(c.quoteRelative)} |`
    );
}
say();
say("These are one-sigma figures in grams of the element per hundred grams of material. They are");
say("a LOWER BOUND on the ground truth's uncertainty, not an estimate of it: a systematic error");
say("of the one analysis everything descends from would leave every number above untouched.");

if (jsonPath) {
    writeFileSync(
        jsonPath,
        `${JSON.stringify(
            {
                ranOn: today(),
                sources: {
                    archive: { path: archivePath, sha256: digest(archivePath) },
                    lunarTable: { path: xrfPath, sha256: digest(xrfPath) },
                    balanceSheet: { path: ratiosPath, sha256: digest(ratiosPath) },
                    ...(marsXrfPath ? { martianTable: { path: marsXrfPath, sha256: digest(marsXrfPath) } } : {}),
                },
                factsheets: factsheets.map((s) => ({ file: s.file, sha256: s.sha256, name: s.name, chemistry: s.chemistry })),
                comparisonA: comparisonA.map((r) => ({ sample: r.sample, sheet: r.sheet, lossOnIgnition: r.lossOnIgnition, onOxides: r.onOxides, onElements: r.onElements })),
                comparisonB: Object.fromEntries(
                    Object.entries({ Moon: comparisonB.Moon.map((r) => corrected.find((c) => c.recipe.label === r.recipe.label) ?? r), Mars: comparisonB.Mars }).map(([set, rows]) => [
                        set,
                        rows.map((r) => ({
                            mixture: r.recipe.label,
                            parts: r.recipe.parts.map((p) => ({ name: p.name, massGrams: p.massGrams })),
                            computedOxides: r.computed.oxidesWeightPercent,
                            oxideCoverage: r.computed.oxideCoverage,
                            onOxides: r.onOxides,
                            onElements: r.onElements,
                            onElementsCorrected: r.onElementsCorrected ?? null,
                        })),
                    ])
                ),
                verdict: { MoonAsPublished: asPublished, MoonAfterCorrections: afterCorrections, Mars: martianVerdict },
                defectiveMixtures: [...defective],
                reportingFloor: floor,
                toCarry: carry,
                comparisonC,
                comparisonD,
                report: lines.join("\n"),
            },
            null,
            2
        )}\n`,
        "utf8"
    );
    console.log(`\nwritten to ${jsonPath}`);
}
