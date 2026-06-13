# Frame

`DSP.Frame:frame`

Slices a 1D signal tensor into (possibly overlapping) frames: the canonical first step of any STFT-style pipeline (`Buffer -> Frame -> Window -> FFT`). One input token in, one `[n_frames, frame_size]` token out.

Compliance: **onnx 1.18**.

## Mechanics

Frame `t` starts at `t * hop_length` and copies `frame_size` samples. The frame count depends on `padMode`:

- `padMode = 0` (drop, default): only frames that fit entirely. `n_frames = floor((N - frame_size) / hop_length) + 1`, and 0 when `N < frame_size`.
- `padMode = 1` (zero-pad): every start index `< N` produces a frame; the trailing partial frame is zero-padded. `n_frames = floor((N - 1) / hop_length) + 1`.

## Inputs / Outputs

| Direction | Slot     | Type   | Shape                    |
| --------- | -------- | ------ | ------------------------ |
| in        | `signal` | tensor | `[N]`                    |
| out       | `frames` | tensor | `[n_frames, frame_size]` |

## Editables

| Field       | Default  | Notes                                             |
| ----------- | -------- | ------------------------------------------------- |
| `frameSize` | 512      | min 2, step 2 (samples).                          |
| `hopLength` | 256      | min 1 (samples); stride between frame starts.     |
| `padMode`   | 0 (drop) | 0 = drop trailing partial frame, 1 = zero-pad it. |

## Hop vs frame size

- `hop < frame_size`: overlapping frames (the classic 50 percent overlap is `hop = frame_size / 2`).
- `hop = frame_size`: exact tiling.
- `hop > frame_size`: deliberate sub-sampling, samples between frames are SKIPPED. The motorwatch head-of-block snapshot uses this: on a 2048-sample DAQ block, `frameSize 64 / hopLength 2048` yields exactly ONE 64-sample frame per block (the head of the block), a cheap fixed-cost peek instead of full-block processing.

## Pitfalls

- With `padMode = 1` the zero-padded tail biases anything energy-like computed on the last frame (RMS reads low, FFT smears); prefer the default drop mode for analysis chains.
- Output is 2D. A downstream node expecting a single 1D frame (FFT, Window) will happily read the flattened buffer: when you want exactly one frame per token, size the upstream buffer so `n_frames = 1` (the head-of-block trick above), or iterate frames upstream.
