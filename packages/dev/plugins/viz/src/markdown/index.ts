import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createMarkdownCellNode, MarkdownCellNode } from "./cell.node.js";

export { MarkdownCellNode, createMarkdownCellNode };

/**
 * `Viz.Markdown` sub-plugin. Registers Markdown-prose tile types for
 * the Dashboard panel — Jupyter-style narrative cells alongside the
 * live plot/spectrum/waterfall tiles so a saved graph doubles as a
 * self-contained lab notebook.
 *
 * Current registry:
 *   Viz.Markdown:cell  — single Markdown cell, double-click to edit
 *
 * Future candidates (parked):
 *   Viz.Markdown:title    — large H1 banner, no edit chrome
 *   Viz.Markdown:legend   — auto-generated legend from connected viz
 */
export const vizMarkdownSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Viz.Markdown:cell", () => createMarkdownCellNode() as never, {
            label:       "Markdown Cell",
            category:    "Viz.Markdown",
            inputPorts:  [],
            outputPorts: [],
        });
    },
};
