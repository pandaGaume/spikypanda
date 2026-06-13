# BLDC Speed PI

`Physics.Electric.Motor.BLDC:speedPI`

Speed PI controller for a BLDC drive: same PI law as the DC variant, but the output is a normalized duty cycle instead of a raw voltage, and the saturation is normalized too. Pair it with the 6-step inverter (`Physics.Electric.Motor.BLDC:inverter`), which multiplies `duty` by `V_dc` to produce the line-to-neutral voltages.

## Control law

```
error    = omega_ref - omega_measured
duty     = clamp(Kp*error + integral + Ki*error*dt, -dutyMax, +dutyMax)
integral += Ki*error*dt        only while NOT saturated
```

Conditional-integration anti-windup: the integral freezes while the output sits on either rail. A NEGATIVE duty reverses the commutation order; the inverter handles the sign directly, no extra logic needed.

## Ports (token inputs, consumed per tick)

| Direction | Slot             | Type  | Notes                                                                                     |
| --------- | ---------------- | ----- | ----------------------------------------------------------------------------------------- |
| in        | `omega_ref`      | float | Setpoint speed [rad/s]. Defaults to 0 when no token this tick.                            |
| in        | `omega_measured` | float | Measured speed [rad/s]. Defaults to 0 when no token.                                      |
| in        | `dt`             | float | Control step [s]. Optional: falls back to `t - lastT` when unwired (0 on the first fire). |
| out       | `duty`           | float | Duty command in [-dutyMax, +dutyMax].                                                     |

Unlike the DC Speed PI (signal ports + `session.dt`), this node still uses token semantics and a `dt` port: missing tokens read as 0 for that tick, they do not hold the last value.

## Editables

| Name      | Default | Meaning                                                   |
| --------- | ------- | --------------------------------------------------------- |
| `Kp`      | 0.005   | Proportional gain [duty/(rad/s)].                         |
| `Ki`      | 0.05    | Integral gain.                                            |
| `dutyMax` | 1       | Output saturation (1 = full bus voltage at the inverter). |

`integral` and `duty` are viewables; session reset zeroes both and the dt fallback clock.

## Pitfalls

- Token semantics bite on missing feedback: a tick where `omega_measured` has no token computes the error against 0, a full-setpoint error spike. Keep the feedback publishing every tick (or route it through a Feedback Channel when the wire forms a cycle).
- `dutyMax` above 1 commands more than the bus can deliver; the inverter clamps physically, so the controller winds up against an invisible saturation. Leave it at 1 unless you model field weakening some other way.
