/**
 * Fit one sample of the regolith simulant archive and measure M1 to M5.
 *
 * This is the orchestration the first fit of V1-B left in a session's
 * temporary directory, put where it can be replayed. The physics it
 * calls is all in the plugin and all tested: `fitWindow`,
 * `fitLinearTrend`, `boltzmannFit`, `temperatureFromIonRatio`,
 * `instrumentResponse`, `applyInstrumentResponse`, the self-absorption
 * diagnostic, and `parseOxideTable` on the chemistry side. What lives
 * here is one data set's layout and the protocol's own bookkeeping.
 *
 * Usage, from the repository root, with the plugin compiled:
 *
 *     node packages/dev/plugins/spectroscopy/tools/fit-regolith-sample.mjs \
 *          <archive.zip> [--sample LHS-1] [--condition Earth] [--set Moon] \
 *          [--temperature 9000] [--pairs]
 *
 * The archive is not in this repository: it is 2.25 GB of a CC BY 4.0
 * data set recorded in `internals/libs/data/MANIFEST.md`, so its path
 * is an argument and nothing here is imported by the plugin or by a
 * test.
 *
 * `--pairs` adds the self-absorption reading for every measurable pair
 * on this sample, which is what `internals/libs/14-SELF-ABSORPTION.md`
 * was measured with.
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { archiveResponse, MOLAR_MASS, openArchive, sampleSpectrum, STAGE_NUMERAL } from "./regolith-archive.mjs";
import { amendedLunarTable } from "./lunar-composition.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, "..");
const repoRoot = resolve(pluginRoot, "../../../..");

const load = (path) => import(pathToFileURL(path).href);
const spectro = {
    ...(await load(join(pluginRoot, "dist/lines/nist.catalogue.js"))),
    ...(await load(join(pluginRoot, "dist/libs/physical.js"))),
    ...(await load(join(pluginRoot, "dist/libs/engine.js"))),
    ...(await load(join(pluginRoot, "dist/libs/boltzmann.js"))),
    ...(await load(join(pluginRoot, "dist/libs/window-fit.js"))),
    ...(await load(join(pluginRoot, "dist/libs/self-absorption.js"))),
    ...(await load(join(pluginRoot, "dist/instrument/response.js"))),
};
const chemistry = {
    ...(await load(join(repoRoot, "packages/dev/plugins/chemistry/dist/material/oxide-table.js"))),
    ...(await load(join(repoRoot, "packages/dev/plugins/chemistry/dist/material/oxide-amendment.js"))),
};
const core = await load(join(repoRoot, "packages/dev/core/dist/index.js"));

const argv = process.argv.slice(2);
const archivePath = argv.find((a) => !a.startsWith("--"));
const flag = (name, fallback) => {
    const i = argv.indexOf(`--${name}`);
    return i < 0 ? fallback : (argv[i + 1] ?? fallback);
};
if (!archivePath) {
    console.error("Usage: node fit-regolith-sample.mjs <archive.zip> [--sample NAME] [--condition Earth] [--set Moon] [--temperature 9000] [--pairs]");
    process.exit(1);
}

const SAMPLE = flag("sample", "LHS-1");
const CONDITION = flag("condition", "Earth");
const SET = flag("set", "Moon");
const TEMPERATURE = Number(flag("temperature", "9000"));
const WANT_PAIRS = argv.includes("--pairs");

// The band the instrument response can be trusted in, and the floor a
// line has to clear to be worth fitting. Both come from
// `internals/libs/12-INSTRUMENT-RESPONSE.md`.
const TRUSTED_LOW_NM = 260;
const TRUSTED_HIGH_NM = 990;
const WINDOW_HALF_NM = 0.35;
/** Instrument width from the first fit, used to size windows. */
const widthAt = (nm) => 0.0892 + 0.1936 * ((nm - 500) / 1000);

// ── the measurement ──────────────────────────────────────────────────

const archive = openArchive(archivePath);
const response = archiveResponse(archive, spectro);
const measured = sampleSpectrum(archive, CONDITION, SAMPLE, SET);
archive.close();

const corrected = spectro.applyInstrumentResponse({ wavelengthNm: measured.wavelengthNm, values: measured.values }, response);

const table = amendedLunarTable(chemistry);
const analysed = table.samples.find((s) => s.name === SAMPLE);
if (!analysed) {
    console.error(`${SAMPLE} is not in the lunar composition table, so its composition is unknown and nothing can be fitted against it`);
    process.exit(1);
}
const resolved = core.resolveElementalComposition(chemistry.oxideComponents(analysed), "mass");
const atomFractions = Object.fromEntries(Object.entries(resolved.moleFractions).filter(([, v]) => v > 0));

