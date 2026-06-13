# Frequency Spectrum

`Viz.Plot:spectrum`

Live single-frame FFT magnitude view, rendered with uPlot. Each fire fully REPLACES the displayed snapshot with the latest `magnitudes` vector (no history): a "scope" view of the current spectrum. Use it to identify dominant peaks at a glance (MCSA bin positions, motor harmonics); pair with `Viz.Plot:waterfall` for the time evolution and `Viz.Plot:stem` for the commanded-vs-measured comparison.

## Dashboard tile (IRenderable)

Dropping the node from the palette auto-mounts a tile in the dashboard panel; the tile's close button removes the tile only, the node stays in the graph. `fire()` caches the frame, `repaint()` draws at ~60 fps.

## Inputs

| Slot         | Type | Notes                                                                                                                                                                                                   |
| ------------ | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `magnitudes` | any  | Optional. `Float32Array` / typed arrays, `number[]`, or `{ data: TypedArray }`. Values are taken as absolute values defensively (a signed Re(X) upstream still plots). Length defines the X axis range. |

No outputs: pure sink.

## Editables

| Field       | Default       | Behavior                                                                                                                                                                                 |
| ----------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fillStyle` | `"area"`      | `line` \| `area` \| `bars`. Style changes rebuild the chart on the next frame.                                                                                                           |
| `scaleType` | `"linear"`    | `linear` \| `dB`. Flipping recomputes the display from the cached frame immediately (works while paused) and re-seeds the Y axis in the new units.                                       |
| `inputType` | `"magnitude"` | `magnitude` \| `power`. Controls the dB conversion: magnitude uses 20·log10, power uses 10·log10. Set `power` when the upstream FFT is in power mode, otherwise dB numbers read doubled. |
| `dBRange`   | 100           | Y-axis span below the peak in dB mode. Clamped to [20, 200], floored. 100 dB (about 5 decades) shows MCSA sidebands sitting 40 to 60 dB under the fundamental with headroom.             |

Viewables: `framePeak` (last frame's peak in display units; the Y axis top trails it automatically, see the axis contract below), `sampleRateHz` (auto-sourced from `session.simRate`), `xAxisMaxHz` (Nyquist), `lastReceivedBins` (catches the N/2+1 off-by-one when matching an upstream FFT).

## Axis contract

- X axis: 0 to Nyquist in Hz when `session.simRate > 0` (bin spacing = Nyquist / (N - 1)), plain bin index 0..N-1 in free-running mode. The rate is auto-sourced every fire; a simRate change mid-play re-derives the axis on the next frame, no manual sync.
- Y axis, linear: bottom pinned at 0, top trails framePeak \* 1.15.
- Y axis, dB: top trails framePeak + 5 dB, bottom sits `dBRange` below the top, so a quiet signal still shows a populated axis instead of collapsing toward -Infinity (zero bins are epsilon-floored).
- The top is smoothed asymmetrically: a new larger peak snaps the axis up INSTANTLY (never clipped on the frame it appears), while shrinkage decays at 0.5 percent per frame (about a 3.3 s time constant at 60 fps) so FFT windowing leakage does not make the axis jitter.

## Linear vs dB, when to flip

Linear is the default because a fresh Buffer to FFT chain should show a peak rising above zero on the first frame, not a flat band at -20 dB to interpret. Flip to dB once the DC bin or a carrier drowns the content you care about: MCSA sidebands 40+ dB below the carrier are invisible on a linear scale.

## Pitfalls

- No history and no averaging: a noisy spectrum flickers at the upstream frame rate. Average upstream (e.g. Welch-style) if you need a stable floor.
- `inputType` only affects dB mode; in linear mode power and magnitude both display as-is, so a quiet "looks fine in linear, wrong numbers in dB" usually means this field is mismatched.
