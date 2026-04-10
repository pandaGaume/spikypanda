"""
SpikyPanda - Prepare Motor Current (Electrical Fault) Dataset

Companion to prepare_motor.py: instead of triaxial accelerometer vibration,
this script builds a dataset of 3-phase stator currents (Ia, Ib, Ic) for
Motor Current Signature Analysis (MCSA) style fault classification.

Output format matches prepare_motor.py (windowed sequences, 3 channels,
normalized to [0, 1], JSON) so the Motor sample can consume it with minimal
changes.

--------------------------------------------------------------------------
Public electrical-signal datasets for motor fault detection
--------------------------------------------------------------------------

The following datasets expose stator current / voltage signals usable for
motor electrical fault diagnosis. They are analogous to vibration corpora
like CWRU / Paderborn / SOON-pEMP, but the fault signatures live in the
electrical domain (harmonics, sideband frequencies, phase asymmetry).

1. Synchronous Motor Electrical Faults (ScienceDirect / Mendeley Data)
   - 5 fault types: open phase, stator short circuits, rotor excitation
   - Signals: 3x phase voltage + 3x phase current + speed
   - Comes with CNN and LSTM reference classifiers
   - https://www.sciencedirect.com/science/article/pii/S2666546823000460

2. Rotor Broken Bar - 3-phase induction motor (IEEE DataPort, UFU)
   - 3x voltage + 3x current + 5x vibration (DE/NDE, axial/radial,
     horizontal/vertical), all sampled simultaneously for 18 s per run
   - Motor: 1 hp, 220/380 V, 4 poles, 60 Hz, 1715 rpm, 34-bar squirrel cage
   - 8 load levels (12.5..100 % full load) x 5 rotor states
     (healthy + 1..4 adjacent broken bars) x 10 repetitions
   - Current probes: Yokogawa 96033, 50 Arms, 10 mV/A
   - Best pick for cross-modal experiments with prepare_motor.py
   - https://ieee-dataport.org/open-access/experimental-database-detecting-and-diagnosing-rotor-broken-bar-three-phase-induction

3. Three-Phase Induction Motor Multi-Sensor (Nature Sci. Data, 2025)
   - Vibration + voltage + current sampled @ 50 kHz
   - 10 operational states, 0.2 kW squirrel cage motor
   - https://www.nature.com/articles/s41597-025-05437-3

4. Inverter-driven PMSM Fault Dataset (ScienceDirect, 2025)
   - Current + voltage + temperature, inverter-side faults included
   - Relevant for drive-side rather than mechanical faults
   - https://www.sciencedirect.com/science/article/pii/S2352340925000186

5. Induction Motor Fault Dataset - IMFDS (Kaggle)
   - Smaller / simpler, good for quick prototyping
   - Requires Kaggle API credentials
   - https://www.kaggle.com/datasets/sabermalek/imfds

--------------------------------------------------------------------------
Usage
--------------------------------------------------------------------------

    # Synthetic only (no download, runs offline):
    python prepare_motor_current.py

    # Point at an extracted UFU Broken Rotor Bar dataset (.mat files):
    python prepare_motor_current.py --source-dir packages/host/www/data/motor_current

    # Point at a CSV-based dataset (other corpora from the list above):
    python prepare_motor_current.py --source-dir /path/to/csv/dataset

The script first looks for `struct_*_R1.mat` files (UFU format) and falls
back to scanning for CSV files with 3 current columns. If nothing is found
(or --source-dir is omitted), it generates synthetic 3-phase current data
covering four electrical fault types.

--------------------------------------------------------------------------
UFU Broken Rotor Bar file layout (dataset #2)
--------------------------------------------------------------------------

Files: struct_{rs,r1b,r2b,r3b,r4b}_R1.mat    # healthy + 1..4 broken bars
HDF5 structure (MATLAB v7.3):

    <rotor_key>/                              # e.g. 'rs' or 'r2b'
        torque05..torque40/                   # 8 load levels (12.5..100%)
            Ia, Ib, Ic                        # shape (10,1), HDF5 refs
            Va, Vb, Vc                        # shape (10,1), HDF5 refs
            Trigger                           # shape (10,1), HDF5 refs
            Vib_acpe, Vib_acpi, Vib_axial,    # vibration channels
            Vib_base, Vib_carc

Each referenced array is shape (1, N):
  - currents/voltages: N ~= 1,001,000  (~55.6 kHz x 18 s)
  - vibration:         N ~=   153,504  (~ 8.5 kHz x 18 s)

5 rotors x 8 loads x 10 repetitions = 400 raw current traces per run set.

Output:
    packages/host/www/data/motor_current/train.json
    packages/host/www/data/motor_current/test.json

--------------------------------------------------------------------------
Critical preprocessing decisions (read before changing anything!)
--------------------------------------------------------------------------

Getting this sample to train took THREE attempts and SIX bug fixes.
Every one of them is documented in detail in:

    docs/research/motor-current-mcsa-debugging.md

Short version:

A. Normalization MUST be global across the entire dataset, not per
   trace. The broken-bar fault signature lives in the absolute current
   amplitude — per-trace [0,1] rescaling erases it. See
   `compute_global_stats` and `_windows_from_traces`.

B. The first ~5 s of every UFU acquisition is a startup transient
   (zero current then inrush peaks of 6-8x rated). It MUST be skipped
   before computing global stats and before windowing, otherwise the
   global range is dominated by inrush peaks and steady-state currents
   get squashed to a tiny range around 0.5. See `UFU_TRANSIENT_SKIP`.

C. Window length MUST cover at least one period of the broken-bar
   amplitude envelope at 2*slip*f_line ~= 2..5 Hz, i.e. >= 500 ms.
   See `WINDOW_SIZE` and the comments on `UFU_ENV_DECIMATE`.

D. (Browser side, in motor_current.js) the training loop MUST use the
   same one-hot target at every timestep. The "neutral target for the
   first 75 % of timesteps" trick borrowed from the vibration sample
   creates an optimum trap at uniform 1/N outputs that the optimizer
   will collapse into.

E. Raw 60 Hz stator currents are NOT what the RNN should see. Feeding
   long sequences of 60 Hz sinusoids with subtle 2..5 Hz envelope
   modulation forces the LSTM to backprop discriminative signal
   through 256+ BPTT steps, which vanishes to zero. Instead we
   preprocess: moving RMS over one half-cycle of the fundamental
   cancels the 60 Hz carrier and leaves only the envelope, which is
   where the fault lives. A 64-step LSTM on 60 Hz-rate envelopes
   trains easily.

F. Decimation math is error-prone. Always set the TARGET RATE as a
   named constant and compute the decimation factor from it, then
   sanity-print the actual rate. A 46x error in this script caused
   the transient skip to effectively do nothing and polluted the
   first dataset with motor-off windows. See `UFU_ENV_DECIMATE`.
"""

