# Sliding Window Preprocessing: Implementation Notes

**Date:** 2026-04-10
**Status:** Design notes, not yet implemented
**Context:** Optimization of the motor current envelope preprocessing
for ESP32 deployment, following the MCSA broken rotor bar work.

---

## Observation

The current preprocessing subtracts the per-window mean (load
baseline) and amplifies the residual modulation. But the **variance**
of the envelope within a window is a more direct measurement of the
fault signature than the mean-centered waveform:

- **Window mean** = load level. Same for healthy and faulty at the
  same load. A confound, correctly removed by centering.
- **Window variance** = modulation depth squared. Proportional to
  (k/N)^2 where k is the number of broken bars and N = 34. This IS
  the fault signal.

Diagnostics from the UFU dataset (post-centering, normalized [0,1]):

| Class | Per-window std | Relative to Healthy |
|---|---|---|
| Healthy | 0.270 | baseline |
| BRB1 | 0.286 | +5.9% |
| BRB2 | 0.288 | +6.7% |
| BRB3 | 0.276 | +2.2% |
| BRB4 | 0.298 | +10.4% |

The trend is monotonic for BRB2-BRB4 (BRB3 is slightly low due to
load mixing in the dataset).

## Design: Exchangeable Normalization Modes

The preprocessor should support multiple normalization modes via a
single `mode` attribute, exchangeable at the ONNX level:

| Mode | Name | Operation | Output |
|---|---|---|---|
| 0 | mean-center | `(x - mean) * gain + 0.5`, clamp [0,1] | Same as current |
| 1 | variance-normalize | `(x - mean) / max(std, eps)` | Z-scored, unbounded |
| 2 | both | Channels 0-2: mean-centered; channels 3-5: per-window std (repeated) | 6 channels |

Mode 0 is the current production mode (78.3% accuracy, submitted
paper). Mode 1 normalizes by variance instead of using a fixed gain,
adapting to the signal amplitude automatically. Mode 2 gives the LSTM
both the waveform shape and an explicit modulation-depth feature.

**Important:** mode 1 (z-score) erases the absolute modulation depth
from the signal amplitudes. This may help generalization across motors
(different rated currents produce different envelope amplitudes) but
may hurt severity discrimination (BRB2 vs BRB4 differ by modulation
depth, which z-scoring removes). Mode 2 avoids this trade-off by
keeping both representations.

## O(1) Sliding Window

Both mean and variance are computable incrementally from two
accumulators per channel: running sum and running sum-of-squares.

```c
// ESP32 firmware: O(1) per sample, O(N) memory for ring buffer
struct SlidingEnvelope {
    float buf[WINDOW_SIZE][CHANNELS];  // ring buffer
    int   head;                         // write position
    int   count;                        // 0..WINDOW_SIZE
    float sum[CHANNELS];                // running sum
    float sum_sq[CHANNELS];             // running sum of squares
};

void push_sample(SlidingEnvelope* s, float sample[CHANNELS]) {
    for (int ch = 0; ch < CHANNELS; ch++) {
        if (s->count == WINDOW_SIZE) {
            // Evict oldest sample
            float old = s->buf[s->head][ch];
            s->sum[ch]    -= old;
            s->sum_sq[ch] -= old * old;
        }
        // Insert new sample
        s->buf[s->head][ch] = sample[ch];
        s->sum[ch]    += sample[ch];
        s->sum_sq[ch] += sample[ch] * sample[ch];
    }
    s->head = (s->head + 1) % WINDOW_SIZE;
    if (s->count < WINDOW_SIZE) s->count++;
}

float get_mean(SlidingEnvelope* s, int ch) {
    return s->sum[ch] / s->count;
}

float get_variance(SlidingEnvelope* s, int ch) {
    float m = get_mean(s, ch);
    return s->sum_sq[ch] / s->count - m * m;
}

float get_std(SlidingEnvelope* s, int ch) {
    float var = get_variance(s, ch);
    return var > 0.0f ? sqrtf(var) : 0.0f;
}
```

**Memory:** 64 x 3 x 4 = 768 bytes (ring buffer) + 6 x 4 = 24 bytes
(accumulators) = **792 bytes total**.

**Compute per sample:** 3 additions, 3 subtractions, 3 multiplies,
3 comparisons = O(1) regardless of window size.

**Numerical stability:** At the envelope magnitudes involved (0.1 to
2.0 A RMS), catastrophic cancellation in `sum_sq/N - mean^2` is not
a practical concern for float32. If long-running drift accumulates
(millions of samples), periodically recompute from the buffer
(every ~10,000 samples, negligible amortized cost).

## Standard ONNX Graph for Variance-Normalize (Mode 1)

```
envelope [64, 3]
  |
  +-- ReduceMean(axes=[0], keepdims=1) -> mu [1, 3]
  +-- Sub(envelope, mu) -> centered [64, 3]
  +-- Mul(centered, centered) -> sq [64, 3]
  +-- ReduceMean(sq, axes=[0], keepdims=1) -> var [1, 3]
  +-- Sqrt(var) -> sigma [1, 3]
  +-- Max(sigma, epsilon=0.001) -> safe_sigma [1, 3]
  +-- Div(centered, safe_sigma) -> z_normed [64, 3]
```

7 standard ONNX ops. All supported by onnxruntime and CyanMycelium.

## Implications for the Anomaly Monitor

The rolling variance could replace the current composite z-score
(std + range + clip averaged across channels) as the anomaly signal.
Advantages:
- Simpler (one statistic instead of three)
- More physically grounded (directly measures modulation depth)
- Available for free from the sliding window accumulators

The monitor would track `get_variance()` over time and alarm when it
deviates from the calibration-phase distribution. The EMA smoothing
and adaptive thresholds already in place would work unchanged.

## Files That Would Change (When Implemented)

| File | Change |
|---|---|
| `packages/dev/onnx/src/onnx/ops/dotvision.ts` | Add `mode` attribute to `EnvelopeCenterNode`, implement modes 1 and 2 |
| `packages/dev/tools/python/prepare_motor_current.py` | Add `--normalize-mode` flag to `_normalize_window_centered` |
| `packages/host/www/samples/motor_current/motor_current.js` | Pass `mode` in the ONNX export, add mode dropdown |
| `packages/host/www/samples/motor_monitor/motor_monitor.js` | Option to use variance-only scoring |

## Open Questions

1. Does z-score normalization (mode 1) help or hurt the LSTM? It
   removes absolute modulation depth but may improve generalization
   across motors with different rated currents. Needs an experiment.

2. Does adding std as a 4th channel (mode 2) improve accuracy beyond
   78.3%? The LSTM gains explicit access to modulation depth without
   having to infer it from the waveform shape. Cost: +128 parameters
   (4 x 32 x 1). Needs training.

3. For the anomaly monitor, is variance-only scoring better than the
   composite? The Python simulation showed 2.93x separation with the
   composite; variance-only should be tested.
