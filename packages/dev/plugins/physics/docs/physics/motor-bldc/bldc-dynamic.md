# BLDC Motor (Dynamic)

`Physics.Electric.Motor.BLDC:dynamic`

3-phase brushless DC motor with trapezoidal back-EMF, surface PM rotor, Y-connected stator. Models the per-phase electrical equation, mechanical equation, and Hall-driven commutation in a single integrating leaf. Faults from the variadic fault bank (target `"tau"`) fold into the load torque, matching the DC motor's contract.

## Equations

Per phase `k ∈ {a, b, c}`:

```
V_k     = R · i_k + L · di_k/dt + e_k(θ_e)
e_k     = Ke · ω_e · trapezoid(θ_e + offset_k)
```

Mechanical / rotor:

```
τ_em    = Ke · P · Σ trapezoid(θ_e + offset_k) · i_k
J · dω_m/dt = τ_em − b · ω_m − (τ_load + τ_fault)
θ_e     = P · θ_m
```

`offset_b = −2π/3`, `offset_c = +2π/3`. Mutual inductance is neglected (surface-PM approximation). Integration is forward-Euler on `dt = session.dt` inside `fire()`. The characteristic 6f_e current-spectrum harmonic and the torque ripple at 6f_e are emergent properties of the trapezoidal commutation; they are the BLDC signature MCSA studies look for.

## Ports

| Direction | Slot | Type | Notes |
|-----------|------|------|-------|
| in | `V_a`, `V_b`, `V_c` | float | Per-phase voltage (typically from a `BLDC inverter`). |
| in | `tau_load` | float | External load torque. |
| in | `dt` | float | Optional explicit step; defaults to `session.dt` deltas. |
| in | `fault_*` | fault (variadic) | Inherited bank. Targets `"tau"` sum into the load. |
| in | `local`, `parent_world` | matrix44 | TransformNode placement. |
| out | `i_a`, `i_b`, `i_c` | float | Per-phase current at end of step [A]. |
| out | `omega` | float | Mechanical angular speed [rad/s]. |
| out | `theta_m` | float | Mechanical angle [rad]. |
| out | `tau_em` | float | Electromagnetic torque [Nm]. |
| out | `world` | matrix44 | TransformNode pose. |

## Parameters

| Name | Unit | Typical | Meaning |
|------|------|---------|---------|
| `R` | Ω | 0.1 to 5 | Per-phase resistance. Drives `computeRequiredHz()`. |
| `L` | H | 0.5 to 5 mH | Per-phase inductance. Drives `computeRequiredHz()`. |
| `Ke` | V·s/rad | 0.01 to 0.1 | Back-EMF constant. |
| `J` | kg·m² | 1e-6 to 1e-4 | Rotor inertia. |
| `b` | Nm·s/rad | 1e-5 to 1e-3 | Viscous friction. |
| `P` | – | 2 to 12 | Pole pairs. Drives the 6f_e harmonic spacing. |
| `ia0` / `ib0` / `ic0` | A | 0 | Initial phase currents at reset. |
| `omega0` | rad/s | 0 | Initial speed. |
| `theta0` | rad | 0 | Initial mechanical angle. |
| `required_hz` | Hz | (computed) | Sample-rate requirement, see [below](#sample-rate). |

## Sample rate

The motor is `IHasSampleRateRequirement` (boilerplate mirror of `IntegrableRuntimeNode`; the FaultableNode chain prevents direct extension). `computeRequiredHz()` combines two requirements:

```
fromTau   = 10 / min(L/R, J/b)                                     (e-fold margin)
sixFe     = 6 × (P × ω_max) / (2π)         ω_max = 1000 rad/s       (design speed)
required  = clamp(max(fromTau, 4 × sixFe), 60, 1e6)                 (Nyquist comfort on the ripple)
```

The 6f_e factor matters because BLDC commutation creates a ripple at six times the electrical fundamental; sampling at only `10/τ_e` would alias that ripple. The conservative design point `ω_max = 1000 rad/s` gives a sensible default; pin a higher `required_hz` through the editable when modelling higher operating speeds.

User-pin semantics are identical to the DC motor's: entering 0 / negative / NaN unpins back to `computeRequiredHz()`. The `required_hz_user_defined` viewable reflects the pin state.

## Pitfalls

- **Commutation glitches near zero speed.** The trapezoid function is piecewise-linear; at `ω ≈ 0` the back-EMF goes to zero and the current equation becomes resistance-limited. The Euler integration handles this correctly but very small ω give large di/dt for the same V; if the runner is not sampling fast enough you'll see current spikes at startup.
- **`P` and `Ke` confusion.** `Ke` is per electrical radian; the torque term uses `Ke × P × i × trapezoid(θ_e)` because mechanical torque depends on `dω_m`, not `dω_e`. Editing `P` changes the torque amplitude as well as the harmonic spacing.
- **No solver attached.** Unlike the DC motor's `IIntegrable` path, this node integrates inline in `fire()` using `session.dt`. There is no solver requirement; the runner's tick rate IS the integration rate, so a low `required_hz` directly produces a coarse integration.
