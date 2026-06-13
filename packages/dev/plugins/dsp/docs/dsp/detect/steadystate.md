# Steady-State Gate

`DSP.Detect:steadystate`

Hysteresis state machine over a scalar stream that lets through samples belonging to ESTABLISHED regimes and closes during transients. The inverse of an event/transient gate: condition-monitoring captures quasi-stationary operating states, not maneuvers.

## Mechanics

A sample is *stable* when its deviation from a slow EMA baseline `m` stays under `epsilon * |m|` (relative). The gate opens after `settle` consecutive stable samples, closes after `breakHold` consecutive unstable ones. Every edge publishes a one-shot token on `transition`; `steady` is published each fire; `value_gated` forwards the RAW samples only while open.

## The two operating cadences

- **Block cadence (recommended)**: feed the `rms` output of `DSP.Acquire:daq`. One value per acquisition block (5 Hz with the IEC profile 10.24 kHz / 2048): ripple and noise are already averaged inside the block, so `smoothAlpha` stays at 1 (off) and `settle`/`breakHold` count BLOCKS (e.g. 5 / 2: seconds of dwell).
- **Sample cadence**: feeding a raw signal at a session rate that RESOLVES a switching carrier (e.g. 200 kHz ticks against a 10 kHz PWM, +/- 6 percent ripple) makes the gate chatter, because the instantaneous deviation exceeds epsilon for longer than breakHold. Set `smoothAlpha` (0.005 to 0.02): an EMA pre-filter applied to the stability DECISION only; `value_gated` still forwards raw samples.

## Pitfalls

- The gate decision and the gated payload are decoupled on purpose: downstream feature extraction sees the true signal, only the open/close logic is smoothed.
- During the `breakHold` confirmation window, up to `breakHold - 1` post-transition samples pass through: a frame builder downstream can straddle a regime change. The motorwatch device facade quarantines those samples; at block cadence the issue collapses to one mixed block per edge.
- A slow drift tracks BOTH EMAs, so the gate stays open through it: a drifting regime is segmented by the downstream clusterer (one profile per crossed level), not by the gate.
