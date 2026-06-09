import { controlActuatorSubPlugin } from "./actuator/index.js";
import { controlFeedbackSubPlugin } from "./feedback/index.js";
import { controlSafetySubPlugin } from "./safety/index.js";
import { controlSimSubPlugin } from "./sim/index.js";
import { simGraphSubPlugin } from "./sim-graph/index.js";

export * from "./actuator/setpoint.node.js";
export * from "./feedback/channel.node.js";
export * from "./safety/emergency-shutdown.node.js";
export * from "./sim/rk4-solver.item.js";

export { controlActuatorSubPlugin } from "./actuator/index.js";
export { controlFeedbackSubPlugin } from "./feedback/index.js";
export { controlSafetySubPlugin } from "./safety/index.js";
export { controlSimSubPlugin } from "./sim/index.js";
export { simGraphSubPlugin } from "./sim-graph/index.js";

/**
 * @spikypanda/plugin-control
 *
 * Control-systems primitives + sim-infrastructure nodes, organized as
 * thematic sub-plugins:
 *
 *   Control.Actuator    Setpoint (rate-limited + clamped command).
 *   Control.Feedback    Feedback Channel (Z^-N unit delay).
 *   Control.Safety      Emergency Shutdown (latched fail-safe).
 *   Control.Sim         RK4 Cash-Karp adaptive solver marker.
 *   Sim.Graph           Sub-graph fractal container with Scene binding
 *                       and multi-rate sub-stepping. Lives here for
 *                       V1; may migrate to a dedicated `@spikypanda/plugin-sim`
 *                       once additional sim-infrastructure nodes (rate-
 *                       group, hierarchical scheduler markers) join it.
 */
export default {
    subPlugins: {
        "Control.Actuator": controlActuatorSubPlugin,
        "Control.Feedback": controlFeedbackSubPlugin,
        "Control.Safety": controlSafetySubPlugin,
        "Control.Sim": controlSimSubPlugin,
        "Sim.Graph": simGraphSubPlugin,
    },
};
