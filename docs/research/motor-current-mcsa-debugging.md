# Motor Current (MCSA) Sample — Debugging Trace & Lessons Learned

**Date:** 2026-04-09
**Sample:** `packages/host/www/samples/motor_current/`
**Prep script:** `packages/dev/tools/python/prepare_motor_current.py`
**Dataset:** UFU Broken Rotor Bar (IEEE DataPort) — 5 rotor states × 8 load levels × 10 reps

This document is a post-mortem on the first three end-to-end attempts at the
Motor Current sample. The original implementation cloned the Motor Vibration
sample 1:1 and substituted 3-phase stator currents for the triaxial
accelerometer input. It took SIX successive bug fixes — across data
preprocessing, loss shaping, sequence length, signal representation, and a
pure arithmetic mistake — before the pipeline became trainable. Each one
is the kind of mistake that is easy to make again on the next time-series
fault detection sample, so they are all documented here in detail.

**Timeline of attempts:**

| Attempt | Architecture | Accuracy | Dominant failure |
|---|---|---|---|
| 1 | 64-step LSTM on raw 1 kHz current, per-trace norm, neutral target trick | 26.8 % | Bugs A + B + C + D compounding |
| 2 | 256-step LSTM on raw 253 Hz current, global norm, transient skip, one-hot target | 16.0 % | Bug E (vanishing gradient through 256 steps) |
| 3 | 64-step LSTM on 60 Hz RMS envelope, global min/max norm | 35.0 % | Bug G (load baseline confound taking 75 % of dynamic range) |
| 4 | 64-step LSTM on 60 Hz RMS envelope, per-window centered + amplified (h=32, 50 ep) | 70.8 % | Working. Healthy near-perfect (79/80), confusions only between adjacent severities. Loss still falling at epoch 50. |
| 5 | Same as 4 but 80 epochs | **78.3 %** | Healthy 98.8 %, BRB3 82.7 %, BRB4 77.8 %, BRB1 67.8 %, BRB2 64.9 %. Confusions only between adjacent severities. Loss 0.268 at epoch 77, still trending down. |

## 1. Symptoms

```
Epoch  1/25 - Avg Loss: 0.125240
Epoch  5/25 - Avg Loss: 0.114290
Epoch 10/25 - Avg Loss: 0.123645
Epoch 15/25 - Avg Loss: 0.122760
Epoch 20/25 - Avg Loss: 0.139718
Epoch 25/25 - Avg Loss: 0.139652   <-- loss rising, not falling
Accuracy: 26.8% (107/400)

Confusion Matrix (rows=actual, cols=predicted):
                 Healthy      BRB1      BRB2      BRB3      BRB4
Healthy                0         0         8         6        76
BRB1                  77         0         0         1         1
BRB2                   0         0        77         0         0
BRB3                   1         0        72         0         1
BRB4                   0         0        43         7        30
```

The model was collapsing predictions into mostly two columns (BRB2, BRB4) and
swapping Healthy ↔ BRB1 wholesale. Loss was hovering at ~0.12-0.14 while the
theoretical achievable minimum was much lower. This is the signature of an
optimizer stuck in a flat region, not a slowly-converging model.

## 2. Root cause analysis

### Bug A — Per-trace normalization destroyed the fault signature

**What the code did.** `normalize_windows()` computed per-channel min/max
**inside a single trace** (one rotor × one load × one repetition) and
rescaled that trace to `[0, 1]`. Then it threw the min/max away and moved on
to the next trace.

**Why that is wrong for MCSA.** The dominant difference between Healthy and
broken-bar conditions is in the **absolute amplitude and shape** of the
stator current envelope. At full load a healthy motor pulls roughly 2-3 A;
at light load it pulls roughly 0.5-1 A; broken bars introduce slow envelope
modulation on top of that base amplitude. When every trace is independently
rescaled to fill `[0, 1]`, the absolute amplitude difference is gone — a
healthy 100 % load trace and a BRB4 12.5 % load trace both become a sinusoid
filling the unit interval, with only subtle waveform-shape differences left.
The classifier had no chance.

