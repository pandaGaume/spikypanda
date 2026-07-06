"""
L1 — multi-parameter regression sanity check.

Isolates the CVNN training mechanics BEFORE adding a classification head or a
dataset: a 2-complex-layer SpectralCVNN regresses the CONTINUOUS modulation
depth m from an AM signal. If loss drops far below its initial value and the
predicted m tracks the true m, the complex multi-layer stack + Wirtinger
autograd works beyond 2 parameters — the prerequisite for L2.

Run: python docs/multipath-frequentiel/h3/L1/l1_regression.py
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "python"))

import torch  # noqa: E402

from cvnn import SpectralCVNNRegressor  # noqa: E402
from datasets import AMConfig, band_window, make_am_regression  # noqa: E402

SEED = 0
EPOCHS = 1500
LR = 1e-2


def main() -> None:
    torch.manual_seed(SEED)
    bins, carrier_idx = band_window()

    train_cfg = AMConfig(n_per_split=2000)
    test_cfg = AMConfig(n_per_split=500)
    x_tr, m_tr = make_am_regression(train_cfg, seed=1)
    x_te, m_te = make_am_regression(test_cfg, seed=2)

    # readout="abs": depth is a MAGNITUDE (m ∝ |sideband|), so the |.| readout
    # is the needed non-linearity (and is carrier-phase invariant). view_as_real
    # + linear head is an essentially linear path and cannot read magnitude.
    model = SpectralCVNNRegressor(bins, carrier_idx, hidden_dims=[6, 4], out_dim=1, readout="abs")
    n_params = model.num_params()
    opt = torch.optim.Adam(model.parameters(), lr=LR)
    loss_fn = torch.nn.MSELoss()

    with torch.no_grad():
        loss0 = loss_fn(model(x_tr), m_tr).item()

    last = loss0
    for epoch in range(EPOCHS):
        opt.zero_grad()
        loss = loss_fn(model(x_tr), m_tr)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()
        last = loss.item()
        if epoch % 250 == 0 or epoch == EPOCHS - 1:
            print(f"  epoch {epoch:4d}  train_loss={last:.4e}")

    model.eval()
    with torch.no_grad():
        pred = model(x_te)
        test_mse = loss_fn(pred, m_te).item()
        # R^2 on the test set
        ss_res = ((pred - m_te) ** 2).sum().item()
        ss_tot = ((m_te - m_te.mean()) ** 2).sum().item()
        r2 = 1.0 - ss_res / ss_tot

    print(f"[L1] params={n_params}  loss0={loss0:.3e}  train_loss={loss.item():.3e}  test_mse={test_mse:.3e}  R2={r2:.4f}")
    assert loss.item() < loss0 * 1e-2, "L1: training did not reduce loss by >=100x"
    assert r2 > 0.95, f"L1: test R^2 too low ({r2:.3f}) — the stack does not track m"
    print("[L1] PASS — the complex multi-layer stack converges and tracks m.")


if __name__ == "__main__":
    main()