console.log(`${SAMPLE}, ${CONDITION} condition, ${SET} set`);
console.log(`  published analysis sums to ${analysed.publishedTotalWeightPercent.toFixed(1)} wt %`);
console.log(
    `  atom fractions: ${Object.entries(atomFractions)
        .sort((a, b) => b[1] - a[1])
        .map(([e, v]) => `${e} ${(v * 100).toFixed(1)}`)
        .join("  ")}`
);
console.log(`  ${measured.wavelengthNm.length} points, response-corrected on ${corrected.values.filter(Number.isFinite).length}`);

const data = {
    species: spectro.NIST_SPECIES.map((s) => ({ element: s.element, ionisation: s.ionisation, asdName: s.asdName, lines: s.lines, levels: s.levels })),
    ionisationEnergiesEv: spectro.NIST_IONISATION_ENERGIES_EV,
};
const emission = spectro.computePhysicalEmissions(atomFractions, data, TEMPERATURE, 1e17, 1);
let modelMax = 0;
for (const i of emission.intensities) modelMax = Math.max(modelMax, i.intensity);
console.log(`  model at ${TEMPERATURE} K: ${emission.intensities.length} lines, missing elements [${emission.missingElements.join(" ")}]`);

/** The measured grid and values inside a window. */
function windowOf(centreNm, halfNm) {
    const index = [];
    for (let k = 0; k < measured.wavelengthNm.length; k++) {
        const nm = measured.wavelengthNm[k];
        if (nm >= centreNm - halfNm && nm <= centreNm + halfNm) index.push(k);
    }
    const grid = new Float64Array(index.map((k) => measured.wavelengthNm[k]));
    const values = index.map((k) => corrected.values[k]);
    return { grid, values, complete: values.length >= 20 && values.every(Number.isFinite) };
}

const asEmission = (i) => ({
    element: i.line.element,
    species: `${i.line.element} ${STAGE_NUMERAL[i.line.ionisation]}`,
    wavelengthNm: i.line.wavelengthNm,
    intensity: i.intensity,
    dopplerFwhmNm: spectro.dopplerFwhmNm(i.line.wavelengthNm, TEMPERATURE, MOLAR_MASS[i.line.element] ?? 0.04),
    provenance: "model",
});

// Window centres: the model's strongest lines, one window each.
const strongest = emission.intensities
    .filter((i) => i.line.wavelengthNm >= TRUSTED_LOW_NM && i.line.wavelengthNm <= TRUSTED_HIGH_NM && i.intensity >= modelMax * 0.005)
    .sort((a, b) => b.intensity - a.intensity);
const centres = [];
for (const i of strongest) if (!centres.some((c) => Math.abs(c.line.wavelengthNm - i.line.wavelengthNm) < 2 * WINDOW_HALF_NM)) centres.push(i);

// The collisional width is global and Lorentzian while the instrument
// is Gaussian, so a scan over every window at once separates them.
function fitAll(collisionalNm) {
    const out = [];
    for (const centre of centres) {
        const { grid, values, complete } = windowOf(centre.line.wavelengthNm, WINDOW_HALF_NM);
        if (!complete) continue;
        const inside = emission.intensities.filter(
            (i) =>
                i.line.wavelengthNm >= centre.line.wavelengthNm - WINDOW_HALF_NM - 0.2 &&
                i.line.wavelengthNm <= centre.line.wavelengthNm + WINDOW_HALF_NM + 0.2 &&
                i.intensity >= modelMax * 1e-5
        );
        if (!inside.length) continue;
        const fit = spectro.fitWindow(grid, values, inside.map(asEmission), { maxOffsetNm: 0.25, fwhmRangeNm: [0.02, 0.8], collisionalFwhmNm: collisionalNm });
        if (fit.blocker) continue;
        const total = inside.reduce((a, i) => a + i.intensity, 0);
        out.push({ centre, fit, grid, values, dominance: centre.intensity / total });
    }
    return out;
}

console.log(`\ncollisional width scan over ${centres.length} windows:`);
let best = { nm: 0, residual: Infinity };
for (const nm of [0, 0.01, 0.02, 0.03, 0.05, 0.08, 0.12]) {
    const windows = fitAll(nm);
    if (!windows.length) continue;
    const residual = windows.reduce((a, w) => a + w.fit.residualShareOfPeak, 0) / windows.length;
    if (residual < best.residual) best = { nm, residual };
    console.log(`  ${String((nm * 1000).toFixed(0)).padStart(4)} pm -> mean residual ${(residual * 100).toFixed(2)} % over ${windows.length} windows`);
}
console.log(`  best ${(best.nm * 1000).toFixed(0)} pm`);

