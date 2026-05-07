import { Current } from "spikypanda-core";
import { IDataSource, IDataSourceMeta } from "../../../../interfaces/DataSource";
import { PmsmSimulation } from "../PmsmSimulation";

// IDataSource adapter exposing one of the rotor frame currents (i_d, i_q).
// These are the controller's primary feedback variables and the natural
// place to read fault signatures that survive the orthogonal projection
// (D4 eccentricity, D3 inter-turn short).
export class DqCurrentSource implements IDataSource {
    private readonly _host: PmsmSimulation;
    private readonly _axis: "d" | "q";
    private readonly _meta: IDataSourceMeta;

    public constructor(host: PmsmSimulation, axis: "d" | "q") {
        this._host = host;
        this._axis = axis;
        this._meta = {
            kind: `pmsm.current.${axis}`,
            unit: Current.Units.amp,
            label: `PMSM rotor frame current i_${axis}`,
            fundamentalHz: host.fundamentalMechanicalHz(),
            sampleRateHint: 20_000,
        };
    }

    public meta(): IDataSourceMeta {
        return this._meta;
    }

    public signal(t: number): number {
        this._host.advance(t);
        return this._axis === "d" ? this._host.machine.iD : this._host.machine.iQ;
    }
}
