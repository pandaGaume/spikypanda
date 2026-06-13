# DC Motor Current PI

`Physics.Electric.Motor.DC:currentPI`

PI current controller: the INNER loop of the standard industrial cascade (current then speed). Sits between an `i_ref` source (a slider, or the outer Speed PI's output rescaled) and the PWM inverter that drives the motor. Same control law and anti-windup as the Speed PI, but tuned an order of magnitude faster.

## Control law

```
error    = i_ref - i_measured
V_unsat  = Kp*error + integral + Ki*error*dt
V_cmd    = clamp(V_unsat, -Vmax, +Vmax)
integral += Ki*error*dt        only while NOT saturated
```

Conditional-integration anti-windup: the integral freezes while the output is on a rail.

## Loop bandwidth

The current loop is limited by the electrical pole `R/L` and is typically tuned to 500-5000 Hz; the speed loop above it lives at 10-100 Hz (limited by `J*R/(Kt*Ke)`). The defaults below target roughly a 1 kHz current loop on the RS-385 class motor (`tau_e = L/R = 0.5 ms`).

## Ports (all signal-kind, ZOH)

| Direction | Slot         | Type  | Notes                                                    |
| --------- | ------------ | ----- | -------------------------------------------------------- |
| in        | `i_ref`      | float | Current setpoint [A]. Unpublished signal reads as 0.     |
| in        | `i_measured` | float | Measured current [A], typically from the Current Sensor. |
| out       | `V_cmd`      | float | Voltage command [V], in [-Vmax, +Vmax].                  |

`dt` comes from `session.dt` (clamped to 0 on the first tick), no port.

## Editables

| Name   | Default | Meaning                                                                     |
| ------ | ------- | --------------------------------------------------------------------------- |
| `Kp`   | 5       | Proportional gain [V/A].                                                    |
| `Ki`   | 200     | Integral gain [V/(A.s)].                                                    |
| `Vmax` | 12      | Output saturation [V]. The setter rejects non-positive values (snaps to 1). |

`integral` and `V_cmd` are viewables; session reset zeroes both.

## Pitfalls

- **Set `Vmax` equal to the inverter's `Vdc`.** Saturating at the bus voltage matches what the PWM can actually deliver; a larger `Vmax` makes the controller ask for voltage the inverter cannot produce and the integral winds up uselessly (the anti-windup only knows about ITS clamp).
- An unwired `i_measured` reads 0: open loop, output ramps to the rail.
