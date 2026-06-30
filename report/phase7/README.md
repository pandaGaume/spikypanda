# Phase 7: solver certification

Phase 6 trusted the SpikyPanda continuous-time engine to integrate the RS-385
motor. Phase 7 earns that trust with two independent, headless certifications:
the simulation is compared to **exact theory**, and the integrator's
**convergence order** is measured directly.

## 1. Theory vs simulation

At a constant voltage and load the RS-385 DC motor is a linear 2x2 ODE in
(current i, speed omega):

```
L di/dt = V - R i - Ke omega
J domega/dt = Kt i - b omega - tau
```

A linear system has a **closed-form** transient, `x(t) = x_ss + e^{A t}(x0 - x_ss)`,
computed here from the 2x2 matrix exponential (the RS-385 has two distinct real
poles: a fast electrical one at L/R ≈ 0.82 ms and a slow mechanical one ≈ 10 ms).
We integrate the SAME motor with the SpikyPanda session/solver from rest and
compare every sample to `e^{A t}`.

> The sim tracks the analytic transient to **~1e-7 %** on speed and **~1e-5 %** on
> current, i.e. essentially the solver tolerance. The engine reproduces the
> motor's exact dynamics, not just its steady state.

## 2. Solver order

The solver is a **Cash-Karp RK4(5)**: it propagates the 5th-order solution (with
an embedded 4th-order estimate for adaptive step control), so a fixed step has a
global error proportional to `h^5`. We force one fixed step per macro-step
(tolerance disabled, maxStep = h) on an undamped harmonic oscillator (analytic
cos/sin, O(1) so the error never reaches the floating-point floor) and fit the
global error against the step size on a log-log line.

> Halving the step divides the error by ~32 = 2^5; the fitted slope is **5.02**
> (theoretical order 5). The integrator converges at its design order.

The same transient run adaptively (tolerance 1e-6) uses a few hundred micro-steps
concentrated in the fast early transient, which is how a coarse macro-step still
resolves the curves accurately.

## Folder contents

```
phase7/
  phase7-solver-certification.md   the certification report (start here)
  phase7-cert.ipynb                notebook: independent scipy solve_ivp cross-check + convergence fit
  data/
    phase7-transient.csv           t, omega_sim, omega_ana, i_sim, i_ana
    phase7-convergence.csv         dt, global error (fixed-step Cash-Karp)
  images/
    phase7-transient.svg           motor speed: sim vs analytic (they coincide)
    phase7-convergence.svg         log-log global error vs step (slope ~5)
```

- [phase7-solver-certification.md](phase7-solver-certification.md) is the report:
  the transient comparison table, the convergence table, and the adaptive budget.
- [phase7-cert.ipynb](phase7-cert.ipynb) re-derives the motor transient with
  `scipy.integrate.solve_ivp` (a third, independent integrator) and overlays it on
  the sim and the analytic curves, then refits the convergence slope. Run it from
  this folder so the relative `data/` paths resolve. Needs `numpy`, `pandas`,
  `matplotlib`, `scipy`.

## Reproducing

`packages/tests/privates/microg/rs385-solver-cert.test.ts` runs both
certifications and writes this folder. It asserts the sim matches the analytic
transient to < 1e-3 relative, that the late-time matrix exponential equals the
algebraic steady state, and that the fitted convergence slope is between 4.5 and
5.6. The harness lives in
`packages/dev/applications/privates/microg/src/solver.cert.ts`.
