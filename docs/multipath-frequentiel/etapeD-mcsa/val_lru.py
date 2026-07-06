"""
val_lru.py -- Diagonal complex Linear Recurrent Unit (LRU / S4D diagonal SSM,
Orvieto et al. 2023) on the real UFU MCSA envelope (variant B, 64x3).

Why this model is the key candidate. The broken-rotor-bar signature lives as a
slow modulation (2*s*f, a few Hz) riding on the current envelope. That is a
MODAL phenomenon: a small bank of resonators (biquads) tuned to those
modulation frequencies is the natural detector. A diagonal complex linear
recurrence IS such a bank -- each diagonal entry lam_k = rho_k*exp(i*theta_k) is
one complex pole, i.e. one resonator/biquad with center frequency theta_k and
Q set by rho_k. Unlike an FFT snapshot (which throws away the temporal
trajectory), the recurrence integrates the whole 64-step trajectory, and unlike
a nonlinear RNN it is a LINEAR scan so it maps cleanly onto second-order
sections (biquads) on an MCU.

Architecture (complex implemented as two real channels re/im):
  drive:      real Linear(3 -> 2r) per timestep, split into b_re, b_im in R^r
  recurrence: h_t = lam (elementwise) h_{t-1} + b_t, over the 64 steps
              lam_k = rho_k * exp(i theta_k), rho_k = sigmoid(nu_k) in (0,1)
              => |lam_k| < 1 guarantees a bounded (stable) scan.
  readout:    features drawn from the state trajectory (LAST state and/or MEAN
              over time), using safe magnitude |h| and/or concat(re,im);
              real Linear(feat -> 5) logits.

Protocol (strict):
  - TRAIN split into 85/15 train/val with a seeded permutation; early-stop on
    VAL accuracy only (restores best-val weights). TEST is never used to select
    anything.
  - Config selection (r in {8,16,32,64} x readout variant) is done on VAL
    accuracy (mean over seeds 0..4), keeping params <= ~4000.
  - The SELECTED config is then reported by TEST accuracy over seeds 0..4.

Run: PYTHONIOENCODING=utf-8 python docs/multipath-frequentiel/etapeD-mcsa/val_lru.py
"""

import argparse
import json
import math
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "h3", "python"))

import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn as nn  # noqa: E402

from train import accuracy, confusion, per_class_recall, train_classifier  # noqa: E402
from mcsa_data import load_split  # noqa: E402

K = 5
SEEDS = 5


