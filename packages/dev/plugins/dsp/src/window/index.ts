import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import type { IPortDescriptor } from "spikypanda-core";
import { createWindowNode } from "../nodes/factories.js";

const tensorIn  = (slot: string): IPortDescriptor => ({ slot, optional: false, type: "tensor" });
const tensorOut = (slot: string): IPortDescriptor => ({ slot, optional: false, type: "tensor" });

/**
 * `DSP.Window` — input-frame windowing primitives (Hann, Hamming,
 * Blackman, Bartlett, Rectangular, Tukey selected via the node's
 * `window_type` editable attribute).
 */
export const dspWindowSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("DSP.Window:window", () => createWindowNode() as never, {
            label: "Window", category: "DSP.Window",
            inputPorts:  [tensorIn("signal")],
            outputPorts: [tensorOut("windowed")],
            standards: [
                { id: "onnx", version: "1.18" },
                { id: "ue5",  version: "5.4"  },
            ],
        });
    },
};
