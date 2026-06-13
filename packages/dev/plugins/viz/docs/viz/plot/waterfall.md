# Waterfall Spectrogram

`Viz.Plot:waterfall`

Scrolling 2D spectrogram rendered with PixiJS (WebGL). Each fire consumes one magnitude vector on `magnitudes` (typically the FFT magnitude chain) and pushes it as the newest row of a `historyRows` x `numBins` image; the picture scrolls so the newest frame sits at the top. Use it for the TIME EVOLUTION of a spectrum (sweeps, regime changes, intermittent tones); pair it with `Viz.Plot:spectrum` for the single-frame zoom-in.

## Dashboard tile (IRenderable)

Dropping the node from the palette auto-mounts a tile in the dashboard panel. The tile's close button removes the tile only; the node stays in the graph and keeps filling its ring on `fire()`. Rendering is deferred to `repaint()` at ~60 fps: the ring is blitted to an RGBA buffer, uploaded to a PixiJS texture, and one sprite is stretched to the tile.

## Inputs

| Slot         | Type | Notes                                                                                                                                                                                    |
| ------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `magnitudes` | any  | Optional. Accepts `Float32Array` / other typed arrays, plain `number[]`, or a tensor-shaped `{ data: TypedArray }` (the ONNX output convention). Anything else is ignored for that fire. |

No outputs: pure sink.

## Editables

| Field           | Default     | Behavior                                                                                                                         |
| --------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `numBins`       | 256         | Ring width (clamped >= 2, floored). Changing it re-allocates and CLEARS the ring on the next frame.                              |
| `historyRows`   | 200         | Rows kept on screen (clamped >= 2, floored). Same re-allocate-and-clear on change.                                               |
| `colormap`      | `"viridis"` | `viridis` \| `hot` \| `grayscale`.                                                                                               |
| `dbScale`       | true        | Converts magnitudes to dB (20 \* log10, epsilon-floored so zero bins clamp to `vmin` instead of -Infinity) before color mapping. |
| `vmin` / `vmax` | -80 / 0     | Dynamic-range clamps in dB (applied after the dB conversion when enabled).                                                       |

Viewables: `sampleRateHz` (auto-sourced from `session.simRate` each fire; 0 = free-running, no Hz axis), `xAxisMaxHz` (Nyquist = sampleRate / 2), and `lastReceivedBins` (width of the last incoming vector, handy for matching `numBins` to an upstream FFT that outputs N/2+1 bins).

## Mechanics

- The sample rate is NOT an editable: the tile follows `session.simRate` and re-renders its Hz axis strip (0 to Nyquist, 6 labels) whenever the runner's rate changes. Free-running sessions get no axis.
- A frame whose length differs from `numBins` is nearest-neighbour resampled to the ring width: both shorter and longer frames render without crashing, at the cost of bin fidelity. Match `numBins` to `lastReceivedBins` for a 1:1 mapping.
- The ring rotates by a head index (push is O(numBins), not O(rows x bins)); `reset()` zero-fills it.

## Pitfalls

- `dbScale` defaults ON with a [-80, 0] dB window: a LINEAR magnitude pipeline whose peaks sit above 1.0 will saturate at `vmax` 0 dB. Raise `vmax` or widen the window rather than disabling dB blindly.
- Changing `numBins` or `historyRows` wipes the accumulated history (full re-allocation): retune the geometry before a capture, not during it.
