"""
Complex-valued neural-network building blocks (Décision 002).

The substrate trains as a CVNN: cartesian complex weights ``W = A + iB``, real
loss ``L : C^n -> R``, and phase-preserving activations. PyTorch computes the
Wirtinger gradient ``dL/dW*`` natively through complex autograd, so there is
NOTHING to hand-derive here — ``modReLU`` is written as a plain differentiable
expression and autograd does the rest.

Ref: Trabelsi et al., "Deep Complex Networks" (2018).
"""

import math

import torch
import torch.nn as nn


def safe_abs(z: torch.Tensor, eps: float = 1e-12) -> torch.Tensor:
    """|z| with a smooth floor: sqrt(re^2 + im^2 + eps).

    Plain ``z.abs()`` has an unbounded gradient z/|z| as |z| -> 0, which makes
    a hidden unit passing through 0 explode the Adam step. The eps floor keeps
    the gradient finite everywhere.
    """
    return torch.sqrt(z.real ** 2 + z.imag ** 2 + eps)


class ComplexLinear(nn.Module):
    """y = z @ W^T + b, with complex ``W`` (out, in) and complex bias ``b``.

    Weights are stored as native ``torch.cfloat`` parameters; ``loss.backward()``
    fills ``.grad`` with the (conjugate) Wirtinger gradient ready for the
    optimizer. Init draws Re/Im independently ~ N(0, sigma^2/2) with a
    Glorot-style ``sigma = 1/sqrt(fan_in)`` (so E[|w|^2] = sigma^2).
    """

    def __init__(self, in_features: int, out_features: int, bias: bool = True):
        super().__init__()
        self.in_features = in_features
        self.out_features = out_features
        sigma = 1.0 / math.sqrt(in_features)
        w = torch.randn(out_features, in_features, 2) * (sigma / math.sqrt(2.0))
        self.weight = nn.Parameter(torch.view_as_complex(w.contiguous()))
        if bias:
            self.bias = nn.Parameter(torch.zeros(out_features, dtype=torch.cfloat))
        else:
            self.register_parameter("bias", None)

    def forward(self, z: torch.Tensor) -> torch.Tensor:
        y = z @ self.weight.t()
        if self.bias is not None:
            y = y + self.bias
        return y


class ModReLU(nn.Module):
    """modReLU(z) = ReLU(|z| + b) * z / |z|  (per-unit real bias ``b``).

    Thresholds the MODULE while PRESERVING the phase direction z/|z| — so H6
    (phase carries routing/timing) survives the non-linearity, unlike an
    Re/Im-separable activation which would destroy the phase (Décision 002).
    Purely a forward expression: autograd differentiates it (Wirtinger).
    """

    def __init__(self, num_features: int, eps: float = 1e-8):
        super().__init__()
        self.bias = nn.Parameter(torch.zeros(num_features))
        self.eps = eps

    def forward(self, z: torch.Tensor) -> torch.Tensor:
        mag = safe_abs(z)
        scale = torch.relu(mag + self.bias) / (mag + self.eps)
        return scale * z


class Cardioid(nn.Module):
    """Cardioid(z) = 0.5 * (1 + cos(arg z)) * z. Phase-dependent gain."""

    def forward(self, z: torch.Tensor) -> torch.Tensor:
        return 0.5 * (1.0 + torch.cos(z.angle())) * z


def carrier_phase_reference(z: torch.Tensor, carrier_index: int, eps: float = 1e-8) -> torch.Tensor:
    """De-rotate a band vector by the phase of its carrier bin.

    Multiplies every bin by ``conj(z[carrier]) / |z[carrier]|`` — a UNIT complex,
    so it removes the random global carrier phase theta (making the readout
    theta-invariant) WITHOUT touching any magnitude. It does NOT divide by the
    carrier magnitude, so the sideband/carrier amplitude ratio (= the modulation
    depth m/2, the thing to grade) is left for the network to read. Physically
    this is the standard MCSA "reference to the fundamental".
    """
    ref = z[..., carrier_index]
    unit = torch.conj(ref) / (ref.abs() + eps)
    return z * unit.unsqueeze(-1)


def to_real(z: torch.Tensor, mode: str = "view_as_real") -> torch.Tensor:
    """Complex -> real readout at the boundary before the real head.

    - ``view_as_real``: interleaves (Re, Im) -> exposes phase directly to the
      head (best when the input is phase-referenced / theta-invariant).
    - ``abs``: |z|, intrinsically theta-invariant (throws the phase away).
    """
    if mode == "view_as_real":
        return torch.view_as_real(z).flatten(-2)
    if mode == "abs":
        return safe_abs(z)
    raise ValueError(f"unknown readout mode: {mode}")


def count_params(module: nn.Module) -> int:
    """Real degrees of freedom: complex params count as 2 (A and B)."""
    total = 0
    for p in module.parameters():
        n = p.numel()
        if p.is_complex():
            n *= 2
        total += n
    return total
