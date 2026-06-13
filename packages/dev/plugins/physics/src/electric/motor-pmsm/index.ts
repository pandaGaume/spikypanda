import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createPmsmMachineDqNode, PmsmMachineDqNode } from "./machine-dq.node.js";
import { createPmsmFocNode, PmsmFocNode } from "./foc.node.js";
import { createPmsmSvpwmNode, PmsmSvpwmNode } from "./svpwm.node.js";
import { createPmsmInverterNode, PmsmInverterNode } from "./inverter.node.js";
import { createClarkeNode, ClarkeNode } from "./clarke.node.js";
import { createParkNode, ParkNode } from "./park.node.js";

export {
    PmsmMachineDqNode,
    createPmsmMachineDqNode,
    PmsmFocNode,
    createPmsmFocNode,
    PmsmSvpwmNode,
    createPmsmSvpwmNode,
    PmsmInverterNode,
    createPmsmInverterNode,
    ClarkeNode,
    createClarkeNode,
    ParkNode,
    createParkNode,
};

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

export const motorPmsmSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Electric.Motor.PMSM:foc", () => createPmsmFocNode() as never, {
            label: "PMSM FOC Controller",
            category: "Physics.Electric.Motor.PMSM",
            docPath: ctx.assetUrl("docs/physics/motor-pmsm/foc.md"),
            inputPorts: [
                { slot: "i_d", ...FLOAT_IN },
                { slot: "i_q", ...FLOAT_IN },
                { slot: "omega", ...FLOAT_IN },
                { slot: "theta_m", ...FLOAT_IN },
                { slot: "speed_target", ...FLOAT_IN },
                { slot: "iq_ref", ...FLOAT_IN },
                { slot: "v_bus", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "V_alpha", ...FLOAT_OUT },
                { slot: "V_beta", ...FLOAT_OUT },
                { slot: "V_a", ...FLOAT_OUT },
                { slot: "V_b", ...FLOAT_OUT },
                { slot: "V_c", ...FLOAT_OUT },
            ],
        });
        ctx.nodes.register("Physics.Electric.Motor.PMSM:machine", () => createPmsmMachineDqNode() as never, {
            label: "PMSM Machine (dq)",
            category: "Physics.Electric.Motor.PMSM",
            docPath: ctx.assetUrl("docs/physics/motor-pmsm/machine-dq.md"),
            inputPorts: [
                { slot: "local", optional: true, type: "matrix44" },
                { slot: "parent_world", optional: true, type: "matrix44" },
                { slot: "fault_0", optional: true, type: "any" },
                { slot: "V_a", ...FLOAT_IN },
                { slot: "V_b", ...FLOAT_IN },
                { slot: "V_c", ...FLOAT_IN },
                { slot: "tau_load", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "world", optional: false, type: "matrix44" },
                { slot: "i_d", ...FLOAT_OUT },
                { slot: "i_q", ...FLOAT_OUT },
                { slot: "i_a", ...FLOAT_OUT },
                { slot: "i_b", ...FLOAT_OUT },
                { slot: "i_c", ...FLOAT_OUT },
                { slot: "omega", ...FLOAT_OUT },
                { slot: "theta_m", ...FLOAT_OUT },
                { slot: "tau_em", ...FLOAT_OUT },
            ],
        });
        ctx.nodes.register("Physics.Electric.Motor.PMSM:svpwm", () => createPmsmSvpwmNode() as never, {
            label: "SVPWM Modulator",
            category: "Physics.Electric.Motor.PMSM",
            docPath: ctx.assetUrl("docs/physics/motor-pmsm/svpwm.md"),
            inputPorts: [
                { slot: "V_alpha", ...FLOAT_IN },
                { slot: "V_beta", ...FLOAT_IN },
                { slot: "v_bus", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "duty_a", ...FLOAT_OUT },
                { slot: "duty_b", ...FLOAT_OUT },
                { slot: "duty_c", ...FLOAT_OUT },
            ],
        });
        ctx.nodes.register("Physics.Electric.Motor.PMSM:inverter", () => createPmsmInverterNode() as never, {
            label: "3-Phase Inverter (averaged)",
            category: "Physics.Electric.Motor.PMSM",
            docPath: ctx.assetUrl("docs/physics/motor-pmsm/inverter.md"),
            inputPorts: [
                { slot: "duty_a", ...FLOAT_IN },
                { slot: "duty_b", ...FLOAT_IN },
                { slot: "duty_c", ...FLOAT_IN },
                { slot: "v_bus", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "V_a", ...FLOAT_OUT },
                { slot: "V_b", ...FLOAT_OUT },
                { slot: "V_c", ...FLOAT_OUT },
            ],
        });
        ctx.nodes.register("Physics.Electric.Motor.PMSM:clarke", () => createClarkeNode() as never, {
            label: "Clarke (abc to alpha-beta)",
            category: "Physics.Electric.Motor.PMSM",
            docPath: ctx.assetUrl("docs/physics/motor-pmsm/clarke-park.md"),
            inputPorts: [
                { slot: "a", ...FLOAT_IN },
                { slot: "b", ...FLOAT_IN },
                { slot: "c", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "alpha", ...FLOAT_OUT },
                { slot: "beta", ...FLOAT_OUT },
            ],
        });
        ctx.nodes.register("Physics.Electric.Motor.PMSM:park", () => createParkNode() as never, {
            label: "Park (alpha-beta to dq)",
            category: "Physics.Electric.Motor.PMSM",
            docPath: ctx.assetUrl("docs/physics/motor-pmsm/clarke-park.md"),
            inputPorts: [
                { slot: "alpha", ...FLOAT_IN },
                { slot: "beta", ...FLOAT_IN },
                { slot: "theta_m", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "d", ...FLOAT_OUT },
                { slot: "q", ...FLOAT_OUT },
            ],
        });
    },
};
