/**
 * The physical emission model: partition functions, Boltzmann
 * populations, the Saha ionisation balance, and the line emissivity
 * that follows.
 *
 * This is the module the `physical` emission mode refused to run
 * without. It needs, per species, the complete level list and the
 * ionisation energy, and per line the transition probability, the upper
 * level energy and its statistical weight. All of that now comes from
 * NIST ASD (see `lines/nist.catalogue.ts`).
 *
 * The chain, with its assumptions named
 * ------------------------------------
 * 1. LOCAL THERMODYNAMIC EQUILIBRIUM is assumed: one temperature
 *    describes both the level populations and the ionisation balance.
 *    A real plasma is inhomogeneous and transient, so this is an
 *    approximation whose validity is itself testable (McWhirter).
 * 2. PARTITION FUNCTION: U(T) = sum over levels of g exp(-E / kT). The
 *    sum is truncated at the level list ASD publishes, which is why
 *    `partitionFunction` also reports how much of the sum comes from
 *    the highest decile of levels: a large share there means the
 *    truncation matters at that temperature.
 * 3. BOLTZMANN: the fraction of a species on level k is
 *    g_k exp(-E_k / kT) / U(T).
 * 4. SAHA: the split between the ionisation stages at a given electron
 *    density, solved over as many successive stages as the data set
 *    carries. Where the data stops, the model stops, and the report
 *    says which stage it stopped at: a balance truncated at the first
 *    ion attributes the deeper stages' atoms to the stages below, and
 *    at 11 605 K that is nine per cent of calcium going to the wrong
 *    place, which biases every ratio calcium takes part in.
 * 5. EMISSIVITY of a line: the standard optically thin form,
 *    eps = (h c / 4 pi lambda) A_ki n_k.
 *
 * What the numbers mean
 * ---------------------
 * The total number density of the plasma is NOT known: nothing in the
 * chain fixes how many atoms per cubic metre the laser ablated. So this
 * module computes the emissivity PER UNIT TOTAL ATOM DENSITY, and drops
 * the 1/4 pi solid-angle factor with it, giving a quantity in
 * electronvolts per second per atom:
 *
 *     I_line = x_element * f_species * (g_k / U) * exp(-E_k / kT)
 *              * A_ki * (E_k - E_i)
 *
 * Every RATIO in a spectrum built this way is physical: line to line,
 * species to species, element to element, and their variation with
 * temperature and electron density. The overall SCALE is not, and no
 * part of this code pretends otherwise. That is the difference with the
 * `relative` mode, where the ratios are not physical either.
 */

import { BOLTZMANN_CONSTANT, ELECTRON_MASS, ELEMENTARY_CHARGE, PLANCK_CONSTANT, SPEED_OF_LIGHT, thermalEnergyEv } from "spikypanda-core";
import type { IEnergyLevel } from "../lines/nist.parse.js";
import type { IAtomicLine, IonisationStage } from "../lines/lines.catalog.js";

/** What the physical model needs about one species. */
export interface IPhysicalSpecies {
    readonly element: string;
    readonly ionisation: IonisationStage;
    /** ASD spelling, the key of the ionisation energy table. */
    readonly asdName: string;
    readonly lines: ReadonlyArray<IAtomicLine>;
    readonly levels: ReadonlyArray<IEnergyLevel>;
}

/** The data set the physical model runs against. */
export interface IPhysicalModelData {
    readonly species: ReadonlyArray<IPhysicalSpecies>;
    /** Ionisation energy [eV] keyed by ASD species name: `Ca I` is the
     *  energy to ionise NEUTRAL calcium. */
    readonly ionisationEnergiesEv: Readonly<Record<string, number>>;
}

/**
 * The ionisation stages the model can carry, from the neutral atom up.
 * It is the closed list of `IonisationStage`, in order, because the
 * Saha balance is a chain and the order is what makes it one.
 */
const STAGES: ReadonlyArray<IonisationStage> = [0, 1, 2];

/** How ASD spells each of those stages. */
const STAGE_NUMERALS = ["I", "II", "III"] as const;

