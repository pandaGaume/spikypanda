import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createTransposeNode, TransposeNode } from "./transpose.node.js";

export { TransposeNode, createTransposeNode };

/**
 * `DSP.Tensor` - tensor layout utilities.
 *
 * V1 ships one node:
 *   transpose  [A, B] -> [B, A] (row-major), with an optional leading
 *              batch dimension ([1, B, A]). The canonical adapter
 *              between ScalarBufferNode's [T, C] frame layout and the
 *              channels-first (1, C, T) input of ONNX encoder models.
 *
 * Pure runtime nodes: these are layout relabelings on the streaming
 * side, not ONNX-backed math kernels.
 */
export const dspTensorSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("DSP.Tensor:transpose", () => createTransposeNode() as never, {
            label: "Transpose",
            docPath: ctx.assetUrl("docs/dsp/tensor/transpose.md"),
            category: "DSP.Tensor",
            inputPorts: [{ slot: "tensor", optional: false, type: "tensor" }],
            outputPorts: [{ slot: "transposed", optional: false, type: "tensor" }],
        });
    },
};
