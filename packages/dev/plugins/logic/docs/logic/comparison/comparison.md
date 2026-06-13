# Comparison

`Logic.Comparison:equal` (+ 5 variants: `:notEqual`, `:greater`, `:less`, `:greaterOrEqual`, `:lessOrEqual`)

Binary scalar comparison: evaluates a predicate over two numbers and publishes a boolean `result`. The whole family shares one shape (inputs `a`, `b`, output `result`); only the predicate differs. Use anywhere a graph needs a boolean decision: a Branch condition, a While Loop exit test, a Select switch.

## Variants

| typeId | Label | Predicate |
|---|---|---|
| `:equal` | Equal | `a === b` (strict) |
| `:notEqual` | Not Equal | `a !== b` |
| `:greater` | Greater | `a > b` |
| `:less` | Less | `a < b` |
| `:greaterOrEqual` | Greater or Equal | `a >= b` |
| `:lessOrEqual` | Less or Equal | `a <= b` |

## Mechanics

- Inputs `a` and `b` (float, optional) resolve wired tokens over the editable defaults: an unwired slot, or a slot whose token is not a number, falls back to the editable value.
- Editables `a` and `b` both default to 0.
- `result` is also a viewable that recomputes from the editables on read, so the design-time LiveBinder propagates a fresh result the moment you type a new `a` or `b` in the property panel, without running the graph.

## Pitfalls

- `Equal` / `Not Equal` use strict float equality. Two values produced by different floating-point paths (e.g. an integrator output vs a typed constant) rarely compare exactly equal; for "reached the setpoint" tests prefer `GreaterOrEqual` on the magnitude, or compare `Abs(a - b)` against a tolerance.
- A mistyped upstream wire (string, object) is silently rejected by the validator and the editable default takes over for that slot: the node never errors, it just compares against the default. Check the property panel if a comparison seems stuck.
