/**
 * Turns the NIST ASD exports into the catalogue the plugin ships.
 *
 * Why a build step rather than reading the TSV at runtime: the exports
 * live in a private research directory that the public repository does
 * not carry, the browser bundle must not read the file system, and a
 * catalogue is reference data that should be reviewable in a diff. The
 * generated file records where every number came from, including the
 * sha256 of the export it was parsed from, so a spectrum can always be
 * traced back to a download.
 *
 * Usage, from the repository root:
 *
 *     node packages/dev/plugins/spectroscopy/tools/build-nist-catalogue.mjs \
 *          [source-directory] [output-file]
 *
 * Defaults: `internals/libs/data` and
 * `packages/dev/plugins/spectroscopy/src/lines/nist-catalogue.data.ts`.
 *
 * It parses with the plugin's OWN reader (`dist/lines/nist.parse.js`),
 * so the rules that decide what is usable live in one tested place.
 * Compile the plugin first.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, "..");
const repoRoot = resolve(pluginRoot, "../../../..");

const sourceDir = resolve(process.argv[2] ?? join(repoRoot, "internals/libs/data"));
const outFile = resolve(process.argv[3] ?? join(pluginRoot, "src/lines/nist-catalogue.data.ts"));

const parser = await import(pathToFileURL(join(pluginRoot, "dist/lines/nist.parse.js")).href);

/**
 * The thirty-six species downloaded, with the directory name each one
 * uses: twelve elements, three ionisation stages each.
 *
 * Three stages per element, not two: at 11 605 K, nine per cent of
 * calcium is already doubly ionised, and a balance that stops at the
 * first ion puts that nine per cent back into the stages below, which
 * biases every ratio that calcium takes part in. Measured in
 * `internals/libs/07-V1B0-NIST-CROSSCHECK.md`.
 *
 * Twelve elements, not three. The first eight are what the V1-B mineral
 * set needs; Al, Na, K and Ti were added when V1-B moved to the
 * regolith simulants, whose XRF compositions cover thirteen oxides.
 * These four are not traces: Al2O3 reaches 26.6 % by mass in the lunar
 * subset, and the Na D doublet at 589 nm and the K doublet at 766 and
 * 770 nm are among the strongest lines of any LIBS spectrum. An
 * unexplained peak means nothing while the catalogue is incomplete.
 * See `internals/libs/08-V1B-PROTOCOL.md` section 3 and
 * `internals/libs/10-CATALOGUE-EXTENSION.md`.
 *
 * Mn, P and Cr are left out on purpose, not by oversight: MnO and P2O5
 * sit at 0.1 to 0.2 % and Cr2O3 at 0.1 % in those compositions, and
 * their lines are weak at those levels.
 */
