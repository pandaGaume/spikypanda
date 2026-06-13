import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
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
} from "../nodes/array.js";

const UE5 = ["ue5"] as const;
const ARRAY_INOUT = { slot: "array", optional: false, type: "array" } as const;
const ARRAY_IN = { slot: "array", optional: true, type: "array" } as const;
const ITEM_IN = { slot: "item", optional: true, type: "any" } as const;
const INDEX_IN = { slot: "index", optional: true, type: "float" } as const;

export const logicArraySubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        // One shared doc for the whole library (the gas.md pattern):
        // a per-node table inside covers the 14 variants.
        const docPath = ctx.assetUrl("docs/logic/array/array.md");
        ctx.nodes.register("Logic.Array:makeArray", () => new MakeArrayNode() as never, {
            label: "Make Array",
            docPath,
            category: "Logic.Array",
            inputPorts: [{ slot: "item_0", optional: true, type: "any" }],
            outputPorts: [{ slot: "array", optional: false, type: "array" }],
            variadicInput: { prefix: "item_", type: "any" },
            standards: UE5,
        });
        ctx.nodes.register("Logic.Array:length", () => new ArrayLengthNode() as never, {
            label: "Length",
            docPath,
            category: "Logic.Array",
            inputPorts: [ARRAY_IN],
            outputPorts: [{ slot: "length", optional: false, type: "float" }],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Array:clear", () => new ArrayClearNode() as never, {
            label: "Clear",
            docPath,
            category: "Logic.Array",
            inputPorts: [ARRAY_IN],
            outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Array:shuffle", () => new ArrayShuffleNode() as never, {
            label: "Shuffle",
            docPath,
            category: "Logic.Array",
            inputPorts: [ARRAY_IN],
            outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Array:reverse", () => new ArrayReverseNode() as never, {
            label: "Reverse",
            docPath,
            category: "Logic.Array",
            inputPorts: [ARRAY_IN],
            outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Array:sort", () => new ArraySortNode() as never, {
            label: "Sort",
            docPath,
            category: "Logic.Array",
            inputPorts: [ARRAY_IN],
            outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Array:add", () => new ArrayAddNode() as never, {
            label: "Add",
            docPath,
            category: "Logic.Array",
            inputPorts: [ARRAY_IN, ITEM_IN],
            outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Array:insert", () => new ArrayInsertNode() as never, {
            label: "Insert",
            docPath,
            category: "Logic.Array",
            inputPorts: [ARRAY_IN, INDEX_IN, ITEM_IN],
            outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Array:set", () => new ArraySetNode() as never, {
            label: "Set Elem",
            docPath,
            category: "Logic.Array",
            inputPorts: [ARRAY_IN, INDEX_IN, ITEM_IN],
            outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Array:get", () => new ArrayGetNode() as never, {
            label: "Get",
            docPath,
            category: "Logic.Array",
            inputPorts: [ARRAY_IN, INDEX_IN],
            outputPorts: [{ slot: "item", optional: false, type: "any" }],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Array:remove", () => new ArrayRemoveNode() as never, {
            label: "Remove",
            docPath,
            category: "Logic.Array",
            inputPorts: [ARRAY_IN, ITEM_IN],
            outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Array:removeIndex", () => new ArrayRemoveIndexNode() as never, {
            label: "Remove Index",
            docPath,
            category: "Logic.Array",
            inputPorts: [ARRAY_IN, INDEX_IN],
            outputPorts: [ARRAY_INOUT],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Array:contains", () => new ArrayContainsNode() as never, {
            label: "Contains",
            docPath,
            category: "Logic.Array",
            inputPorts: [ARRAY_IN, ITEM_IN],
            outputPorts: [{ slot: "result", optional: false, type: "boolean" }],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Array:find", () => new ArrayFindNode() as never, {
            label: "Find",
            docPath,
            category: "Logic.Array",
            inputPorts: [ARRAY_IN, ITEM_IN],
            outputPorts: [{ slot: "index", optional: false, type: "float" }],
            standards: UE5,
        });
    },
};
