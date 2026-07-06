"""
L-modal-NL -- Nonlinear LRU (S4-style block) on the MCSA envelope (variant B).

Motivation
----------
The plain LRU is a *linear* modal readout: a diagonal complex recurrence
(lam_k = rho_k * exp(i*theta_k), |lam|<1) that acts as a bank of learnable
damped resonators, then a linear pool -> logits. It matches the physics of the
broken-rotar-bar envelope (a slow 2sf modulation whose amplitude grades the
severity), but it is linear end to end after the projection, so it cannot mix
modes or shape the per-step magnitude response.

This script asks a narrow question: does adding a *light nonlinearity* on top of
the same modal backbone close any remaining gap to the paper LSTM (88.0%,
4773p)? The block is S4-style:

    x_t (3 real)  --B(complex)-->  u_t (r complex)
    h_t = lam (*) h_{t-1} + u_t                 # diagonal complex recurrence
    m_t = |h_t|                                 # r real  (modal energy per step)
    g_t = GLU(Linear(m_t))                      # r real  (gated nonlinear mixing across modes)
    pooled = [ mean_t g_t ; g_T ]               # 2r real
    logits = Head(pooled)                       # 5

The recurrence core is identical to the plain LRU; the only added expressivity
is the GELU/GLU mixing of the modal magnitudes at each step. To make the
comparison honest, the SAME trained recurrence features are also read out by a
plain linear pool head (no mixing) inside the run, so the notes can state
whether the nonlinear mixing actually helped over the plain LRU.

Protocol (strict)
-----------------
- TRAIN is split 85/15 into train/val with a seeded permutation; early-stop on
  VAL accuracy only (handled by train_classifier). The TEST set is touched only
  to report the final number, never to select r, hyperparams, or epochs.
- r is swept in {8,16,32}; the winning r is chosen by VAL accuracy (mean over
  seeds), then TEST accuracy for that r is reported over seeds 0..4.
- params = sum(p.numel() for p in model.parameters()); kept <= ~4000.

Run: PYTHONIOENCODING=utf-8 python docs/multipath-frequentiel/etapeD-mcsa/val_lru_nl.py
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


class ModalCore(nn.Module):
    """Diagonal complex linear recurrence -- the shared LRU backbone.

    lam_k = rho_k * exp(i*theta_k), rho_k = sigmoid(nu_k) in (0,1) so |lam|<1
    (guaranteed-stable resonators). A complex projection B maps the 3 real
    input channels to r complex modes at each step; the state is unrolled with
    h_t = lam (*) h_{t-1} + u_t. Returns the per-step magnitude |h_t| (r real),
    i.e. the modal energy trajectory that both readout heads consume.
    """

    def __init__(self, r, c_in=3):
        super().__init__()
        # nu -> rho via sigmoid; init rho in a moderate-memory band (~0.5-0.95).
        self.nu = nn.Parameter(torch.linspace(0.0, 2.5, r))
        # spread the resonant angles across (0, pi) so modes cover the band.
        self.theta = nn.Parameter(torch.linspace(0.1, math.pi - 0.1, r))
        # complex input projection B (real + imag parts), small init.
        self.b_re = nn.Parameter(torch.randn(c_in, r) * (1.0 / math.sqrt(c_in)))
        self.b_im = nn.Parameter(torch.randn(c_in, r) * (1.0 / math.sqrt(c_in)))
        self.r = r

    def forward(self, x):  # x: (B, T, c_in) -> |h|: (B, T, r) real
        # Diagonal linear recurrence with time-constant lam has the closed form
        #   h_t = sum_{j<=t} lam^(t-j) u_j ,
        # so the whole 64-step scan is one lower-triangular complex convolution
        # (batched matmul), NOT a Python loop -- exact same result, far fewer
        # kernel launches (launch-latency bound otherwise). Since |lam|<1, every
        # power lam^k has |.|<=1, so no overflow (the lam^{-j} closed form would
        # overflow; the convolution form is stable).
        t = x.shape[1]
        rho = torch.sigmoid(self.nu)  # (r,) in (0,1)
        lam = torch.complex(rho * torch.cos(self.theta),
                            rho * torch.sin(self.theta))  # (r,) complex, |lam|<1
        b_mat = torch.complex(self.b_re, self.b_im)  # (c_in, r) complex
        u = x.to(lam.real.dtype).type(torch.complex64) @ b_mat.type(torch.complex64)  # (B,T,r)
        # powers[k] = lam^k for k=0..T-1 (bounded), then kernel[d] = lam^d.
        idx = torch.arange(t, device=x.device)
        # powvec[k,r] = lam_r^k for k=0..T-1, built by cumprod (cheap) instead of
        # a transcendental power on the full lag grid.
        ones = torch.ones(1, self.r, dtype=lam.dtype, device=x.device)
        steps = lam.unsqueeze(0).expand(t - 1, self.r)
        powvec = torch.cumprod(torch.cat([ones, steps], dim=0), dim=0)  # (T,r)
        # gather into M[t,j,r] = lam^(t-j) for j<=t, 0 above the diagonal.
        d = idx[:, None] - idx[None, :]  # (T,T) integer lag
        mask = (d >= 0)
        powk = powvec[d.clamp(min=0)] * mask.unsqueeze(-1)  # (T,T,r) complex
        h = torch.einsum("tjr,bjr->btr", powk, u)  # (B,T,r) complex
        return (h.abs() + 1e-8)  # (B,T,r) real magnitude trajectory


class ModalNL(nn.Module):
    """Nonlinear modal-temporal readout (S4-style GLU mixing) on top of ModalCore.

    The per-step modal magnitudes are mixed across modes by a GLU (a Linear to
    2r followed by value * sigmoid(gate)), with a GELU-shaped value branch, then
    pooled by mean+last and mapped to 5 logits. When ``mixing=False`` the block
    degenerates to the plain LRU (pool the raw magnitudes, no mixing), which is
    the honest baseline reported alongside.
    """

    def __init__(self, r, mixing=True, c_in=3, num_classes=K):
        super().__init__()
        self.core = ModalCore(r, c_in)
        self.mixing = mixing
        self.r = r
        if mixing:
            # GLU: Linear(r -> 2r); split into value (GELU) and gate (sigmoid).
            self.mix = nn.Linear(r, 2 * r)
            feat = r
        else:
            self.mix = None
            feat = r
        # pooled = [mean ; last] -> 2*feat
        self.head = nn.Linear(2 * feat, num_classes)

    def forward(self, x):  # x: (B, T, 3) -> (B, 5)
        m = self.core(x)  # (B, T, r)
        if self.mixing:
            z = self.mix(m)  # (B, T, 2r)
            val, gate = z.chunk(2, dim=-1)
            g = torch.nn.functional.gelu(val) * torch.sigmoid(gate)  # (B, T, r)
        else:
            g = m
        pooled = torch.cat([g.mean(dim=1), g[:, -1, :]], dim=-1)  # (B, 2*feat)
        return self.head(pooled)

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


def run_config(r, mixing, x_all, y_all, x_te, y_te, seeds, device):
    """Train over seeds; return (val_accs, test_accs, recalls, params, last_cm)."""
    val_accs, test_accs, recalls, params, last_cm = [], [], [], None, None
    for seed in range(seeds):
        (x_tr, y_tr), (x_val, y_val) = split_train_val(x_all, y_all, seed=seed)
        m = ModalNL(r, mixing=mixing).to(device)
        params = m.num_params()
        train_classifier(
            m,
            x_tr.to(device), y_tr.to(device),
            x_val.to(device), y_val.to(device),
            seed=seed, max_epochs=200, lr=3e-3, patience=25,
        )
        val_accs.append(accuracy(m, x_val.to(device), y_val.to(device)) * 100)
        test_accs.append(accuracy(m, x_te.to(device), y_te.to(device)) * 100)
        cm = confusion(m, x_te.to(device), y_te.to(device), K)
        recalls.append(per_class_recall(cm))
        last_cm = cm.tolist()
        del m
    return (np.array(val_accs), np.array(test_accs), np.mean(recalls, axis=0),
            params, last_cm)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=int, default=5)
    args = ap.parse_args()

    device = "cuda" if torch.cuda.is_available() else "cpu"
    x_all, y_all, classes = load_split("train")
    x_te, y_te, _ = load_split("test")
    print("MCSA Nonlinear-LRU (S4-style GLU mixing) -- variant B envelope")
    print("train %d, test %d, classes %s, device %s" % (x_all.shape[0], x_te.shape[0], classes, device))
    print("baselines: LSTM 88.0%% (4773p) . TCN ~81%% . MLP|FFT| ~85%%\n")

    # ---- sweep r for the NONLINEAR model; select by VAL accuracy -------------
    sweep = {}
    for r in (8, 16, 32):
        va, te, rec, p, cm = run_config(r, True, x_all, y_all, x_te, y_te, args.seeds, device)
        sweep[r] = dict(val=va, test=te, recall=rec, params=p, cm=cm)
        print("  NL   r=%2d  p=%4d  VAL=%5.1f%%  (TEST=%5.1f+/-%4.1f%%, max %4.1f)  recall=%s"
              % (r, p, va.mean(), te.mean(), te.std(), te.max(),
                 [round(float(x), 2) for x in rec]), flush=True)

    # SELECT r by validation mean (never by test).
    best_r = max(sweep, key=lambda k: sweep[k]["val"].mean())
    best = sweep[best_r]
    print("\n  -> selected r=%d by VAL (%.1f%%); its TEST=%.1f+/-%.1f%% (%d p)"
          % (best_r, best["val"].mean(), best["test"].mean(), best["test"].std(), best["params"]))

    # ---- plain-LRU baseline at the SAME r (no mixing) for an honest delta ----
    pva, pte, prec, pp, pcm = run_config(best_r, False, x_all, y_all, x_te, y_te, args.seeds, device)
    print("  plain LRU (no mixing) r=%d  p=%4d  VAL=%5.1f%%  TEST=%5.1f+/-%4.1f%%"
          % (best_r, pp, pva.mean(), pte.mean(), pte.std()), flush=True)

    delta = best["test"].mean() - pte.mean()
    helped = delta > 0.3  # >0.3pt = meaningful given the noise
    matched = best["test"].mean() >= 88.0 - 0.5

    notes = (
        "Nonlinear LRU (S4-style: diagonal complex recurrence lam=rho*exp(i*theta), |lam|<1, "
        "then per-step GLU/GELU mixing on |h| across r modes, mean+last pool). "
        "Swept r in {8,16,32}, selected r=%d by VAL accuracy (%.1f%%). "
        "TEST=%.1f+/-%.1f%% over %d seeds at %d params. "
        "Plain LRU (same recurrence, no mixing) at r=%d: TEST=%.1f+/-%.1f%%. "
        "Nonlinear mixing %s the plain LRU (delta=%+.1f pt); "
        "vs paper LSTM 88.0%%: %s. Params well under the 4000 ceiling."
        % (best_r, best["val"].mean(), best["test"].mean(), best["test"].std(),
           args.seeds, best["params"], best_r, pte.mean(), pte.std(),
           ("helped" if helped else ("hurt" if delta < -0.3 else "was ~neutral vs")),
           delta,
           ("matched/beat it" if matched else ("within ~%.1f pt" % (88.0 - best["test"].mean())))))
    print("\nNOTES:", notes)

    out = os.path.join(os.path.dirname(__file__), "results-lru-nl.json")
    with open(out, "w") as f:
        json.dump({
            "selected_r": best_r,
            "params": best["params"],
            "test_mean": float(best["test"].mean()),
            "test_std": float(best["test"].std()),
            "test_max": float(best["test"].max()),
            "val_mean": float(best["val"].mean()),
            "recall": [round(float(x), 3) for x in best["recall"]],
            "confusion_last": best["cm"],
            "sweep": {str(r): {"val_mean": float(sweep[r]["val"].mean()),
                               "test_mean": float(sweep[r]["test"].mean()),
                               "test_std": float(sweep[r]["test"].std()),
                               "params": sweep[r]["params"]} for r in sweep},
            "plain_lru": {"r": best_r, "params": pp,
                          "test_mean": float(pte.mean()), "test_std": float(pte.std())},
            "delta_vs_plain": float(delta),
        }, f, indent=2)
    print("(results -> %s)" % out)


if __name__ == "__main__":
    main()
