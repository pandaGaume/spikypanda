import { Unit } from "spikypanda-core";

// Static description of a DataSource. Provides everything a downstream
// component (FFT view, training UI, dataset writer) needs to reason about
// the signal without sampling it.
//
//   kind                  : machine-friendly identifier, e.g. "motor.current"
//   unit                  : physical Unit of the values produced (amperes,
//                           volts, m/s2, ...). Comes from spikypanda-core,
//                           so consumers can convert / format consistently.
//   label                 : human-readable name for UIs
//   fundamentalHz         : optional dominant frequency, useful to size FFT
//                           windows and pick a reasonable sample rate
//   expectedSpectralPeaks : optional list of peaks the source is known to
//                           produce; used by tests and by anomaly baselines
//   sampleRateHint        : recommended sample rate for fully resolving the
//                           expected peaks (Nyquist + safety margin)
export interface IDataSourceMeta {
    readonly kind: string;
    readonly unit: Unit;
    readonly label?: string;
    readonly fundamentalHz?: number;
    readonly expectedSpectralPeaks?: ReadonlyArray<number>;
    readonly sampleRateHint?: number;
}

// A DataSource is a deterministic function f(t) -> value, plus metadata.
// Determinism is on purpose: a DataSource models the *physics*, the noise
// and acquisition imperfections live in Sensor on top of it. This keeps the
// physics-side reproducible and lets consumers compose, replay or compare
// signals exactly.
export interface IDataSource {
    meta(): IDataSourceMeta;
    signal(t: number): number;
}