**Lesson.** For any fault-detection problem where the *absolute amplitude*
of the sensor signal carries discriminative information, normalization must
be **global across the entire dataset**, not per-recording. This is
different from the vibration sample, where the signature is in the
*shape* of the periodic vibration (harmonics, impulses, modulation) and
the absolute g-level matters less. Two-pass processing — pass 1 collects
raw decimated traces and computes global per-channel stats, pass 2
windows + normalizes — is the safe default.

**Fix.** New helpers in `prepare_motor_current.py`:
- `collect_ufu_traces(filepath)` — pass 1, returns `(label, raw_trace)` pairs
- `compute_global_stats(traces)` — symmetric per-channel `[-m, +m]` range
- `normalize_with_global_stats(trace, mins, maxs)` — pass 2, applied uniformly
- `_windows_from_traces(...)` — wires the two passes together

The symmetric `[-m, +m]` choice (instead of raw `[min, max]`) ensures a
balanced 3-phase signal centers at 0.5 in every channel, so any deviation
from 0.5 directly encodes signed current magnitude.

### Bug B — Startup transient contaminated the global stats AND the windows

**What the data actually contains.** Each UFU acquisition is 18 s long and,
per the dataset documentation, "covers transient to steady state". In
practice this means:
- ~1 s of zero current (motor not yet energized)
- ~1-2 s of large inrush current (peaks 6-8× rated, up to ±17 A)
- ~14 s of steady-state running at ~±2-3 A peak

After Bug A was fixed, the global per-channel range came out as **±18.1 A** —
which is the inrush peak, not the steady-state amplitude. Every steady-state
window was then squashed into a tiny range around 0.5, and the broken-bar
signature was effectively erased a *second* time.

The same problem manifests in window selection: with stride 128 and per-class
sample caps applied trace-by-trace, the script was emitting the **first**
windows of each trace, which are exactly the transient region. The first
~9 timesteps of every "high-amplitude" sample were `0.50, 0.50, 0.50, ...`
followed by an inrush spike — a degenerate signal with no fault information.

**Lesson.** Any benchtop dataset that records "transient to steady state"
needs an explicit transient skip *before* both stats computation and
windowing. Inspect raw traces visually or programmatically before trusting
that "raw min/max" reflects normal operation. Cheap trick: print the first
16 samples and the last 16 samples of one trace per class — you will
immediately see if the start is degenerate.

**Fix.** New constant `UFU_TRANSIENT_SKIP = 1200` (≈ 4.7 s at the 253 Hz
effective rate). Applied **inside `collect_ufu_traces`**, so the global
stats are computed from steady-state samples only and windows are sliced
from the steady-state region only.

After the fix, the global range collapsed to a physically sensible
**±2.8 A** matching the motor's rated current.

### Bug C — Window too short to see the broken-bar envelope

**The physics.** Broken rotor bars introduce sidebands at f<sub>line</sub> ±
2·s·f<sub>line</sub>, where `s` is rotor slip (a few percent of synchronous
speed). In the time domain these sidebands appear as a slow **amplitude
envelope modulation** at frequency 2·s·f<sub>line</sub> ≈ 2-5 Hz, period
200-500 ms.

**The mistake.** The original window was `WINDOW_SIZE = 64` at an effective
rate of ~1 kHz, i.e. **64 ms total**. That is shorter than even one full
period of the slowest envelope modulation. The RNN literally could not
see the fault signature within a single window — it only saw ~4 cycles of
the 60 Hz fundamental, which look essentially identical across all rotor
states.

**Lesson.** Every time you choose a window length for a periodic-signal
classification problem, write down the formula explicitly:

> window length (seconds) ≥ 1 / (slowest discriminative frequency)

For broken-bar MCSA at the slowest plausible slip frequency (~2 Hz) that
gives a hard floor of **500 ms**, and a comfortable target of **~1 s** to
see 2-3 envelope periods. For 60 Hz vibration faults the floor is much
lower (~16 ms) so the original 64 ms window was fine.

**Fix.** Bumped to `WINDOW_SIZE = 256`, `STRIDE = 256` (non-overlapping)
at the new lower effective rate of ~253 Hz, giving **~1.01 s of steady-
state running per window** = roughly 60 line cycles + 2-5 envelope
modulation cycles. The decimation factor `UFU_DECIMATION` was bumped
from 56 to 220 to keep the per-window timestep count manageable for the
LSTM.

