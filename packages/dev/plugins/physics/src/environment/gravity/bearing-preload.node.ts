import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Gravity-modulated bearing preload. Faithful port of the legacy
 * `sensors` BearingPreloadModel (the validation oracle). The nominal
 * preload set at assembly is augmented by the gravitational load
 * projected onto the bearing axes:
 *
 *   F_axial_eff  = F_a_0 + m_rotor * g_axial    (axial, along shaft / body X)
 *   F_radial_eff = F_r_0 + m_rotor * g_radial   (radial, in the body YZ plane)
 *
 * where g_axial is the SIGNED axial gravity component (wire it from the
 * GravityVector node's g_x output) and g_radial is the radial magnitude
 * (g_radial output). Gravity orientation thus changes the contact angle
 * and rolling-element load distribution, hence the harmonic structure of
 * a future bearing-race fault (D2): that fault reads these effective
 * preloads to modulate its BPFI / BPFO amplitudes. This node has no
 * dynamic consumer on its own; it exposes the operating-point preloads
 * for downstream faults and for dataset metadata.
 *
 * Stateless, no allocation in the hot path.
 */
export class BearingPreloadNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _rotorMass: number = 0.0076; // kg (Maxon ECX PRIME)
    @cloneable private _nominalAxialPreload: number = 5; // N
    @cloneable private _nominalRadialPreload: number = 0; // N

    private _fAxial: number = 0;
    private _fRadial: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "g_axial", optional: true, type: "float" },
        { slot: "g_radial", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "F_axial_eff", optional: false, type: "float" },
        { slot: "F_radial_eff", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
    @editable("number", { unit: "kg" }) public get rotorMass(): number {
        return this._rotorMass;
    }
    public set rotorMass(v: number) {
        this.setField("rotorMass", this._rotorMass, v, (n) => (this._rotorMass = n));
    }
    @editable("number", { unit: "N" }) public get nominalAxialPreload(): number {
        return this._nominalAxialPreload;
    }
    public set nominalAxialPreload(v: number) {
        this.setField("nominalAxialPreload", this._nominalAxialPreload, v, (n) => (this._nominalAxialPreload = n));
    }
    @editable("number", { unit: "N" }) public get nominalRadialPreload(): number {
        return this._nominalRadialPreload;
    }
    public set nominalRadialPreload(v: number) {
        this.setField("nominalRadialPreload", this._nominalRadialPreload, v, (n) => (this._nominalRadialPreload = n));
    }

    // ── Viewables ──────────────────────────────────────────────────────
    @viewable("number") public get F_axial_eff(): number {
        return this._fAxial;
    }
    @viewable("number") public get F_radial_eff(): number {
        return this._fRadial;
    }

    public override reset(_session: ISession): void {
        this._fAxial = this._nominalAxialPreload;
        this._fRadial = this._nominalRadialPreload;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let gAxial = 0,
            gRadial = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "g_axial") gAxial = value;
            else if (slot === "g_radial") gRadial = value;
        }

        this._fAxial = this._nominalAxialPreload + this._rotorMass * gAxial;
        this._fRadial = this._nominalRadialPreload + this._rotorMass * gRadial;

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (link.slot === "F_axial_eff") session.publish(idx, this._fAxial);
            else if (link.slot === "F_radial_eff") session.publish(idx, this._fRadial);
        }
    }
}

export function createBearingPreloadNode(): BearingPreloadNode {
    return new BearingPreloadNode();
}
