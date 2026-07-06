"""
The scaling law that would upgrade the Wave Substrate from "good on MCSA" to a
GENERAL inductive bias (the property the user asked to demonstrate).

Claim under test (user's box):
    If a dynamics has a low-rank representation in a complex MODAL basis, the Wave
    Substrate's representation cost is bounded INDEPENDENTLY of the number of OBSERVED
    modes M, while a generic dense network's cost grows with M.

Canonical setting = Koopman / DMD. A latent state of r complex modes evolves
diagonally (eigenvalues lambda_k = rho_k e^{i omega_k}); we observe M channels that
are complex mixtures of those r modes:

    psi(t+1) = Lambda psi(t)          # r complex modes, diagonal (modal) evolution
    x(t)     = obs( Re(C psi(t)) )    # M observed channels, C in C^{M x r}, r << M

Task: one-step forecast x(t) -> x(t+1). We sweep M at FIXED true rank r and measure
params + test NMSE for four tiers:

  FullLinear   : x->x dense linear (no rank prior)          params O(M^2)   <- generic
  MLP          : x->h->x ReLU (fixed h, no rank prior)       params O(M h)
  LowRankLinear: x-> R^{2r} ->x  (knows the rank, linear)    params O(M r)   <- honesty control
  WaveKoopman  : encode->diagonal complex evolve->decode     params O(M r), DYNAMICS O(r)

Honest design point: on a LINEAR system the scaling claim reduces to "exploit the
rank r << M", which LowRankLinear already does. So the linear sweep tests the SCALING
(modal/low-rank flat in M vs dense grows). The `--nonlinear` sweep (observation
nonlinearity) then separates the Wave from the linear low-rank baseline: only the
Koopman encoder + modal latent stays both rank-efficient AND able to fit the
nonlinear map. That isolates exactly what is DEMONSTRATED (rank exploitation) from
what is WAVE-SPECIFIC (complex modal latent, nonlinear-extensible).

Run: python docs/multipath-frequentiel/h3/mux/modal_scaling.py --nonlinear
"""

import argparse
import json
import math
import os

import numpy as np
import torch
import torch.nn as nn


# --------------------------------------------------------------------------- data
def make_modal_system(r, M, seed, n_traj=400, length=24, snr_db=30.0, nonlinear=False):
    """A rank-r complex modal (Koopman/DMD) system observed on M channels.

    Returns (x_t, x_next) one-step forecast pairs, split into train / test by
    trajectory (no leakage), plus the true one-step operator rank for reference.
    """
    g = torch.Generator().manual_seed(seed)

    # r complex eigenvalues: lightly damped, spread frequencies (distinct, in (0, pi)).
    rho = 0.90 + 0.099 * torch.rand(r, generator=g)                      # |lambda| in [0.90, 0.999]
    omega = (torch.arange(1, r + 1, dtype=torch.float32) / (r + 1)) * math.pi
    omega = omega + 0.02 * torch.randn(r, generator=g)                   # jitter so they are not exact ratios
    lam = torch.polar(rho, omega)                                        # (r,) complex

    # observation mixing C in C^{M x r}, unit-ish columns.
    C = (torch.randn(M, r, generator=g) + 1j * torch.randn(M, r, generator=g)) / math.sqrt(2 * r)

    # simulate trajectories from random complex initial modal states.
    psi0 = (torch.randn(n_traj, r, generator=g) + 1j * torch.randn(n_traj, r, generator=g))
    xs = []
    psi = psi0
    for _ in range(length):
        x = (psi @ C.T).real                                            # (n_traj, M) real observation
        xs.append(x)
        psi = psi * lam                                                 # diagonal modal evolution
    X = torch.stack(xs, dim=1)                                          # (n_traj, length, M)

    if nonlinear:
        # invertible observation nonlinearity: a linear model can no longer fit
        # x_t -> x_{t+1}, but a Koopman encoder can undo it into modal coords.
        X = torch.tanh(1.3 * X)

    # additive observation noise at target SNR.
    sig_p = X.pow(2).mean()
    noise_p = sig_p / (10 ** (snr_db / 10))
    X = X + math.sqrt(noise_p.item()) * torch.randn(X.shape, generator=g)

    # one-step pairs, flattened over time.
    x_t = X[:, :-1, :].reshape(-1, M)
    x_next = X[:, 1:, :].reshape(-1, M)

    # split by trajectory index to avoid leakage.
    n_pairs_per = length - 1
    traj_id = torch.arange(n_traj).repeat_interleave(n_pairs_per)
    is_test = (traj_id % 5 == 0)                                        # 20% held-out trajectories
    tr = ~is_test
    # standardize inputs/outputs by train stats (shared) so NMSE is comparable across M.
    mu, sd = x_t[tr].mean(0, keepdim=True), x_t[tr].std(0, keepdim=True).clamp_min(1e-6)
    xtn = (x_t - mu) / sd
    xnn = (x_next - mu) / sd
    return xtn[tr], xnn[tr], xtn[is_test], xnn[is_test]


# ------------------------------------------------------------------------- models
class FullLinear(nn.Module):
    """Generic dense linear map, no rank prior. Params ~ M^2."""
    def __init__(self, M):
        super().__init__()
        self.f = nn.Linear(M, M)

    def forward(self, x):
        return self.f(x)


class MLP(nn.Module):
    """Generic ReLU MLP, fixed hidden width, no rank prior. Params ~ M h."""
    def __init__(self, M, h=32):
        super().__init__()
        self.f = nn.Sequential(nn.Linear(M, h), nn.ReLU(), nn.Linear(h, M))

    def forward(self, x):
        return self.f(x)