### Bug D — "Neutral-target trick" optimum trap

**What the code did.** The training loop in `motor_current.js` was a
direct copy of `motor.js`, which uses a clever-looking trick: for the
first 75 % of timesteps in a window, set the target vector to the
uniform distribution `[1/N, 1/N, ..., 1/N]`; only for the final 25 %
set it to the one-hot label.

The motivation in the original sample was reasonable: an RNN at t=0 has
not yet seen any signal, so asking it to produce a confident class
prediction is unfair; let the early steps stay neutral and only require
the correct answer once the hidden state has built up enough context.

**Why it broke here.** With sigmoid outputs and MSE loss, the **uniform
1/N distribution is the unique global minimizer of the neutral-target
loss** — and it minimizes that loss to *exactly zero* per timestep.
The optimizer therefore has a very strong incentive to push every
output toward `0.2` everywhere, because that wipes out 75 % of the loss
budget. The remaining 25 % of one-hot timesteps need the LSTM to flip
abruptly from `0.2` everywhere to a confident one-hot at exactly the
75 % mark — a discontinuous behavior that an LSTM hidden state cannot
represent smoothly. Result: the model converges to the trap (uniform
0.2 outputs) and never escapes.

This bug was **invisible on the 4-class vibration sample** because:
- The fault signatures there are dramatic (impulses, harmonics) and
  even a poorly-trained model finds them.
- 4 classes is easier than 5.
- The synthetic generator in the vibration sample produces nearly
  separable data so even a weak optimizer succeeds.

The current sample, with subtle steady-state envelope modulation and 5
similar classes, has no such margin.

**Lesson.** Tricks that put a trivial minimum into the loss landscape
will be found and exploited by gradient descent. If you set part of the
loss to "match a uniform target", you are *teaching* the model to
output a uniform distribution. For sequence classification with a
many-to-many output API, the cleanest approach is:

> Apply the same one-hot target at every timestep. Early-timestep loss
> will be high but the gradient direction is unambiguous; the LSTM
> learns to converge to the correct answer over time and the late
> timesteps dominate the gradient anyway.

If the trainer API supports masking, an even better approach is to
apply loss **only at the final timestep** (true many-to-one), but this
SDK currently requires per-timestep targets.

**Fix.** `motor_current.js` training loop now builds a `targets` array
where every element is the same one-hot vector. The neutral-target
branch was removed.

### Bug E — Vanishing gradient through a 256-step LSTM

**Symptom.** After fixes A-D, attempt 2 trained a 256-step LSTM with
`hidden_size = 16` on raw currents decimated to 253 Hz. The loss
started at 0.407 (the random-output floor) and barely moved:

```
Epoch  1/25 - Avg Loss: 0.407358
Epoch  5/25 - Avg Loss: 0.402581
Epoch 10/25 - Avg Loss: 0.401596
Epoch 25/25 - Avg Loss: 0.401013   <-- basically still random
Accuracy: 16.0 % (all predictions collapsed to class 0 "Healthy")
```

**Diagnosis.** Classical vanishing-gradient failure. A 256-step LSTM
with 16 hidden units has to backpropagate the class-discriminative
signal from the LAST timestep (where the prediction matters) back
through 256 cells to the input weights. Each cell multiplies the
upstream gradient by its forget-gate Jacobian; across 256 steps the
product collapses to numerical zero before it reaches the early layers.
The symptom is a model that learns essentially the output-layer bias
and nothing else — which on a balanced 5-class dataset with 1/N
sigmoid outputs saturates at loss ≈ 0.4 and predicts whichever class
the bias happens to favor.

**Why this hit us specifically.** Two reasons compounded:

1. The broken-bar signature is subtle (single broken bar modulates the
   current envelope by only a few percent) so the loss landscape has
   shallow gradients to begin with.
2. Fix D (one-hot at every timestep) removed the old "neutral target"
   trap but put a floor under the loss: early timesteps *cannot* have
   zero loss because the LSTM has no context to predict the class. Most
   of the gradient signal is therefore concentrated in the late
   timesteps, exactly where the 256-step BPTT decay is worst.

