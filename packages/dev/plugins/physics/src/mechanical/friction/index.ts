import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createCoulombFrictionNode, CoulombFrictionNode } from "./coulomb.node.js";

export { CoulombFrictionNode, createCoulombFrictionNode };

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const frictionSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Mechanical.Friction:coulomb", () => createCoulombFrictionNode() as never, {
            label: "Coulomb + Stribeck Friction",
            category: "Physics.Mechanical.Friction",
            docPath: ctx.assetUrl("docs/physics/friction/coulomb.md"),
            inputPorts: [
                { slot: "angularVelocity", ...FLOAT_IN },
                { slot: "coulombTorque", ...FLOAT_IN },
                { slot: "stribeckTorque", ...FLOAT_IN },
            ],
            outputPorts: [{ slot: "frictionTorque", ...FLOAT_OUT }],
        });
    },
};
