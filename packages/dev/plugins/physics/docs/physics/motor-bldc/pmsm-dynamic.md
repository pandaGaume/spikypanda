# PMSM Motor (Dynamic, sinusoidal)

`Physics.Electric.Motor.BLDC:pmsm`

3-phase permanent-magnet synchronous motor with **sinusoidal** back-EMF. Same electrical / mechanical structure as the BLDC node, with `sin(θ_e + offset_k)` replacing the trapezoid. The current spectrum has a clean fundamental at `f_e` and minimal high-order harmonics in the ideal case, useful as a baseline counterpart to BLDC's 6f_e ripple in MCSA studies.

Typically driven by an SVPWM / FOC inverter; the `V_a / V_b / V_c` inputs accept any 3-phase voltage source the user composes (e.g. three sin generators shifted by 120°, or a future SVPWM inverter node).

## Equations

Identical to the BLDC node's, with the back-EMF shape function `trapezoid(...)` replaced by `sin(...)`:

```
e_k     = Ke · ω_e · sin(θ_e + offset_k)              k ∈ {a, b, c}
τ_em    = Ke · P · Σ sin(θ_e + offset_k) · i_k
```

Mechanical / rotor equations are unchanged. `offset_b = −2π/3`, `offset_c = +2π/3`.

## Ports and parameters

Identical to the BLDC dynamic node (see [bldc-dynamic.md](bldc-dynamic.md)).

## Sample rate

PMSM `computeRequiredHz()` uses a different harmonic argument than BLDC. Sinusoidal back-EMF means the fundamental at `f_e` dominates; we honor it with 10 samples per cycle plus the electrical-pole margin:

```
fromTau = 10 / min(L/R, J/b)
fe      = (P × ω_max) / (2π)              ω_max = 1000 rad/s
required = clamp(max(fromTau, 10 × fe), 60, 1e6)
```

This typically lands in the 5–50 kHz range with default parameters. Identical user-pin semantics to the DC and BLDC motors: positive value pins, 0 / negative / NaN unpins.

## Pitfalls

- **Same as BLDC** for transient-current behaviour, parameter coupling, and integration semantics.
- **MCSA cleanliness.** The PMSM's spectrum is dominated by the fundamental; faults show up as clean sidebands around `f_e` rather than around 6f_e. Use the PMSM as the "control" case when validating that a fault detector is responding to fault signatures rather than to the BLDC's commutation harmonics.
