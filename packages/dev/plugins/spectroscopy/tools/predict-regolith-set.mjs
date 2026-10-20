/**
 * V1-C: calibrate on one sample, then predict the others.
 *
 * `08-V1B-PROTOCOL.md` section 8 leaves prediction to V1-C: the global
 * parameters frozen, applied to samples that were not used to fit them.
 * This is that measurement, over the twenty lunar samples LHS-1 was not.
 *
 * What is frozen and what is not, because the split is the whole
 * meaning of the test. The wavelength offset and the instrumental width
 * belong to the INSTRUMENT, so they are frozen from the calibration
 * sample and must work everywhere; the temperature, the amplitude and
 * the continuum belong to the SHOT, and a different matrix ablates
 * differently, so freezing those would be testing something unphysical.
 * The composition is never fitted at all: it is the published analysis,
 * which is what makes this a prediction rather than a description.
 *
 * Two measurements come out of it, and the second is the one that
 * matters.
 *
 * The first is whether the instrument transfers: the offset and width
 * each sample asks for, against what the calibration sample's trend
 * predicts for it. Reported by fitting them rather than by imposing
 * them, which is strictly more informative: imposing them and watching
 * the residual grow says something broke, while measuring them says
 * WHICH parameter moved and by how much. The residual with the
 * calibration imposed is reported too, since that is the prediction in
 * the protocol's own terms.
 *
 * The second is whether the model tracks the composition. The measured
 * intensity ratio of a line of one element to a line of another should
 * follow the ratio the model computes from the published analysis,
 * across samples whose analyses differ. That needs no amplitude, since
 * a ratio cancels it, and no absolute calibration. It is the quantity
 * an inversion would actually rest on.
 *
 * The line pairs are not free choices. `14-SELF-ABSORPTION.md` showed
 * that mixing a ground-state line with a line above 2 eV injects
 * 0.119 dex of systematic, so each pair here is of one depression
 * class, and the pairs are close in wavelength so that the instrument
 * response cancels as well.
 *
 * Usage, from the repository root, with the plugin compiled:
 *
 *     node packages/dev/plugins/spectroscopy/tools/predict-regolith-set.mjs \
 *          <archive.zip> [--calibrate LHS-1] [--condition Earth] [--temperature 9000]
 */

import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { archiveResponse, MOLAR_MASS, openArchive, sampleNames, sampleSpectrum, STAGE_NUMERAL } from "./regolith-archive.mjs";
import { amendedLunarTable } from "./lunar-composition.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, "..");
const repoRoot = resolve(pluginRoot, "../../../..");
const load = (path) => import(pathToFileURL(path).href);

const spectro = {
    ...(await load(join(pluginRoot, "dist/lines/nist.catalogue.js"))),
    ...(await load(join(pluginRoot, "dist/libs/physical.js"))),
    ...(await load(join(pluginRoot, "dist/libs/engine.js"))),
    ...(await load(join(pluginRoot, "dist/libs/window-fit.js"))),
    ...(await load(join(pluginRoot, "dist/libs/boltzmann.js"))),
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
    console.error("Usage: node predict-regolith-set.mjs <archive.zip> [--calibrate LHS-1] [--condition Earth] [--temperature 9000] [--exclude A,B]");
    console.error("The archive is 2.25 GB of CC BY 4.0 data recorded in internals/libs/data/MANIFEST.md, so its path is an argument.");
    process.exit(1);
}
const CALIBRATE = flag("calibrate", "LHS-1");
const CONDITION = flag("condition", "Earth");
const TEMPERATURE = Number(flag("temperature", "9000"));

/**
 * The samples that the ground-truth confrontation of
 * `16-GROUND-TRUTH-UNCERTAINTY.md` found defective can be dropped, so that
 * the composition measurement can be read on the sound subset and set
 * against the whole set. A name is normalised the way that document's tool
 * does it, upper case with the spaces removed and a zero read as the letter
 * O, because the three source files of that data set spell these names
 * three different ways.
 */
const normaliseSampleName = (s) => String(s).toUpperCase().replace(/\s+/g, "").replace(/0/g, "O");
const EXCLUDE = new Set(
    String(flag("exclude", ""))
        .split(",")
        .filter((s) => s.trim().length > 0)
        .map(normaliseSampleName)
);

