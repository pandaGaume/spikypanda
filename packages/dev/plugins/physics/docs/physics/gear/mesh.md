# Gear Mesh + Tooth Fault

`Physics.Mechanical.Gear:mesh`

Produces the gear-mesh harmonic at `f_mesh = nTeeth * f_shaft` plus, optionally, a narrow once-per-revolution Gaussian pulse modeling a single broken or chipped tooth. The pulse repeats at the SHAFT rate while the mesh tone sits at the tooth rate, which is exactly what creates the shaft-rate sideband family around `f_mesh` in a real damaged gear spectrum.

## Mechanics

```
theta  += omega * dt                                 (integrated shaft angle)
mesh    = meshAmp * sin(nTeeth * theta)              (mesh harmonic)
pulse   = toothAmp * exp(-(d^2) / (2*pulseWidth^2))  (once per rev)
out     = in + mesh + pulse
```

where `d` is the angular distance from `faultAngle`, wrapped into [-pi, pi] so the Gaussian is centered once per revolution. The pulse branch only runs when `toothAmp != 0` AND `pulseWidth > 0`.

## Ports

| Direction | Slot         | Type  | Notes                                                                                 |
| --------- | ------------ | ----- | ------------------------------------------------------------------------------------- |
| in        | `signal_in`  | float | Additive base; defaults to 0 when no token this tick.                                 |
| in        | `omega`      | float | Shaft speed [rad/s]; defaults to 0 (theta freezes).                                   |
| in        | `dt`         | float | Optional; falls back to `t - lastT` when unwired.                                     |
| out       | `signal_out` | float | `signal_in + mesh + pulse`.                                                           |
| out       | `mesh_hz`    | float | Instantaneous mesh frequency `nTeeth * abs(omega) / (2*pi)`, an FFT cursor reference. |

## Editables

| Name         | Default | Meaning                                                              |
| ------------ | ------- | -------------------------------------------------------------------- |
| `nTeeth`     | 24      | Tooth count; sets the mesh order.                                    |
| `meshAmp`    | 0.003   | Mesh-harmonic amplitude.                                             |
| `toothAmp`   | 0       | Tooth-fault pulse amplitude. 0 = healthy gear (default).             |
| `faultAngle` | 0       | Angular location of the damaged tooth [rad].                         |
| `pulseWidth` | 0.05    | Gaussian sigma of the pulse [rad]. Narrower = wider sideband family. |

`signal_out` is a viewable; session reset zeroes the output and `theta`.

## Pitfalls

- Into a FaultableNode `fault_n` slot, the bare float auto-wraps to `{ target: "tau", value }` (additive torque [Nm]).
- The pulse width is in ANGLE, so its duration in seconds shrinks as speed rises: keep the session rate high enough that several samples land inside the pulse (`pulseWidth / omega >> 1/fs`), otherwise the impulse aliases or disappears between ticks.
- Only the FUNDAMENTAL mesh harmonic is generated (no 2x, 3x mesh orders).
