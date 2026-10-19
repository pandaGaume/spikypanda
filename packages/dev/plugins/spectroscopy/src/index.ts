import { spectroInstrumentSubPlugin } from "./instrument/index.js";
import { spectroLibsSubPlugin } from "./libs/index.js";

export * from "./lines/index.js";
export * from "./libs/index.js";
export * from "./instrument/index.js";

/**
 * @spiky-panda/plugin-spectroscopy
 *
 * A LIBS forward model as graph nodes. LIBS is laser-induced breakdown
 * spectroscopy: a laser pulse turns a bit of a sample into a plasma, and
 * the plasma's light, dispersed by wavelength, carries the signature of
 * the elements present.
 *
 * The chain, with the boundary that matters in the middle:
 *
 *   Chemistry.Material:material        the sample, as formulas and
 *     | material_out                   fractions, resolved to elements
 *     v
 *   Spectro.Libs:plasma                emission amplitudes and widths,
 *     | emission_out                   per atomic LINE
 *     v
 *   Spectro.Instrument:spectrometer    sampling onto pixels, slit
 *     | spectrum_out, measured_out     function, calibration, noise
 *     v
 *   Viz.Plot:xy                        wavelength against intensity
 *
 * The plasma publishes a line list rather than a curve: a plasma emits
 * transitions at their own wavelengths, and it is the instrument that
 * decides which window is observed and at what resolution.
 *
 * Sub-plugins:
 *   Spectro.Libs         emission stage. `relative` intensities by
 *                        default; the `physical` Boltzmann / Saha model
 *                        refuses to run while the catalogue is
 *                        unverified, rather than returning a number
 *                        that looks physical.
 *   Spectro.Instrument   measurement stage. Keeps the ideal,
 *                        instrumented and measured curves separate, and
 *                        publishes the noise on its own port so the
 *                        stages can be subtracted from each other.
 *
 * The built-in line catalogue (`lines/lines.catalog.ts`) is a short list
 * of strong LIBS lines written from memory, every entry flagged
 * `verified: false`. Replacing it with a NIST ASD download is the first
 * milestone of the LIBS track; until then a spectrum from this plugin is
 * a plumbing demonstration, not a prediction.
 *
 * No standards are declared: nothing here is part of an export pipeline.
 */
export default {
    subPlugins: {
        "Spectro.Libs": spectroLibsSubPlugin,
        "Spectro.Instrument": spectroInstrumentSubPlugin,
    },
};
