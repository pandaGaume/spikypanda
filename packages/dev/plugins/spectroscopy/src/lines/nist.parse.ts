/**
 * Readers for the three NIST Atomic Spectra Database exports this track
 * uses: spectral lines, energy levels, ionisation energies.
 *
 * Pure functions over text. Nothing here touches the file system, so the
 * same code runs in a test, in a Node script and in the browser bundle;
 * whoever has the bytes passes them in.
 *
 * ONE RULE ABOVE ALL: read the columns BY NAME, from the header line.
 * The column set is not the same from one species to the next, because
 * ASD only emits an uncertainty column when it has uncertainties. Fe I
 * and Fe II carry `unc_obs_wl` and `unc_ritz_wl`, Ca I and Si I do not.
 * Reading by position works on the file you tested and silently reads
 * the wrong column on the next one.
 *
 * Wavelengths are AIR wavelengths above 200 nm, which is what the query
 * asked for and what a spectrometer calibrated in air reports. Below
 * 200 nm ASD switches to vacuum, so a window that crosses 200 nm needs
 * both columns and a conversion. The MVP window starts at 200 nm.
 */

import type { IAtomicLine, IonisationStage } from "./lines.catalog.js";

/** One energy level of a species: what a partition function sums over. */
export interface IEnergyLevel {
    /** Statistical weight, g = 2J + 1. */
    readonly weight: number;
    /** Level energy above the ground state [eV]. */
    readonly energyEv: number;
}

/** What `parseNistLines` could not use, and why. */
export interface INistParseReport {
    readonly kept: number;
    readonly skippedNoWavelength: number;
    readonly skippedNoTransitionProbability: number;
    readonly skippedNoUpperLevel: number;
    readonly skippedUnparsable: number;
}

export interface INistLinesResult {
    readonly lines: ReadonlyArray<IAtomicLine>;
    readonly report: INistParseReport;
}

/** Strip the quotes ASD wraps most fields in, and the surrounding space. */
function unquote(field: string): string {
    const t = field.trim();
    return t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1).trim() : t;
}

/**
 * A number out of an ASD field, or null.
 *
 * ASD decorates values it wants read with caution: square brackets for
 * an interpolated or theoretical value, parentheses for a questionable
 * one, a `+x` suffix for a level known only relative to an unknown
 * offset. Brackets and parentheses are stripped, because the value is
 * still the best estimate available; anything else non-numeric is a
 * refusal, because guessing at a format is how a wrong number enters a
 * physical model.
 */
export function parseNistNumber(field: string): number | null {
    let t = unquote(field);
    if (t.length === 0) return null;
    t = t.replace(/[[\]()]/g, "").trim();
    if (t.length === 0) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
}

/** Split a tab-delimited export into a header and its data rows. */
function readTable(text: string): { header: string[]; rows: string[][] } | null {
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return null;
    const header = lines[0].split("\t").map((h) => unquote(h));
    const rows = lines.slice(1).map((l) => l.split("\t"));
    return { header, rows };
}

/** Index of the first header present, or -1. */
function columnOf(header: string[], ...names: string[]): number {
    for (const name of names) {
        const i = header.indexOf(name);
        if (i >= 0) return i;
    }
    return -1;
}

/**
 * Parse an ASD "Lines" export for ONE species.
 *
 * `element` and `ionisation` are supplied by the caller rather than read
 * from the file: the export does not repeat the species on every row,
 * and a file is always requested one species at a time.
 *
 * A line is kept only when it carries everything an emission
 * calculation needs: a wavelength, a transition probability, an upper
 * level energy and an upper level statistical weight. The rest are
 * counted in the report instead of being dropped in silence, because
 * "this species lost 40 % of its lines" is something the reader of a
 * spectrum has to be able to find out.
 *
 * `relativeStrength` is filled with `A_ki * g_k`, normalised to 1 within
 * the species. It is a heuristic ordering for the `relative` emission
 * model, NOT a physical intensity: the physical model ignores it and
 * uses `A_ki`, `g_k` and `E_k` directly.
 */
