"""
Synthetic amplitude-modulation datasets — the exact broken-rotor-bar signature
in clean form. A carrier f_c with two sidebands at f_c +/- f_mod of amplitude
A*m/2, so the sideband/carrier ratio IS m/2. The modulation depth m mirrors the
BRB severity (m ~ k/N). Grading m = reading the coupling strength = MCSA, clean.

Numerics: fs = N = 256, so bin spacing = 1 Hz. f_c = 32 -> bin 32, f_mod = 2 ->
sidebands on bins 30 and 34 (exactly on-bin, zero leakage — H1).
"""

from dataclasses import dataclass, field
from typing import List, Optional, Tuple

import numpy as np
import torch

FS = 256
N = 256
F_C = 32
F_MOD = 2
DEPTH_CENTERS = [0.00, 0.03, 0.06, 0.09, 0.12]  # Healthy, BRB1..BRB4


@dataclass
class AMConfig:
    n_per_split: int = 3000
    fs: int = FS
    n: int = N
    f_c: int = F_C
    f_mod: float = F_MOD
    depth_centers: List[float] = field(default_factory=lambda: list(DEPTH_CENTERS))
    m_jitter: float = 0.005
    # Realism knobs — OFF for clean L2, ON in L2.5:
    a_range: Tuple[float, float] = (1.0, 1.0)  # amplitude/scale (load analog)
    snr_db: Optional[float] = None  # additive white gaussian noise
    fmod_jitter: float = 0.0  # slip analog
    harmonics: float = 0.0  # amplitude of small carrier harmonics (2f_c, 3f_c)


def _t(cfg: AMConfig) -> np.ndarray:
    return np.arange(cfg.n) / cfg.fs


def make_am_dataset(cfg: AMConfig, seed: int) -> Tuple[torch.Tensor, torch.Tensor]:
    """K-class modulation-depth dataset. Returns X (n, N) float32, y (n,) int64."""
    rng = np.random.default_rng(seed)
    t = _t(cfg)
    k = len(cfg.depth_centers)
    xs = np.empty((cfg.n_per_split, cfg.n), dtype=np.float32)
    ys = np.empty((cfg.n_per_split, ), dtype=np.int64)
    for i in range(cfg.n_per_split):
        c = rng.integers(k)
        m = max(0.0, cfg.depth_centers[c] + rng.uniform(-cfg.m_jitter, cfg.m_jitter))
        theta = rng.uniform(0, 2 * np.pi)
        psi = rng.uniform(0, 2 * np.pi)
        amp = rng.uniform(*cfg.a_range)
        f_mod = cfg.f_mod + rng.uniform(-cfg.fmod_jitter, cfg.fmod_jitter)
        carrier = np.cos(2 * np.pi * cfg.f_c * t + theta)
        x = amp * (1.0 + m * np.cos(2 * np.pi * f_mod * t + psi)) * carrier
        if cfg.harmonics > 0:
            x = x + amp * cfg.harmonics * np.cos(2 * np.pi * 2 * cfg.f_c * t + theta)
            x = x + amp * cfg.harmonics * 0.5 * np.cos(2 * np.pi * 3 * cfg.f_c * t + theta)
        if cfg.snr_db is not None:
            sig_p = np.mean(x ** 2)
            noise_p = sig_p / (10 ** (cfg.snr_db / 10))
            x = x + rng.normal(0.0, np.sqrt(noise_p), size=cfg.n)
        xs[i] = x.astype(np.float32)
        ys[i] = c
    return torch.from_numpy(xs), torch.from_numpy(ys)


def make_phase_subtest(cfg: AMConfig, seed: int, m: float = 0.06) -> Tuple[torch.Tensor, torch.Tensor]:
    """Two classes with IDENTICAL |spectrum| but different relative sideband phase.

    Class 0 (AM):        x = cos(w_c t + th) [1 + m cos(w_m t + ps)]
                           -> sidebands (m/2) both with '+' sign.
    Class 1 (quadrature): x = cos(w_c t + th) + m sin(w_m t + ps) sin(w_c t + th)
                           -> upper sideband flips sign (phase pi), SAME |m/2|.

    |X[30]| = |X[34]| = m/2 and |X[32]| = 1 in BOTH -> a magnitude MLP is at
    chance; a complex net reads the sideband phase and separates them (H6).
    """
    rng = np.random.default_rng(seed)
    t = _t(cfg)
    xs = np.empty((cfg.n_per_split, cfg.n), dtype=np.float32)
    ys = np.empty((cfg.n_per_split, ), dtype=np.int64)
    for i in range(cfg.n_per_split):
        c = rng.integers(2)
        theta = rng.uniform(0, 2 * np.pi)
        psi = rng.uniform(0, 2 * np.pi)
        carrier = np.cos(2 * np.pi * cfg.f_c * t + theta)
        if c == 0:  # AM
            x = carrier + m * np.cos(2 * np.pi * cfg.f_mod * t + psi) * carrier
        else:  # quadrature (upper sideband sign-flipped)
            x = carrier + m * np.sin(2 * np.pi * cfg.f_mod * t + psi) * np.sin(2 * np.pi * cfg.f_c * t + theta)
        xs[i] = x.astype(np.float32)
        ys[i] = c
    return torch.from_numpy(xs), torch.from_numpy(ys)


def make_am_regression(cfg: AMConfig, seed: int, max_depth: float = 0.15) -> Tuple[torch.Tensor, torch.Tensor]:
    """L1 sanity target: regress the CONTINUOUS modulation depth m from the signal.

    Same AM signal, but m ~ U(0, max_depth) and the target is m itself (a known
    continuous quantity). Validates that the multi-layer complex stack converges
    on a real regression target, not just 2 params.
    """
    rng = np.random.default_rng(seed)
    t = _t(cfg)
    xs = np.empty((cfg.n_per_split, cfg.n), dtype=np.float32)
    ms = np.empty((cfg.n_per_split, 1), dtype=np.float32)
    for i in range(cfg.n_per_split):
        m = rng.uniform(0.0, max_depth)
        theta = rng.uniform(0, 2 * np.pi)
        psi = rng.uniform(0, 2 * np.pi)
        carrier = np.cos(2 * np.pi * cfg.f_c * t + theta)
        x = (1.0 + m * np.cos(2 * np.pi * cfg.f_mod * t + psi)) * carrier
        xs[i] = x.astype(np.float32)
        ms[i, 0] = m
    return torch.from_numpy(xs), torch.from_numpy(ms)


def band_window(f_c: int = F_C, half: int = 4) -> Tuple[List[int], int]:
    """9 complex bins [f_c-half .. f_c+half]; returns (bins, carrier_local_index)."""
    bins = list(range(f_c - half, f_c + half + 1))
    return bins, bins.index(f_c)
