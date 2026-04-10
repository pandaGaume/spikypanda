"""
Generate publication-quality figures for the MCSA broken rotor bar paper.

Produces 6 PDF figures in the output directory:
  fig1_pipeline.pdf         — 4-panel processing pipeline overview
  fig2_before_after.pdf     — 2x2 raw vs. envelope comparison
  fig3_ablation.pdf         — bar chart of accuracy per pipeline variant
  fig4_pareto.pdf           — accuracy vs. model size (log-scale)
  fig5_confusion.pdf        — 5x5 confusion matrix heatmap
  fig6_training_curves.pdf  — loss vs. epoch for all 4 attempts

Usage:
    pip install matplotlib numpy h5py
    python generate_mcsa_figures.py \
        --data-dir ../../host/www/data/motor_current \
        --output-dir ../../../../docs/research/figures
"""

import os
import sys
import json
import argparse
import numpy as np

# ---------------------------------------------------------------------------
# Constants (mirrored from prepare_motor_current.py)
# ---------------------------------------------------------------------------
RAW_RATE_HZ = 55611.0
LINE_FREQ_HZ = 60.0
HALF_CYCLE_SAMPLES = 463      # UFU_RAW_HALF_CYCLE
ENV_DECIMATE = 927            # UFU_ENV_DECIMATE
TRANSIENT_SKIP = 360          # UFU_TRANSIENT_SKIP (envelope samples)
MOD_GAIN = 6.0                # UFU_MOD_GAIN
WINDOW_SIZE = 64
CLASS_NAMES = ["Healthy", "BRB1", "BRB2", "BRB3", "BRB4"]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def moving_rms(signal, window):
    """Vectorized moving RMS."""
    sq = signal.astype(np.float64) ** 2
    cs = np.concatenate(([0.0], np.cumsum(sq)))
    sums = cs[window:] - cs[:-window]
    return np.sqrt(sums / window)


def load_raw_phase_a(mat_path, rotor_key, load="torque40", rep=0):
    """Load raw phase-A current from one UFU .mat file."""
    import h5py
    with h5py.File(mat_path, "r") as f:
        refs = f[f"{rotor_key}/{load}/Ia"][:]
        return f[refs[rep, 0]][:].flatten()


def envelope_pipeline(raw_ia):
    """Run the full envelope pipeline on a raw phase-A trace.
    Returns (env_full, env_decimated, env_skipped, window_centered).
    """
    env_full = moving_rms(raw_ia, HALF_CYCLE_SAMPLES)
    env_dec = env_full[::ENV_DECIMATE]
    env_skip = env_dec[TRANSIENT_SKIP:]
    # Take one window from the middle of the steady-state
    mid = len(env_skip) // 2
    win = env_skip[mid:mid + WINDOW_SIZE]
    win_mean = np.mean(win)
    win_centered = np.clip((win - win_mean) * MOD_GAIN + 0.5, 0, 1)
    return env_full, env_dec, env_skip, win_centered


