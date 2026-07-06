"""
L2 — synthetic modulation-depth classification (K=5, mirror of BRB severity).

Validates the whole CVNN supervised stack (complex layers, modReLU, Wirtinger
autograd, softmax+CE, mini-batches, train/val/test) AND the mechanism (the
substrate reads modulation depth = severity). Compares the tiny SpectralCVNN
(~100 params) against a magnitude MLP (phase-blind, matched budget) and a raw
MLP (no structure), over several seeds.

Run: python docs/multipath-frequentiel/h3/L2/l2_modulation_depth.py --seeds 5
"""

import argparse
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "python"))

import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn as nn  # noqa: E402

from cvnn import MagnitudeMLP, RawMLP, SpectralCVNN  # noqa: E402
from datasets import AMConfig, band_window, make_am_dataset  # noqa: E402

BATCH = 64
MAX_EPOCHS = 120
LR = 1e-2
PATIENCE = 15  # early-stopping patience on val accuracy


def accuracy(model: nn.Module, x: torch.Tensor, y: torch.Tensor) -> float:
    model.eval()
    with torch.no_grad():
        pred = model(x).argmax(dim=1)
    return (pred == y).float().mean().item()


def confusion(model: nn.Module, x: torch.Tensor, y: torch.Tensor, k: int) -> np.ndarray:
    model.eval()
    with torch.no_grad():
        pred = model(x).argmax(dim=1)
    cm = np.zeros((k, k), dtype=int)
    for t, p in zip(y.tolist(), pred.tolist()):
        cm[t, p] += 1
    return cm


def train_model(model, data, seed):
    (x_tr, y_tr), (x_val, y_val) = data
    torch.manual_seed(seed)
    opt = torch.optim.Adam(model.parameters(), lr=LR)
    loss_fn = nn.CrossEntropyLoss()
    n = x_tr.shape[0]

    best_val, best_state, best_epoch, wait = -1.0, None, 0, 0
    for epoch in range(MAX_EPOCHS):
        model.train()
        perm = torch.randperm(n)
        for i in range(0, n, BATCH):
            idx = perm[i : i + BATCH]
            opt.zero_grad()
            loss = loss_fn(model(x_tr[idx]), y_tr[idx])
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
        val = accuracy(model, x_val, y_val)
        if val > best_val:
            best_val, best_epoch, wait = val, epoch, 0
            best_state = {k: v.detach().clone() for k, v in model.state_dict().items()}
        else:
            wait += 1
            if wait >= PATIENCE:
                break
    if best_state is not None:
        model.load_state_dict(best_state)
    return best_epoch


def build_models(k, bins, carrier_idx, n_samples):
    return {
        # readout="abs": depth is a magnitude; phase_reference is a no-op for |z|.
        "cvnn": SpectralCVNN(bins, carrier_idx, hidden_dims=[4], num_classes=k, readout="abs", phase_reference=False),
        "mlp_magnitude": MagnitudeMLP(bins, hidden_dims=[7], num_classes=k),
        "mlp_raw": RawMLP(n_samples, hidden_dims=[4], num_classes=k),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=5)
    ap.add_argument("--out", type=str, default=os.path.join(os.path.dirname(__file__), "results.json"))
    args = ap.parse_args()

    cfg_tr = AMConfig(n_per_split=2000)
    cfg_val = AMConfig(n_per_split=500)
    cfg_te = AMConfig(n_per_split=500)
    x_tr, y_tr = make_am_dataset(cfg_tr, seed=1)
    x_val, y_val = make_am_dataset(cfg_val, seed=2)
    x_te, y_te = make_am_dataset(cfg_te, seed=3)
    k = len(cfg_tr.depth_centers)
    bins, carrier_idx = band_window()

    results = {name: {"acc": [], "epochs": [], "params": None} for name in ("cvnn", "mlp_magnitude", "mlp_raw")}
    last_cm = {}
    for seed in range(args.seeds):
        models = build_models(k, bins, carrier_idx, cfg_tr.n)
        for name, model in models.items():
            ep = train_model(model, ((x_tr, y_tr), (x_val, y_val)), seed=seed)
            acc = accuracy(model, x_te, y_te)
            results[name]["acc"].append(acc)
            results[name]["epochs"].append(ep)
            results[name]["params"] = model.num_params()
            last_cm[name] = confusion(model, x_te, y_te, k).tolist()

    summary = {}
    thresh = 0.95
    for name, r in results.items():
        accs = np.array(r["acc"])
        p = r["params"]
        summary[name] = {
            "params": p,
            "acc_mean": float(accs.mean()),
            "acc_std": float(accs.std()),
            "acc_min": float(accs.min()),
            "fail_rate": float((accs < thresh).mean()),
            "acc_per_10k": float(accs.mean() * 100.0 / (p / 10000.0)),
            "median_epochs": float(np.median(r["epochs"])),
            "confusion_last": last_cm[name],
        }

    out = {"config": {"K": k, "bins": bins, "batch": BATCH, "lr": LR, "seeds": args.seeds}, "summary": summary}
    with open(args.out, "w") as f:
        json.dump(out, f, indent=2)

    print(f"L2 modulation-depth — {args.seeds} seeds, K={k}, clean (A=1)")
    for name, s in summary.items():
        print(f"  {name:14s} params={s['params']:5d}  acc={s['acc_mean']*100:5.2f}±{s['acc_std']*100:.2f}%  "
              f"min={s['acc_min']*100:5.2f}%  fail/{args.seeds}={int(s['fail_rate']*args.seeds)}  "
              f"acc/10k={s['acc_per_10k']:7.1f}  ep~{s['median_epochs']:.0f}")
    print(f"  (results -> {args.out})")


if __name__ == "__main__":
    main()
