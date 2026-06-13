import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { OnnxModelGraph } from "./graphs/model.graph";
import { createConvNode } from "./nodes/conv.factory";
import { onnxModelEditor } from "./editors/model.editor";

const plugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        // Fractal ONNX model: an OnnxGraph (which IS-A IRuntimeNode via
        // RuntimeGraph) preloaded with the contents of a .onnx file. The
        // drag-and-drop "onnx-model" editor populates its nodes/links.
        // Loadable ONNX model — the OnnxModelGraph is a fractal node
        // that runs a complete .onnx graph internally. Its category is
        // "model" because it represents a packaged inference graph, not
        // a single op. Carries the onnx standard so the badge advertises
        // its origin and exportability.
        ctx.nodes.register("spk.onnx:model", () => new OnnxModelGraph(), {
            label: "ONNX Model",
            docPath: ctx.assetUrl("docs/onnx/model/model.md"),
            category: "model",
            inputPorts: [],
            outputPorts: [],
            standards: ["onnx"],
        });

        // Conv op (functional category "conv"). Drops the legacy
        // "onnx" or "onnx/conv" categorisation: the badge tells the user
        // about ONNX compliance; the folder tells them what the node
        // does. A future TFLite Conv would land in the same folder with
        // a different badge.
        ctx.nodes.register("spk.onnx:conv", () => createConvNode(), {
            label: "Conv",
            docPath: ctx.assetUrl("docs/onnx/conv/conv.md"),
            category: "conv",
            inputPorts: [
                { slot: 0, optional: false, type: "tensor" },
                { slot: 1, optional: false, type: "tensor" },
                { slot: 2, optional: true, type: "tensor" },
            ],
            outputPorts: [{ slot: 0, optional: false, type: "tensor" }],
            standards: ["onnx"],
        });

        ctx.editors.register("onnx-model", onnxModelEditor);
    },
};

export default plugin;
export { OnnxModelGraph } from "./graphs/model.graph";
export type { OnnxModelLoadOptions, OnnxModelLoadReport } from "./graphs/model.graph";
export { sha256Hex } from "./graphs/sha256.js";
export { createConvNode } from "./nodes/conv.factory";
export { onnxModelEditor } from "./editors/model.editor";