def setup_style():
    """Set publication-quality matplotlib defaults."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.rcParams.update({
        "font.family": "serif",
        "font.size": 9,
        "axes.labelsize": 10,
        "axes.titlesize": 11,
        "xtick.labelsize": 8,
        "ytick.labelsize": 8,
        "legend.fontsize": 8,
        "figure.dpi": 150,
        "savefig.dpi": 200,
        "savefig.bbox": "tight",
        "savefig.pad_inches": 0.05,
    })
    return plt


# Output format: "png" or "svg". PNG embeds well in markdown docs;
# SVG is vector and scales perfectly but produces larger files.
OUTPUT_FMT = "png"


# ---------------------------------------------------------------------------
# Figure 1 — Pipeline overview (4 panels)
# ---------------------------------------------------------------------------

def fig1_pipeline(plt, data_dir, out_dir):
    mat_path = os.path.join(data_dir, "struct_r4b_R1.mat")
    if not os.path.exists(mat_path):
        print("  SKIP fig1: struct_r4b_R1.mat not found")
        return
    raw = load_raw_phase_a(mat_path, "r4b", "torque40", 0)
    env_full, env_dec, env_skip, win_centered = envelope_pipeline(raw)

    fig, axes = plt.subplots(4, 1, figsize=(7, 8))

    # (a) Raw current — show ~17 ms (1000 samples) from steady state
    start_raw = int(8 * RAW_RATE_HZ)  # 8 seconds in
    n_show = 1000
    t_raw = np.arange(n_show) / RAW_RATE_HZ * 1000  # ms
    axes[0].plot(t_raw, raw[start_raw:start_raw + n_show], linewidth=0.5,
                 color="#2060A0")
    axes[0].set_ylabel("Current (A)")
    axes[0].set_xlabel("Time (ms)")
    axes[0].set_title("(a) Raw stator current Ia at 55.6 kHz — BRB4, full load")

    # (b) Envelope (moving RMS) — same time range
    env_rate = RAW_RATE_HZ  # env_full is at raw rate
    start_env = start_raw
    t_env = np.arange(n_show) / env_rate * 1000
    axes[1].plot(t_env, env_full[start_env:start_env + n_show],
                 linewidth=1.0, color="#D04020")
    axes[1].set_ylabel("RMS envelope (A)")
    axes[1].set_xlabel("Time (ms)")
    axes[1].set_title("(b) After moving-RMS over half-cycle (463 samples)")

    # (c) Decimated envelope — show ~2 seconds of steady state
    env_hz = RAW_RATE_HZ / ENV_DECIMATE
    n_show_dec = int(2.0 * env_hz)
    start_dec = TRANSIENT_SKIP + 60  # a bit past skip
    t_dec = np.arange(n_show_dec) / env_hz
    axes[2].plot(t_dec, env_skip[60:60 + n_show_dec],
                 linewidth=1.0, color="#D04020")
    axes[2].set_ylabel("RMS envelope (A)")
    axes[2].set_xlabel("Time (s)")
    axes[2].set_title(f"(c) Decimated to {env_hz:.0f} Hz, transient skipped")

    # (d) Centered window — 64 steps
    t_win = np.arange(WINDOW_SIZE) / env_hz
    axes[3].plot(t_win, win_centered, linewidth=1.2, color="#208040")
    axes[3].axhline(0.5, color="gray", linestyle="--", linewidth=0.5)
    axes[3].set_ylim(-0.05, 1.05)
    axes[3].set_ylabel("Normalized")
    axes[3].set_xlabel("Time (s)")
    axes[3].set_title(f"(d) Per-window centered + gain x{MOD_GAIN:.0f}")

    fig.tight_layout(h_pad=1.5)
    path = os.path.join(out_dir, f"fig1_pipeline.{OUTPUT_FMT}")
    fig.savefig(path)
    plt.close(fig)
    print(f"  Saved {path}")


# ---------------------------------------------------------------------------
# Figure 2 — Before/after preprocessing (2x2)
# ---------------------------------------------------------------------------

def fig2_before_after(plt, data_dir, out_dir):
    healthy_path = os.path.join(data_dir, "struct_rs_R1.mat")
    brb4_path = os.path.join(data_dir, "struct_r4b_R1.mat")
    if not os.path.exists(healthy_path) or not os.path.exists(brb4_path):
        print("  SKIP fig2: .mat files not found")
        return

    raw_h = load_raw_phase_a(healthy_path, "rs", "torque40", 0)
    raw_b = load_raw_phase_a(brb4_path, "r4b", "torque40", 0)
    _, _, _, win_h = envelope_pipeline(raw_h)
    _, _, _, win_b = envelope_pipeline(raw_b)

    fig, axes = plt.subplots(2, 2, figsize=(7, 5))

    # Top row: raw current (~20 ms from steady state)
    start = int(8 * RAW_RATE_HZ)
    n = 1100
    t_ms = np.arange(n) / RAW_RATE_HZ * 1000
    for ax, raw, title in [(axes[0, 0], raw_h, "Raw Ia — Healthy, full load"),
                           (axes[0, 1], raw_b, "Raw Ia — BRB4, full load")]:
        ax.plot(t_ms, raw[start:start + n], linewidth=0.4, color="#2060A0")
        ax.set_ylabel("Current (A)")
        ax.set_xlabel("Time (ms)")
        ax.set_title(title, fontsize=9)

    # Bottom row: centered envelope windows
    env_hz = RAW_RATE_HZ / ENV_DECIMATE
    t_win = np.arange(WINDOW_SIZE) / env_hz
    for ax, win, title in [(axes[1, 0], win_h, "Centered envelope — Healthy"),
                           (axes[1, 1], win_b, "Centered envelope — BRB4")]:
        ax.plot(t_win, win, linewidth=1.2, color="#208040")
        ax.axhline(0.5, color="gray", linestyle="--", linewidth=0.5)
        ax.set_ylim(-0.05, 1.05)
        ax.set_ylabel("Normalized")
        ax.set_xlabel("Time (s)")
        ax.set_title(title, fontsize=9)

    fig.tight_layout()
    path = os.path.join(out_dir, f"fig2_before_after.{OUTPUT_FMT}")
    fig.savefig(path)
    plt.close(fig)
    print(f"  Saved {path}")


# ---------------------------------------------------------------------------
# Figure 3 — Ablation study (bar chart)
# ---------------------------------------------------------------------------

def fig3_ablation(plt, out_dir):
    labels = [
        "Raw current\nper-trace norm\n(Attempt 1)",
        "Raw current\nglobal norm, 256-step\n(Attempt 2)",
        "RMS envelope\nglobal min/max\n(Attempt 3)",
        "RMS envelope\ncentered + gain\n(Attempt 4)",
    ]
    accuracies = [26.8, 16.0, 35.0, 78.3]
    colors = ["#CC4444", "#CC4444", "#DDAA33", "#228833"]

    fig, ax = plt.subplots(figsize=(6, 3.5))
    bars = ax.bar(range(len(labels)), accuracies, color=colors,
                  edgecolor="black", linewidth=0.5, width=0.65)
    ax.set_xticks(range(len(labels)))
    ax.set_xticklabels(labels, fontsize=7.5)
    ax.set_ylabel("Accuracy (%)")
    ax.set_title("Ablation: Impact of preprocessing on classification accuracy")
    ax.set_ylim(0, 100)
    ax.axhline(20, color="gray", linestyle=":", linewidth=0.8, label="Chance (20%)")
    ax.legend(loc="upper left", framealpha=0.8)

    # Annotate values on bars
    for bar, val in zip(bars, accuracies):
        ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 1.5,
                f"{val}%", ha="center", va="bottom", fontsize=9,
                fontweight="bold")

    fig.tight_layout()
    path = os.path.join(out_dir, f"fig3_ablation.{OUTPUT_FMT}")
    fig.savefig(path)
    plt.close(fig)
    print(f"  Saved {path}")


# ---------------------------------------------------------------------------
# Figure 4 — Accuracy vs. model size (Pareto frontier)
# ---------------------------------------------------------------------------

def fig4_pareto(plt, out_dir):
    models = [
        ("VGG-19\n[2]",         143_700_000, 99.4),
        ("ResNet-152\n[2]",      60_200_000, 98.8),
        ("NASNet-Mobile\n[2]",    5_300_000, 96.2),
        ("CNN-LSTM\n[3]",          100_000,  92.3),
        ("This work",               4_773,  78.3),
    ]

    fig, ax = plt.subplots(figsize=(6, 4))

    for name, params, acc in models:
        marker = "D" if "This" in name else "o"
        color = "#CC2222" if "This" in name else "#2060A0"
        size = 100 if "This" in name else 50
        zorder = 10 if "This" in name else 5
        ax.scatter(params, acc, s=size, marker=marker, color=color,
                   edgecolors="black", linewidth=0.5, zorder=zorder)
        offset_x = 1.3 if "This" not in name else 0.3
        ax.annotate(name, (params, acc),
                    textcoords="offset points", xytext=(8, -4),
                    fontsize=7, ha="left")

    # Efficiency frontier (dashed)
    frontier_params = [4_773, 100_000, 5_300_000, 143_700_000]
    frontier_acc = [78.3, 92.3, 96.2, 99.4]
    ax.plot(frontier_params, frontier_acc, "--", color="gray",
            linewidth=0.8, alpha=0.6, zorder=1)

    ax.set_xscale("log")
    ax.set_xlabel("Number of parameters (log scale)")
    ax.set_ylabel("Accuracy (%)")
    ax.set_title("Accuracy vs. model size — broken rotor bar detection")
    ax.set_ylim(70, 101)
    ax.set_xlim(1e3, 5e8)
    ax.grid(True, alpha=0.3, which="both")

    # Annotate the region
    ax.annotate("Edge / TinyML\nfeasible region",
                xy=(2e4, 73), fontsize=8, fontstyle="italic",
                color="#666666", ha="center")

    fig.tight_layout()
    path = os.path.join(out_dir, f"fig4_pareto.{OUTPUT_FMT}")
    fig.savefig(path)
    plt.close(fig)
    print(f"  Saved {path}")


# ---------------------------------------------------------------------------
# Figure 5 — Confusion matrix (5x5 heatmap)
# ---------------------------------------------------------------------------

def fig5_confusion(plt, out_dir):
    # From the 78.3% run: LSTM h=32, 80 epochs
    cm = np.array([
        [79,  1,  0,  0,  0],
        [19, 61,  6,  4,  0],
        [ 3,  4, 50, 19,  1],
        [ 1,  0, 12, 67,  1],
        [ 0,  1,  0, 15, 56],
    ])

    fig, ax = plt.subplots(figsize=(5, 4.2))
    im = ax.imshow(cm, cmap="YlOrRd", aspect="equal")

    ax.set_xticks(range(5))
    ax.set_yticks(range(5))
    ax.set_xticklabels(CLASS_NAMES, fontsize=8)
    ax.set_yticklabels(CLASS_NAMES, fontsize=8)
    ax.set_xlabel("Predicted")
    ax.set_ylabel("Actual")
    ax.set_title("Confusion matrix — LSTM h=32, 80 epochs (78.3%)")

    # Annotate cells
    for i in range(5):
        for j in range(5):
            val = cm[i, j]
            color = "white" if val > 40 else "black"
            ax.text(j, i, str(val), ha="center", va="center",
                    fontsize=10, fontweight="bold", color=color)

    fig.colorbar(im, ax=ax, shrink=0.8, label="Count")
    fig.tight_layout()
    path = os.path.join(out_dir, f"fig5_confusion.{OUTPUT_FMT}")
    fig.savefig(path)
    plt.close(fig)
    print(f"  Saved {path}")


# ---------------------------------------------------------------------------
# Figure 6 — Training curves (loss vs. epoch, 4 lines)
# ---------------------------------------------------------------------------

def fig6_training_curves(plt, out_dir):
    # Hard-coded from the user's training logs across 4 attempts
    attempt1 = [
        0.125240, 0.112857, 0.111899, 0.111313, 0.114290,
        0.122396, 0.114424, 0.110717, 0.113786, 0.123645,
        0.122590, 0.127560, 0.127374, 0.122264, 0.122760,
        0.127494, 0.129468, 0.131342, 0.133560, 0.139718,
        0.138295, 0.139137, 0.141913, 0.144681, 0.139652,
    ]
    attempt2 = [
        0.407358, 0.404259, 0.403519, 0.402979, 0.402581,
        0.402281, 0.402046, 0.401862, 0.401714, 0.401596,
        0.401498, 0.401415, 0.401346, 0.401289, 0.401241,
        0.401201, 0.401168, 0.401141, 0.401117, 0.401096,
        0.401078, 0.401060, 0.401044, 0.401028, 0.401013,
    ]
    attempt3 = [
        0.411157, 0.404344, 0.401568, 0.399709, 0.398227,
        0.397049, 0.395947, 0.394943, 0.393937, 0.392812,
        0.392019, 0.391472, 0.390779, 0.390172, 0.388914,
        0.388367, 0.387126, 0.387402, 0.386253, 0.386066,
        0.385496, 0.385543, 0.385144, 0.385091, 0.385788,
    ]
    attempt4 = [
        0.414283, 0.409402, 0.407794, 0.406474, 0.405162,
        0.404465, 0.404236, 0.402880, 0.405275, 0.404445,
        0.389608, 0.375067, 0.371848, 0.368519, 0.369191,
        0.372258, 0.377233, 0.382307, 0.383105, 0.380611,
        0.380394, 0.373272, 0.371265, 0.357373, 0.369679,
        0.353365, 0.349561, 0.354881, 0.340957, 0.334233,
        0.328946, 0.354351, 0.319648, 0.334000, 0.325675,
        0.334809, 0.354864, 0.357683, 0.326279, 0.351619,
        0.367685, 0.349806, 0.344829, 0.353066, 0.332943,
        0.313180, 0.316460, 0.321602, 0.306147, 0.305983,
        0.315173, 0.304438, 0.306704, 0.295865, 0.299511,
        0.303775, 0.296111, 0.293214, 0.287705, 0.299011,
        0.306251, 0.307981, 0.295686, 0.301443, 0.295269,
        0.304386, 0.305149, 0.311109, 0.319110, 0.319984,
        0.315227, 0.313775, 0.286889, 0.283727, 0.282212,
        0.281374, 0.267978, 0.268687, 0.280212, 0.281606,
    ]

    fig, ax = plt.subplots(figsize=(7, 3.5))

    ax.plot(range(1, 26), attempt1, "x-", color="#CC4444",
            linewidth=1.0, markersize=3,
            label="Att. 1: Raw, per-trace norm (26.8%)")
    ax.plot(range(1, 26), attempt2, "s-", color="#CC8800",
            linewidth=1.0, markersize=3,
            label="Att. 2: Raw, global norm, 256-step (16.0%)")
    ax.plot(range(1, 26), attempt3, "^-", color="#888888",
            linewidth=1.0, markersize=3,
            label="Att. 3: Envelope, global min/max (35.0%)")
    ax.plot(range(1, 81), attempt4, "o-", color="#228833",
            linewidth=1.0, markersize=2,
            label="Att. 4: Envelope, centered (78.3%)")

    ax.set_xlabel("Epoch")
    ax.set_ylabel("Average training loss (MSE)")
    ax.set_title("Training curves across 4 preprocessing attempts")
    ax.legend(fontsize=7, loc="upper right", framealpha=0.9)
    ax.set_xlim(0, 82)
    ax.set_ylim(0.05, 0.45)
    ax.grid(True, alpha=0.3)

    fig.tight_layout()
    path = os.path.join(out_dir, f"fig6_training_curves.{OUTPUT_FMT}")
    fig.savefig(path)
    plt.close(fig)
    print(f"  Saved {path}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data-dir", required=True,
                        help="Directory containing struct_*_R1.mat files")
    parser.add_argument("--output-dir", required=True,
                        help="Output directory for PDF figures")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    try:
        plt = setup_style()
    except ImportError:
        print("ERROR: matplotlib is required. Install with: pip install matplotlib")
        sys.exit(1)

    print("Generating MCSA paper figures...")
    fig1_pipeline(plt, args.data_dir, args.output_dir)
    fig2_before_after(plt, args.data_dir, args.output_dir)
    fig3_ablation(plt, args.output_dir)
    fig4_pareto(plt, args.output_dir)
    fig5_confusion(plt, args.output_dir)
    fig6_training_curves(plt, args.output_dir)
    print("Done.")


if __name__ == "__main__":
    main()
