import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createUplotLineNode, UplotLineNode } from "./line.node.js";
import { createPixiWaterfallNode, PixiWaterfallNode } from "./waterfall.node.js";
import { createUplotSpectrumNode, UplotSpectrumNode } from "./spectrum.node.js";
import { createUplotStemNode, UplotStemNode } from "./stem.node.js";

export { UplotLineNode, createUplotLineNode };
export { PixiWaterfallNode, createPixiWaterfallNode };
export { UplotSpectrumNode, createUplotSpectrumNode };
export { UplotStemNode, createUplotStemNode };

/**
 * `Viz.Plot` sub-plugin. Registers tile-type nodes that render scalar
 * time-series streams as scrolling plots in the Dashboard panel.
 *
 * Each registered node implements IRenderable so the Dashboard auto-mounts
 * it into a GridStack tile when added (typically via `dashboard.addTile`
 * from the host bootstrap once a Viz.* node lands in the graph).
 */
export const vizPlotSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Viz.Plot:line", () => createUplotLineNode() as never, {
            label:       "Time-series Plot",
            category:    "Viz.Plot",
            inputPorts:  [{ slot: "value", optional: true, type: "float" }],
            outputPorts: [],
        });
        ctx.nodes.register("Viz.Plot:waterfall", () => createPixiWaterfallNode() as never, {
            label:       "Waterfall Spectrogram",
            category:    "Viz.Plot",
            inputPorts:  [{ slot: "magnitudes", optional: true, type: "any" }],
            outputPorts: [],
        });
        ctx.nodes.register("Viz.Plot:spectrum", () => createUplotSpectrumNode() as never, {
            label:       "Frequency Spectrum",
            category:    "Viz.Plot",
            inputPorts:  [{ slot: "magnitudes", optional: true, type: "any" }],
            outputPorts: [],
        });
        ctx.nodes.register("Viz.Plot:stem", () => createUplotStemNode() as never, {
            label:       "Stem (Oracle Spectrum)",
            category:    "Viz.Plot",
            // Four (frequency, amplitude) pairs. Unused pairs (no wire
            // on either f_i or A_i) are skipped silently.
            inputPorts: [
                { slot: "f_0", optional: true, type: "float" },
                { slot: "A_0", optional: true, type: "float" },
                { slot: "f_1", optional: true, type: "float" },
                { slot: "A_1", optional: true, type: "float" },
                { slot: "f_2", optional: true, type: "float" },
                { slot: "A_2", optional: true, type: "float" },
                { slot: "f_3", optional: true, type: "float" },
                { slot: "A_3", optional: true, type: "float" },
            ],
            outputPorts: [],
        });
    },
};
