/**
 * `Spectro.Instrument:spectrometer`, the measurement stage.
 *
 * Takes the plasma's line list on `emission_in` and samples it onto a
 * pixel grid: a window, a pixel count, a slit function, a wavelength
 * calibration, a gain, an offset and noise. It knows nothing about
 * composition or plasma physics; everything it needs rides in the
 * emission payload.
 *
 * Three curves stay separate, which is the point of the node:
 *
 *   `ideal`         the plasma's own emission, continuum included, with
 *                   Doppler and collisional widths only;
 *   `instrumented`  the same folded with the slit function, displaced by
 *                   the calibration error, times gain, plus offset;
 *   `measured`      instrumented plus noise.
 *
 * `noise` is published on its own port as well, so `measured - noise`
 * gives `instrumented` exactly, and an overlay of `ideal` against
 * `measured` reads off what the instrument did. Test V1-A of the brief
 * needs precisely that separation to tell a calibration error from a
 * model error.
 *
 * The slit function is folded into each line's Gaussian width rather
 * than applied by convolving an already-sampled curve. Widths add in
 * quadrature, which is exact for a Gaussian, and it keeps line centres
 * where they belong: smoothing a sampled spectrum displaces peaks by up
 * to half a pixel, and the brief asks explicitly that broadening not
 * move a centre.
 *
 * Noise is reproducible: same seed, same noise vector, on any machine.
 * The shot term scales as the square root of the signal and the read
 * term is additive. The shot-to-shot plasma fluctuation, which dominates
 * in practice, is NOT modelled here: it belongs to the plasma stage, and
 * it is on the track's list of missing pieces.
 */

import { cloneable, editable, IChannel, IDeclaresPorts, inSlotOf, IOlink, IPortDescriptor, ISession, RuntimeNode, viewable } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import { DEFAULT_INSTRUMENT_PARAMETERS, isPlasmaEmission, renderSpectrum } from "../libs/engine.js";
import type { IInstrumentParameters, ILibsSimulation, IPlasmaEmission } from "../libs/engine.js";

/** Input slot: the plasma's line list. */
export const SPECTROMETER_IN_EMISSION = "emission_in";
/** Output slots. Explicit names, one curve each, plus the full record. */
export const SPECTROMETER_OUT_SPECTRUM = "spectrum_out";
export const SPECTROMETER_OUT_WAVELENGTH = "wavelength_out";
export const SPECTROMETER_OUT_IDEAL = "ideal_out";
export const SPECTROMETER_OUT_INSTRUMENTED = "instrumented_out";
export const SPECTROMETER_OUT_MEASURED = "measured_out";
export const SPECTROMETER_OUT_NOISE = "noise_out";

/**
 * The 1-D spectrum record published on `spectrum_out`.
 *
 * The typed arrays are NOT part of the node's `@cloneable` state: a
 * saved document carries the parameters and the seed, which reproduce
 * the curves exactly, instead of a few thousand numbers rewritten on
 * every edit.
 */
export interface ISpectrum1D {
    readonly wavelengthNm: Float64Array;
    readonly ideal: Float32Array;
    readonly instrumented: Float32Array;
    readonly measured: Float32Array;
    readonly noise: Float32Array;
    /** `"relative"` at this milestone, never a radiometric unit. */
    readonly unit: string;
    readonly simulationId: string;
    readonly seed: number;
    readonly lineCount: number;
    /** Non-null when the emission stage refused to run. */
    readonly blocker: string | null;
}

/** Structural guard for a spectrum read off a cable. */
export function isSpectrum1D(v: unknown): v is ISpectrum1D {
    if (!v || typeof v !== "object") return false;
    const s = v as Partial<ISpectrum1D>;
    return !!s.wavelengthNm && !!s.measured && typeof s.simulationId === "string";
}