/** A partition function and what the truncation of its level list costs. */
export interface IPartitionFunction {
    /** U(T), dimensionless. */
    readonly value: number;
    readonly levelCount: number;
    /** Share of U(T) contributed by the highest-energy tenth of the
     *  levels. Large means the published list stops too early to be
     *  trusted at this temperature. */
    readonly topDecileShare: number;
}

/**
 * Photon energy [eV] of a wavelength in nanometres. The constant is
 * h c / e, which is why it is computed rather than written as 1239.84.
 *
 * The wavelength ASD publishes above 200 nm is the wavelength IN AIR,
 * so this returns h c / (n lambda_vacuum e) and understates the photon
 * energy by the refractive index of air, 2.7 to 3.3 parts in ten
 * thousand across the band. Prefer `transitionEnergyEv` whenever the
 * two level energies are known; this is the fallback for a line whose
 * lower level ASD does not publish.
 */
export function photonEnergyEv(wavelengthNm: number): number {
    if (!(wavelengthNm > 0)) return 0;
    return (PLANCK_CONSTANT * SPEED_OF_LIGHT) / (wavelengthNm * 1e-9 * ELEMENTARY_CHARGE);
}

/**
 * Energy [eV] of the photon a line emits: the difference between its
 * two levels, which is what the atom actually releases.
 *
 * Going through the wavelength instead would pass through the
 * refractive index of air, which is a property of the room and not of
 * the transition, and whose dispersion across 200 to 900 nm is a
 * wavelength-dependent error of 3e-5 on every intensity. V1-B0 measured
 * that error against the NIST LIBS reference before it was removed:
 * `packages/tests/spectroscopy/v1b0-nist-reference.test.ts`.
 */
export function transitionEnergyEv(line: IAtomicLine): number {
    const upper = line.upperLevelEnergyEv;
    const lower = line.lowerLevelEnergyEv;
    if (upper !== undefined && lower !== undefined && upper > lower) return upper - lower;
    return photonEnergyEv(line.wavelengthNm);
}

/**
 * Partition function of a species at temperature T.
 *
 * Levels are expected sorted by energy, as ASD exports them; the top
 * decile share is computed on that order, so an unsorted list is sorted
 * first rather than reported wrongly.
 */
export function partitionFunction(levels: ReadonlyArray<IEnergyLevel>, temperatureK: number): IPartitionFunction {
    if (levels.length === 0 || !(temperatureK > 0)) return { value: 0, levelCount: levels.length, topDecileShare: 0 };
    const ktEv = thermalEnergyEv(temperatureK);
    const sorted = levels.every((l, i) => i === 0 || levels[i - 1].energyEv <= l.energyEv) ? levels : [...levels].sort((a, b) => a.energyEv - b.energyEv);

    let total = 0;
    for (const l of sorted) total += l.weight * Math.exp(-l.energyEv / ktEv);

    const firstOfTopDecile = Math.floor(sorted.length * 0.9);
    let top = 0;
    for (let i = firstOfTopDecile; i < sorted.length; i++) top += sorted[i].weight * Math.exp(-sorted[i].energyEv / ktEv);

    return { value: total, levelCount: sorted.length, topDecileShare: total > 0 ? top / total : 0 };
}

/**
 * The Saha ratio n_II / n_I at a given electron density:
 *
 *     n_e n_II / n_I = 2 (U_II / U_I) (2 pi m_e k T / h^2)^(3/2) exp(-E_ion / kT)
 *
 * `electronDensityCm3` is in cm^-3 because that is the unit the whole
 * LIBS literature uses; it is converted to SI here, once.
 */
export function sahaRatio(partitionNeutral: number, partitionIon: number, ionisationEnergyEv: number, temperatureK: number, electronDensityCm3: number): number {
    const ne = electronDensityCm3 * 1e6; // cm^-3 -> m^-3
    if (!(ne > 0) || !(temperatureK > 0) || !(partitionNeutral > 0)) return 0;
    const kT = BOLTZMANN_CONSTANT * temperatureK;
    const thermalTerm = Math.pow((2 * Math.PI * ELECTRON_MASS * kT) / (PLANCK_CONSTANT * PLANCK_CONSTANT), 1.5);
    const boltzmann = Math.exp(-ionisationEnergyEv / thermalEnergyEv(temperatureK));
    return (2 * (partitionIon / partitionNeutral) * thermalTerm * boltzmann) / ne;
}

