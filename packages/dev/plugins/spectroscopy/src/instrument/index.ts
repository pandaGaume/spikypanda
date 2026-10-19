import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import {
    createSpectrometerNode,
    isSpectrum1D,
    SPECTROMETER_IN_EMISSION,
    SPECTROMETER_OUT_IDEAL,
    SPECTROMETER_OUT_INSTRUMENTED,
    SPECTROMETER_OUT_MEASURED,
    SPECTROMETER_OUT_NOISE,
    SPECTROMETER_OUT_SPECTRUM,
    SPECTROMETER_OUT_WAVELENGTH,
    SpectrometerNode,
} from "./spectrometer.node.js";

export {
    SpectrometerNode,
    createSpectrometerNode,
    isSpectrum1D,
    SPECTROMETER_IN_EMISSION,
    SPECTROMETER_OUT_SPECTRUM,
    SPECTROMETER_OUT_WAVELENGTH,
    SPECTROMETER_OUT_IDEAL,
    SPECTROMETER_OUT_INSTRUMENTED,
    SPECTROMETER_OUT_MEASURED,
    SPECTROMETER_OUT_NOISE,
};
export type { ISpectrum1D } from "./spectrometer.node.js";

/**
 * `Spectro.Instrument` sub-plugin: the measurement stage.
 *
 * Six outputs, one curve each plus the full record, because the brief
 * requires the ideal, instrumented and measured spectra to stay
 * separable: a user compares them by wiring two of them into the same
 * chart, and `measured - noise` is exactly `instrumented`.
 */
export const spectroInstrumentSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Spectro.Instrument:spectrometer", (() => createSpectrometerNode()) as never, {
            label: "LIBS Spectrometer",
            category: "Spectro.Instrument",
            docPath: ctx.assetUrl("docs/spectroscopy/instrument/spectrometer.md"),
            inputPorts: [{ slot: SPECTROMETER_IN_EMISSION, optional: true, type: "any" }],
            outputPorts: [
                { slot: SPECTROMETER_OUT_SPECTRUM, optional: true, type: "any" },
                { slot: SPECTROMETER_OUT_WAVELENGTH, optional: true, type: "any" },
                { slot: SPECTROMETER_OUT_IDEAL, optional: true, type: "any" },
                { slot: SPECTROMETER_OUT_INSTRUMENTED, optional: true, type: "any" },
                { slot: SPECTROMETER_OUT_MEASURED, optional: true, type: "any" },
                { slot: SPECTROMETER_OUT_NOISE, optional: true, type: "any" },
            ],
        });
    },
};