const SPECIES = [
    { element: "C", ionisation: 0, dir: "c1", asdName: "C I" },
    { element: "C", ionisation: 1, dir: "c2", asdName: "C II" },
    { element: "C", ionisation: 2, dir: "c3", asdName: "C III" },
    { element: "O", ionisation: 0, dir: "o1", asdName: "O I" },
    { element: "O", ionisation: 1, dir: "o2", asdName: "O II" },
    { element: "O", ionisation: 2, dir: "o3", asdName: "O III" },
    { element: "F", ionisation: 0, dir: "f1", asdName: "F I" },
    { element: "F", ionisation: 1, dir: "f2", asdName: "F II" },
    { element: "F", ionisation: 2, dir: "f3", asdName: "F III" },
    { element: "Na", ionisation: 0, dir: "na1", asdName: "Na I" },
    { element: "Na", ionisation: 1, dir: "na2", asdName: "Na II" },
    { element: "Na", ionisation: 2, dir: "na3", asdName: "Na III" },
    { element: "Mg", ionisation: 0, dir: "mg1", asdName: "Mg I" },
    { element: "Mg", ionisation: 1, dir: "mg2", asdName: "Mg II" },
    { element: "Mg", ionisation: 2, dir: "mg3", asdName: "Mg III" },
    { element: "Al", ionisation: 0, dir: "al1", asdName: "Al I" },
    { element: "Al", ionisation: 1, dir: "al2", asdName: "Al II" },
    { element: "Al", ionisation: 2, dir: "al3", asdName: "Al III" },
    { element: "Si", ionisation: 0, dir: "si1", asdName: "Si I" },
    { element: "Si", ionisation: 1, dir: "si2", asdName: "Si II" },
    { element: "Si", ionisation: 2, dir: "si3", asdName: "Si III" },
    { element: "S", ionisation: 0, dir: "s1", asdName: "S I" },
    { element: "S", ionisation: 1, dir: "s2", asdName: "S II" },
    { element: "S", ionisation: 2, dir: "s3", asdName: "S III" },
    { element: "K", ionisation: 0, dir: "k1", asdName: "K I" },
    { element: "K", ionisation: 1, dir: "k2", asdName: "K II" },
    { element: "K", ionisation: 2, dir: "k3", asdName: "K III" },
    { element: "Ca", ionisation: 0, dir: "ca1", asdName: "Ca I" },
    { element: "Ca", ionisation: 1, dir: "ca2", asdName: "Ca II" },
    { element: "Ca", ionisation: 2, dir: "ca3", asdName: "Ca III" },
    { element: "Ti", ionisation: 0, dir: "ti1", asdName: "Ti I" },
    { element: "Ti", ionisation: 1, dir: "ti2", asdName: "Ti II" },
    { element: "Ti", ionisation: 2, dir: "ti3", asdName: "Ti III" },
    { element: "Fe", ionisation: 0, dir: "fe1", asdName: "Fe I" },
    { element: "Fe", ionisation: 1, dir: "fe2", asdName: "Fe II" },
    { element: "Fe", ionisation: 2, dir: "fe3", asdName: "Fe III" },
];

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

const PROVENANCE = "NIST ASD 5.12, downloaded 2026-10-19";

/**
 * Per-line collisional (Stark) widths, the second input of this build.
 *
 * `internals/libs/data/stark/fit-lines-stark-widths.tsv` holds one row
 * per line of the V1-B fit, with the width already normalised to one
 * electron density, the temperature it was measured at, and which of
 * the two sources it came from. Everything behind it, including why
 * only these lines have one and what the other fifteen thousand do
 * instead, is in `internals/libs/15-STARK-COEFFICIENTS.md`.
 *
 * Three rules, and each one exists because its absence would be a
 * silent error rather than a loud one:
 *
 *   1. A row that matches no catalogue line is a BUILD ERROR. The two
 *      wavelength scales are the reviews' and NIST's; on the lines
 *      checked they agree to better than 5 pm, so 10 pm of tolerance is
 *      generous and a miss means the row is wrong, not merely unlucky.
 *   2. A row that matches more than one line is a build error too, for
 *      the same reason in the other direction.
 *   3. The MULTIPLET GUARD. Two lines of one multiplet differ in width
 *      by far less than the accuracy of either number, so a width
 *      measured on one of them applies to its partners. Without this,
 *      two neighbouring lines of the same multiplet could sit on
 *      different tiers and differ by more than physics allows, which
 *      would be an artefact of who measured what.
 */
const STARK_TSV = join(sourceDir, "stark", "fit-lines-stark-widths.tsv");
const STARK_MATCH_TOLERANCE_NM = 0.01;
const STARK_REFERENCE_ELECTRON_DENSITY_CM3 = 1e17;

/** Multiplet key of one row of a NIST lines export: the two terms. */
function multipletKeyOf(header, cells) {
    const at = (name) => {
        const i = header.indexOf(name);
        return i < 0 ? "" : String(cells[i] ?? "").replaceAll('"', "").trim();
    };
    const lower = `${at("conf_i")} ${at("term_i")}`.trim();
    const upper = `${at("conf_k")} ${at("term_k")}`.trim();
    return lower && upper ? `${lower} -> ${upper}` : null;
}

/**
 * Wavelength to multiplet key, for one species, read from the same
 * export the lines were parsed from. The configurations and terms are
 * not carried into the catalogue: they are needed here, at build time,
 * and nowhere else.
 */
