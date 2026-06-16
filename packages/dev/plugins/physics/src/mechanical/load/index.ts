import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createLoadTorqueNode, LoadTorqueNode } from "./load-torque.node.js";
import type { LoadProfile } from "./load-torque.node.js";
import { createGravityPayloadLoadNode, GravityPayloadLoadNode } from "./gravity-payload.node.js";

export { LoadTorqueNode, createLoadTorqueNode, GravityPayloadLoadNode, createGravityPayloadLoadNode };
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
        // Gravitational payload: a crank mass whose weight m*g, projected
        // through the motor orientation (wire a GravityVector's g_* in),
        // produces a 1x torque ripple (-> i_q signature) + bearing loads.
        // Scales with g (0 in microgravity) and shaft tilt; the load the
        // gravity-signature atlas needs.
        ctx.nodes.register("Physics.Mechanical.Load:gravity-payload", () => createGravityPayloadLoadNode() as never, {
            label: "Gravity Payload Load",
            docPath: ctx.assetUrl("docs/physics/load/gravity-payload.md"),
            category: "Physics.Mechanical.Load",
            inputPorts: [
                { slot: "local", optional: true, type: "matrix44" },
                { slot: "parent_world", optional: true, type: "matrix44" },
                { slot: "scene", optional: true, type: "scene" },
                { slot: "theta_m", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "world", optional: false, type: "matrix44" },
                { slot: "tau_load", ...FLOAT_OUT },
                { slot: "force_axial", ...FLOAT_OUT },
                { slot: "force_radial", ...FLOAT_OUT },
            ],
        });
    },
};
