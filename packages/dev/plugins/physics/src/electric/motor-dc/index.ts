import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createDcMotorDynamicNode, DcMotorDynamicNode } from "./dynamic.node.js";
import { createDcMotorSteadyNode, DcMotorSteadyNode } from "./steady.node.js";
import { createDcMotorSpeedPiNode, DcMotorSpeedPiNode } from "./controller-pi.node.js";
import { createDcMotorTachymeterNode, DcMotorTachymeterNode } from "./tachymeter.node.js";
import { createDcInverterNode, DcInverterNode } from "./inverter.node.js";
import { createDcMotorCurrentPiNode, DcMotorCurrentPiNode } from "./current-pi.node.js";
import { createDcMotorCurrentSensorNode, DcMotorCurrentSensorNode } from "../sensor/current-sensor.node.js";

export {
    DcMotorDynamicNode,
    createDcMotorDynamicNode,
    DcMotorSteadyNode,
    createDcMotorSteadyNode,
    DcMotorSpeedPiNode,
    createDcMotorSpeedPiNode,
    DcMotorTachymeterNode,
    createDcMotorTachymeterNode,
    DcInverterNode,
    createDcInverterNode,
    DcMotorCurrentPiNode,
    createDcMotorCurrentPiNode,
    DcMotorCurrentSensorNode,
    createDcMotorCurrentSensorNode,
};

const FLOAT_OUT = { optional: false, type: "float" } as const;
const FLOAT_IN = { optional: true, type: "float" } as const;
const MAT44_IN = { optional: true, type: "matrix44" } as const;
const MAT44_OUT = { optional: false, type: "matrix44" } as const;
const FAULT_IN = { optional: true, type: "any" } as const;
const SCENE_IN = { optional: true, type: "scene" } as const;

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
            docPath: {
                "en-US": ctx.assetUrl("docs/physics/motor-dc/dynamic.en-US.md"),
                "fr-FR": ctx.assetUrl("docs/physics/motor-dc/dynamic.fr-FR.md"),
            },
            // dt port dropped — DcMotorDynamicNode is now IIntegrable.
            // The Session's attached solver owns the timebase via
            // session.dt, the motor exposes its state via gatherState
            // / writeState / rhs. Drop a Control.Sim:rk4-solver marker
            // node in the graph to enable integration.
            inputPorts: [...BASE_IN_PORTS, { slot: "V", ...FLOAT_IN }, { slot: "tau_load", ...FLOAT_IN }],
            outputPorts: [TRANSFORM_OUT_PORT, { slot: "i", ...FLOAT_OUT }, { slot: "omega", ...FLOAT_OUT }, { slot: "tau_em", ...FLOAT_OUT }],
        });

        ctx.nodes.register("Physics.Electric.Motor.DC:steady", () => createDcMotorSteadyNode() as never, {
            label: "DC Motor (Steady)",
            category: "Physics.Electric.Motor.DC",
            docPath: ctx.assetUrl("docs/physics/motor-dc/steady.md"),
            inputPorts: [...BASE_IN_PORTS, { slot: "V", ...FLOAT_IN }, { slot: "tau_load", ...FLOAT_IN }],
            outputPorts: [TRANSFORM_OUT_PORT, { slot: "i", ...FLOAT_OUT }, { slot: "omega", ...FLOAT_OUT }, { slot: "tau", ...FLOAT_OUT }, { slot: "back_emf", ...FLOAT_OUT }],
        });

        ctx.nodes.register("Physics.Electric.Motor.DC:speedPI", () => createDcMotorSpeedPiNode() as never, {
            label: "DC Motor Speed PI",
            category: "Physics.Electric.Motor.DC",
            docPath: ctx.assetUrl("docs/physics/motor-dc/speed-pi.md"),
            // dt port dropped — the controller now reads `session.dt`,
            // which is the same value the integration phase used for
            // any IIntegrable leaves earlier in the same tick. Single
            // source of truth across the entire closed loop.
            inputPorts: [
                { slot: "omega_ref", ...FLOAT_IN },
                { slot: "omega_measured", ...FLOAT_IN },
            ],
            outputPorts: [{ slot: "V_cmd", ...FLOAT_OUT }],
        });

        ctx.nodes.register("Physics.Electric.Motor.DC:tachymeter", () => createDcMotorTachymeterNode() as never, {
            label: "Tachymeter",
            category: "Physics.Electric.Motor.DC",
            docPath: ctx.assetUrl("docs/physics/motor-dc/tachymeter.md"),
            // dt port dropped — see Speed PI above for the rationale.
            inputPorts: [{ slot: "omega", ...FLOAT_IN }],
            outputPorts: [{ slot: "omega_measured", ...FLOAT_OUT }],
        });

        // ── MCSA chain: PWM Inverter + Current PI + Current Sensor ──
        // These three nodes complete the realistic VFD drive chain
        // that produces full-spectrum current signatures for MCSA
        // analysis (PWM carrier + sidebands + fault intermodulation).
        // See helios/sim-framework-api-v2.draft.md (MCSA section).

        ctx.nodes.register("Physics.Electric.Motor.DC:inverter", () => createDcInverterNode() as never, {
            label: "DC PWM Inverter",
            category: "Physics.Electric.Motor.DC",
            docPath: ctx.assetUrl("docs/physics/motor-dc/inverter.md"),
            inputPorts: [{ slot: "V_cmd", ...FLOAT_IN }],
            outputPorts: [
                { slot: "V", ...FLOAT_OUT },
                { slot: "duty", ...FLOAT_OUT },
                { slot: "switching", optional: false, type: "boolean" },
            ],
        });

        ctx.nodes.register("Physics.Electric.Motor.DC:currentPI", () => createDcMotorCurrentPiNode() as never, {
            label: "DC Motor Current PI",
            category: "Physics.Electric.Motor.DC",
            docPath: ctx.assetUrl("docs/physics/motor-dc/current-pi.md"),
            inputPorts: [
                { slot: "i_ref", ...FLOAT_IN },
                { slot: "i_measured", ...FLOAT_IN },
            ],
            outputPorts: [{ slot: "V_cmd", ...FLOAT_OUT }],
        });

        // Alias of the generic Physics.Electric.Sensor:current (same node
        // class). Kept so graphs saved with the original DC-scoped typeId
        // still resolve; new graphs should use Physics.Electric.Sensor:current.
        ctx.nodes.register("Physics.Electric.Motor.DC:currentSensor", () => createDcMotorCurrentSensorNode() as never, {
            label: "Current Sensor (LEM)",
            category: "Physics.Electric.Motor.DC",
            docPath: ctx.assetUrl("docs/physics/motor-dc/current-sensor.md"),
            inputPorts: [{ slot: "i", ...FLOAT_IN }],
            outputPorts: [{ slot: "i_measured", ...FLOAT_OUT }],
        });
    },
};
