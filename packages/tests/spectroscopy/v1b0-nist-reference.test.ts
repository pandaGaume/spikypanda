/**
 * V1-B0: does our forward model agree with NIST's own implementation?
 *
 * V1-A asked where the lines land, and answered it against the
 * catalogue we ourselves built, so it tested the pipeline and not the
 * physics. The next question is the one that decides whether an
 * intensity means anything: are the POPULATIONS right? Boltzmann over
 * the levels, Saha between the stages, the partition function
 * normalising both.
 *
 * The reference here is the NIST LIBS Database, which computes exactly
 * that model, from the same ASD data, written by the people who publish
 * the data: Saha for the ion populations, Boltzmann for the level
 * populations, optically thin plasma. It is an independent
 * IMPLEMENTATION, not an independent MEASUREMENT, so it cannot say
 * whether the model describes a real plasma; that is V1-B, and it stays
 * open. What it can say, and no real spectrum can, is whether our
 * arithmetic is right with nothing else moving: same lines, same
 * transition probabilities, same assumptions.
 *
 * The comparisons are nested on purpose, so a failure says where the
 * fault is:
 *
 *   1. the atomic input, line by line: if our catalogue and the
 *      reference do not hold the same numbers, nothing downstream means
 *      anything;
 *   2. the SHAPE within one species, which is Boltzmann and the
 *      partition function alone: every line of a species must carry the
 *      same ratio to the reference, whatever that ratio is;
 *   3. the BALANCE between the stages, which is Saha;
 *   4. the PARTITION FUNCTIONS across species and elements, once the
 *      ion abundances are taken from the reference so that the balance
 *      stops interfering.
 *
 * Fixtures: `fixtures/nist-libs`, extracted by
 * `packages/dev/plugins/spectroscopy/tools/build-nist-libs-fixtures.mjs`
 * from pages archived in the private research repository, each carrying
 * the request that produced it and its checksum.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BOLTZMANN_CONSTANT, ELEMENTARY_CHARGE, thermalEnergyEv } from "spikypanda-core";
import {
    computePhysicalEmissions,
    ionisationFractions,
    NIST_IONISATION_ENERGIES_EV,
    NIST_SPECIES,
    partitionFunction,
    photonEnergyEv,
    sahaRatio,
    transitionEnergyEv,
} from "../../dev/plugins/spectroscopy/src";
import type { IAtomicLine, IPhysicalModelData } from "../../dev/plugins/spectroscopy/src";

const FIXTURES = join(__dirname, "fixtures", "nist-libs");

const DATA: IPhysicalModelData = {
    species: NIST_SPECIES.map((s) => ({ element: s.element, ionisation: s.ionisation, asdName: s.asdName, lines: s.lines, levels: s.levels })),
    ionisationEnergiesEv: NIST_IONISATION_ENERGIES_EV,
};

/** An electron temperature in kelvin, from the eV the LIBS form takes. */
const kelvinOf = (electronVolts: number) => (electronVolts * ELEMENTARY_CHARGE) / BOLTZMANN_CONSTANT;

// ── the fixtures ─────────────────────────────────────────────────────

interface IFixture {
    /** `# key: value` lines of the header. */
    readonly scalars: Readonly<Record<string, string>>;
    /** `# species <element> <stage> <abundance>` lines. */
    readonly abundances: ReadonlyArray<{ element: string; ionisation: number; abundance: number }>;
    readonly columns: ReadonlyArray<string>;
    readonly rows: ReadonlyArray<ReadonlyArray<string>>;
}

function fixture(name: string): IFixture {
    const text = readFileSync(join(FIXTURES, name), "utf8");
    const scalars: Record<string, string> = {};
    const abundances: Array<{ element: string; ionisation: number; abundance: number }> = [];
    const rows: string[][] = [];
    let columns: string[] = [];

    for (const raw of text.split("\n")) {
        const line = raw.replace(/\r$/, "");
        if (line.length === 0) continue;
        if (line.startsWith("# species\t")) {
            const [, element, stage, abundance] = line.split("\t");
            abundances.push({ element, ionisation: Number(stage), abundance: Number(abundance) });
            continue;
        }
        if (line.startsWith("#")) {
            const m = /^#\s*([a-z0-9-]+):\s*(.*)$/.exec(line);
            if (m) scalars[m[1]] = m[2].trim();
            continue;
        }
        const cells = line.split("\t");
        if (columns.length === 0) columns = cells;
        else rows.push(cells);
    }
    return { scalars, abundances, columns, rows };
}

