"""
SpikyPanda - Prepare Motor Vibration Dataset

Downloads the pEMP vibration dataset from Zenodo, extracts triaxial
accelerometer data, creates sliding windows, and exports train/test
JSON files for the Motor Vibration RNN demo.

Dataset: SOON-pEMP (Zenodo record 6473455)
URL: https://zenodo.org/records/6473455/files/SOON-pEMP.zip

Output:
    packages/host/www/data/motor/train.json
    packages/host/www/data/motor/test.json

Usage:
    python prepare_motor.py
"""

import os
import json
import zipfile
import urllib.request
import tempfile
import glob as glob_mod
import csv
import random
import math

# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------

DATASET_URL = "https://zenodo.org/records/6473455/files/SOON-pEMP.zip"
WINDOW_SIZE = 64
STRIDE = 32
TRAIN_RATIO = 0.8
MAX_SAMPLES_PER_CLASS = 200  # Cap to keep file size manageable

# Output directory (relative to this script's location)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "..", ".."))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "packages", "host", "www", "data", "motor")

# Fault type mapping - adjust based on actual dataset structure
# The pEMP dataset contains different fault conditions in separate folders/files
# pEMP dataset file naming convention:
# - "no_mechanical_load" / "load_0.5Nm" without fault keywords = Normal
# - "mechanically_imbalanced" / "umbalanced" = Mechanical imbalance
# - "electrically_50_ohm" / "electrically_100_ohm" = Electrical fault (low)
# - "electrically_150_ohm" = Electrical fault (high)
# Files with BOTH mechanical AND electrical faults are labeled as combined (3)
FAULT_LABELS = {
    # Order matters - more specific patterns first
}

def classify_file(filename):
    """Classify a pEMP file based on vibration-relevant faults only.
    Electrical faults are indistinguishable from normal via vibration alone
    (they affect motor current, not mechanical vibration).
    Binary classification: Normal (0) vs Mechanical fault (1).
    """
    name = filename.lower()
    has_mechanical = "imbalance" in name or "umbalance" in name

    if has_mechanical:
        return 1  # Mechanical fault (imbalance, with or without electrical)
    else:
        return 0  # Normal (includes electrical-only faults)


def download_dataset(url, dest_path):
    """Download the dataset zip file."""
    print(f"Downloading dataset from {url}...")
    print("(This may take a few minutes depending on your connection)")
    urllib.request.urlretrieve(url, dest_path)
    print(f"Downloaded to {dest_path}")


def find_csv_files(directory):
    """Recursively find all CSV files in the extracted directory."""
    pattern = os.path.join(directory, "**", "*.csv")
    files = glob_mod.glob(pattern, recursive=True)
    if not files:
        # Also try .txt files (some datasets use tab-separated txt)
        pattern = os.path.join(directory, "**", "*.txt")
        files = glob_mod.glob(pattern, recursive=True)
    return files


def guess_fault_type(filepath):
    """Guess the fault type from the file name using pEMP naming convention."""
    return classify_file(os.path.basename(filepath))


