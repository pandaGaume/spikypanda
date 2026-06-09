# BLDC 6-step Inverter

`Physics.Electric.Motor.BLDC:inverter`

6-step trapezoidal-commutation inverter: turns a DC bus, a duty (`[0..1]`, negative reverses), and the rotor's electrical angle (`theta_e`) into 3-phase line-to-neutral voltages. Standard 60°-sector commutation table; PWM modeled as **average voltage** (no individual switching cycle, appropriate for a 100 µs simulation step against a 20 kHz carrier).

For a switching-level inverter, see the DC node's H-bridge (`Physics.Electric.Motor.DC:inverter`), which models the instantaneous switched voltage and is the right choice for spectrum-fidelity MCSA on a brushed motor.

## Commutation table

Indexed by 60° sector `s ∈ {0..5}` derived from `θ_e mod 2π`:

| Sector | V_a   | V_b   | V_c   |
|--------|-------|-------|-------|
| 0      | +V    | −V    | 0     |
| 1      | +V    | 0     | −V    |
| 2      | 0     | +V    | −V    |
| 3      | −V    | +V    | 0     |
| 4      | −V    | 0     | +V    |
| 5      | 0     | −V    | +V    |

`V = duty · V_dc / 2` (line-to-neutral after Y-connection split). Negative duty reverses the rotation by flipping the sign of every V.

## Ports

| Direction | Slot | Type | Notes |
|-----------|------|------|-------|
| in | `V_dc` | float | DC bus voltage [V]. Optional; falls back to `V_dc_default` editable. |
| in | `duty` | float | `[0..1]` (clamped). Negative duty reverses rotation. |
| in | `theta_e` | float | Electrical angle [rad]. Typically `theta_m × P` from the motor. Unwired defaults to 0 (locks sector 0). |
| out | `V_a`, `V_b`, `V_c` | float | Per-phase line-to-neutral output [V]. |
| out | `sector` | float | Current commutation sector (informational, 0..5). |

## Parameters

| Name | Unit | Default | Meaning |
|------|------|---------|---------|
| `V_dc_default` | V | 24 | Fallback DC bus when no `V_dc` is wired. |
| `required_hz` | Hz | 10 000 (computed) | The average-voltage model assumes ~100 µs steps against a 20 kHz carrier. See [Sample rate](#sample-rate). |

## Sample rate

The inverter extends `IntegrableRuntimeNode`. `computeRequiredHz()` returns a fixed **10 kHz baseline**, matching the documented assumption that the simulation samples at 100 µs against a 20 kHz physical carrier (giving 2 samples per carrier cycle, which is fine for an average-voltage model). User can pin a higher value via `required_hz` if modelling a higher carrier; entering 0 / negative / NaN unpins back to 10 kHz.

The `SimGraphNode` aggregates `requiredHz` across its leaves. With this inverter, the BLDC motor (typically `~5-10 kHz` from its commutation harmonic), and the rest of the graph, the effective inner Sim.Graph rate is `max(leaves) ≥ 10 kHz`.

## Pitfalls

- **Average vs switched.** This model produces the AVERAGE voltage per sector, not the switched waveform. The motor's current spectrum will show the commutation ripple at 6f_e from the trapezoidal back-EMF, but it will NOT show the PWM carrier sidebands. For switched-voltage MCSA, prefer a DC H-bridge model adapted to 3-phase, or wait for a future SVPWM switching inverter.
- **theta_e wiring.** `theta_e` is the ELECTRICAL angle (`P × theta_m`), not the mechanical angle. Wiring `theta_m` directly leaves the inverter desynchronised from the rotor and produces apparent slip + zero torque at sectors that should be active.
- **Duty saturation.** Clamping happens at `|duty| ≤ 1`. Sending sustained duty `> 1` from a speed PI saturating during a step response is correct; it does not break the inverter, but the motor torque saturates at `V_dc / 2`.
