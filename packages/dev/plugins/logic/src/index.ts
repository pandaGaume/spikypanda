import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import {
    EqualNode,
    NotEqualNode,
    GreaterNode,
    LessNode,
    GreaterOrEqualNode,
    LessOrEqualNode,
} from "./nodes/comparison.js";
import {
    BranchNode,
    SequenceNode,
    DoOnceNode,
    GateNode,
} from "./nodes/flow.js";
import {
    MakeArrayNode,
    ArrayLengthNode,
    ArrayClearNode,
    ArrayShuffleNode,
    ArrayReverseNode,
    ArraySortNode,
    ArrayAddNode,
    ArrayInsertNode,
    ArraySetNode,
    ArrayGetNode,
    ArrayRemoveNode,
    ArrayRemoveIndexNode,
    ArrayContainsNode,
    ArrayFindNode,
} from "./nodes/array.js";
import {
    ForLoopNode,
    ForEachLoopNode,
    WhileLoopNode,
    ForLoopWithBreakNode,
    ForEachLoopWithBreakNode,
} from "./nodes/loops.js";
import {
    PrintNode,
    WatchNode,
} from "./nodes/debug.js";

export {
    EqualNode,
    NotEqualNode,
    GreaterNode,
    LessNode,
    GreaterOrEqualNode,
    LessOrEqualNode,
    BranchNode,
    SequenceNode,
    DoOnceNode,
    GateNode,
    MakeArrayNode,
    ArrayLengthNode,
    ArrayClearNode,
    ArrayShuffleNode,
    ArrayReverseNode,
    ArraySortNode,
    ArrayAddNode,
    ArrayInsertNode,
    ArraySetNode,
    ArrayGetNode,
    ArrayRemoveNode,
    ArrayRemoveIndexNode,
    ArrayContainsNode,
    ArrayFindNode,
};

interface IComparisonRegistration {
    type:    string;
    label:   string;
    factory: () => unknown;
}

const COMPARISON_NODES: ReadonlyArray<IComparisonRegistration> = [
    { type: "spk.logic:equal",          label: "Equal",            factory: () => new EqualNode()          },
    { type: "spk.logic:notEqual",       label: "Not Equal",        factory: () => new NotEqualNode()       },
    { type: "spk.logic:greater",        label: "Greater",          factory: () => new GreaterNode()        },
    { type: "spk.logic:less",           label: "Less",             factory: () => new LessNode()           },
    { type: "spk.logic:greaterOrEqual", label: "Greater or Equal", factory: () => new GreaterOrEqualNode() },
    { type: "spk.logic:lessOrEqual",    label: "Less or Equal",    factory: () => new LessOrEqualNode()    },
];

const plugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        for (const entry of COMPARISON_NODES) {
            ctx.nodes.register(entry.type, entry.factory as () => never, {
                label:    entry.label,
                category: "logic-comparison",
                inputPorts:  [
                    { slot: "a", optional: true, type: "float" },
                    { slot: "b", optional: true, type: "float" },
                ],
                outputPorts: [
                    { slot: "result", optional: false, type: "boolean" },
                ],
            });
        }

        // ── Flow control ────────────────────────────────────────────────
        ctx.nodes.register("spk.logic:branch", () => new BranchNode(), {
            label: "Branch",
            category: "logic-flow",
            inputPorts:  [
                { slot: "in",        optional: true, type: "trigger" },
                { slot: "condition", optional: true, type: "boolean" },
            ],
            outputPorts: [
                { slot: "true",  optional: false, type: "trigger" },
                { slot: "false", optional: false, type: "trigger" },
            ],
        });

        ctx.nodes.register("spk.logic:sequence", () => new SequenceNode(), {
            label: "Sequence",
            category: "logic-flow",
            inputPorts:  [
                { slot: "in", optional: true, type: "trigger" },
            ],
            outputPorts: [
                { slot: "then_0", optional: false, type: "trigger" },
            ],
            // Editor grows the `then_*` set on demand so the user can
            // add as many follow-up triggers as they need without
            // restarting the node.
            variadicOutput: { prefix: "then_", type: "trigger" },
        });

        ctx.nodes.register("spk.logic:doOnce", () => new DoOnceNode(), {
            label: "Do Once",
            category: "logic-flow",
            inputPorts:  [
                { slot: "in", optional: true, type: "trigger" },
            ],
            outputPorts: [
                { slot: "then", optional: false, type: "trigger" },
            ],
        });

        ctx.nodes.register("spk.logic:gate", () => new GateNode(), {
            label: "Gate",
            category: "logic-flow",
            inputPorts:  [
                { slot: "in", optional: true, type: "trigger" },
            ],
            outputPorts: [
                { slot: "then", optional: false, type: "trigger" },
            ],
        });

        // ── Array (UE5 "Array Library") ─────────────────────────────────
        ctx.nodes.register("spk.logic:makeArray", () => new MakeArrayNode(), {
            label: "Make Array",
            category: "logic-array",
            inputPorts:  [{ slot: "item_0", optional: true, type: "any" }],
            outputPorts: [{ slot: "array",  optional: false, type: "array" }],
            // Grow `item_*` as the user wires the trailing slot.
            variadicInput: { prefix: "item_", type: "any" },
        });

        const ARRAY_INOUT = { slot: "array", optional: false, type: "array" } as const;
        const ARRAY_IN    = { slot: "array", optional: true,  type: "array" } as const;
        const ITEM_IN     = { slot: "item",  optional: true,  type: "any"   } as const;
        const INDEX_IN    = { slot: "index", optional: true,  type: "float" } as const;

        ctx.nodes.register("spk.logic:arrayLength", () => new ArrayLengthNode(), {
            label: "Length",      category: "logic-array",
            inputPorts:  [ARRAY_IN],
            outputPorts: [{ slot: "length", optional: false, type: "float" }],
        });
        ctx.nodes.register("spk.logic:arrayClear", () => new ArrayClearNode(), {
            label: "Clear",       category: "logic-array",
            inputPorts:  [ARRAY_IN], outputPorts: [ARRAY_INOUT],
        });
        ctx.nodes.register("spk.logic:arrayShuffle", () => new ArrayShuffleNode(), {
            label: "Shuffle",     category: "logic-array",
            inputPorts:  [ARRAY_IN], outputPorts: [ARRAY_INOUT],
        });
        ctx.nodes.register("spk.logic:arrayReverse", () => new ArrayReverseNode(), {
            label: "Reverse",     category: "logic-array",
            inputPorts:  [ARRAY_IN], outputPorts: [ARRAY_INOUT],
        });
        ctx.nodes.register("spk.logic:arraySort", () => new ArraySortNode(), {
            label: "Sort",        category: "logic-array",
            inputPorts:  [ARRAY_IN], outputPorts: [ARRAY_INOUT],
        });
        ctx.nodes.register("spk.logic:arrayAdd", () => new ArrayAddNode(), {
            label: "Add",         category: "logic-array",
            inputPorts:  [ARRAY_IN, ITEM_IN], outputPorts: [ARRAY_INOUT],
        });
        ctx.nodes.register("spk.logic:arrayInsert", () => new ArrayInsertNode(), {
            label: "Insert",      category: "logic-array",
            inputPorts:  [ARRAY_IN, INDEX_IN, ITEM_IN], outputPorts: [ARRAY_INOUT],
        });
        ctx.nodes.register("spk.logic:arraySet", () => new ArraySetNode(), {
            label: "Set Elem",    category: "logic-array",
            inputPorts:  [ARRAY_IN, INDEX_IN, ITEM_IN], outputPorts: [ARRAY_INOUT],
        });
        ctx.nodes.register("spk.logic:arrayGet", () => new ArrayGetNode(), {
            label: "Get",         category: "logic-array",
            inputPorts:  [ARRAY_IN, INDEX_IN],
            outputPorts: [{ slot: "item", optional: false, type: "any" }],
        });
        ctx.nodes.register("spk.logic:arrayRemove", () => new ArrayRemoveNode(), {
            label: "Remove",      category: "logic-array",
            inputPorts:  [ARRAY_IN, ITEM_IN], outputPorts: [ARRAY_INOUT],
        });
        ctx.nodes.register("spk.logic:arrayRemoveIndex", () => new ArrayRemoveIndexNode(), {
            label: "Remove Index", category: "logic-array",
            inputPorts:  [ARRAY_IN, INDEX_IN], outputPorts: [ARRAY_INOUT],
        });
        ctx.nodes.register("spk.logic:arrayContains", () => new ArrayContainsNode(), {
            label: "Contains",    category: "logic-array",
            inputPorts:  [ARRAY_IN, ITEM_IN],
            outputPorts: [{ slot: "result", optional: false, type: "boolean" }],
        });
        ctx.nodes.register("spk.logic:arrayFind", () => new ArrayFindNode(), {
            label: "Find",        category: "logic-array",
            inputPorts:  [ARRAY_IN, ITEM_IN],
            outputPorts: [{ slot: "index", optional: false, type: "float" }],
        });

        // ── Loops ──────────────────────────────────────────────────────
        ctx.nodes.register("spk.logic:forLoop", () => new ForLoopNode(), {
            label: "For Loop", category: "logic-loop",
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
        });
        ctx.nodes.register("spk.logic:forEachLoop", () => new ForEachLoopNode(), {
            label: "For Each Loop", category: "logic-loop",
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
        });
        ctx.nodes.register("spk.logic:whileLoop", () => new WhileLoopNode(), {
            label: "While Loop", category: "logic-loop",
            inputPorts:  [
                { slot: "in",        optional: true, type: "trigger" },
                { slot: "condition", optional: true, type: "boolean" },
            ],
            outputPorts: [
                { slot: "body",      optional: false, type: "trigger" },
                { slot: "completed", optional: false, type: "trigger" },
            ],
        });
        ctx.nodes.register("spk.logic:forLoopWithBreak", () => new ForLoopWithBreakNode(), {
            label: "For Loop with Break", category: "logic-loop",
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
        });
        ctx.nodes.register("spk.logic:forEachLoopWithBreak", () => new ForEachLoopWithBreakNode(), {
            label: "For Each Loop with Break", category: "logic-loop",
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
        });

        // ── Debug / introspection ──────────────────────────────────────
        ctx.nodes.register("spk.logic:print", () => new PrintNode(), {
            label: "Print String", category: "logic-debug",
            inputPorts:  [
                { slot: "in",   optional: true, type: "trigger" },
                { slot: "text", optional: true, type: "string"  },
            ],
            outputPorts: [
                { slot: "then", optional: false, type: "trigger" },
            ],
        });
        ctx.nodes.register("spk.logic:watch", () => new WatchNode(), {
            label: "Watch Value", category: "logic-debug",
            inputPorts:  [
                { slot: "value", optional: true, type: "any" },
            ],
            outputPorts: [],
        });
    },
};

export { PrintNode, WatchNode };

export default plugin;
