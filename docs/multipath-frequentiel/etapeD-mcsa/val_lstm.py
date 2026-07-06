"""
RECURRENT BASELINE — the number the modal models must beat.

Real UFU MCSA, 5-class broken-rotor-bar grading (Healthy, BRB1..BRB4), variant B
envelope: 64 timesteps, 3 channels (Ia,Ib,Ic), values in [0,1].
~1600 train / ~400 test.

We reproduce the paper's recurrent ceiling locally. Sweep {GRU, LSTM} x hidden
in {16, 24, 32}, 1 layer, batch_first over the 64-step sequence; take the LAST
hidden state -> Linear -> 5 logits. Selection is done ON VALIDATION ONLY
(mean val accuracy over the 5 seeds). The winning config's TEST accuracy over
seeds 0..4 is the local ceiling.

Baselines to beat: paper LSTM 88.0% (~4773 params), reproduced TCN ~81%,
MLP|FFT| ~85%. Ceiling target: ~88% test at <= ~4000 params.

Protocol (strict, no cheating):
  - Split TRAIN into train/val 85/15 with a seeded permutation; early-stop on
    VAL only (handled by train_classifier).
  - NEVER select a model/hyperparam/early-stop on the TEST set.
  - Report TEST accuracy over seeds 0..4 for the val-selected config only.
  - params = sum(p.numel() for p in model.parameters()).

Run: PYTHONIOENCODING=utf-8 python docs/multipath-frequentiel/etapeD-mcsa/val_lstm.py
"""

import argparse
import json
import os
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(_HERE, "..", "h3", "python"))
sys.path.insert(0, _HERE)  # so mcsa_data resolves regardless of launcher

import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn as nn  # noqa: E402

from train import accuracy, confusion, per_class_recall, train_classifier  # noqa: E402
from mcsa_data import load_split  # noqa: E402

K = 5
DEV = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class RNNClassifier(nn.Module):
    """1-layer GRU or LSTM over the 64-step sequence; last hidden -> Linear -> 5."""

    def __init__(self, cell="gru", c_in=3, hidden=24, num_classes=K):
        super().__init__()
        cell = cell.lower()
        rnn_cls = {"gru": nn.GRU, "lstm": nn.LSTM}[cell]
        self.cell = cell
        self.rnn = rnn_cls(input_size=c_in, hidden_size=hidden, num_layers=1, batch_first=True)
        self.head = nn.Linear(hidden, num_classes)

    def forward(self, x):  # x: (B, 64, 3)
        out, h = self.rnn(x)
        # h is (h_n,) for GRU, (h_n, c_n) for LSTM; h_n: (num_layers=1, B, hidden)
        h_n = h[0] if self.cell == "lstm" else h
        last = h_n[-1]  # (B, hidden)  == out[:, -1, :]
        return self.head(last)

    def num_params(self):
        return sum(p.numel() for p in self.parameters())


def split_train_val(x, y, val_frac=0.15, seed=0):
    g = torch.Generator().manual_seed(seed)
    perm = torch.randperm(x.shape[0], generator=g)
    nv = int(x.shape[0] * val_frac)
    return (x[perm[nv:]], y[perm[nv:]]), (x[perm[:nv]], y[perm[:nv]])


def binary_acc(model, x, y):
    """Fault vs healthy (class 0) collapse, for context."""
    model.eval()
    with torch.no_grad():
        pred = model(x).argmax(1)
    return (((pred > 0).long()) == ((y > 0).long())).float().mean().item()


