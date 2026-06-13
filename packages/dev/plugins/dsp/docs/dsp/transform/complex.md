# Magnitude / Phase

`DSP.Transform:magnitude`, `DSP.Transform:phase`

Two element-wise unpackers for the interleaved complex layout `[..., 2]` (real/imag pairs) that the FFT emits in `complex` output mode. They share the same contract: consume one complex tensor, keep every leading axis, drop the trailing 2.

Compliance: **onnx 1.18**.

## Variants

| typeId       | Label     | Per-pair law        | Output slot | Range           |
| ------------ | --------- | ------------------- | ----------- | --------------- |
| `:magnitude` | Magnitude | `sqrt(re^2 + im^2)` | `magnitude` | `>= 0`          |
| `:phase`     | Phase     | `atan2(im, re)`     | `phase`     | `[-pi, pi]` rad |

## Inputs / Outputs

| Direction | Slot                   | Type   | Shape                                                                     |
| --------- | ---------------------- | ------ | ------------------------------------------------------------------------- |
| in        | `complex`              | tensor | `[..., 2]` interleaved re/im (e.g. `[nfft/2+1, 2]` from FFT complex mode) |
| out       | `magnitude` or `phase` | tensor | input shape minus the trailing 2                                          |

No editables: both nodes are pure functions of the input.

## Pitfalls

- Only meaningful on COMPLEX data. The FFT's default `power` mode (and its `magnitude` mode) emit real-valued spectra; feeding one of those here treats consecutive bins as re/im pairs and silently outputs half as many nonsense values. If you only need `|X[k]|`, prefer flipping the FFT's `outputMode` to `magnitude` and skip this node.
- Phase of a near-zero bin is numerically meaningless (atan2 of noise): mask by magnitude before interpreting a phase spectrum.