You could in principle fix this with: bigger hidden state, truncated
BPTT, LSTM with a strong cell-state identity skip, attention pooling,
or a many-to-one loss applied only at the last timestep. None of those
are trivial in the current SDK.

**Fix.** Stop fighting the architecture. Preprocess the input so the
discriminative signal is explicit and the LSTM only has to model the
short-time behavior of that explicit signal. See Bug F.

**Lesson.** Sequence length is a dial with TWO counteracting effects:

- Longer windows = more chance to see low-frequency signatures (good)
- Longer windows = worse BPTT gradient flow (bad)

When the two pull in opposite directions, don't split the difference —
**change the input representation** so the low-frequency signature is
already extracted and a short window suffices. For MCSA that means
feeding the envelope, not the raw current.

### Bug F — Envelope decimation math error

**Symptom.** After switching to envelope preprocessing (moving RMS over
one half-cycle of the 60 Hz fundamental), the first few diagnostic
dumps showed some BRB1 and BRB3 windows as `0.00, 0.00, 0.00, ...`
for all 64 timesteps — i.e. the motor wasn't running in those windows.

**Diagnosis.** The intention was to decimate the envelope to ~60 Hz
(one envelope sample per fundamental period). The arithmetic:
`55611 raw Hz / 60 target Hz ≈ 927`. The code had `UFU_ENV_DECIMATE
= 20`, which produces an envelope rate of `55611 / 20 ≈ 2780 Hz` —
**46× faster than intended**. The downstream `UFU_TRANSIENT_SKIP =
300` samples therefore only skipped 300/2780 ≈ 0.11 s of the startup
transient instead of the intended 5 s. Most traces still had their
early "motor off" and inrush regions inside the windowing zone.

**Fix.** `UFU_ENV_DECIMATE = 927` (true 60 Hz envelope rate),
`UFU_TRANSIENT_SKIP = 360` (6 s, safely past the longest UFU
startup). After the fix:

- Global envelope range: **[0.007, 1.885] A RMS** (sensible; the
  motor is rated 3.02 A full-load)
- Sample values in normalized [0, 1] space: mostly in **[0.54, 0.86]**
  (using 30 % of dynamic range, visible modulation)
- All-zero windows: **none**
- Per-class envelope std-dev: Healthy 0.026 → BRB2 0.029 → BRB3 0.029
  → BRB4 0.031 (monotonic for BRB2..BRB4; BRB1 remains confusable
  with Healthy at light loads, which is a dataset reality)

**Lesson.** For any decimation / sample-rate conversion step, WRITE
THE TARGET RATE AS A NAMED CONSTANT and compute the decimation factor
from it in a comment:

```python
TARGET_ENV_RATE_HZ = 60
RAW_RATE_HZ = 55611
UFU_ENV_DECIMATE = RAW_RATE_HZ // TARGET_ENV_RATE_HZ   # = 926
```

Hard-coding a decimation factor with no visible target rate is a
latent bug waiting to happen. Verify with a sanity print:

```python
print(f"Envelope rate: {RAW_RATE_HZ / UFU_ENV_DECIMATE:.1f} Hz")
```

Also: any time a preprocessing pipeline involves multiple time-domain
quantities (raw rate, decimated rate, window length in samples,
transient skip in samples), always print them in **physical units
(Hz, seconds)** alongside their sample counts. The whole class of
"off by 46×" bugs is catchable this way.

### Bug G — Load baseline confound taking 75 % of input dynamic range

**Symptom.** After bugs A-F were fixed, attempt 3 used the correct RMS
envelope at 60 Hz with global min/max normalization. Loss now actually
fell (0.411 → 0.385) and accuracy reached 35 % — but training was
extremely slow and the confusion matrix showed heavy off-diagonal
predictions in every class.

**Diagnosis.** The UFU dataset tests every rotor state at 8 load
levels (12.5 % to 100 % of rated torque). The RMS envelope amplitude
is proportional to load (light load ~0.5 A, full load ~1.5 A). With
global min/max normalization, the load variation dominated the signal:

