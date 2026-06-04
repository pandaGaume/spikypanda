import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Tachymeter (analog angular-speed sensor) — models a real-world
 * velocity feedback transducer with three imperfections that any
 * decent control loop has to live with:
 *
 *   1. **Bandwidth limit**: 1st-order low-pass filter at `bandwidthHz`.
 *      Set to 0 to bypass. τ = 1 / (2π·fc).
 *   2. **Gaussian noise**: zero-mean with standard deviation `noiseStd`
 *      [rad/s]. Set to 0 to disable. Deterministic via a seeded LCG +
 *      Box-Muller transform, so reproducible across runs.
 *   3. **Quantization**: round to multiples of `resolution` [rad/s].
 *      Set to 0 to disable.
 *
 * Pipeline applied in this order each tick:
 *
 *     filtered = LPF(omega, bandwidthHz)
 *     noisy    = filtered + N(0, noiseStd)
 *     measured = quantize(noisy, resolution)
 *
 * Inputs:
 *   omega    raw angular speed (typically from a motor model)
 *   dt       sample step [s], falls back to `t - lastT` when unwired
 *
 * Output:
 *   omega_measured  filtered + noisy + quantized speed
 */
export class DcMotorTachymeterNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _noiseStd: number = 0.5; // [rad/s]
    @cloneable private _resolution: number = 0.1; // [rad/s] (0 = disabled)
    @cloneable private _bandwidthHz: number = 100; // [Hz]   (0 = bypass LPF)
    @cloneable private _seed: number = 1;

    @cloneable private _filtered: number = 0;
    @cloneable private _measured: number = 0;
    private _rng: number = 1;

    // Continuous-signal input (motor angular speed) and output
    // (filtered/noisy/quantized observation). Reads the upstream
    // signal via session.readSignal at each fire; the LPF state is
    // internal and updates per tick using session.dt for the
    // discretisation. No buffer / no consume needed — ZOH applies
    // naturally at the sample instants of this node's fire.
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "omega", optional: true, type: "float", kind: "signal" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "omega_measured", optional: false, type: "float", kind: "signal" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get noiseStd(): number {
        return this._noiseStd;
    }
    public set noiseStd(v: number) {
        this.setField("noiseStd", this._noiseStd, v, (n) => {
            this._noiseStd = n;
        });
    }

    @editable("number") public get resolution(): number {
        return this._resolution;
    }
    public set resolution(v: number) {
        this.setField("resolution", this._resolution, v, (n) => {
            this._resolution = n;
        });
    }

    @editable("number") public get bandwidthHz(): number {
        return this._bandwidthHz;
    }
    public set bandwidthHz(v: number) {
        this.setField("bandwidthHz", this._bandwidthHz, v, (n) => {
            this._bandwidthHz = n;
        });
    }

    @editable("number") public get seed(): number {
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
    @viewable("number") public get omega_measured(): number {
        return this._measured;
    }

    public override reset(_session: ISession): void {
        this.setField("filtered", this._filtered, 0, (n) => {
            this._filtered = n;
        });
        this.setField("omega_measured", this._measured, 0, (n) => {
            this._measured = n;
        });
        this._rng = Math.max(1, Math.floor(this._seed));
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Read omega via signal API (ZOH). No drain, no gating: the
        // upstream motor publishes the latest value each tick; we
        // sample whatever is current when we fire.
        let omega = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            const value = session.readSignal(idx);
            if (typeof value !== "number") continue;
            if (slot === "omega") omega = value;
        }
        // dt sourced from the Session — no more `dt` input port. First
        // tick (Session.dt === Infinity) clamps to 0 so the LPF doesn't
        // overshoot before a real macro-step has happened.
        const sessionDt = session.dt;
        const dt = Number.isFinite(sessionDt) ? Math.max(0, sessionDt) : 0;

        // 1st-order LPF. alpha = dt/(τ+dt), clamped so a large dt collapses
        // to passthrough rather than overshooting (alpha would exceed 1).
        let newFiltered = this._filtered;
        if (this._bandwidthHz <= 0) {
            newFiltered = omega; // bypass
        } else if (dt > 0) {
            const tau = 1 / (2 * Math.PI * this._bandwidthHz);
            const alpha = dt / (tau + dt); // implicit Euler, always in [0,1]
            newFiltered = this._filtered + alpha * (omega - this._filtered);
        }

        const noise = this._noiseStd > 0 ? this._noiseStd * this._gaussian() : 0;
        let measured = newFiltered + noise;
        if (this._resolution > 0) {
            measured = Math.round(measured / this._resolution) * this._resolution;
        }

        this.setField("filtered", this._filtered, newFiltered, (n) => {
            this._filtered = n;
        });
        this.setField("omega_measured", this._measured, measured, (n) => {
            this._measured = n;
        });

        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "omega_measured" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, measured);
        }
    }

    // ── Deterministic Gaussian via Box-Muller + seeded LCG ─────────────
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

export function createDcMotorTachymeterNode(): DcMotorTachymeterNode {
    return new DcMotorTachymeterNode();
}