class DiagComplexLRU(nn.Module):
    """One diagonal complex linear recurrence = a learnable bank of r biquads.

    readout in {"mag", "reim", "magreim"} chooses which state features feed the
    head; pooling always concatenates the LAST state and the MEAN over time so
    both the settled response and the average energy are available.
    """

    def __init__(self, r=16, readout="mag", num_classes=K, in_ch=3):
        super().__init__()
        self.r = r
        self.readout = readout
        # Per-timestep input map -> complex drive b_t in C^r (real 2r output).
        self.drive = nn.Linear(in_ch, 2 * r)

        # Pole parameters. rho = sigmoid(nu) in (0,1) keeps |lam|<1 (stable).
        # DETERMINISTIC init (a proper resonator bank, not random poles): spread
        # the magnitudes across [0.80, 0.99] so the bank spans short- to
        # long-memory resonators, and spread the phases across a low-frequency
        # band [0, 0.6*pi] where the slow 2*s*f BRB modulation sidebands live.
        # This structured init markedly outperformed random poles in the sweep.
        rho0 = torch.linspace(0.80, 0.99, r)       # magnitudes span the disk
        self.nu = nn.Parameter(torch.log(rho0 / (1 - rho0)))  # inverse sigmoid
        theta0 = torch.linspace(0.0, math.pi * 0.6, r)  # low-frequency phases
        self.theta = nn.Parameter(theta0)

        # Feature width per pooled state: mag=r, reim=2r, magreim=3r.
        per = {"mag": r, "reim": 2 * r, "magreim": 3 * r}[readout]
        feat = 2 * per  # last-state features ++ mean-over-time features
        self.head = nn.Linear(feat, num_classes)

    def _state_feats(self, h_re, h_im):
        # h_*: (B, r). Build the chosen real feature vector.
        if self.readout == "mag":
            return torch.sqrt(h_re * h_re + h_im * h_im + 1e-6)
        if self.readout == "reim":
            return torch.cat([h_re, h_im], dim=-1)
        mag = torch.sqrt(h_re * h_re + h_im * h_im + 1e-6)
        return torch.cat([mag, h_re, h_im], dim=-1)

    def forward(self, x):  # x: (B, 64, 3)
        B, T, _ = x.shape
        drive = self.drive(x)                      # (B, T, 2r)
        b_re = drive[..., : self.r]                # (B, T, r)
        b_im = drive[..., self.r :]

        rho = torch.sigmoid(self.nu)               # (r,) in (0,1), stable
        lam_re = rho * torch.cos(self.theta)       # (r,)
        lam_im = rho * torch.sin(self.theta)

        # Parallel associative scan of the linear recurrence
        #   h_t = lam * h_{t-1} + b_t.
        # Each step carries the affine map (a, c) meaning h = a*h_prev + c, with
        # composition (a2,c2) o (a1,c1) = (a2*a1, a2*c1 + c2). A Hillis-Steele
        # inclusive scan resolves all 64 states in log2(T) vectorized passes
        # (6 for T=64) instead of a 64-iteration Python loop -- same math,
        # numerically stable since |a| = product of |lam| stays < 1.
        a_re = lam_re.expand(B, T, self.r).clone()  # (B,T,r) map multiplier
        a_im = lam_im.expand(B, T, self.r).clone()
        c_re = b_re                                 # map offset = drive
        c_im = b_im
        shift = 1
        while shift < T:
            # prev = element (t - shift), padded with identity map (a=1, c=0).
            pa_re = torch.ones_like(a_re)
            pa_im = torch.zeros_like(a_im)
            pc_re = torch.zeros_like(c_re)
            pc_im = torch.zeros_like(c_im)
            pa_re[:, shift:] = a_re[:, :-shift]
            pa_im[:, shift:] = a_im[:, :-shift]
            pc_re[:, shift:] = c_re[:, :-shift]
            pc_im[:, shift:] = c_im[:, :-shift]
            # compose current o prev : new_a = a*pa ; new_c = a*pc + c
            na_re = a_re * pa_re - a_im * pa_im
            na_im = a_re * pa_im + a_im * pa_re
            nc_re = a_re * pc_re - a_im * pc_im + c_re
            nc_im = a_re * pc_im + a_im * pc_re + c_im
            a_re, a_im, c_re, c_im = na_re, na_im, nc_re, nc_im
            shift *= 2

        # With h_0 = 0, the accumulated offset c_t IS the state h_t.
        h_re_seq, h_im_seq = c_re, c_im            # (B, T, r) full trajectory
        last_re, last_im = h_re_seq[:, -1], h_im_seq[:, -1]
        mean_re = h_re_seq.mean(dim=1)
        mean_im = h_im_seq.mean(dim=1)

        last = self._state_feats(last_re, last_im)  # (B, per)
        mean = self._state_feats(mean_re, mean_im)  # (B, per)
        feat = torch.cat([last, mean], dim=-1)
        return self.head(feat)

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


