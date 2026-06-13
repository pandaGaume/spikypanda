import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import type { IPortDescriptor } from "spikypanda-core";
import { createFrameNode } from "../nodes/factories.js";

const tensorIn = (slot: string): IPortDescriptor => ({ slot, optional: false, type: "tensor" });
const tensorOut = (slot: string): IPortDescriptor => ({ slot, optional: false, type: "tensor" });

/**
 * `DSP.Frame` — signal slicing into overlapping frames (frame_size,
 * hop_length, pad_mode). The canonical first step of any STFT-style
 * pipeline.
 */
export const dspFrameSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("DSP.Frame:frame", () => createFrameNode() as never, {
            label: "Frame",
            category: "DSP.Frame",
            docPath: ctx.assetUrl("docs/dsp/frame/frame.md"),
            inputPorts: [tensorIn("signal")],
            outputPorts: [tensorOut("frames")],
            standards: [{ id: "onnx", version: "1.18" }],
        });
    },
};
