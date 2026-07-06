"""
L3 — the multi-frequency SUBSTRATE, three faithful forms, compared on the MCSA
envelope (variant B) against the baselines.

Motivation (topology + the substrate matter):
  (1) STRUCTURED SpectralSynapse  — per-band diagonal complex transfer (gain/phase)
      + a sparse carrier(DC)->band coupling, the project's COMPACT primitive (H5),
      instead of a dense ComplexLinear.
  (2) BILINEAR coupling           — explicit conj(carrier) * band products, the
      NON-linear "read the coupling strength = modulation depth = severity" (H4)
      that a purely linear layer cannot compute.
  (3) HYBRID substrate + temporal — spectral bands (substrate) fused with a small
      TCN over the envelope (topology).

Baselines: dense CVNN, magnitude MLP, TCN. Run:
  python docs/multipath-frequentiel/etapeD-mcsa/mcsa_substrate_compare.py --seeds 5
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
from mcsa_tcn import TCN  # noqa: E402

K = 5
BINS = list(range(0, 11))  # DC (0) + modulation band (1..10) of the 64-pt envelope FFT
DC = 0  # DC bin = carrier/reference of the envelope


def bands(x):
    """(B,64,3) real envelope -> (B, len(BINS), 3) complex low-band spectrum."""
    return torch.fft.fft(x, dim=1)[:, BINS, :]


class DenseCVNN(nn.Module):  # generic complex layer (reference)
    def __init__(self, h=6):
        super().__init__()
        d = len(BINS) * 3
        self.cl, self.act, self.head = ComplexLinear(d, h), ModReLU(h), nn.Linear(h, K)

    def forward(self, x):
        z = bands(x).reshape(x.shape[0], -1)
        return self.head(safe_abs(self.act(self.cl(z))))

    def num_params(self):
        return count_params(self)


class StructuredSpectral(nn.Module):  # (1) compact SpectralSynapse: diag gain/phase + DC coupling
    def __init__(self):
        super().__init__()
        m, c = len(BINS), 3
        self.w = nn.Parameter(torch.view_as_complex((torch.randn(m, c, 2) * 0.3).contiguous()))  # per-band transfer
        self.coup = nn.Parameter(torch.view_as_complex((torch.randn(m, c, 2) * 0.1).contiguous()))  # carrier->band
        self.act = ModReLU(m * c)
        self.head = nn.Linear(m * c, K)

    def forward(self, x):
        z = bands(x)  # (B,m,3)
        zp = self.w * z + self.coup * z[:, DC : DC + 1, :]  # diagonal transfer + carrier coupling
        return self.head(safe_abs(self.act(zp.reshape(x.shape[0], -1))))

    def num_params(self):
        return count_params(self)


class BilinearCoupling(nn.Module):  # (2) H4: conj(carrier)*band products (non-linear coupling reading)
    def __init__(self, h=12):
        super().__init__()
        m = len(BINS)
        self.net = nn.Sequential(nn.Linear(2 * m * 3, h), nn.ReLU(), nn.Linear(h, K))

    def forward(self, x):
        z = bands(x)  # (B,m,3)
        coup = torch.conj(z[:, DC : DC + 1, :]) * z  # (B,m,3) complex = coupling term
        feat = torch.view_as_real(coup).reshape(x.shape[0], -1)  # Re,Im of coupling
        return self.net(feat)

    def num_params(self):
        return count_params(self)


class HybridSpectralTCN(nn.Module):  # (3) substrate bands + temporal TCN, fused
    def __init__(self, h=6, tcn_c=12):
        super().__init__()
        d = len(BINS) * 3
        self.cl, self.act = ComplexLinear(d, h), ModReLU(h)
        self.tcn = TCN(c_in=3, channels=(tcn_c, tcn_c), num_classes=K)
        self.tcn.head = nn.Identity()  # use TCN features, not its head
        self.head = nn.Linear(h + tcn_c, K)

    def forward(self, x):
        z = bands(x).reshape(x.shape[0], -1)
        spec = safe_abs(self.act(self.cl(z)))  # (B,h)
        temp = self.tcn.tcn(x.transpose(1, 2))[:, :, -1]  # (B,tcn_c)
        return self.head(torch.cat([spec, temp], dim=1))

    def num_params(self):
        return count_params(self)


class MagMLP(nn.Module):  # baseline: magnitude only
    def __init__(self, h=16):
        super().__init__()
        d = len(BINS) * 3
        self.net = nn.Sequential(nn.Linear(d, h), nn.ReLU(), nn.Linear(h, K))

    def forward(self, x):
        return self.net(bands(x).abs().reshape(x.shape[0], -1))

    def num_params(self):
        return count_params(self)


MODELS = {
    "MagMLP (baseline)": MagMLP,
    "TCN (baseline)": lambda: TCN(channels=(16, 16, 16)),
    "DenseCVNN (baseline)": DenseCVNN,
    "(1) StructuredSpectral": StructuredSpectral,
    "(2) BilinearCoupling": BilinearCoupling,
    "(3) HybridSpectral+TCN": HybridSpectralTCN,
}


def split_tv(x, y, seed, val_frac=0.15):
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
    args = ap.parse_args()
    x_all, y_all, classes = load_split("train")
    x_te, y_te, _ = load_split("test")
    print(f"MCSA substrate comparison (variant B envelope) — train {x_all.shape[0]}, test {x_te.shape[0]}, {args.seeds} seeds")
    print("baselines (paper): LSTM 88.0% (4773p) · FFT+SVM 81.5% · FFT+MLP 67.0%\n")

    summary = {}
    for name, ctor in MODELS.items():
        accs, bins, recalls, p, cm = [], [], [], None, None
        for seed in range(args.seeds):
            (x_tr, y_tr), (x_val, y_val) = split_tv(x_all, y_all, seed)
            m = ctor()
            p = m.num_params() if hasattr(m, "num_params") else sum(q.numel() for q in m.parameters())
            train_classifier(m, x_tr, y_tr, x_val, y_val, seed=seed, max_epochs=200, lr=3e-3, patience=25)
            accs.append(accuracy(m, x_te, y_te) * 100)
            bins.append(binary_acc(m, x_te, y_te) * 100)
            c = confusion(m, x_te, y_te, K)
            recalls.append(per_class_recall(c))
            cm = c.tolist()
        accs, bins = np.array(accs), np.array(bins)
        rec = np.mean(recalls, axis=0)
        summary[name] = {"params": int(p), "acc_mean": float(accs.mean()), "acc_std": float(accs.std()),
                         "acc_max": float(accs.max()), "binary": float(bins.mean()),
                         "acc_per_10k": float(accs.mean() / (p / 10000)), "recall": rec.round(3).tolist(), "cm": cm}
        print(f"  {name:24s} p={p:5d}  5cls={accs.mean():5.1f}±{accs.std():.1f}% (max {accs.max():.1f})  "
              f"bin={bins.mean():5.1f}%  acc/10k={summary[name]['acc_per_10k']:6.1f}")

    out = os.path.join(os.path.dirname(__file__), "results-substrate-compare.json")
    with open(out, "w") as f:
        json.dump({"classes": classes, "summary": summary}, f, indent=2)
    print(f"\n(results -> {out})")


if __name__ == "__main__":
    main()
