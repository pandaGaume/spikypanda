"""
Hygiene (MCU plan, step C): remove the train/test leak, re-report the headline
models on the CLEAN test, and give the LSTM a fair (tuned) baseline.

The adversarial audit flagged 8/400 test windows that are EXACT duplicates of
train windows (all class BRB4), inflating every model's absolute accuracy by up
to ~2 pt. It is uniform across models so it does not change the ranking or the GO
verdict, but the published absolute numbers must be on a clean test.

This:
  1) finds + reports the exact-duplicate test windows,
  2) retrains the headline configs (GRU ceiling, LRU deployable, static control)
     over 5 seeds and reports TEST accuracy on the CLEANED test,
  3) gives the LSTM a proper baseline (forget-gate bias init) so the recurrent
     ceiling is a real LSTM, not the collapsed default.

Run: OMP_NUM_THREADS=1 PYTHONIOENCODING=utf-8 python docs/multipath-frequentiel/etapeD-mcsa/clean_report.py
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "h3", "python"))

import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn as nn  # noqa: E402

from mcsa_data import load_split  # noqa: E402
from val_lru import DiagComplexLRU, split_train_val  # noqa: E402
from train import train_classifier, accuracy, confusion, per_class_recall  # noqa: E402
from complex_layers import ComplexLinear, ModReLU, safe_abs  # noqa: E402

K = 5


def find_leak(x_tr, x_te):
    tr = {x_tr[i].numpy().tobytes() for i in range(x_tr.shape[0])}
    dup = [j for j in range(x_te.shape[0]) if x_te[j].numpy().tobytes() in tr]
    return dup


class RNNHead(nn.Module):
    def __init__(self, kind, hidden=32, forget_bias=False):
        super().__init__()
        cell = nn.GRU if kind == "gru" else nn.LSTM
        self.rnn = cell(3, hidden, batch_first=True)
        self.head = nn.Linear(hidden, K)
        if kind == "lstm" and forget_bias:
            # PyTorch LSTM bias order per gate = (input, forget, cell, output).
            # Setting the forget-gate bias to 1 fixes the collapse under default init.
            for name, p in self.rnn.named_parameters():
                if "bias_ih" in name:
                    p.data[hidden : 2 * hidden].fill_(1.0)

    def forward(self, x):
        out, _ = self.rnn(x)
        return self.head(out[:, -1])

    def num_params(self):
        return sum(p.numel() for p in self.parameters())


class StaticControl(nn.Module):
    """rfft-over-time snapshot; low complex bins -> ComplexLinear -> mag -> Linear. No time."""
    def __init__(self, h=24, nbins=8):
        super().__init__()
        self.nbins = nbins
        self.cl = ComplexLinear(nbins * 3, h)
        self.act = ModReLU(h)
        self.head = nn.Linear(h, K)

    def forward(self, x):  # (B,64,3)
        X = torch.fft.rfft(x, dim=1)[:, 1 : 1 + self.nbins, :]  # skip DC, low bins
        z = X.reshape(x.shape[0], -1)
        return self.head(safe_abs(self.act(self.cl(z))))

    def num_params(self):
        return sum(p.numel() for p in self.parameters())


def build(name):
    if name == "GRU h32":
        return RNNHead("gru", 32)
    if name == "LSTM h32 (forget-bias)":
        return RNNHead("lstm", 32, forget_bias=True)
    if name == "LRU r64 (biquad bank)":
        return DiagComplexLRU(r=64, readout="magreim")
    if name == "Static control":
        return StaticControl(h=24)
    raise ValueError(name)


def main():
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    x_all, y_all, classes = load_split("train")
    x_te, y_te, _ = load_split("test")

    dup = find_leak(x_all, x_te)
    dup_classes = [int(y_te[j]) for j in dup]
    print("LEAK: %d/%d test windows are exact duplicates of train windows." % (len(dup), x_te.shape[0]))
    print("      duplicate classes:", [classes[c] for c in dup_classes])
    keep = torch.tensor([j for j in range(x_te.shape[0]) if j not in set(dup)])
    x_clean, y_clean = x_te[keep], y_te[keep]
    print("      clean test: %d windows\n" % x_clean.shape[0])

    x_te_d, y_te_d = x_te.to(dev), y_te.to(dev)
    x_cl_d, y_cl_d = x_clean.to(dev), y_clean.to(dev)

    names = ["GRU h32", "LSTM h32 (forget-bias)", "LRU r64 (biquad bank)", "Static control"]
    print("%-26s %7s   %-16s   %-16s" % ("model", "params", "TEST dirty(400)", "TEST clean(%d)" % x_clean.shape[0]))
    print("-" * 78)
    for name in names:
        dirty, clean, params = [], [], None
        for seed in range(5):
            (x_tr, y_tr), (x_val, y_val) = split_train_val(x_all, y_all, seed=seed)
            m = build(name).to(dev)
            params = m.num_params()
            train_classifier(m, x_tr.to(dev), y_tr.to(dev), x_val.to(dev), y_val.to(dev),
                             seed=seed, max_epochs=200, lr=3e-3, patience=25, weight_decay=0.0)
            dirty.append(accuracy(m, x_te_d, y_te_d) * 100)
            clean.append(accuracy(m, x_cl_d, y_cl_d) * 100)
        dirty, clean = np.array(dirty), np.array(clean)
        print("%-26s %7d   %5.1f +/- %-4.1f      %5.1f +/- %-4.1f  (%+.1f)"
              % (name, params, dirty.mean(), dirty.std(), clean.mean(), clean.std(),
                 clean.mean() - dirty.mean()))


if __name__ == "__main__":
    main()
