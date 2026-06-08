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

To resolve the carrier without aliasing the runner must tick at

```
simRate >= 20 · fPwm
```

For `fPwm = 10 kHz`, simRate must be **>= 200 kHz**. The motor's solver further shrinks its internal step adaptively around the V transitions.

> Setting simRate below this threshold is the single most common mistake: the carrier folds back as a fictional low-frequency disturbance and the MCSA spectrum becomes noise.

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
