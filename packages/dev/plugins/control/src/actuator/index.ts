import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createSetpointNode, SetpointNode } from "./setpoint.node.js";

export { SetpointNode, createSetpointNode };

/**
 * `Control.Actuator` — actuator-side primitives.
 *
 *   setpoint   continuous-value request with rate-limit (slew) +
 *              saturation. Wraps a control loop's output so the rest
 *              of the plant model never sees a non-physical command.
 *
 * Future companions: bipolar limiter, dead-band, anti-windup integrator,
 * PWM dispatcher.
 */
export const controlActuatorSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Control.Actuator:setpoint", () => createSetpointNode() as never, {
            label: "Setpoint",
            category: "Control.Actuator",
            inputPorts: [
                { slot: "request", optional: false, type: "float" },
                { slot: "t", optional: true, type: "float" },
            ],
            outputPorts: [
                { slot: "applied", optional: false, type: "float" },
                { slot: "clamped", optional: false, type: "boolean" },
                { slot: "rateLimited", optional: false, type: "boolean" },
            ],
        });
    },
};
