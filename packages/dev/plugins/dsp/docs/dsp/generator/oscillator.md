# Oscillator

`DSP.Generator:oscillator`

Single-frequency signal source: emits `amplitude * sin(2*pi*f*t + phase)` (or the cosine variant) on every tick, one scalar sample at a time. Replaces the boilerplate `Slider -> Multiply(x2pi) -> Multiply(xClock.t) -> Sin` chain with one node where you think in Hz directly. Use it at the head of any DSP pipeline as a synthetic test stimulus.

## Mechanics

- Pure runtime node (NOT an ONNX kernel): it computes from `t` each tick, so it sits in the same tier as `DSP.Stream:buffer`.
- `f`, `A`, `phi` exist BOTH as editables and as optional inputs. When a wire delivers a token on `frequency`, `amplitude` or `phase`, the wire wins for that tick; otherwise the editable applies. Wire a Slider to `frequency` for a live sweep (the waterfall draws a diagonal trace) without rewiring anything.
- If no `t` token arrives this tick, the node computes NOTHING: it does not fall back to the scheduler tick number, because substituting a different time semantics would silently produce a wrong frequency. Wire `Clock.t` (seconds).

## Inputs

| Slot        | Type  | Required | Meaning                                     |
| ----------- | ----- | -------- | ------------------------------------------- |
| `t`         | float | yes      | Simulation time in seconds (wire Clock.t).  |
| `frequency` | float | no       | Hz; overrides the editable when wired.      |
| `amplitude` | float | no       | Overrides the editable when wired.          |
| `phase`     | float | no       | Radians; overrides the editable when wired. |

## Outputs

| Slot    | Type  | Meaning                                                           |
| ------- | ----- | ----------------------------------------------------------------- |
| `value` | float | Current sample of the wave; fanned out to every wire on the port. |

## Editables

| Field       | Default | Notes                                              |
| ----------- | ------- | -------------------------------------------------- |
| `frequency` | 50 Hz   | Used when the `frequency` input is not wired.      |
| `amplitude` | 1       |                                                    |
| `phase`     | 0 rad   |                                                    |
| `waveform`  | `sin`   | `sin` or `cos`; anything else snaps back to `sin`. |

Viewables: `lastValue` (alive check while playing) and `omega` (2*pi*f in rad/s; reads 314.16 for f = 50, the literal you would have typed in the legacy Multiply chain).

## Composing a multi-frequency signal

```
Clock.t ──┬─► Oscillator(f=50,  A=1.0) ──┐
          ├─► Oscillator(f=120, A=0.5) ──┼─► Add ──► Add ──► Buffer ──► FFT
          └─► Oscillator(f=200, A=0.3) ──┘
```

Each oscillator produces an independent partial; the spectrum tile shows three peaks. Flip one `waveform` to `cos` with the same frequencies to demonstrate phase.

## Pitfalls

- The output is a scalar STREAM, not a tensor: insert `DSP.Stream:buffer` before any tensor-consuming node (Frame, FFT, Stats).
- A non-numeric token on any input is silently ignored for that slot.
