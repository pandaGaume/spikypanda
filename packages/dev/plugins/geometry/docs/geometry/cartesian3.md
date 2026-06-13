# Cartesian3

`spk.geometry:cartesian3`

Packs three scalars into a vec3, published on every fire. The glue node between scalar sources (sliders, knobs, control loops) and any vec3 consumer, typically `spk.geometry:transform`'s `translation` input.

## Inputs

| Slot | Type  | Notes     |
| ---- | ----- | --------- |
| `x`  | float | Optional. |
| `y`  | float | Optional. |
| `z`  | float | Optional. |

Input resolution: a READY numeric token on a wired input wins over the editable for that fire; non-numeric tokens fall back to the editable. Editables are never overwritten by wires.

## Outputs

| Slot   | Type | Notes                                     |
| ------ | ---- | ----------------------------------------- |
| `vec3` | vec3 | A fresh `Cartesian3 {x, y, z}` each fire. |

## Editables

| Field | Default |
| ----- | ------- |
| `x`   | 0       |
| `y`   | 0       |
| `z`   | 0       |

## Pitfalls

- Each fire publishes a NEW object: downstream identity comparisons (`===` between ticks) always fail; compare components.
- A wired but silent input (no token this tick) uses the editable value for that component, so partially wired vectors mix live and configured components by design.
