# Conservation Monitor

`Logic.Sim:conservation-monitor`

Generic invariant drift gauge: sums N tributary signals (variadic `in_<k>` ports) and flags when the running sum walks away from its initial value. Sits IN PARALLEL with the dataflow to catch the silent failure mode of mass / charge / energy balances: the integrator drifts and the sim produces plausible-looking nonsense.

Typical 2-tank water balance: `Tank1.level -> in_0`, `Tank2.level -> in_1`, `EvapRate -> in_2`; `drift` to a plot, `alert` to an LED or shutdown chain.

## Mechanics

- Each fire sums every READY `in_<k>` token that is a finite number. Fires where NO wired input delivered anything are skipped entirely.
- The baseline S0 is LATCHED on the first fire that saw at least one numeric sample; this avoids the classic "everything drifts because S0 was captured before the upstream warmed up" trap (e.g. a sensor behind a 100-tick LPF settle).
- After the latch, every fire publishes `drift = S(t) - S0` and `alert`:
  - absolute mode: `alert = |drift| > tolerance`;
  - relative mode: `alert = |drift / S0| > tolerance`, degrading to absolute when `|S0| <= 1e-12` (zero-division guard; a zero `initialSum` viewable is the tell that relative mode is meaningless here).
- `alert` is intentionally NON-LATCHING: it tracks the instantaneous check every fire, leaving debounce / latch policy to the consumer. Both outputs publish every fire (no skip on small drift) so plots get a continuous trace.

## Editables

| Field | Default | Meaning |
|---|---|---|
| `tolerance` | `1e-6` | Threshold; absolute units in absolute mode, a fraction of S0 in relative mode. Floored at 0 on write |
| `mode` | `"absolute"` | `"absolute"` or `"relative"`; anything else clamps to absolute |

Viewables: `initialSum` (confirms the latch took), `currentSum` (live), `maxDrift` (sticky high-water mark of |drift| since reset: remembers a one-tick transient spike the instantaneous drift forgets).

## Pitfalls

- The sum covers the tokens READY THIS FIRE: an upstream that skips a tick simply contributes nothing, which reads as phantom drift. Feed the monitor from sources with a common cadence (same clock or the same Rate Divider).
- S0 latches on AT LEAST ONE numeric sample, not on all wired inputs: if `in_1`'s source warms up later than `in_0`'s, the baseline captures the partial sum and everything after looks drifted. Gate the monitor (node `_enable`) until all sources are live, or reset the session once they are.
