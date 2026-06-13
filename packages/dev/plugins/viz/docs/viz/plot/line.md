# Time-series Plot

`Viz.Plot:line`

Real-time scrolling time-series of one scalar, rendered with uPlot in a Dashboard tile. Wire anything scalar to `value` (motor omega, a DSP feature, a sensor reading) and watch it scroll. This is the "first plot" of any graph: if a signal exists, this tile shows it.

## Dashboard tile (IRenderable)

Like every `Viz.*` node, this is a Dashboard tile: dropping it from the palette auto-mounts a GridStack tile in the dashboard panel the moment the node lands in the graph. The tile's close button removes the TILE ONLY; the node stays in the graph (and keeps buffering on `fire()`), so closing a tile never breaks the pipeline. The data path and the render path are decoupled: `fire()` appends to an internal ring buffer (zero DOM work), and the Dashboard drives `repaint()` at ~60 fps to hand the buffer to uPlot.

## Inputs

| Slot    | Type  | Notes                                                                                                                                     |
| ------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `value` | float | Optional. A fire with no ready token on `value` plots nothing (no zero-stuffing): the trace only advances when a number actually arrives. |

No outputs: pure sink.

## Editables

| Field           | Default   | Behavior                                                                                                                           |
| --------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `maxSamples`    | 500       | Ring buffer cap, floored to an integer and clamped to >= 2. Shrinking it trims the existing buffer immediately.                    |
| `title`         | `"value"` | Legend label.                                                                                                                      |
| `yAuto`         | true      | uPlot autoscale. See "Oscilloscope semantics" below.                                                                               |
| `yMin` / `yMax` | -1 / 1    | Manual Y bounds, used only when `yAuto` is false. Typing into either one auto-flips `yAuto` off ("pin the range" intent).          |
| `maxPushHz`     | 1000      | Maximum push rate into the ring buffer, in Hz of SIM time. 0 disables the throttle; negative values clamp to 0 (same as disabled). |

Viewable: `lastValue` mirrors the most recent buffered sample in the property panel.

## Oscilloscope semantics on yAuto

Turning `yAuto` OFF seeds `yMin`/`yMax` from the CURRENTLY VISIBLE live scale, not from the stored defaults. Without this, flipping the toggle would jump the view to the stale stored bounds (default [-1, 1]), hiding any signal outside them, which reads as "the toggle broke the plot". With it, the trace stays exactly where it is and the user fine-tunes from there: the same gesture as freezing the vertical scale on a scope. In clamped mode the Y scale is re-pinned imperatively on every frame (uPlot's declarative range is silently overridden by auto-fit on incoming data otherwise).

## Why maxPushHz exists

Each accepted push costs an O(maxSamples) array shift once the ring is full. At audio / RF sim rates (simRate >= 100 kHz) a 1:1 push runs that shift ~200k times per wall second and freezes the main thread. The 1 kHz default keeps up to ~500 Hz of visible content via Nyquist, plenty for closed-loop control diagnostics, while 500 samples then cover 0.5 s of sim history. The throttle compares SIM time (the `t` of `fire`), not wall clock, so it is reproducible across pause/resume and play-speed changes. Set 0 to disable when you genuinely want to see per-tick detail, e.g. PWM ripple at simRate 200 kHz.

## Pitfalls

- The X axis is `Clock.t` in seconds, not wall time; a session reset clears the buffer and restarts at the session origin.
- With the default throttle, a burst faster than 1 kHz sim time is decimated, not averaged: aliasing applies. Lower `maxPushHz` consciously or pre-filter upstream (e.g. plot a block RMS instead of raw samples).
