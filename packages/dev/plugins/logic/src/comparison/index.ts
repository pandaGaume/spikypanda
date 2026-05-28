import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import {
    EqualNode, NotEqualNode, GreaterNode, LessNode, GreaterOrEqualNode, LessOrEqualNode,
} from "../nodes/comparison.js";

const ENTRIES: ReadonlyArray<{ type: string; label: string; factory: () => unknown }> = [
    { type: "Logic.Comparison:equal",          label: "Equal",            factory: () => new EqualNode()          },
    { type: "Logic.Comparison:notEqual",       label: "Not Equal",        factory: () => new NotEqualNode()       },
    { type: "Logic.Comparison:greater",        label: "Greater",          factory: () => new GreaterNode()        },
    { type: "Logic.Comparison:less",           label: "Less",             factory: () => new LessNode()           },
    { type: "Logic.Comparison:greaterOrEqual", label: "Greater or Equal", factory: () => new GreaterOrEqualNode() },
    { type: "Logic.Comparison:lessOrEqual",    label: "Less or Equal",    factory: () => new LessOrEqualNode()    },
];

const UE5 = ["ue5"] as const;

export const logicComparisonSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        for (const entry of ENTRIES) {
            ctx.nodes.register(entry.type, entry.factory as () => never, {
                label:    entry.label,
                category: "Logic.Comparison",
                inputPorts:  [
                    { slot: "a", optional: true, type: "float" },
                    { slot: "b", optional: true, type: "float" },
                ],
                outputPorts: [
                    { slot: "result", optional: false, type: "boolean" },
                ],
                standards: UE5,
            });
        }
    },
};
