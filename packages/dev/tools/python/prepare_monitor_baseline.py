"""
Compute a statistical baseline from healthy motor envelope data for
the Motor Monitor anomaly detection sample.

Produces two files:
  packages/host/www/data/motor_monitor/baseline.json  (~1 KB)
  packages/host/www/data/motor_monitor/streaming.json (~100 KB)

The baseline encodes the statistical fingerprint of normal operation.
The streaming file bundles healthy + BRB windows for the browser demo.

Usage:
    # From existing train/test JSON (simplest, no h5py needed):
    python prepare_monitor_baseline.py \
        --from-json ../../host/www/data/motor_current

    # From raw .mat files (reprocesses from scratch):
    python prepare_monitor_baseline.py \
        --source-dir ../../host/www/data/motor_current
"""

import os
import json
import argparse
import math
import random

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, "..", "..", "..", ".."))
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "packages", "host", "www", "data", "motor_monitor")

WINDOW_SIZE = 64
CHANNELS = 3
HEALTHY_LABEL = 0
STREAM_HEALTHY_COUNT = 150
STREAM_BRB_COUNT = 60


def getattr_like(feat_tuple, idx):
    """Access _win_features tuple by index: 0=stds, 1=ranges, 2=clips."""
    return feat_tuple[idx]


# ---------------------------------------------------------------------------
# Load windows from existing JSON
# ---------------------------------------------------------------------------

def load_windows_from_json(json_dir):
    """Load preprocessed windows from train.json and test.json."""
    healthy = []
    anomalous = []

    for fname in ["train.json", "test.json"]:
        fpath = os.path.join(json_dir, fname)
        if not os.path.exists(fpath):
            print(f"  Warning: {fpath} not found, skipping")
            continue
        with open(fpath) as f:
            data = json.load(f)
        for s in data["samples"]:
            if s["label"] == HEALTHY_LABEL:
                healthy.append(s["sequence"])
            else:
                anomalous.append(s["sequence"])
        print(f"  {fname}: {len(data['samples'])} samples")

    print(f"  Healthy: {len(healthy)}, Anomalous: {len(anomalous)}")
    return healthy, anomalous


# ---------------------------------------------------------------------------
# Compute baseline statistics
# ---------------------------------------------------------------------------

def _win_features(win, T, CH):
    """Compute 3 features per channel from one window: std, range, clip rate."""
    stds, ranges, clips = [], [], []
    for ch in range(CH):
        vals = [win[t][ch] for t in range(T)]
        m = sum(vals) / T
        std = math.sqrt(sum((v - m) ** 2 for v in vals) / T)
        rng = max(vals) - min(vals)
        clip = sum(1 for v in vals if v <= 0.001 or v >= 0.999) / T
        stds.append(std)
        ranges.append(rng)
        clips.append(clip)
    return stds, ranges, clips


def compute_baseline(healthy_windows):
    """Compute window-level statistics from healthy windows.

    Instead of per-timestep templates (which are noisy due to arbitrary
    phase alignment across windows), this stores the distribution of
    three per-window features: modulation std, peak-to-peak range, and
    clipping rate. Each feature has a mean and std per channel.

    Total storage: 18 floats (3 features x 3 channels x 2 stats) = 72
    bytes. Fits in any MCU.

    The anomaly score at runtime is the average z-score of these three
    features: how many standard deviations is this window's (std, range,
    clip) from the healthy mean? EMA smoothing over consecutive windows
    accumulates the weak per-window signal into a confident detection.
    """
    n = len(healthy_windows)
    T = WINDOW_SIZE

    # Collect per-window features
    all_stds = [[] for _ in range(CHANNELS)]
    all_ranges = [[] for _ in range(CHANNELS)]
    all_clips = [[] for _ in range(CHANNELS)]

    for win in healthy_windows:
        stds, ranges, clips = _win_features(win, T, CHANNELS)
        for ch in range(CHANNELS):
            all_stds[ch].append(stds[ch])
            all_ranges[ch].append(ranges[ch])
            all_clips[ch].append(clips[ch])

    def mean_std(vals):
        m = sum(vals) / len(vals)
        s = math.sqrt(sum((v - m) ** 2 for v in vals) / len(vals))
        return round(m, 6), round(max(s, 0.001), 6)

    features = {}
    for name, data in [("std", all_stds), ("range", all_ranges), ("clip", all_clips)]:
        means, sds = [], []
        for ch in range(CHANNELS):
            m, s = mean_std(data[ch])
            means.append(m)
            sds.append(s)
        features[name] = {"mean": means, "std": sds}

    return {
        "version": 2,
        "windowSize": T,
        "channels": CHANNELS,
        "channelNames": ["Ia", "Ib", "Ic"],
        "calibrationWindows": n,
        "features": features,
        "thresholds": {
            "warnScore": 1.5,
            "alarmScore": 2.5,
        },
    }