export function parseNistLines(text: string, element: string, ionisation: IonisationStage, provenance: string): INistLinesResult {
    const table = readTable(text);
    const empty: INistParseReport = { kept: 0, skippedNoWavelength: 0, skippedNoTransitionProbability: 0, skippedNoUpperLevel: 0, skippedUnparsable: 0 };
    if (!table) return { lines: [], report: empty };

    const { header, rows } = table;
    const iObs = columnOf(header, "obs_wl_air(nm)", "obs_wl_vac(nm)");
    const iRitz = columnOf(header, "ritz_wl_air(nm)", "ritz_wl_vac(nm)");
    const iAki = columnOf(header, "Aki(s^-1)");
    const iEk = columnOf(header, "Ek(eV)");
    const iGk = columnOf(header, "g_k");
    const iEi = columnOf(header, "Ei(eV)");
    const iGi = columnOf(header, "g_i");
    const iAcc = columnOf(header, "Acc");

    const out: Array<IAtomicLine & { _strength: number }> = [];
    let noWavelength = 0;
    let noAki = 0;
    let noUpper = 0;
    let unparsable = 0;

    for (const row of rows) {
        // The notes block ASD appends after the table has no tabs.
        if (row.length < 3) {
            unparsable++;
            continue;
        }
        const wl = (iObs >= 0 ? parseNistNumber(row[iObs] ?? "") : null) ?? (iRitz >= 0 ? parseNistNumber(row[iRitz] ?? "") : null);
        if (wl === null || wl <= 0) {
            noWavelength++;
            continue;
        }
        const aki = iAki >= 0 ? parseNistNumber(row[iAki] ?? "") : null;
        if (aki === null || aki <= 0) {
            noAki++;
            continue;
        }
        const ek = iEk >= 0 ? parseNistNumber(row[iEk] ?? "") : null;
        const gk = iGk >= 0 ? parseNistNumber(row[iGk] ?? "") : null;
        if (ek === null || gk === null || gk <= 0) {
            noUpper++;
            continue;
        }
        const ei = iEi >= 0 ? parseNistNumber(row[iEi] ?? "") : null;
        const gi = iGi >= 0 ? parseNistNumber(row[iGi] ?? "") : null;
        const accuracy = iAcc >= 0 ? unquote(row[iAcc] ?? "") : "";

        out.push({
            element,
            ionisation,
            wavelengthNm: wl,
            relativeStrength: 1,
            verified: true,
            provenance: accuracy.length > 0 ? `${provenance}, A_ki accuracy ${accuracy}` : provenance,
            transitionProbability: aki,
            upperLevelWeight: gk,
            upperLevelEnergyEv: ek,
            lowerLevelEnergyEv: ei ?? undefined,
            lowerLevelWeight: gi ?? undefined,
            _strength: aki * gk,
        });
    }

    const maxStrength = out.reduce((m, l) => Math.max(m, l._strength), 0);
    const lines = out.map(({ _strength, ...line }) => Object.freeze({ ...line, relativeStrength: maxStrength > 0 ? _strength / maxStrength : 1 }));

    return {
        lines,
        report: { kept: lines.length, skippedNoWavelength: noWavelength, skippedNoTransitionProbability: noAki, skippedNoUpperLevel: noUpper, skippedUnparsable: unparsable },
    };
}

/**
 * Parse an ASD "Levels" export: the complete level list of a species,
 * which is what a partition function sums over.
 *
 * The last row of an ASD level export is the ionisation limit, marked by
 * `---` in the J column; it is not a level and is dropped. Levels whose
 * energy or weight cannot be read are dropped too, and the count is
 * returned so the caller can judge the truncation.
 */
export function parseNistLevels(text: string): { levels: ReadonlyArray<IEnergyLevel>; skipped: number; ionisationLimitEv: number | null } {
    const table = readTable(text);
    if (!table) return { levels: [], skipped: 0, ionisationLimitEv: null };

    const { header, rows } = table;
    const iJ = columnOf(header, "J");
    const iG = columnOf(header, "g");
    const iLevel = columnOf(header, "Level (eV)", "Level(eV)");

    const levels: IEnergyLevel[] = [];
    let skipped = 0;
    let limit: number | null = null;

    for (const row of rows) {
        const j = iJ >= 0 ? unquote(row[iJ] ?? "") : "";
        const energy = iLevel >= 0 ? parseNistNumber(row[iLevel] ?? "") : null;
        if (j === "---") {
            // The ionisation limit, useful on its own: it says where the
            // level list stops being a bound spectrum.
            limit = energy;
            continue;
        }
        const g = iG >= 0 ? parseNistNumber(row[iG] ?? "") : null;
        if (energy === null || g === null || g <= 0) {
            skipped++;
            continue;
        }
        levels.push(Object.freeze({ weight: g, energyEv: energy }));
    }

    return { levels, skipped, ionisationLimitEv: limit };
}

/**
 * Parse an ASD "Ionization Energies" export into a map keyed by the
 * spectroscopic name as ASD writes it: `Ca I`, `Fe II`, ...
 *
 * `Ca I` is the energy needed to turn NEUTRAL calcium into Ca II, which
 * is the one Saha needs for the first ionisation. Naming it after the
 * species being ionised, not the one produced, is the ASD convention and
 * the usual source of an off-by-one-stage error.
 */
export function parseNistIonizationEnergies(text: string): Readonly<Record<string, number>> {
    const table = readTable(text);
    if (!table) return {};
    const { header, rows } = table;
    const iName = columnOf(header, "Sp. Name");
    const iEnergy = columnOf(header, "Ionization Energy (eV)", "Ionization Energy (a) (eV)");
    if (iName < 0 || iEnergy < 0) return {};

    const out: Record<string, number> = {};
    for (const row of rows) {
        const name = unquote(row[iName] ?? "");
        const energy = parseNistNumber(row[iEnergy] ?? "");
        if (name.length === 0 || energy === null) continue;
        out[name] = energy;
    }
    return Object.freeze(out);
}
