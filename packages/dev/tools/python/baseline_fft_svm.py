"""
FFT + SVM/MLP baseline for broken rotor bar classification.

Classical MCSA approach: extract sideband amplitudes from the FFT of
steady-state stator current, then classify with a traditional ML model.
This script serves as the baseline comparison for the envelope-domain
LSTM paper.

Uses the same UFU .mat files and the same train/test split logic as
prepare_motor_current.py so results are directly comparable.

Usage:
    python baseline_fft_svm.py \
        --data-dir ../../host/www/data/motor_current

Output: accuracy, confusion matrix, and per-class metrics printed to
stdout. No files written.
"""

import os
import argparse
import numpy as np
from collections import defaultdict

# ---------------------------------------------------------------------------
# Constants (same as prepare_motor_current.py)
# ---------------------------------------------------------------------------
RAW_RATE_HZ = 50000.0
LINE_FREQ_HZ = 60.0
TRANSIENT_SKIP_S = 6.0          # seconds to skip at start of each trace
WINDOW_DURATION_S = 1.0         # seconds per FFT window
STRIDE_DURATION_S = 0.5         # overlap
TRAIN_RATIO = 0.8
MAX_SAMPLES_PER_CLASS = 400

CLASS_NAMES = ["Healthy", "BRB1", "BRB2", "BRB3", "BRB4"]
ROTOR_TO_LABEL = {"rs": 0, "r1b": 1, "r2b": 2, "r3b": 3, "r4b": 4}


# ---------------------------------------------------------------------------
# Data loading (reuses the same HDF5 pattern)
# ---------------------------------------------------------------------------

def load_raw_traces(data_dir):
    """Load raw phase-A current traces from all UFU .mat files.
    Returns list of (label, raw_ia_array).
    """
    import h5py
    import glob

    mat_files = sorted(glob.glob(os.path.join(data_dir, "**", "struct_*_R1.mat"),
                                 recursive=True))
    if not mat_files:
        print(f"No struct_*_R1.mat files found in {data_dir}")
        return []

    traces = []
    for filepath in mat_files:
        name = os.path.basename(filepath).lower().replace(".mat", "")
        rotor_key = None
        for part in name.split("_"):
            if part in ROTOR_TO_LABEL:
                rotor_key = part
                break
        if rotor_key is None:
            continue

        label = ROTOR_TO_LABEL[rotor_key]
        print(f"  Loading {os.path.basename(filepath)} -> {CLASS_NAMES[label]}")

        with h5py.File(filepath, "r") as f:
            if rotor_key not in f:
                continue
            rotor_group = f[rotor_key]
            for load in sorted(rotor_group.keys()):
                lg = rotor_group[load]
                if "Ia" not in lg:
                    continue
                refs = lg["Ia"][:]
                for rep in range(refs.shape[0]):
                    ia = f[refs[rep, 0]][:].flatten()
                    traces.append((label, ia, load))

    print(f"Loaded {len(traces)} raw traces")
    return traces


# ---------------------------------------------------------------------------
# FFT feature extraction
# ---------------------------------------------------------------------------

