import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Current PI controller for a DC motor — the inner loop of a
 * cascade current-then-speed control architecture (standard
 * industrial drive topology). Sits between an upstream `currentReference`
 * source (slider, outer speed loop output, ...) and the PWM
 * inverter that drives the motor.
 *
 *     error = currentReference - measuredCurrent
 *     V_unsat = proportionalGain · error + integral
 *     voltageCommand   = clamp(V_unsat, -maxVoltage, +maxVoltage)
 *     integral += integralGain · error · dt   (frozen when voltageCommand is saturated)
 *
 * Same anti-windup pattern as the Speed PI. The CURRENT loop is
 * typically tuned MUCH faster than the speed loop:
 *
 *   - Speed loop:    bandwidth ~10-100 Hz (limited by rotorInertia·armatureResistance/(torqueConstant·backEmfConstant))
 *   - Current loop:  bandwidth ~500-5000 Hz (limited by armatureResistance/armatureInductance)
 *
 * Defaults below target ~1 kHz current loop on the RS-385 (τ_e =
 * armatureInductance/armatureResistance = 0.5 ms, achievable bandwidth ~300 Hz with a safety margin).
 *
 * All ports are signals: currentReference / measuredCurrent / voltageCommand are continuous
 * physical quantities (ZOH). No buffer overflow, no gating issue
 * with the upstream sampling rate.
 *
 * maxVoltage should typically equal the inverter's `dcBusVoltage` — saturating the
 * controller at the bus voltage matches what the PWM can actually
 * deliver. Mismatch → controller asks for armatureVoltage the inverter can't
 * produce, integral winds up uselessly.
 */
export class DcMotorCurrentPiNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _proportionalGain: number = 5;
    @cloneable private _integralGain: number = 200;
    @cloneable private _maxVoltage: number = 12;

    @cloneable private _integral: number = 0;
    @cloneable private _Vcmd: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "currentReference", optional: true, type: "float", kind: "signal" },
        { slot: "measuredCurrent", optional: true, type: "float", kind: "signal" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "voltageCommand", optional: false, type: "float", kind: "signal" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number")
    public get proportionalGain(): number {
        return this._proportionalGain;
    }
    public set proportionalGain(v: number) {
        this.setField("proportionalGain", this._proportionalGain, v, (n) => {
            this._proportionalGain = n;
        });
    }

    @editable("number")
    public get integralGain(): number {
        return this._integralGain;
    }
    public set integralGain(v: number) {
        this.setField("integralGain", this._integralGain, v, (n) => {
            this._integralGain = n;
        });
    }

    @editable("number", { unit: "armatureVoltage" })
    public get maxVoltage(): number {
        return this._maxVoltage;
    }
    public set maxVoltage(v: number) {
        const next = v > 0 ? v : 1;
        this.setField("maxVoltage", this._maxVoltage, next, (n) => {
            this._maxVoltage = n;
        });
    }

    @viewable("number") public get integral(): number {
        return this._integral;
    }
    @viewable("number") public get voltageCommand(): number {
        return this._Vcmd;
    }

    public override reset(_session: ISession): void {
        this.setField("integral", this._integral, 0, (n) => {
            this._integral = n;
        });
        this.setField("voltageCommand", this._Vcmd, 0, (n) => {
            this._Vcmd = n;
        });
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        let iRef = 0,
            iMeasured = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            const value = session.readSignal(idx);
            if (typeof value !== "number") continue;
            if (slot === "currentReference") iRef = value;
            else if (slot === "measuredCurrent") iMeasured = value;
        }

        const sessionDt = session.dt;
        const dt = Number.isFinite(sessionDt) ? Math.max(0, sessionDt) : 0;

        const error = iRef - iMeasured;
        const proposedIntegral = this._integral + this._integralGain * error * dt;
        const Vunsat = this._proportionalGain * error + proposedIntegral;

        let Vcmd = Vunsat;
        let newIntegral = this._integral;
        if (Vunsat > this._maxVoltage) {
            Vcmd = this._maxVoltage;
            // Anti-windup: freeze integral while saturated high.
        } else if (Vunsat < -this._maxVoltage) {
            Vcmd = -this._maxVoltage;
            // Freeze low.
        } else {
            newIntegral = proposedIntegral;
        }

        this.setField("integral", this._integral, newIntegral, (n) => {
            this._integral = n;
        });
        this.setField("voltageCommand", this._Vcmd, Vcmd, (n) => {
            this._Vcmd = n;
        });

        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "voltageCommand" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, Vcmd);
        }
    }
}

export function createDcMotorCurrentPiNode(): DcMotorCurrentPiNode {
    return new DcMotorCurrentPiNode();
}
