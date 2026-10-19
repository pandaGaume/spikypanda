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
 * 4. SAHA: the neutral / ion split at a given electron density. Only
 *    the first ionisation is solved; doubly ionised species are left
 *    out, which is reasonable below roughly 15 000 K for these
 *    elements and wrong above.
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
 *              * A_ki * E_photon(lambda)
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
 */
export function photonEnergyEv(wavelengthNm: number): number {
    if (!(wavelengthNm > 0)) return 0;
    return (PLANCK_CONSTANT * SPEED_OF_LIGHT) / (wavelengthNm * 1e-9 * ELEMENTARY_CHARGE);
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
 * Fraction of an element's atoms that are neutral and singly ionised,
 * from the Saha ratio. Doubly ionised species are not modelled, so the
 * two fractions sum to 1 by construction: above roughly 15 000 K for
 * these elements that is an understatement of the ionisation, and it is
 * on the list of this model's limits.
 */
export function ionisationFractions(sahaRatioValue: number): { neutral: number; singly: number } {
    if (!Number.isFinite(sahaRatioValue) || sahaRatioValue < 0) return { neutral: 1, singly: 0 };
    const neutral = 1 / (1 + sahaRatioValue);
    return { neutral, singly: 1 - neutral };
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

/** What a physical computation could not do, per element. */
export interface IPhysicalElementReport {
    readonly element: string;
    readonly missingSpecies: ReadonlyArray<string>;
    readonly missingIonisationEnergy: boolean;
    readonly partitionNeutral: number;
    readonly partitionIon: number;
    readonly neutralFraction: number;
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
        const neutral = data.species.find((s) => s.element === element && s.ionisation === 0);
        const ion = data.species.find((s) => s.element === element && s.ionisation === 1);
        if (!neutral && !ion) {
            missing.push(element);
            continue;
        }

        const uNeutral = neutral ? partitionFunction(neutral.levels, temperatureK) : { value: 0, levelCount: 0, topDecileShare: 0 };
        const uIon = ion ? partitionFunction(ion.levels, temperatureK) : { value: 0, levelCount: 0, topDecileShare: 0 };

        const ionisationKey = neutral?.asdName ?? `${element} I`;
        const eIon = data.ionisationEnergiesEv[ionisationKey];
        const haveBoth = !!neutral && !!ion && uNeutral.value > 0 && uIon.value > 0 && typeof eIon === "number";

        // With only one stage available, or no ionisation energy, the
        // balance cannot be solved: everything is attributed to the
        // stage we have, and the report says so.
        const ratio = haveBoth ? sahaRatio(uNeutral.value, uIon.value, eIon as number, temperatureK, electronDensityCm3) : 0;
        const fractions = haveBoth ? ionisationFractions(ratio) : { neutral: neutral ? 1 : 0, singly: neutral ? 0 : 1 };

        for (const species of [neutral, ion]) {
            if (!species) continue;
            const u = species.ionisation === 0 ? uNeutral : uIon;
            if (!(u.value > 0)) continue;
            const speciesFraction = species.ionisation === 0 ? fractions.neutral : fractions.singly;
            if (!(speciesFraction > 0)) continue;

            for (const line of species.lines) {
                const gk = line.upperLevelWeight;
                const ek = line.upperLevelEnergyEv;
                const aki = line.transitionProbability;
                if (gk === undefined || ek === undefined || aki === undefined) continue;
                const upperLevelFraction = (gk * Math.exp(-ek / ktEv)) / u.value;
                const intensity = intensityScale * fraction * speciesFraction * upperLevelFraction * aki * photonEnergyEv(line.wavelengthNm);
                if (!(intensity > 0)) continue;
                intensities.push({ line, intensity, speciesFraction, upperLevelFraction });
            }
        }

        reports.push({
            element,
            missingSpecies: [neutral ? null : `${element} I`, ion ? null : `${element} II`].filter((s): s is string => s !== null),
            missingIonisationEnergy: typeof eIon !== "number",
            partitionNeutral: uNeutral.value,
            partitionIon: uIon.value,
            neutralFraction: fractions.neutral,
            partitionTopDecileShare: Math.max(uNeutral.topDecileShare, uIon.topDecileShare),
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
