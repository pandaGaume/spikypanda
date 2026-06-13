# Attitude

`spk.geometry:attitude`

Converts yaw / pitch / roll angles in DEGREES into a unit quaternion (vec4), published on every fire. The human-friendly front end for `spk.geometry:transform`'s `rotation` input; the property panel ships a 3D attitude widget (the `attitude-3d` custom editor) so the orientation is visible while you tune it.

## Rotation convention (from the core Quaternion implementation)

- Right-handed frame: X forward, Y right, Z up.
- Roll rotates around X, pitch around Y, yaw around Z.
- Composition is the standard aerospace intrinsic Z-Y-X sequence: yaw first (about Z), then pitch (about the rotated Y), then roll (about the twice-rotated X). Equivalent quaternion product: `q = q_z(yaw) * q_y(pitch) * q_x(roll)`.

## Inputs

| Slot    | Type  | Notes              |
| ------- | ----- | ------------------ |
| `yaw`   | float | Optional, degrees. |
| `pitch` | float | Optional, degrees. |
| `roll`  | float | Optional, degrees. |

Input resolution: a READY numeric token on a wired input wins over the editable for that fire; non-numeric tokens are rejected and the editable is used instead. Editables are never overwritten by wires: disconnect and the configured angle comes back.

## Outputs

| Slot       | Type | Notes                                                                   |
| ---------- | ---- | ----------------------------------------------------------------------- |
| `rotation` | vec4 | Unit quaternion `{x, y, z, w}` built from the effective yaw/pitch/roll. |

## Editables

| Field   | Default | Unit |
| ------- | ------- | ---- |
| `yaw`   | 0       | deg  |
| `pitch` | 0       | deg  |
| `roll`  | 0       | deg  |

## Pitfalls

- Inputs are degrees, not radians: the conversion happens inside the node. Wiring a radian source produces a ~57x too-small rotation, with no error.
- Angles are not wrapped: 370 degrees is accepted and produces the same quaternion as 10 degrees, but the panel keeps showing 370.
