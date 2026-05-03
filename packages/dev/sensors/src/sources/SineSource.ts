import { Dimensionless, Unit } from "spikypanda-core";
import { TWO_PI } from "../util/math";
import { IDataSource, IDataSourceMeta } from "../interfaces/DataSource";

// Single-tone sinusoid: amplitude * sin(2π f t + phase).
// Convenient as a building block in compositions (e.g. injecting a known
// harmonic) and as a controlled signal for FFT / DFT validation tests.
export interface ISineSourceConfig {
    frequencyHz: number;
    amplitude?: number;
    phase?: number;
    unit?: Unit;
    kind?: string;
    label?: string;
}

export class SineSource implements IDataSource {
    public readonly frequencyHz: number;
    public readonly amplitude: number;
    public readonly phase: number;
    private readonly _meta: IDataSourceMeta;

    public constructor(cfg: ISineSourceConfig) {
        this.frequencyHz = cfg.frequencyHz;
        this.amplitude = cfg.amplitude ?? 1.0;
        this.phase = cfg.phase ?? 0.0;
        this._meta = {
            kind: cfg.kind ?? "sine",
            unit: cfg.unit ?? Dimensionless.Units.none,
            label: cfg.label,
            fundamentalHz: this.frequencyHz,
            expectedSpectralPeaks: [this.frequencyHz],
        };
    }

    public meta(): IDataSourceMeta {
        return this._meta;
    }

    public signal(t: number): number {
        return this.amplitude * Math.sin(TWO_PI * this.frequencyHz * t + this.phase);
    }
}
