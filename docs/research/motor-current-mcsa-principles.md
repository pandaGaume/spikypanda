# Motor Current Signature Analysis (MCSA) — Technical Principles

**Date:** 2026-04-09
**Sample:** `packages/host/www/samples/motor_current/`
**Prep script:** `packages/dev/tools/python/prepare_motor_current.py`
**Companion docs:**
- [Debugging trace](motor-current-mcsa-debugging.md) — 7 bugs, 5 attempts, 10 lessons
- [Novelty claim & prior art](motor-current-mcsa-novelty.md) — R&D paper draft
**Dataset:** Broken Rotor Bar dataset, published by the Universidade
Federal de Uberlândia (Brazil) on IEEE DataPort. Python constants
prefixed `UFU_` refer to parameters specific to this dataset.

This document is the mathematical and physical reference for the Motor
Current sample. It traces the full signal processing chain from the raw
3-phase stator currents to the LSTM classification output, explaining
at each step **what** is done, **why** it is done, and what happens if
you skip it.

---

## 1. Physics of 3-phase induction motors

### 1.1 Stator currents under normal operation

A 3-phase induction motor is fed by three sinusoidal voltages offset
by 120° in phase. Under balanced conditions the three stator currents
are:

    Ia(t) = I_peak · sin(2π·f·t)
    Ib(t) = I_peak · sin(2π·f·t - 2π/3)
    Ic(t) = I_peak · sin(2π·f·t + 2π/3)

where:
- `f` is the line frequency (60 Hz in the Broken Rotor Bar dataset)
- `I_peak` is proportional to the mechanical load on the shaft

Under ideal conditions the three phases are perfectly symmetric: same
amplitude, exactly 120° apart, pure sinusoid with no harmonics.

### 1.2 Rotor slip

The rotor of a squirrel-cage induction motor does not turn at the
synchronous speed of the magnetic field. The difference is called
**slip**:

    s = (n_sync - n_rotor) / n_sync

For the test motor (4 poles, 60 Hz):
- Synchronous speed: `n_sync = 120·f / P = 120·60 / 4 = 1800 rpm`
- Rated speed: `n_rotor = 1715 rpm` (from the nameplate)
- Rated slip: `s = (1800 - 1715) / 1800 = 0.047` (4.7 %)

Slip varies with load: higher load → higher slip. At no load, slip is
near zero; at full load, it reaches the rated value.

### 1.3 Broken rotor bars and their electrical signature

A squirrel-cage rotor has conductive bars (34 in the test motor)
shorted at each end by rings. When one or more adjacent bars break,
the rotor impedance becomes asymmetric. This asymmetry creates a
backward-rotating magnetic field component in the air gap, which
induces **sideband currents** in the stator at frequencies:

    f_brb = f · (1 ± 2·s)

For the test motor at rated load (`f = 60 Hz`, `s ≈ 0.047`):

    f_brb = 60 · (1 ± 2·0.047) = 60 ± 5.64 Hz
          = 54.36 Hz  and  65.64 Hz

These sidebands are superimposed on the 60 Hz fundamental. In the
**frequency domain** (FFT spectrum) they appear as small peaks at
`f ± 2sf`. In the **time domain** they appear as a slow **amplitude
modulation** (beating) of the 60 Hz carrier at frequency:

    f_mod = 2·s·f = 2 · 0.047 · 60 = 5.64 Hz

The modulation period is:

    T_mod = 1 / f_mod = 1 / 5.64 ≈ 177 ms

At lighter loads the slip is smaller and the modulation frequency
drops. At 25 % load with `s ≈ 0.02`:

    f_mod = 2 · 0.02 · 60 = 2.4 Hz    →    T_mod ≈ 417 ms

This gives us a hard constraint on windowing:

> **The observation window must cover at least one full period of the
> slowest expected modulation frequency.**