import os
import json
import argparse
import csv
import glob as glob_mod
import random
import math

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

WINDOW_SIZE = 64
STRIDE = 32
TRAIN_RATIO = 0.8
MAX_SAMPLES_PER_CLASS = 400

# UFU pipeline: instead of feeding the RNN the raw 60 Hz line current
# (where the fundamental dominates and the broken-bar signature is buried
# in 2..5 Hz envelope modulation that the RNN cannot easily extract from
# 256 LSTM steps), we extract the envelope explicitly via moving RMS over
# one half-cycle of the line frequency. After the envelope is computed
# the 60 Hz fundamental is gone and only the slow modulation remains —
# exactly the signal MCSA cares about. This means:
#
#   - Network sees a smooth slowly-varying envelope, not a 60 Hz sinusoid
#   - 64-sample windows suffice (no need for 256+ steps)
#   - Training gradients flow easily through the shorter LSTM
#
# Raw rate ~55.6 kHz, line frequency 60 Hz -> half-cycle = 463 raw
# samples. After RMS we decimate by ENV_DECIMATE to land at a manageable
# effective rate (~60 Hz envelope rate) so a 64-step window covers ~1 s
# of motor running, capturing 2..5 envelope periods.
UFU_RAW_HALF_CYCLE = 463          # samples per half-cycle of 60 Hz at 55.6 kHz
UFU_ENV_DECIMATE = 927            # 55611 / 927 -> ~60 Hz envelope rate
                                  # (one envelope sample per 60 Hz full cycle)

