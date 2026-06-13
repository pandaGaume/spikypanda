import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createScalarBufferNode, ScalarBufferNode } from "./buffer.node.js";
import { createChannelMuxNode, ChannelMuxNode } from "./mux.node.js";

export { ScalarBufferNode, createScalarBufferNode };
export { ChannelMuxNode, createChannelMuxNode };

/**
 * `DSP.Stream`: scalar ↔ tensor adapters.
 *
 * Unlike the rest of the DSP plugin (which is built on ONNX kernels
 * operating on tensors), this sub-plugin's nodes are plain RuntimeNode
 * implementations that bridge between streaming scalars (`float`) and
 * the tensor format expected by SpFFT / SpFrame / SpWindow / etc.
 *
 * Nodes:
 *   buffer   collect N consecutive samples and emit a tensor every
 *            `hopLength` samples. Scalar input -> [frameSize] frames
 *            (historical behavior); tensor [C] input (from mux) ->
 *            [frameSize, C] frames.
 *   mux      assemble N parallel float streams (variadic in_0, in_1,
 *            ...) into one [N] tensor per fire; in_k maps to data[k].
 *
 * Wires the canonical pipeline from a real-time scalar source (Clock,
 * Sin, sensor mock) into the DSP feature pipeline (SpFFT, SpMagnitude,
 * SpWindow, etc.) without a port-type mismatch. Chain mux -> buffer
 * for multi-channel [frameSize, C] frames.
 */
export const dspStreamSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("DSP.Stream:buffer", () => createScalarBufferNode() as never, {
            label: "Scalar Buffer",
            docPath: ctx.assetUrl("docs/dsp/stream/buffer.md"),
            category: "DSP.Stream",
            // "any" because the buffer ingests BOTH scalar floats (legacy
            // [frameSize] frames) and [C] tensor rows from the mux
            // ([frameSize, C] frames); a "float" declaration would make
            // the editor flag the mux -> buffer wire as a type mismatch.
            inputPorts: [{ slot: "value", optional: true, type: "any" }],
            outputPorts: [{ slot: "frame", optional: false, type: "tensor" }],
        });
        ctx.nodes.register("DSP.Stream:mux", () => createChannelMuxNode() as never, {
            label: "Channel Mux",
            docPath: ctx.assetUrl("docs/dsp/stream/mux.md"),
            category: "DSP.Stream",
            inputPorts: [{ slot: "in_0", optional: true, type: "float" }],
            outputPorts: [{ slot: "frame", optional: false, type: "tensor" }],
            variadicInput: { prefix: "in_", type: "float" },
        });
    },
};
