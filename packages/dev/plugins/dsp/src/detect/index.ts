import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createSteadyStateGateNode, SteadyStateGateNode } from "./steadystate.node.js";

export { SteadyStateGateNode, createSteadyStateGateNode };

/**
 * `DSP.Detect` - regime / event detection on scalar streams.
 *
 * V1 ships one node:
 *   steadystate  hysteresis steady-state gate. Forwards samples that
 *                belong to an established regime (EMA baseline +
 *                relative epsilon band, settle/breakHold hysteresis)
 *                and closes during transients. The inverse of an
 *                event gate: feed it a current RMS and only the
 *                stationary segments reach the downstream feature
 *                pipeline.
 *
 * Pure runtime nodes (not ONNX-backed): like DSP.Stream, this family
 * is about streaming control flow, not batch tensor math.
 */
export const dspDetectSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("DSP.Detect:steadystate", () => createSteadyStateGateNode() as never, {
            label: "Steady-State Gate",
            docPath: ctx.assetUrl("docs/dsp/detect/steadystate.md"),
            category: "DSP.Detect",
            inputPorts: [{ slot: "value", optional: true, type: "float" }],
            outputPorts: [
                { slot: "value_gated", optional: false, type: "float" },
                { slot: "steady", optional: false, type: "boolean" },
                { slot: "transition", optional: true, type: "trigger" },
            ],
        });
    },
};
