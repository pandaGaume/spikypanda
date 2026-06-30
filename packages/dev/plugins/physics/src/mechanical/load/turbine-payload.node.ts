import { cloneable, editable, viewable, FaultableNode, IChannel, IDeclaresPorts, IPortDescriptor, ISession, TransformNode, inSlotOf } from "spikypanda-core";
import type { IFault, IFaultContext, IOlink, ICartesian, Nullable } from "spikypanda-core";

/**
 * Turbine / scrubber payload: the rotating aerodynamic load a motor drives, AND
 * a fault COMPOSER.
 *
 * A centrifugal scrubber / fan presents an aerodynamic load that grows with the
 * square of speed (fan law): tau_aero = k * omega^2. This node IS that load, but
 * it is also where the rotating-machinery faults live: imbalance and
 * eccentricity operators are applied to THE TURBINE (its `fault_N` bank), not to
 * the motor. Each fault reads the turbine's OWN mass / geometry + the scene
 * gravity (this node is scene-aware, so the `IFaultContext.bodyGravity` it hands
 * the operators is the turbine's), and accumulates its effect. The turbine then
 * adds its fan-law load and its payload weight and FORWARDS the composed sum to
 * the motor as a single fault operator (its own `applyTo`, wired
 * turbine.applyTo -> motor.fault_0):
 *
 *     imbalance ─┐
 *     eccentricity ─┼─► [ turbine: payload mass + geometry + scene gravity ] ─► motor.fault_0
 *     scene (g) ─┘            fan law k*omega^2  +  payload weight
 *
 * Why gravity matters here: on a loaded turbine the imbalance's offset CG is a
 * gravity pendulum (a 1x torque ripple in the CURRENT, no centrifugal competitor
 * in the torque channel), and the payload weight is a static bearing load. Both
 * scale with gravity (-> 0 in microgravity) and orientation (horizontal shaft =
 * max), so the turbine is the natural place to read gravity into the signatures.
 *
 * It duck-types as a "rotor" so the EXISTING fault operators read it unchanged:
 * rotorMass / comOffset / comPhase / angularVelocity / rotorAngle / airGap /
 * bearingRadialStiffness. Speed is fed back from the motor (one-tick Z^-1) and
 * the turbine integrates its own shaft angle from it.
 */
export class TurbinePayloadNode extends FaultableNode implements IFault, IDeclaresPorts {
    /** Ontology type, consulted by a target model's `acceptsFault`. */
    public readonly faultType: string = "turbine";

    @cloneable private _payloadMass: number = 0.05; // impeller mass [kg] (= rotorMass for the faults)
    @cloneable private _unbalanceRadius: number = 0.02; // CG offset [m] (= comOffset)
    @cloneable private _comPhase: number = 0; // heavy-spot phase [rad]
    @cloneable private _fanCoefficient: number = 1.5e-8; // aero load k [N.m.s^2/rad^2]: tau = k*omega^2
    @cloneable private _airGap: number = 0.3e-3; // [m], read by eccentricity faults
    @cloneable private _bearingRadialStiffness: number = 1e6; // [N/m], read by eccentricity faults
    @cloneable private _includePayloadWeight: boolean = true; // static bearing weight m*g

    private _omega: number = 0;
    private _rotorAngle: number = 0;
    private _tauAero: number = 0;
    private _lastT: number = -1;

    // ── Duck-typed rotor properties the applied fault operators read ──────
    // (comPhase / airGap / bearingRadialStiffness double as @editable below.)
    public get rotorMass(): number {
        return this._payloadMass;
    }
    public get comOffset(): number {
        return this._unbalanceRadius;
    }
    public get angularVelocity(): number {
        return this._omega;
    }
    public get rotorAngle(): number {
        return this._rotorAngle;
    }

