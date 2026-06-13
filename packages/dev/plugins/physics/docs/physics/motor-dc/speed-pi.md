# DC Motor Speed PI

`Physics.Electric.Motor.DC:speedPI`

PI speed controller for a DC motor (or any single-loop SISO system with a velocity-like output). Closes the outer loop of the classic cascade: takes a speed setpoint and a measured speed (typically from a Tachymeter) and produces a voltage command, clamped to the supply.

## Control law

```
error    = omega_ref - omega_measured
V_unsat  = Kp*error + integral + Ki*error*dt
V_cmd    = clamp(V_unsat, -Vmax, +Vmax)
integral += Ki*error*dt        only while NOT saturated
```

Anti-windup is conditional integration: while `V_cmd` sits on either rail, the integral is FROZEN at its pre-saturation value, so the controller recovers immediately when the error reverses instead of unwinding a wound-up integral.

## Timebase

There is no `dt` port: the controller reads `session.dt`, the same value the integration phase used for any IIntegrable leaves earlier in the same tick (single source of truth across the closed loop). On the first tick, `session.dt` is Infinity and is clamped to 0, so the integral contributes nothing until a real macro-step has happened.

## Ports (all signal-kind, ZOH)

| Direction | Slot             | Type  | Notes                                                  |
| --------- | ---------------- | ----- | ------------------------------------------------------ |
| in        | `omega_ref`      | float | Setpoint speed [rad/s]. Unpublished signal reads as 0. |
| in        | `omega_measured` | float | Measured speed [rad/s]. Unpublished signal reads as 0. |
| out       | `V_cmd`          | float | Voltage command [V], in [-Vmax, +Vmax].                |

Signal semantics: no buffering, no gating; the PI fires every tick and samples whatever value is current (zero-order hold), exactly like the discrete-time control literature assumes.

## Editables

| Name   | Default | Meaning                                                                        |
| ------ | ------- | ------------------------------------------------------------------------------ |
| `Kp`   | 0.5     | Proportional gain.                                                             |
| `Ki`   | 2.0     | Integral gain [1/s].                                                           |
| `Vmax` | 24      | Output saturation [V]. Should match the bus the actuator can actually deliver. |

`integral` and `V_cmd` are viewables. Session reset zeroes both.

## Pitfalls

- An unwired `omega_measured` reads 0: the loop runs OPEN and the integral ramps toward the `Vmax` rail. Wire the feedback (Tachymeter or a `Control.Feedback:channel` to break a dataflow cycle).
- `Vmax` larger than what the downstream inverter can produce defeats the anti-windup: the controller thinks it is unsaturated while the plant is. Match `Vmax` to the real supply.
