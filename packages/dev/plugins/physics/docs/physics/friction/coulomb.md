# Coulomb + Stribeck Friction

`Physics.Mechanical.Friction:coulomb`

Combined Coulomb + Stribeck + viscous friction torque as a function of angular speed: the standard low-speed friction curve (high breakaway torque that decays exponentially to the kinetic level, plus a linear viscous term). Wire a motor's `omega` in and the resulting torque back onto its load path to model stick-slip-prone drivetrains or friction wear.

## The curve

```
tau(omega) = sign(omega) * ( tau_c + (tau_s - tau_c) * exp(-(|omega|/omega_s)^2) )
           + b * omega
```

- At rest (`omega = 0`), `sign` is 0 and the output is exactly 0 (no static stiction force is emitted; stiction proper needs an event-based model).
- Just above zero speed the Stribeck term dominates: torque starts near `tau_s` (breakaway) and decays toward `tau_c` (kinetic Coulomb level) with characteristic speed `omega_s`. This negative-slope region is what causes stick-slip in compliant loops.
- At high speed the viscous term `b*omega` takes over.
- `omega_s <= 0` disables the Stribeck decay: the curve collapses to plain Coulomb (`tau_c`) + viscous.

## Sign convention

With `opposesMotion = true` (default) the output OPPOSES rotation: positive `omega` gives a negative torque, ready to sum into a torque-balance equation. Set `opposesMotion = false` to flip the convention so the output is positive for positive `omega` and can be summed directly onto a motor's `tau_load` input (which expects a braking torque with `tau*omega >= 0`).

## Ports

| Direction | Slot           | Type  | Notes                                                                                                                     |
| --------- | -------------- | ----- | ------------------------------------------------------------------------------------------------------------------------- |
| in        | `omega`        | float | Angular speed [rad/s]; defaults to 0 when no token this tick.                                                             |
| in        | `tau_c`        | float | Optional per-tick override of the Coulomb level (wear ramps via a Lerp/Slider). Falls back to the editable when no token. |
| in        | `tau_s`        | float | Optional per-tick override of the breakaway level. Same fallback.                                                         |
| out       | `tau_friction` | float | The friction torque [Nm].                                                                                                 |

## Editables

| Name            | Default | Meaning                                                       |
| --------------- | ------- | ------------------------------------------------------------- |
| `tauC`          | 0.005   | Coulomb (kinetic) torque [Nm].                                |
| `tauS`          | 0.01    | Static / breakaway torque [Nm].                               |
| `omegaS`        | 5       | Stribeck velocity [rad/s]. 0 or negative = no Stribeck decay. |
| `b`             | 0       | Viscous coefficient [Nm.s/rad]. 0 = disabled.                 |
| `opposesMotion` | true    | Sign convention, see above.                                   |

`tau_friction` is a viewable. The node is stateless (no reset behavior beyond defaults).

## Pitfalls

- The wired `tau_c` / `tau_s` overrides apply only on ticks where a token arrives; a one-shot publish reverts to the editable value the next tick.
- Leaving `opposesMotion = true` and summing onto `tau_load` SUBTRACTS friction from the load: double negative, the motor speeds up. Flip the toggle for the load-summing topology.
- Motors with their own `b` parameter (DC dynamic/steady) already include viscous friction; keep `b = 0` here or you count it twice.
