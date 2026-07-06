"""
KEYSTONE (MCU plan, Phase 1): lower the validated DiagComplexLRU to a BIQUAD BANK
and prove bit-close equivalence.

The validated model is a diagonal complex linear recurrence
    h_t = lam (elementwise) h_{t-1} + b_t ,   lam_k = rho_k * exp(i*theta_k) ,  h_0 = 0
with a complex drive b_t = W_drive x_t (real Linear 3 -> 2r read as b_re, b_im).

Each mode is a COMPLEX ONE-POLE filter. In real coordinates it is a 2-state second
order section (a "complex resonator" / coupled-form biquad):

    [h_re]      [ g  -w ] [h_re]        [b_re]
    [h_im]_t =  [ w   g ] [h_im]_{t-1} + [b_im]_t ,   g = rho*cos(theta), w = rho*sin(theta)

Its poles are rho*e^{+/- i theta}, i.e. the standard biquad denominator
    1 + a1 z^-1 + a2 z^-2 ,   a1 = -2*rho*cos(theta),  a2 = rho^2 .
So r modes = r second-order sections = a biquad bank. This runs sample-by-sample
in pure real arithmetic (no FFT, no complex runtime), streaming with O(r) state,
and maps onto CMSIS-DSP biquad cascades on an MCU.

This script:
  1) extracts the biquad-bank coefficients from a DiagComplexLRU,
  2) reimplements the forward pass with ONLY those coefficients in pure numpy
     (the 2-state real recurrence a hardware kernel would run),
  3) proves it is bit-close to the PyTorch model (random weights AND a model
     trained on the real UFU data -> identical predictions),
  4) prints the learned resonator table + the MCU inference budget.

Run: PYTHONIOENCODING=utf-8 python docs/multipath-frequentiel/etapeD-mcsa/mcu_lower_lru.py
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "h3", "python"))

import numpy as np  # noqa: E402
import torch  # noqa: E402

from val_lru import DiagComplexLRU, split_train_val  # noqa: E402
from mcsa_data import load_split  # noqa: E402
from train import train_classifier  # noqa: E402

EPS = 1e-6  # must match DiagComplexLRU._state_feats magnitude epsilon exactly


def extract_biquads(model: DiagComplexLRU) -> dict:
    """Pull the resonator-bank coefficients out of a trained LRU (no torch at deploy)."""
    with torch.no_grad():
        rho = torch.sigmoid(model.nu).cpu().numpy()          # (r,) pole radius in (0,1)
        theta = model.theta.cpu().numpy()                    # (r,) pole angle (rad/sample)
        g = rho * np.cos(theta)                              # Re(lam) = rotation-scale
        w = rho * np.sin(theta)                              # Im(lam)
        return {
            "r": int(model.r), "readout": model.readout,
            "rho": rho, "theta": theta, "g": g, "w": w,
            "a1": -2.0 * rho * np.cos(theta),                # biquad denom coeff
            "a2": rho ** 2,                                   # biquad denom coeff
            "W_drive": model.drive.weight.cpu().numpy(),      # (2r, 3)
            "b_drive": model.drive.bias.cpu().numpy(),        # (2r,)
            "W_head": model.head.weight.cpu().numpy(),        # (5, feat)
            "b_head": model.head.bias.cpu().numpy(),          # (5,)
        }


def _state_feats_np(h_re, h_im, readout):
    if readout == "mag":
        return np.sqrt(h_re * h_re + h_im * h_im + EPS)
    if readout == "reim":
        return np.concatenate([h_re, h_im], axis=-1)
    mag = np.sqrt(h_re * h_re + h_im * h_im + EPS)
    return np.concatenate([mag, h_re, h_im], axis=-1)


def biquad_bank_forward(c: dict, x: np.ndarray) -> np.ndarray:
    """Pure-numpy reference = the kernel an MCU would run. x: (B, T, 3) -> logits (B, 5).

    Sequential 2-state real recurrence per mode (the coupled-form resonator), then
    the same last+mean pooling / magnitude features / head as the torch model.
    """
    r = c["r"]
    B, T, _ = x.shape
    drive = x @ c["W_drive"].T + c["b_drive"]                # (B, T, 2r)
    b_re, b_im = drive[..., :r], drive[..., r:]
    g, w = c["g"], c["w"]                                    # (r,)

    h_re = np.zeros((B, r), dtype=np.float64)
    h_im = np.zeros((B, r), dtype=np.float64)
    seq_re = np.empty((B, T, r), dtype=np.float64)
    seq_im = np.empty((B, T, r), dtype=np.float64)
    for t in range(T):                                      # streaming, O(r) state
        nre = g * h_re - w * h_im + b_re[:, t]
        nim = w * h_re + g * h_im + b_im[:, t]
        h_re, h_im = nre, nim
        seq_re[:, t], seq_im[:, t] = h_re, h_im

    last = _state_feats_np(seq_re[:, -1], seq_im[:, -1], c["readout"])
    mean = _state_feats_np(seq_re.mean(1), seq_im.mean(1), c["readout"])
    feat = np.concatenate([last, mean], axis=-1)
    return feat @ c["W_head"].T + c["b_head"]


def max_abs_diff(model, coeffs, x):
    model.eval()
    with torch.no_grad():
        y_torch = model(x).cpu().numpy().astype(np.float64)
    y_bq = biquad_bank_forward(coeffs, x.numpy().astype(np.float64))
    return float(np.max(np.abs(y_torch - y_bq)))


def main():
    torch.manual_seed(0)
    r, readout = 64, "magreim"                              # the selected/validated config

    # ---- 1) architectural equivalence (weight-independent), random weights ----
    print("== 1. Bit-close equivalence on RANDOM weights (proves the lowering math) ==")
    m = DiagComplexLRU(r=r, readout=readout)
    x = torch.randn(16, 64, 3)
    d = max_abs_diff(m, extract_biquads(m), x)
    print("  r=%d %s  max|torch - biquad-bank| = %.2e  -> %s"
          % (r, readout, d, "PASS" if d < 1e-4 else "FAIL"))

    # ---- 2) the SAME on a model trained on the REAL data -> identical predictions ----
    print("\n== 2. Train one seed on real UFU MCSA, then deploy as a biquad bank ==")
    dev = "cuda" if torch.cuda.is_available() else "cpu"
    x_all, y_all, classes = load_split("train")
    x_te, y_te, _ = load_split("test")
    (x_tr, y_tr), (x_val, y_val) = split_train_val(x_all, y_all, seed=0)
    mt = DiagComplexLRU(r=r, readout=readout).to(dev)
    train_classifier(mt.to(dev), x_tr.to(dev), y_tr.to(dev), x_val.to(dev), y_val.to(dev),
                     seed=0, max_epochs=200, lr=3e-3, patience=25, weight_decay=0.0)
    mt = mt.cpu()
    coeffs = extract_biquads(mt)

    d_real = max_abs_diff(mt, coeffs, x_te)
    with torch.no_grad():
        pred_torch = mt(x_te).argmax(1).numpy()
    pred_bq = biquad_bank_forward(coeffs, x_te.numpy().astype(np.float64)).argmax(1)
    agree = float((pred_torch == pred_bq).mean())
    acc_torch = float((pred_torch == y_te.numpy()).mean())
    acc_bq = float((pred_bq == y_te.numpy()).mean())
    print("  test max|torch - biquad-bank| = %.2e" % d_real)
    print("  prediction agreement torch vs biquad-bank: %.2f%% (%d/%d)"
          % (agree * 100, int(agree * len(pred_torch)), len(pred_torch)))
    print("  test accuracy  torch=%.1f%%   biquad-bank=%.1f%%   (identical=%s)"
          % (acc_torch * 100, acc_bq * 100, "YES" if acc_torch == acc_bq else "NO"))

    # ---- 3) the learned resonator bank (a few modes) + MCU budget ----
    print("\n== 3. The learned resonator bank (first 8 of %d modes) ==" % r)
    print("  mode |  rho  | theta(rad/smp) | fc(cyc/smp) | mem~1/(1-rho) |    a1    |   a2")
    for k in range(min(8, r)):
        rho, th = coeffs["rho"][k], coeffs["theta"][k]
        print("  %4d | %.3f |     %.3f      |    %.3f    |     %5.1f     | %+.4f | %.4f"
              % (k, rho, th, th / (2 * math.pi), 1.0 / max(1e-3, 1 - rho),
                 coeffs["a1"][k], coeffs["a2"][k]))

    T = 64
    mac_drive = 3 * (2 * r) * T
    mac_recur = r * 4 * T                                   # coupled-form: 4 mul/mode/sample
    per = {"mag": r, "reim": 2 * r, "magreim": 3 * r}[readout]
    mac_head = (2 * per) * 5
    total = mac_drive + mac_recur + mac_head
    print("\n== 4. MCU inference budget (one %d-sample window) ==" % T)
    print("  drive Linear(3->%d): %d MAC | resonator bank: %d MAC | head: %d MAC"
          % (2 * r, mac_drive, mac_recur, mac_head))
    print("  TOTAL ~%d MAC/window | state = 2r = %d floats (%d bytes) | weights = %d params"
          % (total, 2 * r, 2 * r * 4, sum(p.numel() for p in mt.parameters())))
    print("  streaming, real arithmetic, no FFT, no complex runtime -> CMSIS biquad cascade.")


if __name__ == "__main__":
    main()
