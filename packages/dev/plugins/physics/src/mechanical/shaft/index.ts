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
            inputPorts: [
                { slot: "signal_in", ...FLOAT_IN },
                { slot: "omega", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "signal_out", ...FLOAT_OUT },
                { slot: "theta", ...FLOAT_OUT },
            ],
        });
    },
};
