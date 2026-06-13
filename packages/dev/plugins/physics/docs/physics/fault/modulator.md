# Fault Modulator

`Physics.Mechanical.Fault:modulator`

Generic single-sinusoid amplitude modulator for fault injection: adds `amplitude * sin(2*pi*freq*t + phase)` onto an input signal. The composable building block under the specific Bearing / Shaft / Gear generators; use it directly when you want ONE arbitrary frequency on a motor's `tau_load`, a `fault_n` bank input, or any scalar channel.

## Mechanics

```
phaseAcc += 2*pi*freq*dt
out       = in + amplitude * sin(phaseAcc)
```

The phase ACCUMULATES rather than evaluating `sin(2*pi*f*t)`: changing `freq` mid-run glides the instantaneous frequency without a phase jump (chirp-friendly). On session reset, `phaseAcc` restarts at the `phase` editable.

## Ports

| Direction | Slot         | Type  | Notes                                                                                                |
| --------- | ------------ | ----- | ---------------------------------------------------------------------------------------------------- |
| in        | `signal_in`  | float | Additive base; defaults to 0 when no token this tick.                                                |
| in        | `freq`       | float | Optional per-tick override of the frequency [Hz]; falls back to the `freqHz` editable when no token. |
| in        | `amplitude`  | float | Optional per-tick override of the amplitude; falls back to the editable.                             |
| in        | `dt`         | float | Optional; falls back to `t - lastT` when unwired.                                                    |
| out       | `signal_out` | float | `signal_in + amplitude * sin(phaseAcc)`.                                                             |

## Editables

| Name        | Default | Meaning                                |
| ----------- | ------- | -------------------------------------- |
| `freqHz`    | 10      | Modulation frequency [Hz].             |
| `amplitude` | 0.01    | Peak amplitude.                        |
| `phase`     | 0       | Initial phase [rad], applied at reset. |

`signal_out` is a viewable; session reset zeroes it and re-arms the phase.

## Pitfalls

- Into a FaultableNode `fault_n` slot, the bare float auto-wraps to `{ target: "tau", value }`: an additive torque [Nm]. To perturb another target (`R`, `L`, `Ke`, `Kt` multiplicative; `b`, `J` additive), wrap the value into a `{ target, value }` descriptor upstream; this node only emits the scalar.
- The `freq` / `amplitude` overrides are per-tick: a one-shot token reverts to the editables on the next tick. Wire a steady source (Slider, Lerp) for sweeps.
- The `phase` editable is only read at reset; editing it mid-run does nothing until the next session reset.
