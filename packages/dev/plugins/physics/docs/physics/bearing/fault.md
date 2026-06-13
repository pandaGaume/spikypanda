# Bearing Fault Generator

`Physics.Mechanical.Bearing:fault`

Computes the four classical rolling-element defect frequencies from bearing geometry and shaft speed, then sums one sinusoid per defect onto an input signal. Place it in series on a motor's `tau_load` line, on a `fault_n` bank input, or on a vibration channel to inject a known bearing signature with the textbook spectral location.

## The four defect frequencies

With `f_r = |omega| / (2*pi)` the shaft revolution frequency, `N` the ball count, `d` the ball diameter, `D` the pitch diameter, `alpha` the contact angle, and `ratio = (d/D)*cos(alpha)`:

| Output    | Formula                           | Defect                                                                                                                         |
| --------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `bpfo_hz` | `(N/2) * f_r * (1 - ratio)`       | Ball Pass Frequency, Outer race: a spall on the stationary outer raceway, hit by every ball.                                   |
| `bpfi_hz` | `(N/2) * f_r * (1 + ratio)`       | Ball Pass Frequency, Inner race: a spall on the rotating inner raceway; in practice flanked by 1x sidebands (load modulation). |
| `bsf_hz`  | `(D/(2*d)) * f_r * (1 - ratio^2)` | Ball Spin Frequency: a defect on a rolling element itself, striking both races.                                                |
| `ftf_hz`  | `(1/2) * f_r * (1 - ratio)`       | Fundamental Train Frequency: the cage rotation rate, always below 0.5x shaft speed; cage wear or looseness.                    |

Each component carries its own phase accumulator (`phase += 2*pi*f*dt`), so the sinusoids stay coherent through speed changes.

## Ports

| Direction | Slot                                     | Type  | Notes                                                                          |
| --------- | ---------------------------------------- | ----- | ------------------------------------------------------------------------------ |
| in        | `signal_in`                              | float | Additive base; defaults to 0 when no token this tick.                          |
| in        | `omega`                                  | float | Shaft mechanical speed [rad/s]; defaults to 0 (all frequencies collapse to 0). |
| in        | `dt`                                     | float | Optional; falls back to `t - lastT` when unwired.                              |
| out       | `signal_out`                             | float | `signal_in + sum of the four active sinusoids`.                                |
| out       | `bpfo_hz`, `bpfi_hz`, `bsf_hz`, `ftf_hz` | float | The instantaneous defect frequencies, handy as FFT cursor references.          |

## Editables

| Name            | Default | Meaning                                         |
| --------------- | ------- | ----------------------------------------------- |
| `nBalls`        | 8       | Number of rolling elements N.                   |
| `ballDiameter`  | 7.94e-3 | d [m].                                          |
| `pitchDiameter` | 33.5e-3 | D [m].                                          |
| `contactAngle`  | 0       | alpha [rad].                                    |
| `bpfoAmp`       | 0.005   | Outer-race amplitude. 0 disables the component. |
| `bpfiAmp`       | 0       | Inner-race amplitude.                           |
| `bsfAmp`        | 0       | Ball-spin amplitude.                            |
| `ftfAmp`        | 0       | Cage amplitude.                                 |

Default geometry plus the default `bpfoAmp` make the node emit an outer-race signature out of the box; the other three default OFF.

## Pitfalls

- The float output wired into a FaultableNode `fault_n` slot auto-wraps to `{ target: "tau", value }`: an additive torque perturbation [Nm]. Scale the amplitudes accordingly (they are small for a reason).
- Pure sinusoids model the FREQUENCIES, not the impulsive envelope of a real spall: there are no harmonics or envelope modulation. For impacts, compose with the Gear tooth pulse pattern or shape downstream.
- `omega = 0` (or no token) silences everything: the phases stop advancing and the outputs go DC.
