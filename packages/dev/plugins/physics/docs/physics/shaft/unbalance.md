# Shaft Unbalance (1x rotation)

`Physics.Mechanical.Shaft:unbalance`

Sinusoidal modulation locked to 1x the shaft rotation: the dominant signature of a mass imbalance on the rotor. Wire the motor's `omega` into this node and place it in series on the `tau_load` line (or on a vibration channel) to introduce the classic once-per-revolution component.

## Mechanics

```
theta += omega * dt              (integrated shaft angle)
out    = in + amplitude * sin(theta + phase)
```

The signature is ANGLE-locked, not time-locked: the node integrates the wired `omega` into `theta`, so during a speed ramp the component tracks the instantaneous 1x frequency exactly (an order-tracking testbench behaves correctly against it).

## Ports

| Direction | Slot         | Type  | Notes                                                               |
| --------- | ------------ | ----- | ------------------------------------------------------------------- |
| in        | `signal_in`  | float | Additive base; defaults to 0 when no token this tick.               |
| in        | `omega`      | float | Shaft speed [rad/s]; defaults to 0 (theta freezes, output goes DC). |
| in        | `dt`         | float | Optional; falls back to `t - lastT` when unwired.                   |
| out       | `signal_out` | float | `signal_in + amplitude * sin(theta + phase)`.                       |
| out       | `theta`      | float | Accumulated shaft angle [rad], unwrapped (grows without bound).     |

## Editables

| Name        | Default | Meaning                                 |
| ----------- | ------- | --------------------------------------- |
| `amplitude` | 0.005   | Peak amplitude of the 1x component.     |
| `phase`     | 0       | Angular offset [rad] of the heavy spot. |

`signal_out` and `theta` are viewables; session reset zeroes both.

## Pitfalls

- Into a FaultableNode `fault_n` slot, the bare float auto-wraps to `{ target: "tau", value }`: an additive torque [Nm]. A real unbalance scales as `m*r*omega^2`; this node keeps `amplitude` CONSTANT, so set it for the operating speed you simulate or modulate it upstream.
- `theta` is unwrapped on purpose (sin() does not care); do not feed it to logic expecting [0, 2\*pi).
