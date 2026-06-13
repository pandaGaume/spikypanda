# Biquad Filter

`DSP.Filter:biquad`

Second-order IIR filter (RBJ Audio EQ Cookbook coefficients, Direct Form I) applied forward over a 1D tensor. One node covers the four workhorse responses: low-pass, high-pass, band-pass, notch. Use it for anti-rumble/anti-hiss conditioning before feature extraction, or a notch to kill a known interferer (mains hum, PWM carrier).

Compliance: **onnx 1.18**, **ue5 5.4**.

## Filter types

| `filterType` | Response  | Typical use                                         |
| ------------ | --------- | --------------------------------------------------- |
| 0 (default)  | Low-pass  | Smooth, anti-alias-ish conditioning.                |
| 1            | High-pass | DC / drift removal before envelope analysis.        |
| 2            | Band-pass | Isolate a known band (bearing tones).               |
| 3            | Notch     | Surgical removal of one interferer (50/60 Hz, PWM). |

`q` shapes the knee: 0.7071 (the default, `1/sqrt(2)`) is Butterworth (maximally flat) for LP/HP; higher Q narrows BP/Notch around `cutoffHz`.

## Inputs / Outputs

| Direction | Slot       | Type   | Shape |
| --------- | ---------- | ------ | ----- |
| in        | `signal`   | tensor | `[N]` |
| out       | `filtered` | tensor | `[N]` |

## Editables

| Field        | Default  | Notes                                                                                                                          |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `filterType` | 0 (LP)   | 0..3, see table.                                                                                                               |
| `sampleRate` | 16000 Hz | min 1. An ATTRIBUTE, not derived from the session: must equal the data's true rate or the corner lands at the wrong frequency. |
| `cutoffHz`   | 1000 Hz  | min 0; cutoff (LP/HP) or center (BP/Notch). Keep it below `sampleRate / 2`.                                                    |
| `q`          | 0.7071   | min 0.01; internally floored at 1e-6 in the coefficient math.                                                                  |

## Pitfalls

- STATELESS PER TOKEN: the delay line resets to zero at the start of every execute. Each incoming frame re-rings the startup transient at its head. For streaming continuity, filter longer buffers (one big token) rather than many small frames, or accept and trim the transient.
- This is the per-tensor batch filter; for tracking a noisy scalar estimate over time prefer `DSP.Filter:kalman1d` (same caveat) or the steady EMA stages built into `DSP.Acquire:daq` / `DSP.Sensor:transducer`, which DO carry state across ticks.