    public override readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        ...FaultableNode.BASE_INPUT_PORTS, // transform (local, parentWorld) + fault_0
        { slot: "angularVelocity", optional: true, type: "float" }, // motor speed, fed back (Z^-1)
    ];
    public override readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...TransformNode.TRANSFORM_OUTPUT_PORTS, // world
        { slot: "applyTo", optional: false, type: "fault" }, // -> motor.fault_0 (the composed fault)
        { slot: "loadTorque", optional: false, type: "float" }, // the aero load, for observation
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
    @editable("number", { unit: "kg" }) public get payloadMass(): number {
        return this._payloadMass;
    }
    public set payloadMass(v: number) {
        this.setField("payloadMass", this._payloadMass, v, (n) => (this._payloadMass = n));
    }
    @editable("number", { unit: "m" }) public get unbalanceRadius(): number {
        return this._unbalanceRadius;
    }
    public set unbalanceRadius(v: number) {
        this.setField("unbalanceRadius", this._unbalanceRadius, v, (n) => (this._unbalanceRadius = n));
    }
    @editable("number", { unit: "rad" }) public get comPhase(): number {
        return this._comPhase;
    }
    public set comPhase(v: number) {
        this.setField("comPhase", this._comPhase, v, (n) => (this._comPhase = n));
    }
    @editable("number") public get fanCoefficient(): number {
        return this._fanCoefficient;
    }
    public set fanCoefficient(v: number) {
        this.setField("fanCoefficient", this._fanCoefficient, v, (n) => (this._fanCoefficient = n));
    }
    @editable("number", { unit: "m" }) public get airGap(): number {
        return this._airGap;
    }
    public set airGap(v: number) {
        this.setField("airGap", this._airGap, v, (n) => (this._airGap = n));
    }
    @editable("number", { unit: "N/m" }) public get bearingRadialStiffness(): number {
        return this._bearingRadialStiffness;
    }
    public set bearingRadialStiffness(v: number) {
        this.setField("bearingRadialStiffness", this._bearingRadialStiffness, v, (n) => (this._bearingRadialStiffness = n));
    }
    @editable("boolean") public get includePayloadWeight(): boolean {
        return this._includePayloadWeight;
    }
    public set includePayloadWeight(v: boolean) {
        this.setField("includePayloadWeight", this._includePayloadWeight, v, (n) => (this._includePayloadWeight = n));
    }

    // ── Viewables ──────────────────────────────────────────────────────
    @viewable("number", { unit: "N.m" }) public get loadTorque(): number {
        return this._tauAero;
    }
    @viewable("number", { unit: "rad/s" }) public get observedSpeed(): number {
        return this._omega;
    }

    public override reset(session: ISession): void {
        super.reset(session); // FaultableNode: world -> identity, accumulator cleared
        this._omega = 0;
        this._rotorAngle = 0;
        this._tauAero = 0;
        this._lastT = -1;
    }

    public override fire(session: ISession, t: number): void {
        // Read the fed-back motor speed BEFORE super.fire() drives the applied
        // faults (they read this.angularVelocity / this.rotorAngle).
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (slot !== "angularVelocity") continue; // transform + fault_N consumed by super.fire
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value === "number") this._omega = value;
        }
        // Integrate the turbine's own shaft angle from the speed (the 1x phase).
        const dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        this._lastT = t;
        this._rotorAngle = (this._rotorAngle + this._omega * dt) % (2 * Math.PI);

        // FaultableNode hop: transform + scan fault_N descriptors + DRIVE the
        // applied fault operators (imbalance / eccentricity). They read this
        // turbine's properties + the turbine's scene gravity (ctx.bodyGravity)
        // and accumulate into the per-tick fault sum.
        super.fire(session, t);
        this._updateGravityCoupling(session); // ensure _bodyGravity even with no applied faults

        // The turbine's own aerodynamic load (fan law), published for observation.
        this._tauAero = this._fanCoefficient * this._omega * Math.abs(this._omega);
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled || link.slot !== "loadTorque") continue;
            const idx = links.indexOf(link);
            if (idx >= 0) session.publish(idx, this._tauAero);
        }
    }

    /**
     * Forward the COMPOSED fault to the motor: the sum the applied faults
     * accumulated on this turbine (imbalance radialForce + its gravity 1x torque,
     * eccentricity UMP), PLUS the turbine's own aero load and payload weight.
     * Called by the motor (the target) on its fire via the ApplyTo relation.
     */
    public applyTo(_target: unknown, ctx: IFaultContext): void {
        // Re-emit every fault the operators accumulated on this turbine.
        this.forEachFault((target, value) => ctx.accumulate(target, value));
        // The aerodynamic load (fan law) as an additive braking torque.
        ctx.accumulate("tau", this._tauAero);
        // The static payload weight on the bearing (in the turbine's own gravity).
        const g = this._bodyGravity;
        if (this._includePayloadWeight && g) {
            ctx.accumulate("radialForceY", this._payloadMass * g.y);
            ctx.accumulate("radialForceZ", this._payloadMass * g.z);
        }
    }
}

export function createTurbinePayloadNode(): TurbinePayloadNode {
    return new TurbinePayloadNode();
}
