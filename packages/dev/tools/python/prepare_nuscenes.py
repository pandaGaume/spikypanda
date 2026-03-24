#!/usr/bin/env python3
"""
prepare_nuscenes.py
-------------------
Projects nuScenes LiDAR point clouds into BEV occupancy grids (64x64x6)
compatible with SpikyPanda's LiDAR autoencoder sample.

Channels:
  C0 - Point density (count per cell, normalized)
  C1 - Z max (maximum height)
  C2 - Z min (minimum height)
  C3 - Std(z) (height variance)
  C4 - Mean reflectivity / intensity
  C5 - Velocity magnitude (nuScenes provides annotated velocities)

Usage:
  # 1. Download nuScenes mini split (~4GB)
  #    https://www.nuscenes.org/nuscenes#download
  #
  # 2. Extract to a folder, e.g., /data/nuscenes/
  #
  # 3. Run this script:
  python prepare_nuscenes.py --dataroot /path/to/nuscenes --version v1.0-mini --output ../../host/www/data/lidar

  # For quick test with fewer samples:
  python prepare_nuscenes.py --dataroot /path/to/nuscenes --version v1.0-mini --output ../../host/www/data/lidar --max-samples 50

  # Custom grid size:
  python prepare_nuscenes.py --dataroot /path/to/nuscenes --version v1.0-mini --output out/ --grid-size 128

Requirements:
  pip install nuscenes-devkit numpy pyquaternion

If nuScenes is not available, the script can also process raw .bin or .pcd
point cloud files. See --raw-dir option.
"""

import argparse
import json
import os
import sys
import numpy as np
from pathlib import Path


# ============================================================================
# BEV Grid Projection
# ============================================================================

def project_to_bev(points, velocities, grid_size=64, x_range=(-50, 50), y_range=(-50, 50),
                   z_range=(-3, 5)):
    """
    Project a 3D point cloud to a Bird's Eye View occupancy grid.

    Args:
        points: (N, 4) array [x, y, z, intensity]
        velocities: (N,) array of velocity magnitudes (0 if unknown)
        grid_size: output grid resolution (grid_size x grid_size)
        x_range: (min, max) in meters for x axis
        y_range: (min, max) in meters for y axis
        z_range: (min, max) in meters for z filtering

    Returns:
        grid: (6, grid_size, grid_size) float32 array, values in [0, 1]
    """
    # Filter points within range
    mask = (
        (points[:, 0] >= x_range[0]) & (points[:, 0] < x_range[1]) &
        (points[:, 1] >= y_range[0]) & (points[:, 1] < y_range[1]) &
        (points[:, 2] >= z_range[0]) & (points[:, 2] < z_range[1])
    )
    pts = points[mask]
    vel = velocities[mask] if velocities is not None else np.zeros(mask.sum())

    if len(pts) == 0:
        return np.zeros((6, grid_size, grid_size), dtype=np.float32)

    # Discretize to grid cells
    x_bins = np.clip(
        ((pts[:, 0] - x_range[0]) / (x_range[1] - x_range[0]) * grid_size).astype(int),
        0, grid_size - 1
    )
    y_bins = np.clip(
        ((pts[:, 1] - y_range[0]) / (y_range[1] - y_range[0]) * grid_size).astype(int),
        0, grid_size - 1
    )

    # Initialize grid
    grid = np.zeros((6, grid_size, grid_size), dtype=np.float32)

    # Accumulators
    count = np.zeros((grid_size, grid_size), dtype=np.float32)
    z_sum = np.zeros((grid_size, grid_size), dtype=np.float32)
    z_sq_sum = np.zeros((grid_size, grid_size), dtype=np.float32)
    z_max = np.full((grid_size, grid_size), -np.inf, dtype=np.float32)
    z_min = np.full((grid_size, grid_size), np.inf, dtype=np.float32)
    intensity_sum = np.zeros((grid_size, grid_size), dtype=np.float32)
    vel_max = np.zeros((grid_size, grid_size), dtype=np.float32)

    # Accumulate per cell
    for i in range(len(pts)):
        r, c = y_bins[i], x_bins[i]
        z = pts[i, 2]
        intensity = pts[i, 3] if pts.shape[1] > 3 else 0
        v = vel[i]

        count[r, c] += 1
        z_sum[r, c] += z
        z_sq_sum[r, c] += z * z
        if z > z_max[r, c]:
            z_max[r, c] = z
        if z < z_min[r, c]:
            z_min[r, c] = z
        intensity_sum[r, c] += intensity
        if v > vel_max[r, c]:
            vel_max[r, c] = v

    # Compute channels
    occupied = count > 0

    # C0: Density (normalized by max count)
    max_count = count.max() if count.max() > 0 else 1
    grid[0] = count / max_count

    # C1: Z max (normalized to [0, 1] within z_range)
    z_max[~occupied] = 0
    grid[1] = np.clip((z_max - z_range[0]) / (z_range[1] - z_range[0]), 0, 1)

    # C2: Z min (normalized)
    z_min[~occupied] = 0
    grid[2] = np.clip((z_min - z_range[0]) / (z_range[1] - z_range[0]), 0, 1)

    # C3: Std(z)
    z_mean = np.where(occupied, z_sum / np.maximum(count, 1), 0)
    z_var = np.where(
        count > 1,
        z_sq_sum / count - z_mean * z_mean,
        0
    )
    z_std = np.sqrt(np.maximum(z_var, 0))
    max_std = z_std.max() if z_std.max() > 0 else 1
    grid[3] = z_std / max_std

    # C4: Mean reflectivity (normalized)
    mean_intensity = np.where(occupied, intensity_sum / np.maximum(count, 1), 0)
    max_intensity = mean_intensity.max() if mean_intensity.max() > 0 else 1
    grid[4] = mean_intensity / max_intensity

    # C5: Velocity (normalized)
    max_vel = vel_max.max() if vel_max.max() > 0 else 1
    grid[5] = vel_max / max_vel

    return grid


