"""
L3 — TCN baseline on the MCSA envelope (variant B), a proper temporal topology.

The MLP-on-FFT-features ignores the temporal structure of the envelope; the
paper used an LSTM (88.0%, 4773 p) exactly to exploit it. A TCN (dilated causal
convolutions, Bai et al. 2018) is the modern feed-forward alternative to the
LSTM. This tests whether TOPOLOGY (temporal modeling) closes the gap the band
MLP left open.

Run: python docs/multipath-frequentiel/etapeD-mcsa/mcsa_tcn.py --seeds 5
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "h3", "python"))

import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn as nn  # noqa: E402

from train import accuracy, confusion, per_class_recall, train_classifier  # noqa: E402
from mcsa_data import load_split  # noqa: E402

K = 5


class Chomp1d(nn.Module):
    def __init__(self, n):
        super().__init__()
        self.n = n

    def forward(self, x):
        return x[:, :, : -self.n] if self.n > 0 else x


class TCNBlock(nn.Module):
    def __init__(self, c_in, c_out, k, dilation, dropout=0.1):
        super().__init__()
        pad = (k - 1) * dilation
        self.net = nn.Sequential(
            nn.Conv1d(c_in, c_out, k, padding=pad, dilation=dilation), Chomp1d(pad), nn.ReLU(), nn.Dropout(dropout),
            nn.Conv1d(c_out, c_out, k, padding=pad, dilation=dilation), Chomp1d(pad), nn.ReLU(), nn.Dropout(dropout),
        )
        self.down = nn.Conv1d(c_in, c_out, 1) if c_in != c_out else None

    def forward(self, x):
        out = self.net(x)
        res = x if self.down is None else self.down(x)
        return torch.relu(out + res)


class TCN(nn.Module):
    def __init__(self, c_in=3, channels=(16, 16, 16), k=3, num_classes=K):
        super().__init__()
        blocks = []
        prev = c_in
        for i, c in enumerate(channels):
            blocks.append(TCNBlock(prev, c, k, dilation=2 ** i))
            prev = c
        self.tcn = nn.Sequential(*blocks)
        self.head = nn.Linear(prev, num_classes)

    def forward(self, x):  # x: (B, 64, 3)
        h = self.tcn(x.transpose(1, 2))  # (B, C, 64)
        return self.head(h[:, :, -1])  # last timestep

    def num_params(self):
        return sum(p.numel() for p in self.parameters())


def split_train_val(x, y, val_frac=0.15, seed=0):
    g = torch.Generator().manual_seed(seed)
    perm = torch.randperm(x.shape[0], generator=g)
    nv = int(x.shape[0] * val_frac)
    return (x[perm[nv:]], y[perm[nv:]]), (x[perm[:nv]], y[perm[:nv]])


def binary_acc(model, x, y):
    model.eval()
    with torch.no_grad():
        pred = model(x).argmax(1)
    return (((pred > 0).long()) == ((y > 0).long())).float().mean().item()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=5)
    ap.add_argument("--channels", type=int, default=16)
    args = ap.parse_args()

    x_all, y_all, classes = load_split("train")
    x_te, y_te, _ = load_split("test")
    print(f"MCSA TCN (variant B envelope) — train {x_all.shape[0]}, test {x_te.shape[0]}")
    print("baselines (paper): LSTM 88.0% (4773p) · FFT+SVM 81.5% · FFT+MLP 67.0% · CVNN(env) 81%\n")

    accs, bins, recalls, cm_last, p = [], [], [], None, None
    for seed in range(args.seeds):
        (x_tr, y_tr), (x_val, y_val) = split_train_val(x_all, y_all, seed=seed)
        m = TCN(channels=(args.channels, args.channels, args.channels))
        p = m.num_params()
        train_classifier(m, x_tr, y_tr, x_val, y_val, seed=seed, max_epochs=200, lr=3e-3, patience=25)
        accs.append(accuracy(m, x_te, y_te) * 100)
        bins.append(binary_acc(m, x_te, y_te) * 100)
        cm = confusion(m, x_te, y_te, K)
        recalls.append(per_class_recall(cm))
        cm_last = cm.tolist()
    accs, bins = np.array(accs), np.array(bins)
    rec = np.mean(recalls, axis=0)
    print(f"  TCN            p={p:5d}  5cls={accs.mean():5.1f}±{accs.std():.1f}% (max {accs.max():.1f})  "
          f"bin={bins.mean():5.1f}%  acc/10k={accs.mean()/(p/10000):6.1f}  recall(H,B1..B4)={[f'{r:.2f}' for r in rec]}")

    out = os.path.join(os.path.dirname(__file__), "results-tcn.json")
    with open(out, "w") as f:
        json.dump({"params": p, "acc_mean": float(accs.mean()), "acc_std": float(accs.std()),
                   "acc_max": float(accs.max()), "binary_mean": float(bins.mean()),
                   "recall": rec.round(3).tolist(), "confusion_last": cm_last}, f, indent=2)
    print(f"\n(results -> {out})")


if __name__ == "__main__":
    main()
