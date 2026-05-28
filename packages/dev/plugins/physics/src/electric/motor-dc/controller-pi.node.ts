import {
    cloneable, editable, viewable,
    IChannel, IDeclaresPorts, IOlink, IPortDescriptor,
    ISession, RuntimeNode, inSlotOf,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * PI speed controller for a DC motor (or any single-loop SISO system
 * with a velocity-like output). Implements the standard PI law with
 * a hard saturation on the output and a back-calculation anti-windup
 * (integral term frozen while the controller is saturated):
 *
 *     error = omega_ref - omega_measured
 *     V_unsat = Kp · error + integral
 *     V_cmd   = clamp(V_unsat, -V_max, +V_max)
 *     integral += Ki · error · dt   (only if V_unsat == V_cmd)
 *
 * Inputs (optional, default 0):
 *   omega_ref      setpoint speed [rad/s]
 *   omega_measured measured speed [rad/s] (typically from a Tachymeter)
 *   dt             control step [s] — falls back to `t - lastT` when unwired
 *
 * Output:
 *   V_cmd          voltage command [V] (clamped to [-V_max, +V_max])
 *
 * State (integral) resets to 0 on session reset.
 */
export class DcMotorSpeedPiNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _Kp:   number = 0.5;
    @cloneable private _Ki:   number = 2.0;
    @cloneable private _Vmax: number = 24;

    @cloneable private _integral: number = 0;
    @cloneable private _Vcmd:     number = 0;
    private _lastT: number = -1;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "omega_ref",      optional: true, type: "float" },
        { slot: "omega_measured", optional: true, type: "float" },
        { slot: "dt",             optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "V_cmd", optional: false, type: "float" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number") public get Kp(): number { return this._Kp; }
    public set Kp(v: number) { this.setField("Kp", this._Kp, v, (n) => { this._Kp = n; }); }

    @editable("number") public get Ki(): number { return this._Ki; }
    public set Ki(v: number) { this.setField("Ki", this._Ki, v, (n) => { this._Ki = n; }); }

    @editable("number") public get Vmax(): number { return this._Vmax; }
    public set Vmax(v: number) { this.setField("Vmax", this._Vmax, v, (n) => { this._Vmax = n; }); }

    @viewable("number") public get integral(): number { return this._integral; }
    @viewable("number") public get V_cmd(): number    { return this._Vcmd; }

    public override reset(_session: ISession): void {
        this.setField("integral", this._integral, 0, (n) => { this._integral = n; });
        this.setField("V_cmd",    this._Vcmd,     0, (n) => { this._Vcmd = n; });
        this._lastT = -1;
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        let omegaRef = 0, omegaMeasured = 0, dt = -1;
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
        if (dt < 0) {
            dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        }
        this._lastT = t;

        const error = omegaRef - omegaMeasured;
        const proposedIntegral = this._integral + this._Ki * error * dt;
        const Vunsat = this._Kp * error + proposedIntegral;

        let Vcmd = Vunsat;
        let newIntegral = this._integral;
        if (Vunsat > this._Vmax) {
            Vcmd = this._Vmax;
            // Saturated high: freeze integral (back-calc anti-windup).
        } else if (Vunsat < -this._Vmax) {
            Vcmd = -this._Vmax;
            // Saturated low: freeze.
        } else {
            newIntegral = proposedIntegral;
        }

        this.setField("integral", this._integral, newIntegral, (n) => { this._integral = n; });
        this.setField("V_cmd",    this._Vcmd,     Vcmd,        (n) => { this._Vcmd = n; });

        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "V_cmd" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, Vcmd);
        }
    }
}

export function createDcMotorSpeedPiNode(): DcMotorSpeedPiNode {
    return new DcMotorSpeedPiNode();
}
