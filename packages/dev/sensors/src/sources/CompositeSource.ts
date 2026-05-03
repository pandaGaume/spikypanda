import { IDataSource, IDataSourceMeta } from "../interfaces/DataSource";

// Additive composition of N IDataSources: signal(t) = Σ child.signal(t).
//
// Used to layer fault signatures on top of a healthy motor signal: the
// healthy MotorCurrentSource produces the baseline, and zero or more
// MotorFaultSource instances add their physically-motivated contributions
// to it. Composition is preferred to inheritance because it lets several
// faults coexist without modifying the healthy model and lets each fault
// be tested in isolation.
//
// Meta defaults to the head source's meta. Override fields explicitly via
// metaOverride when the composition has a different identity than its
// dominant child (e.g. composing audio + vibration into a multi-modal feed).
export class CompositeSource implements IDataSource {
    private readonly _sources: ReadonlyArray<IDataSource>;
    private readonly _meta: IDataSourceMeta;

    public constructor(sources: ReadonlyArray<IDataSource>, metaOverride?: Partial<IDataSourceMeta>) {
        if (sources.length === 0) {
            throw new Error("CompositeSource requires at least one source");
        }
        this._sources = sources;

        const head = sources[0].meta();
        this._meta = {
            kind: metaOverride?.kind ?? head.kind,
            unit: metaOverride?.unit ?? head.unit,
            label: metaOverride?.label ?? head.label,
            fundamentalHz: metaOverride?.fundamentalHz ?? head.fundamentalHz,
            expectedSpectralPeaks: metaOverride?.expectedSpectralPeaks ?? head.expectedSpectralPeaks,
            sampleRateHint: metaOverride?.sampleRateHint ?? head.sampleRateHint,
        };
    }

    public meta(): IDataSourceMeta {
        return this._meta;
    }

    public signal(t: number): number {
        let acc = 0;
        for (const s of this._sources) {
            acc += s.signal(t);
        }
        return acc;
    }
}
