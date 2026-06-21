import { viewable, IFault, IFaultContext, IOlink, ISession, RuntimeNode } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Rotor sag: a CAUSE of air-gap eccentricity (FMEA: cause -> state ->
 * consequence -> symptom). Gravity bends the shaft, so the rotor centre is
 * displaced along the gravity radial direction by
 *
 *   δ = motor.rotorMass · g_radial / motor.bearingRadialStiffness
 *
 * Linked to a motor by an `ApplyTo` relation, this fault reads the motor's mass
 * + bearing stiffness (PROPERTIES) and the scene-latent body gravity (`ctx`) and
 * CONTRIBUTES that displacement to the motor's air-gap eccentricity STATE
 * (`eccentricityY/Z`, body radial plane). It does NOT compute flux or UMP: those
 * are the MOTOR's electromagnetic consequences of the aggregated eccentricity.
 *
 * Vanishes in micro-gravity (g→0 -> δ=0) and when the shaft is vertical
 * (g_radial=0). One cause among several (static / dynamic eccentricity, bearing
 * wear, thermal bow) that feed the same eccentricity state; eccentricity ↛ sag
 * (a rigid rotor can be eccentric with no sag at all).
 */
export class RotorSagFaultNode extends RuntimeNode implements IFault {
    /** Ontology type, consulted by the target model's `acceptsFault`. */
    public readonly faultType: string = "rotorSag";

    private _eccentricityY: number = 0; // contributed rotor displacement, body Y [m]
    private _eccentricityZ: number = 0; // contributed rotor displacement, body Z [m]

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
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

    /** Contribute the gravity-sag rotor displacement to the linked motor model. */
    public applyTo(target: unknown, ctx: IFaultContext): void {
        const motor = target as { rotorMass?: number; bearingRadialStiffness?: number };
        const g = ctx.bodyGravity;
        const kRadial = motor.bearingRadialStiffness ?? 0;
        if (!g || kRadial <= 0) {
            this._eccentricityY = 0;
            this._eccentricityZ = 0;
            return;
        }
        // Displacement = rotorMass · g_radial / k, ALONG the gravity radial
        // direction; (g.y, g.z) are the body-frame radial gravity components, so
        // δY = rotorMass·g.y/k and δZ = rotorMass·g.z/k carry both magnitude and
        // direction in one step.
        const rotorMass = motor.rotorMass ?? 0;
        this._eccentricityY = (rotorMass * g.y) / kRadial;
        this._eccentricityZ = (rotorMass * g.z) / kRadial;
        ctx.accumulate("eccentricityY", this._eccentricityY);
        ctx.accumulate("eccentricityZ", this._eccentricityZ);
    }
}

export function createRotorSagFaultNode(): RotorSagFaultNode {
    return new RotorSagFaultNode();
}