At the lightest loads: `T_mod ≈ 500 ms`, so the minimum usable window
is **≥ 500 ms**. The prep script uses 1.07 s (64 samples at 60 Hz
envelope rate) to capture 2–5 modulation periods across the load range.

### 1.4 Modulation depth vs. severity

The amplitude of the sidebands (and therefore the depth of the
envelope modulation) increases with the number of broken bars. For
`k` broken bars out of `N` total:

    sideband amplitude ∝ k / N

For the test motor (`N = 34`):
- 1 broken bar → `1/34 ≈ 2.9 %` modulation depth
- 4 broken bars → `4/34 ≈ 11.8 %` modulation depth

This is why BRB1 is the hardest class to detect: the modulation is
only ~3 % of the carrier amplitude, which is below the noise floor at
light loads. BRB4 at 12 % modulation is much easier.

### 1.5 Why current, not vibration?

Broken rotor bars are primarily an **electrical** fault. The rotor
impedance asymmetry modulates the stator current directly. The
mechanical vibration signature of broken bars exists but is weaker
and more easily confused with bearing faults, misalignment, or normal
rotor eccentricity. Current probes are also non-invasive (clamp-on)
and don't require physical access to the motor housing.

The companion [Motor Vibration](../../packages/host/www/samples/motor/)
sample detects **mechanical** faults (imbalance, bearing, misalignment)
from accelerometer data. The two samples are complementary: each
detects fault types that are easier to see in its own domain.

---

## 2. Signal processing chain

The prep script transforms raw 55.6 kHz 3-phase currents into
normalized 64-step envelope windows. Each step has a precise
mathematical rationale.

![Pipeline overview](figures/fig1_pipeline.png)
*Figure 1 — Signal at each stage: (a) raw current, (b) moving-RMS
envelope, (c) decimated + transient skipped, (d) per-window centered.*

![Before/after preprocessing](figures/fig2_before_after.png)
*Figure 2 — Raw current (top) vs. centered envelope (bottom) for
Healthy and BRB4 at full load. The raw signals are indistinguishable;
the envelopes show a clear modulation difference.*

### 2.1 Moving RMS (envelope extraction)

**Goal:** Remove the 60 Hz carrier and extract the slow amplitude
envelope where the broken-bar signature lives.

**Method:** Sliding-window Root Mean Square over one half-cycle of the
fundamental:

    env(t) = sqrt( (1/W) · Σ_{i=0}^{W-1} x(t+i)² )

where `W = T_half / T_sample = (1/(2·60)) / (1/55611) = 463 samples`.

**Why one half-cycle?** A half-cycle of a sinusoid is the shortest
interval over which the RMS is independent of the phase of the
carrier. Over a full cycle the RMS is constant regardless of when you
start; over a half-cycle it is *nearly* constant (the residual ripple
is at 120 Hz, which is above our envelope bandwidth of interest). Any
shorter window leaks the 60 Hz carrier into the envelope; any longer
window smooths out the modulation we want to keep.

**Mathematical property:** For a pure sinusoid `x(t) = A·sin(ωt)`,
the half-cycle RMS is:

    env = A / √2 ≈ 0.707 · A

For an amplitude-modulated sinusoid `x(t) = A(t)·sin(ωt)` where `A(t)`
varies slowly compared to `ω`, the half-cycle RMS tracks `A(t)/√2` —
which is exactly the envelope.

**Implementation:** Vectorized via cumulative sum for O(N) complexity
regardless of window size (`_moving_rms` in the prep script).

### 2.2 Decimation

**Goal:** Reduce the envelope sample rate from ~55.6 kHz (one RMS
value per raw sample) to ~60 Hz (one value per fundamental cycle).

**Factor:** `55611 / 927 = 59.99 Hz` → `UFU_ENV_DECIMATE = 927`

**Why 60 Hz?** The envelope bandwidth of interest is 2–6 Hz (the
broken-bar modulation). By Nyquist, we need at least 12 Hz sample
rate. 60 Hz gives a comfortable 10× oversampling of the highest
modulation frequency, while keeping the LSTM sequence length short
(64 steps for ~1 s of data).

