# Phase 8: gravity-sensitive turbine (scrubber)

A centrifugal scrubber is an aerodynamic (fan-law) load that carries rotating
faults. This phase models the turbine as a fault COMPOSER and shows where gravity
enters: it leaks into the motor CURRENT, not the load.

## The model

The faults are applied to the TURBINE PAYLOAD, not the motor. The turbine reads
its own mass and the scene gravity, adds its `k*omega^2` aerodynamic load, and
forwards a single composed fault to the motor:

```
imbalance ──┐
desaxage  ──┼─► [ turbine: payload mass + geometry + scene gravity + k*omega^2 ] ─► motor.fault_0
scene g   ──┘
```

- **Imbalance** (balourd) → `turbine.fault_0`: a centrifugal 1x ("once per shaft
  revolution", i.e. at the rotation frequency) vibration (gravity-blind) plus, via
  the offset CG weight, a 1x torque ripple that shows up in the current
  (gravity-dependent).
- **Static eccentricity** (desaxage) → `turbine.fault_1`: a 1x current line through
  the magnetic pull, but **gravity-independent** (it persists in orbit). Off by
  default; dial it up to contrast with the gravity line.

## What plays the role of gravity

The motor current has two parts:

- the **DC current** drives the aero load (the atmospheric density resistance):
  always present, **gravity-blind**, the motor never goes to zero current;
- a small **1x line** rides on top: the imbalance offset CG is a gravity pendulum,
  lifted then dropped once per turn, so it modulates the current at 1x. The
  centrifugal force is purely radial (no shaft torque), so this 1x line has no
  competitor in the current: it is a **pure gravity signature** that vanishes in
  microgravity.

Validated headless, earth vs microgravity:

| quantity | earth (1g) | microgravity |
|---|---|---|
| DC current (the load) | ~0.99 A | ~0.99 A (same) |
| 1x current (the signature) | ~7e-3 A | ~7e-10 A (collapses) |
| 1x vibration | ~20 m/s² | ~20 m/s² (same) |

So the load current never goes away; only the 1x current LINE is the gravity
signature. See [phase8-turbine-gravity.md](phase8-turbine-gravity.md) for the
numbers and the figure.

## Folder contents

```
phase8/
  phase8-turbine-gravity.md   the report (start here)
  graphs/
    turbine-scrubber.spikypanda   the editable montage (faults -> turbine -> motor)
  images/
    phase8-gravity-comparison.svg  earth vs microgravity, normalised bars
  data/
    phase8-comparison.csv          scene, omega, fMech, currentDc, current1x, vib1x
```

- [graphs/turbine-scrubber.spikypanda](graphs/turbine-scrubber.spikypanda) opens in
  the node editor: drive, motor, the turbine fault-composer, the imbalance +
  eccentricity faults, a Z^-1 speed feedback, housing, IMU, current sensor, and
  line + FFT tiles. Bind the Scene to earth or a microgravity preset to reproduce
  the table.

## Reproducing

- `packages/tests/privates/microg/turbine-gravity.test.ts` runs the harness in both
  scenes, asserts the DC current is present and gravity-blind, the 1x vibration is
  gravity-independent, and the 1x current line collapses in microgravity, then
  writes this report + figure + CSV.
- `packages/tests/motorwatch/phase8-turbine-graph.test.ts` generates the
  `.spikypanda` graph and verifies it loads and reproduces the gravity signature.

The nodes: `Physics.Mechanical.Load:turbine` (the composer,
`packages/dev/plugins/physics/src/mechanical/load/turbine-payload.node.ts`) and the
gravity-aware `Physics.Mechanical.Fault:rotor-imbalance` (`gravityCoupling` flag).
