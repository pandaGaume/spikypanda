# Stem (Oracle Spectrum)

`Viz.Plot:stem`

Discrete-spectrum "oracle" tile: N (frequency, amplitude) pairs drawn as colored vertical bars on a frequency axis. It shows what the pipeline was COMMANDED to inject; sit it next to a live `Viz.Plot:spectrum` to compare commanded peaks against measured FFT magnitudes at a glance. When `session.simRate > 0` both tiles share the exact same 0-to-Nyquist X axis, so the comparison is honest.

## Dashboard tile (IRenderable)

Dropping the node from the palette auto-mounts a tile in the dashboard panel; the close button removes the tile only, the node stays in the graph.

## Inputs: true variadic pairs

The node seeds with one pair (`f_0`, `A_0`), both optional floats. Two parallel variadic groups (prefix `f_` for frequency, prefix `A_` for amplitude) grow INDEPENDENTLY as you connect: wiring `f_0` makes `f_1` appear, wiring `A_0` makes `A_1` appear. Wire one oscillator, one stem; wire ten, ten stems. Unbounded in principle; the practical limit is dashboard legibility.

Each stem index keeps its own color from an 8-color palette (orange, cyan, green, yellow, red, purple, pink, slate, repeating after 8), keyed on the ORIGINAL stem index, not the frequency sort order: oscillator 0 stays orange even when its frequency crosses oscillator 1's.

No outputs: pure sink.

## Mechanics

- Values are LATCHED per stem index: a slider that only publishes on change keeps its bar visible between updates. Non-finite or non-numeric tokens are ignored.
- A pair missing one side (only `f_2` wired, `A_2` dangling) is silently skipped: no half-bars, no NaN artefacts. Amplitudes with |A| < 1e-9 are hidden too (turn a knob to zero, the stem disappears).
- Y axis: bottom 0, top trails the peak amplitude \* 1.15 with the same asymmetric smoothing as the spectrum tile (instant growth, slow decay).
- X axis: pinned to [0, Nyquist] when the session publishes a sample rate; in free-running mode it auto-fits to the max wired frequency + 10 percent (the axis label then reads "Hz (free mode → no Nyquist)").
- `reset()` clears every latched pair.

Viewables: `sampleRateHz`, `xAxisMaxHz` (Nyquist), and `visibleStems` (count of fully wired, non-zero pairs; a quick sanity check when a bar "is missing").

## Pitfalls

- Latching means a stem SURVIVES disconnection until the next session reset: unplugging an oscillator does not erase its bar, setting its amplitude to 0 (or resetting) does.
- A commanded frequency above Nyquist renders off-scale right when the X axis is pinned: the oracle shows the command, the FFT tile will show the alias. That disagreement is the point of the comparison.
