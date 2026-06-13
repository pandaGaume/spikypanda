# Transform

`spk.geometry:transform`

Composes a translation (vec3) and a rotation (quaternion) into a 4x4 TRS matrix, published on every fire. The standard bridge between "where and how oriented" values and any consumer that wants a single transform matrix (UE5 export pipelines carry the `ue5` standard badge).

## Inputs

| Slot          | Type | Notes                                                                                                                                    |
| ------------- | ---- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `translation` | vec3 | Optional. Named `translation` (not `position`) because the runtime already reserves `position` for the node's canvas layout coordinates. |
| `rotation`    | vec4 | Optional. Quaternion as `{x, y, z, w}`.                                                                                                  |

Input resolution: on each fire, a READY token on a wired input wins over the editable default; otherwise the editable value is used. Tokens are validated (an object with `x`; the rotation additionally requires `w`), and invalid tokens fall back to the editable. The editables themselves are never overwritten by wires: disconnect and the configured value comes back intact.

## Outputs

| Slot     | Type     | Notes                                                                                                                          |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `matrix` | matrix44 | 16-element column-major array. Rotation block derived from the quaternion, translation in elements 12, 13, 14, bottom-right 1. |

## Editables

| Field         | Default               |
| ------------- | --------------------- |
| `translation` | (0, 0, 0)             |
| `rotation`    | identity (0, 0, 0, 1) |

## Pitfalls

- The quaternion is used as given: it is NOT normalized before composing the matrix. Feed unit quaternions (e.g. from `spk.geometry:attitude`) or the rotation block scales.
- Fires unconditionally each tick (source-style), publishing the composed matrix even when no input token arrived that tick.
