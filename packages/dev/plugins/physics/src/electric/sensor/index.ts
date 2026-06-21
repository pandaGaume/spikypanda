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
 * phase phaseCurrentA/phaseCurrentB/phaseCurrentC, or rotor-frame directAxisCurrent/quadratureAxisCurrent read off the machine).
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
            inputPorts: [{ slot: "armatureCurrent", ...FLOAT_IN }],
            outputPorts: [{ slot: "measuredCurrent", ...FLOAT_OUT }],
        });
        ctx.nodes.register("Physics.Electric.Sensor:power", () => createPowerMeterNode() as never, {
            label: "Power / Energy Meter",
            category: "Physics.Electric.Sensor",
            docPath: ctx.assetUrl("docs/physics/sensor/power-meter.md"),
            inputPorts: [
                { slot: "phaseVoltageA", ...FLOAT_IN },
                { slot: "phaseVoltageB", ...FLOAT_IN },
                { slot: "phaseVoltageC", ...FLOAT_IN },
                { slot: "phaseCurrentA", ...FLOAT_IN },
                { slot: "phaseCurrentB", ...FLOAT_IN },
                { slot: "phaseCurrentC", ...FLOAT_IN },
                { slot: "directAxisVoltage", ...FLOAT_IN },
                { slot: "quadratureAxisVoltage", ...FLOAT_IN },
                { slot: "directAxisCurrent", ...FLOAT_IN },
                { slot: "quadratureAxisCurrent", ...FLOAT_IN },
                { slot: "dt", ...FLOAT_IN },
            ],
            outputPorts: [
                { slot: "activePower", ...FLOAT_OUT },
                { slot: "reactivePower", ...FLOAT_OUT },
                { slot: "apparentPower", ...FLOAT_OUT },
                { slot: "powerFactor", ...FLOAT_OUT },
                { slot: "activeEnergy", ...FLOAT_OUT },
                { slot: "reactiveEnergy", ...FLOAT_OUT },
                { slot: "activePowerDq", ...FLOAT_OUT },
                { slot: "reactivePowerDq", ...FLOAT_OUT },
            ],
        });
    },
};
