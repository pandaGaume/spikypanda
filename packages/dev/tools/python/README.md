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

### prepare_motor_current.py

Companion to `prepare_motor.py`, but for **motor electrical fault** datasets:
builds windowed 3-phase stator current (Ia, Ib, Ic) sequences for Motor Current
Signature Analysis (MCSA) style classification. Output format is identical to
`prepare_motor.py` (3 channels, windowed, normalized to [0, 1]) so the
`samples/motor_current/` browser sample can consume it with minimal changes.

```bash
# Synthetic only (offline, no download):
python prepare_motor_current.py

# Point at an extracted UFU Broken Rotor Bar dataset (.mat files):
python prepare_motor_current.py --source-dir packages/host/www/data/motor_current

# Point at a CSV-based dataset (other corpora from the list below):
python prepare_motor_current.py --source-dir /path/to/csv/dataset
```

**Parameters:**

| Arg | Default | Description |
|-----|---------|-------------|
| `--source-dir` | - | Local path to an extracted electrical-fault dataset. If omitted, synthetic 3-phase data is generated. |
| `--num-synthetic` | 400 | Number of synthetic samples when no source dir is provided. |

**Output:** `train.json` / `test.json` in `../../host/www/data/motor_current/`.
Class list depends on the input:

- **Synthetic / generic CSV path** — 4 classes:
  `Normal`, `OpenPhase`, `ShortCircuit`, `Unbalanced`
- **UFU .mat path** (auto-detected from `struct_*_R1.mat` files) — 5 classes:
  `Healthy`, `BRB1`, `BRB2`, `BRB3`, `BRB4` (healthy + 1..4 broken rotor bars)

The generated JSON is consumed directly by the
[`samples/motor_current/`](../../../host/www/samples/motor_current) browser
demo (LSTM/GRU classifier with live loss curve, confusion matrix, and
3-phase signal visualization). The demo falls back to an in-browser
synthetic generator if no JSON is present.

**Public electrical-signal datasets for motor fault detection.** Unlike CWRU /
Paderborn / SOON-pEMP which are vibration corpora, the datasets below expose
stator current and/or voltage signals — the fault signatures live in the
electrical domain (harmonics, sideband frequencies, phase asymmetry). The
script walks the extracted directory looking for CSV files with three current
columns and classifies each file by filename keywords.

