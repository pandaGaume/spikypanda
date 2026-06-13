import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Mounting compliance under static gravity load. Faithful port of the
 * legacy `sensors` MountingComplianceModel (the validation oracle).
 *
 * The whole motor (mass m_motor) hangs from a flexible bracket. Gravity
 * exerts a static load on the bracket along the body-frame gravity
 * direction:
 *
 *   force_{x,y,z} = m_motor * g_{x,y,z}
 *
 * with the body-frame gravity components wired from the GravityVector
 * node. Wiring force_x / force_y / force_z into the Housing Mechanics
 * node makes the housing deflect under the load: an initial transient on
 * the vibration channels as gravity is "applied" at t = 0, then a static
 * offset where the spring balances gravity (per-axis acceleration returns
 * to zero at steady state). In an orientation sweep each pose yields a
 * distinct transient signature, the mounting-resonance gravito-coupled
 * mechanism of the gravity study.
 *
 * Stateless, no allocation in the hot path. When several force sources
 * feed the same housing axis (e.g. rotor-sag UMP + mounting), sum them
 * before the housing input; the housing exposes one force port per axis.
 */
export class MountingComplianceNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _motorMass: number = 0.066; // kg (Maxon ECX PRIME, 66 g)

    private _fx: number = 0;
    private _fy: number = 0;
    private _fz: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "g_x", optional: true, type: "float" },
        { slot: "g_y", optional: true, type: "float" },
        { slot: "g_z", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "force_x", optional: false, type: "float" },
        { slot: "force_y", optional: false, type: "float" },
        { slot: "force_z", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number", { unit: "kg" }) public get motorMass(): number {
        return this._motorMass;
    }
    public set motorMass(v: number) {
        this.setField("motorMass", this._motorMass, v, (n) => (this._motorMass = n));
    }

    @viewable("number") public get force_x(): number {
        return this._fx;
    }
    @viewable("number") public get force_y(): number {
        return this._fy;
    }
    @viewable("number") public get force_z(): number {
        return this._fz;
    }

    public override reset(_session: ISession): void {
        this._fx = 0;
        this._fy = 0;
        this._fz = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let gx = 0,
            gy = 0,
            gz = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "g_x") gx = value;
            else if (slot === "g_y") gy = value;
            else if (slot === "g_z") gz = value;
        }

        this._fx = this._motorMass * gx;
        this._fy = this._motorMass * gy;
        this._fz = this._motorMass * gz;

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "force_x":
                    session.publish(idx, this._fx);
                    break;
                case "force_y":
                    session.publish(idx, this._fy);
                    break;
                case "force_z":
                    session.publish(idx, this._fz);
                    break;
            }
        }
    }
}

export function createMountingComplianceNode(): MountingComplianceNode {
    return new MountingComplianceNode();
}
