# Accelerometer

`Physics.Mechanical.Vibration:accelerometer`

Vibration transducer: degrades a "true" vibration channel (from a Bearing / Gear / Fault node chain) with a 1st-order low-pass, deterministic Gaussian noise, and quantization. Functionally the Tachymeter's twin, but in the mechanical-vibration domain and with token-based ports plus an explicit `dt` input.

## Pipeline (per tick, in this order)

```
filtered = LPF(vibration, bandwidthHz)      implicit-Euler, alpha = dt/(tau+dt)
noisy    = filtered + N(0, noiseStd)        Box-Muller over a seeded LCG
measured = quantize(noisy, resolution)      round to multiples
```

`bandwidthHz = 0` bypasses the filter; `noiseStd = 0` and `resolution = 0` disable their stages. The noise is reproducible: the RNG restarts at `max(1, floor(seed))` on every session reset.

## Ports

| Direction | Slot                 | Type  | Notes                                                                                    |
| --------- | -------------------- | ----- | ---------------------------------------------------------------------------------------- |
| in        | `vibration`          | float | True vibration sample; defaults to 0 when no token this tick (token semantics, not ZOH). |
| in        | `dt`                 | float | Optional; falls back to `t - lastT` when unwired.                                        |
| out       | `vibration_measured` | float | Filtered + noisy + quantized sample.                                                     |

## Editables

| Name          | Default | Meaning                                                               |
| ------------- | ------- | --------------------------------------------------------------------- |
| `noiseStd`    | 0.001   | Noise standard deviation (g-units convention, not enforced). 0 = off. |
| `resolution`  | 1e-4    | Quantization step. 0 = off.                                           |
| `bandwidthHz` | 2000    | LPF cutoff [Hz]. 0 = bypass.                                          |
| `seed`        | 1       | RNG seed.                                                             |

`filtered` and `vibration_measured` are viewables; session reset zeroes both.

## Pitfalls

- The 2 kHz default bandwidth sits BELOW many bearing defect harmonics at high shaft speeds (BPFI on a fast spindle easily passes 1 kHz with harmonics above 2 kHz): raise it when the signature you inject lives higher, or the sensor eats your own fault.
- Token semantics: a tick without a `vibration` token filters toward 0, it does not hold the last sample. Keep the upstream chain publishing every tick.
- Same seed + same tick count = bit-identical noise across runs; change `seed` for independent realizations.
