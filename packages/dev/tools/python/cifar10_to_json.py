"""
Converts CIFAR-10 pickle files to JSON files readable by SpikyPanda (TypeScript/Node.js).

Usage:
    python cifar10_to_json.py [--max-samples N] [--output-dir DIR]

Outputs:
    - cifar10_test.json       : full or subset of test batch
    - cifar10_train_1.json    : training batch 1 (subset)
    - cifar10_meta.json       : label names and metadata

JSON format per file:
{
    "count": 100,
    "width": 32,
    "height": 32,
    "channels": 3,
    "format": "CHW",
    "samples": [
        { "label": 3, "pixels": [0.123, 0.456, ...] }   // 3072 floats, CHW order, [0..1]
    ]
}
"""

import os
import sys
import json
import tarfile
import pickle
import argparse
import urllib.request
import numpy as np

URL = "https://www.cs.toronto.edu/~kriz/cifar-10-python.tar.gz"
ARCHIVE = "cifar-10-python.tar.gz"
EXTRACT_DIR = "data"

LABEL_NAMES = [
    "airplane", "automobile", "bird", "cat", "deer",
    "dog", "frog", "horse", "ship", "truck"
]


def download(url: str, dest: str) -> None:
    if not os.path.exists(dest):
        print(f"Downloading {url} ...")
        urllib.request.urlretrieve(url, dest)
        print("Done.")


def extract_tar(tar_path: str, extract_dir: str) -> None:
    target_dir = os.path.join(extract_dir, "cifar-10-batches-py")
    if not os.path.exists(target_dir):
        os.makedirs(extract_dir, exist_ok=True)
        print("Extracting archive ...")
        with tarfile.open(tar_path, "r:gz") as tar:
            tar.extractall(path=extract_dir)
        print("Done.")


def load_cifar_batch(path: str):
    with open(path, "rb") as f:
        batch = pickle.load(f, encoding="bytes")
    x = batch[b"data"].astype(np.float32) / 255.0  # (N, 3072), CHW order
    y = np.array(batch[b"labels"], dtype=np.int64)
    return x, y


def batch_to_json(x: np.ndarray, y: np.ndarray, max_samples: int = None) -> dict:
    if max_samples and max_samples < len(x):
        x = x[:max_samples]
        y = y[:max_samples]

    samples = []
    for i in range(len(x)):
        samples.append({
            "label": int(y[i]),
            "pixels": [round(float(v), 4) for v in x[i]]
        })

    return {
        "count": len(samples),
        "width": 32,
        "height": 32,
        "channels": 3,
        "format": "CHW",
        "samples": samples
    }


def main():
    parser = argparse.ArgumentParser(description="Convert CIFAR-10 to JSON for SpikyPanda")
    parser.add_argument("--max-samples", type=int, default=100,
                        help="Max samples per file (default: 100)")
    parser.add_argument("--output-dir", type=str, default="data",
                        help="Output directory for JSON files (default: data)")
    args = parser.parse_args()

    download(URL, ARCHIVE)
    extract_tar(ARCHIVE, EXTRACT_DIR)

    os.makedirs(args.output_dir, exist_ok=True)

    # Meta
    meta_path = os.path.join(args.output_dir, "cifar10_meta.json")
    with open(meta_path, "w") as f:
        json.dump({
            "labels": LABEL_NAMES,
            "numClasses": 10,
            "width": 32,
            "height": 32,
            "channels": 3,
            "format": "CHW"
        }, f, indent=2)
    print(f"Wrote {meta_path}")

    # Test batch
    test_path = os.path.join(EXTRACT_DIR, "cifar-10-batches-py", "test_batch")
    x_test, y_test = load_cifar_batch(test_path)
    test_json = batch_to_json(x_test, y_test, args.max_samples)
    out_path = os.path.join(args.output_dir, "cifar10_test.json")
    with open(out_path, "w") as f:
        json.dump(test_json, f)
    print(f"Wrote {out_path} ({test_json['count']} samples)")

    # Training batch 1
    train_path = os.path.join(EXTRACT_DIR, "cifar-10-batches-py", "data_batch_1")
    x_train, y_train = load_cifar_batch(train_path)
    train_json = batch_to_json(x_train, y_train, args.max_samples)
    out_path = os.path.join(args.output_dir, "cifar10_train.json")
    with open(out_path, "w") as f:
        json.dump(train_json, f)
    print(f"Wrote {out_path} ({train_json['count']} samples)")


if __name__ == "__main__":
    main()
