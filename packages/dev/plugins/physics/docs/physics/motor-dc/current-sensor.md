# Current Sensor (LEM)

`Physics.Electric.Motor.DC:currentSensor`

Hall-effect current transducer (LEM HX class, ACS712, Allegro chips) on a DC drive's supply line: the measurement front-end of an MCSA chain. Mirror of the Tachymeter but in the current domain, with a default bandwidth wide enough to preserve the PWM harmonics and sidebands MCSA feeds on.

## Pipeline (per tick, in this order)

```
filtered = LPF(i, bandwidthHz)              1st-order low-pass
noisy    = filtered + N(0, noiseStd)        thermal noise + EMI pickup
measured = quantize(noisy, resolution)      ADC step
```

Same numerics as the Tachymeter: implicit-Euler LPF with `alpha = dt/(tau + dt)` (never overshoots), deterministic Box-Muller noise over a seeded LCG, `dt` from `session.dt` (first tick clamps to 0).

## Ports (signal-kind, ZOH)

| Direction | Slot         | Type  | Notes                                                                       |
| --------- | ------------ | ----- | --------------------------------------------------------------------------- |
| in        | `i`          | float | True current [A], typically the motor's `i` output. Unpublished reads as 0. |
| out       | `i_measured` | float | Filtered + noisy + quantized current [A].                                   |

## Editables

| Name          | Default | Meaning                                                                                           |
| ------------- | ------- | ------------------------------------------------------------------------------------------------- |
| `noiseStd`    | 0.01    | Noise standard deviation [A] (10 mA). Negative values snap to 0.                                  |
| `resolution`  | 0.005   | ADC step [A] (5 mA, the 12-bit @ +/-10 A class). 0 = off; negatives snap to 0.                    |
| `bandwidthHz` | 100000  | LPF cutoff [Hz]. 100 kHz default, wide for MCSA. 0 = bypass (ideal ammeter); negatives snap to 0. |
| `seed`        | 1       | RNG seed; restarts at `max(1, floor(seed))` on session reset.                                     |

`filtered` and `i_measured` are viewables; reset zeroes both.

## Pitfalls

- **MCSA: keep `bandwidthHz` at least 5x the PWM frequency.** Below that, the sensor filters out exactly the harmonics you want to analyse: the PWM carrier and the sidebands carrying the fault signature. The 100 kHz default is safe for a 10 kHz PWM; do not "clean up" the spectrum by lowering it.
- `resolution` is a real spectral floor: the quantization noise raises the FFT noise floor and can bury low-amplitude fault sidebands. Set it from your actual ADC, not lower.
