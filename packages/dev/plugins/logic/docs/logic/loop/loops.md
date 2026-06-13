# Loops

`Logic.Loop:forLoop` (+ 4 variants: `:forEachLoop`, `:whileLoop`, `:forLoopWithBreak`, `:forEachLoopWithBreak`)

UE5-Blueprint loop family. The crucial split is the EXECUTION MODE, because it changes both how fast iterations run and how memory is bounded:

- SYNC loops (`forLoop`, `forEachLoop`) publish the WHOLE burst (every `body` + `index` token) from a single `fire()`; the scheduler drains it FIFO inside the same `Session.run(t)`. All iterations complete in one tick.
- CROSS-TICK loops (`whileLoop`, `forLoopWithBreak`, `forEachLoopWithBreak`) publish ONE iteration per `fire()` and re-arm via the scheduler. Between iterations the downstream subgraph gets a chance to publish a `_break` trigger or update the while `condition`, which is what makes dynamic exit possible, at the cost of one scheduler cycle per iteration: in Play mode (rAF, 60 Hz) each iteration takes about 16 ms; in Run Once mode only ONE iteration completes.

## Variants

| typeId | Mode | Inputs | Control inputs | Outputs | Editables (defaults) |
|---|---|---|---|---|---|
| `:forLoop` | sync | `in`, `firstIndex`, `lastIndex` | none | `body`, `index`, `completed` | `firstIndex` 0, `lastIndex` 4, `maxIterations` 256 |
| `:forEachLoop` | sync | `in`, `array` | none | `body`, `element`, `index`, `completed` | `maxIterations` 256 |
| `:whileLoop` | cross-tick | `in`, `condition` | none | `body`, `completed` | `condition` false, `maxIterations` 10000 |
| `:forLoopWithBreak` | cross-tick | `in`, `firstIndex`, `lastIndex` | `_break` | `body`, `index`, `completed` | `firstIndex` 0, `lastIndex` 4 |
| `:forEachLoopWithBreak` | cross-tick | `in`, `array` | `_break` | `body`, `element`, `index`, `completed` | none |

All loops are armed by a trigger on `in`; `firstIndex` / `lastIndex` / `array` / `condition` read the wired token at arm time (or each iteration for `condition`), falling back to the editables.

## Sync mode: capacity derives from maxIterations

The per-channel FIFO that absorbs the burst is statically sized: the `body` / `index` (/ `element`) output ports declare `capacity = max(1, maxIterations) + 1`. Two consequences that bite:

- Changing `maxIterations` changes the port capacities through a getter, but the buffers are sized at SESSION BUILD: the new value takes effect at the next session rebuild, not mid-run.
- A range (or array length) LARGER than `maxIterations` does not truncate: the node THROWS (`[ForLoop] count N exceeds maxIterations M`) and kills the run. Raise `maxIterations` or narrow the range. An empty range (`lastIndex < firstIndex`) or empty array fires `completed` immediately with no `body`.

`forLoop` iterates `floor(firstIndex)` through `floor(lastIndex)` INCLUSIVE (defaults 0..4 = 5 iterations), publishing `body` (a `true` token) and `index` per iteration, then one `completed`.

## Cross-tick mode: break and while semantics

- `whileLoop`: once armed, each fire reads `condition` (wired token wins, else editable), publishes `body` while true, publishes `completed` and disarms when false. Reaching `maxIterations` (10000) forces a `completed` exit so a stuck-true condition cannot freeze the runtime.
- `_break` on the WithBreak variants is a CONTROL-plane trigger (drained before readiness, never gates scheduling): any token disarms the loop immediately. Per the UE5 contract, break does NOT fire `completed`; only natural exhaustion does. Outputs have the default capacity 1 (one outstanding iteration at a time).
- `forEachLoopWithBreak` snapshots the array (`slice()`) when it arms: mutations published upstream during the iteration do not affect the running loop.

## Pitfalls

- The default while `condition` is false: an unwired While Loop completes on its first armed fire without ever running `body`.
- Cross-tick loop pacing is scheduler pacing. A 1000-element ForEach with Break takes about 17 seconds of wall time at 60 Hz Play; use the sync `forEachLoop` when you do not need break.
- The `_break` token must be PUBLISHED before the loop's next dispatch to take effect on that iteration; a break decided inside the same tick lands one iteration later.
