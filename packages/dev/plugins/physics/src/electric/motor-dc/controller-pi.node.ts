import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * PI speed controller for a DC motor (or any single-loop SISO system
 * with a velocity-like output). Implements the standard PI law with
 * a hard saturation on the output and a back-calculation anti-windup
 * (integral term frozen while the controller is saturated):
 *
 *     error = angularVelocityReference - measuredAngularVelocity
 *     V_unsat = proportionalGain · error + integral
 *     voltageCommand   = clamp(V_unsat, -V_max, +V_max)
 *     integral += integralGain · error · dt   (only if V_unsat == voltageCommand)
 *
 * Inputs (optional, default 0):
 *   angularVelocityReference      setpoint speed [rad/s]
 *   measuredAngularVelocity measured speed [rad/s] (typically from a Tachymeter)
 *   dt             control step [s] — falls back to `t - lastT` when unwired
 *
 * Output:
 *   voltageCommand          voltage command [armatureVoltage] (clamped to [-V_max, +V_max])
 *
 * State (integral) resets to 0 on session reset.
 */
export class DcMotorSpeedPiNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _proportionalGain: number = 0.5;
    @cloneable private _integralGain: number = 2.0;
    @cloneable private _maxVoltage: number = 24;

    @cloneable private _integral: number = 0;
    @cloneable private _Vcmd: number = 0;

    // Inputs and outputs are continuous signals (control setpoint,
    // measurement, command). No buffer, no overflow, no gating: the PI
    // fires every tick, reads the current angularVelocityReference / measuredAngularVelocity
    // via session.readSignal, computes voltageCommand, overwrites the voltageCommand
    // signal. ZOH semantic matches the discrete-time control
    // literature: at each sample instant the controller sees the
    // latest available values.
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "angularVelocityReference", optional: true, type: "float", kind: "signal" },
        { slot: "measuredAngularVelocity", optional: true, type: "float", kind: "signal" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "voltageCommand", optional: false, type: "float", kind: "signal" }];

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

    @editable("number") public get maxVoltage(): number {
        return this._maxVoltage;
    }
    public set maxVoltage(v: number) {
        this.setField("maxVoltage", this._maxVoltage, v, (n) => {
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

        let omegaRef = 0,
            omegaMeasured = 0;
        // Read signal inputs via session.readSignal — no drain, no
        // gating issue. Unpublished signals (e.g. before the first
        // tick) return undefined; we fall back to 0 for both.
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            const value = session.readSignal(idx);
            if (typeof value !== "number") continue;
            if (slot === "angularVelocityReference") omegaRef = value;
            else if (slot === "measuredAngularVelocity") omegaMeasured = value;
        }
        // dt now comes from the Session, not a wired port. First-tick
        // case (currentTick still pristine) returns Infinity → we clamp
        // to 0 so the integral term contributes nothing until a real
        // macro-step has happened.
        const sessionDt = session.dt;
        const dt = Number.isFinite(sessionDt) ? Math.max(0, sessionDt) : 0;

        const error = omegaRef - omegaMeasured;
        const proposedIntegral = this._integral + this._integralGain * error * dt;
        const Vunsat = this._proportionalGain * error + proposedIntegral;

        let Vcmd = Vunsat;
        let newIntegral = this._integral;
        if (Vunsat > this._maxVoltage) {
            Vcmd = this._maxVoltage;
            // Saturated high: freeze integral (back-calc anti-windup).
        } else if (Vunsat < -this._maxVoltage) {
            Vcmd = -this._maxVoltage;
            // Saturated low: freeze.
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

export function createDcMotorSpeedPiNode(): DcMotorSpeedPiNode {
    return new DcMotorSpeedPiNode();
}
