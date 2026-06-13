# Induction Motor (Squirrel Cage)

`Physics.Electric.Motor.Induction:dynamic`

Three-phase squirrel-cage asynchronous machine, space-vector model in the stationary alpha-beta frame with flux linkages as state. Slip is EMERGENT (no commanded speed): drive `V_a/V_b/V_c` with a balanced three-phase supply (e.g. three `DSP.Generator:oscillator` at 120 degrees off one `Logic.Time:clock`) and the rotor settles below synchronous speed under load.

## Model

```
i_s = (Lr psi_s - Lm psi_r)/D     i_r = (Ls psi_r - Lm psi_s)/D     D = Ls Lr - Lm^2
dpsi_s/dt = v_s - Rs i_s
dpsi_r/dt = -R_r(theta) i_r + j P omega psi_r
Te = (3/2) P (Lm/Lr) (psi_r_a i_s_b - psi_r_b i_s_a)
J domega/dt = Te - b omega - (tau_load + tau_faults)
```

Defaults model a ~1 kW 2-pole-pair machine (Rs 2.3, Rr 2.5, Ls = Lr 0.23, Lm 0.22, J 5e-3). Forward Euler in fire(); the declared `required_hz` follows the TRUE fast pole `tau_e = D/(Rs Lr + Rr Ls)` (40/tau_e, floor 80 x f_supply: ~9.8 kHz at defaults). `slip` is published against `f_supply` and spans [-1, 2] (regenerative through full plugging).

## Broken rotor bars (the MCSA flagship fault)

`broken_bars` / `total_bars` / `bar_severity` lump the fault as a rotor-FIXED resistance asymmetry: `R_r = Rr (I + delta P(a))` with `a = P theta` and `delta = bar_severity x broken_bars / total_bars`. This produces the classic stator-current sidebands at

```
f_supply (1 +/- 2s)
```

with amplitude tracking `broken_bars / total_bars`. Measured at the declared rate (80 V, 60 Hz, 1.5 N.m): lower sideband ~3.5 percent of the fundamental for 2/28 bars, ~6.7 percent for 4/28. `broken_bars` is live: flip it while running to simulate an in-service failure.

## Seeing the sidebands

At s ~ 0.09 the sidebands sit ~ +/- 10 Hz around 60 Hz: you need ~5 Hz spectral resolution. Pair the phase-current output with `DSP.Acquire:daq` (IEC profile: 10.24 kHz, 2048-sample / 200 ms blocks, fs/N = 5 Hz) and a 2048-point FFT; a 512-point FFT at high sample rates will NOT separate them.

## Pitfalls

- Stream-kind ports: the `omega -> load` return wire is a dataflow cycle: route it through the split-view `Control.Feedback:channel` (Z^-1) or the channels overflow.
- Loads beyond the breakdown torque stall the machine (slip -> 1); the bounded ramp profile of `Physics.Mechanical.Load:torque` exists precisely to drift INTO a feasible regime.
