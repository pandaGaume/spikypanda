# Stats

`DSP.Stats:rms`, `DSP.Stats:zcr`, `DSP.Stats:movavg`, `DSP.Stats:detrend`

Per-frame signal statistics: four small tensor-in / tensor-out kernels for the output side of a DSP chain. RMS and ZCR REDUCE a frame to one number (level and noisiness); Moving Average and Detrend TRANSFORM the frame in place (smooth it, remove its trend). All four are stateless across tokens: each incoming tensor is analyzed independently.

Compliance: **onnx 1.18** (RMS additionally **ue5 5.4**).

## Variants

| typeId     | Label              | In `signal` | Out                 | Law                                                                                                                    | Defaults                                   |
| ---------- | ------------------ | ----------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `:rms`     | RMS                | `[N]`       | `rms` `[1]`         | `sqrt(mean(x^2))`; 0 on empty input                                                                                    | none                                       |
| `:zcr`     | Zero Crossing Rate | `[N]`       | `zcr` `[1]` in 0..1 | fraction of consecutive pairs with opposite sign (0 counts as positive); 0 when `N < 2`                                | none                                       |
| `:movavg`  | Moving Average     | `[N]`       | `smoothed` `[N]`    | causal SMA over `windowSize` samples; the first `windowSize - 1` outputs average the PARTIAL window (no startup zeros) | `windowSize` 5 (min 1, floored to integer) |
| `:detrend` | Detrend            | `[N]`       | `detrended` `[N]`   | `mode` 0: subtract the mean; `mode` 1: subtract the least-squares line `a*i + b`                                       | `mode` 1 (linear)                          |

## Tensor in, NOT scalar in

These are ONNX kernels behind the generic Kernel adapter: every consumed token is treated as a tensor and read through `.data`. A raw float stream (Oscillator, Transducer, a motor's `omega`) is NOT accepted; wiring one in throws at fire time. Put `DSP.Stream:buffer` (scalar -> `[N]` frames) or `DSP.Stream:mux` (N scalars -> `[N]`) in front. For a per-block RMS of an acquisition chain you usually do not need `:rms` at all: `DSP.Acquire:daq` already publishes a block `rms` output.

## Typical placements

- `:detrend` (linear) in front of Window/FFT: removes DC and ramp so bin 0 stops masking low-frequency content.
- `:rms` after `DSP.Frame:frame` or a Buffer: one level value per frame, the input of choice for `DSP.Detect:steadystate` style gating when not using the DAQ's built-in RMS.
- `:zcr` next to `:rms`: a cheap spectral-centroid proxy (noisy/high frequency = high ZCR) for coarse classification without an FFT.
- `:movavg` on a tensor of per-frame features to smooth before thresholding.

## Pitfalls

- `:movavg` is CAUSAL: it lags steps by about `(windowSize - 1) / 2` samples; do not use it where phase matters, prefer a symmetric filter offline.
- `:zcr` counts a sign change on every noise wiggle around zero: detrend or high-pass first if a DC offset sits near zero, and remember a pure DC signal gives ZCR 0 regardless of level.
- `:detrend` in linear mode removes a STRAIGHT line per frame; a curved trend leaves residue at the frame edges. Shorter frames, or constant mode plus a high-pass, handle that better.