# Each 18 s acquisition contains a startup transient (zero current then a
# large inrush, settling into steady state after ~4..5 s). We skip this
# many ENVELOPE samples (post-decimation) from the start of every trace
# before computing global stats and before windowing. At ~60 Hz envelope
# rate, 360 samples ~= 6 s, safely past the worst startup transients.
UFU_TRANSIENT_SKIP = 360

# Safety filter: drop any windows whose mean envelope is below this
# threshold (Amps RMS). These are "motor off" or extreme light-load
# artifacts that produce near-zero signal and confuse the normalization
# and the classifier. Healthy steady state at the lightest UFU load
# (12.5 %) is around 0.4 A RMS, so 0.15 A is a conservative floor.
UFU_MIN_ENV_THRESHOLD = 0.15

# Amplification factor for the per-window centered modulation, in
# inverse Amps. Each window's envelope is centered on its own mean
# (which removes the load baseline, a pure confound since all classes
# see all loads) and then multiplied by this factor before being shifted
# to 0.5 and clamped to [0, 1]. Typical broken-bar modulation is
# ~0.05 A RMS so a gain of 6.0 maps a +-0.08 A excursion to roughly
# +-0.5 in the output, which fills most of the LSTM input dynamic range
# without clipping. Bump higher (8..10) for cleaner signal extraction
# at low load, lower (3..4) if clipping becomes visible in the browser
# signal plot.
UFU_MOD_GAIN = 6.0

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "..", ".."))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "packages", "host", "www", "data", "motor_current")

# Default classes (synthetic + generic CSV path). Overridden to the 5-way
# healthy / 1..4 broken bars split when a UFU .mat dataset is detected.
CLASS_NAMES = ["Normal", "OpenPhase", "ShortCircuit", "Unbalanced"]

UFU_CLASS_NAMES = ["Healthy", "BRB1", "BRB2", "BRB3", "BRB4"]
UFU_ROTOR_TO_LABEL = {"rs": 0, "r1b": 1, "r2b": 2, "r3b": 3, "r4b": 4}


# --------------------------------------------------------------------------
# Fault classification from file names
# --------------------------------------------------------------------------

def classify_file(filename):
    """Map a file name to one of the four electrical fault classes.

    Keyword conventions chosen to cover the naming used across the datasets
    listed in the module docstring. Unknown files default to Normal.
    """
    name = filename.lower()
    if "open" in name and "phase" in name:
        return 1
    if "short" in name or "stator_fault" in name or "itsc" in name:
        return 2
    if "unbalance" in name or "asym" in name or "imbalance" in name:
        return 3
    return 0


# --------------------------------------------------------------------------
# CSV reader (best-effort, column auto-detection)
# --------------------------------------------------------------------------

def find_csv_files(directory):
    pattern = os.path.join(directory, "**", "*.csv")
    return glob_mod.glob(pattern, recursive=True)


def read_current_data(filepath):
    """Read a 3-phase current trace from a CSV file.

    Looks for columns named like Ia/Ib/Ic, I1/I2/I3, current_a/b/c. Falls
    back to the first three numeric columns if no headers match.
    """
    data = []
    try:
        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            header = next(reader, None)

            a_col, b_col, c_col = None, None, None
            if header:
                hl = [h.strip().lower() for h in header]
                for i, h in enumerate(hl):
                    if ("ia" == h or "i_a" == h or "current_a" in h or "i1" == h):
                        a_col = i
                    elif ("ib" == h or "i_b" == h or "current_b" in h or "i2" == h):
                        b_col = i
                    elif ("ic" == h or "i_c" == h or "current_c" in h or "i3" == h):
                        c_col = i

                if a_col is None:
                    try:
                        vals = [float(v) for v in header[:3]]
                        data.append(vals)
                    except (ValueError, IndexError):
                        pass
                    a_col, b_col, c_col = 0, 1, 2
                elif b_col is None:
                    b_col = a_col + 1
                    c_col = a_col + 2
            else:
                a_col, b_col, c_col = 0, 1, 2

            for row in reader:
                try:
                    if len(row) >= max(a_col, b_col, c_col) + 1:
                        ia = float(row[a_col])
                        ib = float(row[b_col])
                        ic = float(row[c_col])
                        data.append([ia, ib, ic])
                except (ValueError, IndexError):
                    continue
    except Exception as e:
        print(f"  Warning: Could not read {filepath}: {e}")

    return data


