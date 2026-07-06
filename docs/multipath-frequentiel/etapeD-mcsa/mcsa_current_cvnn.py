"""
L3 variant A — BRB grading from the RAW CURRENT SPECTRUM (phase intact).

Loads the cached complex carrier+sideband features (mcsa_variantA_prep.py) and
references each band to its fundamental (complex divide by the carrier bin = the
standard MCSA load-invariant feature, PHASE preserved). Then asks the decisive
question: does the complex substrate (reads amplitude AND phase) beat a
magnitude MLP (phase-blind) on real broken-bar grading?

Run: python docs/multipath-frequentiel/etapeD-mcsa/mcsa_current_cvnn.py --seeds 5
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

K = 5


def load_features(normalize=True, path=None):
    path = path or os.path.join(os.path.dirname(__file__), "variantA_features.npz")
    npz = np.load(path, allow_pickle=True)
    X = (npz["X_re"] + 1j * npz["X_im"]).astype(np.complex64)  # (n, 2H+1, 3)
    half = int(npz["half"])
    if normalize:
        carrier = X[:, half : half + 1, :]  # (n,1,3)
        X = X / (carrier + 1e-8)  # complex divide -> reference to fundamental (load + theta invariant)
    y = npz["y"].astype(np.int64)
    sp = npz["split"]
    z = torch.from_numpy(X.reshape(X.shape[0], -1))  # (n, (2H+1)*3) complex
    y = torch.from_numpy(y)
    tr = torch.from_numpy(sp == "train")
    return z[tr], y[tr], z[~tr], y[~tr]


class CurrentCVNN(nn.Module):
    def __init__(self, in_dim, hidden_dims):
        super().__init__()
        dims = [in_dim] + list(hidden_dims)
        self.clayers = nn.ModuleList(ComplexLinear(dims[i], dims[i + 1]) for i in range(len(hidden_dims)))
        self.acts = nn.ModuleList(ModReLU(dims[i + 1]) for i in range(len(hidden_dims)))
        self.head = nn.Linear(hidden_dims[-1], K)

    def forward(self, z):
        for cl, act in zip(self.clayers, self.acts):
            z = act(cl(z))
        return self.head(safe_abs(z))

    def num_params(self):
        return count_params(self)


class MagMLP(nn.Module):
    def __init__(self, in_dim, hidden_dims):
        super().__init__()
        dims = [in_dim] + list(hidden_dims) + [K]
        layers = []
        for i in range(len(dims) - 1):
            layers.append(nn.Linear(dims[i], dims[i + 1]))
            if i < len(dims) - 2:
                layers.append(nn.ReLU())
        self.net = nn.Sequential(*layers)

    def forward(self, z):
        return self.net(z.abs())

    def num_params(self):
        return count_params(self)


def binary_acc(model, z, y):
    model.eval()
    with torch.no_grad():
        pred = model(z).argmax(1)
    return (((pred > 0).long()) == ((y > 0).long())).float().mean().item()


def split_tv(z, y, seed, val_frac=0.15):
    g = torch.Generator().manual_seed(seed)
    perm = torch.randperm(z.shape[0], generator=g)
    nv = int(z.shape[0] * val_frac)
    return (z[perm[nv:]], y[perm[nv:]]), (z[perm[:nv]], y[perm[:nv]])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=5)
    ap.add_argument("--size", type=str, default="small", choices=["small", "large"])
    ap.add_argument("--features", type=str, default=None)
    ap.add_argument("--wd", type=float, default=0.0)
    ap.add_argument("--out", type=str, default=os.path.join(os.path.dirname(__file__), "results-current.json"))
    args = ap.parse_args()

    z_all, y_all, z_te, y_te = load_features(normalize=True, path=args.features)
    in_dim = z_all.shape[1]
    print(f"MCSA variant A (raw current) — in_dim={in_dim} complex bins, train {z_all.shape[0]}, test {z_te.shape[0]}")
    print("baselines (paper): LSTM 88.0% (4773p) · FFT+SVM 81.5% · FFT+MLP 67.0% (773p)\n")

    def mk(name):
        if args.size == "small":
            return CurrentCVNN(in_dim, [5]) if name == "cvnn" else MagMLP(in_dim, [10])
        return CurrentCVNN(in_dim, [16, 8]) if name == "cvnn" else MagMLP(in_dim, [24, 12])

    names = ("cvnn", "mag")
    res = {n: {"acc": [], "bin": [], "params": None, "recall": [], "cm": None} for n in names}
    for seed in range(args.seeds):
        (z_tr, y_tr), (z_val, y_val) = split_tv(z_all, y_all, seed)
        for name in names:
            m = mk(name)
            train_classifier(m, z_tr, y_tr, z_val, y_val, seed=seed, max_epochs=200, lr=5e-3, patience=25, weight_decay=args.wd)
            res[name]["acc"].append(accuracy(m, z_te, y_te))
            res[name]["bin"].append(binary_acc(m, z_te, y_te))
            cm = confusion(m, z_te, y_te, K)
            res[name]["recall"].append(per_class_recall(cm).tolist())
            res[name]["cm"] = cm.tolist()
            res[name]["params"] = m.num_params()

    summary = {}
    for name in names:
        accs = np.array(res[name]["acc"]) * 100
        bins = np.array(res[name]["bin"]) * 100
        p = res[name]["params"]
        rec = np.mean(res[name]["recall"], axis=0)
        summary[name] = {"params": p, "acc_mean": float(accs.mean()), "acc_std": float(accs.std()),
                         "acc_max": float(accs.max()), "binary_mean": float(bins.mean()),
                         "acc_per_10k": float(accs.mean() / (p / 10000.0)), "recall": rec.round(3).tolist(),
                         "confusion_last": res[name]["cm"]}
        label = "CVNN (complex)" if name == "cvnn" else "MLP (magnitude)"
        print(f"  {label:16s} p={p:5d}  5cls={accs.mean():5.1f}±{accs.std():.1f}% (max {accs.max():.1f})  "
              f"bin={bins.mean():5.1f}%  acc/10k={summary[name]['acc_per_10k']:6.1f}  "
              f"recall(H,B1..B4)={[f'{r:.2f}' for r in rec]}")

    with open(args.out, "w") as f:
        json.dump({"size": args.size, "summary": summary}, f, indent=2)
    print(f"\n(results -> {args.out})")


if __name__ == "__main__":
    main()
