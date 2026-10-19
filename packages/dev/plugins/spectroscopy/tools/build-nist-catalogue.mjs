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
 * The nine species downloaded, with the directory name each one uses.
 *
 * Three stages per element, not two: at 11 605 K, nine per cent of
 * calcium is already doubly ionised, and a balance that stops at the
 * first ion puts that nine per cent back into the stages below, which
 * biases every ratio that calcium takes part in. Measured in
 * `internals/libs/07-V1B0-NIST-CROSSCHECK.md`.
 */
const SPECIES = [
    { element: "Ca", ionisation: 0, dir: "ca1", asdName: "Ca I" },
    { element: "Ca", ionisation: 1, dir: "ca2", asdName: "Ca II" },
    { element: "Ca", ionisation: 2, dir: "ca3", asdName: "Ca III" },
    { element: "Fe", ionisation: 0, dir: "fe1", asdName: "Fe I" },
    { element: "Fe", ionisation: 1, dir: "fe2", asdName: "Fe II" },
    { element: "Fe", ionisation: 2, dir: "fe3", asdName: "Fe III" },
    { element: "Si", ionisation: 0, dir: "si1", asdName: "Si I" },
    { element: "Si", ionisation: 1, dir: "si2", asdName: "Si II" },
    { element: "Si", ionisation: 2, dir: "si3", asdName: "Si III" },
];

const sha256 = (buffer) => createHash("sha256").update(buffer).digest("hex");

const PROVENANCE = "NIST ASD 5.12, downloaded 2026-10-19";

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

    species.push({
        element: s.element,
        ionisation: s.ionisation,
        asdName: s.asdName,
        lines: rows,
        levels,
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
console.log(`wrote ${outFile}: ${totalLines} lines, ${Math.round(readFileSync(outFile).length / 1024)} KB`);
