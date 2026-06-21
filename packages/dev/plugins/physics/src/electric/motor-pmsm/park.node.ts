import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Park transform (alpha-beta -> dq). Faithful port of the legacy
 * `sensors` ThreePhaseTransforms.park, the validation oracle. Aligns the
 * directAxis axis with the rotor flux at the electrical angle electricalAngle = polePairs *
 * rotorAngle:
 *
 *   directAxis =  alpha * cos(electricalAngle) + beta * sin(electricalAngle)
 *   quadratureAxis = -alpha * sin(electricalAngle) + beta * cos(electricalAngle)
 *
 * Second stage of the canonical FOC feedback path: a Clarke node turns
 * the machine phase currents into (alpha, beta), this node rotates them
 * into the rotor frame (directAxisCurrent, quadratureAxisCurrent) for the controller. The mechanical
 * rotor angle rotorAngle is wired from the machine; the editable polePairs (pole
 * pairs, must match the machine and the FOC) forms the electrical angle.
 *
 * Stateless, no allocation in the hot path.
 */
export class ParkNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _polePairs: number = 1;

    private _d: number = 0;
    private _q: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "alpha", optional: true, type: "float" },
        { slot: "beta", optional: true, type: "float" },
        { slot: "rotorAngle", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "directAxis", optional: false, type: "float" },
        { slot: "quadratureAxis", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get polePairs(): number {
        return this._polePairs;
    }
    public set polePairs(v: number) {
        this.setField("polePairs", this._polePairs, v, (n) => (this._polePairs = n));
    }

    @viewable("number") public get directAxis(): number {
        return this._d;
    }
    @viewable("number") public get quadratureAxis(): number {
        return this._q;
    }

    public override reset(_session: ISession): void {
        this._d = 0;
        this._q = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let alpha = 0,
            beta = 0,
            thetaM = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "alpha") alpha = value;
            else if (slot === "beta") beta = value;
            else if (slot === "rotorAngle") thetaM = value;
        }

        const thetaE = this._polePairs * thetaM;
        const cs = Math.cos(thetaE);
        const sn = Math.sin(thetaE);
        this._d = alpha * cs + beta * sn;
        this._q = -alpha * sn + beta * cs;

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (link.slot === "directAxis") session.publish(idx, this._d);
            else if (link.slot === "quadratureAxis") session.publish(idx, this._q);
        }
    }
}

export function createParkNode(): ParkNode {
    return new ParkNode();
}
