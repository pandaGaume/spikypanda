import { controlActuatorSubPlugin } from "./actuator/index.js";
import { controlFeedbackSubPlugin } from "./feedback/index.js";
import { controlSafetySubPlugin } from "./safety/index.js";
import { controlSimSubPlugin } from "./sim/index.js";

export * from "./actuator/setpoint.node.js";
export * from "./feedback/channel.node.js";
export * from "./safety/emergency-shutdown.node.js";
export * from "./sim/rk4-solver.node.js";

export { controlActuatorSubPlugin } from "./actuator/index.js";
export { controlFeedbackSubPlugin } from "./feedback/index.js";
export { controlSafetySubPlugin } from "./safety/index.js";
export { controlSimSubPlugin } from "./sim/index.js";

/**
 * @spikypanda/plugin-control
 *
 * Control-systems primitives, organized as thematic sub-plugins under
 * the `Control.*` namespace:
 *
 *   Control.Actuator    Setpoint (rate-limited + clamped command).
 *                       Future: dead-band, anti-windup integrator, PWM.
 *   Control.Feedback    Feedback Channel (Z^-N unit delay) — breaks
 *                       cyclic control graphs (motor + PI + sensor)
 *                       into topologically DAG-valid forms.
 *   Control.Safety      Emergency Shutdown (latched fail-safe).
 *                       Future: watchdog, interlock, voting.
 *
 * Sits alongside plugin-logic and plugin-physics. plugin-logic carries
 * Blueprint-style control flow (Branch, Sequence, Loops). plugin-physics
 * carries the domain models (motors, faults). plugin-control fills the
 * gap with control-theory plumbing that both depend on without being
 * either "flow" or "physics".
 *
 * Setpoint and Emergency Shutdown were previously published under
 * `Physics.Control:*` — they were moved here when the catalog grew
 * past a single node, matching the original split-off plan documented
 * in the V0.1 physics control sub-plugin.
 */
export default {
    subPlugins: {
        "Control.Actuator": controlActuatorSubPlugin,
        "Control.Feedback": controlFeedbackSubPlugin,
        "Control.Safety": controlSafetySubPlugin,
        "Control.Sim": controlSimSubPlugin,
    },
};
