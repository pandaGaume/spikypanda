/**
 * Atomic line catalogue.
 *
 * What a catalogue entry is: one electronic transition of one species,
 * at one wavelength. An ELEMENT is a set of transitions, and a species
 * is an element in a given ionisation state: neutral iron (Fe I) and
 * singly ionised iron (Fe II) emit at different wavelengths and respond
 * differently to the plasma state. Writing "one band = one element" is
 * therefore wrong, and the data model refuses to let anyone write it:
 * a line carries its element AND its ionisation.
 *
 * PROVENANCE WARNING, and it is the point of this file. The built-in
 * catalogue below is a short list of strong lines commonly used in LIBS,
 * written from memory to make the MVP runnable. Every entry is flagged
 * `verified: false`. Consequences, enforced in code and not only in
 * documentation:
 *
 *   - the engine refuses to run in `physical` mode with unverified
 *     lines, because an absolute emission calculation needs `A_ki`,
 *     `g_k` and `E_k`, which no entry here carries;
 *   - `relative` mode runs, and its intensities are explicitly NOT
 *     physical: they are the catalogue's own relative strengths times
 *     the atom fraction of the element.
 *
 * Replacing this file with a NIST ASD download is milestone J1 of the
 * LIBS track, and test V1-A of the brief is exactly "do the positions
 * match NIST". Until then, a spectrum produced here is a plumbing
 * demonstration, not a prediction.
 */

/** Ionisation stage, spectroscopic convention: 0 = neutral (I). */
export type IonisationStage = 0 | 1 | 2;

/** One electronic transition. */
export interface IAtomicLine {
    /** Element symbol, as in `CHEMICAL_ELEMENTS`. */
    readonly element: string;
    /** 0 for Fe I, 1 for Fe II, 2 for Fe III. */
    readonly ionisation: IonisationStage;
    /** Wavelength in nanometres, in air. */
    readonly wavelengthNm: number;
    /** Relative strength WITHIN this element, strongest line = 1.
     *  Heuristic, not a transition probability. */
    readonly relativeStrength: number;
    /** False until the entry has been checked against a primary source.
     *  Gates `physical` mode. */
    readonly verified: boolean;
    /** Where the numbers come from, verbatim. */
    readonly provenance: string;
    /** Transition probability [1/s]. Absent in the built-in catalogue. */
    readonly transitionProbability?: number;
    /** Statistical weight of the upper level. Absent here. */
    readonly upperLevelWeight?: number;
    /** Upper level energy [eV]. Absent here, which is why no Boltzmann
     *  factor can be applied. */
    readonly upperLevelEnergyEv?: number;
    /** Lower level energy [eV]. Not needed to emit, needed to reabsorb:
     *  self-absorption reads the population of the LOWER level. */
    readonly lowerLevelEnergyEv?: number;
    /** Statistical weight of the lower level. Same reason. */
    readonly lowerLevelWeight?: number;
    /**
     * Collisional (Stark) FWHM [nm] of THIS line, stated at the one
     * reference electron density `STARK_REFERENCE_ELECTRON_DENSITY_CM3`
     * and scaled linearly from there, which is the convention both
     * sources publish.
     *
     * Absent when no source covers the line: the engine then falls back
     * to the plasma's single global coefficient, which is what every
     * line used before. The widths of the lines that do carry one span
     * a factor 26, so the fallback is a last resort and not a default.
     *
     * The reference density is deliberately NOT a per-line field. Every
     * value was normalised to one density before it entered the
     * catalogue, and a second per-line density would be a second way to
     * get the scaling wrong. See `internals/libs/15-STARK-COEFFICIENTS.md`.
     */
    readonly collisionalWidthNm?: number;
    /** Which tier `collisionalWidthNm` came from, so an error budget
     *  can read it instead of assuming one number: a measurement is
     *  worth 15 to 50 % and a calculation 20 to 50 %. */
    readonly collisionalWidthSource?: CollisionalWidthSource;
    /** Temperature [K] the collisional width was stated at. The width
     *  moves by about 11 % over 10 000 to 16 000 K, so this is a flag
     *  for extrapolation rather than an interpolation axis. */
    readonly collisionalWidthTemperatureK?: number;
}

/** Where a per-line collisional width came from. */
export type CollisionalWidthSource = "measured" | "calculated";

/**
 * The electron density [cm^-3] every per-line collisional width in the
 * catalogue is stated at. One constant for the whole table.
 *
 * It matches `stark.reference_electron_density` in
 * `internals/libs/parameters/libs-parameters.json`.
 */
export const STARK_REFERENCE_ELECTRON_DENSITY_CM3 = 1e17;

/**
 * The temperature range [K] over which the per-line widths are
 * supported by their sources: the measurements sit between 9 700 and
 * 15 000 K, and the temperature sensitivity of the width was measured
 * over 10 000 to 16 000 K at 11 % on average and 20 % at worst.
 *
 * Outside it a width is an extrapolation, and a caller that cares
 * should say so rather than extrapolate silently.
 */
export const STARK_SUPPORTED_TEMPERATURE_K: readonly [number, number] = Object.freeze([10000, 16000]);

/** Spectroscopic label: `Fe I`, `Ca II`. */
export function speciesLabel(line: IAtomicLine): string {
    const numeral = line.ionisation === 0 ? "I" : line.ionisation === 1 ? "II" : "III";
    return `${line.element} ${numeral}`;
}

const UNVERIFIED = "written from memory 2026-10-19, to replace with a NIST ASD download";