export class SpectrometerNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: SPECTROMETER_IN_EMISSION, optional: true, type: "any" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: SPECTROMETER_OUT_SPECTRUM, optional: true, type: "any" },
        { slot: SPECTROMETER_OUT_WAVELENGTH, optional: true, type: "any" },
        { slot: SPECTROMETER_OUT_IDEAL, optional: true, type: "any" },
        { slot: SPECTROMETER_OUT_INSTRUMENTED, optional: true, type: "any" },
        { slot: SPECTROMETER_OUT_MEASURED, optional: true, type: "any" },
        { slot: SPECTROMETER_OUT_NOISE, optional: true, type: "any" },
    ];

    @cloneable private _rangeStartNm: number = DEFAULT_INSTRUMENT_PARAMETERS.rangeStartNm;
    @cloneable private _rangeEndNm: number = DEFAULT_INSTRUMENT_PARAMETERS.rangeEndNm;
    @cloneable private _pixelCount: number = DEFAULT_INSTRUMENT_PARAMETERS.pixelCount;
    @cloneable private _resolutionFwhmNm: number = DEFAULT_INSTRUMENT_PARAMETERS.resolutionFwhmNm;
    @cloneable private _calibrationShiftNm: number = DEFAULT_INSTRUMENT_PARAMETERS.calibrationShiftNm;
    @cloneable private _gain: number = DEFAULT_INSTRUMENT_PARAMETERS.gain;
    @cloneable private _offset: number = DEFAULT_INSTRUMENT_PARAMETERS.offset;
    @cloneable private _noiseEnabled: boolean = DEFAULT_INSTRUMENT_PARAMETERS.noiseEnabled;
    @cloneable private _shotNoiseFactor: number = DEFAULT_INSTRUMENT_PARAMETERS.shotNoiseFactor;
    @cloneable private _readNoise: number = DEFAULT_INSTRUMENT_PARAMETERS.readNoise;
    @cloneable private _seed: number = DEFAULT_INSTRUMENT_PARAMETERS.seed;

    private _emission: IPlasmaEmission | null = null;
    private _simulation: ILibsSimulation | null = null;
    private _revision: number = 0;
    private _simulationKey: string = "";

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ────────────────────────────────────────────────────

    @editable("number", { unit: { quantity: "Length", unit: "nm" } })
    public get range_start(): number {
        return this._rangeStartNm;
    }
    public set range_start(v: number) {
        const next = v > 0 && v < this._rangeEndNm ? v : this._rangeStartNm;
        this.setField("range_start", this._rangeStartNm, next, (n) => {
            this._rangeStartNm = n;
            this._invalidate();
        });
    }

    @editable("number", { unit: { quantity: "Length", unit: "nm" } })
    public get range_end(): number {
        return this._rangeEndNm;
    }
    public set range_end(v: number) {
        const next = v > this._rangeStartNm ? v : this._rangeEndNm;
        this.setField("range_end", this._rangeEndNm, next, (n) => {
            this._rangeEndNm = n;
            this._invalidate();
        });
    }

    @editable("number")
    public get pixel_count(): number {
        return this._pixelCount;
    }
    public set pixel_count(v: number) {
        const next = Math.max(2, Math.floor(v));
        this.setField("pixel_count", this._pixelCount, next, (n) => {
            this._pixelCount = n;
            this._invalidate();
        });
    }

    @editable("number", { unit: { quantity: "Length", unit: "nm" } })
    public get resolution_fwhm(): number {
        return this._resolutionFwhmNm;
    }
    public set resolution_fwhm(v: number) {
        const next = v >= 0 ? v : this._resolutionFwhmNm;
        this.setField("resolution_fwhm", this._resolutionFwhmNm, next, (n) => {
            this._resolutionFwhmNm = n;
            this._invalidate();
        });
    }

    @editable("number", { unit: { quantity: "Length", unit: "nm" } })
    public get calibration_shift(): number {
        return this._calibrationShiftNm;
    }
    public set calibration_shift(v: number) {
        this.setField("calibration_shift", this._calibrationShiftNm, v, (n) => {
            this._calibrationShiftNm = n;
            this._invalidate();
        });
    }

    @editable("number")
    public get gain(): number {
        return this._gain;
    }
    public set gain(v: number) {
        this.setField("gain", this._gain, v, (n) => {
            this._gain = n;
            this._invalidate();
        });
    }

    @editable("number")
    public get offset(): number {
        return this._offset;
    }
    public set offset(v: number) {
        this.setField("offset", this._offset, v, (n) => {
            this._offset = n;
            this._invalidate();
        });
    }

    @editable("boolean")
    public get noise_enabled(): boolean {
        return this._noiseEnabled;
    }
    public set noise_enabled(v: boolean) {
        this.setField("noise_enabled", this._noiseEnabled, v, (n) => {
            this._noiseEnabled = n;
            this._invalidate();
        });
    }

    @editable("number")
    public get shot_noise_factor(): number {
        return this._shotNoiseFactor;
    }
    public set shot_noise_factor(v: number) {
        const next = v >= 0 ? v : this._shotNoiseFactor;
        this.setField("shot_noise_factor", this._shotNoiseFactor, next, (n) => {
            this._shotNoiseFactor = n;
            this._invalidate();
        });
    }

    @editable("number")
    public get read_noise(): number {
        return this._readNoise;
    }
    public set read_noise(v: number) {
        const next = v >= 0 ? v : this._readNoise;
        this.setField("read_noise", this._readNoise, next, (n) => {
            this._readNoise = n;
            this._invalidate();
        });
    }

    /** PRNG seed. Same seed, same noise: that is the contract. */
    @editable("number")
    public get seed(): number {
        return this._seed;
    }
    public set seed(v: number) {
        const next = Number.isFinite(v) ? Math.floor(v) : this._seed;
        this.setField("seed", this._seed, next, (n) => {
            this._seed = n;
            this._invalidate();
        });
    }

    // ── Viewables ────────────────────────────────────────────────────

    @viewable("string") public get simulation_id(): string {
        return this.spectrum.simulationId;
    }

    @viewable("number") public get line_count(): number {
        return this.spectrum.lineCount;
    }

    @viewable("number") public get peak_measured(): number {
        const m = this.spectrum.measured;
        let peak = 0;
        for (let i = 0; i < m.length; i++) if (m[i] > peak) peak = m[i];
        return peak;
    }

    /** Pixel width of the window [nm], the sampling step. */
    @viewable("number") public get pixel_step_nm(): number {
        return (this._rangeEndNm - this._rangeStartNm) / Math.max(1, this._pixelCount - 1);
    }

    /** Empty unless the emission stage refused to produce lines. */
    @viewable("string") public get model_blocker(): string {
        return this.spectrum.blocker ?? "";
    }

    // ── API ──────────────────────────────────────────────────────────

    public get parameters(): IInstrumentParameters {
        return {
            rangeStartNm: this._rangeStartNm,
            rangeEndNm: this._rangeEndNm,
            pixelCount: this._pixelCount,
            resolutionFwhmNm: this._resolutionFwhmNm,
            calibrationShiftNm: this._calibrationShiftNm,
            gain: this._gain,
            offset: this._offset,
            noiseEnabled: this._noiseEnabled,
            shotNoiseFactor: this._shotNoiseFactor,
            readNoise: this._readNoise,
            seed: this._seed,
        };
    }

    /** Feed an emission directly, for headless use and tests. */
    public setEmission(emission: IPlasmaEmission | null): void {
        this._emission = emission;
        this._invalidate();
    }

    /**
     * The measured spectrum, recomputed only when the instrument or the
     * emission changed. With nothing wired it is a flat zero curve of
     * the right length, which is what a spectrometer reads in the dark.
     */
    public get spectrum(): ISpectrum1D {
        const key = `${this._revision}`;
        if (this._simulation && this._simulationKey === key) return this._asSpectrum(this._simulation);
        const emission: IPlasmaEmission = this._emission ?? {
            lines: [],
            missingElements: [],
            blocker: null,
            atomFractions: {},
            provenance: "",
            elementReports: [],
            intensityUnit: "relative",
            plasma: {
                temperatureK: 0,
                electronDensityCm3: 0,
                referenceElectronDensityCm3: 1,
                collisionalWidthNm: 0,
                intensityScale: 0,
                continuumLevel: 0,
                emissionModel: "relative",
            },
        };
        this._simulation = renderSpectrum(emission, this.parameters);
        this._simulationKey = key;
        return this._asSpectrum(this._simulation);
    }

    // ── Runtime ──────────────────────────────────────────────────────

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            if (String(inSlotOf(link)) !== SPECTROMETER_IN_EMISSION) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const v = session.consume(idx);
            if (!isPlasmaEmission(v)) continue;
            if (this._emission !== v) this.setEmission(v);
        }

        const spectrum = this.spectrum;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case SPECTROMETER_OUT_SPECTRUM:
                    session.publish(idx, spectrum);
                    break;
                case SPECTROMETER_OUT_WAVELENGTH:
                    session.publish(idx, spectrum.wavelengthNm);
                    break;
                case SPECTROMETER_OUT_IDEAL:
                    session.publish(idx, spectrum.ideal);
                    break;
                case SPECTROMETER_OUT_INSTRUMENTED:
                    session.publish(idx, spectrum.instrumented);
                    break;
                case SPECTROMETER_OUT_MEASURED:
                    session.publish(idx, spectrum.measured);
                    break;
                case SPECTROMETER_OUT_NOISE:
                    session.publish(idx, spectrum.noise);
                    break;
                default:
                    break;
            }
        }
    }

    private _asSpectrum(sim: ILibsSimulation): ISpectrum1D {
        return {
            wavelengthNm: sim.wavelengthNm,
            ideal: sim.ideal,
            instrumented: sim.instrumented,
            measured: sim.measured,
            noise: sim.noise,
            unit: sim.unit,
            simulationId: sim.simulationId,
            seed: sim.seed,
            lineCount: sim.lines.length,
            blocker: sim.blocker,
        };
    }

    private _invalidate(): void {
        this._revision++;
        this._simulation = null;
    }
}

/** Factory, as every registered node family in this repo provides. */
export function createSpectrometerNode(): SpectrometerNode {
    return new SpectrometerNode();
}
