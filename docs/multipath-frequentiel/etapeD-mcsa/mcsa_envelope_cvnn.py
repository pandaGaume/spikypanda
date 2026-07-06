"""
L3 — MCSA (variant B, envelope domain) on the REAL UFU broken-rotor-bar data.

The substrate reads the modulation (severity) in the LOW complex bins of the
64-step envelope spectrum — the L2 mechanism, on real current envelopes. Grades
5 severities (Healthy, BRB1..BRB4) with a tiny complex net, against a magnitude
MLP (phase-blind) and a raw MLP, and against the paper's published baselines.

Baselines to beat (MCSA-BRIEF): LSTM 88.0% (4773 p), FFT+SVM 81.5%, FFT+MLP 67% (773 p).

Run: python docs/multipath-frequentiel/etapeD-mcsa/mcsa_envelope_cvnn.py --seeds 5
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "h3", "python"))

import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn as nn  # noqa: E402

from complex_layers import ComplexLinear, ModReLU, count_params, safe_abs  # noqa: E402
from train import accuracy, confusion, per_class_recall, train_classifier  # noqa: E402
from mcsa_data import load_split  # noqa: E402

LOW_BINS = list(range(1, 9))  # skip DC (bin 0 = load-dependent mean); modulation lives here
CHANNELS = 3
K = 5


class MCSAEnvelopeCVNN(nn.Module):
    """FFT each envelope channel -> low complex bins -> complex layers -> |z| -> head."""

    def __init__(self, hidden_dims, low_bins=LOW_BINS, num_classes=K):
        super().__init__()
        self.register_buffer("low_bins", torch.tensor(low_bins, dtype=torch.long))
        dims = [len(low_bins) * CHANNELS] + list(hidden_dims)
        self.clayers = nn.ModuleList(ComplexLinear(dims[i], dims[i + 1]) for i in range(len(hidden_dims)))
        self.acts = nn.ModuleList(ModReLU(dims[i + 1]) for i in range(len(hidden_dims)))
        self.head = nn.Linear(hidden_dims[-1], num_classes)

    def forward(self, x):  # x: (B, 64, 3)
        z = torch.fft.fft(x, dim=1)[:, self.low_bins, :]  # (B, M, 3) complex
        z = z.reshape(x.shape[0], -1)  # (B, M*3) complex
        for cl, act in zip(self.clayers, self.acts):
            z = act(cl(z))
        return self.head(safe_abs(z))

    def num_params(self):
        return count_params(self)


class MagnitudeMLP_MCSA(nn.Module):
    def __init__(self, hidden_dims, low_bins=LOW_BINS, num_classes=K):
        super().__init__()
        self.register_buffer("low_bins", torch.tensor(low_bins, dtype=torch.long))
        dims = [len(low_bins) * CHANNELS] + list(hidden_dims) + [num_classes]
        layers = []
        for i in range(len(dims) - 1):
            layers.append(nn.Linear(dims[i], dims[i + 1]))
            if i < len(dims) - 2:
                layers.append(nn.ReLU())
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        mag = torch.fft.fft(x, dim=1)[:, self.low_bins, :].abs().reshape(x.shape[0], -1)
        return self.net(mag)

    def num_params(self):
        return count_params(self)


class RawMLP_MCSA(nn.Module):
    def __init__(self, hidden_dims, num_classes=K):
        super().__init__()
        dims = [64 * CHANNELS] + list(hidden_dims) + [num_classes]
        layers = []
        for i in range(len(dims) - 1):
            layers.append(nn.Linear(dims[i], dims[i + 1]))
            if i < len(dims) - 2:
                layers.append(nn.ReLU())
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x.reshape(x.shape[0], -1))

    def num_params(self):
        return count_params(self)


def binary_acc(model, x, y):
    """Healthy (0) vs Faulty (1..4)."""
    model.eval()
    with torch.no_grad():
        pred = model(x).argmax(1)
    return (((pred > 0).long()) == ((y > 0).long())).float().mean().item()


def split_train_val(x, y, val_frac=0.15, seed=0):
    g = torch.Generator().manual_seed(seed)
    perm = torch.randperm(x.shape[0], generator=g)
    n_val = int(x.shape[0] * val_frac)
    vi, ti = perm[:n_val], perm[n_val:]
    return (x[ti], y[ti]), (x[vi], y[vi])


def make_model(name, size="small"):
    if name == "cvnn":
        return MCSAEnvelopeCVNN(hidden_dims=[12] if size == "small" else [24, 16], low_bins=LOW_BINS if size == "small" else list(range(1, 13)))
    if name == "mlp_magnitude":
        return MagnitudeMLP_MCSA(hidden_dims=[16] if size == "small" else [40, 24])
    return RawMLP_MCSA(hidden_dims=[8])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=5)
    ap.add_argument("--size", type=str, default="small", choices=["small", "large"])
    ap.add_argument("--out", type=str, default=os.path.join(os.path.dirname(__file__), "results-envelope.json"))
    args = ap.parse_args()

    x_all, y_all, classes = load_split("train")
    x_te, y_te, _ = load_split("test")
    print(f"MCSA variant B (envelope) — train {x_all.shape[0]}, test {x_te.shape[0]}, classes {classes}")

    names = ("cvnn", "mlp_magnitude", "mlp_raw")
    res = {n: {"acc": [], "bin": [], "params": None, "recall": [], "cm": None} for n in names}
    for seed in range(args.seeds):
        (x_tr, y_tr), (x_val, y_val) = split_train_val(x_all, y_all, seed=seed)
        for name in names:
            m = make_model(name, args.size)
            train_classifier(m, x_tr, y_tr, x_val, y_val, seed=seed, max_epochs=200, lr=5e-3, patience=25)
            res[name]["acc"].append(accuracy(m, x_te, y_te))
            res[name]["bin"].append(binary_acc(m, x_te, y_te))
            cm = confusion(m, x_te, y_te, K)
            res[name]["recall"].append(per_class_recall(cm).tolist())
            res[name]["cm"] = cm.tolist()
            res[name]["params"] = m.num_params()

    print("\nbaselines (paper): LSTM 88.0% (4773p) · FFT+SVM 81.5% · FFT+MLP 67.0% (773p)\n")
    summary = {}
    for name in names:
        accs = np.array(res[name]["acc"]) * 100
        bins = np.array(res[name]["bin"]) * 100
        p = res[name]["params"]
        recall = np.mean(res[name]["recall"], axis=0)
        summary[name] = {
            "params": p, "acc_mean": float(accs.mean()), "acc_std": float(accs.std()),
            "acc_max": float(accs.max()), "binary_mean": float(bins.mean()),
            "acc_per_10k": float(accs.mean() / (p / 10000.0)),
            "recall": recall.round(3).tolist(), "confusion_last": res[name]["cm"],
        }
        print(f"  {name:14s} p={p:5d}  5cls={accs.mean():5.1f}±{accs.std():.1f}% (max {accs.max():.1f})  "
              f"bin={bins.mean():5.1f}%  acc/10k={summary[name]['acc_per_10k']:6.1f}  "
              f"recall(H,B1..B4)={[f'{r:.2f}' for r in recall]}")

    with open(args.out, "w") as f:
        json.dump({"classes": classes, "summary": summary}, f, indent=2)
    print(f"\n(results -> {args.out})")


if __name__ == "__main__":
    main()
