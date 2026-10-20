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

/**
 * The electron density the model runs at, one value for every sample.
 *
 * It is a GUESS, carried from `11-V1B-FIRST-LOOK.md`, and it was never
 * identifiable before: with one global collisional coefficient, raising
 * the density and raising the instrumental width did the same thing to
 * every line, so the fit could not tell them apart and the frozen
 * density went quietly into the fitted width.
 *
 * Per-line widths break that tie. The density scales each line's
 * Lorentz width by its OWN tabulated amount, spanning a factor 26,
 * while the instrument adds one Gaussian common to all of them. The two
 * now leave different marks, which `--scan-density` measures.
 */
const ELECTRON_DENSITY_CM3 = Number(flag("electron-density", "1e17"));
const SCAN_DENSITY = argv.includes("--scan-density");
const DUMP_WINDOWS = argv.includes("--dump-windows");

/**
 * Drop the windows whose fitted width is not a measurement of the
 * instrument, and fit the trends on the rest.
 *
 * Two rules, each with its own signature in the data rather than a
 * list of wavelengths:
 *
 *   1. A window whose fitted width lands on the solver's floor. The fit
 *      did not choose a width, it ran out of room: the model's own
 *      profile is already wider than the measured feature, which on
 *      LHS-1 happens on exactly the two lines carrying the largest
 *      tabulated Stark widths, 270 and 200 pm.
 *   2. A window whose strongest line sits deep in its own absorbers. A
 *      self-absorbed line is flat-topped and fits as a broad Gaussian,
 *      so its fitted width is a reading of the absorption and not of
 *      the slit. Over LHS-1's 22 windows the fitted width and the
 *      absorber depth rank together at Spearman 0.72.
 */
const CLEAN_WINDOWS = argv.includes("--clean-windows");

/**
 * Swap the free parameter: freeze the instrument and free the plasma.
 *
 * The run this tool was built for lets a Gaussian width float per
 * sample and calls it the instrument. That quantity varies by a factor
 * two across one instrument, which an instrument cannot do, and the two
 * twinned pairs show why: LHS-1D and LMS-1D are the sieved fine
 * fractions of LHS-1 and LMS-1, carry their parents' analyses oxide for
 * oxide, and come out 61 and 71 per cent wider. Same composition, same
 * instrument, different grain size, different width. So the quantity is
 * a property of the shot.
 *
 * With --free-density the instrumental width is pinned to the trend
 * LHS-1 gives and the electron density is scanned per sample instead.
 * The density is a physical parameter of the plume, it is the one the
 * model already declares and then freezes at a guess, and it moves the
 * line widths through the tabulated Stark coefficients rather than
 * through a slit that cannot change.
 */
const FREE_DENSITY = argv.includes("--free-density");
const WIDTH_DEPTH = argv.includes("--width-depth");

/**
 * The instrument as `20-INSTRUMENT-WIDTH.md` measured it, on the eleven
 * windows of LHS-1 where the model is sound: no window sitting on the
 * solver floor, no self-absorbed line, and not the 315 to 374 nm band
 * that carries its own calibration. It is nearly flat, against the
 * 89.2 pm and 193.6 pm per 1000 nm the protocol declared, which that
 * document showed was a straight line fitted through two self-absorbed
 * Ca II infrared lines.
 */
const CLEAN_INSTRUMENT_PM = Number(flag("clean-instrument-pm", "67.9"));
const CLEAN_INSTRUMENT_SLOPE_PM = Number(flag("clean-instrument-slope-pm", "46.7"));
const DENSITY_GRID = [1e16, 2e16, 3e16, 5e16, 7e16, 1e17, 1.5e17, 2e17, 3e17];
const FLOOR_FWHM_NM = 0.005;
const DEPTH_LIMIT = Number(flag("depth-limit", "0.1"));
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
let pinnedWidthAt = undefined;

