"""
SpectralCVNN — the frequency-domain complex-valued classifier/regressor, plus
the real-valued baselines it is compared against.

Frequency-domain end-to-end (Décision 002): FFT once at the input, the complex
spectrum bins ARE the latent, complex layers + modReLU stay complex, and the
real head only appears at the very end. Everything is standard PyTorch, so the
Wirtinger backprop is autograd's job.
"""

from typing import List

import torch
import torch.nn as nn

from complex_layers import ComplexLinear, ModReLU, carrier_phase_reference, count_params, to_real


class SpectralCVNN(nn.Module):
    """FFT -> select complex bins -> [ComplexLinear + modReLU]* -> real head.

    band_bins: absolute FFT bin indices to read as the complex input (e.g. a
        9-bin window around the carrier). carrier_local_index: index of the
        carrier WITHIN band_bins (used for phase referencing).
    hidden_dims: complex layer widths, e.g. [4] (shallow) or [6, 4] (deeper).
    readout: "view_as_real" (Re,Im) or "abs" (|z|).
    phase_reference: de-rotate the band by the carrier phase (theta-invariant,
        amplitudes untouched) — makes view_as_real meaningful under a random
        carrier phase. Standard MCSA "reference to the fundamental".
    """

    def __init__(
        self,
        band_bins: List[int],
        carrier_local_index: int,
        hidden_dims: List[int],
        num_classes: int,
        readout: str = "view_as_real",
        phase_reference: bool = True,
    ):
        super().__init__()
        self.register_buffer("band_bins", torch.tensor(band_bins, dtype=torch.long))
        self.carrier_local_index = carrier_local_index
        self.readout = readout
        self.phase_reference = phase_reference

        dims = [len(band_bins)] + list(hidden_dims)
        self.clayers = nn.ModuleList()
        self.acts = nn.ModuleList()
        for i in range(len(hidden_dims)):
            self.clayers.append(ComplexLinear(dims[i], dims[i + 1]))
            self.acts.append(ModReLU(dims[i + 1]))

        last = hidden_dims[-1]
        real_dim = 2 * last if readout == "view_as_real" else last
        self.head = nn.Linear(real_dim, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        spectrum = torch.fft.fft(x)  # (B, N) complex
        z = spectrum[:, self.band_bins]  # (B, M) complex
        if self.phase_reference:
            z = carrier_phase_reference(z, self.carrier_local_index)
        for cl, act in zip(self.clayers, self.acts):
            z = act(cl(z))
        return self.head(to_real(z, self.readout))

    def num_params(self) -> int:
        return count_params(self)


# ─── Real-valued baselines ──────────────────────────────────────────────────


class MagnitudeMLP(nn.Module):
    """MLP over |FFT| of the same band bins — blind to phase (the point of §6)."""

    def __init__(self, band_bins: List[int], hidden_dims: List[int], num_classes: int):
        super().__init__()
        self.register_buffer("band_bins", torch.tensor(band_bins, dtype=torch.long))
        dims = [len(band_bins)] + list(hidden_dims) + [num_classes]
        layers: List[nn.Module] = []
        for i in range(len(dims) - 1):
            layers.append(nn.Linear(dims[i], dims[i + 1]))
            if i < len(dims) - 2:
                layers.append(nn.ReLU())
        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        mag = torch.fft.fft(x)[:, self.band_bins].abs()
        return self.net(mag)

    def num_params(self) -> int:
        return count_params(self)


class RawMLP(nn.Module):
    """MLP over the raw N-sample signal — no frequency structure (H5 reference).

    Cannot be param-matched to the tiny CVNN (N inputs alone force N*h weights);
    it is a "no-structure, more-params" reference, not an iso-budget comparison.
    """

    def __init__(self, n_samples: int, hidden_dims: List[int], num_classes: int):
        super().__init__()
        dims = [n_samples] + list(hidden_dims) + [num_classes]
        layers: List[nn.Module] = []
        for i in range(len(dims) - 1):
            layers.append(nn.Linear(dims[i], dims[i + 1]))
            if i < len(dims) - 2:
                layers.append(nn.ReLU())
        self.net = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)

    def num_params(self) -> int:
        return count_params(self)


class SpectralCVNNRegressor(nn.Module):
    """L1 sanity-check variant: same complex stack, linear real head (no softmax)."""

    def __init__(self, band_bins: List[int], carrier_local_index: int, hidden_dims: List[int], out_dim: int = 1, readout: str = "view_as_real", phase_reference: bool = True):
        super().__init__()
        self.core = SpectralCVNN(band_bins, carrier_local_index, hidden_dims, out_dim, readout, phase_reference)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.core(x)

    def num_params(self) -> int:
        return count_params(self)