# --------------------------------------------------------------------------
# UFU Broken Rotor Bar (.mat v7.3) reader
# --------------------------------------------------------------------------

def find_ufu_mat_files(directory):
    """Return the UFU struct_*_R1.mat files found under directory."""
    pattern = os.path.join(directory, "**", "struct_*_R1.mat")
    return sorted(glob_mod.glob(pattern, recursive=True))


def _ufu_rotor_key(filepath):
    """Extract 'rs' / 'r1b' / 'r2b' / 'r3b' / 'r4b' from a filename."""
    name = os.path.basename(filepath).lower()
    # "struct_r2b_r1.mat" -> "r2b"
    parts = name.replace(".mat", "").split("_")
    for p in parts:
        if p in UFU_ROTOR_TO_LABEL:
            return p
    return None


def _moving_rms(signal_1d, window_samples):
    """Vectorized moving root-mean-square over a sliding window.

    Returns an array of length len(signal_1d) - window_samples + 1 where
    out[i] is the RMS of signal_1d[i:i+window_samples]. Used to extract
    the envelope of the 60 Hz stator current — averaging over one
    half-cycle cancels the fundamental and leaves only the slow envelope
    modulation that carries the broken-bar signature.
    """
    import numpy as np
    sq = signal_1d.astype(np.float64) ** 2
    cs = np.concatenate(([0.0], np.cumsum(sq)))
    sums = cs[window_samples:] - cs[:-window_samples]
    return np.sqrt(sums / window_samples)