/**
 * Fraction of an element's atoms in each ionisation stage, from the
 * successive Saha ratios: `ratios[k]` is n(stage k+1) / n(stage k).
 *
 * The result has one entry more than `ratios` and sums to 1 by
 * construction, so it says how the atoms of this element are shared out
 * among the stages the data set covers, and nothing about stages beyond
 * them. A ratio that is not a finite number at or above zero ends the
 * chain there: the stages past it get nothing, which is the honest
 * answer when the ionisation energy or the level list for them is
 * missing.
 *
 * The products are formed cumulatively rather than stage by stage
 * because n(k) / n(0) is the product of the ratios up to k, and that is
 * what the normalisation needs.
 */
export function ionisationFractions(ratios: ReadonlyArray<number>): number[] {
    const relative = [1];
    for (const r of ratios) {
        if (!Number.isFinite(r) || r < 0) break;
        relative.push(relative[relative.length - 1] * r);
    }
    const total = relative.reduce((a, b) => a + b, 0);
    if (!(total > 0) || !Number.isFinite(total)) {
        // Every stage above the neutral overflowed, which means the
        // plasma is ionised past the deepest stage we carry. Saying so
        // is better than returning a NaN that would travel.
        const out = relative.map(() => 0);
        out[out.length - 1] = 1;
        return out;
    }
    const fractions = relative.map((r) => r / total);
    // The chain may have stopped early; the stages it never reached are
    // reported as empty rather than left undefined.
    while (fractions.length < ratios.length + 1) fractions.push(0);
    return fractions;
}

/** One line's physical emissivity, per unit total atom density. */
export interface IPhysicalLineIntensity {
    readonly line: IAtomicLine;
    /** eV per second per atom of the sample. See the module header. */
    readonly intensity: number;
    /** Fraction of the element in this ionisation stage. */
    readonly speciesFraction: number;
    /** Fraction of that species sitting on the line's upper level. */
    readonly upperLevelFraction: number;
}

/** What a physical computation did, and could not do, per element. */
export interface IPhysicalElementReport {
    readonly element: string;
    /** ASD names of the stages the data set does not carry, in order. */
    readonly missingSpecies: ReadonlyArray<string>;
    /** ASD names of the stages whose ionisation energy is missing, which
     *  is where the Saha chain had to stop. */
    readonly missingIonisationEnergy: ReadonlyArray<string>;
    /** U(T) per stage, index 0 being the neutral. */
    readonly partitionFunctions: ReadonlyArray<number>;
    /** The share of this element's atoms in each stage, summing to 1
     *  over the stages the data set covers. */
    readonly stageFractions: ReadonlyArray<number>;
    /** How deep the balance was solved: 1 means the neutral alone, 3
     *  means up to the doubly ionised atom. Below the number of stages
     *  the element has, the deeper stages' atoms are attributed to the
     *  stages below, and the result carries that error. */
    readonly stagesSolved: number;
    /** Worst top-decile share of any stage's partition function: large
     *  means a published level list stops too early for this
     *  temperature. */
    readonly partitionTopDecileShare: number;
}

export interface IPhysicalEmissionResult {
    readonly intensities: ReadonlyArray<IPhysicalLineIntensity>;
    readonly elements: ReadonlyArray<IPhysicalElementReport>;
    /** Elements with no species at all in the data set. */
    readonly missingElements: ReadonlyArray<string>;
}

/**
 * Physical emissivities for a composition.
 *
 * `atomFractions` is the mole (atom) fraction per element: a line is
 * emitted by atoms, not by mass.
 */
