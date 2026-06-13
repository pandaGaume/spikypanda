import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import type { IPortDescriptor } from "spikypanda-core";
import { createRmsNode, createZeroCrossingRateNode, createMovingAverageNode, createDetrendNode } from "../nodes/factories.js";

const tensorIn = (slot: string): IPortDescriptor => ({ slot, optional: false, type: "tensor" });
const tensorOut = (slot: string): IPortDescriptor => ({ slot, optional: false, type: "tensor" });

/**
 * `DSP.Stats` — output-side signal analysis: RMS, zero-crossing rate,
 * causal moving average, linear detrend.
 */
export const dspStatsSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("DSP.Stats:rms", () => createRmsNode() as never, {
            label: "RMS",
            category: "DSP.Stats",
            // The four DSP.Stats nodes share one family doc (the
            // chemistry gas.md pattern): same tensor-in contract, a
            // variants table inside.
            docPath: ctx.assetUrl("docs/dsp/stats/stats.md"),
            inputPorts: [tensorIn("signal")],
            outputPorts: [tensorOut("rms")],
            standards: [
                { id: "onnx", version: "1.18" },
                { id: "ue5", version: "5.4" },
            ],
        });
        ctx.nodes.register("DSP.Stats:zcr", () => createZeroCrossingRateNode() as never, {
            label: "Zero Crossing Rate",
            category: "DSP.Stats",
            docPath: ctx.assetUrl("docs/dsp/stats/stats.md"),
            inputPorts: [tensorIn("signal")],
            outputPorts: [tensorOut("zcr")],
            standards: [{ id: "onnx", version: "1.18" }],
        });
        ctx.nodes.register("DSP.Stats:movavg", () => createMovingAverageNode() as never, {
            label: "Moving Average",
            category: "DSP.Stats",
            docPath: ctx.assetUrl("docs/dsp/stats/stats.md"),
            inputPorts: [tensorIn("signal")],
            outputPorts: [tensorOut("smoothed")],
            standards: [{ id: "onnx", version: "1.18" }],
        });
        ctx.nodes.register("DSP.Stats:detrend", () => createDetrendNode() as never, {
            label: "Detrend",
            category: "DSP.Stats",
            docPath: ctx.assetUrl("docs/dsp/stats/stats.md"),
            inputPorts: [tensorIn("signal")],
            outputPorts: [tensorOut("detrended")],
            standards: [{ id: "onnx", version: "1.18" }],
        });
    },
};
