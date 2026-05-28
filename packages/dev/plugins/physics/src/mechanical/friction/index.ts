import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createCoulombFrictionNode, CoulombFrictionNode } from "./coulomb.node.js";

export { CoulombFrictionNode, createCoulombFrictionNode };

const FLOAT_IN  = { optional: true,  type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const frictionSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Mechanical.Friction:coulomb", () => createCoulombFrictionNode() as never, {
            label:    "Coulomb + Stribeck Friction",
            category: "Physics.Mechanical.Friction",
            inputPorts: [
                { slot: "omega", ...FLOAT_IN },
                { slot: "tau_c", ...FLOAT_IN },
                { slot: "tau_s", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "tau_friction", ...FLOAT_OUT },
            ],
        });
    },
};