/** One line of the reference's atomic input. */
interface IReferenceLine {
    readonly wavelength: string;
    readonly wavelengthNm: number;
    readonly ionisation: number;
    readonly weightTimesProbability: number;
    readonly upperEnergyCm: number;
    readonly lowerEnergyCm: number;
}

function referenceLines(element: string): ReadonlyArray<IReferenceLine> {
    const f = fixture(`atomic-${element.toLowerCase()}.tsv`);
    const [iWl, iSt, iGa, iEk, iEi] = ["wavelength_nm", "ionisation", "weight_times_probability", "upper_energy_cm", "lower_energy_cm"].map((n) => f.columns.indexOf(n));
    return f.rows.map((r) => ({
        wavelength: r[iWl],
        wavelengthNm: Number(r[iWl]),
        ionisation: Number(r[iSt]),
        weightTimesProbability: Number(r[iGa]),
        upperEnergyCm: Number(r[iEk]),
        lowerEnergyCm: Number(r[iEi]),
    }));
}

/** The cm^-1 per eV the reference page itself used for its energies. */
const CM_PER_EV = Number(fixture("atomic-fe.tsv").scalars["cm-per-ev"]);

// ── pairing our catalogue with the reference ─────────────────────────

/**
 * Our lines and the reference's, paired.
 *
 * The key is the transition itself, the two level energies, rather than
 * the wavelength: our catalogue keeps the OBSERVED wavelength where ASD
 * publishes one and the reference prints the Ritz value, so the two
 * differ in the last digits and sorting by wavelength reorders
 * near-degenerate lines. Sorting by (upper, lower) energy is
 * unambiguous, since no two lines of a species share both levels.
 */
function pair(element: string, ionisation: number): Array<{ ours: IAtomicLine; reference: IReferenceLine }> {
    const species = NIST_SPECIES.find((s) => s.element === element && s.ionisation === ionisation);
    if (!species) throw new Error(`${element} stage ${ionisation} is not in the catalogue`);

    // The catalogue types both energies as optional, because ASD does
    // not always publish them; the physical model skips the lines that
    // lack the upper one, and so does the pairing.
    //
    // Two lines of a species can share BOTH level energies to the digit
    // the catalogue keeps: Fe III has two such pairs, their upper levels
    // differing only in the eighth significant figure. The energies
    // alone then leave their order undecided, and g_k A_ki settles it,
    // which is unambiguous because the two sides hold the same lines.
    const key = (ek: number | undefined, ei: number | undefined) => (ek ?? 0) * 1e7 + (ei ?? 0);
    const strength = (l: IAtomicLine) => (l.upperLevelWeight ?? 0) * (l.transitionProbability ?? 0);
    const ours = [...species.lines]
        .filter((l) => l.upperLevelEnergyEv !== undefined)
        .sort((a, b) => key(a.upperLevelEnergyEv, a.lowerLevelEnergyEv) - key(b.upperLevelEnergyEv, b.lowerLevelEnergyEv) || strength(a) - strength(b));
    const theirs = referenceLines(element)
        .filter((l) => l.ionisation === ionisation)
        .sort((a, b) => key(a.upperEnergyCm, a.lowerEnergyCm) - key(b.upperEnergyCm, b.lowerEnergyCm) || a.weightTimesProbability - b.weightTimesProbability);

    expect(ours.length).toBe(theirs.length);
    return ours.map((o, i) => ({ ours: o, reference: theirs[i] }));
}

/**
 * How well the two sides' upper level energies agree for one species,
 * in cm^-1, measured rather than assumed.
 *
 * It is the floor of everything downstream: the energy enters the
 * populations through exp(-E_k / kT), so a disagreement of dE on a
 * level becomes a relative dE/kT on the intensity, and no comparison
 * can be tighter than that. Measuring it per species matters, because
 * the three stages are published to very different precisions: the
 * neutral's levels agree to a thousandth of a wavenumber, while some
 * Si III levels are given to six significant figures in eV, which is
 * four tenths of a wavenumber at 31 eV.
 */
