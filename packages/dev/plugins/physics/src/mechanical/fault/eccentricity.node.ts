import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Static air-gap eccentricity fault (the D4 signature). Faithful port of
 * the legacy `sensors` EccentricityFault, the validation oracle.
 *
 * The rotor sits off the magnetic axis by a fixed fraction of the air
 * gap; the resulting air-gap flux modulation, at the rotor angle, is:
 *
 *   epsilon = severity * epsilonMax            (fractional gap modulation)
 *   flux delta(theta_m) = epsilon * cos(theta_m - thetaOffset)
 *
 * The `flux` output emits a fault descriptor `{ target: "flux", value:
 * delta }` for the PMSM machine's variadic fault bank (wire flux ->
 * machine fault_N). The machine forms lambda_m_eff = lambda_m * (1 + sum
 * of flux faults), so the 1x f_mech envelope variation produces sidebands
 * at f_e +/- f_mech in i_d / i_q after the controller reacts. Any other flux
 * fault feeding the same bank composes additively in the machine's flux
 * accumulator.
 *
 * Source node (RuntimeNode): reads only the rotor angle theta_m from the
 * machine. Stateless, no allocation in the hot path.
 */
export class EccentricityFaultNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _severity: number = 0; // [0, 1]
    @cloneable private _epsilonMax: number = 0.5; // fractional gap at severity 1
    @cloneable private _thetaOffset: number = 0; // rad

    private _fluxDelta: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "theta_m", optional: true, type: "float" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "flux", optional: false, type: "any" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get severity(): number {
        return this._severity;
    }
    public set severity(v: number) {
        this.setField("severity", this._severity, v, (n) => (this._severity = n));
    }
    @editable("number") public get epsilonMax(): number {
        return this._epsilonMax;
    }
    public set epsilonMax(v: number) {
        this.setField("epsilonMax", this._epsilonMax, v, (n) => (this._epsilonMax = n));
    }
    @editable("number", { unit: "rad" }) public get thetaOffset(): number {
        return this._thetaOffset;
    }
    public set thetaOffset(v: number) {
        this.setField("thetaOffset", this._thetaOffset, v, (n) => (this._thetaOffset = n));
    }

    @viewable("number") public get flux_envelope(): number {
        return 1 + this._fluxDelta;
    }
    @viewable("number") public get flux_delta(): number {
        return this._fluxDelta;
    }

    public override reset(_session: ISession): void {
        this._fluxDelta = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let thetaM = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "theta_m") thetaM = value;
        }

        const severity = this._severity < 0 ? 0 : this._severity > 1 ? 1 : this._severity;
        const epsilon = severity * this._epsilonMax;
        this._fluxDelta = epsilon <= 0 ? 0 : epsilon * Math.cos(thetaM - this._thetaOffset);

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (link.slot === "flux") session.publish(idx, { target: "flux", value: this._fluxDelta });
        }
    }
}

export function createEccentricityFaultNode(): EccentricityFaultNode {
    return new EccentricityFaultNode();
}
