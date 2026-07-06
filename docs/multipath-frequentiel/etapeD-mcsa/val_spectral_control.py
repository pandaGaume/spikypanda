"""
STATIC-SPECTRAL CONTROL for the 5-class broken-rotor-bar grading task
(variant B envelope: 64 timesteps, 3 channels Ia/Ib/Ic, values in [0,1]).

WHY THIS SCRIPT EXISTS
----------------------
This is a deliberate CONTROL, not a contender. It takes ONE Fourier snapshot of
the whole 64-step envelope (rfft over time), keeps the low complex bins where the
broken-bar 2sf modulation sidebands live, and grades severity from that single
snapshot with a small complex layer. There is NO temporal recurrence: the whole
time axis is collapsed into one spectrum before any learning happens.

The point is to show this SNAPSHOT model plateaus below the recurrent / modal-
temporal models. If it plateaus (~81-85%) while a temporal model reaches ~88%,
then the win comes from KEEPING TIME, not from the complex/spectral representation
alone: this control already has the full complex spectral representation and the
same phase-preserving complex machinery, and only lacks temporal processing.

PROTOCOL (strict)
-----------------
- Split TRAIN into train/val 85/15 with a seeded permutation; early-stop on VAL.
- Model / hidden size selected by VALIDATION accuracy ONLY (never test).
- Report TEST accuracy over seeds 0..4. Params = sum(p.numel()) (complex = 2).

Run: PYTHONIOENCODING=utf-8 python docs/multipath-frequentiel/etapeD-mcsa/val_spectral_control.py
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "h3", "python"))

import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn as nn  # noqa: E402

from complex_layers import ComplexLinear, ModReLU, count_params, safe_abs  # noqa: E402
from train import accuracy, confusion, per_class_recall, train_classifier  # noqa: E402
from mcsa_data import load_split  # noqa: E402

# Skip DC (bin 0 = load-dependent envelope mean). The 2sf broken-bar modulation
# and its sidebands live in the low rfft bins of the 64-point envelope spectrum.
LOW_BINS = list(range(1, 9))  # 8 low bins
CHANNELS = 3
K = 5


class StaticSpectralControl(nn.Module):
    """One rfft snapshot -> low complex bins -> ComplexLinear -> ModReLU -> |z| -> Linear -> 5 logits.

    No recurrence, no per-step processing: the time axis is destroyed by a single
    rfft before the first learnable weight. This is the SNAPSHOT baseline.
    """

    def __init__(self, hidden, low_bins=LOW_BINS, num_classes=K):
        super().__init__()
        self.register_buffer("low_bins", torch.tensor(low_bins, dtype=torch.long))
        c_in = len(low_bins) * CHANNELS  # complex features fed to the complex layer
        self.clayer = ComplexLinear(c_in, hidden)
        self.act = ModReLU(hidden)
        self.head = nn.Linear(hidden, num_classes)

    def forward(self, x):  # x: (B, 64, 3) real, values in [0,1]
        # rfft over TIME (dim=1): (B, 33, 3) complex. Keep the low modulation bins.
        z = torch.fft.rfft(x, dim=1)[:, self.low_bins, :]  # (B, M, 3) complex
        z = z.reshape(x.shape[0], -1)  # (B, M*3) complex
        z = self.act(self.clayer(z))  # complex -> complex
        return self.head(safe_abs(z))  # magnitude readout -> real head

    def num_params(self):
        return count_params(self)


def split_train_val(x, y, val_frac=0.15, seed=0):
    """85/15 train/val split via a seeded permutation. Early-stop uses VAL only."""
    g = torch.Generator().manual_seed(seed)
    perm = torch.randperm(x.shape[0], generator=g)
    n_val = int(x.shape[0] * val_frac)
    vi, ti = perm[:n_val], perm[n_val:]
    return (x[ti], y[ti]), (x[vi], y[vi])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=5)
    ap.add_argument("--out", type=str,
                    default=os.path.join(os.path.dirname(__file__), "results-spectral-control.json"))
    args = ap.parse_args()

    x_all, y_all, classes = load_split("train")
    x_te, y_te, _ = load_split("test")
    print("STATIC-SPECTRAL CONTROL (snapshot, no temporal recurrence)")
    print("train {}  test {}  classes {}".format(x_all.shape[0], x_te.shape[0], classes))
    print("baselines: LSTM 88.0% (~4773p) | TCN ~81% | MLP|FFT| ~85%\n")

    # Hidden-size candidates. ALL selection is by VALIDATION accuracy, never test.
    # Param budget check (c_in=24): ComplexLinear = 2*(24*H + H); ModReLU = H;
    # head = 5*H + 5.  H=8 ->  8+400+  ... small;  H=24 -> ~1550p  (<= ~2000).
    hidden_grid = [8, 12, 16, 20, 24]

    per_seed_val = {h: [] for h in hidden_grid}
    per_seed_test = {h: [] for h in hidden_grid}
    per_seed_recall = {h: [] for h in hidden_grid}
    per_seed_cm = {h: None for h in hidden_grid}
    params_of = {}

    for seed in range(args.seeds):
        (x_tr, y_tr), (x_val, y_val) = split_train_val(x_all, y_all, seed=seed)
        for h in hidden_grid:
            m = StaticSpectralControl(hidden=h)
            params_of[h] = m.num_params()
            train_classifier(m, x_tr, y_tr, x_val, y_val, seed=seed,
                             max_epochs=200, lr=3e-3, patience=25, weight_decay=0.0)
            per_seed_val[h].append(accuracy(m, x_val, y_val))
            per_seed_test[h].append(accuracy(m, x_te, y_te))
            cm = confusion(m, x_te, y_te, K)
            per_seed_recall[h].append(per_class_recall(cm).tolist())
            per_seed_cm[h] = cm.tolist()

    # ---- MODEL SELECTION: by mean VALIDATION accuracy across seeds. ----
    val_mean = {h: float(np.mean(per_seed_val[h])) for h in hidden_grid}
    # Tie-break: prefer smaller model (fewer params) at equal val accuracy.
    best_h = max(hidden_grid, key=lambda h: (round(val_mean[h], 6), -params_of[h]))

    print("hidden  params   val_mean%   test_mean%+-std   (val used for selection)")
    for h in hidden_grid:
        vt = np.array(per_seed_test[h]) * 100
        marker = "  <== selected" if h == best_h else ""
        print("  H={:<3d}  p={:<5d}  val={:5.1f}   test={:5.1f}+-{:4.1f}{}".format(
            h, params_of[h], val_mean[h] * 100, vt.mean(), vt.std(), marker))

    accs = np.array(per_seed_test[best_h]) * 100
    recall = np.mean(per_seed_recall[best_h], axis=0)
    p = params_of[best_h]
    print("\nSELECTED (by val): H={}  params={}".format(best_h, p))
    print("  TEST acc over seeds 0..{}: {:.1f}+-{:.1f}%  (max {:.1f}, min {:.1f})".format(
        args.seeds - 1, accs.mean(), accs.std(), accs.max(), accs.min()))
    print("  per-seed test: {}".format([round(float(a), 1) for a in accs]))
    print("  per-class recall (H,B1,B2,B3,B4): {}".format([round(float(r), 3) for r in recall]))

    summary = {
        "selected_hidden": best_h,
        "params": p,
        "val_mean_selected": val_mean[best_h],
        "test_acc_mean": float(accs.mean()),
        "test_acc_std": float(accs.std()),
        "test_acc_max": float(accs.max()),
        "test_acc_min": float(accs.min()),
        "test_acc_per_seed": [float(a) for a in accs],
        "per_class_recall": recall.round(4).tolist(),
        "confusion_last_seed": per_seed_cm[best_h],
        "grid": {str(h): {"params": params_of[h],
                          "val_mean": val_mean[h],
                          "test_mean": float(np.mean(per_seed_test[h]) * 100),
                          "test_std": float(np.std(per_seed_test[h]) * 100)}
                 for h in hidden_grid},
    }
    with open(args.out, "w") as f:
        json.dump({"classes": classes, "summary": summary}, f, indent=2)
    print("\n(results -> {})".format(args.out))


if __name__ == "__main__":
    main()
