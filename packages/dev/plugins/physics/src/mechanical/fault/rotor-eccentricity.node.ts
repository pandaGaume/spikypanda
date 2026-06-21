import { cloneable, editable, viewable, IFault, IFaultContext, IOlink, ISession, RuntimeNode } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Static air-gap eccentricity: a CAUSE of eccentricity (FMEA: cause -> state ->
 * consequence -> symptom). The rotor sits off the magnetic axis by a FIXED
 * fraction of the air gap, in a fixed spatial direction (manufacturing /
 * assembly offset) -- present even on a perfectly rigid, un-sagged rotor
 * (eccentricity ↛ sag).
 *
 * Linked to a motor by an `ApplyTo` relation, it reads `motor.airGap` (a
 * PROPERTY) + its own severity/direction and CONTRIBUTES a rotor radial
 * displacement to the motor's air-gap eccentricity STATE (`eccentricityY/Z`):
 *
 *   δ  = severity · motor.airGap                 (fractional gap eccentricity)
 *   δY = δ·cos(eccentricityPhase), δZ = δ·sin(eccentricityPhase)
 *
 * It does NOT compute flux or UMP: those are the motor's electromagnetic
 * consequences of the AGGREGATED eccentricity. Gravity-independent -- unlike
 * rotor sag, it does NOT vanish in micro-gravity.
 */
export class RotorEccentricityFaultNode extends RuntimeNode implements IFault {
    /** Ontology type, consulted by the target model's `acceptsFault`. */
    public readonly faultType: string = "eccentricity";

    @cloneable private _severity: number = 0; // [0, 1] fractional gap eccentricity
    @cloneable private _eccentricityPhase: number = 0; // spatial direction [rad]

    private _eccentricityY: number = 0;
    private _eccentricityZ: number = 0;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get severity(): number {
        return this._severity;
    }
    public set severity(v: number) {
        this.setField("severity", this._severity, v, (n) => (this._severity = n));
    }

    @editable("number", { unit: "rad" }) public get eccentricityPhase(): number {
        return this._eccentricityPhase;
    }
    public set eccentricityPhase(v: number) {
        this.setField("eccentricityPhase", this._eccentricityPhase, v, (n) => (this._eccentricityPhase = n));
    }

    @viewable("number") public get eccentricityY(): number {
        return this._eccentricityY;
    }
    @viewable("number") public get eccentricityZ(): number {
        return this._eccentricityZ;
    }

    public override reset(_session: ISession): void {
        this._eccentricityY = 0;
        this._eccentricityZ = 0;
    }

    /** Contribute the static eccentricity displacement to the linked motor. */
    public applyTo(target: unknown, _ctx: IFaultContext): void {
        const motor = target as { airGap?: number };
        const severity = this._severity < 0 ? 0 : this._severity > 1 ? 1 : this._severity;
        const delta = severity * (motor.airGap ?? 0); // fractional gap eccentricity
        this._eccentricityY = delta * Math.cos(this._eccentricityPhase);
        this._eccentricityZ = delta * Math.sin(this._eccentricityPhase);
        _ctx.accumulate("eccentricityY", this._eccentricityY);
        _ctx.accumulate("eccentricityZ", this._eccentricityZ);
    }
}

export function createRotorEccentricityFaultNode(): RotorEccentricityFaultNode {
    return new RotorEccentricityFaultNode();
}
