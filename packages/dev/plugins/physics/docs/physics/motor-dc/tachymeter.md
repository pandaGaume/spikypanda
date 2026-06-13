# Tachymeter

`Physics.Electric.Motor.DC:tachymeter`

Analog angular-speed sensor: models the velocity feedback transducer any real control loop has to live with, by degrading the true `omega` with three imperfections in a fixed order. Wire it between a motor's `omega` output and a Speed PI's `omega_measured` input.

## Pipeline (per tick, in this order)

```
filtered = LPF(omega, bandwidthHz)          1st-order low-pass
noisy    = filtered + N(0, noiseStd)        Gaussian, deterministic
measured = quantize(noisy, resolution)      round to multiples
```

- **LPF**: implicit-Euler discretisation, `alpha = dt/(tau + dt)` with `tau = 1/(2*pi*bandwidthHz)`. Alpha stays in [0, 1] by construction, so a large `dt` collapses to passthrough instead of overshooting. `bandwidthHz = 0` bypasses the filter entirely.
- **Noise**: zero-mean Gaussian via Box-Muller over a seeded LCG, fully reproducible across runs. `noiseStd = 0` disables.
- **Quantization**: `round(x/resolution)*resolution`. `resolution = 0` disables.

`dt` comes from `session.dt` (no port); the first tick clamps Infinity to 0 so the LPF does not jump before a real macro-step.

## Ports (signal-kind, ZOH)

| Direction | Slot             | Type  | Notes                                                                         |
| --------- | ---------------- | ----- | ----------------------------------------------------------------------------- |
| in        | `omega`          | float | True angular speed [rad/s], typically a motor output. Unpublished reads as 0. |
| out       | `omega_measured` | float | Filtered + noisy + quantized speed [rad/s].                                   |

## Editables

| Name          | Default | Meaning                                                                           |
| ------------- | ------- | --------------------------------------------------------------------------------- |
| `noiseStd`    | 0.5     | Noise standard deviation [rad/s]. 0 = off.                                        |
| `resolution`  | 0.1     | Quantization step [rad/s]. 0 = off.                                               |
| `bandwidthHz` | 100     | LPF cutoff [Hz]. 0 = bypass.                                                      |
| `seed`        | 1       | RNG seed; the generator restarts at `max(1, floor(seed))` on every session reset. |

`filtered` and `omega_measured` are viewables; reset zeroes both.

## Pitfalls

- The noise sequence restarts identically on every session reset: two runs with the same seed and the same tick count produce bit-identical measurements. Change `seed` for independent realizations.
- `bandwidthHz` well below the loop bandwidth adds phase lag the PI tuning must absorb; the 100 Hz default already matters for a speed loop tuned past ~20 Hz.
