# Rate Divider

`Logic.Sim:rate-divider`

Downsamples a firing cadence by an integer factor: emits on 1 of every `divisor` fires. The multi-rate scheduling primitive: one fast clock drives the whole graph, and a divider node per slow consumer (plotting at 10 Hz off a 1 kHz loop, a snapshot every 1000 ticks) keeps the topology one-source simple.

## Mechanics

- Two outputs per firing tick:
  - `tick`: a plain boolean `true`, the "slow clock". Emitted on EVERY firing tick, value wired or not.
  - `value`: passthrough of the `value` input, emitted ONLY when a fresh sample arrived since the last emission (the node never invents data on a no-sample tick).
- The `value` input is drained on every fire (including non-firing ones) so the channel queue cannot backlog; only the MOST RECENT sample is kept for the next emission, older ones are dropped. That is the correct semantics for "thin out the stream".
- The cadence counts this node's own `fire()` calls, not a tick number, so it is robust to schedulers without a monotonic `t`.

## Editables

| Field | Default | Meaning |
|---|---|---|
| `divisor` | `10` | Emit 1 of N. Clamped to an integer >= 1 on write (0 or negative would freeze the output); editing it resets the internal counter so the next emission is exactly `divisor` fires away |

Viewable: `emitCount` (emissions since reset; emits/fires converges to 1/divisor).

## Pitfalls

- `divisor = 1` is a pure pass-through (with the drain-keep-last behavior on bursts).
- Dropped samples are gone: this node decimates, it does not average. Put an RMS / mean upstream if you need anti-aliased downsampling rather than thinning.
