# Window

`DSP.Window:window`

Multiplies a 1D frame by a window function, sample by sample. The mandatory step between `DSP.Frame:frame` and `DSP.Transform:fft`: an unwindowed (rectangular) frame leaks every spectral peak into sinc sidelobes and scallops the magnitudes.

Compliance: **onnx 1.18**, **ue5 5.4**.

## Mechanics

`y[i] = x[i] * w(N, i)` where `N` is the input length, taken from the incoming tensor on every call: frames of different lengths each get a correctly sized window, nothing is cached. Output shape = input shape.

## Window types

| `windowType` | Window      | Notes                                                              |
| ------------ | ----------- | ------------------------------------------------------------------ |
| 0 (default)  | Hann        | `0.5 * (1 - cos(2*pi*i/(N-1)))`; the safe general-purpose choice.  |
| 1            | Hamming     | Lower first sidelobe, non-zero edges.                              |
| 2            | Blackman    | Wider main lobe, much lower sidelobes.                             |
| 3            | Bartlett    | Triangular.                                                        |
| 4            | Rectangular | Identity; useful as an A/B control.                                |
| 5            | Tukey       | Flat top with cosine-tapered edges; taper fraction set by `alpha`. |

## Inputs / Outputs

| Direction | Slot       | Type   | Shape |
| --------- | ---------- | ------ | ----- |
| in        | `signal`   | tensor | `[N]` |
| out       | `windowed` | tensor | `[N]` |

## Editables

| Field        | Default  | Notes                                                                                                                                   |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `windowType` | 0 (Hann) | integer 0..5, see table.                                                                                                                |
| `alpha`      | 0.5      | 0..1, step 0.05. Tukey taper fraction ONLY; ignored by every other type. `alpha <= 0` degenerates to rectangular, `alpha >= 1` to Hann. |

## Pitfalls

- Windowing scales the frame energy (Hann halves the mean amplitude): when comparing absolute levels across pipelines, keep the window identical or apply a coherent-gain correction downstream.
- `DSP.Feature:mfcc` windows internally (Hann or Hamming): do NOT put this node in front of it, you would window twice.