const windows = fitAll(best.nm);
const pivotNm = 500;
const offsetTrend = spectro.fitLinearTrend(
    windows.map((w) => w.centre.line.wavelengthNm),
    windows.map((w) => w.fit.offsetNm),
    pivotNm
);
const widthTrend = spectro.fitLinearTrend(
    windows.map((w) => w.centre.line.wavelengthNm),
    windows.map((w) => w.fit.instrumentalFwhmNm),
    pivotNm
);
const offsets = windows.map((w) => Math.abs(w.fit.offsetNm)).sort((a, b) => a - b);
const medianOffset = offsets[Math.floor(offsets.length / 2)];
const worstOffset = offsets[offsets.length - 1];

console.log(`\nM1, position:`);
console.log(
    `  offset = ${(offsetTrend.constant * 1000).toFixed(1)} pm at ${pivotNm} nm, slope ${(offsetTrend.slopePerNm * 1e6).toFixed(2)} pm per 1000 nm, scatter ${(offsetTrend.rmsResidual * 1000).toFixed(1)} pm`
);
console.log(`  median |offset| ${(medianOffset * 1000).toFixed(1)} pm, worst ${(worstOffset * 1000).toFixed(1)} pm`);
const fwhm = widthTrend.constant;
console.log(`  tolerance: median below FWHM/3 = ${((fwhm * 1000) / 3).toFixed(0)} pm, none beyond 1 FWHM = ${(fwhm * 1000).toFixed(0)} pm`);
console.log(`  ${medianOffset < fwhm / 3 && worstOffset < fwhm ? "PASS" : "FAIL"}`);

console.log(`\nM2, width:`);
console.log(`  FWHM = ${(widthTrend.constant * 1000).toFixed(1)} pm at ${pivotNm} nm, slope ${(widthTrend.slopePerNm * 1e6).toFixed(1)} pm per 1000 nm`);
console.log(`  scatter about that line ${(widthTrend.rmsResidual * 1000).toFixed(1)} pm = ${((widthTrend.rmsResidual / widthTrend.constant) * 100).toFixed(0)} % of the width`);
console.log(`  collisional width ${(best.nm * 1000).toFixed(0)} pm, positive and bounded`);

// ── per-line areas, measured without the model ───────────────────────

/** A line's area above a local continuum, the model not consulted. */
function lineArea(centreNm) {
    const width = widthAt(centreNm);
    const { grid, values, complete } = windowOf(centreNm, 5 * width);
    if (!complete) return NaN;
    const core = 2.5 * width;
    const inner = [];
    const outer = [];
    for (let k = 0; k < grid.length; k++) {
        const d = Math.abs(grid[k] - centreNm);
        if (d <= core) inner.push(values[k]);
        else outer.push(values[k]);
    }
    if (inner.length < 8 || outer.length < 8) return NaN;
    outer.sort((a, b) => a - b);
    const continuum = outer[Math.floor(outer.length / 2)];
    const step = (grid[grid.length - 1] - grid[0]) / (grid.length - 1);
    let area = 0;
    for (const v of inner) area += Math.max(0, v - continuum);
    return area * step;
}

const isolated = windows.filter((w) => w.dominance >= 0.8);
const points = new Map();
for (const w of isolated) {
    const l = w.centre.line;
    const area = lineArea(l.wavelengthNm);
    if (!(area > 0)) continue;
    const species = `${l.element} ${STAGE_NUMERAL[l.ionisation]}`;
    if (!points.has(species)) points.set(species, []);
    points.get(species).push({
        wavelengthNm: l.wavelengthNm,
        upperLevelEnergyEv: l.upperLevelEnergyEv,
        lowerLevelEnergyEv: l.lowerLevelEnergyEv,
        upperLevelWeight: l.upperLevelWeight,
        transitionProbability: l.transitionProbability,
        intensity: area,
        relativeUncertainty: 0.25,
        depthProxy: spectro.opticalDepthProxy(l, TEMPERATURE),
        line: l,
    });
}

