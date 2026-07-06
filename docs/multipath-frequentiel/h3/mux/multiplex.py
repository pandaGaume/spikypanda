"""
The multiplexing test we skipped: does ONE shared topology carry N computations
via frequency bands more compactly than a real (dense) network?

H1 (capacity): N channels coexist on one shared topology, re-separated.
H5 (compactness): a SHARED readout + per-band tuning = O(N) params + O(1) wiring,
    where a dense MLP needs O(N*h) — the substrate provides channel separation
    (the structure) for free.
H4 (coupling): cross-channel targets need coupling; independent bands can't.

Two tasks:
  - diagonal   : y_i = sin(w_i * u_i)             (each output <- its own input)
  - coupled    : y_i = sin(w_i * u_i) + c * u_{i-1}  (cross-channel term, H4)

Models:
  - Substrate      : per-band gain/bias (+ optional coupling) -> SHARED readout f
  - Substrate+coup : same, with a learnable neighbour coupling
  - DenseMLP(h)    : u -> h -> N (a fixed-width real net; capacity-limited as N grows)

Run: python docs/multipath-frequentiel/h3/mux/multiplex.py
"""

import numpy as np
import torch
import torch.nn as nn

torch.manual_seed(0)
DEVICE = "cpu"
N_LIST = [4, 8, 16, 32, 64]
EPOCHS = 1500
LR = 5e-3


def make_task(N, coupled=False, n=3000, seed=0):
    rng = np.random.default_rng(seed)
    omega = rng.uniform(1.0, 4.0, size=N)  # distinct per-channel frequency
    u = rng.uniform(-1.0, 1.0, size=(n, N)).astype(np.float32)
    y = np.sin(omega[None, :] * u).astype(np.float32)
    if coupled:
        y = y + 0.5 * np.roll(u, 1, axis=1)  # y_i += 0.5 * u_{i-1}  (cross-channel)
    return torch.tensor(u), torch.tensor(y), omega


class Substrate(nn.Module):
    """N bands share ONE small readout f; per-band gain/bias tune it. O(N)+|f| params."""

    def __init__(self, N, readout_h=8, coupling=False):
        super().__init__()
        self.gain = nn.Parameter(torch.randn(N) * 0.5)
        self.bias = nn.Parameter(torch.zeros(N))
        self.coupling = nn.Parameter(torch.zeros(N)) if coupling else None
        self.f = nn.Sequential(nn.Linear(1, readout_h), nn.Tanh(), nn.Linear(readout_h, 1))  # SHARED

    def forward(self, u):  # u: (B, N)
        z = self.gain * u + self.bias
        y = self.f(z.reshape(-1, 1)).reshape(u.shape)
        if self.coupling is not None:
            y = y + self.coupling * torch.roll(u, 1, dims=1)  # learnable neighbour coupling
        return y


class DenseMLP(nn.Module):
    def __init__(self, N, h=16):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(N, h), nn.Tanh(), nn.Linear(h, N))

    def forward(self, u):
        return self.net(u)


def nparams(m):
    return sum(p.numel() for p in m.parameters())


def train_eval(model, u_tr, y_tr, u_te, y_te):
    opt = torch.optim.Adam(model.parameters(), lr=LR)
    lossf = nn.MSELoss()
    for _ in range(EPOCHS):
        opt.zero_grad()
        lossf(model(u_tr), y_tr).backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
        opt.step()
    model.eval()
    with torch.no_grad():
        return lossf(model(u_te), y_te).item()


def run(coupled, title):
    print(f"\n=== {title} ===")
    print(f"{'N':>4}  {'Substrate+coup':>20}  {'DenseMLP(h=16)':>20}  {'DenseMLP(h=N)':>22}")
    for N in N_LIST:
        u_tr, y_tr, _ = make_task(N, coupled, seed=1)
        u_te, y_te, _ = make_task(N, coupled, seed=2)
        subc = Substrate(N, coupling=True)
        dense = DenseMLP(N, h=16)
        dense_w = DenseMLP(N, h=N)  # width scales with N -> O(N^2) params
        e_subc = train_eval(subc, u_tr, y_tr, u_te, y_te)
        e_dense = train_eval(dense, u_tr, y_tr, u_te, y_te)
        e_densew = train_eval(dense_w, u_tr, y_tr, u_te, y_te)
        print(f"{N:>4}  {e_subc:8.4f} (p={nparams(subc):4d})  {e_dense:8.4f} (p={nparams(dense):4d})  "
              f"{e_densew:8.4f} (p={nparams(dense_w):5d})")


if __name__ == "__main__":
    print("Multiplexing capacity + compactness — test MSE (lower is better)")
    run(coupled=False, title="Diagonal task  y_i = sin(w_i u_i)   [H1/H5: independent channels]")
    run(coupled=True, title="Coupled task   y_i = sin(w_i u_i) + 0.5 u_{i-1}   [H4: cross-channel]")
