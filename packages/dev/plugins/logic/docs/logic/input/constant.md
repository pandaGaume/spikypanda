# Number Constant

`Logic.Input:constant`

Pure scalar source set by direct keyboard entry in the property panel (a plain number field, NOT a slider). The right tool when you need an EXACT value rather than a draggable bounded knob: fixed `dt` sources for closed-loop control sims (1e-4 s broadcast to a PI, motor, tachymeter), reference setpoints (`omega_ref`, `V_ref`), tuning constants pinned at design time, or a probe value fanned to multiple consumers.

## Mechanics

- No inputs; publishes `value` on every outgoing `value` channel on every fire, so live edits propagate in Play mode.

## Editables

| Field | Default | Meaning |
|---|---|---|
| `value` | `0` | The constant; any finite float, including very small magnitudes a slider's step would mangle |

## Pitfalls

- It still publishes every cycle (it is a source node, not a one-shot): a capacity-1 downstream port fed by BOTH a constant and another producer can overflow; give the consumer one producer per slot.