console.log(`\nM3, Boltzmann plots. ${isolated.length} of ${windows.length} windows carried by one line to 80 %.`);
console.log(`  the selection rule is 14-SELF-ABSORPTION.md: lines of ALIKE depression, since a`);
console.log(`  uniform depression moves only the unknown intercept and it is the variation that tilts`);
console.log(`  the slope. The proxy spread of a set is what predicts trouble.`);
const temperatures = new Map();
for (const [species, all] of [...points].sort()) {
    if (all.length < 3) {
        console.log(`  ${species.padEnd(7)} ${all.length} isolated line(s): below the three a plot needs`);
        continue;
    }
    const report = (label, set) => {
        if (set.length < 3) {
            console.log(`    ${label.padEnd(26)} ${set.length} line(s), below three`);
            return null;
        }
        const fit = spectro.boltzmannFit(set);
        const proxies = set.map((p) => p.depthProxy).filter((v) => v > 0);
        const spread = proxies.length ? Math.max(...proxies) / Math.min(...proxies) : NaN;
        if (fit.blocker) {
            console.log(`    ${label.padEnd(26)} ${fit.blocker}`);
            return null;
        }
        console.log(
            `    ${label.padEnd(26)} ${String(set.length).padStart(2)} lines, span ${fit.energySpanEv.toFixed(2)} eV, T = ${fit.temperatureK.toFixed(0)} +/- ${fit.temperatureUncertaintyK.toFixed(0)} K, scatter ${fit.scatterDex.toFixed(3)} dex, proxy spread ${spread.toExponential(1)}`
        );
        return fit;
    };
    console.log(`  ${species}:`);
    const everything = report("every isolated line", all);
    const noGround = report(
        "ground-state lines out",
        all.filter((p) => (p.lowerLevelEnergyEv ?? 1) >= 0.05)
    );
    // And the class rule: keep the decade that holds the most lines, so
    // the set is as alike as the data allows.
    const classes = spectro.depressionClasses(
        all.map((p) => p.line),
        TEMPERATURE
    );
    const biggest = classes.reduce((b, c) => (c.lines.length > (b?.lines.length ?? 0) ? c : b), null);
    const oneClass = biggest ? all.filter((p) => biggest.lines.includes(p.line)) : [];
    const classFit = report(`one depth decade (10^${biggest?.decade ?? "?"})`, oneClass);
    temperatures.set(species, { everything, noGround, classFit });
}

// ── M4 ───────────────────────────────────────────────────────────────

console.log(`\nM4, the ionisation balance:`);
const elementsWithBoth = [...new Set([...points.keys()].map((k) => k.split(" ")[0]))].filter((e) => points.has(`${e} I`) && points.has(`${e} II`));
if (!elementsWithBoth.length) {
    console.log(`  no element has isolated lines measured in both stages on this sample, so M4 cannot be measured`);
} else {
    for (const element of elementsWithBoth) {
        const pick = (species) => {
            const list = points.get(species).filter((p) => (p.lowerLevelEnergyEv ?? 1) >= 0.05);
            const pool = list.length ? list : points.get(species);
            return { chosen: pool.reduce((b, p) => (p.intensity > b.intensity ? p : b)), usedResonance: list.length === 0 };
        };
        const ion = pick(`${element} II`);
        const neutral = pick(`${element} I`);
        const ratio = ion.chosen.intensity / neutral.chosen.intensity;
        const predictedAt = (t) => {
            const e = spectro.computePhysicalEmissions(atomFractions, data, t, 1e17, 1);
            const at = (nm) => e.intensities.filter((i) => Math.abs(i.line.wavelengthNm - nm) < 0.01).reduce((a, i) => a + i.intensity, 0);
            return at(ion.chosen.wavelengthNm) / at(neutral.chosen.wavelengthNm);
        };
        const inverted = spectro.temperatureFromIonRatio(ratio, spectro.NIST_IONISATION_ENERGIES_EV[`${element} I`], 1e17, predictedAt);
        console.log(`  ${element}: ${ion.chosen.wavelengthNm.toFixed(3)} over ${neutral.chosen.wavelengthNm.toFixed(3)} = ${ratio.toPrecision(4)}`);
        if (ion.usedResonance || neutral.usedResonance) {
            console.log(`    both or one line starts from the ground state, so both are reabsorbed and the ratio is not interpretable: see 14-SELF-ABSORPTION.md`);
        }
        console.log(`    -> T = ${inverted.blocker ?? `${inverted.temperatureK.toFixed(0)} K`}`);
        const reference = temperatures.get(`${element} II`)?.noGround ?? temperatures.get(`${element} II`)?.everything;
        if (reference && !inverted.blocker) {
            const gap = Math.abs(inverted.temperatureK - reference.temperatureK) / reference.temperatureK;
            console.log(`    against M3's ${reference.temperatureK.toFixed(0)} K: ${(gap * 100).toFixed(0)} % apart, tolerance 20 %, ${gap <= 0.2 ? "PASS" : "FAIL"}`);
        }
    }
}

