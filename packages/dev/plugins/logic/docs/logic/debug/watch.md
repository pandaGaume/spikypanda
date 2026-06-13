# Watch Value

`Logic.Debug:watch`

Throttled value mirror: every published `value` produces one DebugBus entry (level `watch`) tagged with `label`, rate-limited in SIM time. The tool for observing a live wire without chaining triggers; the entries surface in the console / property panel.

## Mechanics

- One input, `value` (any); NO outputs. Pass-through is intentionally not provided: fan out the source itself if you need tee-style observation.
- `undefined` samples are ignored entirely.
- Throttling is computed against the SIM time `t` passed to `fire()`, not wall time, so a paused session does not release pent-up emissions on resume. Two emit conditions, either suffices:
  1. at least `1 / maxRateHz` sim seconds elapsed since the last emit;
  2. the value CHANGED since the last emit (`Object.is` comparison), which guarantees a one-tick transient between two throttle windows still shows up.
- Session reset clears the throttle state so a fresh run emits from its first tick.

## Editables

| Field | Default | Meaning |
|---|---|---|
| `label` | `"Watch"` | Console tag (falls back to "Watch" when emptied) |
| `maxRateHz` | `30` | Max emissions per SIM second. `0` disables throttling entirely (opt-in: at a 200 kHz sim rate an unthrottled watch dumps 200 000 lines per sim second and freezes the console); negative values clamp to 0 |

## Pitfalls

- The change-detection bypass means a NOISY signal (changing every tick) effectively ignores the rate cap: every distinct sample emits. Throttle upstream (e.g. `Logic.Sim:rate-divider`) for high-rate noisy wires.
- `Object.is` compares references for objects: a producer republishing a fresh-but-equal object every tick counts as "changed" every tick.
