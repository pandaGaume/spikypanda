# LiDAR Data Pipeline

## Overview

SpikyPanda's LiDAR autoencoder operates on 2D Bird's Eye View (BEV) occupancy grids
with 6 channels. This document describes the full pipeline from raw sensor data to
training-ready grids.

## Pipeline

```
Raw LiDAR scan (3D point cloud)
  |
  v
Projection (Python script)
  |  - filter points within spatial range (-50m to +50m)
  |  - discretize into grid cells (64x64)
  |  - compute 6 channel statistics per cell
  |
  v
BEV Occupancy Grid (64x64x6, normalized [0,1])
  |
  v
JSON export (train.json, test.json)
  |
  v
SpikyPanda sample / benchmark (browser or Node.js)
```

## The 6 Channels

| Channel | Name | Computation | Nature |
|---------|------|-------------|--------|
| C0 | Density | Point count per cell / max count | Dense |
| C1 | Z max | Maximum height of points in cell | Sparse |
| C2 | Z min | Minimum height of points in cell | Dense |
| C3 | Std(z) | Standard deviation of point heights | Dense |
| C4 | Reflectivity | Mean intensity/reflectivity of points | Dense |
| C5 | Velocity | Max velocity of annotated objects in cell | Sparse |

Channels C1 (Z max) and C5 (Velocity) are **sparse**: most cells contain low or zero
values, with a few critical cells showing high values corresponding to obstacles and
moving objects. This sparsity is the central challenge for reconstruction.

## Supported Data Sources

### nuScenes (recommended)

[nuScenes](https://www.nuscenes.org/) is the recommended dataset because it is the
only public LiDAR dataset that provides per-object velocity annotations.

- **nuScenes mini**: ~400 frames, ~4 GB download, free registration required
- **nuScenes trainval**: ~40K frames, ~300 GB, for production benchmarks

Setup:
```bash
pip install nuscenes-devkit numpy pyquaternion
```

Projection:
```bash
python packages/dev/tools/python/prepare_nuscenes.py \
  --dataroot /path/to/nuscenes \
  --version v1.0-mini \
  --output packages/host/www/data/lidar \
  --grid-size 64 \
  --max-samples 100
```

### KITTI

[KITTI](https://www.cvlibs.net/datasets/kitti/) provides LiDAR scans as binary
`.bin` files with (x, y, z, intensity) per point. No velocity annotations.

```bash
python packages/dev/tools/python/prepare_nuscenes.py \
  --raw-dir /path/to/kitti/training/velodyne/ \
  --output packages/host/www/data/lidar \
  --grid-size 64
```

Note: C5 (Velocity) will be zero for all cells since KITTI does not provide
velocity data. Sparse metrics for this channel will not be meaningful.

### Raw Point Clouds (.bin, .pcd)

Any collection of point cloud files in KITTI binary format (float32 x,y,z,intensity)
or PCD format can be processed:

```bash
python packages/dev/tools/python/prepare_nuscenes.py \
  --raw-dir /path/to/pointclouds/ \
  --output output_dir/ \
  --grid-size 64 \
  --x-range -30 30 \
  --y-range -30 30
```

### Custom Data

To use data from a simulator (BabylonJS depth buffer, CARLA, etc.), generate the
JSON directly in the expected format:

```json
{
  "width": 64,
  "height": 64,
  "channels": 6,
  "count": 100,
  "channelNames": ["Density", "Z_max", "Z_min", "Std_z", "Reflectivity", "Velocity"],
  "samples": [
    {
      "pixels": [0.8, 0.5, ...]
    }
  ]
}
```

The `pixels` array is in **CHW flat format**: all pixels for C0 first, then C1,
etc. Total length = channels x height x width. All values must be normalized
to [0, 1].

## Projection Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--grid-size` | 64 | Output grid resolution (NxN) |
| `--x-range` | -50 50 | X axis range in meters |
| `--y-range` | -50 50 | Y axis range in meters |
| Z range | -3 to 5 | Hardcoded height filter (ground to ~5m above) |
| `--max-samples` | all | Limit number of frames to process |

### Grid Resolution vs Coverage

| Grid Size | Range (100m) | Cell Size | Typical Use |
|-----------|-------------|-----------|-------------|
| 32x32 | 100m | 3.12m | Fast prototyping |
| 64x64 | 100m | 1.56m | Standard (autonomous driving) |
| 128x128 | 100m | 0.78m | High resolution |
| 64x64 | 60m | 0.94m | Short range, more detail |

## Output Format

The script generates three files:

- `train.json` - 80% of samples for training
- `test.json` - 20% of samples for testing
- `metadata.json` - Dataset summary (counts, grid size, source)

### Automatic Loading

The LiDAR sample (`packages/host/www/samples/lidar/`) automatically attempts
to load `data/lidar/train.json` at startup. If found, real data is used
instead of synthetic generation. No code changes needed.

The benchmark script (`packages/dev/tools/benchmarks/comprehensive-benchmark.cjs`)
can also be modified to load real data by changing the `generateDataset` function
to read from JSON files.

## Validation Checklist

After projecting real data, verify:

1. **Channel distributions**: open the sample, train with 1 epoch, and visually
   inspect the channel heatmaps. Density should show the road pattern, Z max should
   show obstacles as bright spots, Velocity should be mostly black with occasional
   bright spots for moving objects.

2. **Value ranges**: all channels should be in [0, 1]. If channels look uniformly
   dark or bright, the normalization may need adjustment.

3. **Grid alignment**: the BEV grid should be centered on the ego vehicle with
   consistent orientation (forward = up in the grid).

4. **Sparse channel activity**: at least some samples should have non-zero values
   in C1 (Z max) above the obstacle threshold (~0.15). If all samples have C5 = 0,
   the dataset likely lacks velocity annotations (expected for KITTI).
