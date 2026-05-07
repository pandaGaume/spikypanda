import { Voltage } from "spikypanda-core";
import { IDataSource, IDataSourceMeta } from "../../../../interfaces/DataSource";
import { PmsmSimulation } from "../PmsmSimulation";

// IDataSource adapter exposing the inverter DC bus voltage. Phase 1 :
// constant per scenario (the inverter holds a single vBus). Phase 2 may
// add a ripple model (rectifier ripple, brown-out scenarios), at which
// point this probe becomes informative for the dataset.
export class DcBusVoltageSource implements IDataSource {
    private readonly _host: PmsmSimulation;
    private readonly _meta: IDataSourceMeta;

    public constructor(host: PmsmSimulation) {
        this._host = host;
        this._meta = {
            kind: "pmsm.bus.voltage",
            unit: Voltage.Units.V,
            label: "PMSM inverter DC bus voltage",
            sampleRateHint: 10_000,
        };
    }

    public meta(): IDataSourceMeta {
        return this._meta;
    }

    public signal(t: number): number {
        this._host.advance(t);
        return this._host.inverter.vBus;
    }
}
