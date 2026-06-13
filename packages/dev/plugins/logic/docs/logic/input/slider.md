# Number Slider

`Logic.Input:slider`

Bounded scalar source driven by a slider widget: the property panel renders a range input (bound to the live `min` / `max` / `step` fields) instead of a plain number box, and the node publishes the current value every cycle so downstream sees the drag motion live in Play mode. The interactive knob of the graph; for exact numeric entry use `Logic.Input:constant` instead.

## Mechanics

- No inputs; the `value` output broadcasts to every wired downstream channel on every fire.
- Dragging the slider mid-run takes effect immediately: the next fire publishes the new value.

## Editables

| Field | Default | Meaning |
|---|---|---|
| `value` | `0.5` | Current output, rendered as a slider |
| `min` | `0` | Slider lower bound |
| `max` | `1` | Slider upper bound |
| `step` | `0.01` | Slider increment |

## Pitfalls

- `min` / `max` / `step` bound the WIDGET, not the stored value: a value set before tightening the bounds is not re-clamped until the user touches the slider.
- Very small magnitudes (e.g. a `dt = 1e-4`) fight the bounded range + step UX; that is exactly what Number Constant is for.
