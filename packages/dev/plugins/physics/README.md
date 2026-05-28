# @spikypanda/plugin-physics

Thematic physics nodes organized as a tree of sub-plugins under the
`Physics.*` namespace. The first sub-plugin shipped is
`Physics.Electric.Motor.DC` — a separately-excited DC motor model with
its companion controller and sensor, sized for MCSA (Motor Current
Signature Analysis) pipelines.

## Sub-plugin layout (V1)

```
Physics
└── Electric
    └── Motor
        └── DC                                              (sub-plugin id)
            ├── Physics.Electric.Motor.DC:dynamic           DC Motor (Dynamic)
            ├── Physics.Electric.Motor.DC:steady            DC Motor (Steady)
            ├── Physics.Electric.Motor.DC:speedPI           DC Motor Speed PI
            └── Physics.Electric.Motor.DC:tachymeter        Tachymeter
```

The four nodes appear in the editor palette under the natural folder
hierarchy `Physics > Electric > Motor > DC`, because the palette tree
splits each node's category on both `/` and `.`.

## Physical model

Separately-excited DC motor, coupled electrical + mechanical equations:

```
V          = R · i + L · di/dt + Ke · ω         (electrical)
τ_em       = Kt · i                              (electromagnetic torque)
J · dω/dt  = τ_em - b · ω - τ_load               (mechanical)
```

Parameters (editable on each node that needs them):

| Symbol | Default | Units    | Description |
|--------|---------|----------|-------------|
| `R`    | 1.0     | Ω        | Armature resistance |
| `L`    | 1e-3    | H        | Armature inductance |
| `Kt`   | 0.01    | Nm/A     | Torque constant |
| `Ke`   | 0.01    | V·s/rad  | Back-EMF constant |
| `J`    | 1e-5    | kg·m²    | Rotor inertia |
| `b`    | 1e-4    | Nm·s/rad | Viscous friction |

Defaults are tuned for **MCSA pipelines**: the electrical time constant
is `τ_e = L / R = 1 ms`, so the explicit Euler integration inside the
Dynamic node stays numerically stable for any `dt ≤ 100 µs` (10× the
time constant). At a typical scope-class sampling rate of 10 kHz
(`dt = 100 µs`), the simulation runs comfortably for long sequences
without drift.

## Nodes

### `Physics.Electric.Motor.DC:dynamic` — DC Motor (Dynamic)

Integrates the coupled ODEs with an explicit Euler step.

- **Inputs**: `V`, `tau_load`, `dt` (all optional, default 0; `dt` falls
  back to `t - lastT` when unwired).
- **Outputs**: `i`, `omega`, `tau_em`.
- **State**: `i` and `omega`, restored to `(i0, omega0)` on session reset.

### `Physics.Electric.Motor.DC:steady` — DC Motor (Steady State)

Solves the equilibrium analytically (no integration, no state):

```
ω = (V · Kt - R · τ_load) / (Ke · Kt + R · b)
i = (b · ω + τ_load) / Kt
τ = Kt · i
back_emf = Ke · ω
```

Useful for sanity-checking parameter choices and as the target the
Dynamic node converges to when run long enough.

- **Inputs**: `V`, `tau_load`.
- **Outputs**: `i`, `omega`, `tau`, `back_emf`.

### `Physics.Electric.Motor.DC:speedPI` — Speed PI Controller

Standard PI law with hard saturation and back-calculation anti-windup
(integral frozen while output is clamped).

- **Inputs**: `omega_ref`, `omega_measured`, `dt`.
- **Output**: `V_cmd` clamped to `[-Vmax, +Vmax]`.
- **Editable**: `Kp` (0.5), `Ki` (2.0), `Vmax` (24 V).

### `Physics.Electric.Motor.DC:tachymeter` — Tachymeter

Realistic angular-speed sensor: 1st-order low-pass + zero-mean Gaussian
noise + uniform quantization, applied in that order. Noise is
deterministic (seeded LCG + Box-Muller), so the same `seed` reproduces
the same sequence across runs.

