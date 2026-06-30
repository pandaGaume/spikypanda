import { cloneable, editable, viewable, IDeclaresPorts, IFault, IFaultContext, IOlink, IPortDescriptor, ISession, RuntimeNode } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/** A fault operator's apply point (see RotorSag): a `fault`-typed output the
 *  editor + loader turn into an `ApplyTo` structural link onto a model's fault_N. */
const APPLY_TO_OUTPUT_PORTS: ReadonlyArray<IPortDescriptor> = [{ slot: "applyTo", optional: false, type: "fault" }];

/**
 * Rotor imbalance: a mechanical CAUSE (FMEA: cause -> state -> consequence ->
 * symptom).
 *
 * IMBALANCE (mass-distribution defect):
 *   - the rotor centre of gravity is offset from the rotation axis;
 *   - the rotor stays GEOMETRICALLY CENTRED in the stator -> the air gap stays
 *     SYMMETRIC -> NO unbalanced magnetic pull (UMP) generated directly, and NO
 *     significant flux change FROM THE FAULT ITSELF;
 *   - signature: a rotating centrifugal force `F = m·e·ω²`, mainly observable in
 *     VIBRATION at 1x RPM, with NO current signature.
 * Contrast with ECCENTRICITY (sag / poor centring / bent shaft): a geometric
 * POSITION defect -> asymmetric air gap -> UMP + flux distribution change ->
 * signature in BOTH vibration AND current. Diagnostic sorting rule:
 *   - 1x vibration, NO current signature -> suspect imbalance first;
 *   - 1x vibration + current harmonics/sidebands -> suspect eccentricity.
 *
 * GRAVITY NUANCE (`gravityCoupling`, off by default): the offset CG is also a
 * gravity pendulum. As it spins, gravity lifts then drops the heavy spot, a 1x
 * braking-torque ripple m·r·g_radial·sin(angle - g_angle). Because the
 * centrifugal force is purely radial (no shaft torque), this ripple is a PURE
 * gravity SIGNATURE in the current, readable at any speed; it vanishes in
 * microgravity (g_radial -> 0) and peaks for a horizontal shaft. This is the
 * mechanism by which a balanced-looking machine still leaks its 1g orientation
 * into the current spectrum (study: gravity is observable on a loaded turbine).
 *
 * NONLINEAR NUANCE (off by default = normal diagnostic conditions): a STRONG
 * imbalance dynamically DEFLECTS the shaft; if the deflection is large enough
 * the rotor is no longer centred while spinning and a DYNAMIC eccentricity
 * appears (balourd -> dynamic rotor displacement -> dynamic eccentricity -> UMP).
 * Enable `dynamicEccentricityCoupling` to model it: the imbalance then ALSO
 * contributes a rotating eccentricity = F / motor.bearingRadialStiffness, which
 * the motor turns into a (small) UMP + current signature.
 *
 * Linked to a motor by an `ApplyTo` relation, it reads the residual unbalance
 * product m·r = motor.rotorMass · motor.comOffset (PROPERTIES) + the rotor
 * angle/speed, and CONTRIBUTES a rotating radial FORCE (`radialForceY/Z`). The
 * motor adds it to the UMP (from the air-gap eccentricity) before sending the
 * total to the housing: the two forces VECTOR-sum, so a rotating imbalance can
 * ADD to or MASK the eccentricity UMP in the vibration. The current (flux) is
 * driven by the eccentricity alone (unless the nonlinear coupling is on).
 *
 *   m·r            = severity · motor.rotorMass · motor.comOffset
 *   F              = m·r · ω²
 *   angle          = motor.rotorAngle + phaseOffset            (1x, the heavy spot)
 *   radialForceY/Z = F · cos/sin(angle)
 */
export class RotorImbalanceFaultNode extends RuntimeNode implements IFault, IDeclaresPorts {
    /** Ontology type, consulted by the target model's `acceptsFault`. */
    public readonly faultType: string = "imbalance";

    /** No data inputs; one `fault`-typed apply output (the ApplyTo source). */
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = APPLY_TO_OUTPUT_PORTS;

    @cloneable private _severity: number = 1; // scales the residual unbalance product
    @cloneable private _phaseOffset: number = 0; // heavy-spot phase vs the rotor angle [rad]
    @cloneable private _dynamicEccentricityCoupling: boolean = false; // strong-imbalance -> dynamic eccentricity
    @cloneable private _gravityCoupling: boolean = false; // heavy-spot weight -> 1x torque ripple (gravity signature)