| # | Dataset | Signals | Why pick it | Link |
|---|---------|---------|-------------|------|
| 1 | Synchronous Motor Electrical Faults | 3x voltage + 3x current + speed | 5 fault types (open phase, stator short, rotor excitation), includes CNN/LSTM reference classifiers. Closest analog to a MAFAULDA-style electrical corpus. | [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2666546823000460) |
| 2 | Rotor Broken Bar (3-phase induction) — UFU | 3x voltage + 3x current + 5x vibration | **Recommended starting point** — dual-modality, lets you reuse the vibration sample as a baseline and add MCSA as a second branch. See breakdown below. | [IEEE DataPort](https://ieee-dataport.org/open-access/experimental-database-detecting-and-diagnosing-rotor-broken-bar-three-phase-induction) |
| 3 | Three-phase Induction Motor Multi-Sensor (2025) | Vibration + voltage + current @ 50 kHz | 10 operational states on a 0.2 kW squirrel cage motor. Clean schema, well documented. | [Nature Sci. Data](https://www.nature.com/articles/s41597-025-05437-3) |
| 4 | Inverter-driven PMSM Fault Dataset (2025) | Current + voltage + temperature | Drive-side (inverter) faults in addition to motor faults — relevant for VFD applications. | [ScienceDirect](https://www.sciencedirect.com/science/article/pii/S2352340925000186) |
| 5 | Induction Motor Fault Dataset (IMFDS) | Current | Small and simple — good for a quick smoke test. Requires Kaggle API credentials. | [Kaggle](https://www.kaggle.com/datasets/sabermalek/imfds) |

Most of these require a (free) account to download, so the script does **not**
auto-download: grab the archive manually, extract it, and pass the folder via
`--source-dir`. If auto-classification by filename fails for a given corpus,
adjust the `classify_file` function at the top of the script.

**Where to put the raw files.** The recommended location is directly under
`packages/host/www/data/motor_current/` (which is already the output directory
for the generated JSON). The entire `data/` tree is already covered by the
repo's top-level `.gitignore`, so neither the raw `.mat`/`.csv` files nor the
generated `train.json` / `test.json` are committed — regenerate them on
demand by re-running the prep script.

#### Rotor Broken Bar dataset (UFU) — breakdown

Reference details for the recommended dataset (#2 above), copied from the
IEEE DataPort page for convenience when wiring up `classify_file` and the
window sizing:

**Experimental setup**
- Three-phase induction motor coupled to a DC machine acting as a generator
  to simulate load torque, connected via a shaft with a rotary torque wrench.
- Induction motor: **1 hp, 220 V / 380 V, 3.02 A / 1.75 A, 4 poles, 60 Hz**,
  nominal torque **4.1 Nm**, rated speed **1715 rpm**. Squirrel-cage rotor
  with **34 bars**.
- Load torque is adjusted by varying the DC generator field-winding voltage
  (single-phase variator + filtered full-bridge rectifier).

**Operating conditions**
- Load levels: **12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100 %** of full load.
- Rotor defects: healthy rotor, then rotors with **1, 2, 3, 4 adjacent broken
  bars** (drilled, starting from the first rotor bar).
- **10 repetitions** per (load × severity) combination.
- Each acquisition is **18 s long**, covering transient to steady state.

**Acquired signals** (all sampled simultaneously)
- **3x phase voltage** — measured directly at the motor terminals with
  Yokogawa oscilloscope voltage probes.
- **3x phase current** — Yokogawa 96033 AC current probes, 50 A<sub>RMS</sub>
  capacity, 10 mV/A output.
- **5x vibration** — axial accelerometers, 10 mV/mm/s sensitivity, 5–2000 Hz
  range, placed on the drive-end (DE) and non-drive-end (NDE) sides of the
  motor, axially / radially, horizontal / vertical.

**HDF5 layout of the .mat files** (MATLAB v7.3)

    <rotor_key>/                              # 'rs' or 'r1b'..'r4b'
        torque05..torque40/                   # 8 load levels (12.5..100 %)
            Ia, Ib, Ic                        # shape (10,1), HDF5 refs
            Va, Vb, Vc                        # shape (10,1), HDF5 refs
            Trigger                           # shape (10,1), HDF5 refs
            Vib_acpe, Vib_acpi, Vib_axial,
            Vib_base, Vib_carc                # 5 vibration channels

Each referenced array is shape `(1, N)` where:
- currents / voltages: N ≈ 1,001,000 (~55.6 kHz × 18 s)
- vibration:           N ≈   153,504 (~ 8.5 kHz × 18 s)

`prepare_motor_current.py` opens these files with `h5py`, walks
`rotor → torque → repetition`, dereferences the `Ia/Ib/Ic` refs, decimates
the ~55.6 kHz currents by 56× down to ~1 kHz (matching the Motor Vibration
sample's temporal footprint so a 64-step window covers ~4 line cycles at
60 Hz), windows them, normalizes per-channel to [0, 1], and writes JSON.

**Implications for the prep script**
- 5 fault classes are available (healthy + 1..4 broken bars); the script
  automatically switches to `["Healthy", "BRB1", "BRB2", "BRB3", "BRB4"]`
  when UFU `.mat` files are detected, otherwise it uses the 4-class
  synthetic / generic CSV class list.
- 5 rotors × 8 loads × 10 repetitions = 400 raw current traces per run set;
  the `MAX_SAMPLES_PER_CLASS` cap in the script (default 400) is the right
  place to keep the exported JSON lightweight.
- Because the electrical and vibration streams are co-recorded, the same
  windowing can feed both the existing Motor Vibration sample (5 accelerometer
  channels) and the Motor Current sample (3 phase currents).

#### Debugging trace — read before tweaking the prep script

The first end-to-end run of this sample sat at chance accuracy because of
four compounding preprocessing bugs (per-trace normalization erasing the
fault signature, startup transients contaminating global stats, windows
too short to see the broken-bar envelope, and an "optimum-trap" target
in the JS training loop). All four are documented in detail in
[`docs/research/motor-current-mcsa-debugging.md`](../../../../docs/research/motor-current-mcsa-debugging.md),
along with general principles for any future fault-detection sample. The
fixes are now baked into `prepare_motor_current.py` and the browser
sample, but the document is the canonical record of *why* each design
choice was made.

---

### generate_mcsa_figures.py

Generates publication-quality PDF figures for the MCSA broken rotor bar paper.
Requires `matplotlib`, `numpy`, `h5py`.

```bash
pip install matplotlib
python generate_mcsa_figures.py \
    --data-dir ../../host/www/data/motor_current \
    --output-dir ../../../../docs/research/figures
```

Produces 6 figures in `docs/research/figures/`:

| Figure | File | Content |
|---|---|---|
| Fig 1 | `fig1_pipeline.pdf` | 4-panel processing pipeline (raw -> RMS -> decimated -> centered) |
| Fig 2 | `fig2_before_after.pdf` | 2x2 comparison: raw vs. envelope for Healthy and BRB4 |
| Fig 3 | `fig3_ablation.pdf` | Ablation bar chart (4 preprocessing variants, 16-78% accuracy) |
| Fig 4 | `fig4_pareto.pdf` | Accuracy vs. model size Pareto frontier (log scale) |
| Fig 5 | `fig5_confusion.pdf` | 5x5 confusion matrix heatmap from the 78.3% run |
| Fig 6 | `fig6_training_curves.pdf` | Loss vs. epoch for all 4 experimental attempts |

See [`docs/research/motor-current-mcsa-novelty.md`](../../../../docs/research/motor-current-mcsa-novelty.md)
for the paper draft that references these figures.

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
