# Select

`Logic.Flow:select`

Data-plane two-way multiplexer (the UE5 "Select" macro): publishes `a` when `condition` is true, otherwise `b`. Unlike Branch this is NOT an exec node; it forwards a VALUE, not a trigger. Classic use: hand off from a ramp source to a user slider once the ramp completes, with a `GreaterOrEqual(elapsed, duration)` on the condition.

## Mechanics

- `a` and `b` are typed `any`, so floats, vectors, arrays, strings or objects all pass through unchanged; `condition` is a boolean.
- At fire time each input resolves the wired token if one is ready, falling back to the node's stored value (mirrored from upstream by the design-time LiveBinder, or the `condition` editable). The selected value publishes on `result`.
- `result` is a viewable that recomputes on read, so the property panel and design-time downstream values update the moment `a`, `b`, or `condition` changes, without running the graph.

## Editables

| Field | Default | Meaning |
|---|---|---|
| `condition` | `false` | Initial/unwired mode: false selects `b` |

`a` and `b` are properties without an editor widget (there is no generic editor for `any`); they are populated by wires.

## Pitfalls

- Default condition is false, so a freshly dropped Select forwards `b`. Wire your "normal" path to `b` and the override to `a`, or flip the editable.
- Both inputs are evaluated as values; this is selection, not lazy branching. If producing `a` is expensive or side-effectful, gate the producer with Branch/Gate instead.
