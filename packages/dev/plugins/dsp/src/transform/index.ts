import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import type { IPortDescriptor } from "spikypanda-core";
import { createFftNode, createIfftNode, createMagnitudeNode, createPhaseNode, createDctNode } from "../nodes/factories.js";

const tensorIn = (slot: string): IPortDescriptor => ({ slot, optional: false, type: "tensor" });
const tensorOut = (slot: string): IPortDescriptor => ({ slot, optional: false, type: "tensor" });

/**
 * `DSP.Transform` — frequency-domain transforms and their inverses.
 *   FFT (3 output modes), IFFT, Magnitude, Phase, DCT.
 *
 * Standards: ONNX (each op has a SpFFT/SpIFFT/SpDCT/SpMagnitude/SpPhase
 * kernel). Some are also UE5-compatible via the Audio FFT path.
 */
export const dspTransformSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("DSP.Transform:fft", () => createFftNode() as never, {
            label: "FFT",
            category: "DSP.Transform",
            docPath: ctx.assetUrl("docs/dsp/transform/fft.md"),
            inputPorts: [tensorIn("signal")],
            outputPorts: [tensorOut("spectrum")],
            standards: [
                { id: "onnx", version: "1.18" },
                { id: "ue5", version: "5.4" },
            ],
        });
        ctx.nodes.register("DSP.Transform:ifft", () => createIfftNode() as never, {
            label: "IFFT",
            category: "DSP.Transform",
            docPath: ctx.assetUrl("docs/dsp/transform/ifft.md"),
            inputPorts: [tensorIn("spectrum")],
            outputPorts: [tensorOut("signal")],
            standards: [
                { id: "onnx", version: "1.18" },
                { id: "ue5", version: "5.4" },
            ],
        });
        ctx.nodes.register("DSP.Transform:magnitude", () => createMagnitudeNode() as never, {
            label: "Magnitude",
            category: "DSP.Transform",
            // Shared family doc: Magnitude and Phase are the two unpackers
            // of the same interleaved-complex layout.
            docPath: ctx.assetUrl("docs/dsp/transform/complex.md"),
            inputPorts: [tensorIn("complex")],
            outputPorts: [tensorOut("magnitude")],
            standards: [{ id: "onnx", version: "1.18" }],
        });
        ctx.nodes.register("DSP.Transform:phase", () => createPhaseNode() as never, {
            label: "Phase",
            category: "DSP.Transform",
            docPath: ctx.assetUrl("docs/dsp/transform/complex.md"),
            inputPorts: [tensorIn("complex")],
            outputPorts: [tensorOut("phase")],
            standards: [{ id: "onnx", version: "1.18" }],
        });
        ctx.nodes.register("DSP.Transform:dct", () => createDctNode() as never, {
            label: "DCT",
            category: "DSP.Transform",
            docPath: ctx.assetUrl("docs/dsp/transform/dct.md"),
            inputPorts: [tensorIn("x")],
            outputPorts: [tensorOut("dct")],
            standards: [{ id: "onnx", version: "1.18" }],
        });
    },
};
