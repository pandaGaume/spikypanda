import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createCurrentSensorNode, CurrentSensorNode, createDcMotorCurrentSensorNode, DcMotorCurrentSensorNode } from "./current-sensor.node.js";
import { createPowerMeterNode, PowerMeterNode } from "./power-meter.node.js";

export { CurrentSensorNode, createCurrentSensorNode, DcMotorCurrentSensorNode, createDcMotorCurrentSensorNode, PowerMeterNode, createPowerMeterNode };

const FLOAT_IN = { optional: true, type: "float" } as const;
const FLOAT_OUT = { optional: false, type: "float" } as const;

/**
 * `Physics.Electric.Sensor` sub-plugin: motor-agnostic electrical
 * transducers. Today: a current sensor (Hall / shunt) with bandwidth,
 * noise and quantization, usable on any current line (DC supply, PMSM
 * phase i_a/i_b/i_c, or rotor-frame i_d/i_q read off the machine).
 *
 * The same node is also kept registered as the legacy
 * `Physics.Electric.Motor.DC:currentSensor` (alias, in the Motor.DC
 * sub-plugin) so saved graphs keep resolving.
 */
export const electricSensorSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Electric.Sensor:current", () => createCurrentSensorNode() as never, {
            label: "Current Sensor",
            category: "Physics.Electric.Sensor",
            docPath: ctx.assetUrl("docs/physics/sensor/current-sensor.md"),
            inputPorts: [{ slot: "i", ...FLOAT_IN }],
            outputPorts: [{ slot: "i_measured", ...FLOAT_OUT }],
        });
        ctx.nodes.register("Physics.Electric.Sensor:power", () => createPowerMeterNode() as never, {
            label: "Power / Energy Meter",
            category: "Physics.Electric.Sensor",
            docPath: ctx.assetUrl("docs/physics/sensor/power-meter.md"),
            inputPorts: [
                { slot: "v_a", ...FLOAT_IN },
                { slot: "v_b", ...FLOAT_IN },
                { slot: "v_c", ...FLOAT_IN },
                { slot: "i_a", ...FLOAT_IN },
                { slot: "i_b", ...FLOAT_IN },
                { slot: "i_c", ...FLOAT_IN },
                { slot: "v_d", ...FLOAT_IN },
                { slot: "v_q", ...FLOAT_IN },
                { slot: "i_d", ...FLOAT_IN },
                { slot: "i_q", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "P", ...FLOAT_OUT },
                { slot: "Q", ...FLOAT_OUT },
                { slot: "S", ...FLOAT_OUT },
                { slot: "power_factor", ...FLOAT_OUT },
                { slot: "E_active", ...FLOAT_OUT },
                { slot: "E_reactive", ...FLOAT_OUT },
                { slot: "P_dq", ...FLOAT_OUT },
                { slot: "Q_dq", ...FLOAT_OUT },
            ],
        });
    },
};