const energyAgreement = new Map<string, number>();
function energyAgreementCm(element: string, ionisation: number): number {
    const cacheKey = `${element}|${ionisation}`;
    const cached = energyAgreement.get(cacheKey);
    if (cached !== undefined) return cached;
    let worst = 0;
    for (const { ours, reference } of pair(element, ionisation)) {
        worst = Math.max(worst, Math.abs((ours.upperLevelEnergyEv ?? 0) * CM_PER_EV - reference.upperEnergyCm));
    }
    energyAgreement.set(cacheKey, worst);
    return worst;
}

/** That agreement as a relative tolerance on an intensity at kT. */
function allowedSpread(element: string, ionisation: number, ktEv: number): number {
    // Double precision alone is added so a species whose energies agree
    // exactly is still allowed its own arithmetic rounding.
    return energyAgreementCm(element, ionisation) / CM_PER_EV / ktEv + 1e-7;
}

// ── statistics the comparisons report ────────────────────────────────

interface ISpread {
    readonly count: number;
    readonly median: number;
    readonly min: number;
    readonly max: number;
    /** Widest departure from the median, as a fraction of it. */
    readonly relativeSpread: number;
}

function spread(values: ReadonlyArray<number>): ISpread {
    const sorted = [...values].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    return { count: sorted.length, median, min, max, relativeSpread: median > 0 ? Math.max(max / median - 1, 1 - min / median) : Infinity };
}

/**
 * The interval a value printed to `digits` significant figures came
 * from. The reference rounds its ion abundances to two, which is the
 * only reason a Saha comparison has any tolerance at all.
 */
function roundingInterval(printed: number, digits = 2): { low: number; high: number } {
    if (printed === 0) return { low: 0, high: 0 };
    const halfWidth = 0.5 * Math.pow(10, Math.floor(Math.log10(Math.abs(printed))) - (digits - 1));
    return { low: printed - halfWidth, high: printed + halfWidth };
}

// ── our side, grouped the way the reference groups it ────────────────

/**
 * Our intensities for a composition, one entry per printed wavelength
 * per species: two lines of a species sharing a printed wavelength
 * appear in the reference as their sum, so they are summed here too.
 */
function ourGroupedIntensities(atomFractions: Record<string, number>, temperatureEv: number, electronDensityCm3: number) {
    const result = computePhysicalEmissions(atomFractions, DATA, kelvinOf(temperatureEv), electronDensityCm3, 1);

    // Our line objects ARE the catalogue's, so the pairing identifies
    // them by reference rather than by a recomputed key.
    const referenceOf = new Map<IAtomicLine, IReferenceLine>();
    for (const element of Object.keys(atomFractions)) {
        for (const stage of [0, 1, 2]) {
            for (const p of pair(element, stage)) referenceOf.set(p.ours, p.reference);
        }
    }

    const grouped = new Map<string, { element: string; ionisation: number; wavelengthNm: number; intensity: number; lines: number }>();
    for (const i of result.intensities) {
        const reference = referenceOf.get(i.line);
        if (!reference) throw new Error(`a line of ${i.line.element} stage ${i.line.ionisation} has no reference counterpart`);
        const key = `${i.line.element}|${i.line.ionisation}|${reference.wavelength}`;
        const existing = grouped.get(key);
        if (existing) {
            existing.intensity += i.intensity;
            existing.lines += 1;
        } else {
            grouped.set(key, { element: i.line.element, ionisation: i.line.ionisation, wavelengthNm: reference.wavelengthNm, intensity: i.intensity, lines: 1 });
        }
    }
    return { grouped, result };
}

/** The reference's intensities for one run, keyed the same way. */
function referenceIntensities(run: string) {
    const f = fixture(`${run}.tsv`);
    const [iWl, iEl, iSt, iI] = ["wavelength_nm", "element", "ionisation", "intensity"].map((n) => f.columns.indexOf(n));
    const byKey = new Map<string, number>();
    for (const r of f.rows) byKey.set(`${r[iEl]}|${r[iSt]}|${r[iWl]}`, Number(r[iI]));
    return { fixture: f, byKey };
}

