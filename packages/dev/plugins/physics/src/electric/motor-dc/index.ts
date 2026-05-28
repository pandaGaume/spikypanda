import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createDcMotorDynamicNode, DcMotorDynamicNode } from "./dynamic.node.js";
import { createDcMotorSteadyNode, DcMotorSteadyNode } from "./steady.node.js";
import { createDcMotorSpeedPiNode, DcMotorSpeedPiNode } from "./controller-pi.node.js";
import { createDcMotorTachymeterNode, DcMotorTachymeterNode } from "./tachymeter.node.js";

export {
    DcMotorDynamicNode, createDcMotorDynamicNode,
    DcMotorSteadyNode, createDcMotorSteadyNode,
    DcMotorSpeedPiNode, createDcMotorSpeedPiNode,
    DcMotorTachymeterNode, createDcMotorTachymeterNode,
};

const FLOAT_OUT = { optional: false, type: "float" } as const;
const FLOAT_IN  = { optional: true,  type: "float" } as const;

/**
 * `Physics.Electric.Motor.DC` sub-plugin entry point. The parent bundle's
 * default export exposes this under `subPlugins["Physics.Electric.Motor.DC"]`,
 * so the v2 editor's loader can find and activate it after parsing the
 * manifest's `subPlugins[]` entry.
 */
export const motorDcSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Electric.Motor.DC:dynamic", () => createDcMotorDynamicNode() as never, {
            label:       "DC Motor (Dynamic)",
            category:    "Physics.Electric.Motor.DC",
            inputPorts:  [
                { slot: "V",        ...FLOAT_IN },
                { slot: "tau_load", ...FLOAT_IN },
                { slot: "dt",       ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "i",      ...FLOAT_OUT },
                { slot: "omega",  ...FLOAT_OUT },
                { slot: "tau_em", ...FLOAT_OUT },
            ],
        });

        ctx.nodes.register("Physics.Electric.Motor.DC:steady", () => createDcMotorSteadyNode() as never, {
            label:       "DC Motor (Steady)",
            category:    "Physics.Electric.Motor.DC",
            inputPorts:  [
                { slot: "V",        ...FLOAT_IN },
                { slot: "tau_load", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "i",        ...FLOAT_OUT },
                { slot: "omega",    ...FLOAT_OUT },
                { slot: "tau",      ...FLOAT_OUT },
                { slot: "back_emf", ...FLOAT_OUT },
            ],
        });

        ctx.nodes.register("Physics.Electric.Motor.DC:speedPI", () => createDcMotorSpeedPiNode() as never, {
            label:       "DC Motor Speed PI",
            category:    "Physics.Electric.Motor.DC",
            inputPorts:  [
                { slot: "omega_ref",      ...FLOAT_IN },
                { slot: "omega_measured", ...FLOAT_IN },
                { slot: "dt",             ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "V_cmd", ...FLOAT_OUT },
            ],
        });

        ctx.nodes.register("Physics.Electric.Motor.DC:tachymeter", () => createDcMotorTachymeterNode() as never, {
            label:       "Tachymeter",
            category:    "Physics.Electric.Motor.DC",
            inputPorts:  [
                { slot: "omega", ...FLOAT_IN },
                { slot: "dt",    ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "omega_measured", ...FLOAT_OUT },
            ],
        });
    },
};
