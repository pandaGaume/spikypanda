/**
 * LIBS forward model, the pure part.
 *
 * No graph, no editor, no DOM: this module takes numbers and returns
 * numbers, so it runs in Node, in a test, and inside a node's `fire()`
 * without change. The graph nodes in this plugin are thin wrappers over
 * the functions below.
 *
 * What the model does, and what it refuses to do
 * ----------------------------------------------
 * The chain is: elemental composition, then one emission amplitude per
 * atomic line, then a line profile, then the instrument, then noise.
 *
 * Two emission models, and the difference matters:
 *
 *   `relative`  amplitude = intensityScale x atomFraction(element)
 *               x line.relativeStrength. This is NOT physics: it is a
 *               plumbing-grade placeholder that lets the chain run and
 *               be tested. It has no temperature dependence, because a
 *               Boltzmann factor needs upper-level energies the
 *               catalogue does not carry. Ionisation stages are emitted
 *               side by side with their catalogue strengths: there is no
 *               Saha balance either.
 *
 *   `physical`  the Boltzmann / Saha / transition-probability chain of
 *               `internals/libs/02-LIBS-FORWARD-MODEL.md`. It is NOT
 *               implemented, and asking for it returns a refusal naming
 *               what is missing rather than a number. The refusal is
 *               structural: see `physicalModeBlocker`.
 *
 * Temperature and electron density are not decoration even in
 * `relative` mode: they set the line WIDTHS, through Doppler broadening
 * (from T and the element's atomic mass, a standard formula) and through
 * a collisional width proportional to electron density (one global
 * coefficient, because per-line Stark coefficients are tabulated data
 * this track does not have yet). So the shape responds to the plasma
 * state while the intensities stay relative, and no part of the output
 * pretends to be more than it is.
 *
 * Deliberately absent, each one an entry in the approximation list of
 * the track's model document: self-absorption, plasma inhomogeneity,
 * time evolution, molecular bands, ablation fractionation, and a
 * wavelength-dependent instrument efficiency.
 *
 * Three curves are kept separate, as the brief requires: `ideal` (lines
 * plus continuum, Doppler and collisional widths only), `instrumented`
 * (the same with the slit function folded in, times gain, plus offset)
 * and `measured` (instrumented plus noise). Subtracting two of them is
 * how a user sees what a stage did.
 */

import { CHEMICAL_ELEMENTS } from "spikypanda-core";
import { STARK_REFERENCE_ELECTRON_DENSITY_CM3, physicalModeBlocker, speciesLabel } from "../lines/lines.catalog.js";
import type { IAtomicLine } from "../lines/lines.catalog.js";
import { computePhysicalEmissions, physicalDataBlocker } from "./physical.js";
import type { IPhysicalElementReport, IPhysicalModelData } from "./physical.js";

/** Which emission model to use. See the module header. */
export type EmissionModel = "relative" | "physical";

/** Plasma-side parameters. */
export interface IPlasmaParameters {
    /** Excitation temperature [K]. Drives Doppler width; drives nothing
     *  else in `relative` mode. */
    readonly temperatureK: number;
    /** Electron density [cm^-3]. Scales the collisional width. */
    readonly electronDensityCm3: number;
    /** Electron density at which `collisionalWidthNm` is stated. */
    readonly referenceElectronDensityCm3: number;
    /** Collisional (Stark-like) FWHM [nm] at the reference density. One
     *  global number, not per line: a placeholder for tabulated Stark
     *  coefficients. */
    readonly collisionalWidthNm: number;
    /** Global amplitude multiplier. */
    readonly intensityScale: number;
    /** Flat continuum level, in the same relative units as the lines. */
    readonly continuumLevel: number;
    readonly emissionModel: EmissionModel;
}

/** Instrument-side parameters. */
export interface IInstrumentParameters {
    readonly rangeStartNm: number;
    readonly rangeEndNm: number;
    readonly pixelCount: number;
    /** FWHM [nm] of the slit function, modelled as a Gaussian. */
    readonly resolutionFwhmNm: number;
    /**
     * Systematic wavelength-calibration error [nm]. It belongs to the
     * INSTRUMENT, so it displaces the lines of the `instrumented` and
     * `measured` curves while leaving `ideal` where the physics puts
     * them. Plotting the two together is then a direct read of the
     * calibration error, which is one of the things test V1-A of the
     * brief has to separate from a model error.
     */
    readonly calibrationShiftNm: number;
    readonly gain: number;
    readonly offset: number;
    readonly noiseEnabled: boolean;
    /** Multiplicative shot-noise strength: sigma = sqrt(signal x factor). */
    readonly shotNoiseFactor: number;
    /** Additive read noise, standard deviation in output units. */
    readonly readNoise: number;
    /** PRNG seed. Same seed, same noise, always. */
    readonly seed: number;
}

