# DC PWM Inverter

`Physics.Electric.Motor.DC:inverter`

H-bridge PWM inverter sitting between a control law (current PI / speed PI) and the motor. Produces the **instantaneous switched** voltage at the motor terminals — not the average. This is essential for realistic MCSA: the output `V` carries the carrier at `f_pwm` plus its harmonics plus the intermodulation sidebands.

## Why instantaneous (not average)

Most teaching textbooks model the inverter as a unity-gain block: `V = V_cmd`. That's enough for the average current waveform, but it strips out the spectral signature MCSA relies on. Faults reveal themselves as ~60-dB-down sidebands of the carrier; if the carrier isn't simulated, the sidebands have nothing to ride on.

## Ports

| Direction | Slot | Type | Kind | Notes |
|-----------|------|------|------|-------|
| in | `V_cmd` | float | signal | Control-law voltage demand. Clamped to `[-Vdc, +Vdc]` internally. |
| out | `V` | float | signal | Instantaneous switched voltage at the motor terminals. |
| out | `duty` | float | signal | Diagnostic `V_cmd / Vdc`, clamped to `[-1, 1]`. |
| out | `switching` | boolean | signal | True at the tick the comparator commutated. Useful for counting switching events. |

## Parameters

| Name | Unit | Typical | Meaning |
|------|------|---------|---------|
| `Vdc` | V | 6, 12, 24, 48, 400 | Bus voltage. Symmetric supply assumed. |
| `fPwm` | Hz | 5 000 to 20 000 | Carrier (triangle) frequency. |
| `strategy` | enum | `bipolar` / `unipolar` | Bipolar: `V = ±Vdc` always; unipolar: `V ∈ {0, Vdc}` (or `{0, -Vdc}`). |
| `deadTime` | s | 5e-7 to 5e-6 | Both MOSFETs off during commutation. Source of "dead-time harmonics" seen in real MCSA spectra. |

## Sample-rate requirement

The inverter is `IHasSampleRateRequirement` (via `IntegrableRuntimeNode`). To resolve the PWM carrier without aliasing, the runner must tick at

```
required_hz = 20 · fPwm
```

The inverter's `computeRequiredHz()` returns exactly that. For `fPwm = 10 kHz`, `required_hz = 200 kHz`. When the user edits `fPwm`, `required_hz` refreshes automatically; the user can pin a different value through the `required_hz` editable (typing 0 / negative / NaN unpins back to the computed `20 · fPwm`).

The enclosing `SimGraphNode` aggregates `requiredHz` across all `IHasSampleRateRequirement` leaves in its inner graph and surfaces the max (floored at 60 Hz). The motor's own electrical-pole rate (`10 / tau_e`, typically 1–10 kHz) is dwarfed by the inverter's 200 kHz, so the runner naturally lifts the inner rate to honor the carrier whenever an inverter is wired upstream.

> Setting `required_hz` below the carrier's Nyquist threshold is the single most common MCSA mistake: the carrier folds back as a fictional low-frequency disturbance and the spectrum becomes noise. The default `20 · fPwm` is conservative; do not pin below it unless you are deliberately modelling a coarse-time-step controller.

## Wiring with the motor

```
V_cmd  ->  Inverter  ->  V  ->  DC Motor (Dynamic)
                         |
                         +-->  CurrentSensor  -->  FFT  -->  Spectrum
```

The CurrentSensor sees the same switched signal the motor sees, so the FFT captures the full carrier + sidebands.

## Pitfalls

- **Strategy mismatch.** `unipolar` is used on most industrial VFDs and produces a different sideband geometry than `bipolar`. Match the strategy to whatever real drive you're trying to mirror.
- **Dead time too small.** Setting `deadTime = 0` removes the dead-time harmonics, which is unrealistic for a real drive (real HW always has 0.5–5 µs to prevent shoot-through).
- **switching as a trigger.** The `switching` port pulses for ONE tick per commutation. Don't wire it to anything that expects a sustained boolean.