function measure(sampleName, temperatureK = TEMPERATURE, electronDensityCm3 = ELECTRON_DENSITY_CM3) {
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
    const emission = spectro.computePhysicalEmissions(atomFractions, data, temperatureK, electronDensityCm3, 1);
    let modelMax = 0;
    for (const i of emission.intensities) modelMax = Math.max(modelMax, i.intensity);

    // The per-line collisional width, scaled from the density it is
    // stated at to the one the model runs at. Both are 1e17 today, so
    // the factor is one, and it is written out because a width without
    // its density is not a width.
    const starkOf = (line) => {
        if (GLOBAL_STARK || line.collisionalWidthNm === undefined) return undefined;
        return line.collisionalWidthNm * (electronDensityCm3 / STARK_REFERENCE_NE);
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
        const pinned = pinnedWidthAt?.(centreNm);
        const range = pinned === undefined ? [0.02, 0.8] : [Math.max(1e-4, pinned * 0.999), pinned * 1.001];
        const fit = spectro.fitWindow(w.grid, w.values, inside.map(asEmission), { maxOffsetNm: 0.25, fwhmRangeNm: range, collisionalFwhmNm: COLLISIONAL_NM });
        if (fit.blocker) continue;
        windows.push({ nm: centreNm, ...fit });
    }
    if (windows.length < 3) return { sampleName, blocker: `only ${windows.length} window(s) fitted` };

    // Which windows the instrument trends are allowed to rest on.
    const depthAt = (centreNm) => {
        let v = 0;
        for (const i of emission.intensities) {
            if (Math.abs(i.line.wavelengthNm - centreNm) > 0.02) continue;
            const proxy = spectro.opticalDepthProxy(i.line, temperatureK);
            if (Number.isFinite(proxy)) v = Math.max(v, proxy * (atomFractions[i.line.element] ?? 0) * i.speciesFraction);
        }
        return v;
    };
    const depths = windows.map((w) => depthAt(w.nm));
    const deepest = Math.max(...depths, 0);
    const refused = [];
    const trendWindows = CLEAN_WINDOWS
        ? windows.filter((w, k) => {
              if (!(w.instrumentalFwhmNm > FLOOR_FWHM_NM)) {
                  refused.push(`${w.nm.toFixed(2)} at the solver floor`);
                  return false;
              }
              if (deepest > 0 && depths[k] / deepest > DEPTH_LIMIT) {
                  refused.push(`${w.nm.toFixed(2)} depth ${(depths[k] / deepest).toFixed(2)}`);
                  return false;
              }
              return true;
          })
        : windows;
    if (trendWindows.length < 3) return { sampleName, blocker: `only ${trendWindows.length} window(s) left after the clean-window rules` };

    const offset = spectro.fitLinearTrend(
        trendWindows.map((w) => w.nm),
        trendWindows.map((w) => w.offsetNm),
        PIVOT_NM
    );
    const width = spectro.fitLinearTrend(
        trendWindows.map((w) => w.nm),
        trendWindows.map((w) => w.instrumentalFwhmNm),
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

    /** Share of an element sitting in one ionisation stage, as the
     *  Saha balance of this sample put it. */
    const speciesFractionOf = (element, ionisation) => {
        for (const i of emission.intensities) if (i.line.element === element && i.line.ionisation === ionisation) return i.speciesFraction;
        return 0;
    };

    /** The modelled emissions, for a caller that needs the lines. */
    const emissionsOf = () => emission.intensities;

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
        electronDensityCm3,
        analysed,
        atomFractions,
        windows,
        trendWindows,
        refused,
        offset,
        width,
        areaAt,
        modelAt,
        speciesFractionOf,
        emissionsOf,
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
if (CLEAN_WINDOWS) {
    console.log(
        `clean windows only: a window is dropped when its fitted width lands on the solver floor, or when its strongest line sits above ${DEPTH_LIMIT} of the deepest absorber depth in that sample`
    );
}
console.log(`frozen instrument, from ${CALIBRATE} over ${calibration.trendWindows.length} of ${calibration.windows.length} windows:`);
if (CLEAN_WINDOWS && calibration.refused.length > 0) console.log(`  dropped: ${calibration.refused.join(", ")}`);
console.log(`  offset = ${(calibration.offset.constant * 1000).toFixed(1)} pm, slope ${(calibration.offset.slopePerNm * 1e6).toFixed(2)} pm per 1000 nm`);
console.log(`  FWHM   = ${(calibration.width.constant * 1000).toFixed(1)} pm, slope ${(calibration.width.slopePerNm * 1e6).toFixed(1)} pm per 1000 nm`);

const frozenOffsetAt = (nm) => calibration.offset.constant + calibration.offset.slopePerNm * (nm - PIVOT_NM);
const frozenWidthAt = (nm) => calibration.width.constant + calibration.width.slopePerNm * (nm - PIVOT_NM);

/**
 * How deeply one line sits in its own absorbers, for this sample.
 *
 * `opticalDepthProxy` gives the part that belongs to the transition,
 * lambda^4 g_k A_ki exp(-E_i / kT), and says in its own header that
 * what it leaves out is the column density of the species. Two thirds
 * of that is known here, the element's atom fraction and the share of
 * it sitting in this ionisation stage, and the third, how much material
 * the pulse removed, is common to every line of one spectrum and so
 * cancels in a ranking.
 *
 * Al I 394.401 is why the ionisation share cannot be dropped: it is a
 * resonance line of an element at 11 % by atom and it is NOT depressed,
 * because at 12 900 K almost no aluminium is still neutral. Ca II
 * 393.366 is a resonance line of an element at 4.9 % and it is the most
 * depressed line in the spectrum, because almost all the calcium IS
 * singly ionised. Ground state alone gets that backwards.
 */
function absorberDepthOf(line, m) {
    const proxy = spectro.opticalDepthProxy(line, m.temperatureK);
    if (!Number.isFinite(proxy)) return 0;
    const atom = m.atomFractions[line.element] ?? 0;
    const share = m.speciesFractionOf?.(line.element, line.ionisation) ?? 1;
    return proxy * atom * share;
}

// ── what shape is the instrumental width? ────────────────────────────

/**
 * Print every fitted window of the calibration sample and stop.
 *
 * The declared width model is a straight line in wavelength, and
 * `13-V1B-FIRST-FIT.md` measured 36 % of scatter about it without being
 * able to say whether the line was the wrong shape or the collisional
 * width was polluting it. The collisional width is now per line and the
 * scatter has not moved, so what is left is the shape, and the shape is
 * only readable window by window.
 */
if (DUMP_WINDOWS) {
    const m = calibration;
    console.log("");
    console.log(`every fitted window of ${m.sampleName} at ${m.temperatureK} K, Ne ${m.electronDensityCm3.toExponential(1)} cm^-3, ${GLOBAL_STARK ? "global 50 pm" : "per-line widths"}`);
    const modelPeak = Math.max(
        ...m.windows.map((w) => {
            let v = 0;
            for (const sp of spectro.NIST_SPECIES) for (const l of sp.lines) if (Math.abs(l.wavelengthNm - w.nm) <= 0.02) v = Math.max(v, m.modelAt(sp.element, sp.ionisation, l.wavelengthNm));
            return v;
        })
    );
    const depthPeak = Math.max(
        ...m.windows.map((w) => {
            let v = 0;
            for (const sp of spectro.NIST_SPECIES) for (const l of sp.lines) if (Math.abs(l.wavelengthNm - w.nm) <= 0.02) v = Math.max(v, absorberDepthOf(l, m));
            return v;
        })
    );
    console.log(`${"nm".padStart(8)} ${"FWHM pm".padStart(8)} ${"vs trend".padStart(9)} ${"offset pm".padStart(9)} ${"resid %".padStart(8)} ${"E_low eV".padStart(8)} ${"depth".padStart(9)}  strongest line`);
    for (const w of [...m.windows].sort((a, b) => a.nm - b.nm)) {
        const trend = m.width.constant + m.width.slopePerNm * (w.nm - PIVOT_NM);
        const species = (() => {
            let best = null;
            for (const sp of spectro.NIST_SPECIES) {
                for (const l of sp.lines) {
                    if (Math.abs(l.wavelengthNm - w.nm) > 0.02) continue;
                    if (best === null || (l.transitionProbability ?? 0) * (l.upperLevelWeight ?? 0) > best.strength) {
                        best = {
                            label: `${sp.element} ${STAGE_NUMERAL[sp.ionisation]} ${l.wavelengthNm.toFixed(3)}`,
                            strength: (l.transitionProbability ?? 0) * (l.upperLevelWeight ?? 0),
                            width: l.collisionalWidthNm,
                            lowerEv: l.lowerLevelEnergyEv ?? 0,
                            modelled: m.modelAt(sp.element, sp.ionisation, l.wavelengthNm),
                            depth: absorberDepthOf(l, m),
                        };
                    }
                }
            }
            return best;
        })();
        console.log(
            `${w.nm.toFixed(2).padStart(8)} ${(w.instrumentalFwhmNm * 1000).toFixed(1).padStart(8)} ${((w.instrumentalFwhmNm - trend) * 1000).toFixed(1).padStart(9)} ` +
                `${(w.offsetNm * 1000).toFixed(1).padStart(9)} ${(w.residualShareOfPeak * 100).toFixed(2).padStart(8)} ` +
                `${(species?.lowerEv ?? 0).toFixed(3).padStart(8)} ${((species?.depth ?? 0) / depthPeak).toExponential(2).padStart(9)}  ` +
                `${species ? species.label : "?"}${species?.width !== undefined ? ` (Stark ${(species.width * 1000).toFixed(1)} pm)` : ""}`
        );
    }
    console.log("");
    console.log(`  the declared model: ${(m.width.constant * 1000).toFixed(1)} pm at ${PIVOT_NM} nm, slope ${(m.width.slopePerNm * 1e6).toFixed(0)} pm per 1000 nm, scatter ${(m.width.rmsResidual * 1000).toFixed(1)} pm`);
    process.exit(0);
}

// ── is the electron density separable from the instrument? ───────────

/**
 * Scan the electron density on the calibration sample and stop.
 *
 * The question this answers is not what the density is but whether the
 * spectrum can tell. With one global collisional coefficient it cannot:
 * the density multiplies every line's Lorentz width by the same factor
 * and so does nothing the instrumental width cannot undo, which makes
 * the residual flat in the density and the frozen 1e17 a free parameter
 * hiding inside the fitted width.
 *
 * With per-line widths the two act differently. The density stretches a
 * distribution that already spans a factor 26 between lines; the
 * instrument adds one Gaussian to all of them. Run this with and
 * without --global-stark and the difference between the two residual
 * curves IS the separability.
 */
if (SCAN_DENSITY) {
    const grid = [1e16, 2e16, 3e16, 5e16, 7e16, 1e17, 1.5e17, 2e17, 3e17, 5e17, 1e18];
    console.log("");
    console.log(`electron density scan on ${CALIBRATE} at ${calibration.temperatureK} K, ${GLOBAL_STARK ? "ONE GLOBAL 50 pm" : "per-line widths"}`);
    console.log(`${"Ne (cm^-3)".padStart(11)} ${"win".padStart(3)} ${"residual %".padStart(10)} ${"FWHM pm".padStart(8)} ${"slope".padStart(8)} ${"scatter pm".padStart(10)} ${"scatter %".padStart(9)}`);
    const rows = [];
    for (const ne of grid) {
        const m = measure(CALIBRATE, calibration.temperatureK, ne);
        if (m.blocker) {
            console.log(`${ne.toExponential(1).padStart(11)} ${m.blocker}`);
            continue;
        }
        const resid = m.windows.reduce((a, w) => a + w.residualShareOfPeak, 0) / m.windows.length;
        const scatterShare = m.width.rmsResidual / m.width.constant;
        rows.push({ ne, resid, m, scatterShare });
        console.log(
            `${ne.toExponential(1).padStart(11)} ${String(m.windows.length).padStart(3)} ${(resid * 100).toFixed(3).padStart(10)} ${(m.width.constant * 1000).toFixed(1).padStart(8)} ` +
                `${(m.width.slopePerNm * 1e6).toFixed(0).padStart(8)} ${(m.width.rmsResidual * 1000).toFixed(1).padStart(10)} ${(scatterShare * 100).toFixed(1).padStart(9)}`
        );
    }
    if (rows.length > 2) {
        const best = rows.reduce((a, b) => (b.resid < a.resid ? b : a));
        const worst = rows.reduce((a, b) => (b.resid > a.resid ? b : a));
        const flat = rows.reduce((a, b) => (b.resid < a.resid ? b : a)).resid;
        console.log("");
        console.log(`  best residual at Ne = ${best.ne.toExponential(1)} cm^-3, ${(best.resid * 100).toFixed(3)} %`);
        console.log(`  the residual moves by ${(((worst.resid - flat) / flat) * 100).toFixed(1)} % of itself across the whole grid`);
        console.log(`  width at that density: ${(best.m.width.constant * 1000).toFixed(1)} pm, scatter ${(best.m.width.rmsResidual * 1000).toFixed(1)} pm, ${(best.scatterShare * 100).toFixed(1)} %`);
        const bestScatter = rows.reduce((a, b) => (b.scatterShare < a.scatterShare ? b : a));
        console.log(`  the width trend is tidiest at Ne = ${bestScatter.ne.toExponential(1)} cm^-3, scatter ${(bestScatter.scatterShare * 100).toFixed(1)} %`);
    }
    process.exit(0);
}

// ── the optical depth, read from the width ───────────────────────────

/**
 * Full width at half maximum of a line seen through a uniform slab.
 *
 * The slab emits `S (1 - exp(-tau0 phi_hat))`, with `phi_hat` the
 * profile normalised to one at its centre, so the core saturates
 * before the wings and the line broadens as it is depressed. The
 * factor turns out to depend almost only on tau0 and hardly at all on
 * the profile it is applied to: 1.271 against 1.279 at tau0 = 1 for a
 * 20 pm and an 88 pm Lorentz width. That is what makes the inversion
 * below worth doing.
 */
function slabFwhmNm(gaussNm, lorentzNm, tau0) {
    const total = spectro.pseudoVoigtFwhm(gaussNm, lorentzNm);
    if (!(total > 0)) return 0;
    const span = 40 * total;
    const n = 4001;
    const step = span / (n - 1);
    const peak = spectro.pseudoVoigt(0, gaussNm, lorentzNm);
    let maxValue = 0;
    const y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
        const phi = spectro.pseudoVoigt(-span / 2 + i * step, gaussNm, lorentzNm) / peak;
        y[i] = tau0 > 0 ? 1 - Math.exp(-tau0 * phi) : phi;
        if (y[i] > maxValue) maxValue = y[i];
    }
    let first = -1;
    let last = -1;
    for (let i = 0; i < n; i++) if (y[i] >= maxValue / 2) { if (first < 0) first = i; last = i; }
    return first < 0 ? 0 : (last - first) * step;
}

/** The tau0 whose slab broadening reproduces an observed total width. */
function tauFromWidth(gaussNm, lorentzNm, observedTotalNm) {
    if (!(observedTotalNm > slabFwhmNm(gaussNm, lorentzNm, 0))) return 0;
    let low = 0;
    let high = 200;
    if (slabFwhmNm(gaussNm, lorentzNm, high) < observedTotalNm) return Number.POSITIVE_INFINITY;
    for (let k = 0; k < 40; k++) {
        const mid = (low + high) / 2;
        if (slabFwhmNm(gaussNm, lorentzNm, mid) < observedTotalNm) low = mid;
        else high = mid;
    }
    return (low + high) / 2;
}

/**
 * Read an optical depth per line out of the fitted widths, and test it
 * the way `14-SELF-ABSORPTION.md` tested the line-ratio route: for
 * internal consistency.
 *
 * That document refused a uniform slab because one line compared
 * against two partners gave two optical depths differing by up to 5.7,
 * and it named what would make the question answerable again, "a
 * measurement of the absorption independent of the emission".
 * `20-INSTRUMENT-WIDTH.md` found a second observable that the ratio
 * route does not use: the width, which ranks with absorber depth at
 * 0.72. This asks whether that second observable is self-consistent
 * where the first was not.
 *
 * The test is the same in spirit: a slab's optical depth must be
 * proportional to the absorber column times the line's own
 * `opticalDepthProxy`, with ONE column for the whole spectrum. If the
 * implied columns agree line to line, the width route works where the
 * ratio route failed. If they scatter, the refusal stands on a second
 * and independent ground.
 */
if (WIDTH_DEPTH) {
    const m = calibration;
    // The instrument, read where the model is sound. Not the trend over
    // all the windows, which 20-INSTRUMENT-WIDTH.md showed is itself a
    // line fitted through self-absorption.
    const instrumentAt = (nm) => CLEAN_INSTRUMENT_PM / 1000 + (CLEAN_INSTRUMENT_SLOPE_PM / 1e6) * (nm - PIVOT_NM);
    console.log("");
    console.log(`optical depth from the width, ${m.sampleName} at ${m.temperatureK} K, instrument taken as ${CLEAN_INSTRUMENT_PM} pm at ${PIVOT_NM} nm`);
    console.log(`${"nm".padStart(8)} ${"species".padEnd(14)} ${"fitted pm".padStart(9)} ${"clean pm".padStart(8)} ${"total pm".padStart(8)} ${"tau0".padStart(7)} ${"proxy".padStart(10)} ${"column".padStart(10)}`);
    const rows = [];
    for (const w of [...m.windows].sort((a, b) => a.nm - b.nm)) {
        let line = null;
        let species = "";
        for (const i of m.emissionsOf()) {
            if (Math.abs(i.line.wavelengthNm - w.nm) > 0.02) continue;
            const d = absorberDepthOf(i.line, m);
            if (line === null || d > line.depth) {
                line = { line: i.line, depth: d, speciesFraction: i.speciesFraction };
                species = `${i.line.element} ${STAGE_NUMERAL[i.line.ionisation]}`;
            }
        }
        if (line === null || !(line.depth > 0)) continue;
        const doppler = spectro.dopplerFwhmNm(w.nm, m.temperatureK, MOLAR_MASS[line.line.element] ?? 0.04);
        const lorentz = (GLOBAL_STARK ? undefined : line.line.collisionalWidthNm) ?? COLLISIONAL_NM;
        // What the fit says the feature is, intrinsic plus instrument.
        const observed = spectro.pseudoVoigtFwhm(Math.hypot(doppler, w.instrumentalFwhmNm), lorentz);
        // What it would be with no absorption and the real instrument.
        const thin = spectro.pseudoVoigtFwhm(Math.hypot(doppler, instrumentAt(w.nm)), lorentz);
        const tau0 = observed > thin ? tauFromWidth(Math.hypot(doppler, instrumentAt(w.nm)), lorentz, observed) : 0;
        const proxy = line.depth / Math.max(thin, 1e-9);
        const column = proxy > 0 ? tau0 / proxy : NaN;
        rows.push({ nm: w.nm, species, tau0, proxy, column, line: line.line, element: line.line.element, ionisation: line.line.ionisation, thin });
        console.log(
            `${w.nm.toFixed(2).padStart(8)} ${species.padEnd(14)} ${(w.instrumentalFwhmNm * 1000).toFixed(1).padStart(9)} ${(instrumentAt(w.nm) * 1000).toFixed(1).padStart(8)} ` +
                `${(observed * 1000).toFixed(1).padStart(8)} ${(Number.isFinite(tau0) ? tau0.toFixed(2) : "over").padStart(7)} ${proxy.toExponential(2).padStart(10)} ${(Number.isFinite(column) ? column.toExponential(2) : "-").padStart(10)}`
        );
    }
    const absorbing = rows.filter((r) => r.tau0 > 0.1 && Number.isFinite(r.column));
    if (absorbing.length > 2) {
        const cols = absorbing.map((r) => r.column).sort((a, b) => a - b);
        const logs = cols.map((c) => Math.log10(c));
        const mean = logs.reduce((a, b) => a + b, 0) / logs.length;
        const sd = Math.sqrt(logs.reduce((a, b) => a + (b - mean) ** 2, 0) / logs.length);
        console.log("");
        console.log(`  ${absorbing.length} windows read an optical depth above 0.1`);
        console.log(`  the absorber column they each imply spans ${cols[0].toExponential(2)} to ${cols[cols.length - 1].toExponential(2)}, a factor ${(cols[cols.length - 1] / cols[0]).toFixed(1)}`);
        console.log(`  scatter of the implied column: ${sd.toFixed(3)} dex, so a factor ${Math.pow(10, sd).toFixed(2)} either way about its own mean`);
        console.log(`  one slab with one column would give the same number for every line`);

        // Where the inconsistency lives. The column of absorbers of one
        // species is the element's abundance in the absorbing region
        // times its ionisation share there. If the slab is wrong only
        // because that region is not the emitting one, the columns
        // should still agree WITHIN a species and disagree between
        // them, which is a different and much more specific failure
        // than a slab being the wrong shape.
        const bySpecies = new Map();
        for (const r of absorbing) {
            if (!bySpecies.has(r.species)) bySpecies.set(r.species, []);
            bySpecies.get(r.species).push(r.column);
        }
        console.log("");
        console.log(`  within each species, where the absorbing region's composition cancels:`);
        const withinLogs = [];
        for (const [sp, cs] of [...bySpecies].sort((a, b) => b[1].length - a[1].length)) {
            const sorted = [...cs].sort((a, b) => a - b);
            const ls = cs.map((c) => Math.log10(c));
            const mu = ls.reduce((a, b) => a + b, 0) / ls.length;
            for (const l of ls) withinLogs.push(l - mu);
            const sd = Math.sqrt(ls.reduce((a, b) => a + (b - mu) ** 2, 0) / ls.length);
            console.log(
                `    ${sp.padEnd(7)} ${String(cs.length).padStart(2)} line(s), column ${sorted[0].toExponential(2)} to ${sorted[sorted.length - 1].toExponential(2)}` +
                    (cs.length > 1 ? `, a factor ${(sorted[sorted.length - 1] / sorted[0]).toFixed(2)}, scatter ${sd.toFixed(3)} dex` : "")
            );
        }
        const withinSd = Math.sqrt(withinLogs.reduce((a, b) => a + b * b, 0) / withinLogs.length);
        console.log("");
        console.log(`  scatter WITHIN species, pooled: ${withinSd.toFixed(3)} dex, a factor ${Math.pow(10, withinSd).toFixed(2)}`);
        console.log(`  scatter OVERALL:                ${sd.toFixed(3)} dex, a factor ${Math.pow(10, sd).toFixed(2)}`);
        console.log(`  so ${(100 * (1 - (withinSd * withinSd) / (sd * sd))).toFixed(0)} % of the variance sits BETWEEN species, not within them`);

        // If the absorbing region is simply COOLER than the emitting
        // one, which is what 14-SELF-ABSORPTION.md inferred from the
        // direction of its own inconsistency, then the columns were
        // computed with the wrong Saha balance and the wrong Boltzmann
        // factor. Recomputing both at a trial temperature and asking
        // which one makes the columns agree turns that inference into
        // a measurement. Calcium settles it on its own, since Ca I and
        // Ca II need the same element in the same place.
        console.log("");
        console.log(`  the absorbing region taken as cooler than the emitting one at ${m.temperatureK} K:`);
        console.log(`${"T (K)".padStart(9)} ${"column scatter".padStart(15)} ${"as a factor".padStart(12)} ${"Ca I / Ca II".padStart(13)}`);
        let coolest = null;
        for (let T = 5000; T <= m.temperatureK; T += 500) {
            const cold = spectro.computePhysicalEmissions(m.atomFractions, data, T, ELECTRON_DENSITY_CM3, 1);
            const shareAt = (el, st) => {
                for (const i of cold.intensities) if (i.line.element === el && i.line.ionisation === st) return i.speciesFraction;
                return NaN;
            };
            const ls = [];
            const caByStage = [[], []];
            for (const r of absorbing) {
                const share = shareAt(r.element, r.ionisation);
                if (!(share > 0)) continue;
                const proxy = spectro.opticalDepthProxy(r.line, T) * (m.atomFractions[r.element] ?? 0) * share;
                if (!(proxy > 0)) continue;
                const col = r.tau0 / (proxy / Math.max(r.thin, 1e-9));
                ls.push(Math.log10(col));
                if (r.element === "Ca" && r.ionisation < 2) caByStage[r.ionisation].push(Math.log10(col));
            }
            if (ls.length < 5) continue;
            const mu = ls.reduce((a, b) => a + b, 0) / ls.length;
            const sdT = Math.sqrt(ls.reduce((a, b) => a + (b - mu) ** 2, 0) / ls.length);
            const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
            const caRatio = Math.pow(10, mean(caByStage[0]) - mean(caByStage[1]));
            if (coolest === null || sdT < coolest.sd) coolest = { T, sd: sdT, caRatio };
            console.log(`${String(T).padStart(9)} ${sdT.toFixed(3).padStart(15)} ${Math.pow(10, sdT).toFixed(2).padStart(12)} ${(Number.isFinite(caRatio) ? caRatio.toFixed(2) : "-").padStart(13)}`);
        }
        if (coolest) {
            console.log("");
            console.log(`  tidiest at ${coolest.T} K, scatter ${coolest.sd.toFixed(3)} dex (factor ${Math.pow(10, coolest.sd).toFixed(2)}), against ${sd.toFixed(3)} dex at the emitting temperature`);
            console.log(`  that is ${m.temperatureK - coolest.T} K below the emitter, and at it Ca I and Ca II ask for columns within a factor ${coolest.caRatio.toFixed(2)} of each other`);

            // Calcium reconciles and the elements do not, so what is
            // left after the temperature is composition: the absorbing
            // region is not made of the same stuff as the emitting one.
            // Naming which way each element goes is naming the
            // fractionation, on one sample and with no composition
            // axis needed.
            const cold = spectro.computePhysicalEmissions(m.atomFractions, data, coolest.T, ELECTRON_DENSITY_CM3, 1);
            const shareAt = (el, st) => {
                for (const i of cold.intensities) if (i.line.element === el && i.line.ionisation === st) return i.speciesFraction;
                return NaN;
            };
            const byElement = new Map();
            for (const r of absorbing) {
                const share = shareAt(r.element, r.ionisation);
                const proxy = spectro.opticalDepthProxy(r.line, coolest.T) * (m.atomFractions[r.element] ?? 0) * share;
                if (!(proxy > 0)) continue;
                const col = r.tau0 / (proxy / Math.max(r.thin, 1e-9));
                if (!byElement.has(r.element)) byElement.set(r.element, []);
                byElement.get(r.element).push(Math.log10(col));
            }
            const geo = (xs) => Math.pow(10, xs.reduce((a, b) => a + b, 0) / xs.length);
            const cols = [...byElement].map(([el, ls]) => ({ el, col: geo(ls), n: ls.length }));
            const middle = geo(cols.map((c) => Math.log10(c.col)));
            console.log("");
            console.log(`  what the temperature does NOT explain, element by element at ${coolest.T} K:`);
            console.log(`${"element".padStart(9)} ${"lines".padStart(5)} ${"column".padStart(11)} ${"against the middle".padStart(19)}`);
            for (const c of cols.sort((a, b) => b.col - a.col)) {
                const rel = c.col / middle;
                console.log(`${c.el.padStart(9)} ${String(c.n).padStart(5)} ${c.col.toExponential(2).padStart(11)} ${(rel >= 1 ? `x${rel.toFixed(1)} enriched` : `/${(1 / rel).toFixed(1)} depleted`).padStart(19)}`);
            }
            console.log("");
            console.log(`  the absorbing region holds the same calcium as the emitting one and not the same magnesium or sodium,`);
            console.log(`  which is a composition difference between the two and not a temperature one`);
        }
    }
    process.exit(0);
}

// ── freeze the instrument, free the plasma ───────────────────────────

if (FREE_DENSITY) {
    const others = table.samples
        .map((s) => s.name)
        .filter((n) => n !== CALIBRATE && !EXCLUDE.has(normaliseSampleName(n)));
    pinnedWidthAt = frozenWidthAt;
    console.log("");
    console.log(`the instrumental width is now FROZEN at ${CALIBRATE}'s trend and the electron density is fitted per sample`);
    console.log(`${"sample".padEnd(12)} ${"T (K)".padStart(6)} ${"Ne (cm^-3)".padStart(11)} ${"resid %".padStart(8)} ${"free-width resid %".padStart(19)} ${"change".padStart(8)}`);
    const rows = [];
    for (const name of [CALIBRATE, ...others]) {
        // The same sample with the width free, as it was measured
        // before, so the two are a pair and not two different runs.
        pinnedWidthAt = undefined;
        const free = fitTemperature(name) ?? measure(name);
        if (free.blocker) {
            console.log(`${name.padEnd(12)} ${free.blocker}`);
            continue;
        }
        const freeResid = free.windows.reduce((a, w) => a + w.residualShareOfPeak, 0) / free.windows.length;

        pinnedWidthAt = frozenWidthAt;
        let best = null;
        for (const ne of DENSITY_GRID) {
            const m = measure(name, free.temperatureK, ne);
            if (m.blocker) continue;
            const resid = m.windows.reduce((a, w) => a + w.residualShareOfPeak, 0) / m.windows.length;
            if (best === null || resid < best.resid) best = { ne, resid, m };
        }
        pinnedWidthAt = undefined;
        if (best === null) {
            console.log(`${name.padEnd(12)} no density fitted`);
            continue;
        }
        rows.push({ name, ne: best.ne, resid: best.resid, freeResid, temperatureK: free.temperatureK, freeWidth: free.width.constant });
        console.log(
            `${name.padEnd(12)} ${String(free.temperatureK).padStart(6)} ${best.ne.toExponential(1).padStart(11)} ${(best.resid * 100).toFixed(3).padStart(8)} ` +
                `${(freeResid * 100).toFixed(3).padStart(19)} ${(((best.resid - freeResid) / freeResid) * 100).toFixed(1).padStart(7)}%`
        );
    }
    if (rows.length > 2) {
        const nes = rows.map((r) => r.ne).sort((a, b) => a - b);
        const worse = rows.map((r) => (r.resid - r.freeResid) / r.freeResid).sort((a, b) => a - b);
        const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
        console.log("");
        console.log(`  fitted electron density: ${nes[0].toExponential(1)} to ${nes[nes.length - 1].toExponential(1)} cm^-3, a factor ${(nes[nes.length - 1] / nes[0]).toFixed(1)}`);
        console.log(`  the residual costs ${(mean(worse) * 100).toFixed(1)} % of itself on average to freeze the instrument, worst ${(worse[worse.length - 1] * 100).toFixed(1)} %`);
        console.log(`  one instrument for all ${rows.length} samples, and one free plasma parameter each, against a width that varied by a factor 2.1`);
    }
    process.exit(0);
}

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