**Lesson learned:** The decimation factor MUST be derived from a named
target rate, not guessed. A 46× error here (Bug F in the debugging
trace) made the transient skip ineffective and polluted the dataset
with motor-off windows.

### 2.3 Transient skip

**Goal:** Discard the startup transient (motor off → inrush →
acceleration → steady state) and keep only the steady-state region
where the broken-bar signature exists.

**Duration:** `UFU_TRANSIENT_SKIP = 360` envelope samples at 60 Hz =
**6.0 seconds**. The dataset documentation says each acquisition
is 18 s "from transient to steady state". Empirical inspection shows:

- t = 0–1 s: zero current (motor not yet energized)
- t = 1–2 s: inrush current (6–8× rated, up to ±17 A peak)
- t = 2–5 s: acceleration (current decays as motor spins up)
- t > 5 s: steady state (current stabilizes at load-dependent RMS)

Skipping 6 s provides a 1 s safety margin past the longest observed
startup.

**Why it matters for normalization:** Without the skip, the inrush
peaks (±17 A) dominate the global min/max and compress the steady-
state signal (±2.8 A) into a tiny fraction of the normalized range.

### 2.4 Per-window centering (load-baseline removal)

**Goal:** Remove the load-dependent DC component from each window so
the LSTM sees only the modulation signal.

**The problem:** The dataset tests every rotor state at 8 load
levels (12.5 % to 100 %). The RMS envelope mean is proportional to
load:

    E[env] ≈ I_rated · √(load_fraction)

At 12.5 % load: `E[env] ≈ 0.4 A RMS`
At 100 % load:  `E[env] ≈ 1.5 A RMS`

This load variation is **4× larger than the broken-bar modulation**
and carries ZERO class-discriminative information (every class appears
at every load). With global min/max normalization, the load confound
takes 75 % of the input dynamic range, leaving the modulation buried
at 2.7 % within-window variation.

**The fix:** For each 64-step window and each channel:

    centered(t) = (env(t) - mean(env)) · gain + 0.5

where `mean(env)` is the per-window mean and `gain = 6.0` is a
calibrated amplification factor. The result is clamped to [0, 1].

**Why this is safe:** All 5 rotor states appear at all 8 load levels.
The window mean is therefore a pure nuisance variable — it encodes
load, not rotor state. Removing it costs nothing in discriminative
power and gives the LSTM a 10× increase in the relative magnitude of
the signal it needs to classify.

**Choosing the gain:** Typical broken-bar modulation amplitude is
~0.05 A RMS (for BRB4 at moderate load). With `gain = 6.0`:

    ±0.05 A → ±0.3 in normalized [0, 1] space

This fills ~60 % of the dynamic range. Higher gain (8–10) would give
more sensitivity but risks clipping at high loads; lower gain (3–4)
wastes dynamic range. The current value of 6.0 was chosen empirically
to avoid visible clipping while keeping the modulation prominent.

**What the LSTM sees after centering:**

| Metric | Before (global min/max) | After (centered + amplified) |
|---|---|---|
| Value range used | [0.548, 0.904] (35%) | [0.013, 0.971] (96%) |
| Mean | 0.704 (off-center) | 0.501 (centered) |
| Overall std | 0.113 | 0.285 (2.5×) |
| Within-window std | 0.027 | 0.280 (10×) |

### 2.5 Minimum-envelope threshold

**Goal:** Filter out windows where the motor is off or at extremely
light load (envelope < 0.15 A RMS).

These windows contain no useful modulation signal — just noise or
residual sensor artifacts. Including them degrades the normalization
range and confuses the classifier.

**Threshold:** `UFU_MIN_ENV_THRESHOLD = 0.15 A RMS`. The lightest dataset
load (12.5 %) produces ~0.4 A RMS, so 0.15 A is a conservative floor.

