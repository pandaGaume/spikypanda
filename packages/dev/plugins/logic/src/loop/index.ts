import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import {
    ForLoopNode, ForEachLoopNode, WhileLoopNode,
    ForLoopWithBreakNode, ForEachLoopWithBreakNode,
} from "../nodes/loops.js";

const UE5 = ["ue5"] as const;

export const logicLoopSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Logic.Loop:forLoop", () => new ForLoopNode() as never, {
            label: "For Loop", category: "Logic.Loop",
            inputPorts:  [
                { slot: "in",         optional: true, type: "trigger" },
                { slot: "firstIndex", optional: true, type: "float"   },
                { slot: "lastIndex",  optional: true, type: "float"   },
            ],
            outputPorts: [
                { slot: "body",      optional: false, type: "trigger" },
                { slot: "index",     optional: false, type: "float"   },
                { slot: "completed", optional: false, type: "trigger" },
            ],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Loop:forEachLoop", () => new ForEachLoopNode() as never, {
            label: "For Each Loop", category: "Logic.Loop",
            inputPorts:  [
                { slot: "in",    optional: true, type: "trigger" },
                { slot: "array", optional: true, type: "array"   },
            ],
            outputPorts: [
                { slot: "body",      optional: false, type: "trigger" },
                { slot: "element",   optional: false, type: "any"     },
                { slot: "index",     optional: false, type: "float"   },
                { slot: "completed", optional: false, type: "trigger" },
            ],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Loop:whileLoop", () => new WhileLoopNode() as never, {
            label: "While Loop", category: "Logic.Loop",
            inputPorts:  [
                { slot: "in",        optional: true, type: "trigger" },
                { slot: "condition", optional: true, type: "boolean" },
            ],
            outputPorts: [
                { slot: "body",      optional: false, type: "trigger" },
                { slot: "completed", optional: false, type: "trigger" },
            ],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Loop:forLoopWithBreak", () => new ForLoopWithBreakNode() as never, {
            label: "For Loop with Break", category: "Logic.Loop",
            inputPorts:  [
                { slot: "in",         optional: true, type: "trigger" },
                { slot: "firstIndex", optional: true, type: "float"   },
                { slot: "lastIndex",  optional: true, type: "float"   },
            ],
            outputPorts: [
                { slot: "body",      optional: false, type: "trigger" },
                { slot: "index",     optional: false, type: "float"   },
                { slot: "completed", optional: false, type: "trigger" },
            ],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Loop:forEachLoopWithBreak", () => new ForEachLoopWithBreakNode() as never, {
            label: "For Each Loop with Break", category: "Logic.Loop",
            inputPorts:  [
                { slot: "in",    optional: true, type: "trigger" },
                { slot: "array", optional: true, type: "array"   },
            ],
            outputPorts: [
                { slot: "body",      optional: false, type: "trigger" },
                { slot: "element",   optional: false, type: "any"     },
                { slot: "index",     optional: false, type: "float"   },
                { slot: "completed", optional: false, type: "trigger" },
            ],
            standards: UE5,
        });
    },
};