/** The ratio our intensity bears to the reference's, line by line. */
function ratios(run: string, atomFractions: Record<string, number>) {
    const { fixture: f, byKey } = referenceIntensities(run);
    const temperatureEv = Number(f.scalars["temperature-ev"]);
    const electronDensityCm3 = Number(f.scalars["electron-density-cm3"]);
    const { grouped, result } = ourGroupedIntensities(atomFractions, temperatureEv, electronDensityCm3);

    const bySpecies = new Map<string, number[]>();
    const unmatched: string[] = [];
    for (const [key, g] of grouped) {
        const theirs = byKey.get(key);
        if (theirs === undefined || !(theirs > 0)) {
            unmatched.push(key);
            continue;
        }
        const species = `${g.element} ${g.ionisation}`;
        const list = bySpecies.get(species) ?? [];
        list.push(g.intensity / theirs);
        bySpecies.set(species, list);
    }
    return { bySpecies, unmatched, temperatureEv, electronDensityCm3, fixture: f, result, grouped, byKey };
}

/** Every run, with the atom fractions that produced it. */
const RUNS: Array<[string, Record<string, number>]> = [
    ["fe100-t1.0ev-c2", { Fe: 1 }],
    ["fe100-t0.7ev-c2", { Fe: 1 }],
    ["ca100-t1.0ev-c2", { Ca: 1 }],
    ["ca100-t0.7ev-c2", { Ca: 1 }],
    ["si100-t1.0ev-c2", { Si: 1 }],
    ["si100-t0.7ev-c2", { Si: 1 }],
    ["ca50si50-t1.0ev-c2", { Ca: 0.5, Si: 0.5 }],
];

/**
 * Our ionisation chain for one element: a Saha ratio per adjacent pair
 * of stages, then the fractions. It is what `computePhysicalEmissions`
 * does internally, repeated here so the balance can be read on its own.
 */
function ourStageFractions(element: string, temperatureK: number, electronDensityCm3: number): number[] {
    const partition = (stage: number) => partitionFunction(NIST_SPECIES.find((s) => s.element === element && s.ionisation === stage)!.levels, temperatureK).value;
    const numerals = ["I", "II", "III"];
    const ratios: number[] = [];
    for (let k = 0; k + 1 < numerals.length; k++) {
        ratios.push(sahaRatio(partition(k), partition(k + 1), NIST_IONISATION_ENERGIES_EV[`${element} ${numerals[k]}`], temperatureK, electronDensityCm3));
    }
    return ionisationFractions(ratios);
}

// ── 1. the atomic input ──────────────────────────────────────────────

describe("V1-B0, the atomic input is the same on both sides", () => {
    for (const element of ["Ca", "Fe", "Si"]) {
        for (const stage of [0, 1, 2]) {
            it(`${element} stage ${stage}: same lines, same probabilities, same levels`, () => {
                const pairs = pair(element, stage);
                expect(pairs.length).toBeGreaterThan(20);

                let worstEnergy = 0;
                let worstProbability = 0;
                let worstWavelength = 0;
                for (const { ours, reference } of pairs) {
                    worstEnergy = Math.max(worstEnergy, Math.abs((ours.upperLevelEnergyEv ?? 0) * CM_PER_EV - reference.upperEnergyCm));
                    const ga = (ours.upperLevelWeight ?? 0) * (ours.transitionProbability ?? 0);
                    worstProbability = Math.max(worstProbability, Math.abs(ga - reference.weightTimesProbability) / reference.weightTimesProbability);
                    worstWavelength = Math.max(worstWavelength, Math.abs(ours.wavelengthNm - reference.wavelengthNm));
                }

                // The energies agree to the digit ASD publishes in eV,
                // which near 12 eV is 5e-6 eV or 0.04 cm^-1; the
                // reference prints g_k A_ki to four significant
                // figures, hence the 1e-3; the wavelengths differ only
                // by observed against Ritz, which is model-free and far
                // below any instrument.
                // Half a wavenumber: the coarsest grid either side
                // publishes. Most levels agree far better, but a level
                // known only to about 1 cm^-1 is given in eV to six
                // significant figures, and 31.4922 eV carries four
                // tenths of a wavenumber of rounding.
                expect(worstEnergy).toBeLessThan(0.5); // cm^-1
                expect(worstProbability).toBeLessThan(1e-3);
                // A level known only to about 1 cm^-1 moves the Ritz
                // wavelength it implies by 0.019 nm at 437 nm and
                // 0.064 nm at 800 nm, which is the whole of the
                // difference seen on Fe III. It no longer enters an
                // intensity at all, since the photon energy comes from
                // the levels, and it stays far below any instrument.
                expect(worstWavelength).toBeLessThan(0.1); // nm
            });
        }
    }
});

