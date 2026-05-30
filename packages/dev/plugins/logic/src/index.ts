import { logicComparisonSubPlugin } from "./comparison/index.js";
import { logicFlowSubPlugin } from "./flow/index.js";
import { logicArraySubPlugin } from "./array/index.js";
import { logicLoopSubPlugin } from "./loop/index.js";
import { logicDebugSubPlugin } from "./debug/index.js";
import { logicMathSubPlugin } from "./math/index.js";
import { logicTimeSubPlugin } from "./time/index.js";
import { logicInputSubPlugin } from "./input/index.js";
import { logicSimSubPlugin } from "./sim/index.js";
import { logicEventSubPlugin } from "./event/index.js";

// Re-export node classes so external consumers can still import them
// from "@spikypanda/plugin-logic" the same way they did pre-refactor.
export * from "./nodes/comparison.js";
export * from "./nodes/flow.js";
export * from "./nodes/array.js";
export * from "./nodes/loops.js";
export * from "./nodes/debug.js";
export * from "./nodes/math.js";
export * from "./nodes/select.js";
export * from "./nodes/time.js";
export * from "./nodes/timer.js";

export { logicComparisonSubPlugin } from "./comparison/index.js";
export { logicFlowSubPlugin } from "./flow/index.js";
export { logicArraySubPlugin } from "./array/index.js";
export { logicLoopSubPlugin } from "./loop/index.js";
export { logicDebugSubPlugin } from "./debug/index.js";
export { logicMathSubPlugin } from "./math/index.js";
export { logicTimeSubPlugin } from "./time/index.js";
export { logicInputSubPlugin } from "./input/index.js";
export {
    logicSimSubPlugin,
    RngSeedNode,
    createRngSeedNode,
    SnapshotNode,
    createSnapshotNode,
    RestoreNode,
    createRestoreNode,
    RateDividerNode,
    createRateDividerNode,
    ConservationMonitorNode,
    createConservationMonitorNode,
} from "./sim/index.js";
export { logicEventSubPlugin, AlertBusNode, createAlertBusNode, ArbitratorNode, createArbitratorNode } from "./event/index.js";

/**
 * @spikypanda/plugin-logic
 *
 * UE5-Blueprint-style control flow + simulation runtime primitives,
 * organized as thematic sub-plugins under the `Logic.*` namespace:
 *
 *   Logic.Comparison  Equal, NotEqual, Greater, Less, ≥, ≤
 *   Logic.Flow        Branch, Sequence, Do Once, Gate, Select
 *   Logic.Array       MakeArray + 13 array library operations
 *   Logic.Loop        For, ForEach, While (+ break variants)
 *   Logic.Debug       Print String, Watch Value
 *   Logic.Math        18 scalar math ops + Clamp/Lerp + Sum
 *   Logic.Time        Clock, Delta Time, Timer
 *   Logic.Input       Number Slider
 *   Logic.Sim         RNG Seed, Snapshot/Restore, Rate Divider,
 *                     Conservation Monitor (sim runtime primitives)
 *   Logic.Event       Alert Bus (typed pub/sub), Arbitrator (priority/
 *                     blend/vote merge for multi-source contention)
 *
 * Logic.Comparison/Flow/Array/Loop/Debug/Math/Time/Input nodes carry
 * the `ue5` standard. Logic.Sim and Logic.Event are runtime/orchestration
 * primitives with no direct UE5 equivalent.
 */
export default {
    subPlugins: {
        "Logic.Comparison": logicComparisonSubPlugin,
        "Logic.Flow": logicFlowSubPlugin,
        "Logic.Array": logicArraySubPlugin,
        "Logic.Loop": logicLoopSubPlugin,
        "Logic.Debug": logicDebugSubPlugin,
        "Logic.Math": logicMathSubPlugin,
        "Logic.Time": logicTimeSubPlugin,
        "Logic.Input": logicInputSubPlugin,
        "Logic.Sim": logicSimSubPlugin,
        "Logic.Event": logicEventSubPlugin,
    },
};
