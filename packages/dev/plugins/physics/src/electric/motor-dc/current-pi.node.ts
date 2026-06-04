import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Current PI controller for a DC motor — the inner loop of a
 * cascade current-then-speed control architecture (standard
 * industrial drive topology). Sits between an upstream `i_ref`
 * source (slider, outer speed loop output, ...) and the PWM
 * inverter that drives the motor.
 *
 *     error = i_ref - i_measured
 *     V_unsat = Kp · error + integral
 *     V_cmd   = clamp(V_unsat, -Vmax, +Vmax)
 *     integral += Ki · error · dt   (frozen when V_cmd is saturated)
 *
 * Same anti-windup pattern as the Speed PI. The CURRENT loop is
 * typically tuned MUCH faster than the speed loop:
 *
 *   - Speed loop:    bandwidth ~10-100 Hz (limited by J·R/(Kt·Ke))
 *   - Current loop:  bandwidth ~500-5000 Hz (limited by R/L)
 *
 * Defaults below target ~1 kHz current loop on the RS-385 (τ_e =
 * L/R = 0.5 ms, achievable bandwidth ~300 Hz with a safety margin).
 *
 * All ports are signals: i_ref / i_measured / V_cmd are continuous
 * physical quantities (ZOH). No buffer overflow, no gating issue
 * with the upstream sampling rate.
 *
 * Vmax should typically equal the inverter's `Vdc` — saturating the
 * controller at the bus voltage matches what the PWM can actually
 * deliver. Mismatch → controller asks for V the inverter can't
 * produce, integral winds up uselessly.
 */
export class DcMotorCurrentPiNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _Kp: number = 5;
    @cloneable private _Ki: number = 200;
    @cloneable private _Vmax: number = 12;

    @cloneable private _integral: number = 0;
    @cloneable private _Vcmd: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "i_ref", optional: true, type: "float", kind: "signal" },
        { slot: "i_measured", optional: true, type: "float", kind: "signal" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "V_cmd", optional: false, type: "float", kind: "signal" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number")
    public get Kp(): number {
        return this._Kp;
    }
    public set Kp(v: number) {
        this.setField("Kp", this._Kp, v, (n) => {
            this._Kp = n;
        });
    }

    @editable("number")
    public get Ki(): number {
        return this._Ki;
    }
    public set Ki(v: number) {
        this.setField("Ki", this._Ki, v, (n) => {
            this._Ki = n;
        });
    }

    @editable("number", { unit: "V" })
    public get Vmax(): number {
        return this._Vmax;
    }
    public set Vmax(v: number) {
        const next = v > 0 ? v : 1;
        this.setField("Vmax", this._Vmax, next, (n) => {
            this._Vmax = n;
        });
    }

    @viewable("number") public get integral(): number {
        return this._integral;
    }
    @viewable("number") public get V_cmd(): number {
        return this._Vcmd;
    }

    public override reset(_session: ISession): void {
        this.setField("integral", this._integral, 0, (n) => {
            this._integral = n;
        });
        this.setField("V_cmd", this._Vcmd, 0, (n) => {
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
            if (slot === "i_ref") iRef = value;
            else if (slot === "i_measured") iMeasured = value;
        }

        const sessionDt = session.dt;
        const dt = Number.isFinite(sessionDt) ? Math.max(0, sessionDt) : 0;

        const error = iRef - iMeasured;
        const proposedIntegral = this._integral + this._Ki * error * dt;
        const Vunsat = this._Kp * error + proposedIntegral;

        let Vcmd = Vunsat;
        let newIntegral = this._integral;
        if (Vunsat > this._Vmax) {
            Vcmd = this._Vmax;
            // Anti-windup: freeze integral while saturated high.
        } else if (Vunsat < -this._Vmax) {
            Vcmd = -this._Vmax;
            // Freeze low.
        } else {
            newIntegral = proposedIntegral;
        }

        this.setField("integral", this._integral, newIntegral, (n) => {
            this._integral = n;
        });
        this.setField("V_cmd", this._Vcmd, Vcmd, (n) => {
            this._Vcmd = n;
        });

        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "V_cmd" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, Vcmd);
        }
    }
}

export function createDcMotorCurrentPiNode(): DcMotorCurrentPiNode {
    return new DcMotorCurrentPiNode();
}
