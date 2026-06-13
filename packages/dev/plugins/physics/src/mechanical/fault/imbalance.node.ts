import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Rotor imbalance fault (the D1 signature). Faithful port of the legacy
 * `sensors` ImbalanceFault, the validation oracle.
 *
 * An off-center rotor mass produces a centripetal force that rotates with
 * the shaft, injected on the two radial housing axes in quadrature:
 *
 *   m*r = severity * kImbalanceMax        (kg.m, the unbalance product)
 *   F   = m*r * omega^2                   (centripetal force magnitude)
 *   force_y = F * cos(theta_m)
 *   force_z = F * sin(theta_m)            (shaft axis x sees no force)
 *
 * Wire force_y / force_z into the Housing Mechanics node: the rotating 1x
 * f_mech force is the dominant imbalance signature on the vibration
 * channels, and its amplitude grows with omega^2.
 *
 * Relationship to `Physics.Mechanical.Shaft:unbalance`: that node is a
 * generic, constant-amplitude 1x signal modulator (drop it on any signal
 * line). This fault is the physically-grounded mechanical model: a
 * centripetal housing force whose amplitude scales with m*r*omega^2.
 *
 * Phase 1 injects the housing force only (no current-channel coupling);
 * a Phase-2 current coupling would additionally modulate tau / flux at 1x
 * f_mech. Source node (RuntimeNode): reads omega + theta_m from the
 * machine. Stateless, no allocation in the hot path.
 */
export class ImbalanceFaultNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _severity: number = 0; // [0, 1]
    @cloneable private _kImbalanceMax: number = 5e-6; // kg.m at severity 1

    private _fy: number = 0;
    private _fz: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "omega", optional: true, type: "float" },
        { slot: "theta_m", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "force_y", optional: false, type: "float" },
        { slot: "force_z", optional: false, type: "float" },
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
    @editable("number", { unit: "kg.m" }) public get kImbalanceMax(): number {
        return this._kImbalanceMax;
    }
    public set kImbalanceMax(v: number) {
        this.setField("kImbalanceMax", this._kImbalanceMax, v, (n) => (this._kImbalanceMax = n));
    }

    @viewable("number") public get force_y(): number {
        return this._fy;
    }
    @viewable("number") public get force_z(): number {
        return this._fz;
    }

    public override reset(_session: ISession): void {
        this._fy = 0;
        this._fz = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let omega = 0,
            thetaM = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "omega") omega = value;
            else if (slot === "theta_m") thetaM = value;
        }

        const severity = this._severity < 0 ? 0 : this._severity > 1 ? 1 : this._severity;
        const mr = severity * this._kImbalanceMax;
        if (mr <= 0) {
            this._fy = 0;
            this._fz = 0;
        } else {
            const F = mr * omega * omega;
            this._fy = F * Math.cos(thetaM);
            this._fz = F * Math.sin(thetaM);
        }

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (link.slot === "force_y") session.publish(idx, this._fy);
            else if (link.slot === "force_z") session.publish(idx, this._fz);
        }
    }
}

export function createImbalanceFaultNode(): ImbalanceFaultNode {
    return new ImbalanceFaultNode();
}