// From 12-INSTRUMENT-RESPONSE.md and 13-V1B-FIRST-FIT.md.
const TRUSTED_LOW_NM = 260;
const TRUSTED_HIGH_NM = 990;
const WINDOW_HALF_NM = 0.35;
const COLLISIONAL_NM = 0.05;

/**
 * Per-line collisional widths, on by default, off with --global-stark.
 *
 * The flag exists so the gain is ATTRIBUTABLE rather than assumed: the
 * two runs differ in this one thing and in nothing else, so whatever
 * moves between them is this change and not a second edit that came
 * with it. `--global-stark` reproduces the run of
 * `17-V1C-PREDICTION.md` exactly, with every line on the single 50 pm.
 */
const GLOBAL_STARK = argv.includes("--global-stark");

/**
 * Where the catalogue's widths are supported by their sources. Outside
 * it a width is an extrapolation in temperature, and this tool says how
 * many lines it extrapolated rather than doing it silently. The density
 * needs no such flag: every width is stated at 1e17 cm^-3 and the model
 * runs there, so the linear scaling is the identity.
 */
const SUPPORTED_T = spectro.NIST_STARK_PROVENANCE?.supportedTemperatureK ?? [10000, 16000];
const STARK_REFERENCE_NE = spectro.NIST_STARK_PROVENANCE?.referenceElectronDensityCm3 ?? 1e17;
const ELECTRON_DENSITY_CM3 = 1e17;
const PIVOT_NM = 500;

/**
 * The pairs the composition is read from. One depression class each,
 * close in wavelength, and both elements vary across the set.
 */
const PAIRS = [
    { a: { element: "Al", stage: 0, nm: 394.401 }, b: { element: "Ca", stage: 1, nm: 393.366 }, klass: "ground state", note: "1.0 nm apart, so the instrument response cancels" },
    { a: { element: "Mg", stage: 1, nm: 279.553 }, b: { element: "Al", stage: 0, nm: 309.271 }, klass: "ground state", note: "30 nm apart, inside the 3 % response band" },
    { a: { element: "Ca", stage: 1, nm: 396.847 }, b: { element: "Al", stage: 0, nm: 396.152 }, klass: "ground state", note: "0.7 nm apart, the blend the first look flagged" },
];

const table = amendedLunarTable(chemistry);
const data = {
    species: spectro.NIST_SPECIES.map((s) => ({ element: s.element, ionisation: s.ionisation, asdName: s.asdName, lines: s.lines, levels: s.levels })),
    ionisationEnergiesEv: spectro.NIST_IONISATION_ENERGIES_EV,
};

const archive = openArchive(archivePath);
const response = archiveResponse(archive, spectro);
const archiveNames = (() => {
    try {
        return sampleNames(archive, CONDITION, "Moon");
    } catch {
        return [];
    }
})();
/** Fixed by the calibration sample, then used by every other. */
let commonCentres = null;

/**
 * The temperature of one sample, from a Boltzmann plot inside ONE
 * species.
 *
 * The first version of this tool chose it by minimising the window
 * residual, and that was wrong in a way worth recording: the residual
 * is governed by the SHAPE of the strongest line in each window, while
 * the temperature lives in the RATIOS between lines at different upper
 * levels. So the residual barely distinguishes 9 000 K from 14 000 K,
 * the choice came out as noise, and because a cross-element ratio
 * depends on the temperature far more strongly than on the composition
 * (1.42 dex against 0.18 for Al over Ca), that noise then swamped the
 * very signal this test is after.
 *
 * Ca II is the species used: it has the longest lever in these samples,
 * 3.93 eV of upper level energy, and taking one species means the
 * partition function and the ionisation fraction cancel. Only
 * non-resonance lines enter, because `14-SELF-ABSORPTION.md` priced
 * mixing depression classes at 0.119 dex, which is 79 % of M3's whole
 * tolerance.
 */
