import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Rotor imbalance fault (the D1 signature). Faithful port of the legacy
 * `sensors` ImbalanceFault, the validation oracle.
 *
 * An off-center rotor mass produces a centripetal force that rotates with
 * the shaft, injected on the two radial housing axes in quadrature:
 *
 *   m*r = severity * maxUnbalanceProduct        (kg.m, the unbalance product)
 *   F   = m*r * angularVelocity^2                   (centripetal force magnitude)
 *   forceY = F * cos(rotorAngle)
 *   forceZ = F * sin(rotorAngle)            (shaft axis x sees no force)
 *
 * Wire forceY / forceZ into the Housing Mechanics node: the rotating 1x
 * f_mech force is the dominant imbalance signature on the vibration
 * channels, and its amplitude grows with angularVelocity^2.
 *
 * Relationship to `Physics.Mechanical.Shaft:unbalance`: that node is a
 * generic, constant-amplitude 1x signal modulator (drop it on any signal
 * line). This fault is the physically-grounded mechanical model: a
 * centripetal housing force whose amplitude scales with m*r*angularVelocity^2.
 *
 * Phase 1 injects the housing force only (no current-channel coupling);
 * a Phase-2 current coupling would additionally modulate tau / flux at 1x
 * f_mech. Source node (RuntimeNode): reads angularVelocity + rotorAngle from the
 * machine. Stateless, no allocation in the hot path.
 *
 * @deprecated Descriptor-publisher model, kept only for the PMSM path.
 * Superseded by `RotorImbalanceFaultNode`, an `applyTo` CAUSE that contributes a
 * rotating radial force to the motor MODEL (FMEA: cause -> eccentricity state ->
 * flux/UMP consequence). New (DC) graphs use the applyTo causes; the PMSM still
 * consumes this until it is migrated.
 */
export class ImbalanceFaultNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _severity: number = 0; // [0, 1]
    @cloneable private _maxUnbalanceProduct: number = 5e-6; // kg.m at severity 1

    private _fy: number = 0;
    private _fz: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "angularVelocity", optional: true, type: "float" },
        { slot: "rotorAngle", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "forceY", optional: false, type: "float" },
        { slot: "forceZ", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get severity(): number {
        return this._severity;
    }
    public set severity(v: number) {
        this.setField("severity", this._severity, v, (n) => (this._severity = n));
    }
    @editable("number", { unit: "kg.m" }) public get maxUnbalanceProduct(): number {
        return this._maxUnbalanceProduct;
    }
    public set maxUnbalanceProduct(v: number) {
        this.setField("maxUnbalanceProduct", this._maxUnbalanceProduct, v, (n) => (this._maxUnbalanceProduct = n));
    }

    @viewable("number") public get forceY(): number {
        return this._fy;
    }
    @viewable("number") public get forceZ(): number {
        return this._fz;
    }

    public override reset(_session: ISession): void {
        this._fy = 0;
        this._fz = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let angularVelocity = 0,
            thetaM = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "angularVelocity") angularVelocity = value;
            else if (slot === "rotorAngle") thetaM = value;
        }

        const severity = this._severity < 0 ? 0 : this._severity > 1 ? 1 : this._severity;
        const mr = severity * this._maxUnbalanceProduct;
        if (mr <= 0) {
            this._fy = 0;
            this._fz = 0;
        } else {
            const F = mr * angularVelocity * angularVelocity;
            this._fy = F * Math.cos(thetaM);
            this._fz = F * Math.sin(thetaM);
        }

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (link.slot === "forceY") session.publish(idx, this._fy);
            else if (link.slot === "forceZ") session.publish(idx, this._fz);
        }
    }
}

/** @deprecated Use `createRotorImbalanceFaultNode` (the applyTo cause). */
export function createImbalanceFaultNode(): ImbalanceFaultNode {
    return new ImbalanceFaultNode();
}