def extract_fft_features(ia_raw, load_name):
    """Extract MCSA features from one raw phase-A trace.

    For each steady-state window:
    - Compute FFT
    - Extract amplitude at fundamental (60 Hz)
    - Extract sideband amplitudes at f(1-2s) and f(1+2s) for s in
      a range of plausible slip values
    - Compute sideband-to-fundamental ratio (the classical MCSA metric)
    - Add spectral statistics (total harmonic distortion, RMS, etc.)

    Returns list of (feature_vector, label_not_included).
    """
    skip_samples = int(TRANSIENT_SKIP_S * RAW_RATE_HZ)
    window_samples = int(WINDOW_DURATION_S * RAW_RATE_HZ)
    stride_samples = int(STRIDE_DURATION_S * RAW_RATE_HZ)

    if len(ia_raw) <= skip_samples + window_samples:
        return []

    ia = ia_raw[skip_samples:]
    features = []

    for start in range(0, len(ia) - window_samples + 1, stride_samples):
        segment = ia[start:start + window_samples]

        # FFT
        N = len(segment)
        freqs = np.fft.rfftfreq(N, d=1.0 / RAW_RATE_HZ)
        spectrum = np.abs(np.fft.rfft(segment)) / N
        freq_res = RAW_RATE_HZ / N  # Hz per bin

        # Fundamental amplitude (peak near 60 Hz)
        f0_idx = np.argmin(np.abs(freqs - LINE_FREQ_HZ))
        # Search +/- 2 Hz around 60 Hz for the actual peak
        search_bins = int(2.0 / freq_res) + 1
        f0_region = slice(max(0, f0_idx - search_bins),
                          min(len(spectrum), f0_idx + search_bins + 1))
        f0_amp = np.max(spectrum[f0_region])
        f0_actual_idx = f0_region.start + np.argmax(spectrum[f0_region])
        f0_actual = freqs[f0_actual_idx]

        if f0_amp < 1e-6:
            continue  # no signal

        # Sideband amplitudes at f(1 +/- 2s) for multiple slip values
        # Slip ranges from ~1% (light load) to ~5% (full load)
        sideband_features = []
        for s in [0.01, 0.02, 0.03, 0.04, 0.05]:
            f_lower = f0_actual * (1.0 - 2.0 * s)
            f_upper = f0_actual * (1.0 + 2.0 * s)

            # Peak amplitude in a +/- 1 Hz window around each sideband
            for f_sb in [f_lower, f_upper]:
                sb_idx = np.argmin(np.abs(freqs - f_sb))
                sb_search = int(1.0 / freq_res) + 1
                sb_region = slice(max(0, sb_idx - sb_search),
                                  min(len(spectrum), sb_idx + sb_search + 1))
                sb_amp = np.max(spectrum[sb_region])
                # dB relative to fundamental
                sb_db = 20 * np.log10(sb_amp / f0_amp + 1e-12)
                sideband_features.append(sb_db)

        # Harmonics (2nd, 3rd, 5th, 7th relative to fundamental)
        harmonic_features = []
        for h in [2, 3, 5, 7]:
            h_freq = f0_actual * h
            h_idx = np.argmin(np.abs(freqs - h_freq))
            h_search = int(1.0 / freq_res) + 1
            h_region = slice(max(0, h_idx - h_search),
                             min(len(spectrum), h_idx + h_search + 1))
            h_amp = np.max(spectrum[h_region])
            h_db = 20 * np.log10(h_amp / f0_amp + 1e-12)
            harmonic_features.append(h_db)

        # Statistical features
        rms = np.sqrt(np.mean(segment ** 2))
        crest = np.max(np.abs(segment)) / (rms + 1e-12)

        # Total harmonic distortion (sum of harmonics 2-10 vs fundamental)
        thd_sum = 0.0
        for h in range(2, 11):
            h_freq = f0_actual * h
            h_idx = np.argmin(np.abs(freqs - h_freq))
            if h_idx < len(spectrum):
                thd_sum += spectrum[h_idx] ** 2
        thd = np.sqrt(thd_sum) / (f0_amp + 1e-12)

        # Assemble feature vector:
        # 10 sideband dB values + 4 harmonic dB values + RMS + crest + THD + f0_amp
        fv = np.array(sideband_features + harmonic_features +
                      [rms, crest, thd, f0_amp])
        features.append(fv)

    return features


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", required=True,
                        help="Directory containing struct_*_R1.mat files")
    args = parser.parse_args()

    from sklearn.svm import SVC
    from sklearn.neural_network import MLPClassifier
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import (accuracy_score, confusion_matrix,
                                 classification_report)
    import random

    # Load traces
    traces = load_raw_traces(args.data_dir)
    if not traces:
        return

    # Extract FFT features
    print("\nExtracting FFT features...")
    all_samples = []  # (feature_vector, label)
    class_counts = defaultdict(int)

    random.shuffle(traces)
    for label, ia_raw, load in traces:
        if class_counts[label] >= MAX_SAMPLES_PER_CLASS:
            continue
        fvs = extract_fft_features(ia_raw, load)
        for fv in fvs:
            if class_counts[label] >= MAX_SAMPLES_PER_CLASS:
                break
            all_samples.append((fv, label))
            class_counts[label] += 1

    print(f"Extracted {len(all_samples)} samples")
    print(f"Class distribution: {dict(class_counts)}")
    print(f"Feature vector size: {all_samples[0][0].shape[0]}")

    # Split train/test (same ratio as the LSTM pipeline)
    random.shuffle(all_samples)
    split = int(len(all_samples) * TRAIN_RATIO)
    train = all_samples[:split]
    test = all_samples[split:]

    X_train = np.array([s[0] for s in train])
    y_train = np.array([s[1] for s in train])
    X_test = np.array([s[0] for s in test])
    y_test = np.array([s[1] for s in test])

    print(f"\nTrain: {len(X_train)}, Test: {len(X_test)}")

    # Normalize features
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    X_test = scaler.transform(X_test)

    # ------------------------------------------------------------------
    # Model 1: SVM (RBF kernel)
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("SVM (RBF kernel, C=10)")
    print("=" * 60)

    svm = SVC(kernel="rbf", C=10, gamma="scale", random_state=42)
    svm.fit(X_train, y_train)
    y_pred_svm = svm.predict(X_test)

    acc_svm = accuracy_score(y_test, y_pred_svm)
    print(f"Accuracy: {acc_svm * 100:.1f}%")
    print(f"\nConfusion matrix:")
    cm_svm = confusion_matrix(y_test, y_pred_svm)
    header = "              " + "  ".join(f"{c:>8s}" for c in CLASS_NAMES)
    print(header)
    for i, row in enumerate(cm_svm):
        print(f"{CLASS_NAMES[i]:>14s}" + "  ".join(f"{v:>8d}" for v in row))
    print(f"\n{classification_report(y_test, y_pred_svm, target_names=CLASS_NAMES)}")

    # Binary accuracy
    y_test_bin = (y_test > 0).astype(int)
    y_pred_bin_svm = (y_pred_svm > 0).astype(int)
    acc_bin_svm = accuracy_score(y_test_bin, y_pred_bin_svm)
    print(f"Binary (Healthy/Faulty) accuracy: {acc_bin_svm * 100:.1f}%")

    # ------------------------------------------------------------------
    # Model 2: MLP (small, comparable parameter count)
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("MLP (32 hidden, ~800 params)")
    print("=" * 60)

    # 18 features -> 32 hidden -> 5 output = 18*32+32 + 32*5+5 = 613+165 = 778 params
    mlp = MLPClassifier(hidden_layer_sizes=(32,), max_iter=500,
                        random_state=42, early_stopping=True,
                        validation_fraction=0.15, learning_rate="adaptive")
    mlp.fit(X_train, y_train)
    y_pred_mlp = mlp.predict(X_test)

    acc_mlp = accuracy_score(y_test, y_pred_mlp)
    print(f"Accuracy: {acc_mlp * 100:.1f}%")
    print(f"\nConfusion matrix:")
    cm_mlp = confusion_matrix(y_test, y_pred_mlp)
    print(header)
    for i, row in enumerate(cm_mlp):
        print(f"{CLASS_NAMES[i]:>14s}" + "  ".join(f"{v:>8d}" for v in row))
    print(f"\n{classification_report(y_test, y_pred_mlp, target_names=CLASS_NAMES)}")

    y_pred_bin_mlp = (y_pred_mlp > 0).astype(int)
    acc_bin_mlp = accuracy_score(y_test_bin, y_pred_bin_mlp)
    print(f"Binary (Healthy/Faulty) accuracy: {acc_bin_mlp * 100:.1f}%")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    print("\n" + "=" * 60)
    print("SUMMARY (for paper Table I / Table III)")
    print("=" * 60)
    n_feat = X_train.shape[1]
    svm_params = "kernel (non-parametric)"
    mlp_params = sum(w.size for w in mlp.coefs_) + sum(b.size for b in mlp.intercepts_)
    print(f"Feature vector:    {n_feat} dimensions")
    print(f"SVM (RBF):         {acc_svm*100:.1f}% (5-class), {acc_bin_svm*100:.1f}% (binary)")
    print(f"MLP (32 hidden):   {acc_mlp*100:.1f}% (5-class), {acc_bin_mlp*100:.1f}% (binary), {mlp_params} params")
    print(f"LSTM (this work):  88.0% (5-class), 97.3% (binary), 4773 params")


if __name__ == "__main__":
    main()