---

## 3. LSTM architecture considerations

### 3.1 Why RNN for envelope classification?

The envelope is a 1D time series with temporal structure: the
modulation is periodic at `2·s·f` and the modulation depth encodes the
fault severity. An RNN processes the series timestep-by-timestep,
accumulating evidence in its hidden state. The final hidden state
summarizes the temporal pattern and drives the classification output.

Alternatives:
- **FFT + MLP:** Compute the power spectrum of the envelope and
  classify the sideband amplitude directly. Works well in classical
  MCSA but requires explicit frequency-domain feature engineering.
- **1D CNN:** Convolve learned filters over the envelope. Often faster
  to train but may need more parameters for the same accuracy on
  slowly-varying envelopes.
- **Transformer:** Self-attention over the envelope timesteps. Overkill
  for a 64-step sequence and too expensive for MCU deployment.

The RNN was chosen to stay consistent with the Motor Vibration sample
(which also uses LSTM/GRU) and to demonstrate the SpikyPanda RNN API.

### 3.2 Sequence length and BPTT gradient flow

The LSTM must backpropagate the classification loss from the last
timestep through all 64 cells to update the input weights. The
gradient at timestep `t` is attenuated by the product of the forget-
gate Jacobians from `t` to `T`:

    ∂L/∂h_t = ∂L/∂h_T · Π_{k=t}^{T-1} (∂h_{k+1}/∂h_k)

Each factor is approximately:

    ‖∂h_{k+1}/∂h_k‖ ≈ σ(f_k)

where `σ(f_k)` is the forget-gate activation, typically in [0.5, 1.0].

Over `T - t` steps: `‖∂L/∂h_t‖ ∝ σ^(T-t)`.

For `T = 64` and `σ ≈ 0.9`: `0.9^64 ≈ 0.001` — the gradient is
attenuated by 1000× but still non-zero. The LSTM can learn.

For `T = 256` and `σ ≈ 0.9`: `0.9^256 ≈ 3×10^{-12}` — effectively
zero. This is why Attempt 2 (256-step raw current) failed completely:
the gradient vanished before reaching the input weights.

**Rule of thumb:** For a 16-unit LSTM with Adam optimizer, keep
`T ≤ 100`. For `T > 100`, either increase hidden size, use truncated
BPTT, or (better) shorten the sequence via preprocessing.

### 3.3 Hidden size

The hidden state dimension `h` determines the model's capacity to
represent temporal patterns. The total parameter count of an LSTM
layer is:

    params = 4 · h · (input_size + h + 1)

For `input_size = 3` (Ia, Ib, Ic envelopes):
- `h = 16`: `4 · 16 · 20 = 1280` parameters
- `h = 32`: `4 · 32 · 36 = 4608` parameters

Plus the output layer: `h · num_classes + num_classes`
- `h = 32, C = 5`: `32 · 5 + 5 = 165` parameters

Total for `h = 32`: **4773 parameters** — small enough for MCU
deployment (< 20 KB at float32).

Empirical results on the Broken Rotor Bar dataset:
- `h = 16`, 25 epochs: 31.8 % accuracy (underfitting)
- `h = 32`, 50 epochs: 70.8 % accuracy
- `h = 32`, 150 epochs: 88.0 % accuracy

### 3.4 Training targets: many-to-one via many-to-many API

The SpikyPanda RNN API requires a target vector at every timestep
(many-to-many). For a classification task, we want many-to-one: only
the final timestep's output matters. Two approaches:

**1. One-hot at every timestep (used here):**

    target(t) = one_hot(label)    for all t

The early-timestep loss is high (the LSTM has no context yet to
predict the class), but the gradient direction is unambiguous. The
late timesteps dominate the gradient naturally because the loss is
lower there (the LSTM has converged to the correct prediction) and
the gradient accumulates across all timesteps.

