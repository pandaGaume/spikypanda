import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createEmergencyShutdownNode, EmergencyShutdownNode } from "./emergency-shutdown.node.js";

export { EmergencyShutdownNode, createEmergencyShutdownNode };

/**
 * `Control.Safety` — fail-safe / interlock primitives.
 *
 *   emergency-shutdown   single latched safety bit. Trips on any
 *                        trigger=true, stays latched until reset.
 *                        Downstream actuators gate with !shutdown.
 *
 * Future companions: watchdog timer, AND-gate interlock,
 * voting / 2-of-3 redundancy, fault-tree summator.
 */
export const controlSafetySubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Control.Safety:emergency-shutdown", () => createEmergencyShutdownNode() as never, {
            label: "Emergency Shutdown",
            category: "Control.Safety",
            inputPorts: [
                { slot: "trigger", optional: true, type: "boolean" },
                { slot: "reset", optional: true, type: "boolean" },
            ],
            outputPorts: [{ slot: "shutdown", optional: false, type: "boolean" }],
        });
    },
};
