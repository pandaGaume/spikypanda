# DCT

`DSP.Transform:dct`

Type-II Discrete Cosine Transform of a 1D tensor. The classic last stage of the MFCC chain: it decorrelates log-mel energies into compact cepstral coefficients (`Mel -> Log Scale -> DCT`). Also useful standalone as an energy-compacting transform for smooth signals.

Compliance: **onnx 1.18**.

## Mechanics

`y[k] = 2 * sum_n x[n] * cos(pi * k * (2n+1) / (2N))` for `k = 0 .. n_output-1`, where `N` is the input length. Direct evaluation (no fast path), with the plain `* 2` DCT-II scaling: there is NO orthonormalization, so values differ from scipy's `dct(norm="ortho")` by the usual `sqrt` factors. Consistency matters more than convention: train and infer with the same node and the factors cancel.

## Inputs / Outputs

| Direction | Slot  | Type   | Shape        |
| --------- | ----- | ------ | ------------ |
| in        | `x`   | tensor | `[N]`        |
| out       | `dct` | tensor | `[n_output]` |

## Editables

| Field     | Default | Notes                                                                                                                            |
| --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `nOutput` | 40      | min 1; number of coefficients kept. Keep `n_output <= N` (asking for more than N coefficients is legal but adds no information). |

## Pitfalls

- Coefficient 0 is the (scaled) frame energy; many feature pipelines drop it or treat it separately.
- Cost is `O(N * n_output)` per token: fine for mel-sized inputs (40 bands), noticeable on raw spectra.
