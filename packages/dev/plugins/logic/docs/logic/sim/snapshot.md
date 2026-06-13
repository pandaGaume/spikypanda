# Snapshot

`Logic.Sim:snapshot`

Write side of the snapshot/restore pair: on the RISING EDGE of `trigger`, captures the current `payload` into a named slot of a module-level registry shared by every Snapshot/Restore node in the same JS runtime. The foundation of the "rewind to last known good" pattern: capture plant state now, restore it 1000 ticks later when a fault fires.

Why a registry and not a wire: the dataflow graph is single-tick (a published value is consumed by the next downstream fire), while a snapshot is intentionally CROSS-TICK. The named-slot model ("write to 'pre-fault' here, read 'pre-fault' there") also avoids a spurious spatial coupling.

## Mechanics

- Edge detection: capture happens on a low-to-high transition of `trigger` (boolean), not on a sustained high level, so holding `trigger` true for N ticks captures once. Ticks where the trigger source publishes nothing leave the edge state untouched.
- Bursting inputs are drained: the LAST value delivered on each slot this tick wins, matching "current value at trigger time".
- A rising edge with NO payload token still captures (with `undefined`): marker-only checkpoints are legal, and silently skipping would hide a wiring bug.
- Storage is BY REFERENCE, no defensive copy (the payload shape is unknown: number, tensor, deep object). Do not mutate a captured object afterward if you expect the checkpoint to stay pristine.
- `stored` publishes a one-shot `true` on the capture tick only, suitable for a tally counter or LED downstream.
- The registry is NOT cleared by session reset (clearing on a single node's reset would race the paired Restore's reset); re-snapshot explicitly when you want fresh state.

## Editables

| Field | Default | Meaning |
|---|---|---|
| `slotName` | `"default"` | Registry key shared with the matching Restore node; distinct names allow multiple coexisting pairs ("pre-fault", "10min-checkpoint", ...) |

Viewables: `lastCaptureTick` (-1 if never) and `snapshotCount` (captures since reset); if the count never increments, the trigger is not firing.

## Pitfalls

- `trigger` is a boolean LEVEL input, not a trigger-typed exec pin: a source that publishes `true` every tick yields exactly one capture until it publishes a `false` to re-arm the edge detector.
- A mismatched `slotName` between Snapshot and Restore is the most common wiring bug; the Restore side's `hasSnapshot` viewable surfaces it.