# ---------------------------------------------------------------------------
# Build streaming data for the browser demo
# ---------------------------------------------------------------------------

def build_streaming(healthy_windows, anomalous_windows):
    """Select a subset of healthy + anomalous windows for the demo stream.

    To simulate realistic operating conditions, the healthy windows are
    sorted by mean amplitude (proxy for load level) and a contiguous
    block from ONE load region is selected. This mimics the real use
    case: the ESP32 calibrates while the motor runs at a stable load,
    then detects drift when a fault develops at that same load.

    Mixing all loads into one baseline (as we did initially) washes out
    the fault signal because inter-load variance dominates.
    """
    # Filter healthy windows to a single operating regime by removing
    # outliers. Compute each window's features, keep only those within
    # 2.5 sigma of the healthy mean on ALL features. This simulates the
    # real use case: the motor runs at a stable load for an extended
    # period, and the monitor calibrates at that load.
    all_feats = [_win_features(w, WINDOW_SIZE, CHANNELS) for w in healthy_windows]
    feat_names = ["stds", "ranges", "clips"]

    # Compute per-feature mean + std across all healthy windows
    feat_stats = {}
    for fi, fname in enumerate(feat_names):
        for ch in range(CHANNELS):
            vals = [getattr_like(f, fi)[ch] for f in all_feats]
            m = sum(vals) / len(vals)
            s = math.sqrt(sum((v - m) ** 2 for v in vals) / len(vals))
            feat_stats[(fi, ch)] = (m, max(s, 0.001))

    # Keep only windows where all features are within 2.5 sigma
    filtered_h = []
    for i, w in enumerate(healthy_windows):
        f = all_feats[i]
        ok = True
        for fi in range(3):
            for ch in range(CHANNELS):
                v = getattr_like(f, fi)[ch]
                m, s = feat_stats[(fi, ch)]
                if abs(v - m) > 2.5 * s:
                    ok = False
                    break
            if not ok:
                break
        if ok:
            filtered_h.append(w)

    print(f"  Healthy windows: {len(healthy_windows)} total, "
          f"{len(filtered_h)} after outlier removal")

    # Shuffle the filtered healthy windows so calibration and monitoring
    # see the same load distribution. No sorting, no contiguous blocks.
    # This simulates steady-state operation where the motor stays at a
    # stable operating point (or the monitor has calibrated long enough
    # to cover the normal operating range).
    random.shuffle(filtered_h)
    count = min(STREAM_HEALTHY_COUNT, len(filtered_h))
    h_sample = filtered_h[:count]

    # For anomalous, take the highest-modulation BRB windows (strongest
    # fault signature). This ensures the demo shows a clear transition.
    def win_std(w):
        m = sum(w[t][0] for t in range(WINDOW_SIZE)) / WINDOW_SIZE
        return math.sqrt(sum((w[t][0] - m) ** 2 for t in range(WINDOW_SIZE)) / WINDOW_SIZE)

    anomalous_sorted = sorted(anomalous_windows, key=win_std, reverse=True)
    a_sample = anomalous_sorted[:STREAM_BRB_COUNT]
    random.shuffle(a_sample)

    def rnd(seq):
        return [[round(v, 4) for v in step] for step in seq]

    return {
        "windowSize": WINDOW_SIZE,
        "channels": CHANNELS,
        "calibrationCount": 80,
        "healthy": [{"sequence": rnd(w)} for w in h_sample],
        "anomalous": [{"sequence": rnd(w)} for w in a_sample],
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--from-json",
                       help="Directory containing train.json/test.json from "
                            "prepare_motor_current.py")
    group.add_argument("--source-dir",
                       help="Directory containing struct_*_R1.mat files "
                            "(reprocesses from scratch)")
    args = parser.parse_args()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    if args.from_json:
        print("Loading from preprocessed JSON...")
        healthy, anomalous = load_windows_from_json(args.from_json)
    else:
        # Import and reuse the UFU processing from prepare_motor_current
        print("Processing from raw .mat files...")
        import sys
        sys.path.insert(0, SCRIPT_DIR)
        from prepare_motor_current import (
            find_ufu_mat_files, collect_ufu_traces, compute_global_stats,
            create_sliding_windows, WINDOW_SIZE as WS, STRIDE,
            UFU_MIN_ENV_THRESHOLD, UFU_MOD_GAIN,
        )
        from prepare_motor_current import _normalize_window_centered

        mat_files = find_ufu_mat_files(args.source_dir)
        all_traces = []
        for fp in mat_files:
            all_traces.extend(collect_ufu_traces(fp))

        healthy = []
        anomalous = []
        for label, trace in all_traces:
            windows = create_sliding_windows(trace, WS, STRIDE)
            for raw_w in windows:
                mean_a = sum(step[0] for step in raw_w) / len(raw_w)
                if mean_a < UFU_MIN_ENV_THRESHOLD:
                    continue
                norm_w = _normalize_window_centered(raw_w, UFU_MOD_GAIN)
                rounded = [[round(v, 4) for v in step] for step in norm_w]
                if label == HEALTHY_LABEL:
                    healthy.append(rounded)
                else:
                    anomalous.append(rounded)

        print(f"  Healthy: {len(healthy)}, Anomalous: {len(anomalous)}")

    if not healthy:
        print("ERROR: No healthy windows found.")
        return

    # Compute baseline
    print(f"\nComputing baseline from {len(healthy)} healthy windows...")
    baseline = compute_baseline(healthy)

    # Print summary
    f = baseline["features"]
    for name in ["std", "range", "clip"]:
        m = f[name]["mean"]
        s = f[name]["std"]
        print(f"  {name:5s} mean: [{m[0]:.4f}, {m[1]:.4f}, {m[2]:.4f}]  "
              f"std: [{s[0]:.4f}, {s[1]:.4f}, {s[2]:.4f}]")

    # Score function: average z-score of (std, range, clip) across channels
    def score_window(win, bl):
        stds, ranges, clips = _win_features(win, WINDOW_SIZE, CHANNELS)
        z_sum, cnt = 0.0, 0
        for ch in range(CHANNELS):
            z_sum += abs(stds[ch] - bl["features"]["std"]["mean"][ch]) / bl["features"]["std"]["std"][ch]
            z_sum += abs(ranges[ch] - bl["features"]["range"]["mean"][ch]) / bl["features"]["range"]["std"][ch]
            z_sum += abs(clips[ch] - bl["features"]["clip"]["mean"][ch]) / bl["features"]["clip"]["std"][ch]
            cnt += 3
        return z_sum / cnt

    # Simulate the browser demo: calibrate on the first 20 streaming
    # healthy windows (same load region), then test against BRB windows
    # from the same load region.
    streaming = build_streaming(healthy, anomalous)
    cal_count = streaming["calibrationCount"]
    cal_windows = [w["sequence"] for w in streaming["healthy"][:cal_count]]

    # Build online baseline from calibration windows only
    online_bl = compute_baseline(cal_windows)
    obl_f = online_bl["features"]
    print(f"\n  Online baseline (from {cal_count} same-load healthy windows):")
    for name in ["std", "range", "clip"]:
        m = obl_f[name]["mean"]
        s = obl_f[name]["std"]
        print(f"    {name:5s} mean: [{m[0]:.4f}, {m[1]:.4f}, {m[2]:.4f}]  "
              f"std: [{s[0]:.4f}, {s[1]:.4f}, {s[2]:.4f}]")

    # Score remaining healthy + all anomalous against the online baseline
    def score_w(win):
        return score_window(win, online_bl)

    rest_h = [w["sequence"] for w in streaming["healthy"][cal_count:]]
    all_a = [w["sequence"] for w in streaming["anomalous"]]
    h_scores = [score_w(w) for w in rest_h]
    a_scores = [score_w(w) for w in all_a]
    h_avg = sum(h_scores) / len(h_scores) if h_scores else 0
    a_avg = sum(a_scores) / len(a_scores) if a_scores else 0
    print(f"\n  Same-load scoring:")
    print(f"    Healthy: mean={h_avg:.2f}")
    if a_scores:
        print(f"    BRB:     mean={a_avg:.2f}")
        print(f"    Separation: {a_avg / max(h_avg, 0.01):.2f}x")

    # EMA simulation
    print(f"\n  EMA simulation (alpha=0.3, {len(rest_h)} healthy then {min(20, len(all_a))} BRB):")
    stream_all = rest_h + all_a[:20]
    ema = 0.0
    alpha = 0.3
    warn = online_bl["thresholds"]["warnScore"]
    alarm = online_bl["thresholds"]["alarmScore"]
    for i, w in enumerate(stream_all):
        raw = score_w(w)
        ema = alpha * raw + (1 - alpha) * ema
        phase = "H" if i < len(rest_h) else "B"
        status = "NORMAL"
        if ema >= alarm: status = "ALARM"
        elif ema >= warn: status = "WARN "
        if i % 5 == 0 or status != "NORMAL":
            print(f"    [{phase}] win {i:2d}: raw={raw:.2f} ema={ema:.2f} [{status}]")

    # Write baseline
    bl_path = os.path.join(OUTPUT_DIR, "baseline.json")
    with open(bl_path, "w") as f:
        json.dump(baseline, f)
    print(f"\nWritten: {bl_path} ({os.path.getsize(bl_path)} bytes)")

    # Build and write streaming data
    streaming = build_streaming(healthy, anomalous)
    st_path = os.path.join(OUTPUT_DIR, "streaming.json")
    with open(st_path, "w") as f:
        json.dump(streaming, f)
    print(f"Written: {st_path} ({os.path.getsize(st_path) // 1024} KB)")
    print("Done.")


if __name__ == "__main__":
    main()