function fitTemperature(sampleName) {
    const seeded = measure(sampleName, TEMPERATURE);
    if (seeded.blocker) return seeded;

    const points = [];
    for (const w of seeded.windows) {
        for (const line of spectro.NIST_SPECIES.find((sp) => sp.element === "Ca" && sp.ionisation === 1).lines) {
            if (Math.abs(line.wavelengthNm - w.nm) > 0.02) continue;
            // Non-resonance only: one depression class.
            if ((line.lowerLevelEnergyEv ?? 0) < 0.05) continue;
            const area = seeded.areaAt(w.nm);
            if (!Number.isFinite(area) || !(area > 0)) continue;
            points.push({
                wavelengthNm: line.wavelengthNm,
                upperLevelEnergyEv: line.upperLevelEnergyEv,
                lowerLevelEnergyEv: line.lowerLevelEnergyEv,
                upperLevelWeight: line.upperLevelWeight,
                transitionProbability: line.transitionProbability,
                intensity: area,
                relativeUncertainty: 0.25,
            });
        }
    }
    const plot = spectro.boltzmannFit(points);
    if (plot.blocker || !(plot.temperatureK > 3000) || !(plot.temperatureK < 30000)) {
        return { ...seeded, temperatureBlocker: plot.blocker ?? `${plot.temperatureK?.toFixed(0)} K is outside any LIBS plasma`, boltzmann: plot };
    }
    // Re-measure at the temperature its own lines imply.
    const settled = measure(sampleName, Math.round(plot.temperatureK));
    return settled.blocker ? { ...seeded, boltzmann: plot } : { ...settled, boltzmann: plot };
}