function multipletsOf(text) {
    const rows = text.split(/\r?\n/).filter((l) => l.length > 0);
    if (rows.length < 2) return [];
    const header = rows[0].split("\t").map((h) => h.replaceAll('"', "").trim());
    const out = [];
    for (const row of rows.slice(1)) {
        const cells = row.split("\t");
        const obs = String(cells[header.indexOf("obs_wl_air(nm)")] ?? "").replaceAll('"', "").trim();
        const ritz = String(cells[header.indexOf("ritz_wl_air(nm)")] ?? "").replaceAll('"', "").trim();
        const nm = Number(obs || ritz);
        if (!Number.isFinite(nm)) continue;
        const key = multipletKeyOf(header, cells);
        if (key) out.push({ nm, key });
    }
    return out;
}

/** The rows of the Stark table, grouped by species. */
function readStarkTable() {
    let text;
    try {
        text = readFileSync(STARK_TSV, "utf8");
    } catch {
        return null;
    }
    const rows = text
        .split(/\r?\n/)
        .filter((l) => l.length > 0 && !l.startsWith("#"));
    const header = rows[0].split("\t");
    const col = (name) => header.indexOf(name);
    const iLine = col("line_nm");
    const iSpecies = col("species");
    const iWidth = col("measured_fwhm_pm");
    const iTemp = col("measured_T_K");
    const iSource = col("source");
    const iScp = col("scp_fwhm_pm");
    if (iLine < 0 || iSpecies < 0 || iWidth < 0) throw new Error(`${STARK_TSV}: missing a required column`);

    // An empty cell is an ABSENT value, not a zero. `Number("")` is 0,
    // which would have given Si I 263.128 and O I 844.68, the two lines
    // no source covers, a collisional width of exactly nothing instead
    // of no collisional width at all. The difference matters: a zero is
    // a Lorentzian of no width, while an absence falls back to the
    // global coefficient.
    const num = (cell) => {
        const t = String(cell ?? "").trim();
        if (t.length === 0) return null;
        const v = Number(t);
        return Number.isFinite(v) ? v : null;
    };

    const bySpecies = new Map();
    for (const row of rows.slice(1)) {
        const c = row.split("\t");
        const nm = num(c[iLine]);
        if (nm === null) continue;
        const measured = num(c[iWidth]);
        const scp = iScp < 0 ? null : num(c[iScp]);
        // Tier 1 is the measurement; tier 2 is the published
        // calculation, used only where no measurement exists.
        const widthPm = measured ?? scp;
        if (widthPm === null || !(widthPm > 0)) continue;
        const tier = measured === null ? "calculated" : "measured";
        const species = String(c[iSpecies]).trim();
        if (!bySpecies.has(species)) bySpecies.set(species, []);
        bySpecies.get(species).push({
            nm,
            // The table is in picometres and the catalogue in
            // nanometres: a thousand, not a million. Getting this wrong
            // is silent, because a width a thousand times too small
            // simply looks like a Doppler-only profile.
            widthNm: widthPm / 1000,
            tier,
            temperatureK: iTemp < 0 ? null : num(c[iTemp]),
            source: String(c[iSource] ?? "").trim(),
        });
    }
    return bySpecies;
}

const starkTable = readStarkTable();
const starkReport = [];

const species = [];
const report = [];

