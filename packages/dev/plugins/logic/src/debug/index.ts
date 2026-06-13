import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { PrintNode, WatchNode } from "../nodes/debug.js";

const UE5 = ["ue5"] as const;

export const logicDebugSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Logic.Debug:print", () => new PrintNode() as never, {
            label: "Print String",
            docPath: ctx.assetUrl("docs/logic/debug/print.md"),
            category: "Logic.Debug",
            inputPorts: [
                { slot: "in", optional: true, type: "trigger" },
                { slot: "text", optional: true, type: "string" },
            ],
            outputPorts: [{ slot: "then", optional: false, type: "trigger" }],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Debug:watch", () => new WatchNode() as never, {
            label: "Watch Value",
            docPath: ctx.assetUrl("docs/logic/debug/watch.md"),
            category: "Logic.Debug",
            inputPorts: [{ slot: "value", optional: true, type: "any" }],
            outputPorts: [],
            standards: UE5,
        });
    },
};
