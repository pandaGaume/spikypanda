# Kalman 1D

`DSP.Filter:kalman1d`

Scalar Kalman filter run sample-by-sample over a 1D tensor, under the simplest possible model: random walk state (`x_{k+1} = x_k + w_k`) observed with additive noise (`z_k = x_k + v_k`). The principled alternative to a moving average when you can articulate "how fast does the true value move" (`q`) versus "how noisy is the sensor" (`r`).

Compliance: **onnx 1.18**.

## Mechanics

Per sample: predict (`p += q`), gain (`k = p / (p + r)`), update (`x += k * (z - x)`, `p *= 1 - k`). The output is the posterior estimate after each sample. Because the model is a random walk, the steady-state filter behaves like an adaptive EMA whose effective smoothing is set by the `q/r` RATIO: large `q/r` trusts the data (fast, noisy), small `q/r` trusts the model (slow, smooth).

## Inputs / Outputs

| Direction | Slot       | Type   | Shape                    |
| --------- | ---------- | ------ | ------------------------ |
| in        | `signal`   | tensor | `[N]` noisy measurements |
| out       | `estimate` | tensor | `[N]` filtered estimates |

## Editables

| Field | Default | Notes                                                                                                               |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `q`   | 1e-4    | min 0; process noise variance (how much the true value can move per sample).                                        |
| `r`   | 1e-2    | min 0; measurement noise variance (sensor noise power).                                                             |
| `x0`  | 0       | Initial state estimate.                                                                                             |
| `p0`  | 1       | min 0; initial covariance. Large `p0` means "x0 is a guess": the gain starts near 1 and snaps to the first samples. |

## Pitfalls

- State re-initializes from `x0` / `p0` at EVERY execute call (stateless per token): each incoming frame restarts the convergence from `x0`. Filter long buffers, or set `x0` near the expected operating level to shorten the snap-in.
- Only the ratio `q/r` shapes the steady-state response; the absolute values mainly affect how fast `p` converges. Tune `r` to the measured sensor variance, then move `q` until the lag/noise trade-off looks right.
- A random-walk model TRACKS ramps with a constant lag; it does not reject them. Use `DSP.Stats:detrend` if a trend must be removed rather than followed.
