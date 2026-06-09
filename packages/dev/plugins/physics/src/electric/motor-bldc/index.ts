import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createBldcMotorDynamicNode, BldcMotorDynamicNode } from "./bldc-dynamic.node.js";
import { createPmsmMotorDynamicNode, PmsmMotorDynamicNode } from "./pmsm-dynamic.node.js";
import { createBldcInverterNode, BldcInverterNode } from "./inverter.node.js";
import { createBldcSpeedPiNode, BldcSpeedPiNode } from "./controller-pi.node.js";

export {
    BldcMotorDynamicNode,
    createBldcMotorDynamicNode,
    PmsmMotorDynamicNode,
    createPmsmMotorDynamicNode,
    BldcInverterNode,
    createBldcInverterNode,
    BldcSpeedPiNode,
    createBldcSpeedPiNode,
};

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;
const MAT44_IN = { optional: true, type: "matrix44" } as const;
const MAT44_OUT = { optional: false, type: "matrix44" } as const;
const FAULT_IN = { optional: true, type: "any" } as const;
const SCENE_IN = { optional: true, type: "any" } as const;

/** Base-class-inherited port blocks shared by the BLDC and PMSM motors:
 *  transform pose + scene attach + variadic fault bank (fault_0 grows on connect). */
const BASE_IN_PORTS = [
    { slot: "local", ...MAT44_IN },
    { slot: "parent_world", ...MAT44_IN },
    { slot: "scene", ...SCENE_IN },
    { slot: "fault_0", ...FAULT_IN },
] as const;
const TRANSFORM_OUT_PORT = { slot: "world", ...MAT44_OUT } as const;

export const motorBldcSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Electric.Motor.BLDC:dynamic", () => createBldcMotorDynamicNode() as never, {
            label: "BLDC Motor (Dynamic)",
            category: "Physics.Electric.Motor.BLDC",
            docPath: ctx.assetUrl("docs/physics/motor-bldc/bldc-dynamic.md"),
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
            ],
        });

        ctx.nodes.register("Physics.Electric.Motor.BLDC:pmsm", () => createPmsmMotorDynamicNode() as never, {
            label: "PMSM Motor (Dynamic, sinusoidal)",
            category: "Physics.Electric.Motor.BLDC",
            docPath: ctx.assetUrl("docs/physics/motor-bldc/pmsm-dynamic.md"),
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
            ],
        });

        ctx.nodes.register("Physics.Electric.Motor.BLDC:inverter", () => createBldcInverterNode() as never, {
            label: "BLDC 6-step Inverter",
            category: "Physics.Electric.Motor.BLDC",
            docPath: ctx.assetUrl("docs/physics/motor-bldc/inverter.md"),
            inputPorts: [
                { slot: "V_dc", ...FLOAT_IN },
                { slot: "duty", ...FLOAT_IN },
                { slot: "theta_e", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "V_a", ...FLOAT_OUT },
                { slot: "V_b", ...FLOAT_OUT },
                { slot: "V_c", ...FLOAT_OUT },
                { slot: "sector", ...FLOAT_OUT },
            ],
        });

        ctx.nodes.register("Physics.Electric.Motor.BLDC:speedPI", () => createBldcSpeedPiNode() as never, {
            label: "BLDC Speed PI",
            category: "Physics.Electric.Motor.BLDC",
            inputPorts: [
                { slot: "omega_ref", ...FLOAT_IN },
                { slot: "omega_measured", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [{ slot: "duty", ...FLOAT_OUT }],
        });
    },
};
