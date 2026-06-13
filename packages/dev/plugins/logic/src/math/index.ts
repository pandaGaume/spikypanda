import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import {
    AddNode,
    SubtractNode,
    MultiplyNode,
    DivideNode,
    ModNode,
    MinNode,
    MaxNode,
    PowNode,
    NegateNode,
    AbsNode,
    FloorNode,
    CeilNode,
    RoundNode,
    SqrtNode,
    SinNode,
    CosNode,
    ClampNode,
    LerpNode,
    SumNode,
} from "../nodes/math.js";

const UE5 = ["ue5"] as const;
const NUM_IN = (slot: string) => ({ slot, optional: true, type: "float" }) as const;
const NUM_OUT = { slot: "result", optional: false, type: "float" } as const;

export const logicMathSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        // One shared doc for the whole family (the gas.md pattern):
        // an operator table inside covers all 19 variants.
        const docPath = ctx.assetUrl("docs/logic/math/math.md");
        const binary = (id: string, label: string, factory: () => never): void => {
            ctx.nodes.register(id, factory, {
                label,
                docPath,
                category: "Logic.Math",
                inputPorts: [NUM_IN("a"), NUM_IN("b")],
                outputPorts: [NUM_OUT],
                standards: UE5,
            });
        };
        const unary = (id: string, label: string, factory: () => never): void => {
            ctx.nodes.register(id, factory, {
                label,
                docPath,
                category: "Logic.Math",
                inputPorts: [NUM_IN("a")],
                outputPorts: [NUM_OUT],
                standards: UE5,
            });
        };

        binary("Logic.Math:add", "Add", () => new AddNode() as never);
        binary("Logic.Math:subtract", "Subtract", () => new SubtractNode() as never);
        binary("Logic.Math:multiply", "Multiply", () => new MultiplyNode() as never);
        binary("Logic.Math:divide", "Divide", () => new DivideNode() as never);
        binary("Logic.Math:mod", "Mod", () => new ModNode() as never);
        binary("Logic.Math:min", "Min", () => new MinNode() as never);
        binary("Logic.Math:max", "Max", () => new MaxNode() as never);
        binary("Logic.Math:pow", "Pow", () => new PowNode() as never);
        unary("Logic.Math:negate", "Negate", () => new NegateNode() as never);
        unary("Logic.Math:abs", "Abs", () => new AbsNode() as never);
        unary("Logic.Math:floor", "Floor", () => new FloorNode() as never);
        unary("Logic.Math:ceil", "Ceil", () => new CeilNode() as never);
        unary("Logic.Math:round", "Round", () => new RoundNode() as never);
        unary("Logic.Math:sqrt", "Sqrt", () => new SqrtNode() as never);
        unary("Logic.Math:sin", "Sin", () => new SinNode() as never);
        unary("Logic.Math:cos", "Cos", () => new CosNode() as never);

        ctx.nodes.register("Logic.Math:clamp", () => new ClampNode() as never, {
            label: "Clamp",
            docPath,
            category: "Logic.Math",
            inputPorts: [NUM_IN("value"), NUM_IN("min"), NUM_IN("max")],
            outputPorts: [NUM_OUT],
            standards: UE5,
        });
        ctx.nodes.register("Logic.Math:lerp", () => new LerpNode() as never, {
            label: "Lerp",
            docPath,
            category: "Logic.Math",
            inputPorts: [NUM_IN("a"), NUM_IN("b"), NUM_IN("t")],
            outputPorts: [NUM_OUT],
            standards: UE5,
        });

        // Sum: variadic adder, declared with `variadicInput` so the
        // editor's reconciler auto-grows the port list (`in_0`, `in_1`,
        // ... appearing as the user wires successive inputs). No UE5
        // standard tag: Blueprint has no direct N-ary float Add.
        ctx.nodes.register("Logic.Math:sum", () => new SumNode() as never, {
            label: "Sum",
            docPath,
            category: "Logic.Math",
            inputPorts: [NUM_IN("in_0")],
            outputPorts: [NUM_OUT],
            variadicInput: { prefix: "in_", type: "float" },
        });
    },
};
