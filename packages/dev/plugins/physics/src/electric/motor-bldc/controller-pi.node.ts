import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Speed PI controller for a BLDC drive — same PI law as the DC variant
 * but the output is a duty cycle [0..1] instead of a raw voltage, and
 * the saturation is also normalized:
 *
 *     duty_cmd = clamp(Kp · error + integral, -dutyMax, +dutyMax)
 *
 * Used in pair with the 6-step inverter (which multiplies duty by
 * V_dc to produce the line-to-neutral voltages).
 *
 * Negative duty reverses the commutation order — the inverter handles
 * the sign directly.
 */
export class BldcSpeedPiNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _Kp: number = 0.005;
    @cloneable private _Ki: number = 0.05;
    @cloneable private _dutyMax: number = 1;

    @cloneable private _integral: number = 0;
    @cloneable private _duty: number = 0;
    private _lastT: number = -1;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "omega_ref", optional: true, type: "float" },
        { slot: "omega_measured", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "duty", optional: false, type: "float" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get Kp(): number {
        return this._Kp;
    }
    public set Kp(v: number) {
        this.setField("Kp", this._Kp, v, (n) => {
            this._Kp = n;
        });
    }
    @editable("number") public get Ki(): number {
        return this._Ki;
    }
    public set Ki(v: number) {
        this.setField("Ki", this._Ki, v, (n) => {
            this._Ki = n;
        });
    }
    @editable("number") public get dutyMax(): number {
        return this._dutyMax;
    }
    public set dutyMax(v: number) {
        this.setField("dutyMax", this._dutyMax, v, (n) => {
            this._dutyMax = n;
        });
    }

    @viewable("number") public get integral(): number {
        return this._integral;
    }
    @viewable("number") public get duty(): number {
        return this._duty;
    }

    public override reset(_session: ISession): void {
        this.setField("integral", this._integral, 0, (n) => {
            this._integral = n;
        });
        this.setField("duty", this._duty, 0, (n) => {
            this._duty = n;
        });
        this._lastT = -1;
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let omegaRef = 0,
            omegaMeasured = 0,
            dt = -1;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "omega_ref") omegaRef = value;
            else if (slot === "omega_measured") omegaMeasured = value;
            else if (slot === "dt") dt = value;
        }
        if (dt < 0) dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        this._lastT = t;

        const error = omegaRef - omegaMeasured;
        const proposed = this._integral + this._Ki * error * dt;
        const dutyUnsat = this._Kp * error + proposed;

        let duty = dutyUnsat;
        let newIntegral = this._integral;
        if (dutyUnsat > this._dutyMax) {
            duty = this._dutyMax;
        } else if (dutyUnsat < -this._dutyMax) {
            duty = -this._dutyMax;
        } else {
            newIntegral = proposed;
        }

        this.setField("integral", this._integral, newIntegral, (n) => {
            this._integral = n;
        });
        this.setField("duty", this._duty, duty, (n) => {
            this._duty = n;
        });

        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "duty" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, duty);
        }
    }
}

export function createBldcSpeedPiNode(): BldcSpeedPiNode {
    return new BldcSpeedPiNode();
}