/** Everything one sample yields: its windows, its trends, its areas. */
function measure(sampleName, temperatureK = TEMPERATURE) {
    const analysed = table.samples.find((s) => s.name === sampleName);
    if (!analysed) return { sampleName, blocker: "not in the published analysis" };

    // The published table and the archive disagree on three names: the
    // table writes `Na2O- AL` with a stray space and `MgO-Al` in mixed
    // case where the archive has `Na2O-AL` and `MgO-AL`. Normalising
    // recovers three of the twenty-one samples, and the mismatch is
    // the data set's, not ours.
    const normalise = (n) => n.replace(/\s+/g, "").toUpperCase();
    let measured;
    let fileName = sampleName;
    try {
        measured = sampleSpectrum(archive, CONDITION, sampleName, "Moon");
    } catch {
        const match = archiveNames.find((n) => normalise(n) === normalise(sampleName));
        if (!match) return { sampleName, blocker: "no spectrum in the archive under any spelling of this name" };
        fileName = match;
        try {
            measured = sampleSpectrum(archive, CONDITION, match, "Moon");
        } catch (e) {
            return { sampleName, blocker: `no spectrum in the archive: ${e instanceof Error ? e.message : String(e)}` };
        }
    }
    void fileName;
    const corrected = spectro.applyInstrumentResponse({ wavelengthNm: measured.wavelengthNm, values: measured.values }, response);

    const resolved = core.resolveElementalComposition(chemistry.oxideComponents(analysed), "mass");
    const atomFractions = Object.fromEntries(Object.entries(resolved.moleFractions).filter(([, v]) => v > 0));
    const emission = spectro.computePhysicalEmissions(atomFractions, data, temperatureK, ELECTRON_DENSITY_CM3, 1);
    let modelMax = 0;
    for (const i of emission.intensities) modelMax = Math.max(modelMax, i.intensity);

    // The per-line collisional width, scaled from the density it is
    // stated at to the one the model runs at. Both are 1e17 today, so
    // the factor is one, and it is written out because a width without
    // its density is not a width.
    const starkOf = (line) => {
        if (GLOBAL_STARK || line.collisionalWidthNm === undefined) return undefined;
        return line.collisionalWidthNm * (ELECTRON_DENSITY_CM3 / STARK_REFERENCE_NE);
    };
    const asEmission = (i) => ({
        element: i.line.element,
        species: `${i.line.element} ${STAGE_NUMERAL[i.line.ionisation]}`,
        wavelengthNm: i.line.wavelengthNm,
        intensity: i.intensity,
        dopplerFwhmNm: spectro.dopplerFwhmNm(i.line.wavelengthNm, temperatureK, MOLAR_MASS[i.line.element] ?? 0.04),
        collisionalFwhmNm: starkOf(i.line),
        provenance: "model",
    });
    const windowOf = (centreNm) => {
        const index = [];
        for (let k = 0; k < measured.wavelengthNm.length; k++) {
            const nm = measured.wavelengthNm[k];
            if (nm >= centreNm - WINDOW_HALF_NM && nm <= centreNm + WINDOW_HALF_NM) index.push(k);
        }
        const grid = new Float64Array(index.map((k) => measured.wavelengthNm[k]));
        const values = index.map((k) => corrected.values[k]);
        return { grid, values, complete: values.length >= 20 && values.every(Number.isFinite) };
    };

    // The windows are the SAME for every sample, fixed by the
    // calibration sample, because a width averaged over one set of
    // windows cannot be compared with a width averaged over another.
    // Letting each sample pick its own was a confound of this tool's
    // first version and it inflated the width departure.
    const centres =
        commonCentres ??
        (() => {
            const strongest = emission.intensities
                .filter((i) => i.line.wavelengthNm >= TRUSTED_LOW_NM && i.line.wavelengthNm <= TRUSTED_HIGH_NM && i.intensity >= modelMax * 0.005)
                .sort((a, b) => b.intensity - a.intensity);
            const picked = [];
            for (const i of strongest) if (!picked.some((c) => Math.abs(c - i.line.wavelengthNm) < 2 * WINDOW_HALF_NM)) picked.push(i.line.wavelengthNm);
            return picked;
        })();

    const windows = [];
    for (const centreNm of centres) {
        const w = windowOf(centreNm);
        if (!w.complete) continue;
        const lo = centreNm - WINDOW_HALF_NM - 0.2;
        const hi = centreNm + WINDOW_HALF_NM + 0.2;
        const inside = emission.intensities.filter((i) => i.line.wavelengthNm >= lo && i.line.wavelengthNm <= hi && i.intensity >= modelMax * 1e-5);
        if (!inside.length) continue;
        const fit = spectro.fitWindow(w.grid, w.values, inside.map(asEmission), { maxOffsetNm: 0.25, fwhmRangeNm: [0.02, 0.8], collisionalFwhmNm: COLLISIONAL_NM });
        if (fit.blocker) continue;
        windows.push({ nm: centreNm, ...fit });
    }
    if (windows.length < 3) return { sampleName, blocker: `only ${windows.length} window(s) fitted` };

    const offset = spectro.fitLinearTrend(
        windows.map((w) => w.nm),
        windows.map((w) => w.offsetNm),
        PIVOT_NM
    );
    const width = spectro.fitLinearTrend(
        windows.map((w) => w.nm),
        windows.map((w) => w.instrumentalFwhmNm),
        PIVOT_NM
    );

    /** The measured area of one line, above its window's own continuum. */
    const areaAt = (nm) => {
        const w = windowOf(nm);
        if (!w.complete) return NaN;
        const lo = nm - WINDOW_HALF_NM - 0.2;
        const hi = nm + WINDOW_HALF_NM + 0.2;
        const inside = emission.intensities.filter((i) => i.line.wavelengthNm >= lo && i.line.wavelengthNm <= hi && i.intensity >= modelMax * 1e-5);
        if (!inside.length) return NaN;
        const fit = spectro.fitWindow(w.grid, w.values, inside.map(asEmission), { maxOffsetNm: 0.25, fwhmRangeNm: [0.02, 0.8], collisionalFwhmNm: COLLISIONAL_NM });
        if (fit.blocker) return NaN;
        const step = (w.grid[w.grid.length - 1] - w.grid[0]) / (w.grid.length - 1);
        let sum = 0;
        for (const v of w.values) sum += Math.max(0, v - fit.continuum);
        return sum * step;
    };

    /** What the model says that line emits, from the published analysis. */
    const modelAt = (element, stage, nm) => {
        const near = emission.intensities.filter((i) => i.line.element === element && i.line.ionisation === stage && Math.abs(i.line.wavelengthNm - nm) < 0.02);
        return near.reduce((a, i) => a + i.intensity, 0);
    };

    const residual = windows.reduce((a, w) => a + w.residualShareOfPeak, 0) / windows.length;

    // Which tier the fitted windows actually used, and where a width
    // was read outside the temperature its source states. Reported per
    // sample so the gain can be attributed to the lines that moved
    // rather than to the run as a whole.
    let tabulatedIntensity = 0;
    let fallbackIntensity = 0;
    let windowsWithTabulated = 0;
    const extrapolated = new Set();
    for (const centreNm of windows.map((w) => w.nm)) {
        const lo = centreNm - WINDOW_HALF_NM - 0.2;
        const hi = centreNm + WINDOW_HALF_NM + 0.2;
        let any = false;
        for (const i of emission.intensities) {
            if (i.line.wavelengthNm < lo || i.line.wavelengthNm > hi) continue;
            if (i.intensity < modelMax * 1e-5) continue;
            if (starkOf(i.line) === undefined) {
                fallbackIntensity += i.intensity;
                continue;
            }
            tabulatedIntensity += i.intensity;
            any = true;
            if (temperatureK < SUPPORTED_T[0] || temperatureK > SUPPORTED_T[1]) {
                const stated = i.line.collisionalWidthTemperatureK;
                extrapolated.add(`${i.line.element} ${STAGE_NUMERAL[i.line.ionisation]} ${i.line.wavelengthNm.toFixed(3)} stated at ${stated ?? "?"} K`);
            }
        }
        if (any) windowsWithTabulated++;
    }
    const tabulatedShare = tabulatedIntensity + fallbackIntensity > 0 ? tabulatedIntensity / (tabulatedIntensity + fallbackIntensity) : 0;

    return {
        sampleName,
        temperatureK,
        analysed,
        atomFractions,
        windows,
        offset,
        width,
        areaAt,
        modelAt,
        residual,
        stark: { tabulatedShare, windowsWithTabulated, extrapolated: [...extrapolated] },
        blocker: null,
    };
}

