# DC Motor (Dynamic)

`Physics.Electric.Motor.DC:dynamic`

Separately-excited DC motor with coupled electrical and mechanical dynamics. The state is integrated by whichever solver is attached to the session (drop a `Control.Sim:rk4-solver` marker in the graph to enable integration; without one the motor's state stays frozen at its initial conditions).

## Equations

The motor exposes itself as an `IIntegrable` whose right-hand side is

```
di/dt    = (V - R·i - Ke·omega) / L
domega/dt = (Kt·i - b·omega - (tau_load + tau_fault)) / J
```

where `tau_fault` is the sum of all `tau`-targeted entries on the inherited fault bank (any `Physics.Mechanical.*` fault wired to the motor's variadic fault input).

## Ports

| Direction | Slot | Type | Kind | Notes |
|-----------|------|------|------|-------|
| in | `V` | float | signal | Armature voltage. ZOH semantics: the solver reads the latest published value at every rhs evaluation. |
| in | `tau_load` | float | signal | External load torque. Same ZOH semantics. |
| in | `fault_*` | fault | variadic | Inherited from FaultableNode. Faults with `target = "tau"` sum into the effective torque. |
| in | `local`, `parent_world` | matrix44 | signal | Inherited from TransformNode for scene-graph placement. |
| out | `i` | float | signal | Armature current at end of step \[A\]. |
| out | `omega` | float | signal | Angular speed at end of step \[rad/s\]. |
| out | `tau_em` | float | signal | Electromagnetic torque (Kt·i) \[Nm\]. |
| out | `world` | matrix44 | signal | Inherited from TransformNode. |

## Parameters

| Name | Unit | Typical | Meaning |
|------|------|---------|---------|
| `R`  | Ω | 0.1 to 5 | Armature resistance. |
| `L`  | H | 1e-4 to 1e-2 | Armature inductance. Sets the electrical time constant `tau_e = L/R`. Solver must run at >= 10/tau_e to stay stable. Drives `computeRequiredHz()`. |
| `Kt` | Nm/A | 0.005 to 0.05 | Torque constant. |
| `Ke` | V·s/rad | matches `Kt` | Back-EMF constant. In SI units, `Ke == Kt` for an ideal machine. |
| `J`  | kg·m² | 1e-7 to 1e-4 | Rotor inertia. Sets the mechanical time constant `tau_m = J/b`. |
| `b`  | Nm·s/rad | 1e-6 to 1e-3 | Viscous friction coefficient. |
| `i0` | A | 0 | Initial armature current at reset. |
| `omega0` | rad/s | 0 | Initial angular speed at reset. |
| `required_hz` | Hz | (computed) | Sample-rate requirement, see [Sample rate](#sample-rate). Default is auto-derived from `L / R` and `J / b`; the user can pin a manual value through the property panel. |

A hand-tuned preset for the **Mabuchi RS-385PH-15125** (a common 6 VDC class brushed motor) ships under `presets/dc-motor-rs385ph-15125.json` and can be drag-dropped onto the property panel.

## Sample rate

The motor is `IHasSampleRateRequirement` (boilerplate mirroring `IntegrableRuntimeNode`; can't extend the base directly because of the FaultableNode → TransformNode chain). `computeRequiredHz()` derives the recommended rate from the dominant time constant:

```
tau_e = L / R                                  (electrical pole, fast)
tau_m = J / b                                  (mechanical pole, slow)
required_hz = clamp(10 / min(tau_e, tau_m), 60, 1e6)
```

10 samples per e-fold keeps the inner integrator stable. Typical numbers:

| Setup                     | tau_e   | required_hz |
|---------------------------|---------|-------------|
| L=1mH  R=1Ω (default)     | 1 ms    | 10 kHz      |
| L=10mH R=1Ω               | 10 ms   | 1 kHz       |
| L=1mH  R=0.1Ω             | 10 ms   | 1 kHz       |

When the user edits `R / L / J / b`, the property panel refreshes `required_hz` automatically — UNLESS the user has pinned a manual value through the editable. Pinning means: typing a positive value into `required_hz` locks it; typing 0 / negative / empty unpins and reverts to the computed value. The `required_hz_user_defined` viewable shows the pin state.

The enclosing `SimGraphNode` aggregates `requiredHz` across all `IHasSampleRateRequirement` leaves and surfaces `max(leaves)` (floored at `MIN_EFFECTIVE_HZ = 60 Hz`) as the inner session's `effectiveHz`, which drives the K = inner / parent sub-stepping ratio.

## MCSA chain

The typical fault-signature simulation chain is:

```
Slider (omega_ref) -> SpeedPI -> CurrentPI -> Inverter -> DcMotorDynamic -> CurrentSensor -> Buffer -> Window -> FFT -> Spectrum
                                                              |
                                                              +-- Bearing / Shaft / Gear fault nodes (tau target)
```

Drop the `Control.Sim:rk4-solver` marker anywhere in the graph (it's a stateless decorator) to give all `IIntegrable` nodes a working solver.

## Pitfalls

- **Wrong sample rate (manual pinning).** Pinning `required_hz` to a value below the computed minimum will starve the integrator. The runner still ticks at the pinned rate; the result is current spikes, omega ringing, or a saturated solver retry loop. Unpin (enter 0) to fall back to the safe default.
- **Wrong sample rate (PWM upstream).** The PWM inverter switches at `f_pwm` (5 kHz typical). The runner must also tick at `>= 20 · f_pwm` for the carrier to survive sampling — the motor's own `required_hz` does NOT account for the inverter's carrier, only its own electrical pole. With an inverter wired upstream, check that `effectiveHz` of the enclosing Sim.Graph is at least `20 · f_pwm` (the inverter contributes its own `requiredHz` to the aggregation).
- **L too small.** `L = 0` makes the current equation singular. The implementation clamps with `max(L, 1e-12)` to avoid NaNs, but the dynamics degenerate. Use a real datasheet value.
- **Reset behaviour.** Stopping the player calls `reset()`, which restores `(i, omega) = (i0, omega0)` and recomputes `tau_em = Kt·i0`. Live-state viewables snap to those values immediately.
- **Pinned required_hz survives parameter edits.** When the user has pinned `required_hz` and then edits `L / R`, the displayed `required_hz` stays at the pinned value; the underlying `computeRequiredHz()` updates silently. Unpin to track parameter changes again.
