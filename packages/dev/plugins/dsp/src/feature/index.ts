import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import type { IPortDescriptor } from "spikypanda-core";
import { createMelFilterbankNode, createLogScaleNode, createMfccNode, createDtwNode } from "../nodes/factories.js";

const tensorIn = (slot: string): IPortDescriptor => ({ slot, optional: false, type: "tensor" });
const tensorOut = (slot: string): IPortDescriptor => ({ slot, optional: false, type: "tensor" });

/**
 * `DSP.Feature` — audio-style feature extraction blocks:
 * Mel filterbank, log scaling, MFCC, DTW distance.
 */
export const dspFeatureSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("DSP.Feature:mel", () => createMelFilterbankNode() as never, {
            label: "Mel Filterbank",
            category: "DSP.Feature",
            docPath: ctx.assetUrl("docs/dsp/feature/mel.md"),
            inputPorts: [tensorIn("spectrum")],
            outputPorts: [tensorOut("mel")],
            standards: [{ id: "onnx", version: "1.18" }],
        });
        ctx.nodes.register("DSP.Feature:logscale", () => createLogScaleNode() as never, {
            label: "Log Scale",
            category: "DSP.Feature",
            docPath: ctx.assetUrl("docs/dsp/feature/logscale.md"),
            inputPorts: [tensorIn("x")],
            outputPorts: [tensorOut("log_x")],
            standards: [{ id: "onnx", version: "1.18" }],
        });
        ctx.nodes.register("DSP.Feature:mfcc", () => createMfccNode() as never, {
            label: "MFCC",
            category: "DSP.Feature",
            docPath: ctx.assetUrl("docs/dsp/feature/mfcc.md"),
            inputPorts: [tensorIn("audio")],
            outputPorts: [tensorOut("mfcc")],
            standards: [{ id: "onnx", version: "1.18" }],
        });
        ctx.nodes.register("DSP.Feature:dtw", () => createDtwNode() as never, {
            label: "DTW",
            category: "DSP.Feature",
            docPath: ctx.assetUrl("docs/dsp/feature/dtw.md"),
            inputPorts: [tensorIn("live"), tensorIn("template")],
            outputPorts: [tensorOut("distance")],
            standards: [{ id: "onnx", version: "1.18" }],
        });
    },
};