def run_config(x_all, y_all, x_te, y_te, r, readout, seeds, dev):
    """Train the config over ``seeds``; return per-seed val/test accs + info."""
    vals, tests, recalls, bins, p, cm_last = [], [], [], [], None, None
    x_te, y_te = x_te.to(dev), y_te.to(dev)          # cache test on device once
    for seed in range(seeds):
        (x_tr, y_tr), (x_val, y_val) = split_train_val(x_all, y_all, seed=seed)
        x_tr, y_tr = x_tr.to(dev), y_tr.to(dev)
        x_val, y_val = x_val.to(dev), y_val.to(dev)
        m = DiagComplexLRU(r=r, readout=readout).to(dev)
        p = m.num_params()
        train_classifier(
            m, x_tr, y_tr, x_val, y_val,
            seed=seed, max_epochs=200, lr=3e-3, patience=25, weight_decay=0.0,
        )
        vals.append(accuracy(m, x_val, y_val) * 100)
        tests.append(accuracy(m, x_te, y_te) * 100)
        cm = confusion(m, x_te, y_te, K)
        recalls.append(per_class_recall(cm))
        bins.append(binary_acc(m, x_te, y_te) * 100)
        cm_last = cm.tolist()
        print("      [r=%2d %-8s seed %d] val=%5.1f test=%5.1f" % (
            r, readout, seed, vals[-1], tests[-1]), flush=True)
    return {
        "r": r, "readout": readout, "params": p,
        "val": np.array(vals), "test": np.array(tests),
        "recall": np.mean(recalls, axis=0), "bin": np.array(bins),
        "cm": cm_last,
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=SEEDS)
    args = ap.parse_args()

    dev = "cuda" if torch.cuda.is_available() else "cpu"
    x_all, y_all, classes = load_split("train")
    x_te, y_te, _ = load_split("test")
    print("MCSA diagonal complex LRU (S4D, Orvieto 2023) -- variant B envelope")
    print("classes:", classes)
    print("train %d  test %d  device %s" % (x_all.shape[0], x_te.shape[0], dev))
    print("baselines: LSTM 88.0%% (4773p) | TCN ~81%% | MLP|FFT| ~85%%")
    print("PROTOCOL: 85/15 train/val, early-stop on VAL only; select on VAL, report TEST.\n")

    # Sweep r x readout; keep params <= ~4000.
    grid = []
    for r in (8, 16, 32, 64):
        for readout in ("mag", "reim", "magreim"):
            m = DiagComplexLRU(r=r, readout=readout)
            if m.num_params() <= 4000:
                grid.append((r, readout, m.num_params()))

    # Resumable checkpoint: store each finished config so a killed run can be
    # restarted without recomputing completed configs (the sweep is long).
    ckpt = os.path.join(os.path.dirname(__file__), "results-lru.ckpt.json")
    done = {}
    if os.path.exists(ckpt):
        with open(ckpt) as f:
            for e in json.load(f):
                done[(e["r"], e["readout"])] = e
        print("(resuming: %d configs already in checkpoint)" % len(done))

    print("Sweep (params <= 4000):")
    results = []
    for r, readout, p in grid:
        if (r, readout) in done:
            e = done[(r, readout)]
            res = {"r": r, "readout": readout, "params": e["params"],
                   "val": np.array(e["val"]), "test": np.array(e["test"]),
                   "recall": np.array(e["recall"]), "bin": np.array(e["bin"]),
                   "cm": e["cm"]}
        else:
            res = run_config(x_all, y_all, x_te, y_te, r, readout, args.seeds, dev)
            done[(r, readout)] = {
                "r": r, "readout": readout, "params": res["params"],
                "val": res["val"].tolist(), "test": res["test"].tolist(),
                "recall": res["recall"].tolist(), "bin": res["bin"].tolist(),
                "cm": res["cm"]}
            with open(ckpt, "w") as f:  # checkpoint after every config
                json.dump(list(done.values()), f)
        results.append(res)
        print("  r=%2d readout=%-7s p=%4d  VAL=%5.1f+/-%.1f  (TEST=%5.1f+/-%.1f)"
              % (r, readout, res["params"], res["val"].mean(), res["val"].std(),
                 res["test"].mean(), res["test"].std()))

    # SELECT by VALIDATION accuracy only (never test).
    best = max(results, key=lambda rr: rr["val"].mean())
    print("\nSELECTED by VAL: r=%d readout=%s p=%d  (VAL %.1f%%)"
          % (best["r"], best["readout"], best["params"], best["val"].mean()))
    print("REPORTED TEST: %.1f+/-%.1f%% (max %.1f)  bin=%.1f%%  acc/10k=%.1f"
          % (best["test"].mean(), best["test"].std(), best["test"].max(),
             best["bin"].mean(), best["test"].mean() / (best["params"] / 10000)))
    print("  per-class recall (H,B1..B4):", [round(float(v), 3) for v in best["recall"]])

    matched = best["test"].mean() >= 88.0 and best["params"] <= 4773
    print("\nMatched LSTM (>=88.0%% at <=4773p)? %s" % ("YES" if matched else "NO"))

    out = os.path.join(os.path.dirname(__file__), "results-lru.json")
    with open(out, "w") as f:
        json.dump({
            "selected": {"r": best["r"], "readout": best["readout"], "params": best["params"]},
            "test_mean": float(best["test"].mean()), "test_std": float(best["test"].std()),
            "test_max": float(best["test"].max()), "val_mean": float(best["val"].mean()),
            "binary_mean": float(best["bin"].mean()),
            "recall": [round(float(v), 3) for v in best["recall"]],
            "confusion_last": best["cm"],
            "sweep": [{"r": r["r"], "readout": r["readout"], "params": r["params"],
                       "val_mean": float(r["val"].mean()), "test_mean": float(r["test"].mean()),
                       "test_std": float(r["test"].std())} for r in results],
        }, f, indent=2)
    print("\n(results -> %s)" % out)


if __name__ == "__main__":
    main()