```
Inter-sample std (load variation): 0.110
Intra-window std (modulation):     0.027
Ratio: the modulation is only 24.6 % of the load variation
```

In other words, the LSTM input dynamic range was 75 % load noise and
25 % actual signal. The model had to learn to IGNORE the dominant
variation, which is exactly what a linear + sigmoid output struggles
with — it picks up the easy large-variance component first and the
modulation ends up in the tail of the gradient.

Values in the normalized signal were concentrated in [0.548, 0.904],
using only 35 % of the available [0, 1] range. The within-window
variation (the actual modulation the LSTM needs to detect) was 0.027
per timestep — the model was squinting at a nearly-flat signal.

**Fix.** Per-window centering with a global amplification gain.

For each 64-step window:
1. Compute the per-channel window mean
2. Subtract it (removes the load baseline entirely)
3. Multiply by UFU_MOD_GAIN (= 6.0) to amplify the modulation
4. Add 0.5 and clamp to [0, 1]

This is safe because all 5 rotor states are sampled at all 8 load
levels. The mean is therefore a pure confound: it carries no
class-discriminative information. What remains after centering IS the
class signal: the broken-bar modulation.

After the fix:

| Metric | Before (global min/max) | After (centered + amplified) |
|---|---|---|
| Value range used | [0.548, 0.904] | [0.013, 0.971] |
| Mean | 0.704 (off-center) | 0.501 (centered) |
| Overall std | 0.113 | 0.285 |
| Within-window std | 0.027 | 0.28 (10× larger) |

The LSTM now sees waveforms that fill the entire dynamic range. The
cross-class std difference is 0.27 → 0.30, which is the same relative
spread as before but 10× larger in absolute terms — well within what
a 16-unit LSTM can discriminate.

**Lesson.** When a dataset crosses a nuisance variable (load, speed,
temperature) with the target variable (rotor state), check whether
global normalization passes most of the dynamic range to the nuisance
or to the target. If the nuisance dominates, remove it explicitly in
preprocessing (centering, detrending, normalization relative to a
per-sample baseline). "The RNN will learn to ignore it" is optimistic
— it almost never does in practice because the nuisance gradient is
larger and the optimizer follows it.

## 3. Verification

The table below tracks the state of the preprocessing pipeline across
the three attempts so the progression is explicit:

| Metric | Attempt 1 | Attempt 2 | Attempt 3 (working) |
|---|---|---|---|
| Input representation | raw current | raw current | **moving-RMS envelope** |
| Effective input rate | ~1 kHz | ~253 Hz | **~60 Hz envelope** |
| Window length | 64 ms (64 steps) | 1.01 s (256 steps) | **1.07 s (64 steps)** |
| Normalization | per-trace | global + transient skip | **global + transient skip + threshold filter + fixed max cap** |
| Training targets | neutral 75 % + one-hot 25 % | one-hot everywhere | one-hot everywhere |
| Global per-channel range | n/a | ±2.8 A peak | **[0, 1.9] A RMS** |
| Class envelope std-dev | ~uniform (~0) | Healthy 0.022 → BRB4 0.025 | **Healthy 0.026 → BRB4 0.031** |
| Loss at epoch 25 | 0.14 (rising) | 0.40 (barely moving) | — |
| Accuracy | 26.8 % | 16.0 % | — |
| Dominant failure | signature erased | vanishing gradient | — |

The envelope-std-dev row is the critical sanity check: it confirms
that a simple summary statistic of the *processed* data can already
distinguish the classes to some degree, which is a prerequisite for
the RNN to learn anything. If this number is uniform across classes,
no amount of training can help — the features do not carry the signal.

Final dataset characteristics (Attempt 3):
- 5 classes × 400 windows = 2000 samples, balanced
- 64 timesteps × 3 channels (Ia, Ib, Ic envelopes)
- Values in [0, 1] with steady-state signals typically in [0.54, 0.86]
- 80 / 20 train / test split
- ~10 MB `train.json`, ~2.5 MB `test.json`

## 4. General principles for future fault-detection samples

These apply any time you scaffold a sample around a new sensor modality
or a new dataset:

