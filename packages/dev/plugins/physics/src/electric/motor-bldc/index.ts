import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createBldcMotorDynamicNode, BldcMotorDynamicNode } from "./bldc-dynamic.node.js";
import { createPmsmMotorDynamicNode, PmsmMotorDynamicNode } from "./pmsm-dynamic.node.js";
import { createBldcInverterNode, BldcInverterNode }         from "./inverter.node.js";
import { createBldcSpeedPiNode, BldcSpeedPiNode }           from "./controller-pi.node.js";

export {
    BldcMotorDynamicNode, createBldcMotorDynamicNode,
    PmsmMotorDynamicNode, createPmsmMotorDynamicNode,
    BldcInverterNode,     createBldcInverterNode,
    BldcSpeedPiNode,      createBldcSpeedPiNode,
};

const FLOAT_IN  = { optional: true,  type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const motorBldcSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Electric.Motor.BLDC:dynamic", () => createBldcMotorDynamicNode() as never, {
            label:    "BLDC Motor (Dynamic)",
            category: "Physics.Electric.Motor.BLDC",
            inputPorts: [
                { slot: "V_a",      ...FLOAT_IN },
                { slot: "V_b",      ...FLOAT_IN },
                { slot: "V_c",      ...FLOAT_IN },
                { slot: "tau_load", ...FLOAT_IN },
                { slot: "dt",       ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "i_a",     ...FLOAT_OUT },
                { slot: "i_b",     ...FLOAT_OUT },
                { slot: "i_c",     ...FLOAT_OUT },
                { slot: "omega",   ...FLOAT_OUT },
                { slot: "theta_m", ...FLOAT_OUT },
                { slot: "tau_em",  ...FLOAT_OUT },
            ],
        });

        ctx.nodes.register("Physics.Electric.Motor.BLDC:pmsm", () => createPmsmMotorDynamicNode() as never, {
            label:    "PMSM Motor (Dynamic, sinusoidal)",
            category: "Physics.Electric.Motor.BLDC",
            inputPorts: [
                { slot: "V_a",      ...FLOAT_IN },
                { slot: "V_b",      ...FLOAT_IN },
                { slot: "V_c",      ...FLOAT_IN },
                { slot: "tau_load", ...FLOAT_IN },
                { slot: "dt",       ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "i_a",     ...FLOAT_OUT },
                { slot: "i_b",     ...FLOAT_OUT },
                { slot: "i_c",     ...FLOAT_OUT },
                { slot: "omega",   ...FLOAT_OUT },
                { slot: "theta_m", ...FLOAT_OUT },
                { slot: "tau_em",  ...FLOAT_OUT },
            ],
        });

        ctx.nodes.register("Physics.Electric.Motor.BLDC:inverter", () => createBldcInverterNode() as never, {
            label:    "BLDC 6-step Inverter",
            category: "Physics.Electric.Motor.BLDC",
            inputPorts: [
                { slot: "V_dc",    ...FLOAT_IN },
                { slot: "duty",    ...FLOAT_IN },
                { slot: "theta_e", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "V_a",    ...FLOAT_OUT },
                { slot: "V_b",    ...FLOAT_OUT },
                { slot: "V_c",    ...FLOAT_OUT },
                { slot: "sector", ...FLOAT_OUT },
            ],
        });

        ctx.nodes.register("Physics.Electric.Motor.BLDC:speedPI", () => createBldcSpeedPiNode() as never, {
            label:    "BLDC Speed PI",
            category: "Physics.Electric.Motor.BLDC",
            inputPorts: [
                { slot: "omega_ref",      ...FLOAT_IN },
                { slot: "omega_measured", ...FLOAT_IN },
                { slot: "dt",             ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "duty", ...FLOAT_OUT },
            ],
        });
    },
};
