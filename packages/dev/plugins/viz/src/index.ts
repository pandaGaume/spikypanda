import { vizPlotSubPlugin } from "./plot/index.js";
import { vizMarkdownSubPlugin } from "./markdown/index.js";
import { vizControlSubPlugin } from "./control/index.js";

export * from "./plot/index.js";
export * from "./markdown/index.js";
export * from "./control/index.js";

/**
 * @spikypanda/plugin-viz
 *
 * Visualization tile nodes for the Dashboard panel. Currently ships:
 *
 *   Plot/      live-data tiles (uPlot, PixiJS)
 *     line       scrolling time-series          (uPlot)
 *     spectrum   static FFT magnitude           (uPlot)
 *     waterfall  scrolling 2D spectrogram       (PixiJS)
 *     stem       oracle discrete-spectrum bars  (uPlot)
 *
 *   Markdown/  documentation tiles
 *     cell       Jupyter-style notebook cell    (marked + textarea)
 *
 *   Control/   input control surfaces (sources)
 *     knobs3     three NexusUI dials, 3 outputs (synth-style controller)
 *
 * Each registered node implements `IRenderable` (from spikypanda-nodeeditor)
 * and is wired into the Dashboard by the host bootstrap. The Dashboard
 * mounts the node into a GridStack tile and drives `repaint()` at 60 fps;
 * the node's `fire()` keeps a ring buffer fed independently of the
 * render path. Markdown cells are gesture-driven only (no rAF work).
 * Control tiles are SOURCES: they publish their widget state every tick.
 *
 * No standards are declared — viz tiles are pure runtime UI, not part
 * of any export pipeline (ONNX / UE5 / ...).
 */
export default {
    subPlugins: {
        "Viz.Plot":     vizPlotSubPlugin,
        "Viz.Markdown": vizMarkdownSubPlugin,
        "Viz.Control":  vizControlSubPlugin,
    },
};
