import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createInductionMotorDynamicNode, InductionMotorDynamicNode } from "./dynamic.node.js";

export { InductionMotorDynamicNode, createInductionMotorDynamicNode };

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;
const MAT44_IN = { optional: true, type: "matrix44" } as const;
const MAT44_OUT = { optional: false, type: "matrix44" } as const;
const FAULT_IN = { optional: true, type: "any" } as const;
const SCENE_IN = { optional: true, type: "scene" } as const;

/** Base-class-inherited port blocks shared with the other motors:
 *  transform pose + scene attach + variadic fault bank (fault_0 grows on connect). */
const BASE_IN_PORTS = [
    { slot: "local", ...MAT44_IN },
    { slot: "parent_world", ...MAT44_IN },
    { slot: "scene", ...SCENE_IN },
    { slot: "fault_0", ...FAULT_IN },
] as const;
const TRANSFORM_OUT_PORT = { slot: "world", ...MAT44_OUT } as const;

export const motorInductionSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Electric.Motor.Induction:dynamic", () => createInductionMotorDynamicNode() as never, {
            label: "Induction Motor (Squirrel Cage)",
            category: "Physics.Electric.Motor.Induction",
            docPath: ctx.assetUrl("docs/physics/motor-induction/dynamic.md"),
            inputPorts: [
                ...BASE_IN_PORTS,
                { slot: "V_a", ...FLOAT_IN },
                { slot: "V_b", ...FLOAT_IN },
                { slot: "V_c", ...FLOAT_IN },
                { slot: "tau_load", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [
                TRANSFORM_OUT_PORT,
                { slot: "i_a", ...FLOAT_OUT },
                { slot: "i_b", ...FLOAT_OUT },
                { slot: "i_c", ...FLOAT_OUT },
                { slot: "omega", ...FLOAT_OUT },
                { slot: "theta_m", ...FLOAT_OUT },
                { slot: "tau_em", ...FLOAT_OUT },
                { slot: "slip", ...FLOAT_OUT },
            ],
        });
    },
};
