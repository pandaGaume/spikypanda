"""
MCSA (variant B, envelope domain) data loader.

Reads the preprocessed UFU Broken-Rotor-Bar windows already in the repo:
  packages/host/www/data/motor_current/{train,test}.json
Each sample is a 64-step, 3-channel (Ia,Ib,Ic) RMS-envelope window, centered +
amplified, values in [0,1]. The broken-bar severity lives as the amplitude of
the slow modulation (2sf, ~2-6 Hz) in the LOW bins of the 64-point envelope FFT
— exactly the L2 mechanism, on real current envelopes.
"""

import json
import os
from typing import Tuple

import torch

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "..", "spikypanda"))
# Robust path: walk up to the repo root that contains packages/host/www/data.
def _data_dir() -> str:
    here = os.path.dirname(__file__)
    for _ in range(8):
        cand = os.path.join(here, "packages", "host", "www", "data", "motor_current")
        if os.path.isdir(cand):
            return cand
        here = os.path.dirname(here)
    raise FileNotFoundError("motor_current data dir not found")


def load_split(name: str) -> Tuple[torch.Tensor, torch.Tensor, list]:
    """Returns X (n, 64, 3) float32, y (n,) int64, class names."""
    path = os.path.join(_data_dir(), f"{name}.json")
    with open(path) as f:
        d = json.load(f)
    samples = d["samples"]
    x = torch.tensor([s["sequence"] for s in samples], dtype=torch.float32)  # (n, 64, 3)
    y = torch.tensor([s["label"] for s in samples], dtype=torch.int64)
    return x, y, d["classes"]
