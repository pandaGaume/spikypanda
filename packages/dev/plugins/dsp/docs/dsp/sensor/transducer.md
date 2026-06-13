# Transducer

`DSP.Sensor:transducer`

Generic sensor model: turns a clean "ground-truth" scalar into a realistic measurement stream, bandwidth-limited, noisy, quantized and slowly drifting. Wrap any physical output (temperature, pressure, speed) with it so the downstream monitoring chain is exercised against what a real instrument would deliver. Specific sensor presets are just this node with different editables.

## Mechanics

Applied each fire, in this exact order:

```
true ──► LPF (1-pole IIR) ──► + Gaussian noise ──► quantize ──► + drift = measured
```

- **LPF**: discrete 1-pole IIR, `alpha = dt / (tau + dt)` with `tau = 1 / (2*pi*cutoffHz)`. The FIRST fire latches the input directly (no startup transient biasing the level).
- **Noise**: additive Gaussian via Box-Muller on `Math.random()`; UNSEEDED, so runs are not reproducible.
- **Quantization**: `round(v / step) * step` when `step > 0`.
- **Drift**: a cumulative offset, `sum of driftPerSec * dt` over all fires since reset; added LAST so it survives quantization (the classic uncompensated-bias signature).

Each stage is neutral at its default: huge `cutoffHz` is effectively a pass-through, `noiseStdev` 0 skips noise, `quantizationStep` 0 skips quantization, `driftPerSec` 0 freezes the drift accumulator.

`dt` comes from the `t` wire (delta between fires); without it, a constant 0.01 s (100 Hz inner loop) is assumed. A zero or negative delta (same-tick refire, non-monotonic clock) also falls back to the constant.

## Inputs / Outputs

| Direction | Slot       | Type  | Notes                                                                                                     |
| --------- | ---------- | ----- | --------------------------------------------------------------------------------------------------------- |
| in        | `value`    | float | required; the true physical value. NO value token, NO output: the node is value-driven, not clock-driven. |
| in        | `t`        | float | optional; sim time in seconds (wire Clock.t) for a physically meaningful `dt`.                            |
| out       | `measured` | float | the conditioned measurement, fanned out to every wire on the port.                                        |

## Editables

| Field              | Default | Notes                                                                               |
| ------------------ | ------- | ----------------------------------------------------------------------------------- |
| `cutoffHz`         | 50 Hz   | clamped to >= 1e-6 (a 0 cutoff would freeze the filter forever).                    |
| `noiseStdev`       | 0.01    | clamped to >= 0; std-dev of the additive Gaussian noise.                            |
| `quantizationStep` | 0 (off) | clamped to >= 0; the ADC step.                                                      |
| `driftPerSec`      | 0 (off) | units/s; SIGNED linear drift rate, integrated into the `_currentDrift` accumulator. |

Viewables: `lastMeasured` (panel sanity check), `effectiveDt` (diagnoses whether the `t` wire is actually connected: stuck at 0.01 means it is not), `currentDrift` (the cumulative offset so far).

## Pitfalls

- Without `t` wired, the LPF corner and the drift rate are computed against the assumed 0.01 s: at any other tick rate the effective bandwidth and drift speed are silently wrong. Wire Clock.t.
- The drift accumulator only clears on session reset: pausing does not re-zero a drifted sensor, exactly like a real uncalibrated instrument. Use `currentDrift` to see how far it has walked.
- Noise is nondeterministic (unseeded `Math.random()`): do not write tests or baselines that expect bit-identical measurement streams; assert statistics instead.
- A slow `driftPerSec` is the canonical input for exercising drift-detection chains (steady-state gate stays open, clusterer anchors fire): pair it with `ML.Cluster:online` drift anchors to demo the boiling-frog failure mode.