**2. Neutral target for early timesteps (NOT used — see Bug D):**

    target(t) = [1/C, 1/C, ..., 1/C]    for t < 0.75·T
    target(t) = one_hot(label)           for t ≥ 0.75·T

This creates an optimum trap: the uniform 1/C vector is the unique
zero of the neutral-target loss under sigmoid + MSE. The optimizer
collapses every output to 1/C to minimize the dominant loss term,
and the one-hot term on the last 25 % of timesteps cannot overcome
this trap because its gradient is attenuated by the 75 % neutral
region.

### 3.5 Loss function

MSE (Mean Squared Error) is used with sigmoid output activations.
For 5-class classification with one-hot targets:

    L = (1/T) · Σ_t (1/C) · Σ_c (y_c(t) - target_c)²

The theoretical minimum loss for a perfect classifier (output = exact
one-hot) with C = 5 is **not zero** because sigmoid cannot produce
exact 0 or 1:

    L_min ≈ (1/C) · [(C-1) · σ_min² + (1 - σ_max)²]

where `σ_min ≈ 0.01` and `σ_max ≈ 0.99` at the extremes. This gives
`L_min ≈ 0.004` per timestep, or about **0.016** averaged over the
4 incorrect classes × T timesteps. In practice the achievable loss
floors around **0.15–0.20** because the early timesteps cannot produce
a confident prediction and the class boundaries are inherently fuzzy
for adjacent broken-bar severities.

A softmax + cross-entropy loss would be a better fit for multi-class
classification (sharper gradients near the decision boundary), but the
current SpikyPanda RNN API uses sigmoid + MSE, which works adequately
for this problem.

---

## 4. Dataset-specific considerations (Broken Rotor Bar — Univ. Federal de Uberlândia)

### 4.1 Experimental setup

- Motor: 1 hp, 220/380 V, 3.02/1.75 A, 4 poles, 60 Hz
- Rotor: squirrel cage, 34 bars
- Rated torque: 4.1 Nm, rated speed: 1715 rpm
- Load: DC generator on shared shaft, 8 levels (12.5–100 % of rated)
- Defects: drilled bars, 1–4 adjacent broken bars + healthy
- Sampling: 18 s per acquisition, ~55.6 kHz, 10 repetitions per
  (load × severity) = 400 total acquisitions

### 4.2 HDF5 file structure

Files: `struct_{rs,r1b,r2b,r3b,r4b}_R1.mat` (MATLAB v7.3 = HDF5)

    <rotor_key>/                    # 'rs', 'r1b', ..., 'r4b'
        torque05..torque40/         # 8 load levels
            Ia, Ib, Ic              # (10, 1) HDF5 object references
            Va, Vb, Vc              # voltage (unused)
            Trigger                 # trigger signal (unused)
            Vib_acpe, Vib_acpi,     # 5 vibration channels (unused)
            Vib_axial, Vib_base,
            Vib_carc

Each dereferenced array: shape `(1, ~1001000)`, dtype float64.
Current values in Amperes (±17 A during inrush, ±2.8 A steady state).

### 4.3 Class separation analysis

After the full preprocessing pipeline (envelope + centering +
amplification), the per-class within-window standard deviation of the
normalized signal is:

| Class | Windows | Mean within-window std | Interpretation |
|---|---|---|---|
| Healthy | 400 | 0.270 | Baseline noise level |
| BRB1 | 400 | 0.286 | +5.9 % vs. Healthy |
| BRB2 | 400 | 0.288 | +6.7 % vs. Healthy |
| BRB3 | 400 | 0.276 | +2.2 % vs. Healthy |
| BRB4 | 400 | 0.298 | +10.4 % vs. Healthy |

The ordering is not perfectly monotonic (BRB3 < BRB2) because the
metric is averaged across all 8 load levels and the modulation
visibility varies with load (higher load → higher slip → more visible
modulation, but also more noise). The LSTM learns to leverage the
full temporal structure of the envelope (shape, periodicity, phase
relationships across Ia/Ib/Ic), not just the variance.