// ── calibrate ────────────────────────────────────────────────────────

const calibrationSeed = measure(CALIBRATE);
if (!calibrationSeed.blocker) commonCentres = calibrationSeed.windows.map((w) => w.nm);
const calibration = calibrationSeed.blocker ? calibrationSeed : (fitTemperature(CALIBRATE) ?? calibrationSeed);
if (calibration.blocker) {
    console.error(`cannot calibrate on ${CALIBRATE}: ${calibration.blocker}`);
    process.exit(1);
}
console.log(`V1-C, ${CONDITION} condition, calibrated on ${CALIBRATE}, model at ${TEMPERATURE} K\n`);
if (GLOBAL_STARK) {
    console.log(`collisional width: ONE GLOBAL ${(COLLISIONAL_NM * 1000).toFixed(0)} pm for every line (--global-stark), which is the run 17-V1C-PREDICTION.md records`);
} else {
    const withWidth = spectro.NIST_LINE_CATALOGUE.filter((l) => l.collisionalWidthNm !== undefined);
    const pm = withWidth.map((l) => l.collisionalWidthNm * 1000).sort((a, b) => a - b);
    const range = pm.length ? `${pm[0].toFixed(1)} to ${pm[pm.length - 1].toFixed(1)} pm` : "none";
    console.log(
        `collisional width: PER LINE for ${withWidth.length} catalogue lines, ${range} at ${STARK_REFERENCE_NE.toExponential(0)} cm^-3, the global ${(COLLISIONAL_NM * 1000).toFixed(0)} pm for the rest`
    );
}
console.log("");
console.log(`frozen instrument, from ${CALIBRATE} over ${calibration.windows.length} windows:`);
console.log(`  offset = ${(calibration.offset.constant * 1000).toFixed(1)} pm, slope ${(calibration.offset.slopePerNm * 1e6).toFixed(2)} pm per 1000 nm`);
console.log(`  FWHM   = ${(calibration.width.constant * 1000).toFixed(1)} pm, slope ${(calibration.width.slopePerNm * 1e6).toFixed(1)} pm per 1000 nm`);

const frozenOffsetAt = (nm) => calibration.offset.constant + calibration.offset.slopePerNm * (nm - PIVOT_NM);
const frozenWidthAt = (nm) => calibration.width.constant + calibration.width.slopePerNm * (nm - PIVOT_NM);

// ── predict ──────────────────────────────────────────────────────────

const others = table.samples
    .map((s) => s.name)
    .filter((n) => n !== CALIBRATE && !EXCLUDE.has(normaliseSampleName(n)));
