import { IDataSource } from "../interfaces/DataSource";
import { ISensor, ISensorConfig, ISensorReading, SensorFactory } from "../interfaces/Sensor";
import { Rng } from "../util/rng";

// Default Sensor implementation. It wraps a deterministic IDataSource and
// applies the measurement-side imperfections defined in ISensorConfig:
//
//   measured = gain * source.signal(t) + bias + N(0, noiseStd^2)
//
// The IDataSource itself stays pure, which lets two Sensor instances
// observe the same physical signal with different noise / gain profiles
// ("good probe vs. degraded probe" comparisons), and keeps the ground-truth
// signal available for baseline / supervised tests.
export class Sensor implements ISensor {
    public readonly source: IDataSource;
    public readonly config: ISensorConfig;

    private readonly _noiseStd: number;
    private readonly _bias: number;
    private readonly _gain: number;
    private readonly _rng: Rng;

    public constructor(source: IDataSource, config: ISensorConfig) {
        if (config.sampleRateHz <= 0) {
            throw new Error("Sensor: sampleRateHz must be > 0");
        }
        this.source = source;
        // Freeze a normalized copy so callers cannot mutate our config under
        // our feet, and so config.gain / config.bias are always defined.
        this.config = Object.freeze({
            sampleRateHz: config.sampleRateHz,
            noiseStd: Math.max(0, config.noiseStd ?? 0),
            bias: config.bias ?? 0,
            gain: config.gain ?? 1,
            rngSeed: config.rngSeed,
        });

        this._noiseStd = this.config.noiseStd ?? 0;
        this._bias = this.config.bias ?? 0;
        this._gain = this.config.gain ?? 1;
        this._rng = new Rng(this.config.rngSeed);
    }

    public get sampleRateHz(): number {
        return this.config.sampleRateHz;
    }

    // Sample the underlying source at time t and return the measured reading.
    // The RNG state advances by exactly one Gaussian draw when noiseStd > 0,
    // by zero otherwise; this guarantees seed reproducibility across runs.
    public next(t: number): ISensorReading {
        const clean = this.source.signal(t);
        const noise = this._noiseStd > 0 ? this._rng.gaussian(0, this._noiseStd) : 0;
        return { t, value: this._gain * clean + this._bias + noise };
    }

    // Convenience generator: yields readings on a uniform time grid spanning
    // [t0, t0 + durationS). Total count is floor(durationS * sampleRateHz).
    public *stream(durationS: number, t0: number = 0): IterableIterator<ISensorReading> {
        const dt = 1.0 / this.sampleRateHz;
        const n = Math.floor(durationS * this.sampleRateHz);
        for (let i = 0; i < n; i++) {
            yield this.next(t0 + i * dt);
        }
    }
}

// Build a SensorFactory from either an ISensorConfig (template) or an
// existing ISensor (whose config is reused). LabeledRecorder uses this when
// it swaps scenarios: the active source changes, the measurement profile
// stays.
export function makeSensorFactory(spec: ISensorConfig | ISensor): SensorFactory {
    const cfg: ISensorConfig = isSensorLike(spec) ? spec.config : spec;
    return (source) => new Sensor(source, cfg);
}

function isSensorLike(spec: ISensorConfig | ISensor): spec is ISensor {
    return typeof (spec as ISensor).next === "function";
}
