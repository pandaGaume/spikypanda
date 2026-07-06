"""
The RIGHT framing (physics): 1 frequency <-> 1 fault <-> 1 hidden binary.

Motor faults each have a characteristic frequency (bearing BPFO/BPFI, broken bar
f(1+/-2s), eccentricity f0+/-fr, imbalance 1x). So fault detection is NATURALLY:
  - MULTI-LABEL (K faults can coexist), not 5-class softmax;
  - MULTIPLEXED (each fault lives on its own band).
A softmax classifier squashes K independent physical detections into ONE mutually
exclusive choice (the bottleneck we hit). The substrate reads the K fault-bands in
parallel and emits K hidden binaries.

Task: x(t) = carrier + sum_k present_k * sev_k * sin(2*pi*f_k*t + phi_k) + noise.
Label y in {0,1}^K (which faults are present). Sweep K (number of fault types).

Models (all output K logits, BCEWithLogits):
  - Substrate  : FFT -> read the K fault bins (complex) -> per-band -> K binaries. O(K).
  - DenseRaw   : MLP over the raw signal (must learn to isolate K frequencies).
  - TCN        : temporal conv over the raw signal.

Run: python docs/multipath-frequentiel/h3/mux/multifault.py
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "python"))

import numpy as np
import torch
import torch.nn as nn

from complex_layers import ComplexLinear, ModReLU, count_params, safe_abs  # noqa: E402

FS, N = 256, 256
F0 = 40  # carrier
EPOCHS, LR = 300, 5e-3
K_LIST = [2, 4, 8, 16]


def fault_freqs(K):
    # distinct characteristic frequencies spread around/above the carrier, on exact bins
    return [F0 + 8 + 6 * k for k in range(K)]  # e.g. 48, 54, 60, ... (bins)


def make_data(K, n=4000, snr_db=20.0, seed=0):
    rng = np.random.default_rng(seed)
    freqs = fault_freqs(K)
    t = np.arange(N) / FS
    x = np.zeros((n, N), dtype=np.float32)
    y = np.zeros((n, K), dtype=np.float32)
    for i in range(n):
        sig = 1.0 * np.sin(2 * np.pi * F0 * t + rng.uniform(0, 2 * np.pi))  # carrier
        for k in range(K):
            if rng.random() < 0.5:
                y[i, k] = 1.0
                sev = rng.uniform(0.15, 0.5)  # severity -> amplitude
                sig = sig + sev * np.sin(2 * np.pi * freqs[k] * t + rng.uniform(0, 2 * np.pi))
        p = np.mean(sig ** 2)
        sig = sig + rng.normal(0, np.sqrt(p / 10 ** (snr_db / 10)), size=N)
        x[i] = sig
    return torch.tensor(x), torch.tensor(y), freqs


class Substrate(nn.Module):
    """One band per fault -> K hidden binaries (multiplexed). O(K) params."""

    def __init__(self, K, freqs, h=2):
        super().__init__()
        bins = [int(round(f * N / FS)) for f in freqs]
        self.register_buffer("bins", torch.tensor(bins, dtype=torch.long))
        # per-fault: read its complex bin -> small shared complex transform -> binary
        self.cl = ComplexLinear(1, h)   # SHARED across faults (applied per band)
        self.act = ModReLU(h)
        self.readout = nn.Linear(h, 1)  # SHARED per-band -> 1 binary logit

    def forward(self, x):  # (B, N) -> (B, K)
        Z = torch.fft.fft(x, dim=1)[:, self.bins]  # (B, K) complex
        z = self.act(self.cl(Z.reshape(-1, 1)))    # (B*K, h) complex
        r = safe_abs(z)
        return self.readout(r).reshape(x.shape[0], -1)  # (B, K)

    def num_params(self):
        return count_params(self)


class DenseRaw(nn.Module):
    def __init__(self, K, h=32):
        super().__init__()
        self.net = nn.Sequential(nn.Linear(N, h), nn.ReLU(), nn.Linear(h, K))

    def forward(self, x):
        return self.net(x)

    def num_params(self):
        return count_params(self)


class Chomp1d(nn.Module):
    def __init__(self, n):
        super().__init__()
        self.n = n

    def forward(self, x):
        return x[:, :, : -self.n] if self.n > 0 else x


class TCN(nn.Module):
    def __init__(self, K, c=16):
        super().__init__()
        blocks = []
        prev = 1
        for i in range(3):
            pad = (3 - 1) * (2 ** i)
            blocks += [nn.Conv1d(prev, c, 3, padding=pad, dilation=2 ** i), Chomp1d(pad), nn.ReLU()]
            prev = c
        self.tcn = nn.Sequential(*blocks)
        self.head = nn.Linear(c, K)

    def forward(self, x):
        h = self.tcn(x.unsqueeze(1))[:, :, -1]
        return self.head(h)

    def num_params(self):
        return count_params(self)


def train_eval(model, x_tr, y_tr, x_te, y_te):
    torch.manual_seed(0)
    opt = torch.optim.Adam(model.parameters(), lr=LR)
    lossf = nn.BCEWithLogitsLoss()
    n = x_tr.shape[0]
    for _ in range(EPOCHS):
        perm = torch.randperm(n)
        for i in range(0, n, 128):
            idx = perm[i : i + 128]
            opt.zero_grad()
            lossf(model(x_tr[idx]), y_tr[idx]).backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            opt.step()
    model.eval()
    with torch.no_grad():
        pred = (model(x_te) > 0).float()
        per_fault = (pred == y_te).float().mean().item()          # mean over all K binaries
        exact = (pred == y_te).all(dim=1).float().mean().item()   # all K correct at once
    return per_fault, exact


def main():
    print("Multi-fault detection (1 freq <-> 1 fault <-> 1 binary) — per-fault acc / exact-match")
    print(f"{'K':>4}  {'Substrate':>26}  {'DenseRaw(h=32)':>26}  {'TCN':>24}")
    for K in K_LIST:
        x_tr, y_tr, freqs = make_data(K, seed=1)
        x_te, y_te, _ = make_data(K, seed=2)
        rows = []
        for ctor in (lambda: Substrate(K, freqs), lambda: DenseRaw(K), lambda: TCN(K)):
            m = ctor()
            pf, ex = train_eval(m, x_tr, y_tr, x_te, y_te)
            rows.append((pf, ex, m.num_params()))
        s, d, t = rows
        print(f"{K:>4}  {s[0]*100:5.1f}%/{s[1]*100:4.1f}% (p={s[2]:4d})  "
              f"{d[0]*100:5.1f}%/{d[1]*100:4.1f}% (p={d[2]:5d})  {t[0]*100:5.1f}%/{t[1]*100:4.1f}% (p={t[2]:4d})")


if __name__ == "__main__":
    main()