    private _forceY: number = 0;
    private _forceZ: number = 0;
    private _gravityTorque: number = 0;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get severity(): number {
        return this._severity;
    }
    public set severity(v: number) {
        this.setField("severity", this._severity, v, (n) => (this._severity = n));
    }

    @editable("number", { unit: "rad" }) public get phaseOffset(): number {
        return this._phaseOffset;
    }
    public set phaseOffset(v: number) {
        this.setField("phaseOffset", this._phaseOffset, v, (n) => (this._phaseOffset = n));
    }

    @editable("boolean") public get dynamicEccentricityCoupling(): boolean {
        return this._dynamicEccentricityCoupling;
    }
    public set dynamicEccentricityCoupling(v: boolean) {
        this.setField("dynamicEccentricityCoupling", this._dynamicEccentricityCoupling, v, (n) => (this._dynamicEccentricityCoupling = n));
    }

    /** When on AND the target's scene gravity is available (ctx.bodyGravity), the
     *  offset CG is also a gravity pendulum: as it spins, gravity alternately
     *  lifts and drops the heavy spot, a 1x torque ripple m·r·g_radial·sin that
     *  the motor must fight. Because the centrifugal force is purely radial (no
     *  shaft torque), this ripple is a PURE gravity signature in the current,
     *  readable at any speed, -> 0 in microgravity, max for a horizontal shaft. */
    @editable("boolean") public get gravityCoupling(): boolean {
        return this._gravityCoupling;
    }
    public set gravityCoupling(v: boolean) {
        this.setField("gravityCoupling", this._gravityCoupling, v, (n) => (this._gravityCoupling = n));
    }

    @viewable("number") public get forceY(): number {
        return this._forceY;
    }
    @viewable("number") public get forceZ(): number {
        return this._forceZ;
    }
    /** The 1x gravity torque ripple on the shaft (0 without gravity coupling). */
    @viewable("number", { unit: "N.m" }) public get gravityTorque(): number {
        return this._gravityTorque;
    }

    public override reset(_session: ISession): void {
        this._forceY = 0;
        this._forceZ = 0;
        this._gravityTorque = 0;
    }

    /** Contribute the rotating centripetal imbalance force to the linked motor. */
    public applyTo(target: unknown, ctx: IFaultContext): void {
        const motor = target as { rotorMass?: number; comOffset?: number; angularVelocity?: number; rotorAngle?: number; bearingRadialStiffness?: number };
        const unbalanceProduct = this._severity * (motor.rotorMass ?? 0) * (motor.comOffset ?? 0); // m·r [kg·m]
        const angularVelocity = motor.angularVelocity ?? 0;
        const force = unbalanceProduct * angularVelocity * angularVelocity; // centripetal, grows with ω²
        const angle = (motor.rotorAngle ?? 0) + this._phaseOffset;
        this._forceY = force * Math.cos(angle);
        this._forceZ = force * Math.sin(angle);
        ctx.accumulate("radialForceY", this._forceY);
        ctx.accumulate("radialForceZ", this._forceZ);

        // Gravity acts on the offset CG: a 1x braking-torque RIPPLE (the heavy
        // spot is lifted on the way up, dropped on the way down), zero mean over
        // a turn. tau = (m·r)·g_radial·sin(angle - g_angle). This is the gravity
        // SIGNATURE in the current (no centrifugal competitor in the torque
        // channel); it vanishes in microgravity (g_radial -> 0) and peaks for a
        // horizontal shaft. The target turns "tau" into the integrated load.
        if (this._gravityCoupling && ctx.bodyGravity) {
            const g = ctx.bodyGravity;
            const gRadial = Math.sqrt(g.y * g.y + g.z * g.z);
            const gAngle = Math.atan2(g.z, g.y);
            this._gravityTorque = unbalanceProduct * gRadial * Math.sin(angle - gAngle);
            ctx.accumulate("tau", this._gravityTorque);
        } else {
            this._gravityTorque = 0;
        }

        // Nonlinear nuance: a strong imbalance deflects the shaft, so the rotor
        // is no longer centred while spinning -> a DYNAMIC eccentricity (rotating
        // with the imbalance) = force / bearing stiffness. Off by default (normal
        // diagnostic conditions treat imbalance and eccentricity as distinct).
        if (this._dynamicEccentricityCoupling) {
            const kRadial = motor.bearingRadialStiffness ?? 0;
            if (kRadial > 0) {
                ctx.accumulate("eccentricityY", this._forceY / kRadial);
                ctx.accumulate("eccentricityZ", this._forceZ / kRadial);
            }
        }
    }
}

export function createRotorImbalanceFaultNode(): RotorImbalanceFaultNode {
    return new RotorImbalanceFaultNode();
}
