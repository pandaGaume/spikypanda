# Log Scale

`DSP.Feature:logscale`

Element-wise natural log with a floor: `y[i] = ln(max(x[i], floor))`. The compressor between Mel Filterbank and DCT in the MFCC chain; generally, the step that turns linear energies into the log domain where additive modeling (and human perception) works.

Compliance: **onnx 1.18**.

## Mechanics

NATURAL log (`ln`), not `log10` and not dB. The floor clamps the argument BEFORE the log, so zeros and negatives map to `ln(floor)` (about -23 at the default) instead of `-Infinity` / `NaN`. Shape preserved.

## Inputs / Outputs

| Direction | Slot    | Type   | Shape         |
| --------- | ------- | ------ | ------------- |
| in        | `x`     | tensor | any           |
| out       | `log_x` | tensor | same as input |

## Editables

| Field   | Default | Notes                                   |
| ------- | ------- | --------------------------------------- |
| `floor` | 1e-10   | min 0; lower bound on the log argument. |

## Pitfalls

- A floor of 0 reintroduces `-Infinity` on silent bins, which then poisons every DCT coefficient downstream. Keep it strictly positive.
- The floor sets the dynamic-range bottom of the whole feature chain: a silence-heavy signal produces frames pinned at `ln(floor)`, and the gap between that and real content can dominate distance metrics (DTW). Raise the floor if silence dominates your distances.
