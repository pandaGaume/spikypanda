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
import {
    AddNode, SubtractNode, MultiplyNode, DivideNode, ModNode,
    MinNode, MaxNode, PowNode,
    NegateNode, AbsNode, FloorNode, CeilNode, RoundNode, SqrtNode, SinNode, CosNode,
    ClampNode, LerpNode,
} from "./nodes/math.js";
import { SelectNode } from "./nodes/select.js";
import { ClockNode, DeltaTimeNode, NumberSliderNode } from "./nodes/time.js";
import { TimerNode } from "./nodes/timer.js";

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
        // Every logic node maps to a UE5 Blueprint equivalent (Branch,
        // Sequence, ForLoop, math operators, array library, etc.) so the
        // standards declaration is uniform across the plugin.
        const UE5: ReadonlyArray<string> = ["ue5"];
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
                standards: UE5,
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
            standards: UE5,
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
            standards: UE5,
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
            standards: UE5,
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
            standards: UE5,
        });

        // ── Array (UE5 "Array Library") ─────────────────────────────────
        ctx.nodes.register("spk.logic:makeArray", () => new MakeArrayNode(), {
            label: "Make Array",
            category: "logic-array",
            inputPorts:  [{ slot: "item_0", optional: true, type: "any" }],
            outputPorts: [{ slot: "array",  optional: false, type: "array" }],
            // Grow `item_*` as the user wires the trailing slot.
            variadicInput: { prefix: "item_", type: "any" },
            standards: UE5,
        });

        const ARRAY_INOUT = { slot: "array", optional: false, type: "array" } as const;
        const ARRAY_IN    = { slot: "array", optional: true,  type: "array" } as const;
        const ITEM_IN     = { slot: "item",  optional: true,  type: "any"   } as const;
        const INDEX_IN    = { slot: "index", optional: true,  type: "float" } as const;

        ctx.nodes.register("spk.logic:arrayLength", () => new ArrayLengthNode(), {
            label: "Length",      category: "logic-array",
            inputPorts:  [ARRAY_IN],
            outputPorts: [{ slot: "length", optional: false, type: "float" }],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:arrayClear", () => new ArrayClearNode(), {
            label: "Clear",       category: "logic-array",
            inputPorts:  [ARRAY_IN], outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:arrayShuffle", () => new ArrayShuffleNode(), {
            label: "Shuffle",     category: "logic-array",
            inputPorts:  [ARRAY_IN], outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:arrayReverse", () => new ArrayReverseNode(), {
            label: "Reverse",     category: "logic-array",
            inputPorts:  [ARRAY_IN], outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:arraySort", () => new ArraySortNode(), {
            label: "Sort",        category: "logic-array",
            inputPorts:  [ARRAY_IN], outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:arrayAdd", () => new ArrayAddNode(), {
            label: "Add",         category: "logic-array",
            inputPorts:  [ARRAY_IN, ITEM_IN], outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:arrayInsert", () => new ArrayInsertNode(), {
            label: "Insert",      category: "logic-array",
            inputPorts:  [ARRAY_IN, INDEX_IN, ITEM_IN], outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:arraySet", () => new ArraySetNode(), {
            label: "Set Elem",    category: "logic-array",
            inputPorts:  [ARRAY_IN, INDEX_IN, ITEM_IN], outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:arrayGet", () => new ArrayGetNode(), {
            label: "Get",         category: "logic-array",
            inputPorts:  [ARRAY_IN, INDEX_IN],
            outputPorts: [{ slot: "item", optional: false, type: "any" }],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:arrayRemove", () => new ArrayRemoveNode(), {
            label: "Remove",      category: "logic-array",
            inputPorts:  [ARRAY_IN, ITEM_IN], outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:arrayRemoveIndex", () => new ArrayRemoveIndexNode(), {
            label: "Remove Index", category: "logic-array",
            inputPorts:  [ARRAY_IN, INDEX_IN], outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:arrayContains", () => new ArrayContainsNode(), {
            label: "Contains",    category: "logic-array",
            inputPorts:  [ARRAY_IN, ITEM_IN],
            outputPorts: [{ slot: "result", optional: false, type: "boolean" }],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:arrayFind", () => new ArrayFindNode(), {
            label: "Find",        category: "logic-array",
            inputPorts:  [ARRAY_IN, ITEM_IN],
            outputPorts: [{ slot: "index", optional: false, type: "float" }],
            standards: UE5,
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
            standards: UE5,
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
            standards: UE5,
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
            standards: UE5,
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
            standards: UE5,
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
            standards: UE5,
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
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:watch", () => new WatchNode(), {
            label: "Watch Value", category: "logic-debug",
            inputPorts:  [
                { slot: "value", optional: true, type: "any" },
            ],
            outputPorts: [],
            standards: UE5,
        });

        // ── Math ───────────────────────────────────────────────────────
        const NUM_IN   = (slot: string) => ({ slot, optional: true,  type: "float" } as const);
        const NUM_OUT  = { slot: "result", optional: false, type: "float" } as const;

        const registerBinaryMath = (id: string, label: string, factory: () => never) => {
            ctx.nodes.register(id, factory, {
                label, category: "logic-math",
                inputPorts:  [NUM_IN("a"), NUM_IN("b")],
                outputPorts: [NUM_OUT],
                standards: UE5,
            });
        };
        const registerUnaryMath = (id: string, label: string, factory: () => never) => {
            ctx.nodes.register(id, factory, {
                label, category: "logic-math",
                inputPorts:  [NUM_IN("a")],
                outputPorts: [NUM_OUT],
                standards: UE5,
            });
        };
        registerBinaryMath("spk.logic:add",      "Add",      () => new AddNode()      as never);
        registerBinaryMath("spk.logic:subtract", "Subtract", () => new SubtractNode() as never);
        registerBinaryMath("spk.logic:multiply", "Multiply", () => new MultiplyNode() as never);
        registerBinaryMath("spk.logic:divide",   "Divide",   () => new DivideNode()   as never);
        registerBinaryMath("spk.logic:mod",      "Mod",      () => new ModNode()      as never);
        registerBinaryMath("spk.logic:min",      "Min",      () => new MinNode()      as never);
        registerBinaryMath("spk.logic:max",      "Max",      () => new MaxNode()      as never);
        registerBinaryMath("spk.logic:pow",      "Pow",      () => new PowNode()      as never);
        registerUnaryMath ("spk.logic:negate",   "Negate",   () => new NegateNode()   as never);
        registerUnaryMath ("spk.logic:abs",      "Abs",      () => new AbsNode()      as never);
        registerUnaryMath ("spk.logic:floor",    "Floor",    () => new FloorNode()    as never);
        registerUnaryMath ("spk.logic:ceil",     "Ceil",     () => new CeilNode()     as never);
        registerUnaryMath ("spk.logic:round",    "Round",    () => new RoundNode()    as never);
        registerUnaryMath ("spk.logic:sqrt",     "Sqrt",     () => new SqrtNode()     as never);
        registerUnaryMath ("spk.logic:sin",      "Sin",      () => new SinNode()      as never);
        registerUnaryMath ("spk.logic:cos",      "Cos",      () => new CosNode()      as never);

        ctx.nodes.register("spk.logic:clamp", () => new ClampNode(), {
            label: "Clamp", category: "logic-math",
            inputPorts:  [NUM_IN("value"), NUM_IN("min"), NUM_IN("max")],
            outputPorts: [NUM_OUT],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:lerp", () => new LerpNode(), {
            label: "Lerp", category: "logic-math",
            inputPorts:  [NUM_IN("a"), NUM_IN("b"), NUM_IN("t")],
            outputPorts: [NUM_OUT],
            standards: UE5,
        });

        // ── Time / inputs ──────────────────────────────────────────────
        ctx.nodes.register("spk.logic:clock", () => new ClockNode(), {
            label: "Clock", category: "logic-time",
            inputPorts:  [],
            outputPorts: [{ slot: "t", optional: false, type: "float" }],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:deltaTime", () => new DeltaTimeNode(), {
            label: "Delta Time", category: "logic-time",
            inputPorts:  [],
            outputPorts: [{ slot: "dt", optional: false, type: "float" }],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:slider", () => new NumberSliderNode(), {
            label: "Number Slider", category: "logic-input",
            inputPorts:  [],
            outputPorts: [{ slot: "value", optional: false, type: "float" }],
            standards: UE5,
        });
        ctx.nodes.register("spk.logic:timer", () => new TimerNode(), {
            label: "Timer", category: "logic-time",
            inputPorts:  [
                { slot: "duration", optional: true, type: "float" },
                { slot: "from",     optional: true, type: "float" },
                { slot: "to",       optional: true, type: "float" },
            ],
            outputPorts: [
                { slot: "progress", optional: false, type: "float" },
                { slot: "value",    optional: false, type: "float" },
            ],
            standards: UE5,
        });

        // ── Select ─────────────────────────────────────────────────────
        ctx.nodes.register("spk.logic:select", () => new SelectNode(), {
            label: "Select", category: "logic-flow",
            inputPorts:  [
                { slot: "a",         optional: true, type: "any"     },
                { slot: "b",         optional: true, type: "any"     },
                { slot: "condition", optional: true, type: "boolean" },
            ],
            outputPorts: [
                { slot: "result", optional: false, type: "any" },
            ],
            standards: UE5,
        });
    },
};

export {
    PrintNode, WatchNode,
    AddNode, SubtractNode, MultiplyNode, DivideNode, ModNode,
    MinNode, MaxNode, PowNode,
    NegateNode, AbsNode, FloorNode, CeilNode, RoundNode, SqrtNode, SinNode, CosNode,
    ClampNode, LerpNode,
    SelectNode,
    ClockNode, DeltaTimeNode, NumberSliderNode,
    TimerNode,
};

export default plugin;