for (const s of SPECIES) {
    const linesPath = join(sourceDir, "nist-lines", s.dir, "lines.tsv");
    const levelsPath = join(sourceDir, "nist-levels", s.dir, "levels.tsv");
    const linesRaw = readFileSync(linesPath);
    const levelsRaw = readFileSync(levelsPath);

    const parsedLines = parser.parseNistLines(linesRaw.toString("utf8"), s.element, s.ionisation, `${PROVENANCE}, ${s.asdName}`);
    const parsedLevels = parser.parseNistLevels(levelsRaw.toString("utf8"));

    // Compact rows: wavelength, A_ki, E_k, g_k, E_i, g_i. A thousand
    // lines as objects would be a megabyte of repeated key names.
    const rows = parsedLines.lines.map((l) => [
        l.wavelengthNm,
        l.transitionProbability,
        l.upperLevelEnergyEv,
        l.upperLevelWeight,
        l.lowerLevelEnergyEv ?? null,
        l.lowerLevelWeight ?? null,
    ]);
    const levels = parsedLevels.levels.map((l) => [l.energyEv, l.weight]);

    // The per-line collisional widths of this species, joined onto the
    // rows above and spread across each multiplet. See the three rules
    // at the head of this file.
    const starkWidths = [];
    const starkRows = starkTable?.get(s.asdName) ?? [];
    if (starkRows.length > 0) {
        const multiplets = multipletsOf(linesRaw.toString("utf8"));
        const keyAt = (nm) => {
            let best = null;
            for (const m of multiplets) {
                const d = Math.abs(m.nm - nm);
                if (d <= STARK_MATCH_TOLERANCE_NM && (best === null || d < best.d)) best = { d, key: m.key };
            }
            return best?.key ?? null;
        };
        /** wavelength of every catalogue row, for the match. */
        const byMultiplet = new Map();
        let direct = 0;
        for (const r of starkRows) {
            const hits = [];
            for (let k = 0; k < rows.length; k++) {
                if (Math.abs(rows[k][0] - r.nm) <= STARK_MATCH_TOLERANCE_NM) hits.push(k);
            }
            if (hits.length === 0) {
                throw new Error(`${STARK_TSV}: ${s.asdName} ${r.nm} nm matches no catalogue line within ${STARK_MATCH_TOLERANCE_NM} nm`);
            }
            // Several hits are normal and not an ambiguity: ASD lists
            // the J components of one multiplet separately, and Mg I
            // 383.829 has six inside ten picometres. They share an
            // upper and a lower term, so they share a width. What
            // would be an ambiguity is hits from DIFFERENT multiplets,
            // because then the row does not say which one it measured.
            const hitKeys = new Set(hits.map((k) => keyAt(rows[k][0])).filter((k) => k !== null));
            if (hitKeys.size > 1) {
                throw new Error(
                    `${STARK_TSV}: ${s.asdName} ${r.nm} nm matches ${hits.length} catalogue lines from ${hitKeys.size} different multiplets within ${STARK_MATCH_TOLERANCE_NM} nm, so it is ambiguous: ${[...hitKeys].join(" | ")}`
                );
            }
            for (const k of hits) starkWidths.push([rows[k][0], r.widthNm, r.tier, r.temperatureK]);
            direct += hits.length;
            const key = keyAt(r.nm);
            // A measurement outranks a calculation when both reach the
            // same multiplet, and the first measurement wins over the
            // second, the table being ordered.
            if (key && (!byMultiplet.has(key) || (byMultiplet.get(key).tier === "calculated" && r.tier === "measured"))) {
                byMultiplet.set(key, r);
            }
        }
        // The multiplet guard: every other line of a multiplet that
        // already has a width takes it.
        let spread = 0;
        if (byMultiplet.size > 0) {
            const already = new Set(starkWidths.map((w) => w[0]));
            for (const row of rows) {
                if (already.has(row[0])) continue;
                const key = keyAt(row[0]);
                if (!key) continue;
                const donor = byMultiplet.get(key);
                if (!donor) continue;
                starkWidths.push([row[0], donor.widthNm, donor.tier, donor.temperatureK]);
                spread++;
            }
        }
        starkWidths.sort((a, b) => a[0] - b[0]);
        starkReport.push(`${s.asdName}: ${direct} line(s) with a collisional width, ${spread} more by the multiplet guard`);
    }

    species.push({
        element: s.element,
        ionisation: s.ionisation,
        asdName: s.asdName,
        lines: rows,
        levels,
        starkWidths,
        ionisationLimitEv: parsedLevels.ionisationLimitEv,
        source: {
            lines: { file: `nist-lines/${s.dir}/lines.tsv`, bytes: linesRaw.length, sha256: sha256(linesRaw) },
            levels: { file: `nist-levels/${s.dir}/levels.tsv`, bytes: levelsRaw.length, sha256: sha256(levelsRaw) },
        },
        parseReport: parsedLines.report,
        levelsSkipped: parsedLevels.skipped,
    });

    report.push(
        `${s.asdName}: ${parsedLines.report.kept} lines kept, ${parsedLines.report.skippedNoTransitionProbability} without A_ki, ${parsedLines.report.skippedNoUpperLevel} without an upper level, ${parsedLevels.levels.length} levels`
    );
}

