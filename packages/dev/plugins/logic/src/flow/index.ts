import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { BranchNode, SequenceNode, DoOnceNode, GateNode } from "../nodes/flow.js";
import { SelectNode } from "../nodes/select.js";

const UE5 = ["ue5"] as const;

export const logicFlowSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Logic.Flow:branch", () => new BranchNode() as never, {
            label: "Branch",
            docPath: ctx.assetUrl("docs/logic/flow/branch.md"),
            category: "Logic.Flow",
            inputPorts: [
                { slot: "in", optional: true, type: "trigger" },
                { slot: "condition", optional: true, type: "boolean" },
            ],
            outputPorts: [
                { slot: "true", optional: false, type: "trigger" },
                { slot: "false", optional: false, type: "trigger" },
            ],
            standards: UE5,
        });

        ctx.nodes.register("Logic.Flow:sequence", () => new SequenceNode() as never, {
            label: "Sequence",
            docPath: ctx.assetUrl("docs/logic/flow/sequence.md"),
            category: "Logic.Flow",
            inputPorts: [{ slot: "in", optional: true, type: "trigger" }],
            outputPorts: [{ slot: "then_0", optional: false, type: "trigger" }],
            variadicOutput: { prefix: "then_", type: "trigger" },
            standards: UE5,
        });

        ctx.nodes.register("Logic.Flow:doOnce", () => new DoOnceNode() as never, {
            label: "Do Once",
            docPath: ctx.assetUrl("docs/logic/flow/doonce.md"),
            category: "Logic.Flow",
            inputPorts: [{ slot: "in", optional: true, type: "trigger" }],
            outputPorts: [{ slot: "then", optional: false, type: "trigger" }],
            standards: UE5,
        });

        ctx.nodes.register("Logic.Flow:gate", () => new GateNode() as never, {
            label: "Gate",
            docPath: ctx.assetUrl("docs/logic/flow/gate.md"),
            category: "Logic.Flow",
            inputPorts: [{ slot: "in", optional: true, type: "trigger" }],
            outputPorts: [{ slot: "then", optional: false, type: "trigger" }],
            standards: UE5,
        });

        ctx.nodes.register("Logic.Flow:select", () => new SelectNode() as never, {
            label: "Select",
            docPath: ctx.assetUrl("docs/logic/flow/select.md"),
            category: "Logic.Flow",
            inputPorts: [
                { slot: "a", optional: true, type: "any" },
                { slot: "b", optional: true, type: "any" },
                { slot: "condition", optional: true, type: "boolean" },
            ],
            outputPorts: [{ slot: "result", optional: false, type: "any" }],
            standards: UE5,
        });
    },
};
