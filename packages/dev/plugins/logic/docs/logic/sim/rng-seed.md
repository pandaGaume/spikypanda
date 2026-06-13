# RNG Seed

`Logic.Sim:rng-seed`

Deterministic pseudo-random scalar source (Mulberry32): publishes a fresh value in [0, 1) on every fire, from a stream entirely determined by the `seed` editable. Use it wherever a sim needs REPRODUCIBLE randomness: regression tests that must replay bit for bit, and Monte-Carlo sweeps where `seed = base + i` yields N independent, individually replayable trajectories. `Math.random()` cannot do either (the JS engine reseeds it per page load).

## Mechanics

- Mulberry32: a 5-line uint32 PRNG with a 2^32 period and seed-injectivity (each seed maps to a distinct stream prefix). Good enough for ECLSS-scale stochastic perturbations; NOT cryptographic.
- Session reset re-seeds the stream from `seed`, so every run of the same graph draws the same sequence.
- Editing `seed` MID-RUN re-seeds immediately (the next fire draws from the new sequence), enabling live A/B comparisons without restarting the graph.
- The output is uniform on [0, 1); wire through `Logic.Math:multiply` / `:add` (or a Clamp) to map onto [a, b].

## Editables

| Field | Default | Meaning |
|---|---|---|
| `seed` | `42` | Integer seed (floored and truncated to int32 on write) |

Viewables: `lastValue` (last drawn value, a quick "is this ticking" check) and `tickCount` (fires since reset, a scheduling sanity check).

## Pitfalls

- Determinism holds only if the CONSUMERS fire in a deterministic order too; the node guarantees the stream, not the graph's consumption pattern.
- `Logic.Array:shuffle` does NOT use this stream (it calls `Math.random()` internally): a "seeded" graph containing a Shuffle is still non-reproducible.
