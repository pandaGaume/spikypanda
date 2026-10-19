# XY Plot

`Viz.Plot:xy`

An explicit X vector against up to three Y vectors. The axis is **data**, not a derived frequency, so the caller owns the units.

## Why it exists next to the spectrum tile

| Tile | X axis | Inputs |
|---|---|---|
| `Viz.Plot:spectrum` | frequency in Hz, from `session.simRate`, or bin index | `magnitudes` |
| `Viz.Plot:stem` | frequency, one bar per wired pair | variadic `f_<k>` / `A_<k>` |
| `Viz.Plot:xy` | **whatever the pipeline publishes on `x`** | `x`, `y_1`, `y_2`, `y_3` |

A curve whose abscissa is a physical quantity the graph computes (wavelength in nanometres, angle, position, a voltage sweep) has no home in the first two. The stem tile does carry explicit positions, but one port pair per bar, which does not scale to a few thousand points.

## Ports

| Direction | Slot | Type | Notes |
|---|---|---|---|
| in | `x` | any | `Float64Array`, `Float32Array` or `number[]`. The shared axis. |
| in | `y_1` | any | First curve. |
| in | `y_2` | any | Optional second curve, same axis. |
| in | `y_3` | any | Optional third curve, same axis. |

Three Y inputs rather than one because comparing curves on a shared axis is the usual reason to reach for this tile: a LIBS chain wires the ideal, the instrumented and the measured spectrum into one frame and reads the instrument's effect off the overlay.

A Y vector shorter than X is drawn over the common length instead of blanking the tile, so a half-published frame still shows something.

## Parameters

| Field | @editable | Default | Meaning |
|---|---|---|---|
| `title` | string | `"xy"` | Frame title. |
| `x_label` | string | `"x"` | X axis label. Put the unit here: `"wavelength (nm)"`. |
| `y_label` | string | `"y"` | Y axis label. |
| `max_points` | number | 2000 | Visual decimation target. 0 disables it. |
| `series_names` | string | `"y1, y2, y3"` | Legend names, comma separated, in port order. |

## Decimation keeps peaks, and never touches the source

A spectrometer frame is a few thousand points and a narrow line can be one or two of them. Stride decimation would make such a line blink or disappear as the window resizes. This tile buckets the data into `max_points` buckets and keeps **each bucket's peak**, with that sample's own X. A narrow line survives at any zoom level, and the published vectors are never modified: decimation happens on the way to the canvas.

When several curves are wired, the first one with data decides which sample each bucket keeps, so all curves are read at the same X and the overlay stays honest.

## Viewables

| Name | Notes |
|---|---|
| `point_count` | length of the X vector |
| `series_count` | number of Y vectors currently wired and non-empty |
| `x_min`, `x_max` | first and last X value |
| `y_peak` | largest value across every wired curve |
