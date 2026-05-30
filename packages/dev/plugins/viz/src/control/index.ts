import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createKnobs3Node, Knobs3Node } from "./knobs3.node.js";

export { Knobs3Node, createKnobs3Node };

/**
 * `Viz.Control` — input control surfaces for the Dashboard.
 *
 * Source-side tiles: the user interacts with widgets in the dashboard
 * (knobs, sliders, XY pads), and the node publishes the current values
 * on its outputs. Mirrors the role of `Logic.Input:slider` but with
 * the UI living in the dashboard tile rather than the property panel
 * — so the user can manipulate parameters and watch the live spectrum
 * react without switching focus.
 *
 * V1 ships one node:
 *   knobs3   three NexusUI dials side-by-side with three outputs.
 *            Designed for "one oscillator per tile" (f / A / φ), but
 *            generic enough for any 3-parameter object (PID gains,
 *            fault levels, mixer channels).
 *
 * Future candidates (parked):
 *   knobs6      6-knob variant for richer controllers
 *   xy-pad      2D pad → vector2 output (depth / position / modulation)
 *   multisliderN   envelope / EQ-band widget
 *   sequencer   16-step grid → triggered values over time
 */
export const vizControlSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Viz.Control:knobs3", () => createKnobs3Node() as never, {
            label:       "Knobs 3",
            category:    "Viz.Control",
            inputPorts:  [],
            outputPorts: [
                // Slot names match the canonical default labels
                // (oscillator control). If the user repurposes the
                // tile by editing labels, the port names stay these
                // three. See knobs3.node.ts docstring for rationale.
                { slot: "frequency", optional: false, type: "float" },
                { slot: "amplitude", optional: false, type: "float" },
                { slot: "phase",     optional: false, type: "float" },
            ],
        });
    },
};
