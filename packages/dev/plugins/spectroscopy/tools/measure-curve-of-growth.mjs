/**
 * Does the self-absorption index follow the abundance?
 *
 * `17-V1C-PREDICTION.md` measured that the forward model does not carry
 * a composition across samples, and left two candidates: self-absorption
 * saturating with abundance, and ablation fractionation. This tool tests
 * the first, and the reason it is worth running is that it is blind to
 * the second.
 *
 * The quantity is `14-SELF-ABSORPTION.md`'s self-absorption index, the
 * measured intensity ratio of a same-species pair over the ratio atomic
 * data fixes. Fractionation changes how many atoms of the element reach
 * the plasma and multiplies BOTH lines of the pair by the same factor,
 * so it cancels in their ratio and the index cannot see it.
 * Self-absorption bites the stronger line harder, so it does not cancel.
 * The index is therefore a measurement of the first candidate that the
 * second cannot contaminate.
 *
 * What the tool adds to that document is the regression of the index on
 * the element's own abundance across the twenty-one samples, which that
 * document refused for want of a lever. Measured since: aluminium spans
 * a factor 2.1 and calcium 2.4, which is the "twofold range" of its
 * refusal, but MAGNESIUM SPANS 13.4 and titanium 12.9. The protocol and
 * the thresholds are in `18-CURVE-OF-GROWTH.md`, declared before this
 * ran.
 *
 * Two deliberate departures from document 14's survey, both recorded in
 * document 18 section "The pair document 14 could not see":
 *
 * - the minimum pair separation is 0.45 nm rather than `findLinePairs`'s
 *   1 nm default, because 0.45 nm is five instrument widths at the
 *   fitted 88.8 pm and is the threshold the rest of this track calls
 *   resolved. The 1 nm default excluded Mg II 279.553 / 280.270, which
 *   is the doublet of the very line document 17 measured;
 * - the areas are measured WITHOUT the model, by a window of five widths
 *   whose continuum is the median of its outer thirds. Document 14
 *   requires this: a measured ratio compared against a modelled one has
 *   to be measured independently or the comparison says nothing.
 *
 * On the duplication in this file. The per-sample instrument fit and the
 * temperature fit are the ones in `predict-regolith-set.mjs`, repeated
 * here rather than factored out, because that tool was being replayed by
 * another session while this was written and refactoring a file under a
 * running replay breaks the replay. The two belong in a shared module
 * and that is a tidy-up this tool's own result does not depend on.
 *
 * Usage, from the repository root, with the plugins compiled:
 *
 *     node packages/dev/plugins/spectroscopy/tools/measure-curve-of-growth.mjs \
 *          <archive.zip> [--condition Earth] [--temperature 9000] [--min-samples 12]
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
    console.error("Usage: node measure-curve-of-growth.mjs <archive.zip> [--condition Earth] [--temperature 9000] [--min-samples 12] [--floor 0.002] [--min-ratio 1.2]");
    console.error("The archive is 2.25 GB of CC BY 4.0 data recorded in internals/libs/data/MANIFEST.md, so its path is an argument.");
    process.exit(1);
}
const CONDITION = flag("condition", "Earth");
const SEED_TEMPERATURE = Number(flag("temperature", "9000"));
const MIN_SAMPLES = Number(flag("min-samples", "12"));

// From 12-INSTRUMENT-RESPONSE.md, 13-V1B-FIRST-FIT.md and 18's protocol.
const TRUSTED_LOW_NM = 260;
const TRUSTED_HIGH_NM = 990;
const WINDOW_HALF_NM = 0.35;
const COLLISIONAL_NM = 0.05;
const PIVOT_NM = 500;
const MIN_SEPARATION_NM = 0.45;
// Document 14's acceptance window on the predicted ratio, and its detection
// floor, both overridable because document 18's result turns on them.
//
// The floor at 0.002 of the brightest modelled line is what excluded titanium
// from the first run, and it excluded it by a factor 1.28: the best Ti II pair
// sits at 1.56e-3 of the peak on the richest sample. Lowering it is a POST-HOC
// relaxation of a pre-registered criterion, so a run that uses it is
// exploratory and must never be scored against document 18's thresholds.
//
// The lower end of the ratio window matters for the opposite reason. The
// diagnostic's whole range is 1 down to one over the square root of the ratio,
// so a pair at 1.2 can move 0.087 in the index and a pair at 4 can move 0.5.
// Raising that bound selects pairs able to say something.
const PREDICTED_RATIO_RANGE = [Number(flag("min-ratio", "1.2")), Number(flag("max-ratio", "8"))];
const DETECTION_FLOOR = Number(flag("floor", "0.002"));
const OWN_SHARE = 0.85;

// The corrected analyses, not the published ones: `16-GROUND-TRUTH-UNCERTAINTY.md`
// section 4 lists 33 defective cells, and the ledger beside the fixture carries
// the corrections without editing the published table. The three elements this
// measurement rests on, magnesium, aluminium and calcium, are unmoved to four
// decimals either way; titanium's own range is not, falling from 1.109 to
// 0.904 dex because three of the mistyped cells were its.
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

/**
 * Every candidate pair in the catalogue, found once, since the catalogue
 * does not depend on the sample. Document 14's acceptance tests, with
 * the separation of document 18.
 */
