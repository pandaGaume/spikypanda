import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Current sensor — models a real-world Hall-effect current
 * transducer (typical: LEM HX-series, ACS712, allegro chips) used
 * on a DC drive's supply line for MCSA. Three imperfections every
 * MCSA analysis has to deal with:
 *
 *   1. **Bandwidth limit** (1st-order LPF at `bandwidthHz`). Default
 *      100 kHz — wide enough to preserve PWM harmonics (10 kHz
 *      typical) and their sidebands. Set to 0 to bypass (ideal
 *      ampèremètre, useful for design-time references).
 *
 *   2. **Gaussian noise** with standard deviation `noiseStd` [A].
 *      Models thermal noise + electromagnetic interference picked
 *      up by the sensor's analog signal chain. Determined seed
 *      → reproducible runs.
 *
 *   3. **Quantization** to multiples of `resolution` [A]. Models
 *      the ADC step of the acquisition system (typ. 12-bit @ ±10A
 *      → 4.88 mA step). Set to 0 to disable.
 *
 * Pipeline per tick:
 *     filtered = LPF(i, bandwidthHz)
 *     noisy    = filtered + N(0, noiseStd)
 *     measured = quantize(noisy, resolution)
 *
 * IMPORTANT for MCSA: set `bandwidthHz` well ABOVE your PWM
 * frequency (5× minimum). Otherwise the sensor filters out exactly
 * the harmonics you want to analyse — the PWM sidebands carrying
 * the fault signature.
 *
 * Mirror of the Tachymeter node but on current instead of speed.
 * Same signal-kind IO contract (ZOH, no buffer drama).
 */
export class DcMotorCurrentSensorNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _noiseStd: number = 0.01; // 10 mA gaussian
    @cloneable private _resolution: number = 0.005; // 5 mA ADC step
    @cloneable private _bandwidthHz: number = 100000; // 100 kHz, wide for MCSA
    @cloneable private _seed: number = 1;

    @cloneable private _filtered: number = 0;
    @cloneable private _measured: number = 0;
    private _rng: number = 1;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "i", optional: true, type: "float", kind: "signal" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "i_measured", optional: false, type: "float", kind: "signal" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number", { unit: "A" })
    public get noiseStd(): number {
        return this._noiseStd;
    }
    public set noiseStd(v: number) {
        const next = v >= 0 ? v : 0;
        this.setField("noiseStd", this._noiseStd, next, (n) => {
            this._noiseStd = n;
        });
    }

    @editable("number", { unit: "A" })
    public get resolution(): number {
        return this._resolution;
    }
    public set resolution(v: number) {
        const next = v >= 0 ? v : 0;
        this.setField("resolution", this._resolution, next, (n) => {
            this._resolution = n;
        });
    }

    @editable("number", { unit: "Hz" })
    public get bandwidthHz(): number {
        return this._bandwidthHz;
    }
    public set bandwidthHz(v: number) {
        const next = v >= 0 ? v : 0;
        this.setField("bandwidthHz", this._bandwidthHz, next, (n) => {
            this._bandwidthHz = n;
        });
    }

    @editable("number")
    public get seed(): number {
        return this._seed;
    }
    public set seed(v: number) {
        this.setField("seed", this._seed, v, (n) => {
            this._seed = n;
        });
    }

    @viewable("number") public get filtered(): number {
        return this._filtered;
    }
    @viewable("number") public get i_measured(): number {
        return this._measured;
    }

    public override reset(_session: ISession): void {
        this.setField("filtered", this._filtered, 0, (n) => {
            this._filtered = n;
        });
        this.setField("i_measured", this._measured, 0, (n) => {
            this._measured = n;
        });
        this._rng = Math.max(1, Math.floor(this._seed));
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        let i = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            const value = session.readSignal(idx);
            if (typeof value !== "number") continue;
            if (slot === "i") i = value;
        }

        const sessionDt = session.dt;
        const dt = Number.isFinite(sessionDt) ? Math.max(0, sessionDt) : 0;

        // 1st-order LPF. alpha = dt / (τ + dt); bandwidthHz==0 bypasses.
        let newFiltered = this._filtered;
        if (this._bandwidthHz <= 0) {
            newFiltered = i; // bypass
        } else if (dt > 0) {
            const tau = 1 / (2 * Math.PI * this._bandwidthHz);
            const alpha = dt / (tau + dt);
            newFiltered = this._filtered + alpha * (i - this._filtered);
        }

        const noise = this._noiseStd > 0 ? this._noiseStd * this._gaussian() : 0;
        let measured = newFiltered + noise;
        if (this._resolution > 0) {
            measured = Math.round(measured / this._resolution) * this._resolution;
        }

        this.setField("filtered", this._filtered, newFiltered, (n) => {
            this._filtered = n;
        });
        this.setField("i_measured", this._measured, measured, (n) => {
            this._measured = n;
        });

        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "i_measured" || !link.enabled) continue;
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

export function createDcMotorCurrentSensorNode(): DcMotorCurrentSensorNode {
    return new DcMotorCurrentSensorNode();
}
