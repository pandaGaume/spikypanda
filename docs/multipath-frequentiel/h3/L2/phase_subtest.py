"""
L2 §6 — the PHASE sub-test: two classes with IDENTICAL magnitude spectrum but a
different relative sideband phase (AM vs quadrature). A magnitude MLP sees the
same |FFT| for both -> chance (~50%). The complex substrate reads the sideband
phase (via interference before |z|) and separates them. H6, in a learning loop.

Run: python docs/multipath-frequentiel/h3/L2/phase_subtest.py --seeds 5
"""

import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "python"))

import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn as nn  # noqa: E402

from cvnn import MagnitudeMLP, SpectralCVNN  # noqa: E402
from datasets import AMConfig, band_window, make_phase_subtest  # noqa: E402

BATCH = 64
MAX_EPOCHS = 150
LR = 1e-2
PATIENCE = 20


def accuracy(model, x, y):
    model.eval()
    with torch.no_grad():
        return (model(x).argmax(1) == y).float().mean().item()


def train(model, x_tr, y_tr, x_val, y_val, seed):
    torch.manual_seed(seed)
    opt = torch.optim.Adam(model.parameters(), lr=LR)
    loss_fn = nn.CrossEntropyLoss()
    n = x_tr.shape[0]
    best, best_state, wait = -1.0, None, 0
    for _ in range(MAX_EPOCHS):
        model.train()
        perm = torch.randperm(n)
        for i in range(0, n, BATCH):
            idx = perm[i : i + BATCH]
            opt.zero_grad()
            loss_fn(model(x_tr[idx]), y_tr[idx]).backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
        v = accuracy(model, x_val, y_val)
        if v > best:
            best, wait = v, 0
            best_state = {k: p.detach().clone() for k, p in model.state_dict().items()}
        else:
            wait += 1
            if wait >= PATIENCE:
                break
    if best_state:
        model.load_state_dict(best_state)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=5)
    args = ap.parse_args()

    cfg_tr, cfg_val, cfg_te = AMConfig(n_per_split=2000), AMConfig(n_per_split=500), AMConfig(n_per_split=500)
    x_tr, y_tr = make_phase_subtest(cfg_tr, seed=1)
    x_val, y_val = make_phase_subtest(cfg_val, seed=2)
    x_te, y_te = make_phase_subtest(cfg_te, seed=3)
    bins, carrier_idx = band_window()

    cvnn_acc, mag_acc = [], []
    for seed in range(args.seeds):
        cvnn = SpectralCVNN(bins, carrier_idx, hidden_dims=[6, 4], num_classes=2, readout="abs", phase_reference=False)
        mag = MagnitudeMLP(bins, hidden_dims=[8], num_classes=2)
        train(cvnn, x_tr, y_tr, x_val, y_val, seed)
        train(mag, x_tr, y_tr, x_val, y_val, seed)
        cvnn_acc.append(accuracy(cvnn, x_te, y_te))
        mag_acc.append(accuracy(mag, x_te, y_te))

    cvnn_acc, mag_acc = np.array(cvnn_acc), np.array(mag_acc)
    print(f"Phase sub-test (AM vs quadrature, |spectrum| identical) — {args.seeds} seeds")
    print(f"  CVNN (|z|)      acc = {cvnn_acc.mean()*100:5.2f} ± {cvnn_acc.std()*100:.2f}%  (min {cvnn_acc.min()*100:.1f}%)")
    print(f"  MLP-magnitude   acc = {mag_acc.mean()*100:5.2f} ± {mag_acc.std()*100:.2f}%  (min {mag_acc.min()*100:.1f}%)")
    verdict = "PASS" if cvnn_acc.mean() >= 0.95 and mag_acc.mean() <= 0.60 else "CHECK"
    print(f"  => {verdict} — the complex net reads phase the magnitude cannot (H6 in learning).")


if __name__ == "__main__":
    main()