// ── 2. the shape within a species ────────────────────────────────────

/**
 * This is the decisive test. Within one species nothing but Boltzmann
 * and the partition function separates two lines, and both sides use
 * the same g_k, E_k and A_ki. So the ratio of our intensity to the
 * reference's has to be the SAME NUMBER for every line of that species.
 * Its value is not predicted: it carries the two codes' arbitrary
 * scales, their partition functions and their ion balances. Its
 * CONSTANCY is predicted, and that is what this measures.
 */
describe("V1-B0, the shape within a species", () => {
    for (const [run, atomFractions] of RUNS) {
        it(`${run}: every line of a species carries the same ratio`, () => {
            const { bySpecies, unmatched } = ratios(run, atomFractions);
            expect(unmatched).toEqual([]);
            // Three stages per element now, the doubly ionised one
            // included, which is the whole reason the reference was
            // fetched with `maxcharge=2` in the first place.
            expect(bySpecies.size).toBe(Object.keys(atomFractions).length * 3);

            const ktEv = thermalEnergyEv(kelvinOf(Number(fixture(`${run}.tsv`).scalars["temperature-ev"])));
            const spreads = [...bySpecies].sort().map(([species, values]) => {
                const [element, stage] = species.split(" ");
                // What the published precision allows, not a number
                // chosen to pass: this species' own energy disagreement
                // carried through exp(-E_k / kT).
                return { species, allowed: allowedSpread(element, Number(stage), ktEv), ...spread(values) };
            });
            console.log(
                `[V1-B0 shape] ${run}\n${spreads
                    .map((s) => `  ${s.species}: n=${s.count} ratio=${s.median.toExponential(6)} spread=${s.relativeSpread.toExponential(2)} allowed=${s.allowed.toExponential(2)}`)
                    .join("\n")}`
            );
            for (const s of spreads) expect(s.relativeSpread).toBeLessThan(s.allowed);
        });
    }

    it("takes the photon energy from the levels, not from the air wavelength", () => {
        // What this guards: ASD publishes the wavelength IN AIR above
        // 200 nm, so h c / lambda is the photon energy divided by the
        // refractive index of air. Dividing the level difference by it
        // measures that index, and its DISPERSION across the band is
        // the wavelength-dependent error that going through the
        // wavelength would put on every intensity. This comparison is
        // what found it: before the model took E_k - E_i, the ratio to
        // the reference spread by 3.2e-5, in step with the wavelength.
        const lines = NIST_SPECIES.find((s) => s.element === "Fe" && s.ionisation === 0)!.lines.filter(
            (l) => l.lowerLevelEnergyEv !== undefined && l.upperLevelEnergyEv !== undefined
        );
        expect(lines.length).toBeGreaterThan(2000);

        // The air wavelength is the shorter of the two, so h c / lambda
        // is the LARGER number and the quotient is 1 / n.
        const inverseIndex = lines.map((l) => transitionEnergyEv(l) / photonEnergyEv(l.wavelengthNm));
        const s = spread(inverseIndex);
        console.log(
            `[V1-B0 unit] level difference over h c / lambda_air: ${s.min.toFixed(7)} to ${s.max.toFixed(7)},` +
                ` that is a refractive index of air from ${(1 / s.max).toFixed(7)} to ${(1 / s.min).toFixed(7)}, dispersion ${(s.max - s.min).toExponential(2)}`
        );

        // The refractive index of air over this band, and its
        // dispersion, which is the error that was removed.
        expect(1 / s.max).toBeGreaterThan(1.00026);
        expect(1 / s.min).toBeLessThan(1.00034);
        expect(s.max - s.min).toBeGreaterThan(1e-5);
    });

    it("rules out a photon flux: the reference's unit is an energy flux", () => {
        // The two conventions differ by the photon energy, so reading
        // the reference as a photon flux would spread the ratio by the
        // 4.4 the band spans. This settles the unit from the numbers
        // rather than from the form's label.
        const { byKey } = referenceIntensities("fe100-t1.0ev-c2");
        const { grouped } = ourGroupedIntensities({ Fe: 1 }, 1, 1e17);

        const asPhotonFlux: number[] = [];
        for (const [key, g] of grouped) {
            const theirs = byKey.get(key);
            if (theirs === undefined || g.ionisation !== 0) continue;
            asPhotonFlux.push(g.intensity / photonEnergyEv(g.wavelengthNm) / theirs);
        }
        const s = spread(asPhotonFlux);
        console.log(`[V1-B0 unit] read as a photon flux the spread becomes ${s.relativeSpread.toFixed(2)}, a factor ${(s.max / s.min).toFixed(2)} across the band`);
        expect(s.relativeSpread).toBeGreaterThan(1);
    });
});

