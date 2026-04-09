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

# Raw electrical sample rate in the UFU dataset is ~55.6 kHz. Decimate by
# this factor to bring the effective rate down to ~1 kHz so a 64-sample
# window covers ~64 ms (~4 line cycles at 60 Hz) — same temporal footprint
# as prepare_motor.py operating on ~1 kHz vibration data.
UFU_DECIMATION = 56

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


def read_ufu_mat_file(filepath, class_counts, samples_out, max_per_class):
    """Stream one UFU .mat file into windowed [Ia, Ib, Ic] samples.

    For each (load level x repetition), dereference the three current
    channels, decimate to ~1 kHz, build sliding windows, normalize, and
    append to samples_out until the per-class cap is reached.
    """
    try:
        import h5py
    except ImportError:
        print("  ERROR: h5py is required to read UFU .mat files. "
              "Install with: pip install h5py")
        raise

    rotor_key = _ufu_rotor_key(filepath)
    if rotor_key is None:
        print(f"  Could not infer rotor class from {os.path.basename(filepath)}, skipping")
        return
    label = UFU_ROTOR_TO_LABEL[rotor_key]

    print(f"  Reading {os.path.basename(filepath)} -> {UFU_CLASS_NAMES[label]}")

    with h5py.File(filepath, "r") as f:
        if rotor_key not in f:
            print(f"    Expected top group '{rotor_key}' not found")
            return
        rotor_group = f[rotor_key]
        load_levels = sorted(rotor_group.keys())  # torque05..torque40

        for load in load_levels:
            if class_counts[label] >= max_per_class:
                break
            lg = rotor_group[load]
            if not all(k in lg for k in ("Ia", "Ib", "Ic")):
                continue

            ref_a = lg["Ia"][:]
            ref_b = lg["Ib"][:]
            ref_c = lg["Ic"][:]
            num_reps = ref_a.shape[0]

            for rep in range(num_reps):
                if class_counts[label] >= max_per_class:
                    break

                ia = f[ref_a[rep, 0]][:].flatten()
                ib = f[ref_b[rep, 0]][:].flatten()
                ic = f[ref_c[rep, 0]][:].flatten()

                # Align to shortest (occasionally differs by a few samples)
                n = min(len(ia), len(ib), len(ic))
                ia = ia[:n:UFU_DECIMATION]
                ib = ib[:n:UFU_DECIMATION]
                ic = ic[:n:UFU_DECIMATION]

                trace = list(zip(ia.tolist(), ib.tolist(), ic.tolist()))
                if len(trace) < WINDOW_SIZE:
                    continue

                windows = create_sliding_windows(trace, WINDOW_SIZE, STRIDE)
                windows = normalize_windows(windows)

                for w in windows:
                    if class_counts[label] >= max_per_class:
                        break
                    rounded = [[round(v, 4) for v in step] for step in w]
                    samples_out.append({"sequence": rounded, "label": label})
                    class_counts[label] += 1


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

def process_source_dir(source_dir):
    # Prefer UFU .mat files if present (dataset #2, recommended).
    mat_files = find_ufu_mat_files(source_dir)
    if mat_files:
        print(f"Found {len(mat_files)} UFU .mat file(s) under {source_dir}")
        class_counts = {i: 0 for i in range(len(UFU_CLASS_NAMES))}
        samples = []
        for filepath in mat_files:
            read_ufu_mat_file(filepath, class_counts, samples, MAX_SAMPLES_PER_CLASS)
        print(f"\nClass distribution: {class_counts}")
        return samples, UFU_CLASS_NAMES

    # Fallback: generic CSV scan (other corpora from the list).
    csv_files = find_csv_files(source_dir)
    print(f"Found {len(csv_files)} CSV files under {source_dir}")
    if not csv_files:
        return [], CLASS_NAMES

    class_counts = {i: 0 for i in range(len(CLASS_NAMES))}
    samples = []

    for filepath in csv_files:
        label = classify_file(os.path.basename(filepath))
        if class_counts[label] >= MAX_SAMPLES_PER_CLASS:
            continue

        print(f"  Processing: {os.path.basename(filepath)} -> {CLASS_NAMES[label]}")
        data = read_current_data(filepath)
        if len(data) < WINDOW_SIZE:
            print(f"    Too short ({len(data)} samples), skipping")
            continue

        windows = create_sliding_windows(data, WINDOW_SIZE, STRIDE)
        windows = normalize_windows(windows)
        for w in windows:
            if class_counts[label] >= MAX_SAMPLES_PER_CLASS:
                break
            rounded = [[round(v, 4) for v in step] for step in w]
            samples.append({"sequence": rounded, "label": label})
            class_counts[label] += 1

    print(f"\nClass distribution: {class_counts}")
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
