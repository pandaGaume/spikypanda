# Branch

`Logic.Flow:branch`

UE5-style exec branch: when a trigger arrives on `in`, fires exactly one of the `true` / `false` outputs based on the boolean condition. The if-statement of the graph.

## Mechanics

- `in` (trigger) and `condition` (boolean) both live in the data plane, so the scheduler waits for every WIRED input before dispatching: with both wired, the node fires when both have a token.
- On fire, the `in` token is consumed; `condition` reads the wired token if one is ready, otherwise the editable `condition` default.
- Exactly one output publishes a `true` token: `true` when the condition holds, `false` otherwise. Nothing fires when `in` carried no token (a lone condition update does not trigger).

## Editables

| Field | Default | Meaning |
|---|---|---|
| `condition` | `false` | Fallback used when the `condition` port is unwired or empty this tick |

## Pitfalls

- The condition is sampled at fire time. If the condition source publishes less often than the trigger source, the branch reuses the editable default on ticks where no condition token is ready, not the last seen value.
- Trigger outputs publish a boolean `true` token; downstream consumers must consume it, otherwise the channel stays ready and re-dispatches next tick.