def collect_ufu_traces(filepath):
    """Collect 3-phase ENVELOPE traces from one UFU .mat file.

    For every (load level, repetition) we:
      1. Dereference the raw Ia/Ib/Ic arrays at ~55.6 kHz
      2. Compute moving RMS over a half-cycle of the line frequency
         (UFU_RAW_HALF_CYCLE samples). This is the envelope: the 60 Hz
         fundamental cancels out, only the slow modulation remains.
      3. Decimate the envelope by UFU_ENV_DECIMATE to land at a smooth
         ~60 Hz effective rate suitable for an LSTM.
      4. Skip the startup transient (UFU_TRANSIENT_SKIP envelope samples).

    Returns a list of (label, trace) where trace is a list of
    [Ia_env, Ib_env, Ic_env] timesteps. The caller computes global
    per-channel stats across all traces and normalizes in a second pass
    (`compute_global_stats` / `normalize_with_global_stats`) so that the
    absolute envelope amplitude — which encodes load level and broken-
    bar severity — is preserved across the dataset.
    """
    try:
        import h5py
        import numpy as np  # noqa: F401  (used by _moving_rms)
    except ImportError:
        print("  ERROR: h5py and numpy are required to read UFU .mat files. "
              "Install with: pip install h5py numpy")
        raise

    rotor_key = _ufu_rotor_key(filepath)
    if rotor_key is None:
        print(f"  Could not infer rotor class from {os.path.basename(filepath)}, skipping")
        return []
    label = UFU_ROTOR_TO_LABEL[rotor_key]
    print(f"  Collecting {os.path.basename(filepath)} -> {UFU_CLASS_NAMES[label]}")

    traces = []
    with h5py.File(filepath, "r") as f:
        if rotor_key not in f:
            print(f"    Expected top group '{rotor_key}' not found")
            return []
        rotor_group = f[rotor_key]
        load_levels = sorted(rotor_group.keys())  # torque05..torque40

        for load in load_levels:
            lg = rotor_group[load]
            if not all(k in lg for k in ("Ia", "Ib", "Ic")):
                continue
            ref_a = lg["Ia"][:]
            ref_b = lg["Ib"][:]
            ref_c = lg["Ic"][:]
            num_reps = ref_a.shape[0]

            for rep in range(num_reps):
                ia_raw = f[ref_a[rep, 0]][:].flatten()
                ib_raw = f[ref_b[rep, 0]][:].flatten()
                ic_raw = f[ref_c[rep, 0]][:].flatten()
                n = min(len(ia_raw), len(ib_raw), len(ic_raw))
                if n <= UFU_RAW_HALF_CYCLE:
                    continue

                # Envelope = moving RMS over one half-cycle of 60 Hz.
                ia_env = _moving_rms(ia_raw[:n], UFU_RAW_HALF_CYCLE)
                ib_env = _moving_rms(ib_raw[:n], UFU_RAW_HALF_CYCLE)
                ic_env = _moving_rms(ic_raw[:n], UFU_RAW_HALF_CYCLE)

                # Decimate the smooth envelope to ~60 Hz so the LSTM
                # sequence length is manageable.
                ia_env = ia_env[::UFU_ENV_DECIMATE]
                ib_env = ib_env[::UFU_ENV_DECIMATE]
                ic_env = ic_env[::UFU_ENV_DECIMATE]

                # Skip startup transient.
                if len(ia_env) <= UFU_TRANSIENT_SKIP + WINDOW_SIZE:
                    continue
                ia_env = ia_env[UFU_TRANSIENT_SKIP:]
                ib_env = ib_env[UFU_TRANSIENT_SKIP:]
                ic_env = ic_env[UFU_TRANSIENT_SKIP:]

                trace = list(zip(ia_env.tolist(), ib_env.tolist(), ic_env.tolist()))
                if len(trace) >= WINDOW_SIZE:
                    traces.append((label, trace))

    return traces


def compute_global_stats(traces):
    """Return per-channel (mins, maxs) computed across every timestep of
    every trace. Used to normalize all windows on a common scale so the
    absolute amplitude information is preserved across classes / loads.

    The output is the actual per-channel min/max (no symmetrization) so
    that non-negative signals like the RMS envelope use the full [0, 1]
    range after normalization. Signed signals (raw 3-phase currents from
    the CSV path) will naturally fall around 0.5 because their min/max
    are roughly symmetric.
    """
    mins = [float("inf")] * 3
    maxs = [float("-inf")] * 3
    for _label, trace in traces:
        for step in trace:
            for ch in range(3):
                v = step[ch]
                if v < mins[ch]:
                    mins[ch] = v
                if v > maxs[ch]:
                    maxs[ch] = v
    return mins, maxs


# (normalize_with_global_stats has been replaced by _normalize_window_global
# and _normalize_window_centered in the two-pass helper below.)


# --------------------------------------------------------------------------
# Windowing + normalization
# --------------------------------------------------------------------------

def create_sliding_windows(data, window_size, stride):
    return [data[s:s + window_size]
            for s in range(0, len(data) - window_size + 1, stride)]


def normalize_windows(windows):
    if not windows:
        return windows
    mins = [float("inf")] * 3
    maxs = [float("-inf")] * 3
    for w in windows:
        for step in w:
            for ch in range(3):
                mins[ch] = min(mins[ch], step[ch])
                maxs[ch] = max(maxs[ch], step[ch])

    def n(v, lo, hi):
        if hi == lo:
            return 0.5
        return max(0.0, min(1.0, (v - lo) / (hi - lo)))

    return [[[n(step[ch], mins[ch], maxs[ch]) for ch in range(3)]
             for step in w] for w in windows]


# --------------------------------------------------------------------------
# Synthetic 3-phase current generator (offline fallback)
# --------------------------------------------------------------------------

