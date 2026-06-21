import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createShaftUnbalanceNode, ShaftUnbalanceNode } from "./unbalance.node.js";

export { ShaftUnbalanceNode, createShaftUnbalanceNode };

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const shaftSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Mechanical.Shaft:unbalance", () => createShaftUnbalanceNode() as never, {
            label: "Shaft Unbalance (1× rotation)",
            category: "Physics.Mechanical.Shaft",
            docPath: ctx.assetUrl("docs/physics/shaft/unbalance.md"),
            inputPorts: [
                { slot: "inputSignal", ...FLOAT_IN },
                { slot: "angularVelocity", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "outputSignal", ...FLOAT_OUT },
                { slot: "shaftAngle", ...FLOAT_OUT },
            ],
        });
    },
};
