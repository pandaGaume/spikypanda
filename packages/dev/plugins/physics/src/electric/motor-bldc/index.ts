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
const SCENE_IN = { optional: true, type: "scene" } as const;

/** Base-class-inherited port blocks shared by the BLDC and PMSM motors:
 *  transform pose + scene attach + variadic fault bank (fault_0 grows on connect). */
const BASE_IN_PORTS = [
    { slot: "local", ...MAT44_IN },
    { slot: "parentWorld", ...MAT44_IN },
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
                { slot: "phaseVoltageA", ...FLOAT_IN },
                { slot: "phaseVoltageB", ...FLOAT_IN },
                { slot: "phaseVoltageC", ...FLOAT_IN },
                { slot: "loadTorque", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [
                TRANSFORM_OUT_PORT,
                { slot: "phaseCurrentA", ...FLOAT_OUT },
                { slot: "phaseCurrentB", ...FLOAT_OUT },
                { slot: "phaseCurrentC", ...FLOAT_OUT },
                { slot: "angularVelocity", ...FLOAT_OUT },
                { slot: "rotorAngle", ...FLOAT_OUT },
                { slot: "electromagneticTorque", ...FLOAT_OUT },
            ],
        });

        // NOTE: the sinusoidal PMSM motor (createPmsmMotorDynamicNode) is
        // registered under the PMSM category (Physics.Electric.Motor.PMSM:dynamic)
        // in motor-pmsm/index.ts (a PMSM belongs in the PMSM family, not
        // under BLDC). The node CODE stays here (it shares back-emf.ts and the
        // electrical/mechanical structure with the BLDC node); only the
        // palette registration lives with its taxonomic peers.

        ctx.nodes.register("Physics.Electric.Motor.BLDC:inverter", () => createBldcInverterNode() as never, {
            label: "BLDC 6-step Inverter",
            category: "Physics.Electric.Motor.BLDC",
            docPath: ctx.assetUrl("docs/physics/motor-bldc/inverter.md"),
            inputPorts: [
                { slot: "dcBusVoltage", ...FLOAT_IN },
                { slot: "dutyCycle", ...FLOAT_IN },
                { slot: "electricalAngle", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "phaseVoltageA", ...FLOAT_OUT },
                { slot: "phaseVoltageB", ...FLOAT_OUT },
                { slot: "phaseVoltageC", ...FLOAT_OUT },
                { slot: "sector", ...FLOAT_OUT },
            ],
        });

        ctx.nodes.register("Physics.Electric.Motor.BLDC:speedPI", () => createBldcSpeedPiNode() as never, {
            label: "BLDC Speed PI",
            category: "Physics.Electric.Motor.BLDC",
            docPath: ctx.assetUrl("docs/physics/motor-bldc/speed-pi.md"),
            inputPorts: [
                { slot: "angularVelocityReference", ...FLOAT_IN },
                { slot: "measuredAngularVelocity", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [{ slot: "dutyCycle", ...FLOAT_OUT }],
        });
    },
};
