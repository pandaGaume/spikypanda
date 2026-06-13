# Knobs 3

`Viz.Control:knobs3`

Three NexusUI dials side by side in a Dashboard tile, with three float outputs. SOURCE node: it publishes the current knob values on every tick, so downstream consumers always see the latest user input without dropouts (same pattern as `Logic.Input:slider`, but the UI lives in the dashboard tile instead of the property panel: turn a knob and watch the live spectrum react without switching focus). Designed for "one oscillator per tile" (f / A / phase) but generic for any 3-parameter object (PID gains, fault levels, mixer channels).

## Dashboard tile (IRenderable)

Dropping the node from the palette auto-mounts the tile; the close button removes the tile only, the node stays in the graph and keeps publishing its last values. Dials respond to vertical drag in relative mode (DAW convention: deltas, no jump to the click point).

## Outputs (3 fixed slots)

| Slot        | Type  |
| ----------- | ----- |
| `frequency` | float |
| `amplitude` | float |
| `phase`     | float |

The SLOT names are fixed even when you repurpose the tile by editing the labels (e.g. Kp/Ki/Kd): port renaming would invalidate every wire on every label edit. Knob 0 always publishes on `frequency`, knob 1 on `amplitude`, knob 2 on `phase`.

## Editables (per knob, index 0..2)

| Field        | Defaults (knob 0 / 1 / 2)           | Behavior                      |
| ------------ | ----------------------------------- | ----------------------------- |
| `label_0..2` | `Frequency` / `Amplitude` / `Phase` | Display label under the dial. |
| `min_0..2`   | 1 / 0 / 0                           | Dial minimum.                 |
| `max_0..2`   | 200 / 1 / 2\*pi                     | Dial maximum.                 |

The knob VALUES (initial 50 / 1 / 0) are not property-panel editables: the knob IS the editor. They are persisted, so save/load round-trips the last user-set positions.

## Pitfalls

- Editing a min/max/label recreates the affected dials on the next frame (NexusUI dials cannot change range live). The current values survive the rebuild.
- Outputs publish EVERY tick: at high sim rates this is three tokens per tick. Fine for the runtime, but anything that logs per-token downstream will be loud.
- Dials have a fixed 72 px size; a narrow tile scrolls horizontally rather than shrinking them.
