import { Current } from "spikypanda-core";
import { IDataSource, IDataSourceMeta } from "../../../../interfaces/DataSource";
import { PmsmSimulation } from "../PmsmSimulation";

// IDataSource adapter exposing one of the three stator phase currents
// (i_a, i_b, i_c). Computes from the machine's dq state at sampling time.
//
// The probe shares the host with sibling probes; signal(t) calls
// host.advance(t) which integrates the simulation lazily. Subsequent
// probes at the same t see the already-advanced state.
export class PhaseCurrentSource implements IDataSource {
    private readonly _host: PmsmSimulation;
    private readonly _phase: 0 | 1 | 2;
    private readonly _meta: IDataSourceMeta;

    public constructor(host: PmsmSimulation, phase: 0 | 1 | 2) {
        this._host = host;
        this._phase = phase;
        const phaseLabel = "abc"[phase];
        this._meta = {
            kind: `pmsm.current.phase.${phaseLabel}`,
            unit: Current.Units.amp,
            label: `PMSM stator current phase ${phaseLabel.toUpperCase()}`,
            fundamentalHz: host.fundamentalElectricalHz(),
            sampleRateHint: 20_000,
        };
    }

    public meta(): IDataSourceMeta {
        return this._meta;
    }

    public signal(t: number): number {
        this._host.advance(t);
        return this._host.machine.iAbc()[this._phase];
    }
}
