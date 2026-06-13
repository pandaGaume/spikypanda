import { IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf, viewable } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Clarke transform (abc -> alpha-beta), amplitude-invariant (Concordia
 * convention). Faithful port of the legacy `sensors`
 * ThreePhaseTransforms.clarke, the validation oracle.
 *
 *   alpha = (2/3) * (a - b/2 - c/2)
 *   beta  = (2/3) * (sqrt(3)/2) * (b - c)
 *
 * Under balanced inputs a = I*cos(theta), b = I*cos(theta - 2pi/3),
 * c = I*cos(theta + 2pi/3): alpha = I*cos(theta), beta = I*sin(theta).
 *
 * This is the first stage of the canonical FOC feedback path: wire the
 * machine phase currents i_a/i_b/i_c here, then feed (alpha, beta) into a
 * Park node to obtain (i_d, i_q) for the controller. Stateless, no
 * allocation in the hot path.
 */
export class ClarkeNode extends RuntimeNode implements IDeclaresPorts {
    private _alpha: number = 0;
    private _beta: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "a", optional: true, type: "float" },
        { slot: "b", optional: true, type: "float" },
        { slot: "c", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "alpha", optional: false, type: "float" },
        { slot: "beta", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @viewable("number") public get alpha(): number {
        return this._alpha;
    }
    @viewable("number") public get beta(): number {
        return this._beta;
    }

    public override reset(_session: ISession): void {
        this._alpha = 0;
        this._beta = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let a = 0,
            b = 0,
            c = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "a") a = value;
            else if (slot === "b") b = value;
            else if (slot === "c") c = value;
        }

        this._alpha = (2 / 3) * (a - 0.5 * b - 0.5 * c);
        this._beta = (2 / 3) * (0.5 * Math.sqrt(3)) * (b - c);

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (link.slot === "alpha") session.publish(idx, this._alpha);
            else if (link.slot === "beta") session.publish(idx, this._beta);
        }
    }
}

export function createClarkeNode(): ClarkeNode {
    return new ClarkeNode();
}