def eval_config(cell, hidden, x_all, y_all, x_te, y_te, seeds):
    """Train `seeds` models for one config; return per-seed val accs, test accs,
    binary accs, recalls, last confusion, param count."""
    val_accs, test_accs, bins, recalls, cm_last, p = [], [], [], [], None, None
    for seed in range(seeds):
        (x_tr, y_tr), (x_val, y_val) = split_train_val(x_all, y_all, seed=seed)
        x_tr, y_tr = x_tr.to(DEV), y_tr.to(DEV)
        x_val, y_val = x_val.to(DEV), y_val.to(DEV)
        torch.manual_seed(seed)
        m = RNNClassifier(cell=cell, hidden=hidden).to(DEV)
        p = m.num_params()
        train_classifier(m, x_tr, y_tr, x_val, y_val, seed=seed,
                         max_epochs=200, lr=3e-3, patience=25, weight_decay=0.0)
        # best-val weights are restored inside train_classifier
        val_accs.append(accuracy(m, x_val, y_val) * 100)
        test_accs.append(accuracy(m, x_te, y_te) * 100)
        bins.append(binary_acc(m, x_te, y_te) * 100)
        cm = confusion(m, x_te, y_te, K)
        recalls.append(per_class_recall(cm))
        cm_last = cm.tolist()
    return {
        "cell": cell, "hidden": hidden, "params": p,
        "val": np.array(val_accs), "test": np.array(test_accs),
        "bin": np.array(bins), "recall": np.mean(recalls, axis=0),
        "cm_last": cm_last,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=5)
    args = ap.parse_args()

    x_all, y_all, classes = load_split("train")
    x_te, y_te, _ = load_split("test")
    x_te, y_te = x_te.to(DEV), y_te.to(DEV)  # test tensors live on DEV for eval
    print("MCSA recurrent baseline (variant B envelope) -- "
          f"train {x_all.shape[0]}, test {x_te.shape[0]}, classes {classes}, device {DEV}")
    print("baselines: paper LSTM 88.0%% (4773p) | reproduced TCN ~81%% | MLP|FFT| ~85%%")
    print("target: ~88%% test at <= ~4000 params\n")

    cells = ["gru", "lstm"]
    hiddens = [16, 24, 32]

    results = []
    print("SWEEP (selection on VAL mean only; test shown for context, not used to pick):")
    print("  %-5s h=%-3s  %6s   val_mean+-std     test_mean+-std" % ("cell", "", "params"))
    for cell in cells:
        for hidden in hiddens:
            r = eval_config(cell, hidden, x_all, y_all, x_te, y_te, args.seeds)
            results.append(r)
            print("  %-5s h=%-3d  p=%5d   %5.1f+-%4.1f       %5.1f+-%4.1f"
                  % (cell.upper(), hidden, r["params"],
                     r["val"].mean(), r["val"].std(),
                     r["test"].mean(), r["test"].std()))

    # --- Selection on VALIDATION accuracy only, honoring param budget <= ~5000 ---
    budget = 5000
    eligible = [r for r in results if r["params"] <= budget]
    if not eligible:
        eligible = results
    # Tie-break: higher val mean, then fewer params.
    best = max(eligible, key=lambda r: (round(r["val"].mean(), 4), -r["params"]))

    acc = best["test"]
    rec = best["recall"]
    print("\nSELECTED by VAL (params <= %d): %s hidden=%d, p=%d"
          % (budget, best["cell"].upper(), best["hidden"], best["params"]))
    print("  val  = %5.1f+-%4.1f%%" % (best["val"].mean(), best["val"].std()))
    print("  TEST = %5.1f+-%4.1f%% (max %5.1f)   binary=%5.1f%%"
          % (acc.mean(), acc.std(), acc.max(), best["bin"].mean()))
    print("  test per-seed = %s" % ["%.1f" % a for a in acc])
    print("  recall(H,B1..B4) = %s" % ["%.2f" % r for r in rec])
    print("  acc/10k params  = %6.1f" % (acc.mean() / (best["params"] / 10000)))
    print("  confusion(last seed) = %s" % best["cm_last"])

    out = os.path.join(os.path.dirname(__file__), "results-val-lstm.json")
    payload = {
        "selected": {"cell": best["cell"], "hidden": best["hidden"], "params": best["params"]},
        "test_acc_mean": float(acc.mean()), "test_acc_std": float(acc.std()),
        "test_acc_max": float(acc.max()), "test_acc_per_seed": [float(a) for a in acc],
        "val_acc_mean": float(best["val"].mean()), "val_acc_std": float(best["val"].std()),
        "binary_mean": float(best["bin"].mean()),
        "recall": [float(r) for r in rec],
        "confusion_last": best["cm_last"],
        "sweep": [
            {"cell": r["cell"], "hidden": r["hidden"], "params": r["params"],
             "val_mean": float(r["val"].mean()), "val_std": float(r["val"].std()),
             "test_mean": float(r["test"].mean()), "test_std": float(r["test"].std())}
            for r in results
        ],
    }
    with open(out, "w") as f:
        json.dump(payload, f, indent=2)
    print("\n(results -> %s)" % out)


if __name__ == "__main__":
    main()