/** One line's emission amplitude, before any profile is applied. */
export interface ILineEmission {
    readonly element: string;
    /** `Fe I`, `Ca II`, ... */
    readonly species: string;
    readonly wavelengthNm: number;
    /** Amplitude in relative units (area under the line). */
    readonly intensity: number;
    /** Gaussian FWHM [nm] from Doppler broadening at this temperature. */
    readonly dopplerFwhmNm: number;
    /**
     * Lorentz FWHM [nm] from collisions, for THIS line, already scaled
     * to the plasma's electron density.
     *
     * Absent when no source covers the line, and then the caller's
     * single global coefficient applies, which is what every line used
     * before. It sits beside `dopplerFwhmNm` on purpose: a profile
     * needs both halves per line, and the Doppler half has been per
     * line since the beginning.
     */
    readonly collisionalFwhmNm?: number;
    readonly provenance: string;
}

/** The simulation output. */
export interface ILibsSimulation {
    /** Wavelength axis [nm], calibration shift included. */
    readonly wavelengthNm: Float64Array;
    /** Lines plus continuum, without the instrument. */
    readonly ideal: Float32Array;
    /** Ideal folded with the slit function, times gain, plus offset. */
    readonly instrumented: Float32Array;
    /** The noise sample alone, so it can be plotted or subtracted. */
    readonly noise: Float32Array;
    /** instrumented + noise. What a detector would report. */
    readonly measured: Float32Array;
    /** Per-line amplitudes that produced the curves. */
    readonly lines: ReadonlyArray<ILineEmission>;
    /** Deterministic identifier of (composition, parameters, catalogue). */
    readonly simulationId: string;
    readonly seed: number;
    /** `"relative"` or `"counts"`. Never an absolute radiometric unit at
     *  this milestone. */
    readonly unit: string;
    /** Non-null when the requested model could not be run. The curves
     *  are then all continuum-and-noise only, never a fallback guess. */
    readonly blocker: string | null;
    readonly emissionModel: EmissionModel;
}

/**
 * What a plasma emits: a line list, not a sampled curve.
 *
 * This is the boundary between the two nodes of the chain, and it is a
 * physical boundary, not a convenience: a plasma emits transitions at
 * their own wavelengths, and it is the INSTRUMENT that decides which
 * window is observed, at which resolution, onto how many pixels. Having
 * the plasma produce a sampled spectrum would force it to carry grid
 * parameters it has no business knowing.
 *
 * `missingElements` lists elements the composition asked for and the
 * catalogue cannot emit, because "no line appeared for magnesium" is
 * information, not an empty result.
 */
export interface IPlasmaEmission {
    readonly lines: ReadonlyArray<ILineEmission>;
    readonly missingElements: ReadonlyArray<string>;
    readonly blocker: string | null;
    /** The state that produced these amplitudes and widths. */
    readonly plasma: IPlasmaParameters;
    /** Atom fraction per element, carried for traceability. */
    readonly atomFractions: Readonly<Record<string, number>>;
    /** Where the composition came from. */
    readonly provenance: string;
    /** Per element, what the physical model did: partition functions,
     *  neutral fraction, and how much of the partition sum sits in the
     *  top decile of the published level list. Empty in relative mode. */
    readonly elementReports: ReadonlyArray<IPhysicalElementReport>;
    /** Unit of the intensities, which is NOT the same in the two
     *  models: "relative" carries no physics, "eV/s per atom" carries
     *  physical ratios with an unknown overall scale. */
    readonly intensityUnit: string;
}

/** Structural guard for a payload read off a cable. */
export function isPlasmaEmission(v: unknown): v is IPlasmaEmission {
    if (!v || typeof v !== "object") return false;
    const e = v as Partial<IPlasmaEmission>;
    return Array.isArray(e.lines) && Array.isArray(e.missingElements) && !!e.plasma && typeof e.plasma === "object";
}