// ── 3. the balance between the stages ────────────────────────────────

/**
 * Saha, and what our two-stage truncation costs.
 *
 * The reference solves the balance over its three lowest stages and
 * prints each abundance rounded to two significant figures; we solve it
 * over two, which is a declared limit of the model. So the comparison
 * is made on the ion fraction RENORMALISED over the two stages both
 * codes have, against the interval those rounded numbers allow, and the
 * share the third stage takes is reported next to it: that one is a
 * real error on a real spectrum, not a disagreement between codes.
 */
describe("V1-B0, the Saha balance", () => {
    for (const [run, atomFractions] of RUNS) {
        for (const [element, atomFraction] of Object.entries(atomFractions)) {
            it(`${run}, ${element}: all three stage fractions match the reference's`, () => {
                const f = fixture(`${run}.tsv`);
                const temperatureK = kelvinOf(Number(f.scalars["temperature-ev"]));
                const electronDensityCm3 = Number(f.scalars["electron-density-cm3"]);
                const ours = ourStageFractions(element, temperatureK, electronDensityCm3);
                expect(ours).toHaveLength(3);

                // The reference's abundance carries the atom fraction
                // of the element, and each of the three is rounded to
                // two significant figures on its own, so they do not
                // quite sum to that fraction: in this mixture they sum
                // to 0.5045 where the element is 0.5. Normalising the
                // three against each other is what puts both sides on
                // the same footing, and the interval has to be built
                // through that same normalisation: a stage is at its
                // highest when it is at the top of its rounding and the
                // other two are at the bottom of theirs.
                const printed = [0, 1, 2].map((stage) => f.abundances.find((a) => a.element === element && a.ionisation === stage)?.abundance ?? 0);
                const bounds = printed.map((value) => roundingInterval(value));
                const others = (k: number, pick: (i: { low: number; high: number }) => number) => bounds.reduce((sum, b, i) => sum + (i === k ? 0 : pick(b)), 0);
                const allowed = printed.map((_value, k) => ({
                    low: bounds[k].low / (bounds[k].low + others(k, (b) => b.high)),
                    high: bounds[k].high / (bounds[k].high + others(k, (b) => b.low)),
                }));
                void atomFraction;

                const numerals = ["I", "II", "III"];
                console.log(
                    `[V1-B0 saha] ${run} ${element}: ` +
                        ours.map((o, k) => `${numerals[k]} ${o.toFixed(5)} in [${allowed[k].low.toFixed(5)}, ${allowed[k].high.toFixed(5)}]`).join("  ")
                );

                // Every stage, not just the ion: the third one is the
                // whole point of carrying three.
                for (let k = 0; k < 3; k++) {
                    expect(ours[k]).toBeGreaterThanOrEqual(allowed[k].low);
                    expect(ours[k]).toBeLessThanOrEqual(allowed[k].high);
                }
                expect(ours.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
            });
        }
    }

    it("puts nine per cent of calcium in its second ionisation at 11 605 K, where a two-stage balance put none", () => {
        // The number that moved this work up the queue. Iron and
        // silicon are two orders of magnitude behind at the same point,
        // which is why the error did not cancel in a ratio.
        const ca = ourStageFractions("Ca", kelvinOf(1), 1e17);
        const fe = ourStageFractions("Fe", kelvinOf(1), 1e17);
        const si = ourStageFractions("Si", kelvinOf(1), 1e17);
        console.log(`[V1-B0 third stage] at 1 eV and 1e17 cm^-3: Ca III ${(ca[2] * 100).toFixed(2)} %, Fe III ${(fe[2] * 100).toFixed(2)} %, Si III ${(si[2] * 100).toFixed(3)} %`);
        expect(ca[2]).toBeGreaterThan(0.08);
        expect(ca[2]).toBeLessThan(0.11);
        expect(fe[2]).toBeLessThan(0.01);
        expect(si[2]).toBeLessThan(0.01);
    });
});

// ── 4. the partition functions, across species and elements ──────────

/**
 * Once the ion abundance is taken from the reference instead of from
 * our own Saha solve, the only term left between the two codes is the
 * partition function. So the CORRECTED ratio
 *
 *     c = (our intensity / reference intensity) * (reference abundance
 *         / (our ion fraction * atom fraction))
 *
 * must be one single number for every species of every element in a
 * run: the ratio of the two codes' arbitrary scales. Anything else is a
 * partition function that disagrees.
 *
 * The same numbers also say what our two-stage truncation costs on a
 * composition, which is the part that matters for reading an element
 * ratio off a spectrum, and it is reported here rather than hidden.
 */
describe("V1-B0, the partition functions", () => {
    for (const [run, atomFractions] of RUNS) {
        it(`${run}: one scale for every species, once the abundances come from the reference`, () => {
            const { bySpecies, fixture: f } = ratios(run, atomFractions);
            const temperatureK = kelvinOf(Number(f.scalars["temperature-ev"]));
            const electronDensityCm3 = Number(f.scalars["electron-density-cm3"]);

            const corrected: Array<{ species: string; raw: number; scale: number; low: number; high: number }> = [];
            for (const [species, values] of [...bySpecies].sort()) {
                const [element, stageText] = species.split(" ");
                const stage = Number(stageText);
                const atomFraction = atomFractions[element];
                const ourShare = ourStageFractions(element, temperatureK, electronDensityCm3)[stage];
                const theirShare = f.abundances.find((a) => a.element === element && a.ionisation === stage)!.abundance;
                const raw = spread(values).median;
                const denominator = ourShare * atomFraction;
                // The abundance is printed to two significant figures,
                // so what the correction may be is an interval, not a
                // number, and a small abundance carries a wide one:
                // 0.15 is 0.15 give or take 3 per cent.
                const bounds = roundingInterval(theirShare);
                corrected.push({ species, raw, scale: (raw * theirShare) / denominator, low: (raw * bounds.low) / denominator, high: (raw * bounds.high) / denominator });
            }

            // The claim is not that the scales are close, it is that a
            // SINGLE scale can explain them all, so their intervals
            // have to share a point.
            const highestLow = Math.max(...corrected.map((c) => c.low));
            const lowestHigh = Math.min(...corrected.map((c) => c.high));
            const midpoints = spread(corrected.map((c) => c.scale));
            console.log(
                `[V1-B0 partition] ${run}\n${corrected
                    .map((c) => `  ${c.species}: raw ratio ${c.raw.toExponential(4)}, scale ${c.scale.toExponential(4)} in [${c.low.toExponential(4)}, ${c.high.toExponential(4)}]`)
                    .join(
                        "\n"
                    )}\n  one scale fits them all: ${highestLow <= lowestHigh ? `yes, anywhere in [${highestLow.toExponential(4)}, ${lowestHigh.toExponential(4)}]` : "NO"}` +
                    `, the midpoints spread by ${(midpoints.relativeSpread * 100).toFixed(2)} %`
            );
            expect(highestLow).toBeLessThanOrEqual(lowestHigh);
        });
    }

    it("no longer biases a two-element reading, which is what the third stage was added for", () => {
        // Half calcium, half silicon, by atom, at 11 605 K. Calcium is
        // 9.1 % doubly ionised there and silicon is 0.07 %, so a model
        // that stopped at the first ion put calcium's missing 9 % back
        // into its neutral and singly ionised populations and silicon's
        // nowhere. That error did not cancel in a ratio, which is
        // precisely what a composition is read from: measured at
        // +10.0 % on this very sample, which is why the third stage was
        // downloaded and the balance extended.
        const { bySpecies } = ratios("ca50si50-t1.0ev-c2", { Ca: 0.5, Si: 0.5 });
        const median = (species: string) => spread(bySpecies.get(species) as number[]).median;
        const bias = median("Ca 1") / median("Si 1");
        console.log(`[V1-B0 truncation] Ca II over Si II, our ratio against the reference's: ${bias.toFixed(5)}, a bias of ${((bias - 1) * 100).toFixed(2)} % on a Ca/Si reading`);

        // What is left is the reference's own printing: its abundances
        // are rounded to two significant figures, which is a few parts
        // in a thousand on each of the two species compared.
        expect(Math.abs(bias - 1)).toBeLessThan(0.005);
    });
});
