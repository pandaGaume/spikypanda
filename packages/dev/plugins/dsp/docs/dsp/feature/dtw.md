# DTW

`DSP.Feature:dtw`

Dynamic Time Warping distance between two feature sequences (typically MFCC matrices). The template-matching backbone of the KWS chain: compare incoming audio features against an enrolled reference; a LOW distance means "same word", robust to speaking-rate differences because the alignment path can stretch and compress time.

Compliance: **onnx 1.18**.

## Mechanics

Classic DTW over per-frame Euclidean distances, with moves down/right/diagonal and an optional Sakoe-Chiba band (`|i - j| <= band`). Returns the accumulated cost at the end of the optimal warping path. With `normalize` on, the cost is divided by `n + m` (the two frame counts) so distances are comparable across utterance lengths.

## Inputs / Outputs

| Direction | Slot       | Type   | Shape                             |
| --------- | ---------- | ------ | --------------------------------- |
| in        | `live`     | tensor | `[n_features, n_frames_live]`     |
| in        | `template` | tensor | `[n_features, n_frames_template]` |
| out       | `distance` | tensor | `[1]`, lower = closer match       |

Both inputs are FEATURE-major, exactly the layout `DSP.Feature:mfcc` emits: wire MFCC straight in. The node fires only when BOTH inputs have a token; a static template must be re-published or injected per comparison.

## Editables

| Field       | Default | Notes                                                                                                                               |
| ----------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `normalize` | true    | Divide the path cost by `n + m`. Keep it on when thresholding across variable-length audio.                                         |
| `band`      | -1      | Sakoe-Chiba radius in frames; -1 = unconstrained. A band cuts cost from `O(n*m)` toward `O(n*band)` and rejects pathological warps. |

## Enrollment

The companion `enroll(samples, params)` utility (spikypanda-onnx, `ops/dsp.ts`) builds a robust template: MFCC per recording, resample to the median frame count, element-wise average. Serialize/deserialize helpers round-trip it through storage; MFCC parameters used at enrollment MUST match the inference-side MFCC node.

## Pitfalls

- The two inputs must share `n_features` (`shape[0]`); a mismatch silently compares wrong memory strides instead of erroring.
- A `band` smaller than the frame-count difference `|n - m|` makes the end cell unreachable: the distance comes back `Infinity`. Size the band generously (or normalize lengths at enrollment).
- DTW distance is unbounded and scale-dependent (it inherits the MFCC scaling): calibrate the accept threshold empirically on your own enrolled set.