const FWHM_PER_SIGMA = 2 * Math.sqrt(2 * Math.LN2);

/**
 * The two intensity units, which are two different claims.
 *
 * `relative`: composition times a catalogue strength. No physics in the
 * ratios, and none claimed.
 * `eV/s per atom`: the optically thin emissivity per unit total atom
 * density, without the 1/4 pi solid angle. Every ratio is physical, the
 * overall scale is not, because nothing fixes how many atoms the laser
 * ablated.
 */
export const RELATIVE_INTENSITY_UNIT = "relative";
export const PHYSICAL_INTENSITY_UNIT = "eV/s per atom";

/**
 * Doppler FWHM [nm] of a line emitted by an atom of molar mass `M`
 * [kg/mol] in a plasma at `T` [K]:
 *
 *     dLambda = 7.16e-7 x lambda x sqrt(T / M_amu)
 *
 * with `M_amu` the atomic mass in unified mass units. The coefficient is
 * the usual tabulated form; it is marked `a_sourcer` in the track's
 * parameter file until checked against a primary source.
 */
export function dopplerFwhmNm(wavelengthNm: number, temperatureK: number, molarMassKgPerMol: number): number {
    const amu = molarMassKgPerMol * 1000;
    if (amu <= 0 || temperatureK <= 0) return 0;
    return 7.16e-7 * wavelengthNm * Math.sqrt(temperatureK / amu);
}

