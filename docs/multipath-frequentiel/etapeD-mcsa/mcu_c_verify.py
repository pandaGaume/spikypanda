"""
A (MCU plan): compile the real C kernel, run it on the true test set, prove it is
bit-close to the trained PyTorch model, and sweep fixed-point precision to answer
the near-unit-circle (rho~0.99) coefficient-quantization risk.

Run: OMP_NUM_THREADS=1 PYTHONIOENCODING=utf-8 python docs/multipath-frequentiel/etapeD-mcsa/mcu_c_verify.py
"""

import os
import shutil
import subprocess
import sys

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "h3", "python"))

import numpy as np  # noqa: E402
import torch  # noqa: E402

from mcu_lower_lru import DiagComplexLRU, extract_biquads, biquad_bank_forward, _state_feats_np, EPS  # noqa: E402
from mcsa_data import load_split  # noqa: E402
from val_lru import split_train_val  # noqa: E402
from train import train_classifier  # noqa: E402

HERE = os.path.dirname(__file__)


def find_leak(x_tr, x_te):
    tr = {x_tr[i].numpy().tobytes() for i in range(x_tr.shape[0])}
    return [j for j in range(x_te.shape[0]) if x_te[j].numpy().tobytes() in tr]


def dump_data(path, c, x):
    r, feat, nwin, T = c["r"], c["W_head"].shape[1], x.shape[0], x.shape[1]
    with open(path, "w") as f:
        f.write("%d %d %d %d\n" % (r, T, feat, nwin))
        for arr in (c["W_drive"].ravel(), c["b_drive"], c["g"], c["w"],
                    c["W_head"].ravel(), c["b_head"]):
            f.write(" ".join("%.9g" % v for v in arr) + "\n")
        for n in range(nwin):
            f.write(" ".join("%.9g" % v for v in x[n].ravel()) + "\n")


def fixedpoint_forward(c, x, frac_coef, frac_state=None):
    """biquad-bank forward with coefficients (and optionally state) quantized to
    `frac` fractional bits (round to 2^-frac grid, unlimited integer range so this
    isolates PRECISION from range/overflow)."""
    q = lambda a, b: np.round(a * (1 << b)) / (1 << b)
    r, B, T = c["r"], x.shape[0], x.shape[1]
    Wd, bd = q(c["W_drive"], frac_coef), q(c["b_drive"], frac_coef)
    g, w = q(c["g"], frac_coef), q(c["w"], frac_coef)
    Wh, bh = q(c["W_head"], frac_coef), q(c["b_head"], frac_coef)
    drive = x @ Wd.T + bd
    b_re, b_im = drive[..., :r], drive[..., r:]
    h_re = np.zeros((B, r)); h_im = np.zeros((B, r))
    sre = np.zeros((B, r)); sim = np.zeros((B, r))
    for t in range(T):
        nre = g * h_re - w * h_im + b_re[:, t]
        nim = w * h_re + g * h_im + b_im[:, t]
        if frac_state is not None:
            nre, nim = q(nre, frac_state), q(nim, frac_state)
        h_re, h_im = nre, nim
        sre += h_re; sim += h_im
    last = _state_feats_np(h_re, h_im, c["readout"])
    mean = _state_feats_np(sre / T, sim / T, c["readout"])
    return np.concatenate([last, mean], -1) @ Wh.T + bh


def main():
    torch.manual_seed(0)
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    x_all, y_all, classes = load_split("train")
    x_te, y_te, _ = load_split("test")
    keep = torch.tensor([j for j in range(x_te.shape[0]) if j not in set(find_leak(x_all, x_te))])
    x_te, y_te = x_te[keep], y_te[keep]                     # clean test (392)

    (x_tr, y_tr), (x_val, y_val) = split_train_val(x_all, y_all, seed=0)
    m = DiagComplexLRU(r=64, readout="magreim").to(dev)
    train_classifier(m, x_tr.to(dev), y_tr.to(dev), x_val.to(dev), y_val.to(dev),
                     seed=0, max_epochs=200, lr=3e-3, patience=25, weight_decay=0.0)
    m = m.cpu().eval()
    c = extract_biquads(m)
    yv = y_te.numpy()

    # ---- compile + run the real C kernel ----
    print("== A. Compile + run the C kernel on the clean test (392 windows) ==")
    src, exe, data = os.path.join(HERE, "mcu_resonator.c"), os.path.join(HERE, "mcu_resonator.exe"), os.path.join(HERE, "_mcu_data.txt")
    gcc = next((g for g in ("gcc", r"C:\msys64\ucrt64\bin\gcc.exe") if shutil.which(g) or os.path.exists(g)), None)
    if gcc is None:
        print("  no gcc found"); return
    cc = subprocess.run([gcc, "-O2", "-static", "-std=c11", src, "-lm", "-o", exe], capture_output=True, text=True)
    if cc.returncode != 0:
        print("  gcc FAILED:\n", cc.stderr); return
    dump_data(data, c, x_te.numpy().astype(np.float32))
    run = subprocess.run([exe, data], capture_output=True, text=True)
    logits_c = np.array([[float(v) for v in ln.split()] for ln in run.stdout.strip().splitlines()])

    with torch.no_grad():
        logits_torch = m(x_te).numpy()
    pred_c, pred_t = logits_c.argmax(1), logits_torch.argmax(1)
    print("  max|C - torch logits| = %.2e" % np.max(np.abs(logits_c - logits_torch)))
    print("  prediction agreement C vs torch: %.2f%% (%d/%d)"
          % ((pred_c == pred_t).mean() * 100, int((pred_c == pred_t).sum()), len(pred_t)))
    print("  clean-test accuracy  torch=%.1f%%  C-kernel=%.1f%%  (identical=%s)"
          % ((pred_t == yv).mean() * 100, (pred_c == yv).mean() * 100,
             "YES" if (pred_c == yv).mean() == (pred_t == yv).mean() else "NO"))
    os.remove(data)

    # ---- fixed-point precision sweep (the rho~0.99 risk) ----
    print("\n== B. Fixed-point precision sweep (isolates pole-quantization sensitivity) ==")
    acc_f64 = (biquad_bank_forward(c, x_te.numpy().astype(np.float64)).argmax(1) == yv).mean() * 100
    print("  float reference accuracy: %.1f%%   (max pole radius rho = %.4f)" % (acc_f64, c["rho"].max()))
    print("  frac bits | coeffs-only acc | coeffs+state acc")
    for fb in (6, 8, 10, 12, 15):
        a_c = (fixedpoint_forward(c, x_te.numpy(), fb).argmax(1) == yv).mean() * 100
        a_cs = (fixedpoint_forward(c, x_te.numpy(), fb, frac_state=fb).argmax(1) == yv).mean() * 100
        print("     %2d     |     %5.1f%%      |     %5.1f%%" % (fb, a_c, a_cs))
    print("  (rounding to 2^-frac, unlimited integer range: isolates PRECISION, not overflow)")


if __name__ == "__main__":
    main()
