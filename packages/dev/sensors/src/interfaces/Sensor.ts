import { IDataSource } from "./DataSource";

// One sample produced by a sensor.
//   t      : timestamp in seconds (same time domain as IDataSource.signal(t))
//   value  : measured value, in the unit declared by the underlying source
export interface ISensorReading {
    t: number;
    value: number;
}

// Configuration that turns a clean IDataSource signal into a realistic
// measurement. All fields except sampleRateHz are optional and default to a
// pass-through behavior (gain=1, bias=0, no noise).
//
//   sampleRateHz : acquisition rate in Hz, must be > 0
//   noiseStd     : standard deviation of additive Gaussian noise, in source
//                  units (e.g. amperes for a current sensor). 0 disables noise.
//   bias         : constant offset added after gain (calibration error)
//   gain         : multiplicative scale applied before bias
//   rngSeed      : seed for the noise RNG, fixes the noise stream so two runs
//                  with the same seed produce identical traces
export interface ISensorConfig {
    sampleRateHz: number;
    noiseStd?: number;
    bias?: number;
    gain?: number;
    rngSeed?: number;
}

// Common surface of any sensor wrapping an IDataSource. Implementations
// expose their effective config so callers (recorders, factories, UIs) can
// inspect or duplicate it without depending on the concrete class.
export interface ISensor {
    readonly config: ISensorConfig;
    next(t: number): ISensorReading;
}

// A SensorFactory hides "how to build a sensor given a source". It is the
// extension point used by LabeledRecorder when it switches scenarios: the
// recorder owns the sources, the factory owns the measurement profile.
export type SensorFactory = (source: IDataSource) => ISensor;
