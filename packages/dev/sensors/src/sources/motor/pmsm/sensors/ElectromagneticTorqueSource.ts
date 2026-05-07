import { Dimensionless } from "spikypanda-core";
import { IDataSource, IDataSourceMeta } from "../../../../interfaces/DataSource";
import { PmsmSimulation } from "../PmsmSimulation";

// IDataSource adapter exposing the instantaneous electromagnetic torque
// of the machine. Useful for diagnostics (cogging / ripple analysis), as
// a calibration target during ground bench validation, and as a feature
// channel for some classification pipelines.
//
// Unit : N.m. spikypanda-core does not expose a Torque quantity yet; we
// flag the kind explicitly and use Dimensionless as a transitional unit.
// A real Torque quantity would replace this without changing the data
// pipeline.
export class ElectromagneticTorqueSource implements IDataSource {
    private readonly _host: PmsmSimulation;
    private readonly _meta: IDataSourceMeta;

    public constructor(host: PmsmSimulation) {
        this._host = host;
        this._meta = {
            kind: "pmsm.torque.em",
            unit: Dimensionless.Units.none,
            label: "PMSM electromagnetic torque (N.m)",
            fundamentalHz: host.fundamentalMechanicalHz(),
            sampleRateHint: 20_000,
        };
    }

    public meta(): IDataSourceMeta {
        return this._meta;
    }

    public signal(t: number): number {
        this._host.advance(t);
        return this._host.machine.electromagneticTorque();
    }
}