if (EXCLUDE.size > 0) {
    const dropped = table.samples.map((s) => s.name).filter((n) => EXCLUDE.has(normaliseSampleName(n)));
    console.log(`
excluded on the ground truth: ${dropped.length} of ${table.samples.length} samples, ${dropped.join(", ")}`);
    const unknown = [...EXCLUDE].filter((e) => !table.samples.some((s) => normaliseSampleName(s.name) === e));
    if (unknown.length > 0) console.log(`  named but not in the table: ${unknown.join(", ")}`);
}
console.log(`\npredicting ${others.length} samples the instrument was not fitted on\n`);
console.log(
    `${"sample".padEnd(11)} ${"win".padStart(3)} ${"T (K)".padStart(6)} ${"+/- K".padStart(6)} ${"dex".padStart(5)}  ${"offset pm".padStart(9)} ${"vs froz".padStart(8)}  ${"FWHM pm".padStart(7)} ${"vs froz".padStart(8)}`
);

const results = [];
for (const name of others) {
    const m = fitTemperature(name) ?? measure(name);
    if (m.blocker) {
        console.log(`${name.padEnd(11)} ${m.blocker}`);
        continue;
    }
    // Departure of this sample's own trend from the frozen one, read at
    // the middle of the fitted range so one number stands for the band.
    const mid = m.windows.reduce((a, w) => a + w.nm, 0) / m.windows.length;
    const dOffset = m.offset.constant + m.offset.slopePerNm * (mid - PIVOT_NM) - frozenOffsetAt(mid);
    const dWidth = m.width.constant + m.width.slopePerNm * (mid - PIVOT_NM) - frozenWidthAt(mid);
    const resid = m.windows.reduce((a, w) => a + w.residualShareOfPeak, 0) / m.windows.length;
    results.push({ ...m, dOffset, dWidth, resid, mid });
    console.log(
        `${name.padEnd(11)} ${String(m.windows.length).padStart(3)} ${String(m.temperatureK).padStart(6)} ${(m.boltzmann?.temperatureUncertaintyK ?? NaN).toFixed(0).padStart(6)} ${(m.boltzmann?.scatterDex ?? NaN).toFixed(3).padStart(5)}  ` +
            `${(m.offset.constant * 1000).toFixed(1).padStart(9)} ${(dOffset * 1000).toFixed(1).padStart(8)}  ` +
            `${(m.width.constant * 1000).toFixed(1).padStart(7)} ${(dWidth * 1000).toFixed(1).padStart(8)}`
    );
}

// ── does the instrument transfer ─────────────────────────────────────

const quantiles = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    return { median: s[Math.floor(s.length / 2)], worst: s[s.length - 1] };
};
const offsetDeparture = quantiles(results.map((r) => Math.abs(r.dOffset)));
const widthDeparture = quantiles(results.map((r) => Math.abs(r.dWidth)));
console.log(`\ninstrument transfer over ${results.length} samples:`);
console.log(`  offset departs from the frozen trend by ${(offsetDeparture.median * 1000).toFixed(1)} pm at the median, ${(offsetDeparture.worst * 1000).toFixed(1)} pm at worst`);
console.log(
    `  width  departs by ${(widthDeparture.median * 1000).toFixed(1)} pm at the median, ${(widthDeparture.worst * 1000).toFixed(1)} pm at worst, against a width of ${(calibration.width.constant * 1000).toFixed(0)} pm`
);

// ── which tier carried the fit ───────────────────────────────────────

if (!GLOBAL_STARK) {
    const all = [calibration, ...results];
    const share = all.reduce((a, m) => a + (m.stark?.tabulatedShare ?? 0), 0) / all.length;
    const windowsHit = all.reduce((a, m) => a + (m.stark?.windowsWithTabulated ?? 0), 0);
    const windowsAll = all.reduce((a, m) => a + m.windows.length, 0);
    const extrapolating = all.filter((m) => (m.stark?.extrapolated.length ?? 0) > 0);
    console.log("");
    console.log(`collisional width, which tier carried the fit:`);
    console.log(`  ${(share * 100).toFixed(1)} % of the modelled intensity inside the fitted windows used a tabulated per-line width, averaged over samples`);
    console.log(`  ${windowsHit} of ${windowsAll} fitted windows contain at least one line that carries one`);
    if (extrapolating.length === 0) {
        console.log(`  every sample sits inside ${SUPPORTED_T[0]} to ${SUPPORTED_T[1]} K, where the widths are supported: nothing was extrapolated`);
    } else {
        console.log(`  ${extrapolating.length} of ${all.length} samples sit OUTSIDE ${SUPPORTED_T[0]} to ${SUPPORTED_T[1]} K, so their widths are extrapolated in temperature:`);
        for (const m of extrapolating) {
            console.log(`    ${m.sampleName} at ${m.temperatureK} K, ${m.stark.extrapolated.length} line(s), e.g. ${m.stark.extrapolated[0]}`);
        }
    }
}