const candidatePairs = (() => {
    const out = [];
    for (const sp of spectro.NIST_SPECIES) {
        const pairs = spectro.findLinePairs(sp.lines, {
            rangeNm: [TRUSTED_LOW_NM, TRUSTED_HIGH_NM],
            minSeparationNm: MIN_SEPARATION_NM,
        });
        for (const pair of pairs) {
            const predicted = spectro.predictPairRatio(pair, SEED_TEMPERATURE);
            if (!(predicted >= PREDICTED_RATIO_RANGE[0] && predicted <= PREDICTED_RATIO_RANGE[1])) continue;
            out.push({
                pair,
                species: `${sp.element} ${STAGE_NUMERAL[sp.ionisation]}`,
                label: `${sp.element} ${STAGE_NUMERAL[sp.ionisation]} ${pair.strong.wavelengthNm.toFixed(3)}/${pair.weak.wavelengthNm.toFixed(3)}`,
                separationNm: Math.abs(pair.strong.wavelengthNm - pair.weak.wavelengthNm),
            });
        }
    }
    return out;
})();

/** Fixed by the first sample measured, then used by every other. */
let commonCentres = null;

/** Everything one sample yields: its instrument, its temperature, its areas. */
function measure(sampleName, temperatureK) {
    const analysed = table.samples.find((s) => s.name === sampleName);
    if (!analysed) return { sampleName, blocker: "not in the published analysis" };

    // The published table and the archive disagree on three names, the
    // table writing `Na2O- AL` and `MgO-Al` where the archive has
    // `Na2O-AL` and `MgO-AL`. The mismatch is the data set's.
    const normalise = (n) => n.replace(/\s+/g, "").toUpperCase();
    let measured;
    try {
        measured = sampleSpectrum(archive, CONDITION, sampleName, "Moon");
    } catch {
        const match = archiveNames.find((n) => normalise(n) === normalise(sampleName));
        if (!match) return { sampleName, blocker: "no spectrum in the archive under any spelling of this name" };
        try {
            measured = sampleSpectrum(archive, CONDITION, match, "Moon");
        } catch (e) {
            return { sampleName, blocker: `no spectrum in the archive: ${e instanceof Error ? e.message : String(e)}` };
        }
    }
    const corrected = spectro.applyInstrumentResponse({ wavelengthNm: measured.wavelengthNm, values: measured.values }, response);

    const resolved = core.resolveElementalComposition(chemistry.oxideComponents(analysed), "mass");
    const atomFractions = Object.fromEntries(Object.entries(resolved.moleFractions).filter(([, v]) => v > 0));
    const emission = spectro.computePhysicalEmissions(atomFractions, data, temperatureK, 1e17, 1);
    let modelMax = 0;
    for (const i of emission.intensities) modelMax = Math.max(modelMax, i.intensity);

    const asEmission = (i) => ({
        element: i.line.element,
        species: `${i.line.element} ${STAGE_NUMERAL[i.line.ionisation]}`,
        wavelengthNm: i.line.wavelengthNm,
        intensity: i.intensity,
        dopplerFwhmNm: spectro.dopplerFwhmNm(i.line.wavelengthNm, temperatureK, MOLAR_MASS[i.line.element] ?? 0.04),
        provenance: "model",
    });
    const windowOf = (centreNm, halfNm = WINDOW_HALF_NM) => {
        const index = [];
        for (let k = 0; k < measured.wavelengthNm.length; k++) {
            const nm = measured.wavelengthNm[k];
            if (nm >= centreNm - halfNm && nm <= centreNm + halfNm) index.push(k);
        }
        const grid = new Float64Array(index.map((k) => measured.wavelengthNm[k]));
        const values = index.map((k) => corrected.values[k]);
        return { grid, values, complete: values.length >= 20 && values.every(Number.isFinite) };
    };

    // One window set for every sample: a width averaged over one set
    // cannot be compared with a width averaged over another.
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
        const inside = emission.intensities.filter(
            (i) => i.line.wavelengthNm >= centreNm - WINDOW_HALF_NM - 0.2 && i.line.wavelengthNm <= centreNm + WINDOW_HALF_NM + 0.2 && i.intensity >= modelMax * 1e-5
        );
        if (!inside.length) continue;
        const fit = spectro.fitWindow(w.grid, w.values, inside.map(asEmission), { maxOffsetNm: 0.25, fwhmRangeNm: [0.02, 0.8], collisionalFwhmNm: COLLISIONAL_NM });
        if (fit.blocker) continue;
        windows.push({ nm: centreNm, ...fit });
    }
    if (windows.length < 3) return { sampleName, blocker: `only ${windows.length} window(s) fitted` };

    const widthTrend = spectro.fitLinearTrend(
        windows.map((w) => w.nm),
        windows.map((w) => w.instrumentalFwhmNm),
        PIVOT_NM
    );
    const offsetTrend = spectro.fitLinearTrend(
        windows.map((w) => w.nm),
        windows.map((w) => w.offsetNm),
        PIVOT_NM
    );
    const widthAt = (nm) => Math.max(0.02, widthTrend.constant + widthTrend.slopePerNm * (nm - PIVOT_NM));
    const offsetAt = (nm) => offsetTrend.constant + offsetTrend.slopePerNm * (nm - PIVOT_NM);

    /**
     * A line's area above a local continuum, the model not consulted.
     * Document 14's measurement: the continuum is the median of the
     * window's outer thirds, so a neighbour cannot drag it, and the
     * centre carries the fitted offset because the instrument's
     * calibration is not perfect.
     */
    const lineArea = (nm) => {
        const centre = nm + offsetAt(nm);
        const width = widthAt(centre);
        const w = windowOf(centre, 5 * width);
        if (!w.complete) return NaN;
        const core2 = 2.5 * width;
        const inner = [];
        const outer = [];
        for (let k = 0; k < w.grid.length; k++) {
            if (Math.abs(w.grid[k] - centre) <= core2) inner.push(w.values[k]);
            else outer.push(w.values[k]);
        }
        if (inner.length < 8 || outer.length < 8) return NaN;
        outer.sort((a, b) => a - b);
        const continuum = outer[Math.floor(outer.length / 2)];
        const step = (w.grid[w.grid.length - 1] - w.grid[0]) / (w.grid.length - 1);
        let area = 0;
        for (const v of inner) area += Math.max(0, v - continuum);
        return area * step;
    };

    // The catalogue offers seventeen thousand candidate pairs, so the
    // cleanliness test runs tens of thousands of times per sample and
    // cannot afford to sweep every modelled line each time. Sorted once,
    // it is a binary search and a scan of the neighbourhood.
    const sorted = emission.intensities.slice().sort((a, b) => a.line.wavelengthNm - b.line.wavelengthNm);
    const sortedNm = Float64Array.from(sorted, (i) => i.line.wavelengthNm);
    const lowerBound = (x) => {
        let lo = 0;
        let hi = sortedNm.length;
        while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (sortedNm[mid] < x) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    };

    /** Bright enough on this sample, and alone in its own window. */
    const clean = (nm) => {
        const width = widthAt(nm);
        const from = lowerBound(nm - 5 * width);
        const to = lowerBound(nm + 5 * width);
        let own = 0;
        let total = 0;
        for (let k = from; k < to; k++) {
            total += sorted[k].intensity;
            if (Math.abs(sortedNm[k] - nm) < 0.01) own = Math.max(own, sorted[k].intensity);
        }
        return own >= modelMax * DETECTION_FLOOR && own >= OWN_SHARE * total;
    };

    return { sampleName, temperatureK, atomFractions, windows, widthTrend, offsetTrend, lineArea, clean, blocker: null };
}

