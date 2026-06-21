import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Speed PI controller for a BLDC drive — same PI law as the DC variant
 * but the output is a dutyCycle cycle [0..1] instead of a raw voltage, and
 * the saturation is also normalized:
 *
 *     duty_cmd = clamp(proportionalGain · error + integral, -maxDutyCycle, +maxDutyCycle)
 *
 * Used in pair with the 6-step inverter (which multiplies dutyCycle by
 * dcBusVoltage to produce the line-to-neutral voltages).
 *
 * Negative dutyCycle reverses the commutation order — the inverter handles
 * the sign directly.
 */
export class BldcSpeedPiNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _proportionalGain: number = 0.005;
    @cloneable private _integralGain: number = 0.05;
    @cloneable private _maxDutyCycle: number = 1;

    @cloneable private _integral: number = 0;
    @cloneable private _duty: number = 0;
    private _lastT: number = -1;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "angularVelocityReference", optional: true, type: "float" },
        { slot: "measuredAngularVelocity", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "dutyCycle", optional: false, type: "float" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get proportionalGain(): number {
        return this._proportionalGain;
    }
    public set proportionalGain(v: number) {
        this.setField("proportionalGain", this._proportionalGain, v, (n) => {
            this._proportionalGain = n;
        });
    }
    @editable("number") public get integralGain(): number {
        return this._integralGain;
    }
    public set integralGain(v: number) {
        this.setField("integralGain", this._integralGain, v, (n) => {
            this._integralGain = n;
        });
    }
    @editable("number") public get maxDutyCycle(): number {
        return this._maxDutyCycle;
    }
    public set maxDutyCycle(v: number) {
        this.setField("maxDutyCycle", this._maxDutyCycle, v, (n) => {
            this._maxDutyCycle = n;
        });
    }

    @viewable("number") public get integral(): number {
        return this._integral;
    }
    @viewable("number") public get dutyCycle(): number {
        return this._duty;
    }

    public override reset(_session: ISession): void {
        this.setField("integral", this._integral, 0, (n) => {
            this._integral = n;
        });
        this.setField("dutyCycle", this._duty, 0, (n) => {
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
            if (slot === "angularVelocityReference") omegaRef = value;
            else if (slot === "measuredAngularVelocity") omegaMeasured = value;
            else if (slot === "dt") dt = value;
        }
        if (dt < 0) dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        this._lastT = t;

        const error = omegaRef - omegaMeasured;
        const proposed = this._integral + this._integralGain * error * dt;
        const dutyUnsat = this._proportionalGain * error + proposed;

        let dutyCycle = dutyUnsat;
        let newIntegral = this._integral;
        if (dutyUnsat > this._maxDutyCycle) {
            dutyCycle = this._maxDutyCycle;
        } else if (dutyUnsat < -this._maxDutyCycle) {
            dutyCycle = -this._maxDutyCycle;
        } else {
            newIntegral = proposed;
        }

        this.setField("integral", this._integral, newIntegral, (n) => {
            this._integral = n;
        });
        this.setField("dutyCycle", this._duty, dutyCycle, (n) => {
            this._duty = n;
        });

        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "dutyCycle" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, dutyCycle);
        }
    }
}

export function createBldcSpeedPiNode(): BldcSpeedPiNode {
    return new BldcSpeedPiNode();
}