# ============================================================================
# nuScenes loader
# ============================================================================

def load_nuscenes_samples(dataroot, version, max_samples=None, grid_size=64,
                          x_range=(-50, 50), y_range=(-50, 50)):
    """Load and project nuScenes LiDAR samples."""
    try:
        from nuscenes.nuscenes import NuScenes
        from nuscenes.utils.data_classes import LidarPointCloud
        from pyquaternion import Quaternion
    except ImportError:
        print("ERROR: nuscenes-devkit not installed.")
        print("  pip install nuscenes-devkit pyquaternion")
        sys.exit(1)

    print(f"Loading nuScenes ({version}) from {dataroot}...")
    nusc = NuScenes(version=version, dataroot=dataroot, verbose=False)

    grids = []
    sample_count = 0

    for sample in nusc.sample:
        if max_samples and sample_count >= max_samples:
            break

        # Get LIDAR_TOP data
        lidar_token = sample["data"]["LIDAR_TOP"]
        lidar_data = nusc.get("sample_data", lidar_token)
        pcl_path = os.path.join(dataroot, lidar_data["filename"])

        if not os.path.exists(pcl_path):
            continue

        # Load point cloud (x, y, z, intensity, ring_index)
        pc = LidarPointCloud.from_file(pcl_path)
        points = pc.points.T  # (N, 4+)

        # Get velocities from annotations
        velocities = np.zeros(len(points), dtype=np.float32)

        # For each annotation, assign velocity to nearby points
        for ann_token in sample["anns"]:
            ann = nusc.get("sample_annotation", ann_token)
            if len(ann["velocity"]) >= 2:
                vel_mag = np.sqrt(ann["velocity"][0]**2 + ann["velocity"][1]**2)
                if vel_mag > 0.5:  # Only moving objects
                    # Find points near this annotation
                    ann_pos = np.array(ann["translation"][:3])
                    ann_size = max(ann["size"])
                    dists = np.sqrt(
                        (points[:, 0] - ann_pos[0])**2 +
                        (points[:, 1] - ann_pos[1])**2
                    )
                    near_mask = dists < ann_size * 1.5
                    velocities[near_mask] = vel_mag

        # Project to BEV grid
        grid = project_to_bev(
            points[:, :4], velocities, grid_size=grid_size,
            x_range=x_range, y_range=y_range
        )

        grids.append(grid)
        sample_count += 1

        if sample_count % 10 == 0:
            print(f"  Processed {sample_count} samples...")

    print(f"Loaded {len(grids)} samples from nuScenes.")
    return grids


# ============================================================================
# Raw .bin / .pcd loader (fallback without nuScenes devkit)
# ============================================================================

def load_raw_pointclouds(raw_dir, grid_size=64, x_range=(-50, 50), y_range=(-50, 50)):
    """Load raw .bin or .pcd point cloud files from a directory."""
    grids = []
    files = sorted(Path(raw_dir).glob("*.bin")) + sorted(Path(raw_dir).glob("*.pcd"))

    for f in files:
        if f.suffix == ".bin":
            # KITTI format: x, y, z, intensity as float32
            points = np.fromfile(str(f), dtype=np.float32).reshape(-1, 4)
        elif f.suffix == ".pcd":
            points = load_pcd(str(f))
        else:
            continue

        velocities = np.zeros(len(points), dtype=np.float32)
        grid = project_to_bev(
            points, velocities, grid_size=grid_size,
            x_range=x_range, y_range=y_range
        )
        grids.append(grid)

    print(f"Loaded {len(grids)} raw point clouds from {raw_dir}")
    return grids


