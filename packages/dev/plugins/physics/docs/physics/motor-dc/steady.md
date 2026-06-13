# DC Motor (Steady)

`Physics.Electric.Motor.DC:steady`

Algebraic steady-state DC motor: solves the coupled electrical and mechanical equations directly at `di/dt = 0` and `domega/dt = 0`, no integration, no solver, no transients. Use it to design a working point, sanity-check parameters, or validate that the dynamic node (`:dynamic`, the IIntegrable one) converges to the right equilibrium when integrated long enough.

## Steady vs Dynamic

|             | `:steady` (this node)                      | `:dynamic`                                              |
| ----------- | ------------------------------------------ | ------------------------------------------------------- |
| Model       | Algebraic equilibrium, stateless           | ODE state `(i, omega)`, IIntegrable                     |
| Solver      | None needed                                | Requires a `Control.Sim:rk4-solver` marker in the graph |
| `L`, `J`    | Vanish at equilibrium, not parameters here | Set the electrical / mechanical time constants          |
| Transients  | None: every fire IS the equilibrium        | Start-up, load steps, PWM ripple                        |
| Sample rate | Any                                        | `required_hz` derived from `L/R` and `J/b`              |
| Use for     | Working-point design, regression reference | MCSA chains, control loops, fault signatures            |

## Equations

With the inductance and inertia terms gone:

```
V      = R*i + Ke*omega                     (electrical)
Kt*i   = b*omega + tau_eff                  (mechanical)

omega  = (V*Kt - R*tau_eff) / (Ke*Kt + R*b)
i      = (b*omega + tau_eff) / Kt
tau    = Kt*i
back_emf = Ke*omega
```

`tau_eff = tau_load + sum of tau-targeted faults` from the inherited fault bank. The denominator is guarded (`omega = 0` when `Ke*Kt + R*b <= 1e-18`) and `Kt` is clamped at `1e-12` in the current division.

## Ports

| Direction | Slot                    | Type     | Notes                                                                 |
| --------- | ----------------------- | -------- | --------------------------------------------------------------------- |
| in        | `V`                     | float    | Armature voltage. Token input, defaults to 0 when no token this tick. |
| in        | `tau_load`              | float    | External load torque. Same default-0 semantics.                       |
| in        | `fault_0..n`            | any      | Variadic fault bank inherited from FaultableNode (see below).         |
| in        | `local`, `parent_world` | matrix44 | Inherited from TransformNode for world-frame placement.               |
| in        | `scene`                 | scene    | Scene attach config-link (resolved at session bind).                  |
| out       | `i`                     | float    | Equilibrium armature current [A].                                     |
| out       | `omega`                 | float    | Equilibrium speed [rad/s].                                            |
| out       | `tau`                   | float    | Electromagnetic torque `Kt*i` [Nm].                                   |
| out       | `back_emf`              | float    | `Ke*omega` [V].                                                       |
| out       | `world`                 | matrix44 | Inherited from TransformNode.                                         |

## Editables

| Name | Default | Meaning                                                              |
| ---- | ------- | -------------------------------------------------------------------- |
| `R`  | 1.0     | Armature resistance [Ohm].                                           |
| `Kt` | 0.01    | Torque constant [Nm/A].                                              |
| `Ke` | 0.01    | Back-EMF constant [V.s/rad]; equals `Kt` for an ideal machine in SI. |
| `b`  | 1e-4    | Viscous friction [Nm.s/rad].                                         |

`i`, `omega`, `tau`, `back_emf` are viewables mirroring the last computed point.

## Fault bank

The variadic `fault_0..n` inputs accept either a bare `number` (auto-wrapped to `{ target: "tau", value }`) or a structured `{ target, value }` descriptor. Per-target values SUM each tick and reset on every fire (single-tick transients). This node only reads the `"tau"` target, which folds additively into `tau_load`. Other conventional targets (`R`/`L`/`Ke`/`Kt` multiplicative deltas, `b`/`J` additive) are accumulated but ignored here; wiring them ahead of subclass support is allowed and harmless.

## Pitfalls

- Stateless means MEMORYLESS: a missing `V` token this tick computes the zero-voltage equilibrium, it does not hold the previous one.
- A `tau_eff` above the stall torque produces a negative `omega` (the algebra has no stall clamp): physically meaningless for a unidirectional load, useful as a "you exceeded stall" tell.
