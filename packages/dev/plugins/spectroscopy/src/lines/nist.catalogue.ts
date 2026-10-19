/**
 * The catalogue the plugin ships: NIST ASD data, verified, with its
 * provenance attached.
 *
 * `nist-catalogue.data.ts` is generated, never hand-edited. It is produced
 * by `tools/build-nist-catalogue.mjs` from the exports listed in
 * `internals/libs/data/MANIFEST.md`, and it records the sha256 of
 * every export it was parsed from. Regenerating it is how the catalogue
 * changes; editing it by hand would break the only link between a
 * spectrum and the data behind it.
 *
 * What is in it, and what that allows:
 *
 *   - 7 621 transitions over six species (Ca I, Ca II, Fe I, Fe II,
 *     Si I, Si II), each with its wavelength in air, its transition
 *     probability, and the energy and statistical weight of both
 *     levels. That is exactly what the physical emission model needs,
 *     so `physicalModeBlocker` lets these species through;
 *   - the complete level list of each species, which a partition
 *     function sums over. It is a separate export because the lines
 *     alone only cover the levels that happen to radiate in the window;
 *   - the first and second ionisation energies, which close the Saha
 *     balance.
 *
 * What is still missing, and still blocks: Stark broadening
 * coefficients, which ASD does not publish in this form, so the
 * collisional width stays a single global coefficient; and every
 * element outside these three.
 */

import { NIST_CATALOGUE_RAW } from "./nist-catalogue.data.js";
import type { IAtomicLine, IonisationStage } from "./lines.catalog.js";
import type { IEnergyLevel } from "./nist.parse.js";
import type { INistSpeciesBlock } from "./nist.raw.js";

/** Everything that says where this catalogue comes from. */
export interface INistProvenance {
    readonly database: string;
    readonly version: string;
    readonly dataUpdate: string;
    readonly doi: string;
    readonly downloadedOn: string;
    readonly citation: string;
    readonly wavelengthMedium: string;
    readonly wavelengthRangeNm: ReadonlyArray<number>;
    readonly linesFilter: string;
    readonly generatedBy: string;
    readonly manifest: string;
}

/** A species as the physical model consumes it. */
export interface INistSpecies {
    readonly element: string;
    readonly ionisation: IonisationStage;
    /** Spectroscopic name, ASD spelling: `Fe II`. */
    readonly asdName: string;
    readonly lines: ReadonlyArray<IAtomicLine>;
    /** Complete level list, for the partition function. */
    readonly levels: ReadonlyArray<IEnergyLevel>;
    /** Where the level list stops being a bound spectrum [eV]. */
    readonly ionisationLimitEv: number | null;
    readonly sourceSha256: { readonly lines: string; readonly levels: string };
}

const raw = NIST_CATALOGUE_RAW;

export const NIST_PROVENANCE: INistProvenance = Object.freeze(raw.provenance);

/**
 * First (and where available second) ionisation energy [eV], keyed by
 * the ASD species name. `Ca I` is the energy to ionise NEUTRAL calcium,
 * which is the one the first Saha balance needs.
 */
export const NIST_IONISATION_ENERGIES_EV: Readonly<Record<string, number>> = Object.freeze({ ...raw.ionisationEnergiesEv });

function buildSpecies(block: INistSpeciesBlock): INistSpecies {
    const provenance = `${NIST_PROVENANCE.database} ${NIST_PROVENANCE.version}, ${block.asdName}, sha256 ${block.source.lines.sha256.slice(0, 12)}`;
    const lines: IAtomicLine[] = block.lines.map((row) =>
        Object.freeze({
            element: block.element,
            ionisation: block.ionisation as IonisationStage,
            wavelengthNm: row[0] as number,
            transitionProbability: row[1] as number,
            upperLevelEnergyEv: row[2] as number,
            upperLevelWeight: row[3] as number,
            lowerLevelEnergyEv: (row[4] ?? undefined) as number | undefined,
            lowerLevelWeight: (row[5] ?? undefined) as number | undefined,
            // Within-species ordering for the `relative` model; the
            // physical model never reads it.
            relativeStrength: 1,
            verified: true,
            provenance,
        })
    );
    // Normalise the heuristic strength within the species, as the
    // generator does for the parsed form.
    let maxStrength = 0;
    for (const l of lines) maxStrength = Math.max(maxStrength, (l.transitionProbability ?? 0) * (l.upperLevelWeight ?? 0));
    const scaled = lines.map((l) =>
        Object.freeze({ ...l, relativeStrength: maxStrength > 0 ? ((l.transitionProbability ?? 0) * (l.upperLevelWeight ?? 0)) / maxStrength : 1 })
    );

    return Object.freeze({
        element: block.element,
        ionisation: block.ionisation as IonisationStage,
        asdName: block.asdName,
        lines: Object.freeze(scaled),
        levels: Object.freeze(block.levels.map((l) => Object.freeze({ energyEv: l[0], weight: l[1] }))),
        ionisationLimitEv: block.ionisationLimitEv,
        sourceSha256: Object.freeze({ lines: block.source.lines.sha256, levels: block.source.levels.sha256 }),
    });
}

/** Every species the shipped catalogue carries. */
export const NIST_SPECIES: ReadonlyArray<INistSpecies> = Object.freeze(raw.species.map(buildSpecies));

/** Every line of every species, flattened, sorted by wavelength. */
export const NIST_LINE_CATALOGUE: ReadonlyArray<IAtomicLine> = Object.freeze(
    NIST_SPECIES.flatMap((s) => s.lines)
        .slice()
        .sort((a, b) => a.wavelengthNm - b.wavelengthNm)
);

/** Elements the catalogue can emit, sorted. */
export const NIST_CATALOGUE_ELEMENTS: ReadonlyArray<string> = Object.freeze([...new Set(NIST_SPECIES.map((s) => s.element))].sort());

/** The species block for an element and ionisation stage, if present. */
export function nistSpecies(element: string, ionisation: IonisationStage): INistSpecies | undefined {
    return NIST_SPECIES.find((s) => s.element === element && s.ionisation === ionisation);
}
