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
            label: "Time-series Plot",
            docPath: ctx.assetUrl("docs/viz/plot/line.md"),
            category: "Viz.Plot",
            inputPorts: [{ slot: "value", optional: true, type: "float" }],
            outputPorts: [],
        });
        ctx.nodes.register("Viz.Plot:waterfall", () => createPixiWaterfallNode() as never, {
            label: "Waterfall Spectrogram",
            docPath: ctx.assetUrl("docs/viz/plot/waterfall.md"),
            category: "Viz.Plot",
            inputPorts: [{ slot: "magnitudes", optional: true, type: "any" }],
            outputPorts: [],
        });
        ctx.nodes.register("Viz.Plot:spectrum", () => createUplotSpectrumNode() as never, {
            label: "Frequency Spectrum",
            docPath: ctx.assetUrl("docs/viz/plot/spectrum.md"),
            category: "Viz.Plot",
            inputPorts: [{ slot: "magnitudes", optional: true, type: "any" }],
            outputPorts: [],
        });
        ctx.nodes.register("Viz.Plot:stem", () => createUplotStemNode() as never, {
            label: "Stem (Oracle Spectrum)",
            docPath: ctx.assetUrl("docs/viz/plot/stem.md"),
            category: "Viz.Plot",
            // Seed with one pair (f_0, A_0). The variadic reconciler
            // grows BOTH groups independently as the user connects:
            // wire f_0 → f_1 appears; wire A_0 → A_1 appears. Each
            // stem index gets its own color from the tile's palette
            // (orange / cyan / green / yellow / red / purple / pink /
            // slate, repeating after 8). Unbounded in principle —
            // practical limit is whatever the dashboard can render
            // without congestion.
            inputPorts: [
                { slot: "f_0", optional: true, type: "float" },
                { slot: "A_0", optional: true, type: "float" },
            ],
            outputPorts: [],
            variadicInput: [
                { prefix: "f_", type: "float" },
                { prefix: "A_", type: "float" },
            ],
        });
    },
};
