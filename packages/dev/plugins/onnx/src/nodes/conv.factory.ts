import { ConvNode } from "spikypanda-onnx";
import type { OnnxNodeInfo } from "spikypanda-onnx";

/**
 * Factory for a free-standing Conv node usable in the editor palette
 * without a parent .onnx model. Supplies a minimal OnnxNodeInfo with
 * the canonical 3-input/1-output shape (X, W, B optional → Y) and
 * sensible default attributes; the user adjusts kernelShape/strides/
 * pads via the @editable spinners in the property panel.
 */
export function createConvNode(): ConvNode {
    const info: OnnxNodeInfo = {
        opType: "Conv",
        name: "",
        inputs: ["X", "W", "B"],
        outputs: ["Y"],
        attributes: new Map([
            ["kernel_shape", 3],
            ["strides", 1],
            ["pads", 0],
        ]),
    };
    return new ConvNode(info);
}