// ── M5 ───────────────────────────────────────────────────────────────

const free = [];
for (let nm = TRUSTED_LOW_NM + 5; nm < TRUSTED_HIGH_NM - 5; nm += 1) {
    if (emission.intensities.some((i) => Math.abs(i.line.wavelengthNm - nm) < 0.8 && i.intensity >= modelMax * 1e-4)) continue;
    const { values } = windowOf(nm, 0.5);
    const finite = values.filter(Number.isFinite);
    if (finite.length < 20) continue;
    const mean = finite.reduce((a, b) => a + b, 0) / finite.length;
    if (!(mean > 0)) continue;
    free.push({ nm, mean });
}
let peak = 0;
for (const w of windows) for (const v of w.values) if (Number.isFinite(v)) peak = Math.max(peak, v);
const logTrend = spectro.fitLinearTrend(
    free.map((f) => f.nm),
    free.map((f) => Math.log(f.mean)),
    pivotNm
);
let sumSquares = 0;
let worstShare = 0;
for (const f of free) {
    const model = Math.exp(logTrend.constant + logTrend.slopePerNm * (f.nm - pivotNm));
    const residual = Math.abs(f.mean - model);
    sumSquares += residual * residual;
    worstShare = Math.max(worstShare, residual / peak);
}
const rmsShare = Math.sqrt(sumSquares / free.length) / peak;
console.log(`\nM5, continuum over ${free.length} line-free windows of 1 nm:`);
console.log(`  two coefficients: exp(${logTrend.constant.toFixed(3)} + ${logTrend.slopePerNm.toExponential(2)} (lambda - ${pivotNm}))`);
console.log(`  residual rms ${(rmsShare * 100).toFixed(2)} % of the strongest line, worst ${(worstShare * 100).toFixed(2)} %, tolerance 5 %`);
console.log(`  ${worstShare <= 0.05 ? "PASS" : "FAIL"}`);

// ── the self-absorption reading, optional ────────────────────────────

if (WANT_PAIRS) {
    console.log(`\nself-absorption, every measurable pair on this sample:`);
    console.log(`  ${"pair".padEnd(30)} ${"kind".padEnd(10)} ${"pred".padStart(6)} ${"meas".padStart(7)} ${"index".padStart(6)}  note`);
    for (const sp of spectro.NIST_SPECIES) {
        const speciesName = `${sp.element} ${STAGE_NUMERAL[sp.ionisation]}`;
        const pairs = spectro.findLinePairs(sp.lines, { rangeNm: [TRUSTED_LOW_NM, TRUSTED_HIGH_NM] });
        for (const pair of pairs) {
            const predicted = spectro.predictPairRatio(pair, TEMPERATURE);
            if (!(predicted >= 1.2 && predicted <= 8)) continue;
            // Both lines bright enough on this sample and clean over the
            // whole integration window, not just its core.
            const clean = (nm) => {
                const width = widthAt(nm);
                let own = 0;
                let total = 0;
                for (const i of emission.intensities) {
                    const d = Math.abs(i.line.wavelengthNm - nm);
                    if (d > 5 * width) continue;
                    total += i.intensity;
                    if (d < 0.01) own = Math.max(own, i.intensity);
                }
                return own >= modelMax * 0.002 && own >= 0.85 * total;
            };
            if (!clean(pair.strong.wavelengthNm) || !clean(pair.weak.wavelengthNm)) continue;
            const strongArea = lineArea(pair.strong.wavelengthNm);
            const weakArea = lineArea(pair.weak.wavelengthNm);
            if (!(strongArea > 0) || !(weakArea > 0)) continue;
            const reading = spectro.selfAbsorptionIndex(strongArea / weakArea, predicted);
            const label = `${speciesName} ${pair.strong.wavelengthNm.toFixed(3)}/${pair.weak.wavelengthNm.toFixed(3)}`;
            console.log(
                `  ${label.padEnd(30)} ${pair.kind.padEnd(10)} ${predicted.toFixed(3).padStart(6)} ${(strongArea / weakArea).toFixed(3).padStart(7)} ${reading.index.toFixed(3).padStart(6)}  ${reading.blocker ? "REJECTED: above one" : (pair.strong.lowerLevelEnergyEv ?? 1) < 0.05 ? "from the ground state" : ""}`
            );
        }
    }
}