const ionisationRaw = readFileSync(join(sourceDir, "nist-ionisation", "ionization-energies.tsv"));
const ionisationEnergies = parser.parseNistIonizationEnergies(ionisationRaw.toString("utf8"));

const catalogue = {
    provenance: {
        database: "NIST Atomic Spectra Database (ASD), NIST Standard Reference Database 78",
        version: "5.12",
        dataUpdate: "November 2024",
        doi: "10.18434/T4W30F",
        downloadedOn: "2026-10-19",
        citation:
            "Kramida, A., Ralchenko, Yu., Reader, J., and NIST ASD Team. NIST Atomic Spectra Database (version 5.12), National Institute of Standards and Technology, Gaithersburg, MD. https://physics.nist.gov/asd",
        wavelengthMedium: "air",
        wavelengthRangeNm: [200, 900],
        linesFilter: "only transitions with a published transition probability (line_out=1)",
        generatedBy: "packages/dev/plugins/spectroscopy/tools/build-nist-catalogue.mjs",
        manifest: "internals/libs/data/MANIFEST.md",
    },
    columns: {
        lines: ["wavelengthNm", "transitionProbability", "upperLevelEnergyEv", "upperLevelWeight", "lowerLevelEnergyEv", "lowerLevelWeight"],
        levels: ["energyEv", "weight"],
        starkWidths: ["wavelengthNm", "collisionalWidthNm", "source", "temperatureK"],
    },
    stark: {
        referenceElectronDensityCm3: STARK_REFERENCE_ELECTRON_DENSITY_CM3,
        widthConvention: "full width at half maximum of the Lorentzian, in nm, scaled linearly with the electron density",
        table: "internals/libs/data/stark/fit-lines-stark-widths.tsv",
        document: "internals/libs/15-STARK-COEFFICIENTS.md",
        tiers: {
            measured: "critically evaluated experiment, Konjevic review series, accuracy 15 to 50 % per line",
            calculated: "STARK-B semiclassical perturbation, stated accuracy 20 to 30 %",
        },
        supportedTemperatureK: [10000, 16000],
    },
    ionisationEnergiesEv: ionisationEnergies,
    ionisationSource: { file: "nist-ionisation/ionization-energies.tsv", bytes: ionisationRaw.length, sha256: sha256(ionisationRaw) },
    species,
};

mkdirSync(dirname(outFile), { recursive: true });
const banner = `/**
 * GENERATED FILE. Do not edit.
 *
 * Produced by tools/build-nist-catalogue.mjs from the NIST ASD exports
 * listed in internals/libs/data/MANIFEST.md. Every number here comes
 * from that download, and the sha256 of each source file is recorded
 * below, so a spectrum can be traced back to it.
 *
 * ${catalogue.provenance.citation}
 */

import type { INistCatalogueRaw } from "./nist.raw.js";

export const NIST_CATALOGUE_RAW: INistCatalogueRaw = `;
writeFileSync(outFile, banner + JSON.stringify(catalogue) + ";" + "\n", "utf8");

const totalLines = species.reduce((n, s) => n + s.lines.length, 0);
console.log(report.join("\n"));
console.log(`ionisation energies: ${Object.keys(ionisationEnergies).length} species`);
const totalStark = species.reduce((n, s) => n + s.starkWidths.length, 0);
if (starkTable === null) {
    console.log(`collisional widths: NONE, ${STARK_TSV} was not found, every line falls back to the global coefficient`);
} else {
    for (const line of starkReport) console.log(line);
    console.log(`collisional widths: ${totalStark} of ${totalLines} lines, stated at ${STARK_REFERENCE_ELECTRON_DENSITY_CM3.toExponential(0)} cm^-3`);
}
console.log(`wrote ${outFile}: ${totalLines} lines, ${Math.round(readFileSync(outFile).length / 1024)} KB`);
