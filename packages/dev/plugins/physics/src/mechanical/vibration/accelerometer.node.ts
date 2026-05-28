import {
    cloneable, editable, viewable,
    IChannel, IDeclaresPorts, IOlink, IPortDescriptor,
    ISession, RuntimeNode, inSlotOf,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Vibration accelerometer — generic transducer that filters its input
 * (a vibration "true value" channel from a fault/bearing/gear node)
 * with a 1st-order LPF, adds white Gaussian noise, and quantizes to a
 * fixed resolution. Functionally identical to the Tachymeter in
 * Motor.DC but in the mechanical-vibration domain (and so it carries
 * the `g` units convention in the parameter labels even though units
 * are not enforced).
 *
 * Same Box-Muller + LCG deterministic noise as Tachymeter.
 */
export class AccelerometerNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _noiseStd:    number = 0.001;
    @cloneable private _resolution:  number = 1e-4;
    @cloneable private _bandwidthHz: number = 2000;
    @cloneable private _seed:        number = 1;

    @cloneable private _filtered: number = 0;
    @cloneable private _measured: number = 0;
    private _rng:   number = 1;
    private _lastT: number = -1;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "vibration", optional: true, type: "float" },
        { slot: "dt",        optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "vibration_measured", optional: false, type: "float" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number") public get noiseStd(): number { return this._noiseStd; }
    public set noiseStd(v: number) { this.setField("noiseStd", this._noiseStd, v, (n) => { this._noiseStd = n; }); }
    @editable("number") public get resolution(): number { return this._resolution; }
    public set resolution(v: number) { this.setField("resolution", this._resolution, v, (n) => { this._resolution = n; }); }
    @editable("number") public get bandwidthHz(): number { return this._bandwidthHz; }
    public set bandwidthHz(v: number) { this.setField("bandwidthHz", this._bandwidthHz, v, (n) => { this._bandwidthHz = n; }); }
    @editable("number") public get seed(): number { return this._seed; }
    public set seed(v: number) { this.setField("seed", this._seed, v, (n) => { this._seed = n; }); }

    @viewable("number") public get vibration_measured(): number { return this._measured; }
    @viewable("number") public get filtered(): number           { return this._filtered; }

    public override reset(_session: ISession): void {
        this.setField("filtered",           this._filtered, 0, (n) => { this._filtered = n; });
        this.setField("vibration_measured", this._measured, 0, (n) => { this._measured = n; });
        this._rng = Math.max(1, Math.floor(this._seed));
        this._lastT = -1;
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let vib = 0, dt = -1;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if      (slot === "vibration") vib = value;
            else if (slot === "dt")        dt = value;
        }
        if (dt < 0) dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        this._lastT = t;

        let newFiltered = this._filtered;
        if (this._bandwidthHz <= 0) {
            newFiltered = vib;
        } else if (dt > 0) {
            const tau = 1 / (2 * Math.PI * this._bandwidthHz);
            const alpha = dt / (tau + dt);
            newFiltered = this._filtered + alpha * (vib - this._filtered);
        }

        const noise = this._noiseStd > 0 ? this._noiseStd * this._gaussian() : 0;
        let measured = newFiltered + noise;
        if (this._resolution > 0) {
            measured = Math.round(measured / this._resolution) * this._resolution;
        }

        this.setField("filtered",           this._filtered, newFiltered, (n) => { this._filtered = n; });
        this.setField("vibration_measured", this._measured, measured,    (n) => { this._measured = n; });
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "vibration_measured" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, measured);
        }
    }

    private _gaussian(): number {
        const u1 = Math.max(this._lcg(), 1e-12);
        const u2 = this._lcg();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    }
    private _lcg(): number {
        this._rng = (this._rng * 9301 + 49297) % 233280;
        return this._rng / 233280;
    }
}

export function createAccelerometerNode(): AccelerometerNode {
    return new AccelerometerNode();
}
