import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Shaft unbalance — sinusoidal modulation at 1× the shaft rotation
 * frequency, the dominant signature of a mass imbalance on the rotor:
 *
 *     out = in + amplitude · sin(θ_shaft + phase)
 *
 * where θ_shaft is the integrated shaft angle (radians). Computed from
 * the wired `omega` input by accumulating dt-scaled increments.
 *
 * Connect the motor's `omega` output to this node's `omega` input, and
 * place this node in series on the `tau_load` line (or on a measured
 * vibration channel) to introduce a classic 1× unbalance signature.
 */
export class ShaftUnbalanceNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _amplitude: number = 0.005;
    @cloneable private _phase: number = 0;

    @cloneable private _theta: number = 0;
    @cloneable private _out: number = 0;
    private _lastT: number = -1;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "signal_in", optional: true, type: "float" },
        { slot: "omega", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "signal_out", optional: false, type: "float" },
        { slot: "theta", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get amplitude(): number {
        return this._amplitude;
    }
    public set amplitude(v: number) {
        this.setField("amplitude", this._amplitude, v, (n) => {
            this._amplitude = n;
        });
    }
    @editable("number") public get phase(): number {
        return this._phase;
    }
    public set phase(v: number) {
        this.setField("phase", this._phase, v, (n) => {
            this._phase = n;
        });
    }

    @viewable("number") public get signal_out(): number {
        return this._out;
    }
    @viewable("number") public get theta(): number {
        return this._theta;
    }

    public override reset(_session: ISession): void {
        this.setField("signal_out", this._out, 0, (n) => {
            this._out = n;
        });
        this.setField("theta", this._theta, 0, (n) => {
            this._theta = n;
        });
        this._lastT = -1;
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let inSig = 0,
            omega = 0,
            dt = -1;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "signal_in") inSig = value;
            else if (slot === "omega") omega = value;
            else if (slot === "dt") dt = value;
        }
        if (dt < 0) dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        this._lastT = t;

        this._theta += omega * dt;
        const out = inSig + this._amplitude * Math.sin(this._theta + this._phase);

        this.setField("signal_out", this._out, out, (n) => {
            this._out = n;
        });
        this.setField("theta", this._theta, this._theta, (n) => {
            this._theta = n;
        });
        const broadcast = (slot: string, val: unknown): void => {
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== slot || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, val);
            }
        };
        broadcast("signal_out", out);
        broadcast("theta", this._theta);
    }
}

export function createShaftUnbalanceNode(): ShaftUnbalanceNode {
    return new ShaftUnbalanceNode();
}
