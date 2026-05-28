import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { NumberSliderNode } from "../nodes/time.js";

const UE5 = ["ue5"] as const;

export const logicInputSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Logic.Input:slider", () => new NumberSliderNode() as never, {
            label: "Number Slider", category: "Logic.Input",
            inputPorts:  [],
            outputPorts: [{ slot: "value", optional: false, type: "float" }],
            standards: UE5,
        });
    },
};
