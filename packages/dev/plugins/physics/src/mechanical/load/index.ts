import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createLoadTorqueNode, LoadTorqueNode } from "./load-torque.node.js";
import type { LoadProfile } from "./load-torque.node.js";

export { LoadTorqueNode, createLoadTorqueNode };
export type { LoadProfile };

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const loadSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Mechanical.Load:torque", () => createLoadTorqueNode() as never, {
            label: "Load Torque",
            docPath: ctx.assetUrl("docs/physics/load/torque.md"),
            category: "Physics.Mechanical.Load",
            inputPorts: [{ slot: "omega", ...FLOAT_IN }],
            outputPorts: [{ slot: "tau_load", ...FLOAT_OUT }],
        });
    },
};
