import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { NumberSliderNode } from "../nodes/time.js";
import { NumberConstantNode } from "../nodes/constant.js";

const UE5 = ["ue5"] as const;

export const logicInputSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Logic.Input:slider", () => new NumberSliderNode() as never, {
            label: "Number Slider",
            docPath: ctx.assetUrl("docs/logic/input/slider.md"),
            category: "Logic.Input",
            inputPorts: [],
            outputPorts: [{ slot: "value", optional: false, type: "float" }],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Input:constant", () => new NumberConstantNode() as never, {
            label: "Number Constant",
            docPath: ctx.assetUrl("docs/logic/input/constant.md"),
            category: "Logic.Input",
            inputPorts: [],
            outputPorts: [{ slot: "value", optional: false, type: "float" }],
            standards: UE5,
        });
    },
};
