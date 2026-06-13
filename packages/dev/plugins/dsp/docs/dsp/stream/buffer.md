# Scalar Buffer

`DSP.Stream:buffer`

Sliding-window frame builder: accumulates incoming samples and emits one frame every `hopLength` samples. Two ingestion layouts, fixed by the FIRST sample after reset:

- **scalar floats** -> frames of shape `[frameSize]` (legacy behavior),
- **`[C]` tensor rows** (from `DSP.Stream:mux`) -> frames of shape `[frameSize, C]`.

A later layout or channel-count mismatch throws. The input port is typed `any` for exactly this reason: both floats and tensor rows are first-class.

## Editables

- `frameSize`: samples per emitted frame (default 256),
- `hopLength`: slide between emissions (default = frameSize, i.e. non-overlapping; smaller = overlapping STFT-style frames).

Emitted frames are defensive copies: downstream may hold them across ticks.

## Note on acquisition

For sensor-side block acquisition with its own sampling clock (IEC-style 10.24 kHz / 2048-sample blocks), prefer `DSP.Acquire:daq`: this buffer frames at the SESSION tick rate, the DAQ frames at the SENSOR rate.