def generate_synthetic(num_samples, window_size):
    """Generate synthetic 3-phase stator current traces with 4 classes.

    - Normal: balanced 3-phase sinusoid, 120 deg apart
    - OpenPhase: phase A amplitude collapses to ~0
    - ShortCircuit: phase A amplitude elevated + 3rd harmonic content
    - Unbalanced: asymmetric amplitudes across phases
    """
    print("Generating synthetic 3-phase current data...")
    samples = []
    base_freq = 50  # Hz (line frequency)
    dt = 1 / 1000

    for i in range(num_samples):
        fault = i % 4
        seq = []
        phase_noise = random.uniform(-0.1, 0.1)
        for t in range(window_size):
            angle = 2 * math.pi * base_freq * t * dt + phase_noise

            if fault == 0:  # Normal
                ia = math.sin(angle)
                ib = math.sin(angle - 2 * math.pi / 3)
                ic = math.sin(angle + 2 * math.pi / 3)
                n = 0.02
            elif fault == 1:  # Open phase A
                ia = 0.0
                ib = math.sin(angle - 2 * math.pi / 3) * 1.15
                ic = math.sin(angle + 2 * math.pi / 3) * 1.15
                n = 0.03
            elif fault == 2:  # Short circuit on A
                ia = 1.6 * math.sin(angle) + 0.35 * math.sin(3 * angle)
                ib = math.sin(angle - 2 * math.pi / 3) + 0.1 * math.sin(3 * angle)
                ic = math.sin(angle + 2 * math.pi / 3) + 0.1 * math.sin(3 * angle)
                n = 0.05
            else:  # Unbalanced
                ia = 1.2 * math.sin(angle)
                ib = 0.8 * math.sin(angle - 2 * math.pi / 3 + 0.15)
                ic = 1.0 * math.sin(angle + 2 * math.pi / 3 - 0.10)
                n = 0.04

            ia += random.gauss(0, n)
            ib += random.gauss(0, n)
            ic += random.gauss(0, n)

            # Normalize from roughly [-2, 2] to [0, 1]
            def norm(v):
                return max(0.0, min(1.0, (v + 2.0) / 4.0))

            seq.append([round(norm(ia), 4), round(norm(ib), 4), round(norm(ic), 4)])

        samples.append({"sequence": seq, "label": fault})

    return samples


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def _normalize_window_global(raw_w, mins, maxs):
    """Old behavior: normalize a window with a pre-computed global
    per-channel [min, max] range. Used by the generic CSV path. Preserves
    absolute amplitude across samples.
    """
    spans = [(maxs[ch] - mins[ch]) or 1.0 for ch in range(3)]
    return [
        [max(0.0, min(1.0, (step[ch] - mins[ch]) / spans[ch]))
         for ch in range(3)]
        for step in raw_w
    ]


def _normalize_window_centered(raw_w, gain):
    """New behavior for the UFU envelope path: subtract the per-channel
    WINDOW mean (removes the load-baseline confound) and amplify the
    residual modulation by `gain`, then shift to 0.5 and clamp to [0, 1].

    Why this works: the UFU dataset samples every broken-bar class at
    every load level. The absolute envelope mean is therefore dominated
    by load (a pure confound), NOT by rotor state — and on earlier runs
    it was taking up ~75 % of the input dynamic range, burying the
    modulation the LSTM actually needs to see. Per-window centering
    removes that confound entirely and the gain term then maps the
    modulation (typically ~0.05 A RMS) into roughly +-0.5 of dynamic
    range, which the LSTM can learn from in a handful of epochs.

    This is safe on this dataset precisely BECAUSE every class covers
    every load; if the dataset had a class-to-load correlation, the
    mean would be a discriminator and removing it would hurt.
    """
    out = []
    means = [sum(step[ch] for step in raw_w) / len(raw_w) for ch in range(3)]
    for step in raw_w:
        out.append([
            max(0.0, min(1.0, (step[ch] - means[ch]) * gain + 0.5))
            for ch in range(3)
        ])
    return out