- **Input**: `omega`, `dt`.
- **Output**: `omega_measured`.
- **Editable**: `noiseStd` (0.5 rad/s), `resolution` (0.1 rad/s, 0 to
  disable), `bandwidthHz` (100 Hz, 0 to bypass), `seed` (1).

## MCSA-oriented sim graph

A closed-loop sim where the load torque carries a 10 Hz modulation, so
the armature current `i` has a clearly identifiable 10 Hz signature
visible after FFT.

```
NumberSlider(ω_ref) ─────────► speedPI ─V_cmd─► dynamic ─ω──► tachymeter ─ω_meas─╮
                                  ▲                  │                            │
                                  └── feedback ◄─────┴────────────────────────────╯
                                                     │
                                                     ├─i──► [pipeline DSP: SpFrame → SpWindow → SpFFT → spectrum]
                                                     │
       Logic.Sin(2π·10Hz) ── × 0.01 ──┐
                                       └─► tau_load
```

Sample wiring tips:

- Set the tachymeter's `noiseStd` to 0 for an idealized loop while you
  tune `Kp`/`Ki`; reintroduce noise once the controller is stable.
- The Dynamic node's `dt` input should be driven by `Logic.DeltaTime` for
  a real-time loop, or by a constant slider for a deterministic batch
  run feeding the DSP pipeline downstream.
- For MCSA inspection, feed `i` (not `omega`) to the FFT — that is the
  whole point of MCSA: the modulation in the load couples back into the
  current through the motor's transfer function and shows as a
  signature line.

## Manifest

```jsonc
{
    "id":          "spk.physics",
    "version":     "0.1.0",
    "displayName": "Physics",
    "entry":       "bundle/SpkPluginPhysics.js",
    "subPlugins": [
        {
            "id":          "Physics.Electric.Motor.DC",
            "displayName": "DC Motor",
            "category":    "Physics.Electric.Motor.DC",
            "version":     "0.1.0",
            "standards":   [],
            "nodes": [
                { "type": "Physics.Electric.Motor.DC:dynamic",    "factory": "createDcMotorDynamicNode",    "label": "DC Motor (Dynamic)" },
                { "type": "Physics.Electric.Motor.DC:steady",     "factory": "createDcMotorSteadyNode",     "label": "DC Motor (Steady)" },
                { "type": "Physics.Electric.Motor.DC:speedPI",    "factory": "createDcMotorSpeedPiNode",    "label": "DC Motor Speed PI" },
                { "type": "Physics.Electric.Motor.DC:tachymeter", "factory": "createDcMotorTachymeterNode", "label": "Tachymeter" }
            ]
        }
    ],
    "manifestRefs": []
}
```

The `manifestRefs` slot is reserved for future theme files
(`Physics.Mechanical`, `Physics.Thermal`, `Physics.Fluid`) so the root
manifest stays small while the sub-plugin set grows.

## Adding a new sub-plugin

1. Drop a folder under `src/<domain>/<sub>/`.
2. Each leaf exports an `IPlugin` with an `activate(ctx)` that
   registers nodes under `<Theme>.<Domain>[.<Sub>...]:` type ids.
3. Add the sub-plugin to the bundle's default export `subPlugins` map.
4. Add the matching entry in `manifest.json` under `subPlugins[]`.

Eager activation: every sub-plugin runs at bundle load time. Lazy
activation can be added later via a new manifest field if a theme grows
heavy enough to justify it.

## Tests

`packages/tests/physics/motor-dc.test.ts` (10 tests) validates:

- Steady-state matches the analytical equilibrium at defaults.
- Dynamic stays at rest with no excitation, converges from arbitrary
  initial conditions, and does not blow up under `dt = 100 µs` over
  10 000 ticks.
- PI controller saturates and starts at zero after reset.
- Tachymeter is bypass-passthrough when all imperfections are disabled,
  noise is deterministic given the same seed, and quantization rounds
  to multiples of `resolution`.