/** Area-normalised Gaussian of given FWHM. */
export function gaussian(dx: number, fwhm: number): number {
    if (fwhm <= 0) return 0;
    const sigma = fwhm / FWHM_PER_SIGMA;
    return Math.exp(-(dx * dx) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
}

/** Area-normalised Lorentzian of given FWHM. */
export function lorentzian(dx: number, fwhm: number): number {
    if (fwhm <= 0) return 0;
    const gamma = fwhm / 2;
    return gamma / (Math.PI * (dx * dx + gamma * gamma));
}

/**
 * Total FWHM of the pseudo-Voigt that approximates the convolution of a
 * Gaussian of FWHM `fG` with a Lorentzian of FWHM `fL`, by the
 * Thompson, Cox and Hastings relation. Exact in both limits.
 */
export function pseudoVoigtFwhm(fG: number, fL: number): number {
    if (fG <= 0) return fL;
    if (fL <= 0) return fG;
    const g = fG;
    const l = fL;
    return Math.pow(g ** 5 + 2.69269 * g ** 4 * l + 2.42843 * g ** 3 * l ** 2 + 4.47163 * g ** 2 * l ** 3 + 0.07842 * g * l ** 4 + l ** 5, 1 / 5);
}

/**
 * Area-normalised pseudo-Voigt profile: the standard linear blend of a
 * Lorentzian and a Gaussian of the same total width, with the mixing
 * parameter of Thompson, Cox and Hastings.
 *
 * Why not a true Voigt: the exact profile is the real part of the
 * complex Faddeeva function, which needs a careful implementation. The
 * pseudo-Voigt is accurate to about one percent in shape, which is well
 * below every other approximation in this model. When the track gets to
 * line-shape fitting against real spectra, this is the first thing to
 * replace, and the module header of the track's model document says so.
 */
export function pseudoVoigt(dx: number, gaussianFwhm: number, lorentzFwhm: number): number {
    if (gaussianFwhm <= 0 && lorentzFwhm <= 0) return 0;
    if (lorentzFwhm <= 0) return gaussian(dx, gaussianFwhm);
    if (gaussianFwhm <= 0) return lorentzian(dx, lorentzFwhm);
    const f = pseudoVoigtFwhm(gaussianFwhm, lorentzFwhm);
    const r = lorentzFwhm / f;
    const eta = 1.36603 * r - 0.47719 * r * r + 0.11116 * r * r * r;
    return eta * lorentzian(dx, f) + (1 - eta) * gaussian(dx, f);
}

/**
 * Per-line emission amplitudes for a composition.
 *
 * `atomFractions` is the material's mole (atom) fraction per element,
 * which is what an emission model needs: a line is emitted by atoms, not
 * by mass. Elements absent from the catalogue are reported in
 * `missingElements` rather than dropped silently, because "this element
 * produced no line" is information the user needs.
 */
export function computeLineEmissions(
    atomFractions: Readonly<Record<string, number>>,
    catalogue: ReadonlyArray<IAtomicLine>,
    plasma: IPlasmaParameters,
    provenance: string = "",
    physicalData?: IPhysicalModelData
): IPlasmaEmission {
    const dopplerOf = (wavelengthNm: number, element: string): number => dopplerFwhmNm(wavelengthNm, plasma.temperatureK, CHEMICAL_ELEMENTS[element]?.molarMass ?? 0);

    if (plasma.emissionModel === "physical") {
        // Two gates, both of which name what is missing rather than
        // falling back on a number that would look physical.
        const blocker = physicalDataBlocker(physicalData) ?? physicalModeBlocker(catalogue);
        if (blocker) {
            return { lines: [], missingElements: [], blocker, plasma, atomFractions, provenance, elementReports: [], intensityUnit: PHYSICAL_INTENSITY_UNIT };
        }
        const result = computePhysicalEmissions(atomFractions, physicalData as IPhysicalModelData, plasma.temperatureK, plasma.electronDensityCm3, plasma.intensityScale);
        const lines = result.intensities
            .map((i) => ({
                element: i.line.element,
                species: speciesLabel(i.line),
                wavelengthNm: i.line.wavelengthNm,
                intensity: i.intensity,
                dopplerFwhmNm: dopplerOf(i.line.wavelengthNm, i.line.element),
                collisionalFwhmNm: i.line.collisionalWidthNm === undefined ? undefined : collisionalFwhmNm(plasma, i.line),
                provenance: i.line.provenance,
            }))
            .sort((a, b) => a.wavelengthNm - b.wavelengthNm);
        return {
            lines,
            missingElements: result.missingElements,
            blocker: null,
            plasma,
            atomFractions,
            provenance,
            elementReports: result.elements,
            intensityUnit: PHYSICAL_INTENSITY_UNIT,
        };
    }

    const lines: ILineEmission[] = [];
    const missing: string[] = [];
    for (const [element, fraction] of Object.entries(atomFractions)) {
        if (!(fraction > 0)) continue;
        const elementLines = catalogue.filter((l) => l.element === element);
        if (elementLines.length === 0) {
            missing.push(element);
            continue;
        }
        for (const l of elementLines) {
            lines.push({
                element,
                species: speciesLabel(l),
                wavelengthNm: l.wavelengthNm,
                intensity: plasma.intensityScale * fraction * l.relativeStrength,
                dopplerFwhmNm: dopplerOf(l.wavelengthNm, element),
                collisionalFwhmNm: l.collisionalWidthNm === undefined ? undefined : collisionalFwhmNm(plasma, l),
                provenance: l.provenance,
            });
        }
    }
    lines.sort((a, b) => a.wavelengthNm - b.wavelengthNm);
    return {
        lines,
        missingElements: missing.sort(),
        blocker: null,
        plasma,
        atomFractions,
        provenance,
        elementReports: [],
        intensityUnit: RELATIVE_INTENSITY_UNIT,
    };
}

/**
 * The collisional FWHM [nm] at the current electron density.
 *
 * With a line, it is that line's own tabulated width, read at
 * `STARK_REFERENCE_ELECTRON_DENSITY_CM3` and scaled linearly, which is
 * the convention both sources publish. Without one, or for a line no
 * source covers, it is the plasma's single global coefficient: the
 * third tier, for the fifteen thousand transitions nobody tabulates.
 *
 * The density the line's width is stated at is a constant of the
 * catalogue and not of the plasma, which is why it is not read from
 * `plasma.referenceElectronDensityCm3`: that field says what the
 * GLOBAL coefficient is stated at, and the two are independent.
 */
export function collisionalFwhmNm(plasma: IPlasmaParameters, line?: Pick<IAtomicLine, "collisionalWidthNm">): number {
    const perLine = line?.collisionalWidthNm;
    if (perLine !== undefined && perLine >= 0) {
        return perLine * (plasma.electronDensityCm3 / STARK_REFERENCE_ELECTRON_DENSITY_CM3);
    }
    const ref = plasma.referenceElectronDensityCm3;
    if (!(ref > 0)) return 0;
    return plasma.collisionalWidthNm * (plasma.electronDensityCm3 / ref);
}

/**
 * The reported wavelength axis: what the instrument says each pixel
 * sees. Affine at this milestone, while a real spectrometer's pixel to
 * wavelength map is a polynomial; that is one of the listed
 * approximations.
 */
export function buildWavelengthGrid(instrument: IInstrumentParameters): Float64Array {
    const n = Math.max(2, Math.floor(instrument.pixelCount));
    const grid = new Float64Array(n);
    const span = instrument.rangeEndNm - instrument.rangeStartNm;
    const step = span / (n - 1);
    for (let i = 0; i < n; i++) {
        grid[i] = instrument.rangeStartNm + i * step;
    }
    return grid;
}

/**
 * Accumulate line profiles onto a grid.
 *
 * `extraGaussianFwhmNm` is folded in quadrature with each line's own
 * Doppler width, which is exactly what convolving with a Gaussian slit
 * function does. That is why the instrument is applied here rather than
 * by convolving an already-sampled curve: sampling a sharp line first
 * and smoothing afterwards moves peaks by up to half a pixel, and the
 * brief's own test asks that broadening NOT move a line's centre.
 *
 * Each line only touches the pixels within `WINDOW_FWHM` widths of its
 * centre, so the cost is proportional to the number of lines and not to
 * the product of lines and pixels.
 */
export function accumulateLines(
    grid: Float64Array,
    lines: ReadonlyArray<ILineEmission>,
    lorentzFwhmNm: number,
    extraGaussianFwhmNm: number,
    wavelengthOffsetNm: number = 0
): Float32Array {
    const WINDOW_FWHM = 12;
    const out = new Float32Array(grid.length);
    if (grid.length < 2) return out;
    const step = (grid[grid.length - 1] - grid[0]) / (grid.length - 1);
    if (!(step > 0)) return out;

    for (const line of lines) {
        const centre = line.wavelengthNm + wavelengthOffsetNm;
        const gFwhm = Math.sqrt(line.dopplerFwhmNm * line.dopplerFwhmNm + extraGaussianFwhmNm * extraGaussianFwhmNm);
        // A line that carries its own collisional width uses it; the
        // argument is the fallback for the lines no source covers.
        const lFwhm = line.collisionalFwhmNm ?? lorentzFwhmNm;
        const total = pseudoVoigtFwhm(gFwhm, lFwhm);
        if (!(total > 0)) continue;
        const halfWindow = WINDOW_FWHM * total;
        const first = Math.max(0, Math.ceil((centre - halfWindow - grid[0]) / step));
        const last = Math.min(grid.length - 1, Math.floor((centre + halfWindow - grid[0]) / step));
        for (let i = first; i <= last; i++) {
            out[i] += line.intensity * pseudoVoigt(grid[i] - centre, gFwhm, lFwhm);
        }
    }
    return out;
}

/** Deterministic PRNG (mulberry32): same seed, same sequence, anywhere. */
export function makeRandom(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** Standard normal sample from a uniform generator (Box-Muller). */
function normalSample(rand: () => number): number {
    let u = rand();
    if (u <= Number.EPSILON) u = Number.EPSILON;
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

/**
 * Short deterministic identifier of everything that shaped a spectrum.
 * FNV-1a over a canonical key: it is a traceability handle, not a
 * cryptographic hash.
 */
export function simulationIdOf(key: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
}

/** Everything a simulation needs. */
export interface ILibsSimulationRequest {
    /** Atom fraction per element. */
    readonly atomFractions: Readonly<Record<string, number>>;
    readonly catalogue: ReadonlyArray<IAtomicLine>;
    readonly plasma: IPlasmaParameters;
    readonly instrument: IInstrumentParameters;
    /** Free text carried into the identifier, e.g. the material's own
     *  provenance, so two spectra of different samples never share an id. */
    readonly provenance?: string;
    /** Level lists and ionisation energies. Required by the `physical`
     *  model, ignored by the `relative` one. */
    readonly physicalData?: IPhysicalModelData;
}

/**
 * Run the whole chain in one call. Pure: same request, same output, bit
 * for bit. This is the path for tests and for Node scripts; the graph
 * reaches the same code through `computeLineEmissions` (plasma node)
 * then `renderSpectrum` (spectrometer node).
 */
export function simulateLibsSpectrum(request: ILibsSimulationRequest): ILibsSimulation {
    const { atomFractions, catalogue, plasma, instrument } = request;
    const emission = computeLineEmissions(atomFractions, catalogue, plasma, request.provenance ?? "", request.physicalData);
    return renderSpectrum(emission, instrument, { catalogueSize: catalogue.length, unverifiedLines: catalogue.filter((l) => !l.verified).length });
}

/**
 * Sample a plasma emission onto an instrument's pixel grid.
 *
 * Owns everything instrumental: the window, the slit function, the
 * calibration error, gain, offset and noise. Knows nothing about
 * composition or plasma physics beyond what the emission payload
 * carries.
 *
 * `catalogueInfo` only feeds the simulation identifier, so that two
 * spectra computed from different catalogues never share an id.
 */
export function renderSpectrum(
    emission: IPlasmaEmission,
    instrument: IInstrumentParameters,
    catalogueInfo: { catalogueSize: number; unverifiedLines: number } = { catalogueSize: 0, unverifiedLines: 0 }
): ILibsSimulation {
    const plasma = emission.plasma;
    const grid = buildWavelengthGrid(instrument);
    const lorentz = collisionalFwhmNm(plasma);

    // Ideal: the plasma's own emission, no instrument.
    const ideal = accumulateLines(grid, emission.lines, lorentz, 0);
    for (let i = 0; i < ideal.length; i++) ideal[i] += plasma.continuumLevel;

    // Instrumented: the slit function folded into each line's Gaussian
    // part, the calibration error displacing them, then gain and offset.
    const broadened = accumulateLines(grid, emission.lines, lorentz, Math.max(0, instrument.resolutionFwhmNm), instrument.calibrationShiftNm);
    const instrumented = new Float32Array(grid.length);
    for (let i = 0; i < instrumented.length; i++) {
        instrumented[i] = (broadened[i] + plasma.continuumLevel) * instrument.gain + instrument.offset;
    }

    // Noise, kept as its own curve.
    const noise = new Float32Array(grid.length);
    if (instrument.noiseEnabled) {
        const rand = makeRandom(instrument.seed);
        for (let i = 0; i < noise.length; i++) {
            const signal = Math.max(0, instrumented[i]);
            const shotSigma = Math.sqrt(signal * Math.max(0, instrument.shotNoiseFactor));
            noise[i] = normalSample(rand) * shotSigma + normalSample(rand) * Math.max(0, instrument.readNoise);
        }
    }

    const measured = new Float32Array(grid.length);
    for (let i = 0; i < measured.length; i++) measured[i] = instrumented[i] + noise[i];

    const key = JSON.stringify({
        atomFractions: emission.atomFractions,
        plasma,
        instrument,
        provenance: emission.provenance,
        catalogue: catalogueInfo.catalogueSize,
        unverified: catalogueInfo.unverifiedLines,
    });

    return {
        wavelengthNm: grid,
        ideal,
        instrumented,
        noise,
        measured,
        lines: emission.lines,
        simulationId: simulationIdOf(key),
        seed: instrument.seed,
        unit: emission.intensityUnit,
        blocker: emission.blocker,
        emissionModel: plasma.emissionModel,
    };
}

/** Default plasma parameters. Every one of them is a working value, not
 *  a measured one; the track's parameter file carries their status. */
export const DEFAULT_PLASMA_PARAMETERS: IPlasmaParameters = Object.freeze({
    temperatureK: 10000,
    electronDensityCm3: 1e17,
    referenceElectronDensityCm3: 1e17,
    collisionalWidthNm: 0.05,
    intensityScale: 1,
    continuumLevel: 0.02,
    emissionModel: "relative",
});

/** Default instrument parameters: a broadband spectrometer. */
export const DEFAULT_INSTRUMENT_PARAMETERS: IInstrumentParameters = Object.freeze({
    rangeStartNm: 200,
    rangeEndNm: 900,
    pixelCount: 3500,
    resolutionFwhmNm: 0.1,
    calibrationShiftNm: 0,
    gain: 1,
    offset: 0,
    noiseEnabled: false,
    shotNoiseFactor: 0.01,
    readNoise: 0.002,
    seed: 1,
});
