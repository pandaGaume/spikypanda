import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createMotionWatchNode, MotionWatchNode } from "./motion.node.js";

export { MotionWatchNode, createMotionWatchNode };
export type { IMotionAlarm } from "./motion.node.js";
export { MotionWatch } from "./motion.js";
export type { MotionWatchOptions, MotionResult, IMotionEvent } from "./motion.js";

/**
 * `ML.Detect`: per-element detection signatures.
 *
 * V1 ships one node:
 *   motion   per-element movement watch: a frozen healthy reference
 *            (per-element typical step + baseline window path) learned
 *            during warmup, then a jump test (abnormal step) and a
 *            freeze test (rolling path collapse) per element, both
 *            rising-edge latched with hysteresis, each firing a
 *            wire-compatible Alert Bus alarm. The `_rebaseline`
 *            control input re-enters warmup on demand (control-plane
 *            trigger so it never gates the vector stream).
 *
 * The underlying library (MotionWatch) is exported alongside the node
 * so headless pipelines can watch motion without instantiating a graph.
 */
export const mlDetectSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("ML.Detect:motion", () => createMotionWatchNode() as never, {
            label: "Motion Watch (freeze/jump)",
            docPath: ctx.assetUrl("docs/ml/detect/motion.md"),
            category: "ML.Detect",
            // The rebaseline trigger is NOT listed here: it lives in
            // the control plane (`_rebaseline` in the node's
            // controlInputPorts, drained by processControlInputs), so
            // it never counts toward the scheduler's required-inputs
            // gate the way a wired data input would.
            inputPorts: [{ slot: "vector", optional: false, type: "tensor" }],
            outputPorts: [
                // Capacity 4 mirrors the runtime descriptor: one step
                // can burst one alarm per fired element (and both
                // signatures), so a capacity-1 slot would overflow.
                { slot: "alarm", optional: false, type: "any", capacity: 4 },
                { slot: "moving", optional: true, type: "float" },
            ],
        });
    },
};
