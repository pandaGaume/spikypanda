import { Acceleration } from "spikypanda-core";
import { IDataSource, IDataSourceMeta } from "../../../../interfaces/DataSource";
import { PmsmSimulation } from "../PmsmSimulation";

// IDataSource adapter exposing one axis of the housing acceleration, as
// measured by an ADXL355-class accelerometer mounted on the bracket.
// Units : m/s^2. Sample rate hint : 4 kHz, matching the proposal section
// 4.2 ADXL355 channel.
export class VibrationAxisSource implements IDataSource {
    private readonly _host: PmsmSimulation;
    private readonly _axis: 0 | 1 | 2;
    private readonly _meta: IDataSourceMeta;

    public constructor(host: PmsmSimulation, axis: 0 | 1 | 2) {
        this._host = host;
        this._axis = axis;
        const axisLabel = "xyz"[axis];
        this._meta = {
            kind: `pmsm.vibration.${axisLabel}`,
            unit: Acceleration.Units.mps2,
            label: `PMSM housing vibration axis ${axisLabel.toUpperCase()}`,
            fundamentalHz: host.fundamentalMechanicalHz(),
            sampleRateHint: 4_000,
        };
    }

    public meta(): IDataSourceMeta {
        return this._meta;
    }

    public signal(t: number): number {
        this._host.advance(t);
        return this._host.housing.acceleration(this._axis);
    }
}
