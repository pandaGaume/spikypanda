# IFFT

`DSP.Transform:ifft`

Inverse FFT: reconstructs an `nfft`-sample real time-domain signal from a Hermitian half-spectrum. The round-trip companion of `DSP.Transform:fft` in `complex` output mode; use it for spectral surgery (filter in the frequency domain, come back to time) or to audit what a spectral edit actually does to the waveform.

Compliance: **onnx 1.18**, **ue5 5.4**.

## Mechanics

Expects the one-sided spectrum packed as interleaved real/imag pairs `[re_0, im_0, ..., re_{N/2}, im_{N/2}]` (shape `[nfft/2+1, 2]`), exactly what the FFT node emits when its `outputMode` is `complex`. Internally the half-spectrum is expanded to the full conjugate-symmetric spectrum (DC and Nyquist taken as real), then inverted via the conjugate trick `ifft(X) = conj(fft(conj(X))) / N`. The `1/N` scaling is included: an FFT(complex) -> IFFT round trip returns the original frame to float precision.

## Inputs / Outputs

| Direction | Slot       | Type   | Shape                             |
| --------- | ---------- | ------ | --------------------------------- |
| in        | `spectrum` | tensor | `[nfft/2+1, 2]` interleaved re/im |
| out       | `signal`   | tensor | `[nfft]` real samples             |

## Editables

| Field  | Default | Notes                                                                                                               |
| ------ | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `nfft` | 512     | min 16, step 16. Must MATCH the upstream FFT's `nfft`: the inverse expands the half-spectrum assuming its own size. |

## Pitfalls

- The FFT node's DEFAULT output mode is `power`, which is real-valued and half the length the IFFT expects. Switch the upstream FFT's `outputMode` to `complex` or the IFFT reads garbage as interleaved pairs.
- An `nfft` mismatch with the upstream FFT does not error; it silently mis-maps bins during the Hermitian expansion. Keep the two editables in lockstep.
