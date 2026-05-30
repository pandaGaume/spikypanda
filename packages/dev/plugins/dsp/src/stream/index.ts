import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createScalarBufferNode, ScalarBufferNode } from "./buffer.node.js";

export { ScalarBufferNode, createScalarBufferNode };

/**
 * `DSP.Stream` — scalar ↔ tensor adapters.
 *
 * Unlike the rest of the DSP plugin (which is built on ONNX kernels
 * operating on tensors), this sub-plugin's nodes are plain RuntimeNode
 * implementations that bridge between streaming scalars (`float`) and
 * the tensor format expected by SpFFT / SpFrame / SpWindow / etc.
 *
 * V1 ships one node:
 *   buffer   collect N consecutive float samples and emit a 1D tensor
 *            (Float32Array of length N) every `hopLength` samples.
 *
 * Wires the canonical pipeline from a real-time scalar source (Clock,
 * Sin, sensor mock) into the DSP feature pipeline (SpFFT, SpMagnitude,
 * SpWindow, etc.) without a port-type mismatch.
 */
export const dspStreamSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("DSP.Stream:buffer", () => createScalarBufferNode() as never, {
            label: "Scalar Buffer",
            category: "DSP.Stream",
            inputPorts: [{ slot: "value", optional: true, type: "float" }],
            outputPorts: [{ slot: "frame", optional: false, type: "tensor" }],
        });
    },
};
