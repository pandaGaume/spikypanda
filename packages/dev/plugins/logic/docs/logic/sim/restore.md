# Restore

`Logic.Sim:restore`

Read side of the snapshot/restore pair: on the RISING EDGE of `trigger`, publishes the last payload that a `Logic.Sim:snapshot` with the matching `slotName` captured. Together they implement checkpoint/rewind without threading state through wires.

## Mechanics

- Edge detection mirrors the Snapshot node: restore happens on a low-to-high transition of the boolean `trigger`; bursts are drained keeping the last level; silent ticks preserve the edge state.
- On a MISS (no snapshot ever recorded under `slotName`) the node publishes NOTHING. Rationale: downstream consumers are usually typed (a `setState` expects a state object); pushing `undefined` would crash or silently corrupt them. The absence is visible via the `hasSnapshot` viewable instead.
- The registry lookup happens at restore time, so a Snapshot fired EARLIER IN THE SAME TICK is already visible to a Restore wired after it in the dataflow.
- `payload` is emitted only on a successful restore tick, with whatever type the snapshot held, BY REFERENCE (no copy).

## Editables

| Field | Default | Meaning |
|---|---|---|
| `slotName` | `"default"` | Must match the capturing Snapshot node's slot name |

Viewables: `hasSnapshot` (live registry check, the mismatched-name detector) and `lastRestoreTick` (-1 if never; pairs with Snapshot's `lastCaptureTick` for a round-trip check).

## Pitfalls

- Restore replays the LATEST capture for the slot, not a history: two captures between two restores lose the first one.
- The registry is shared per JS runtime, not per session: a payload captured in a previous run of the same page is still restorable. Re-snapshot at session start if that is not what you want.
