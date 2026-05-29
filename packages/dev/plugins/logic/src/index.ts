import { logicComparisonSubPlugin } from "./comparison/index.js";
import { logicFlowSubPlugin } from "./flow/index.js";
import { logicArraySubPlugin } from "./array/index.js";
import { logicLoopSubPlugin } from "./loop/index.js";
import { logicDebugSubPlugin } from "./debug/index.js";
import { logicMathSubPlugin } from "./math/index.js";
import { logicTimeSubPlugin } from "./time/index.js";
import { logicInputSubPlugin } from "./input/index.js";

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

/**
 * @spikypanda/plugin-logic
 *
 * UE5-Blueprint-style control flow and primitives, organized as 8
 * thematic sub-plugins under the `Logic.*` namespace:
 *
 *   Logic.Comparison  Equal, NotEqual, Greater, Less, ≥, ≤
 *   Logic.Flow        Branch, Sequence, Do Once, Gate, Select
 *   Logic.Array       MakeArray + 13 array library operations
 *   Logic.Loop        For, ForEach, While (+ break variants)
 *   Logic.Debug       Print String, Watch Value
 *   Logic.Math        18 scalar math ops + Clamp/Lerp
 *   Logic.Time        Clock, Delta Time, Timer
 *   Logic.Input       Number Slider
 *
 * Every node carries the `ue5` standard — they all map 1:1 onto UE5
 * Blueprint nodes.
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
    },
};
