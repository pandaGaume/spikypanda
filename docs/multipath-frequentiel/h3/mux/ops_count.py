"""
Params vs OPERATIONS: the honest embedded cost of the 13-param substrate.

13 params "makes you dream" for MCU, but params != compute. The substrate hides a
256-point FFT behind those 13 weights. This script counts real MACs (multiply-accumulate)
per inference (one decision over an N=256 window) for every model, verifies param counts
by instantiation, and adds a minimal RNN (there was none in multifault.py; the baselines
there were DenseRaw + TCN).

MAC conventions (1 MAC = 1 multiply-accumulate, real):
  Linear(a->b)            : a*b
  Conv1d(Cin->Cout,k,L)   : L*Cout*Cin*k
  FFT(N) real->complex    : ~2*N*log2(N)  (radix-2 rule of thumb; constant is fuzzy, ~4k-10k @N=256)
  Goertzel(1 bin, N)      : ~N            (recursive; computes ONE bin, streaming, O(1) state)
  RNN(H, N steps, 1 in)   : N*(H + H^2)   recurrent  +  H*K readout   (+ N*H tanh)
"""

import math
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from multifault import FS, N, Substrate, DenseRaw, TCN, fault_freqs  # noqa: E402
from complex_layers import count_params  # noqa: E402
import torch.nn as nn  # noqa: E402


def fft_macs(n):
    return int(2 * n * math.log2(n))          # full N-point FFT (all bins)


def goertzel_macs(n, k):
    return k * n                              # only the K fault bins, streaming


def substrate_nn_macs(k, h=2):
    # per band: ComplexLinear(1->h)=h complex MACs (~4h real) + ModReLU/abs (~5h) + readout(h->1)=h
    return k * (4 * h + 5 * h + h)            # ~10h per band


def dense_macs(k, h=32):
    return N * h + h * k


def tcn_macs(k, c=16, k_size=3, layers=3):
    m, prev = 0, 1
    for _ in range(layers):
        m += N * c * prev * k_size            # full-length causal conv over N positions
        prev = c
    m += c * k                                # head at last timestep
    return m


def rnn_macs(k, h, n=N):
    return n * (h + h * h) + h * k            # recurrent chain (N serial steps) + readout


def rnn_params(k, h):
    return (h * 1) + (h * h) + h + (h * k + k)  # W_ih + W_hh + b + readout


def main():
    print(f"One inference = one decision over an N={N} sample window (fs={FS}).")
    print(f"{'K':>3} | {'model':<22} {'params':>7} {'MACs/infer':>12}  {'note':<38}")
    print("-" * 92)
    for K in (2, 8, 16):
        freqs = fault_freqs(K)
        sub = Substrate(K, freqs)
        den = DenseRaw(K)
        tcn = TCN(K)
        h_rnn = 8                              # a natural small RNN
        rows = [
            ("Substrate (full FFT)", count_params(sub), fft_macs(N) + substrate_nn_macs(K),
             "13 weights + a 256-pt FFT (all bins)"),
            ("Substrate (Goertzel)", count_params(sub), goertzel_macs(N, K) + substrate_nn_macs(K),
             f"only the {K} fault bins, streaming O({K}) state"),
            ("RNN (h=8)", rnn_params(K, h_rnn), rnn_macs(K, h_rnn),
             f"{N} SERIAL steps (deep dependency)"),
            ("DenseRaw (h=32)", count_params(den), dense_macs(K), "no rank prior"),
            ("TCN (c=16)", count_params(tcn), tcn_macs(K), "temporal convs over full window"),
        ]
        for name, p, macs, note in rows:
            print(f"{K:>3} | {name:<22} {p:>7} {macs:>12,}  {note:<38}")
        print("-" * 92)

    # What hidden size makes an RNN ~40 params, and its cost?
    print("\nSizing an RNN to ~40 params (the number you cited):")
    for K in (2, 4):
        for h in (3, 4):
            print(f"  K={K}, h={h}: {rnn_params(K, h):>3} params, {rnn_macs(K, h):>6,} MACs "
                  f"({N} serial steps x ~{h + h*h} MAC)")


if __name__ == "__main__":
    main()
