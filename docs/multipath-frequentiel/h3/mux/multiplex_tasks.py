"""
Is the multiplexing advantage about FREQUENCY, or about SHARED STRUCTURE?

The sin(w_i u_i) test was signal-native (a frequency substrate on a frequency
task). Here we replace it with NON-sinusoidal tasks to find out what actually
drives the compactness:

  TASK A  arbitrary  : each channel target = its OWN frozen random MLP (N unrelated
                       functions, no shared structure)      -> prediction: substrate LOSES
  TASK B  shared     : one FROZEN random base g (arbitrary, non-sinusoidal), per-channel
                       affine: y_i = g(s_i*u_i + o_i)        -> prediction: substrate WINS
                       (it factorizes: learn g once in the shared readout, tune per band)

If B (non-frequency, shared structure) still favours the substrate, the advantage
is SHARED STRUCTURE (a hypernetwork / genome-bottleneck effect), not frequency.

Run: python docs/multipath-frequentiel/h3/mux/multiplex_tasks.py
"""

import numpy as np
import torch
import torch.nn as nn

DEVICE = "cpu"
N_LIST = [4, 8, 16, 32, 64]
EPOCHS = 1500
LR = 5e-3


def frozen_mlp(seed, r=6, scale=0.9):
    # Gentler frozen weights so a small learnable readout CAN approximate the base
    # (otherwise "substrate loses" is confounded by "base too hard to learn at all").
    g = torch.Generator().manual_seed(seed)
    net = nn.Sequential(nn.Linear(1, r), nn.Tanh(), nn.Linear(r, 1))
    with torch.no_grad():
        for p in net.parameters():
            p.copy_(torch.randn(p.shape, generator=g) * scale)
    for p in net.parameters():
        p.requires_grad_(False)
    return net


def make_task(N, kind, n=3000, seed=0):
    rng = np.random.default_rng(seed)
    u = torch.tensor(rng.uniform(-1.5, 1.5, size=(n, N)).astype(np.float32))
    y = torch.zeros(n, N)
    with torch.no_grad():
        if kind == "arbitrary":  # N unrelated frozen MLPs
            for i in range(N):
                y[:, i] = frozen_mlp(seed=1000 + i)(u[:, i : i + 1]).squeeze(1)
        else:  # "shared": one frozen base g, per-channel affine (non-sinusoidal)
            g = frozen_mlp(seed=42)
            s = torch.tensor(rng.uniform(0.8, 2.0, size=N).astype(np.float32))
            o = torch.tensor(rng.uniform(-0.6, 0.6, size=N).astype(np.float32))
            for i in range(N):
                y[:, i] = g((s[i] * u[:, i] + o[i]).unsqueeze(1)).squeeze(1)
    return u, y


class Substrate(nn.Module):
    """Per-band affine (O(N)) + a SHARED readout f. Factorizes shared structure."""

    def __init__(self, N, readout_h=8):
        super().__init__()
        self.gain = nn.Parameter(torch.randn(N) * 0.5)
        self.bias = nn.Parameter(torch.zeros(N))
        self.f = nn.Sequential(nn.Linear(1, readout_h), nn.Tanh(), nn.Linear(readout_h, 1))

    def forward(self, u):
        z = self.gain * u + self.bias
        return self.f(z.reshape(-1, 1)).reshape(u.shape)


class DenseMLP(nn.Module):
    def __init__(self, N, h):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(N, h), nn.Tanh(), nn.Linear(h, N))

    def forward(self, u):
        return self.net(u)


def nparams(m):
    return sum(p.numel() for p in m.parameters() if p.requires_grad)


def train_eval(model, u_tr, y_tr, u_te, y_te):
    torch.manual_seed(0)
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


def run(kind, title):
    print(f"\n=== {title} ===")
    print(f"{'N':>4}  {'Substrate O(N)':>20}  {'Dense h=16':>18}  {'Dense h=N':>20}")
    for N in N_LIST:
        u_tr, y_tr = make_task(N, kind, seed=1)
        u_te, y_te = make_task(N, kind, seed=2)
        sub, dense, densew = Substrate(N), DenseMLP(N, 16), DenseMLP(N, N)
        es = train_eval(sub, u_tr, y_tr, u_te, y_te)
        ed = train_eval(dense, u_tr, y_tr, u_te, y_te)
        ew = train_eval(densew, u_tr, y_tr, u_te, y_te)
        print(f"{N:>4}  {es:8.4f} (p={nparams(sub):4d})  {ed:8.4f} (p={nparams(dense):4d})  {ew:8.4f} (p={nparams(densew):5d})")


if __name__ == "__main__":
    print("Frequency, or shared structure? — test MSE (lower is better)")
    run("arbitrary", "TASK A: N unrelated frozen MLPs (no shared structure)  [prediction: substrate loses]")
    run("shared", "TASK B: shared frozen base g, per-channel affine (NON-sinusoidal)  [prediction: substrate wins]")