const line = (element: string, ionisation: IonisationStage, wavelengthNm: number, relativeStrength: number): IAtomicLine =>
    Object.freeze({ element, ionisation, wavelengthNm, relativeStrength, verified: false, provenance: UNVERIFIED });

/**
 * Built-in catalogue: strong lines of the elements that show up in rock,
 * soil and alloy analysis. Ordered by wavelength within each element so
 * a reader can scan it; the engine does not depend on the order.
 */
export const BUILTIN_LINE_CATALOGUE: ReadonlyArray<IAtomicLine> = Object.freeze([
    // Hydrogen: Balmer alpha and beta.
    line("H", 0, 486.13, 0.4),
    line("H", 0, 656.28, 1.0),

    // Carbon.
    line("C", 0, 247.86, 1.0),

    // Oxygen: the 777 nm triplet.
    line("O", 0, 777.19, 1.0),
    line("O", 0, 777.42, 0.9),
    line("O", 0, 777.54, 0.8),
    line("O", 0, 844.64, 0.5),

    // Sodium: the D doublet.
    line("Na", 0, 588.995, 1.0),
    line("Na", 0, 589.592, 0.8),

    // Magnesium: the 279/280 ion pair and the 285 neutral.
    line("Mg", 1, 279.55, 1.0),
    line("Mg", 1, 280.27, 0.8),
    line("Mg", 0, 285.21, 0.9),
    line("Mg", 0, 383.83, 0.3),
    line("Mg", 0, 518.36, 0.2),

    // Aluminium.
    line("Al", 0, 308.22, 0.8),
    line("Al", 0, 309.27, 0.7),
    line("Al", 0, 394.4, 1.0),
    line("Al", 0, 396.15, 0.95),

    // Silicon.
    line("Si", 0, 251.61, 0.9),
    line("Si", 0, 288.16, 1.0),
    line("Si", 0, 390.55, 0.4),

    // Potassium.
    line("K", 0, 766.49, 1.0),
    line("K", 0, 769.9, 0.8),

    // Calcium: the H and K ion lines, the 422 neutral, the IR triplet.
    line("Ca", 1, 393.37, 1.0),
    line("Ca", 1, 396.85, 0.9),
    line("Ca", 0, 422.67, 0.8),
    line("Ca", 0, 445.48, 0.2),
    line("Ca", 1, 849.8, 0.4),
    line("Ca", 1, 854.21, 0.5),
    line("Ca", 1, 866.21, 0.4),

    // Titanium.
    line("Ti", 1, 334.94, 1.0),
    line("Ti", 0, 365.35, 0.6),

    // Chromium.
    line("Cr", 0, 425.43, 1.0),
    line("Cr", 0, 427.48, 0.9),
    line("Cr", 0, 428.97, 0.8),

    // Manganese: the 403 triplet.
    line("Mn", 0, 403.08, 1.0),
    line("Mn", 0, 403.31, 0.8),
    line("Mn", 0, 403.45, 0.7),

    // Iron.
    line("Fe", 1, 259.94, 0.7),
    line("Fe", 0, 371.99, 0.9),
    line("Fe", 0, 404.58, 1.0),
    line("Fe", 0, 438.35, 0.8),

    // Nickel.
    line("Ni", 0, 341.48, 1.0),
    line("Ni", 0, 352.45, 0.8),

    // Copper.
    line("Cu", 0, 324.75, 1.0),
    line("Cu", 0, 327.4, 0.8),

    // Strontium.
    line("Sr", 1, 407.77, 1.0),
    line("Sr", 1, 421.55, 0.7),

    // Barium.
    line("Ba", 1, 455.4, 1.0),
    line("Ba", 1, 493.41, 0.7),

    // Lead.
    line("Pb", 0, 405.78, 1.0),
]);

/** Elements the built-in catalogue covers, sorted alphabetically. */
export const BUILTIN_CATALOGUE_ELEMENTS: ReadonlyArray<string> = Object.freeze([...new Set(BUILTIN_LINE_CATALOGUE.map((l) => l.element))].sort());

/** Lines of one element, optionally restricted to one ionisation stage. */
export function linesOfElement(catalogue: ReadonlyArray<IAtomicLine>, element: string, ionisation?: IonisationStage): ReadonlyArray<IAtomicLine> {
    return catalogue.filter((l) => l.element === element && (ionisation === undefined || l.ionisation === ionisation));
}

/** Lines falling inside a wavelength window, bounds included. */
export function linesInRange(catalogue: ReadonlyArray<IAtomicLine>, startNm: number, endNm: number): ReadonlyArray<IAtomicLine> {
    return catalogue.filter((l) => l.wavelengthNm >= startNm && l.wavelengthNm <= endNm);
}

/**
 * Why a catalogue cannot support an absolute emission calculation, or
 * null when it can. The engine calls this before allowing `physical`
 * mode, so the refusal is structural rather than a comment.
 */
export function physicalModeBlocker(catalogue: ReadonlyArray<IAtomicLine>): string | null {
    const unverified = catalogue.filter((l) => !l.verified).length;
    if (unverified > 0) {
        return `${unverified} of ${catalogue.length} lines are unverified (provenance: "${catalogue.find((l) => !l.verified)?.provenance}")`;
    }
    const incomplete = catalogue.filter((l) => l.transitionProbability === undefined || l.upperLevelWeight === undefined || l.upperLevelEnergyEv === undefined).length;
    if (incomplete > 0) {
        return `${incomplete} of ${catalogue.length} lines lack transitionProbability, upperLevelWeight or upperLevelEnergyEv`;
    }
    return null;
}
