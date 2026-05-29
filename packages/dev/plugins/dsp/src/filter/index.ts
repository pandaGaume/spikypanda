import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import type { IPortDescriptor } from "spikypanda-core";
import { createBiquadFilterNode, createKalman1DNode } from "../nodes/factories.js";

const tensorIn = (slot: string): IPortDescriptor => ({ slot, optional: false, type: "tensor" });
const tensorOut = (slot: string): IPortDescriptor => ({ slot, optional: false, type: "tensor" });

/**
 * `DSP.Filter` — recursive filters: Biquad (LP/HP/BP/Notch via the
 * `filter_type` editable), and scalar Kalman 1D.
 */
export const dspFilterSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("DSP.Filter:biquad", () => createBiquadFilterNode() as never, {
            label: "Biquad Filter",
            category: "DSP.Filter",
            inputPorts: [tensorIn("signal")],
            outputPorts: [tensorOut("filtered")],
            standards: [
                { id: "onnx", version: "1.18" },
                { id: "ue5", version: "5.4" },
            ],
        });
        ctx.nodes.register("DSP.Filter:kalman1d", () => createKalman1DNode() as never, {
            label: "Kalman 1D",
            category: "DSP.Filter",
            inputPorts: [tensorIn("signal")],
            outputPorts: [tensorOut("estimate")],
            standards: [{ id: "onnx", version: "1.18" }],
        });
    },
};