// ── does the model track the composition ─────────────────────────────

console.log(`\ncomposition tracking, the measurement V1-C rests on:`);
for (const pair of PAIRS) {
    const rows = [];
    for (const m of [calibration, ...results]) {
        const measuredRatio = m.areaAt(pair.a.nm) / m.areaAt(pair.b.nm);
        const predictedRatio = m.modelAt(pair.a.element, pair.a.stage, pair.a.nm) / m.modelAt(pair.b.element, pair.b.stage, pair.b.nm);
        // The composition ratio itself, so the chain can be read in
        // three links rather than two: composition, model, measurement.
        const compositionRatio = (m.atomFractions[pair.a.element] ?? NaN) / (m.atomFractions[pair.b.element] ?? NaN);
        if (!Number.isFinite(measuredRatio) || !Number.isFinite(predictedRatio) || !(measuredRatio > 0) || !(predictedRatio > 0)) continue;
        rows.push({ name: m.sampleName, measuredRatio, predictedRatio, compositionRatio });
    }
    const label = `${pair.a.element} ${STAGE_NUMERAL[pair.a.stage]} ${pair.a.nm} over ${pair.b.element} ${STAGE_NUMERAL[pair.b.stage]} ${pair.b.nm}`;
    if (rows.length < 5) {
        console.log(`\n  ${label}: only ${rows.length} samples measurable, skipped`);
        continue;
    }
    // A straight line through the logarithms: the slope says whether the
    // model tracks the composition, the scatter says how well.
    const x = rows.map((r) => Math.log10(r.predictedRatio));
    const y = rows.map((r) => Math.log10(r.measuredRatio));
    const n = x.length;
    const mx = x.reduce((a, b) => a + b, 0) / n;
    const my = y.reduce((a, b) => a + b, 0) / n;
    let sxy = 0;
    let sxx = 0;
    let syy = 0;
    for (let i = 0; i < n; i++) {
        sxy += (x[i] - mx) * (y[i] - my);
        sxx += (x[i] - mx) ** 2;
        syy += (y[i] - my) ** 2;
    }
    const slope = sxx > 0 ? sxy / sxx : NaN;
    const correlation = sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN;
    const intercept = my - slope * mx;
    let scatter = 0;
    for (let i = 0; i < n; i++) scatter += (y[i] - (intercept + slope * x[i])) ** 2;
    scatter = Math.sqrt(scatter / n);
    const span = Math.max(...x) - Math.min(...x);
    const c = rows.map((r) => Math.log10(r.compositionRatio));
    const compositionSpan = Math.max(...c) - Math.min(...c);
    // Does the model carry the composition through? A model whose
    // intensity ratio is proportional to the atom ratio gives one.
    const mc = c.reduce((a, b) => a + b, 0) / n;
    let scx = 0;
    let scc = 0;
    for (let i = 0; i < n; i++) {
        scx += (c[i] - mc) * (x[i] - mx);
        scc += (c[i] - mc) ** 2;
    }
    const modelOnComposition = scc > 0 ? scx / scc : NaN;

    console.log(`\n  ${label}   (${pair.klass}, ${pair.note})`);
    console.log(`    ${n} samples. The composition ratio spans ${compositionSpan.toFixed(2)} dex, the model's intensity ratio ${span.toFixed(2)} dex`);
    console.log(`    model against composition: slope ${modelOnComposition.toFixed(3)}, where 1.000 means the model carries the composition through unchanged`);
    console.log(`    slope ${slope.toFixed(3)} against the 1.000 a tracking model would give, correlation ${correlation.toFixed(3)}, scatter ${scatter.toFixed(3)} dex`);
    const offsetDex = rows.reduce((a, r) => a + Math.log10(r.measuredRatio / r.predictedRatio), 0) / n;
    console.log(`    measured over predicted: ${Math.pow(10, offsetDex).toFixed(3)} on average, a constant factor the model does not claim to fix`);
}

archive.close();