def load_pcd(filepath):
    """Minimal PCD reader for ASCII/binary PCD files."""
    with open(filepath, "rb") as f:
        header = {}
        while True:
            line = f.readline().decode("ascii", errors="ignore").strip()
            if line.startswith("DATA"):
                data_format = line.split()[1]
                break
            if " " in line:
                key, val = line.split(" ", 1)
                header[key] = val

        n_points = int(header.get("POINTS", 0))
        fields = header.get("FIELDS", "x y z").split()

        if data_format == "ascii":
            points = []
            for _ in range(n_points):
                vals = f.readline().decode("ascii").strip().split()
                points.append([float(v) for v in vals[:4]])
            return np.array(points, dtype=np.float32)
        else:
            # Binary
            dt = np.dtype([(name, np.float32) for name in fields[:4]])
            data = np.frombuffer(f.read(n_points * dt.itemsize), dtype=dt)
            return np.column_stack([data[name] for name in fields[:4]])


# ============================================================================
# Export to JSON (SpikyPanda format)
# ============================================================================

def export_grids(grids, output_dir, grid_size, train_ratio=0.8):
    """
    Export grids as train.json and test.json in SpikyPanda format.

    Format: { width, height, channels, count, samples: [{ pixels: [...] }] }
    pixels is CHW flat array: [C0_pixel0, C0_pixel1, ..., C1_pixel0, ...]
    """
    os.makedirs(output_dir, exist_ok=True)

    # Shuffle and split
    np.random.shuffle(grids)
    split = int(len(grids) * train_ratio)
    train_grids = grids[:split]
    test_grids = grids[split:]

    for name, subset in [("train", train_grids), ("test", test_grids)]:
        samples = []
        for grid in subset:
            # grid is (6, H, W), flatten to CHW
            pixels = grid.flatten().tolist()
            # Round to 4 decimals to reduce JSON size
            pixels = [round(v, 4) for v in pixels]
            samples.append({"pixels": pixels})

        data = {
            "width": grid_size,
            "height": grid_size,
            "channels": 6,
            "count": len(samples),
            "channelNames": ["Density", "Z_max", "Z_min", "Std_z", "Reflectivity", "Velocity"],
            "source": "nuScenes",
            "samples": samples,
        }

        filepath = os.path.join(output_dir, f"{name}.json")
        with open(filepath, "w") as f:
            json.dump(data, f)

        size_mb = os.path.getsize(filepath) / (1024 * 1024)
        print(f"  {name}.json: {len(samples)} samples ({size_mb:.1f} MB)")

    # Also export metadata
    meta = {
        "grid_size": grid_size,
        "channels": 6,
        "channelNames": ["Density", "Z_max", "Z_min", "Std_z", "Reflectivity", "Velocity"],
        "total_samples": len(grids),
        "train_samples": len(train_grids),
        "test_samples": len(test_grids),
        "format": "CHW flat array, values normalized [0, 1]",
    }
    with open(os.path.join(output_dir, "metadata.json"), "w") as f:
        json.dump(meta, f, indent=2)


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description="Project LiDAR point clouds to BEV occupancy grids for SpikyPanda"
    )
    parser.add_argument("--dataroot", type=str, help="nuScenes dataset root directory")
    parser.add_argument("--version", type=str, default="v1.0-mini",
                        help="nuScenes version (v1.0-mini, v1.0-trainval)")
    parser.add_argument("--raw-dir", type=str,
                        help="Directory of raw .bin/.pcd files (alternative to nuScenes)")
    parser.add_argument("--output", type=str, required=True,
                        help="Output directory for train.json and test.json")
    parser.add_argument("--grid-size", type=int, default=64,
                        help="Grid resolution (default: 64)")
    parser.add_argument("--x-range", type=float, nargs=2, default=[-50, 50],
                        help="X range in meters (default: -50 50)")
    parser.add_argument("--y-range", type=float, nargs=2, default=[-50, 50],
                        help="Y range in meters (default: -50 50)")
    parser.add_argument("--max-samples", type=int, default=None,
                        help="Limit number of samples (default: all)")

    args = parser.parse_args()
    x_range = tuple(args.x_range)
    y_range = tuple(args.y_range)

    if args.raw_dir:
        grids = load_raw_pointclouds(args.raw_dir, args.grid_size, x_range, y_range)
    elif args.dataroot:
        grids = load_nuscenes_samples(
            args.dataroot, args.version, args.max_samples,
            args.grid_size, x_range, y_range
        )
    else:
        print("ERROR: provide either --dataroot (nuScenes) or --raw-dir (raw point clouds)")
        sys.exit(1)

    if len(grids) == 0:
        print("No grids generated. Check your data path.")
        sys.exit(1)

    print(f"\nExporting {len(grids)} grids ({args.grid_size}x{args.grid_size}x6)...")
    export_grids(grids, args.output, args.grid_size)
    print("Done.")


if __name__ == "__main__":
    main()