def _windows_from_traces(traces, mins, maxs, max_per_class, num_classes,
                          min_env_threshold=None, per_window_gain=None):
    """Two-pass helper: pass 1 already collected raw decimated traces,
    this function emits normalized windowed samples up to the per-class
    cap.

    Normalization mode depends on `per_window_gain`:
      - None (default): global per-channel [min, max] normalization
        using `mins` / `maxs`. Preserves absolute amplitude. Used by
        the generic CSV path.
      - float (UFU path): per-window centering around each window's
        own mean, amplified by this gain. Removes the load-baseline
        confound and maps the broken-bar modulation into a large
        fraction of the dynamic range. See _normalize_window_centered
        for the rationale.

    `min_env_threshold` drops any window whose raw mean phase-A
    amplitude is below the threshold (filter for motor-off / extreme
    light-load artifacts).
    """
    class_counts = {i: 0 for i in range(num_classes)}
    samples = []
    dropped = 0

    # Shuffle so the cap doesn't bias toward early load levels.
    shuffled = list(traces)
    random.shuffle(shuffled)

    for label, trace in shuffled:
        if class_counts[label] >= max_per_class:
            continue

        # Slide raw (unnormalized) windows so we can apply the threshold
        # in physical units before normalizing.
        raw_windows = create_sliding_windows(trace, WINDOW_SIZE, STRIDE)
        for raw_w in raw_windows:
            if class_counts[label] >= max_per_class:
                break
            if min_env_threshold is not None:
                mean_a = sum(step[0] for step in raw_w) / len(raw_w)
                if mean_a < min_env_threshold:
                    dropped += 1
                    continue
            if per_window_gain is not None:
                norm_w = _normalize_window_centered(raw_w, per_window_gain)
            else:
                norm_w = _normalize_window_global(raw_w, mins, maxs)
            rounded = [[round(v, 4) for v in step] for step in norm_w]
            samples.append({"sequence": rounded, "label": label})
            class_counts[label] += 1

    print(f"\nClass distribution: {class_counts}")
    if dropped:
        print(f"Dropped {dropped} windows below env threshold")
    if per_window_gain is not None:
        print(f"Normalization: per-window centered, gain={per_window_gain}")
    else:
        print(f"Normalization: global per-channel range: "
              f"Ia=[{mins[0]:.3f},{maxs[0]:.3f}] "
              f"Ib=[{mins[1]:.3f},{maxs[1]:.3f}] "
              f"Ic=[{mins[2]:.3f},{maxs[2]:.3f}]")
    return samples


