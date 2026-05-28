import { Dimensionless, Unit } from "spikypanda-core";
import { IDataSource, IDataSourceMeta } from "../interfaces/DataSource";

// Trivial source that always returns the same value, regardless of t.
// Useful as a DC-offset component in compositions, as a stub in tests, or
// to provide a known baseline when calibrating a sensor's bias / gain.
export class ConstantSource implements IDataSource {
    private readonly _meta: IDataSourceMeta;

    public constructor(
        public readonly amplitude: number,
        unit: Unit = Dimensionless.Units.none,
        kind: string = "constant"
    ) {
        this._meta = { kind, unit };
    }

    public meta(): IDataSourceMeta {
        return this._meta;
    }

    public signal(_t: number): number {
        return this.amplitude;
    }
}
