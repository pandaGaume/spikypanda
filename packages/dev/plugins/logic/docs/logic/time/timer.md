# Timer

`Logic.Time:timer`

Linear ramp / interpolation timer, the UE5 Timeline analogue: over `duration` seconds of sim time it drives `progress` from 0 to 1 and `value` from `from` to `to`, then holds. Collapses the "Clock + Divide + Clamp + Lerp" combo into one node; pair with a Select for ramp-then-manual-handoff patterns.

## Mechanics

- While ACTIVE, each tick accumulates `elapsed += max(0, t - lastT)`, computes `progress = clamp(elapsed / duration, 0, 1)` (duration floors at 1e-9 to avoid a division by zero) and `value = from + (to - from) * progress`, then broadcasts both on every wired channel.
- While INACTIVE the node publishes NOTHING (publishing every frame would flood capacity-1 downstream slots); UE5 Timeline has the same no-output-until-Play semantic.
- When `progress` first reaches 1, the control output `_completed` pulses ONCE; the timer keeps publishing `value = to` indefinitely afterward (steady state).
- Data inputs `duration`, `from`, `to` (optional floats) override the editables when a token is ready at fire time.
- Control inputs: `_start` re-arms from zero (active, elapsed 0, completion flag cleared); `_reset` cancels (inactive, outputs revert to `from`, progress 0). Both are control-plane triggers: they never gate scheduling.

## Editables

| Field | Default | Meaning |
|---|---|---|
| `duration` | `1` | Ramp length in sim seconds |
| `from` | `0` | Start value |
| `to` | `1` | End value |
| `autoStart` | `true` | Arm at session reset without an explicit `_start` wire; disable for UE5-style "wait for Begin" |

Viewables `progress` and `value` mirror the live outputs in the property panel.

## Pitfalls

- `_completed` is a one-shot edge (capacity 1), not a level: latch it downstream (Do Once, or your own state) if several consumers need it later.
- With `autoStart` off and no `_start` wire the timer never emits anything: downstream required inputs stay unsatisfied.
- `_start` mid-ramp restarts from zero; there is no pause/resume.