1. **Inspect the raw data before trusting any preprocessing.**
   Print the first 16 and last 16 samples of one trace per class. Plot
   one full trace if possible. Check for:
   - DC offset / baseline drift
   - Startup or shutdown transients
   - Sensor saturation / clipping
   - Class-specific recording artifacts (different amplifier gain
     between classes will leak through any naive normalization)

2. **Compute discriminative metrics on the *processed* data before
   training.** If a trivial summary statistic (mean amplitude, peak,
   envelope std-dev, dominant frequency) does not separate classes,
   the RNN almost certainly will not either. Either fix the
   preprocessing or pick a better feature.

3. **Window length must exceed `1 / slowest_discriminative_frequency`.**
   Write the formula down. For periodic-signal classification this is
   non-negotiable.

4. **Normalization scope matters.** Per-window, per-trace, per-class,
   and global all give different results. For any feature where the
   absolute magnitude carries information, use **global** stats.

5. **Watch out for loss landscape traps.** Anything in your training
   objective that has a trivial minimum (uniform output, zero output,
   identity output) will be found by the optimizer. Audit per-timestep
   targets, regularizers, and auxiliary losses.

6. **Re-use, but verify the assumptions.** Cloning a working sample is
   an excellent starting point, but every dataset has its own idioms
   (transients, sample rates, fault frequency regimes). What works for
   vibration at 1 kHz with 4 dramatic synthetic classes will not
   automatically work for 3-phase currents at 50 kHz with 5 subtle
   steady-state classes.

7. **Preprocessing is cheaper than architecture.** When long sequences
   are needed to see a signal, the first instinct is "make the LSTM
   bigger / smarter". The second instinct should be "extract the
   signal into a shorter sequence". For periodic signals, envelope
   extraction (moving RMS, rectify + low-pass, Hilbert, wavelet) is
   usually the right move: it collapses the high-frequency carrier
   into a smooth low-frequency feature that a tiny RNN can learn in
   a few epochs. The MCSA case is textbook — the broken-bar signal
   is the envelope, not the raw current.

8. **Decimation and sample-rate conversion need named target rates.**
   Never hard-code a decimation factor. Write the target rate in Hz
   as a named constant and compute the factor from it, then sanity-
   print the actual effective rate after applying it. A 46× error
   in the decimation factor is the kind of bug that sits undetected
   for hours because "it runs fine, the shapes are right" — until
   you notice the transient skip is only 100 ms instead of 5 s.

9. **Always print pipeline quantities in physical units.** Sample
   counts lie. A `WINDOW_SIZE = 64` can be 64 ms or 1 s depending on
   the upstream rate. A `TRANSIENT_SKIP = 300` can be 0.1 s or 5 s.
   The rule: every sample-count constant MUST have a comment or
   printed string declaring its duration in seconds (or whatever
   physical unit is meaningful) computed from the current effective
   rate. This makes bugs like F visible on the first run.

10. **Remove nuisance variables in preprocessing, don't expect the
    RNN to ignore them.** When a dataset crosses a nuisance variable
    (load, speed, temperature) with the target variable (rotor state),
    check whether normalized inputs are dominated by the nuisance or
    the target. If the nuisance takes > 50 % of the dynamic range,
    remove it explicitly (centering, detrending, per-sample baseline
    subtraction). A small LSTM will always pick up the largest
    variance component first, and if that component is noise from the
    classification standpoint, training converges slowly or not at all.

## 5. References

- UFU Broken Rotor Bar dataset:
  https://ieee-dataport.org/open-access/experimental-database-detecting-and-diagnosing-rotor-broken-bar-three-phase-induction
- Motor Current Signature Analysis (MCSA) review:
  any standard rotating-machine diagnostics textbook discusses the
  `f_line ± 2·s·f_line` sideband relationship.
- Existing vibration sample (intentionally kept as-is):
  `packages/host/www/samples/motor/`
- Prep script with all fixes applied:
  `packages/dev/tools/python/prepare_motor_current.py`
- Browser sample with fixed training loop:
  `packages/host/www/samples/motor_current/motor_current.js`
- Dataset list and README pointer:
  `packages/dev/tools/python/README.md`