### 4.4 Confusion pattern

![Confusion matrix](figures/fig5_confusion.png)

The LSTM at h=32, 150 epochs achieves 88.0 % overall accuracy with a
characteristic confusion pattern:

    Healthy → BRB1:   5 errors (5.6 % of BRB1 test samples)
    BRB1 → BRB2:     13 errors (14.4 % of BRB1 test samples)
    BRB2 → BRB3:     12 errors (15.6 % of BRB2 test samples)
    BRB4 → BRB3:      5 errors (6.9 % of BRB4 test samples)

All confusions are between **adjacent severities**. This is the
expected MCSA failure mode: the difference between k and k+1 broken
bars is only `1/N = 2.9 %` additional modulation depth, and at light
loads this is below the noise floor.

In a real deployment, this confusion pattern is acceptable because:
1. The binary Healthy/Faulty decision (which matters most for safety)
   is 97.3 % (only 6 faulty motors called Healthy: 5 BRB1 + 1 BRB3)
2. Confusing BRB3 with BRB4 is operationally harmless, both require
   the same maintenance action (schedule rotor replacement)
3. BRB1 being confused with Healthy is the only safety-relevant
   failure mode, and it occurs mostly at light loads where the motor
   is under less stress anyway

---

## 5. Full pipeline summary

![Accuracy vs. model size](figures/fig4_pareto.png)
*Figure 4 — Our model occupies the TinyML-feasible region of the
accuracy/size frontier, 1000x smaller than the nearest competitor.*

```
Raw 3-phase currents (55.6 kHz, 18 s, ±17 A)
    │
    ├─ 1. Moving RMS over 463 samples (= 1 half-cycle of 60 Hz)
    │     → removes 60 Hz carrier, extracts envelope
    │
    ├─ 2. Decimate by 927 → 60 Hz envelope rate
    │
    ├─ 3. Skip first 360 samples (= 6.0 s startup transient)
    │
    ├─ 4. Slide 64-sample windows, stride 32 (= 1.07 s, overlap 50 %)
    │
    ├─ 5. Drop windows with mean < 0.15 A RMS (motor-off filter)
    │
    ├─ 6. Per-window center + amplify:
    │       centered(t) = (env(t) - mean(env)) · 6.0 + 0.5
    │       clamped to [0, 1]
    │
    └─ 7. Emit as JSON: {"sequence": [[Ia, Ib, Ic], ...], "label": 0..4}

Browser LSTM (3 inputs, 32 hidden, 5 outputs, sigmoid + MSE + Adam)
    │
    ├─ Target: one-hot at every timestep
    ├─ 150 epochs, lr = 0.003
    └─ → 88.0 % accuracy (h=32), loss 0.214
```

---

## 6. References

1. **Broken Rotor Bar dataset (Univ. Federal de Uberlândia):**
   https://ieee-dataport.org/open-access/experimental-database-detecting-and-diagnosing-rotor-broken-bar-three-phase-induction

2. **MCSA sideband formula:**
   W.T. Thomson and M. Fenger, "Current signature analysis to detect
   induction motor faults," IEEE Industry Applications Magazine,
   vol. 7, no. 4, pp. 26-34, Jul/Aug 2001.
   Key result: broken-bar sidebands at `f·(1 ± 2s)`.

3. **Debugging trace (companion document):**
   [motor-current-mcsa-debugging.md](motor-current-mcsa-debugging.md)
   — 7 bugs, 5 attempts, 10 general principles.

4. **Motor Vibration sample (companion):**
   `packages/host/www/samples/motor/` — mechanical fault detection
   from accelerometer data (imbalance, bearing, misalignment).

5. **Prep script with all fixes:**
   `packages/dev/tools/python/prepare_motor_current.py`

6. **Browser sample:**
   `packages/host/www/samples/motor_current/`
