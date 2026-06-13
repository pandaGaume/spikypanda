# Mel Filterbank

`DSP.Feature:mel`

Projects a power spectrum onto `n_mels` triangular filters spaced on the mel scale (HTK convention, `mel = 2595 * log10(1 + f/700)`). Step 1 of the hand-built MFCC chain (`FFT(power) -> Mel -> Log Scale -> DCT`) and of any KWS front end; also a cheap perceptual-band energy summary on its own.

Compliance: **onnx 1.18**.

## Mechanics

The filterbank covers 0 to `sample_rate / 2` with `n_mels + 2` mel-spaced edge points; filter `m` rises over `[bin_m, bin_{m+1}]` and falls over `[bin_{m+1}, bin_{m+2}]`. Output `mel[m]` is the dot product of filter `m` with the input power spectrum: LINEAR energies (chain `DSP.Feature:logscale` after). The filterbank matrix is built lazily and cached; changing any editable invalidates and rebuilds it.

## Inputs / Outputs

| Direction | Slot       | Type   | Shape                       |
| --------- | ---------- | ------ | --------------------------- |
| in        | `spectrum` | tensor | `[nfft/2+1]` POWER spectrum |
| out       | `mel`      | tensor | `[n_mels]`                  |

## Editables

| Field        | Default  | Notes                                                                                         |
| ------------ | -------- | --------------------------------------------------------------------------------------------- |
| `nMels`      | 40       | min 1; number of bands.                                                                       |
| `nfft`       | 512      | min 16, step 16; MUST match the upstream FFT's `nfft`.                                        |
| `sampleRate` | 16000 Hz | MUST match the actual rate of the signal the FFT saw; it sets where the triangles land in Hz. |

## Pitfalls

- Feed the FFT's `power` output mode (its default). Magnitude input does not error but yields mel energies on the wrong scale; complex input is read as nonsense.
- `nfft` or `sampleRate` mismatches with the upstream chain silently shift every band: the node cannot detect them because it only sees a bare tensor.
- With small `nfft` and large `nMels`, the lowest triangles can collapse onto the same FFT bins (integer bin rounding) and produce duplicate or near-empty bands.