export function computePhysicalEmissions(
    atomFractions: Readonly<Record<string, number>>,
    data: IPhysicalModelData,
    temperatureK: number,
    electronDensityCm3: number,
    intensityScale: number
): IPhysicalEmissionResult {
    const intensities: IPhysicalLineIntensity[] = [];
    const reports: IPhysicalElementReport[] = [];
    const missing: string[] = [];
    const ktEv = thermalEnergyEv(temperatureK);

    for (const [element, fraction] of Object.entries(atomFractions)) {
        if (!(fraction > 0)) continue;

        const present = STAGES.map((k) => data.species.find((s) => s.element === element && s.ionisation === k));
        if (present.every((s) => s === undefined)) {
            missing.push(element);
            continue;
        }

        // The balance is a chain from the neutral upwards, and a Saha
        // ratio needs BOTH of the stages it connects, so the chain stops
        // at the first stage the data set does not carry. A data set
        // that starts above the neutral has no chain at all; then the
        // lowest stage it does carry takes everything, and the report
        // says which stages are missing.
        const chain: IPhysicalSpecies[] = [];
        for (const s of present) {
            if (!s) break;
            chain.push(s);
        }
        if (chain.length === 0) chain.push(present.find((s) => s !== undefined) as IPhysicalSpecies);

        const partitions = chain.map((s) => partitionFunction(s.levels, temperatureK));

        const ratios: number[] = [];
        const missingIonisationEnergy: string[] = [];
        for (let k = 0; k + 1 < chain.length; k++) {
            const energy = data.ionisationEnergiesEv[chain[k].asdName];
            if (typeof energy !== "number") {
                // Without the energy to strip the next electron there is
                // no ratio to compute, and guessing one would be worse
                // than stopping.
                missingIonisationEnergy.push(chain[k].asdName);
                break;
            }
            if (!(partitions[k].value > 0) || !(partitions[k + 1].value > 0)) break;
            ratios.push(sahaRatio(partitions[k].value, partitions[k + 1].value, energy, temperatureK, electronDensityCm3));
        }

        // One entry per stage the data set carries, so a chain that
        // stopped early reports the stages it never reached as empty
        // rather than leaving them off the end.
        const stageFractions = ionisationFractions(ratios);
        while (stageFractions.length < chain.length) stageFractions.push(0);

        for (let k = 0; k < chain.length; k++) {
            const u = partitions[k];
            const speciesFraction = stageFractions[k] ?? 0;
            if (!(u.value > 0) || !(speciesFraction > 0)) continue;

            for (const line of chain[k].lines) {
                const gk = line.upperLevelWeight;
                const ek = line.upperLevelEnergyEv;
                const aki = line.transitionProbability;
                if (gk === undefined || ek === undefined || aki === undefined) continue;
                const upperLevelFraction = (gk * Math.exp(-ek / ktEv)) / u.value;
                const intensity = intensityScale * fraction * speciesFraction * upperLevelFraction * aki * transitionEnergyEv(line);
                if (!(intensity > 0)) continue;
                intensities.push({ line, intensity, speciesFraction, upperLevelFraction });
            }
        }

        reports.push({
            element,
            missingSpecies: STAGES.filter((k) => present[k] === undefined).map((k) => `${element} ${STAGE_NUMERALS[k]}`),
            missingIonisationEnergy,
            partitionFunctions: partitions.map((u) => u.value),
            stageFractions,
            stagesSolved: ratios.length + 1,
            partitionTopDecileShare: partitions.reduce((m, u) => Math.max(m, u.topDecileShare), 0),
        });
    }

    return { intensities, elements: reports, missingElements: missing.sort() };
}

/**
 * Why a data set cannot support the physical model, or null when it
 * can. Mirrors `physicalModeBlocker` for the line catalogue: the model
 * refuses rather than guesses.
 */
export function physicalDataBlocker(data: IPhysicalModelData | undefined): string | null {
    if (!data) return "no level data: the physical model needs a complete level list and an ionisation energy per species";
    if (data.species.length === 0) return "the physical data set carries no species";
    const withoutLevels = data.species.filter((s) => s.levels.length === 0).map((s) => s.asdName);
    if (withoutLevels.length > 0) return `no level list for ${withoutLevels.join(", ")}`;
    if (Object.keys(data.ionisationEnergiesEv).length === 0) return "no ionisation energies: the Saha balance cannot be solved";
    return null;
}