/**
 * The temperature of one sample, from a Boltzmann plot inside Ca II on
 * its non-resonance lines only, which is `predict-regolith-set.mjs`'s
 * fit and the reasoning for it is recorded there: the window residual
 * does not distinguish 9 000 K from 14 000 K, so choosing by residual
 * made the temperature noise.
 */
function fitTemperature(sampleName) {
    const seeded = measure(sampleName, SEED_TEMPERATURE);
    if (seeded.blocker) return seeded;
    if (!commonCentres) commonCentres = seeded.windows.map((w) => w.nm);

    const caII = spectro.NIST_SPECIES.find((sp) => sp.element === "Ca" && sp.ionisation === 1);
    const points = [];
    for (const w of seeded.windows) {
        for (const line of caII.lines) {
            if (Math.abs(line.wavelengthNm - w.nm) > 0.02) continue;
            if ((line.lowerLevelEnergyEv ?? 0) < 0.05) continue;
            const area = seeded.lineArea(line.wavelengthNm);
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
    const settled = measure(sampleName, Math.round(plot.temperatureK));
    return settled.blocker ? { ...seeded, boltzmann: plot } : { ...settled, boltzmann: plot };
}

// ── measure every pair on every sample ───────────────────────────────

console.log(`the curve of growth, ${CONDITION} condition, ${candidatePairs.length} candidate pairs in the catalogue`);
console.log(`protocol and thresholds: internals/libs/18-CURVE-OF-GROWTH.md, declared before this ran\n`);
if (DETECTION_FLOOR !== 0.002 || PREDICTED_RATIO_RANGE[0] !== 1.2 || PREDICTED_RATIO_RANGE[1] !== 8) {
    console.log(
        `EXPLORATORY RUN: acceptance relaxed from document 14's, floor ${DETECTION_FLOOR} against 0.002, ratio window ` +
            `${PREDICTED_RATIO_RANGE[0]} to ${PREDICTED_RATIO_RANGE[1]} against 1.2 to 8. Not to be scored against document 18's thresholds.`
    );
}

const readings = new Map(); // label -> [{sample, index, abundance, temperatureK}]
const samplesDone = [];
for (const s of table.samples) {
    const m = fitTemperature(s.name);
    if (m.blocker) {
        console.log(`  ${s.name.padEnd(11)} skipped: ${m.blocker}`);
        continue;
    }
    samplesDone.push({ name: s.name, temperatureK: m.temperatureK });
    let measuredHere = 0;
    for (const c of candidatePairs) {
        const predicted = spectro.predictPairRatio(c.pair, m.temperatureK);
        if (!(predicted >= PREDICTED_RATIO_RANGE[0] && predicted <= PREDICTED_RATIO_RANGE[1])) continue;
        if (!m.clean(c.pair.strong.wavelengthNm) || !m.clean(c.pair.weak.wavelengthNm)) continue;
        const strongArea = m.lineArea(c.pair.strong.wavelengthNm);
        const weakArea = m.lineArea(c.pair.weak.wavelengthNm);
        if (!(strongArea > 0) || !(weakArea > 0)) continue;
        const reading = spectro.selfAbsorptionIndex(strongArea / weakArea, predicted);
        const abundance = m.atomFractions[c.pair.element];
        if (!(abundance > 0)) continue;
        if (!readings.has(c.label)) readings.set(c.label, []);
        readings.get(c.label).push({
            sample: s.name,
            index: reading.index,
            aboveOne: Boolean(reading.blocker),
            abundance,
            temperatureK: m.temperatureK,
        });
        measuredHere++;
    }
    console.log(`  ${s.name.padEnd(11)} ${String(m.temperatureK).padStart(6)} K  ${String(measuredHere).padStart(2)} pair(s) measured`);
}

// ── the regressions ──────────────────────────────────────────────────

/** Slope, correlation, scatter and the standard error of the slope. */
function regress(x, y) {
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
    const intercept = my - slope * mx;
    let rss = 0;
    for (let i = 0; i < n; i++) rss += (y[i] - (intercept + slope * x[i])) ** 2;
    const scatter = n > 2 ? Math.sqrt(rss / (n - 2)) : NaN;
    return {
        n,
        slope,
        correlation: sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : NaN,
        scatter,
        slopeError: sxx > 0 && n > 2 ? scatter / Math.sqrt(sxx) : NaN,
        span: Math.max(...x) - Math.min(...x),
    };
}

console.log(`\n${samplesDone.length} samples measured, temperatures ${Math.min(...samplesDone.map((s) => s.temperatureK))} to ${Math.max(...samplesDone.map((s) => s.temperatureK))} K`);
console.log(`\nthe curve of growth, per pair. b is the slope of log10(index) against log10(abundance):`);
console.log(`  b = 0 is optically thin, b approaching -1 is the saturated plateau, b = -0.5 the damping wings.`);
console.log(`  A pair needs ${MIN_SAMPLES} samples to enter.\n`);

const rows = [];
for (const [label, rs] of readings) {
    const aboveOne = rs.filter((r) => r.aboveOne).length;
    if (rs.length < MIN_SAMPLES) {
        console.log(`  ${label.padEnd(30)} only ${rs.length} sample(s), below the ${MIN_SAMPLES} a regression needs`);
        continue;
    }
    const logN = rs.map((r) => Math.log10(r.abundance));
    const logI = rs.map((r) => Math.log10(r.index));
    const onAbundance = regress(logN, logI);
    const onTemperature = regress(
        rs.map((r) => Math.log10(r.temperatureK)),
        logI
    );
    const meanIndex = rs.reduce((a, r) => a + r.index, 0) / rs.length;
    rows.push({ label, rs, aboveOne, onAbundance, onTemperature, meanIndex });
}

rows.sort((a, b) => a.onAbundance.slope - b.onAbundance.slope);
console.log(
    `  ${"pair".padEnd(30)} ${"n".padStart(3)} ${"index".padStart(6)} ${"lever".padStart(6)} ${"b".padStart(7)} ${"+/-".padStart(6)} ${"r".padStart(7)} ${"scatter".padStart(8)} ${"b on T".padStart(7)}  note`
);
for (const r of rows) {
    const significant = Math.abs(r.onAbundance.slope) > 2 * r.onAbundance.slopeError;
    const note = [
        r.aboveOne > 0 ? `${r.aboveOne} reading(s) above one` : "",
        !significant ? "not significant at two sigma" : "",
        Math.abs(r.onTemperature.slope) >= Math.abs(r.onAbundance.slope) ? "follows temperature as strongly: unresolved" : "",
        r.onAbundance.slope < -1 ? "PAST THE BOUND: not a curve of growth" : "",
    ]
        .filter(Boolean)
        .join("; ");
    console.log(
        `  ${r.label.padEnd(30)} ${String(r.onAbundance.n).padStart(3)} ${r.meanIndex.toFixed(3).padStart(6)} ${r.onAbundance.span.toFixed(3).padStart(6)} ${r.onAbundance.slope.toFixed(3).padStart(7)} ${r.onAbundance.slopeError.toFixed(3).padStart(6)} ${r.onAbundance.correlation.toFixed(3).padStart(7)} ${r.onAbundance.scatter.toFixed(3).padStart(8)} ${r.onTemperature.slope.toFixed(3).padStart(7)}  ${note}`
    );
}

// ── what it means for V1-C ───────────────────────────────────────────

/**
 * How much of V1-C's failure a measured exponent accounts for.
 *
 * V1-C's Mg over Al pair lost 1.147 dex of movement per dex of
 * composition ratio. Across these samples log Mg moves 0.7975 per dex
 * of that ratio and log Al moves -0.2025, so an exponent b on
 * magnesium alone contributes b * 0.7975, and the same exponent on both
 * elements contributes b * 1.0 since the two slopes differ by one.
 */
const V1C_DISCREPANCY = -1.147;
const MG_LEVERAGE = 0.7975;
const magnesium = rows.filter((r) => r.label.startsWith("Mg "));
console.log(`\nwhat this says about V1-C's 1.147 dex of lost movement:`);
if (!magnesium.length) {
    console.log(`  no magnesium pair reached ${MIN_SAMPLES} samples, so the pair V1-C measured has no reading here`);
} else {
    for (const r of magnesium) {
        const alone = (r.onAbundance.slope * MG_LEVERAGE) / V1C_DISCREPANCY;
        const shared = r.onAbundance.slope / V1C_DISCREPANCY;
        console.log(
            `  ${r.label.padEnd(30)} b = ${r.onAbundance.slope.toFixed(3)} accounts for ${(alone * 100).toFixed(0)} % if magnesium carries it alone, ${(shared * 100).toFixed(0)} % if both elements share the exponent`
        );
    }
    console.log(`  The bound of a curve of growth is b = -1, which would account for 70 % and 87 % respectively.`);
}
