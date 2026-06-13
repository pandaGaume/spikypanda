import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createHousingMechanicsNode, HousingMechanicsNode } from "./housing-mechanics.node.js";

export { HousingMechanicsNode, createHousingMechanicsNode };

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const housingSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Mechanical.Housing:mechanics", () => createHousingMechanicsNode() as never, {
            label: "Housing Mechanics",
            category: "Physics.Mechanical.Housing",
            docPath: ctx.assetUrl("docs/physics/housing/mechanics.md"),
            inputPorts: [
                { slot: "force_x", ...FLOAT_IN },
                { slot: "force_y", ...FLOAT_IN },
                { slot: "force_z", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "accel_x", ...FLOAT_OUT },
                { slot: "accel_y", ...FLOAT_OUT },
                { slot: "accel_z", ...FLOAT_OUT },
            ],
        });
    },
};
