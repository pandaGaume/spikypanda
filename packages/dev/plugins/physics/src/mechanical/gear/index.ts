import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createGearMeshNode, GearMeshNode } from "./mesh.node.js";

export { GearMeshNode, createGearMeshNode };

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const gearSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Mechanical.Gear:mesh", () => createGearMeshNode() as never, {
            label: "Gear Mesh + Tooth Fault",
            category: "Physics.Mechanical.Gear",
            docPath: ctx.assetUrl("docs/physics/gear/mesh.md"),
            inputPorts: [
                { slot: "inputSignal", ...FLOAT_IN },
                { slot: "angularVelocity", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "outputSignal", ...FLOAT_OUT },
                { slot: "meshFrequencyHz", ...FLOAT_OUT },
            ],
        });
    },
};
