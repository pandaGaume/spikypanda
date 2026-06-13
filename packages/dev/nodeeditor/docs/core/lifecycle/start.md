# Start

`Core.Lifecycle:start`

Begin-Play entry point of a graph (the Unreal BeginPlay analogue): a pure source that publishes a one-shot trigger on its `_started` control output when Play begins. Wire `_started` to the `_start` control inputs of downstream runnable nodes to cascade the start across the graph.

## Mechanics

- `Session.start()` arms every StartNode of the graph (sets an internal pending flag); the editor transport does this when you press Play.
- On the NEXT `Session.run(t)` the node fires once: a boolean `true` token is published on every enabled channel wired to `_started`, then the flag clears.
- Subsequent ticks do nothing until `Session.start()` arms it again: one trigger per Play, not one per tick.
- No data ports and no control inputs. `supportsEnabling` is false, so the editor hides the enable toggle; the scheduler still respects `enabled` if a host clears it programmatically.

## Control outputs

| Slot       | Type    | Notes                                                                                                |
| ---------- | ------- | ---------------------------------------------------------------------------------------------------- |
| `_started` | trigger | One-shot Begin-Play signal. Optional: leaving it unwired is legal, the node then fires into nothing. |

## Editor lifecycle

One Start (and one Stop) is created automatically at boot and on every New, so the player cycle always has its entry points. Creation is gated by the `execute` permission: a host without Run gets no lifecycle nodes.

## Pitfalls

- The trigger fires on the first tick AFTER arming, never inside `Session.start()` itself; a graph that is started but never ticked emits nothing.
- These nodes used to be host-created without a typeId, so a saved graph reloaded them as inert JSON blobs and every `Start -> _start` wire silently died. They are now registry-backed (`Core.Lifecycle:start`): save records the typeId, load rebuilds a real StartNode. Re-save any graph from before the fix to repair it.
