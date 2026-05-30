import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createSetpointNode, SetpointNode } from "./setpoint.node.js";
import { createEmergencyShutdownNode, EmergencyShutdownNode } from "./emergency-shutdown.node.js";

export { SetpointNode, createSetpointNode };
export { EmergencyShutdownNode, createEmergencyShutdownNode };

/**
 * `Physics.Control` — generic control-system primitives.
 *
 *   setpoint              continuous-value request with rate-limit +
 *                         saturation (physical actuator limits)
 *   emergency-shutdown    single latched safety bit, monopoly of safety
 *                         agents — once tripped, stays true until reset
 *
 * Sits in plugin-physics next to the motor controllers (Speed PI on a
 * DC motor, BLDC inverter, etc.) — these are the control primitives
 * the existing physics nodes naturally compose with. A dedicated
 * plugin-control package can split off later if the catalog grows past
 * a handful of nodes (PID auto-tune, MPC, gain scheduler, ...).
 */
export const physicsControlSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Control:setpoint", () => createSetpointNode() as never, {
            label: "Setpoint",
            category: "Physics.Control",
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
        ctx.nodes.register("Physics.Control:emergency-shutdown", () => createEmergencyShutdownNode() as never, {
            label: "Emergency Shutdown",
            category: "Physics.Control",
            inputPorts: [
                { slot: "trigger", optional: true, type: "boolean" },
                { slot: "reset", optional: true, type: "boolean" },
            ],
            outputPorts: [{ slot: "shutdown", optional: false, type: "boolean" }],
        });
    },
};
