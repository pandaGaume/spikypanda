# Setpoint

`Control.Actuator:setpoint`

Actuator-side wrapper for a controller output: applies the two physical limits every real actuator has, a slew-rate limit (the output cannot change faster than `maxRatePerSec`) and saturation (the output is clamped to `[min, max]`). Insert it between a control law and the plant model so the plant never sees a non-physical command (negative tank level, supersonic valve closure, instantaneous torque step).

## Mechanics

Each fire consumes the `request` token, slews the internal value toward it by at most `maxRatePerSec * dt`, then clamps to `[min, max]`, and publishes the result plus two status booleans:

- `rateLimited` is computed BEFORE saturation (`|request - previous| > maxRatePerSec * dt`), so it reflects the slew limit alone; saturation has its own flag.
- `clamped` is true when the post-slew value had to be pinned to `min` or `max` this tick.

`dt` comes from consecutive values on the optional `t` input (only positive differences are accepted; the first `t` sample cannot produce a dt yet). When `t` is not wired, or before the second `t` sample, dt falls back to a fixed 0.01 s per fire.

## Inputs

| Slot      | Type  | Required | Notes                                                                                                                                     |
| --------- | ----- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `request` | float | yes      | Desired setpoint from the upstream control logic. The node does NOTHING on a fire where no `request` token is ready: no slew, no publish. |
| `t`       | float | no       | Sim time in seconds, used to compute dt for the rate limit. Unwired: dt = 0.01 s per fire.                                                |

## Outputs

| Slot          | Type    | Notes                                                                         |
| ------------- | ------- | ----------------------------------------------------------------------------- |
| `applied`     | float   | The clamped + rate-limited actual command.                                    |
| `clamped`     | boolean | True when `applied` sits on `min` or `max` this tick.                         |
| `rateLimited` | boolean | True when the slew cap prevented `applied` from reaching `request` this tick. |

The booleans are first-class outputs so a supervisor or alert bus can react to saturation (usually "the controller is asking for the impossible") without re-deriving the limits downstream.

## Editables

| Name            | Default  | Meaning                                                                                                                                             |
| --------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `min`           | 0        | Lower saturation bound.                                                                                                                             |
| `max`           | 1        | Upper saturation bound.                                                                                                                             |
| `maxRatePerSec` | Infinity | Slew limit in units/s. Infinity = no slew limit (step directly to `request`). Negative values are coerced to 0 (a frozen actuator), never inverted. |
| `initial`       | 0        | Value at session start; also the reset() value for `applied`.                                                                                       |

Viewables: `lastApplied` (most recent command, panel sanity check) and `lastDt` (the dt used at the last fire, the quickest way to confirm the `t` wiring is alive).

## Pitfalls

- The `request` input gates everything: a tick with no `request` token publishes nothing at all, including the booleans. Downstream consumers must tolerate silent ticks or the upstream must publish every tick.
- Without `t` wired the rate limit is "per fire", not "per second": at a 200 kHz session rate the effective slew is 2000x faster than the same `maxRatePerSec` at 100 Hz. Wire `t` whenever the fire cadence is not 100 Hz.
- Editing `initial` re-seeds the live value only while the node has not yet seen a `t` sample (`lastT` still unset). With `t` wired, mid-run edits to `initial` take effect at the next reset; with `t` UNWIRED, the guard never arms and an edit snaps the actuator instantly, bypassing the slew limit.
- `maxRatePerSec = 0` freezes the output at its current value while still reporting `rateLimited = true` whenever `request` differs; useful as a hold, surprising if accidental.
