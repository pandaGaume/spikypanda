# Stop

`Core.Lifecycle:stop`

End-Play counterpart of Start: a pure source that publishes a one-shot trigger on its `_stopped` control output when the session stops. Wire `_stopped` to the `_stop` control inputs of downstream runnable nodes to cascade a graceful teardown across the graph.

## Mechanics

- `Session.stop()` arms every StopNode of the graph (sets an internal pending flag).
- The trigger is published on the NEXT `Session.run(t)`: a boolean `true` token on every enabled channel wired to `_stopped`, then the flag clears.
- The editor transport handles the extra tick for you: pressing Stop calls `session.stop()` then one final `session.run(t)` before disposing the session, with `session.running` pre-cleared so nodes reacting to `_stopped` see that tick as the wind-down, not as continued playback.
- No data ports and no control inputs. `supportsEnabling` is false, so the editor hides the enable toggle; the scheduler still respects `enabled` if a host clears it programmatically.

## Control outputs

| Slot       | Type    | Notes                                                                                              |
| ---------- | ------- | -------------------------------------------------------------------------------------------------- |
| `_stopped` | trigger | One-shot End-Play signal. Optional: leaving it unwired is legal, the node then fires into nothing. |

## Editor lifecycle

One Stop (and one Start) is created automatically at boot and on every New, so the player cycle always has its entry points. Creation is gated by the `execute` permission: a host without Run gets no lifecycle nodes.

## Pitfalls

- Headless hosts must run one more tick after `Session.stop()` or the `_stopped` trigger never delivers; arming alone publishes nothing.
- Pause is not Stop: the editor's Pause cancels the frame loop and clears `session.running` but never arms StopNodes, so `_stopped` does not fire on pause.
- These nodes used to be host-created without a typeId, so a saved graph reloaded them as inert JSON blobs and the teardown wire silently died. They are now registry-backed (`Core.Lifecycle:stop`): save records the typeId, load rebuilds a real StopNode. Re-save any graph from before the fix to repair it.
