# MFCC

`DSP.Feature:mfcc`

Complete MFCC pipeline in one node: per frame, `Window -> FFT(power) -> Mel filterbank -> ln -> DCT-II`. Give it a raw 1D audio tensor, get the feature matrix a keyword-spotting (KWS) or speech model consumes. Use this instead of chaining `Frame -> Window -> FFT -> Mel -> Log Scale -> DCT` by hand; the discrete nodes remain for inspecting intermediate stages.

Compliance: **onnx 1.18**.

## Mechanics

Framing is internal: `n_frames = floor((samples - n_fft) / hop_length) + 1` (trailing partial frame dropped; per-frame zero-padding only past the signal end). Each frame is windowed (Hann or Hamming), power-FFT'd, projected on `n_mels` mel bands, floored at 1e-10 and ln-compressed, then DCT-II'd down to `n_mfcc` coefficients. Mel filterbank and FFT engine are cached and rebuilt when a sizing editable changes.

## Inputs / Outputs

| Direction | Slot    | Type   | Shape                                |
| --------- | ------- | ------ | ------------------------------------ |
| in        | `audio` | tensor | `[samples]` raw 1D audio             |
| out       | `mfcc`  | tensor | `[n_mfcc, n_frames]` (FEATURE-major) |

With the defaults, 1 second at 16 kHz (16000 samples) yields `[40, 97]`.

## Editables

| Field        | Default  | Notes                                                                            |
| ------------ | -------- | -------------------------------------------------------------------------------- |
| `sampleRate` | 16000 Hz | Sets the mel band placement; must match the audio's true rate.                   |
| `nMfcc`      | 40       | Cepstral coefficients kept per frame.                                            |
| `nFft`       | 512      | min 16, step 16; frame length AND FFT size.                                      |
| `hopLength`  | 160      | Samples between frame starts (10 ms at 16 kHz).                                  |
| `nMels`      | 40       | Mel bands before the DCT.                                                        |
| `windowType` | 0 (Hann) | 0 = Hann, 1 = Hamming. ONLY these two here (the standalone Window node has six). |

## The KWS chain

```
audio [16000] ──► MFCC ──► [40, 97] ──┬─► DTW(live, template) ──► distance
                                      └─► (or Transpose ──► ONNX encoder)
```

`DSP.Feature:dtw` consumes this `[n_features, n_frames]` layout directly. ONNX encoder models usually want `[1, C, T]` instead: insert `DSP.Tensor:transpose`.

## Pitfalls

- Do NOT put `DSP.Window:window` in front: frames are windowed internally, you would window twice.
- Audio shorter than `nFft` yields `n_frames = 0`, an empty `[n_mfcc, 0]` tensor; downstream nodes see a zero-length axis, not an error.
- The DCT stage carries no orthonormalization (plain sum scaling): coefficient scales differ from librosa/scipy `norm="ortho"`. Enroll templates and run inference through the SAME node and the convention cancels out.
