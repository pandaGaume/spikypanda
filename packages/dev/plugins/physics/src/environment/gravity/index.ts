import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createGravityVectorNode, GravityVectorNode } from "./gravity-vector.node.js";
import { createRotorSagNode, RotorSagNode } from "./rotor-sag.node.js";
import { createBearingPreloadNode, BearingPreloadNode } from "./bearing-preload.node.js";
import { createMountingComplianceNode, MountingComplianceNode } from "./mounting-compliance.node.js";

export {
    GravityVectorNode,
    createGravityVectorNode,
    RotorSagNode,
    createRotorSagNode,
    BearingPreloadNode,
    createBearingPreloadNode,
    MountingComplianceNode,
    createMountingComplianceNode,
};

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const environmentGravitySubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Environment.Gravity:vector", () => createGravityVectorNode() as never, {
            label: "Gravity Vector (body frame)",
            category: "Physics.Environment.Gravity",
            docPath: ctx.assetUrl("docs/physics/environment-gravity/gravity-vector.md"),
            inputPorts: [
                { slot: "local", optional: true, type: "matrix44" },
                { slot: "parent_world", optional: true, type: "matrix44" },
            ],
            outputPorts: [
                { slot: "world", optional: false, type: "matrix44" },
                { slot: "g_x", ...FLOAT_OUT },
                { slot: "g_y", ...FLOAT_OUT },
                { slot: "g_z", ...FLOAT_OUT },
                { slot: "g_radial", ...FLOAT_OUT },
                { slot: "g_axial", ...FLOAT_OUT },
                { slot: "g_angle", ...FLOAT_OUT },
            ],
        });
        ctx.nodes.register("Physics.Environment.Gravity:rotor-sag", () => createRotorSagNode() as never, {
            label: "Rotor Sag (gravity)",
            category: "Physics.Environment.Gravity",
            docPath: ctx.assetUrl("docs/physics/environment-gravity/rotor-sag.md"),
            inputPorts: [
                { slot: "g_radial", ...FLOAT_IN },
                { slot: "g_angle", ...FLOAT_IN },
                { slot: "theta_m", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "flux", optional: false, type: "any" },
                { slot: "force_y", ...FLOAT_OUT },
                { slot: "force_z", ...FLOAT_OUT },
            ],
        });
        ctx.nodes.register("Physics.Environment.Gravity:bearing-preload", () => createBearingPreloadNode() as never, {
            label: "Bearing Preload (gravity)",
            category: "Physics.Environment.Gravity",
            docPath: ctx.assetUrl("docs/physics/environment-gravity/bearing-preload.md"),
            inputPorts: [
                { slot: "g_axial", ...FLOAT_IN },
                { slot: "g_radial", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "F_axial_eff", ...FLOAT_OUT },
                { slot: "F_radial_eff", ...FLOAT_OUT },
            ],
        });
        ctx.nodes.register("Physics.Environment.Gravity:mounting-compliance", () => createMountingComplianceNode() as never, {
            label: "Mounting Compliance (gravity)",
            category: "Physics.Environment.Gravity",
            docPath: ctx.assetUrl("docs/physics/environment-gravity/mounting-compliance.md"),
            inputPorts: [
                { slot: "g_x", ...FLOAT_IN },
                { slot: "g_y", ...FLOAT_IN },
                { slot: "g_z", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "force_x", ...FLOAT_OUT },
                { slot: "force_y", ...FLOAT_OUT },
                { slot: "force_z", ...FLOAT_OUT },
            ],
        });
    },
};
