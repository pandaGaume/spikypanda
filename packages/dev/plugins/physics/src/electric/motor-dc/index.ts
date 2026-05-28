import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createDcMotorDynamicNode, DcMotorDynamicNode } from "./dynamic.node.js";
import { createDcMotorSteadyNode, DcMotorSteadyNode } from "./steady.node.js";
import { createDcMotorSpeedPiNode, DcMotorSpeedPiNode } from "./controller-pi.node.js";
import { createDcMotorTachymeterNode, DcMotorTachymeterNode } from "./tachymeter.node.js";

export {
    DcMotorDynamicNode,
    createDcMotorDynamicNode,
    DcMotorSteadyNode,
    createDcMotorSteadyNode,
    DcMotorSpeedPiNode,
    createDcMotorSpeedPiNode,
    DcMotorTachymeterNode,
    createDcMotorTachymeterNode,
};

const FLOAT_OUT = { optional: false, type: "float" } as const;
const FLOAT_IN = { optional: true, type: "float" } as const;
const MAT44_IN = { optional: true, type: "matrix44" } as const;
const MAT44_OUT = { optional: false, type: "matrix44" } as const;
const FAULT_IN = { optional: true, type: "any" } as const;
const SCENE_IN = { optional: true, type: "any" } as const;

/** Base-class-inherited port blocks shared by every motor node:
 *  transform pose (local / parent_world / world) + scene attach +
 *  variadic fault bank (fault_0; the editor grows fault_1 ... on connect). */
const BASE_IN_PORTS = [
    { slot: "local", ...MAT44_IN },
    { slot: "parent_world", ...MAT44_IN },
    { slot: "scene", ...SCENE_IN },
    { slot: "fault_0", ...FAULT_IN },
] as const;
const TRANSFORM_OUT_PORT = { slot: "world", ...MAT44_OUT } as const;

/**
 * `Physics.Electric.Motor.DC` sub-plugin entry point. The parent bundle's
 * default export exposes this under `subPlugins["Physics.Electric.Motor.DC"]`,
 * so the v2 editor's loader can find and activate it after parsing the
 * manifest's `subPlugins[]` entry.
 *
 * Both motor nodes inherit `TransformNode` so they expose `local` +
 * `parent_world` matrix44 inputs and a `world` matrix44 output — they
 * are positionable in a world reference frame and compose with the
 * Geometry.Transform output without conversion.
 */
export const motorDcSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Electric.Motor.DC:dynamic", () => createDcMotorDynamicNode() as never, {
            label: "DC Motor (Dynamic)",
            category: "Physics.Electric.Motor.DC",
            inputPorts: [...BASE_IN_PORTS, { slot: "V", ...FLOAT_IN }, { slot: "tau_load", ...FLOAT_IN }, { slot: "dt", ...FLOAT_IN }],
            outputPorts: [TRANSFORM_OUT_PORT, { slot: "i", ...FLOAT_OUT }, { slot: "omega", ...FLOAT_OUT }, { slot: "tau_em", ...FLOAT_OUT }],
        });

        ctx.nodes.register("Physics.Electric.Motor.DC:steady", () => createDcMotorSteadyNode() as never, {
            label: "DC Motor (Steady)",
            category: "Physics.Electric.Motor.DC",
            inputPorts: [...BASE_IN_PORTS, { slot: "V", ...FLOAT_IN }, { slot: "tau_load", ...FLOAT_IN }],
            outputPorts: [TRANSFORM_OUT_PORT, { slot: "i", ...FLOAT_OUT }, { slot: "omega", ...FLOAT_OUT }, { slot: "tau", ...FLOAT_OUT }, { slot: "back_emf", ...FLOAT_OUT }],
        });

        ctx.nodes.register("Physics.Electric.Motor.DC:speedPI", () => createDcMotorSpeedPiNode() as never, {
            label: "DC Motor Speed PI",
            category: "Physics.Electric.Motor.DC",
            inputPorts: [
                { slot: "omega_ref", ...FLOAT_IN },
                { slot: "omega_measured", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [{ slot: "V_cmd", ...FLOAT_OUT }],
        });

        ctx.nodes.register("Physics.Electric.Motor.DC:tachymeter", () => createDcMotorTachymeterNode() as never, {
            label: "Tachymeter",
            category: "Physics.Electric.Motor.DC",
            inputPorts: [
                { slot: "omega", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [{ slot: "omega_measured", ...FLOAT_OUT }],
        });
    },
};