def process_source_dir(source_dir):
    # Prefer UFU .mat files if present (dataset #2, recommended).
    mat_files = find_ufu_mat_files(source_dir)
    if mat_files:
        print(f"Found {len(mat_files)} UFU .mat file(s) under {source_dir}")
        # Sanity print: show the pipeline timing in physical units so a
        # regression on the decimation constants is immediately visible.
        raw_rate_hz = 55611.0
        env_rate_hz = raw_rate_hz / UFU_ENV_DECIMATE
        print(
            f"UFU pipeline: raw {raw_rate_hz/1000:.1f} kHz -> "
            f"half-cycle RMS ({UFU_RAW_HALF_CYCLE} samples = "
            f"{UFU_RAW_HALF_CYCLE/raw_rate_hz*1000:.1f} ms) -> "
            f"decimate by {UFU_ENV_DECIMATE} -> "
            f"envelope rate {env_rate_hz:.1f} Hz"
        )
        print(
            f"              window {WINDOW_SIZE} samples = "
            f"{WINDOW_SIZE/env_rate_hz:.2f} s, "
            f"stride {STRIDE} samples = {STRIDE/env_rate_hz:.2f} s, "
            f"transient skip {UFU_TRANSIENT_SKIP} samples = "
            f"{UFU_TRANSIENT_SKIP/env_rate_hz:.1f} s"
        )

        # Pass 1: collect every decimated raw trace from every file.
        all_traces = []
        for filepath in mat_files:
            all_traces.extend(collect_ufu_traces(filepath))
        print(f"Collected {len(all_traces)} envelope traces total")

        if not all_traces:
            return [], UFU_CLASS_NAMES

        # UFU path: use per-window centering + amplification instead of
        # global min/max normalization. The raw mins/maxs are still
        # computed for the diagnostic print below but they are NOT used
        # for normalization (per_window_gain takes over).
        mins, maxs = compute_global_stats(all_traces)
        print(f"Raw envelope range (pre-normalization): "
              f"Ia=[{mins[0]:.3f},{maxs[0]:.3f}] "
              f"Ib=[{mins[1]:.3f},{maxs[1]:.3f}] "
              f"Ic=[{mins[2]:.3f},{maxs[2]:.3f}] A RMS")
        samples = _windows_from_traces(
            all_traces, mins, maxs,
            MAX_SAMPLES_PER_CLASS, len(UFU_CLASS_NAMES),
            min_env_threshold=UFU_MIN_ENV_THRESHOLD,
            per_window_gain=UFU_MOD_GAIN,
        )
        return samples, UFU_CLASS_NAMES

    # Fallback: generic CSV scan (other corpora from the list).
    csv_files = find_csv_files(source_dir)
    print(f"Found {len(csv_files)} CSV files under {source_dir}")
    if not csv_files:
        return [], CLASS_NAMES

    # Same two-pass approach for CSV: collect raw, then global-normalize.
    all_traces = []
    for filepath in csv_files:
        label = classify_file(os.path.basename(filepath))
        print(f"  Reading: {os.path.basename(filepath)} -> {CLASS_NAMES[label]}")
        data = read_current_data(filepath)
        if len(data) < WINDOW_SIZE:
            print(f"    Too short ({len(data)} samples), skipping")
            continue
        all_traces.append((label, data))

    if not all_traces:
        return [], CLASS_NAMES

    mins, maxs = compute_global_stats(all_traces)
    samples = _windows_from_traces(
        all_traces, mins, maxs,
        MAX_SAMPLES_PER_CLASS, len(CLASS_NAMES),
    )
    return samples, CLASS_NAMES


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("---")[0].strip())
    parser.add_argument("--source-dir", default=None,
                        help="Local path to an extracted electrical-fault dataset. "
                             "If omitted, synthetic data is generated.")
    parser.add_argument("--num-synthetic", type=int, default=400,
                        help="Number of synthetic samples (used when no source dir).")
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_samples = []
    class_names = CLASS_NAMES
    if args.source_dir:
        all_samples, class_names = process_source_dir(args.source_dir)
        if len(all_samples) < 40:
            print("Too few real samples extracted. Falling back to synthetic.")
            all_samples = []
            class_names = CLASS_NAMES

    if not all_samples:
        all_samples = generate_synthetic(args.num_synthetic, WINDOW_SIZE)
        print(f"Generated {len(all_samples)} synthetic samples")

    random.shuffle(all_samples)
    split_idx = int(len(all_samples) * TRAIN_RATIO)
    train_samples = all_samples[:split_idx]
    test_samples = all_samples[split_idx:]

    def counts(xs):
        c = {}
        for s in xs:
            c[s["label"]] = c.get(s["label"], 0) + 1
        return c

    print(f"\nTrain: {len(train_samples)} samples {counts(train_samples)}")
    print(f"Test:  {len(test_samples)} samples {counts(test_samples)}")

    payload = {
        "windowSize": WINDOW_SIZE,
        "channels": 3,
        "classes": class_names,
    }

    train_path = os.path.join(OUTPUT_DIR, "train.json")
    test_path = os.path.join(OUTPUT_DIR, "test.json")

    with open(train_path, "w") as f:
        json.dump({**payload, "samples": train_samples}, f)
    with open(test_path, "w") as f:
        json.dump({**payload, "samples": test_samples}, f)

    print(f"\nWritten:")
    print(f"  {train_path} ({os.path.getsize(train_path) / 1024:.0f} KB)")
    print(f"  {test_path} ({os.path.getsize(test_path) / 1024:.0f} KB)")
    print("Done!")


if __name__ == "__main__":
    main()
