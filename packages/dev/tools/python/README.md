# Python Tools

Data preparation scripts for SpikyPanda samples and benchmarks.
These scripts convert external datasets into JSON format compatible with the
browser-based samples.

## Scripts

### prepare_nuscenes.py

Projects LiDAR 3D point clouds into 2D Bird's Eye View (BEV) occupancy grids
with 6 channels (Density, Z max, Z min, Std(z), Reflectivity, Velocity).

**Supports three input sources:**

| Source | Velocity (C5) | Setup |
|--------|:---:|-------|
| nuScenes | Yes | `pip install nuscenes-devkit numpy pyquaternion` |
| KITTI (.bin) | No | `pip install numpy` |
| Raw .pcd | No | `pip install numpy` |

**Usage with nuScenes:**

```bash
# Download nuScenes mini from https://www.nuscenes.org/nuscenes#download (~4 GB)
python prepare_nuscenes.py \
  --dataroot /path/to/nuscenes \
  --version v1.0-mini \
  --output ../../host/www/data/lidar \
  --grid-size 64 \
  --max-samples 100
```

**Usage with raw point clouds (.bin or .pcd):**

```bash
python prepare_nuscenes.py \
  --raw-dir /path/to/pointclouds/ \
  --output ../../host/www/data/lidar \
  --grid-size 64
```

**Parameters:**

| Arg | Default | Description |
|-----|---------|-------------|
| `--dataroot` | - | nuScenes dataset root |
| `--version` | v1.0-mini | nuScenes version |
| `--raw-dir` | - | Directory of .bin/.pcd files |
| `--output` | - | Output directory (creates train.json + test.json) |
| `--grid-size` | 64 | Grid resolution NxN |
| `--x-range` | -50 50 | X axis range (meters) |
| `--y-range` | -50 50 | Y axis range (meters) |
| `--max-samples` | all | Max number of frames |

**Output:** `train.json`, `test.json`, `metadata.json` in CHW flat format,
values normalized [0, 1]. The LiDAR sample loads these automatically from
`packages/host/www/data/lidar/`.

See [docs/lidar-data-pipeline.md](../../../../docs/lidar-data-pipeline.md) for
the full pipeline documentation.

---

### prepare_motor.py

Downloads and converts the pEMP motor vibration dataset from Zenodo for the
Motor Vibration RNN sample.

```bash
python prepare_motor.py
```

Downloads the dataset (~200 MB), extracts vibration time series (X, Y, Z axes),
segments them into fixed-length windows, labels by fault type, and exports as
`train.json` / `test.json` in `../../host/www/data/motor/`.

---

### cifar10_to_json.py

Converts CIFAR-10 (Python pickle format) to JSON for the MNIST/CNN sample.
Not typically needed since the MNIST sample uses its own binary loader.

---

## Notebooks

### step_by_step.ipynb

Interactive walkthrough of building and training an MLP from scratch with
SpikyPanda concepts. Educational notebook.

### xor_mlp_example.ipynb

XOR problem solved with a small MLP. Demonstrates the graph-based approach
where each neuron and synapse is a discrete object.