def read_vibration_data(filepath):
    """
    Read triaxial vibration data from a CSV file.
    Expects columns for X, Y, Z acceleration values.
    Returns list of [x, y, z] values.
    """
    data = []
    try:
        with open(filepath, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            header = next(reader, None)

            # Try to find X, Y, Z columns
            x_col, y_col, z_col = None, None, None
            if header:
                header_lower = [h.strip().lower() for h in header]
                for i, h in enumerate(header_lower):
                    if "x" in h and ("acc" in h or "vib" in h or "a_" in h or h == "x"):
                        x_col = i
                    elif "y" in h and ("acc" in h or "vib" in h or "a_" in h or h == "y"):
                        y_col = i
                    elif "z" in h and ("acc" in h or "vib" in h or "a_" in h or h == "z"):
                        z_col = i

                # If we couldn't find named columns, use first 3 numeric columns
                if x_col is None:
                    # Check if header row is actually data
                    try:
                        vals = [float(v) for v in header[:3]]
                        data.append(vals)
                        x_col, y_col, z_col = 0, 1, 2
                    except (ValueError, IndexError):
                        x_col, y_col, z_col = 0, 1, 2
                elif y_col is None:
                    y_col = x_col + 1
                    z_col = x_col + 2

            else:
                x_col, y_col, z_col = 0, 1, 2

            for row in reader:
                try:
                    if len(row) >= max(x_col, y_col, z_col) + 1:
                        x = float(row[x_col])
                        y = float(row[y_col])
                        z = float(row[z_col])
                        data.append([x, y, z])
                except (ValueError, IndexError):
                    continue

    except Exception as e:
        print(f"  Warning: Could not read {filepath}: {e}")

    return data


def normalize_value(val, vmin, vmax):
    """Normalize a value to [0, 1]."""
    if vmax == vmin:
        return 0.5
    return max(0.0, min(1.0, (val - vmin) / (vmax - vmin)))


def create_sliding_windows(data, window_size, stride):
    """Create sliding windows from continuous vibration data."""
    windows = []
    for start in range(0, len(data) - window_size + 1, stride):
        window = data[start:start + window_size]
        windows.append(window)
    return windows


def normalize_windows(windows):
    """Normalize all windows to [0, 1] based on global min/max per axis."""
    if not windows:
        return windows

    # Find global min/max per axis
    mins = [float("inf")] * 3
    maxs = [float("-inf")] * 3
    for window in windows:
        for timestep in window:
            for ch in range(3):
                mins[ch] = min(mins[ch], timestep[ch])
                maxs[ch] = max(maxs[ch], timestep[ch])

    # Normalize
    normalized = []
    for window in windows:
        norm_window = []
        for timestep in window:
            norm_step = [
                normalize_value(timestep[ch], mins[ch], maxs[ch])
                for ch in range(3)
            ]
            norm_window.append(norm_step)
        normalized.append(norm_window)

    return normalized


def generate_synthetic_fallback(num_samples, window_size):
    """
    Generate synthetic vibration data if the real dataset
    cannot be downloaded or parsed.
    """
    print("Generating synthetic vibration data as fallback...")
    samples = []

    for i in range(num_samples):
        fault_type = i % 4
        sequence = []
        base_freq = 50
        dt = 1 / 1000

        for t in range(window_size):
            time = t * dt
            angle = 2 * math.pi * base_freq * time

            if fault_type == 0:  # Normal
                x = math.sin(angle) + random.gauss(0, 0.02)
                y = math.sin(angle + 2 * math.pi / 3) + random.gauss(0, 0.02)
                z = math.sin(angle + 4 * math.pi / 3) + random.gauss(0, 0.02)
            elif fault_type == 1:  # Imbalance
                x = math.sin(angle) + 0.3 * math.sin(2 * angle) + random.gauss(0, 0.05)
                y = math.sin(angle + 2 * math.pi / 3) + 0.3 * math.sin(2 * angle + 2 * math.pi / 3) + random.gauss(0, 0.05)
                z = math.sin(angle + 4 * math.pi / 3) + 0.3 * math.sin(2 * angle + 4 * math.pi / 3) + random.gauss(0, 0.05)
            elif fault_type == 2:  # Bearing
                x = math.sin(angle) + random.gauss(0, 0.04)
                y = math.sin(angle + 2 * math.pi / 3) + random.gauss(0, 0.04)
                z = math.sin(angle + 4 * math.pi / 3) + random.gauss(0, 0.04)
                if t % 8 == 0:
                    x += 0.8
                    y += 0.48
                    z += 0.32
            elif fault_type == 3:  # Misalignment
                mod = 1 + 0.5 * math.sin(2 * math.pi * base_freq * 0.3 * time)
                x = mod * math.sin(angle) + random.gauss(0, 0.04)
                y = mod * math.sin(angle + 2 * math.pi / 3) + random.gauss(0, 0.04)
                z = mod * math.sin(angle + 4 * math.pi / 3) + random.gauss(0, 0.04)

            # Normalize to [0, 1]
            x = max(0.0, min(1.0, (x + 1.5) / 3.0))
            y = max(0.0, min(1.0, (y + 1.5) / 3.0))
            z = max(0.0, min(1.0, (z + 1.5) / 3.0))

            sequence.append([round(x, 4), round(y, 4), round(z, 4)])

        samples.append({"sequence": sequence, "label": fault_type})

    return samples


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_samples = []
    use_synthetic = False

    # Try downloading and processing real data
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            zip_path = os.path.join(tmpdir, "dataset.zip")
            download_dataset(DATASET_URL, zip_path)

            print("Extracting archive...")
            with zipfile.ZipFile(zip_path, "r") as zf:
                zf.extractall(tmpdir)

            csv_files = find_csv_files(tmpdir)
            print(f"Found {len(csv_files)} data files")

            if not csv_files:
                print("No CSV files found in archive. Using synthetic data.")
                use_synthetic = True
            else:
                class_counts = {0: 0, 1: 0}

                class_names = ["Normal", "Mechanical"]
                for filepath in csv_files:
                    fault_type = guess_fault_type(filepath)

                    if class_counts[fault_type] >= MAX_SAMPLES_PER_CLASS:
                        continue

                    print(f"  Processing: {os.path.basename(filepath)} -> {class_names[fault_type]}")

                    data = read_vibration_data(filepath)
                    if len(data) < WINDOW_SIZE:
                        print(f"    Too short ({len(data)} samples), skipping")
                        continue

                    windows = create_sliding_windows(data, WINDOW_SIZE, STRIDE)
                    windows = normalize_windows(windows)

                    for w in windows:
                        if class_counts[fault_type] >= MAX_SAMPLES_PER_CLASS:
                            break
                        rounded = [[round(v, 4) for v in step] for step in w]
                        all_samples.append({"sequence": rounded, "label": fault_type})
                        class_counts[fault_type] += 1

                print(f"\nClass distribution: {class_counts}")
                total = sum(class_counts.values())

                if total < 40:
                    print("Too few samples extracted. Using synthetic data.")
                    use_synthetic = True

    except Exception as e:
        print(f"Could not download/process real data: {e}")
        use_synthetic = True

    if use_synthetic:
        all_samples = generate_synthetic_fallback(400, WINDOW_SIZE)
        print(f"Generated {len(all_samples)} synthetic samples")

    # Shuffle
    random.shuffle(all_samples)

    # Split train/test
    split_idx = int(len(all_samples) * TRAIN_RATIO)
    train_samples = all_samples[:split_idx]
    test_samples = all_samples[split_idx:]

    # Count per class
    train_counts = {}
    for s in train_samples:
        train_counts[s["label"]] = train_counts.get(s["label"], 0) + 1
    test_counts = {}
    for s in test_samples:
        test_counts[s["label"]] = test_counts.get(s["label"], 0) + 1

    print(f"\nTrain: {len(train_samples)} samples {train_counts}")
    print(f"Test:  {len(test_samples)} samples {test_counts}")

    # Write JSON files
    train_path = os.path.join(OUTPUT_DIR, "train.json")
    test_path = os.path.join(OUTPUT_DIR, "test.json")

    train_json = {
        "windowSize": WINDOW_SIZE,
        "channels": 3,
        "classes": ["Normal", "Mechanical"],
        "samples": train_samples,
    }
    test_json = {
        "windowSize": WINDOW_SIZE,
        "channels": 3,
        "classes": ["Normal", "Mechanical"],
        "samples": test_samples,
    }

    with open(train_path, "w") as f:
        json.dump(train_json, f)
    with open(test_path, "w") as f:
        json.dump(test_json, f)

    train_size = os.path.getsize(train_path) / 1024
    test_size = os.path.getsize(test_path) / 1024

    print(f"\nWritten:")
    print(f"  {train_path} ({train_size:.0f} KB)")
    print(f"  {test_path} ({test_size:.0f} KB)")
    print("Done!")


if __name__ == "__main__":
    main()