class LowRankLinear(nn.Module):
    """Rank-2r linear bottleneck: knows the rank, not the modal structure. Params ~ M r."""
    def __init__(self, M, r):
        super().__init__()
        self.down = nn.Linear(M, 2 * r, bias=False)
        self.up = nn.Linear(2 * r, M)

    def forward(self, x):
        return self.up(self.down(x))


class WaveKoopman(nn.Module):
    """Encode -> diagonal COMPLEX modal evolution -> decode.

    The dynamics core is r complex eigenvalues (2r real params), CONSTANT in M.
    Encoder/decoder are the unavoidable I/O maps (O(M r)); with a small hidden layer
    they also invert the observation nonlinearity (deep-Koopman, Lusch et al. 2018).
    """
    def __init__(self, M, r, h=32):
        super().__init__()
        self.r = r
        self.enc = nn.Sequential(nn.Linear(M, h), nn.Tanh(), nn.Linear(h, 2 * r))
        self.dec = nn.Sequential(nn.Linear(2 * r, h), nn.Tanh(), nn.Linear(h, M))
        # diagonal complex eigenvalues, constrained |lambda| <= 1 for stable rollout.
        self.rho_raw = nn.Parameter(torch.zeros(r))
        self.theta = nn.Parameter(0.1 * torch.randn(r))

    def evolve(self, z):
        a, b = z[:, : self.r], z[:, self.r :]                          # real, imag parts
        rho = torch.sigmoid(self.rho_raw)
        cos, sin = torch.cos(self.theta), torch.sin(self.theta)
        na = rho * (cos * a - sin * b)
        nb = rho * (sin * a + cos * b)
        return torch.cat([na, nb], dim=1)

    def forward(self, x):
        return self.dec(self.evolve(self.enc(x)))

    def dynamics_params(self):
        return 2 * self.r


def n_params(m):
    return sum(p.numel() for p in m.parameters())


# ----------------------------------------------------------------------- training
def nmse(model, x, y):
    model.eval()
    with torch.no_grad():
        pred = model(x)
    return (pred - y).pow(2).mean().item() / y.pow(2).mean().item()


def train(model, x_tr, y_tr, x_te, y_te, seed, epochs=400, lr=3e-3, batch=256, wd=1e-5):
    torch.manual_seed(seed)
    opt = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=wd)
    loss_fn = nn.MSELoss()
    n = x_tr.shape[0]
    best, best_state, wait = 1e9, None, 0
    for ep in range(epochs):
        model.train()
        perm = torch.randperm(n)
        for i in range(0, n, batch):
            idx = perm[i : i + batch]
            opt.zero_grad()
            loss_fn(model(x_tr[idx]), y_tr[idx]).backward()
            opt.step()
        v = nmse(model, x_te, y_te)
        if v < best - 1e-4:
            best, wait = v, 0
            best_state = {k: p.detach().clone() for k, p in model.state_dict().items()}
        else:
            wait += 1
            if wait >= 30:
                break
    if best_state is not None:
        model.load_state_dict(best_state)
    return nmse(model, x_te, y_te)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--r", type=int, default=6, help="true modal rank (fixed while M sweeps)")
    ap.add_argument("--M", type=int, nargs="+", default=[8, 16, 32, 64, 128])
    ap.add_argument("--seeds", type=int, default=3)
    ap.add_argument("--nonlinear", action="store_true")
    ap.add_argument("--h", type=int, default=32, help="hidden width for MLP and Koopman I/O")
    ap.add_argument("--out", type=str, default=None)
    args = ap.parse_args()

    r = args.r
    regime = "nonlinear (tanh obs)" if args.nonlinear else "linear"
    print(f"Modal scaling — true rank r={r} FIXED, sweeping observed M, regime: {regime}, "
          f"{args.seeds} seeds")
    print(f"  models: FullLinear (O(M^2)) · MLP h={args.h} (O(Mh)) · LowRankLinear (O(Mr)) · "
          f"WaveKoopman (O(Mr), dynamics 2r={2*r})\n")

    builders = {
        "FullLinear": lambda M: FullLinear(M),
        "MLP": lambda M: MLP(M, args.h),
        "LowRankLinear": lambda M: LowRankLinear(M, r),
        "WaveKoopman": lambda M: WaveKoopman(M, r, args.h),
    }
    results = {name: {"M": [], "params": [], "nmse": [], "nmse_std": []} for name in builders}

    header = f"{'M':>5} | " + " | ".join(f"{n:>22}" for n in builders)
    print(header)
    print("-" * len(header))
    for M in args.M:
        cells = {}
        for name, build in builders.items():
            errs, params = [], None
            for s in range(args.seeds):
                x_tr, y_tr, x_te, y_te = make_modal_system(r, M, seed=100 + s, nonlinear=args.nonlinear)
                m = build(M)
                params = n_params(m)
                errs.append(train(m, x_tr, y_tr, x_te, y_te, seed=s))
            e = float(np.mean(errs))
            es = float(np.std(errs))
            results[name]["M"].append(M)
            results[name]["params"].append(params)
            results[name]["nmse"].append(e)
            results[name]["nmse_std"].append(es)
            extra = f" dyn={m.dynamics_params()}" if hasattr(m, "dynamics_params") else ""
            cells[name] = f"{params:5d}p {100*e:5.1f}%{extra}"
        print(f"{M:>5} | " + " | ".join(f"{cells[n]:>22}" for n in builders))

    if args.out:
        with open(args.out, "w") as f:
            json.dump({"r": r, "regime": regime, "results": results}, f, indent=2)
        print(f"\n(results -> {args.out})")


if __name__ == "__main__":
    main()
