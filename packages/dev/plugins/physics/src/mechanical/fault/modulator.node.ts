import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Generic sinusoidal fault modulator. Adds a single sinusoid to the
 * input signal, parameterized by frequency, amplitude, and phase:
 *
 *     out = in + amplitude · sin(2π · freq · t + phase)
 *
 * Used directly on a motor's `loadTorque` or `angularVelocity` to inject a fault
 * signature, or composed inside the more specific Bearing / Shaft /
 * Gear fault nodes which compute their own characteristic frequencies
 * before delegating modulation here (or replicating the same math).
 *
 * Inputs: inputSignal (additive base, default 0), freq (Hz),
 *         amplitude, dt (optional, falls back to t-lastT).
 * Output: outputSignal.
 */
export class FaultModulatorNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _frequencyHz: number = 10;
    @cloneable private _amplitude: number = 0.01;
    @cloneable private _phase: number = 0;

    @cloneable private _phaseAcc: number = 0;
    @cloneable private _out: number = 0;
    private _lastT: number = -1;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "inputSignal", optional: true, type: "float" },
        { slot: "freq", optional: true, type: "float" },
        { slot: "amplitude", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "outputSignal", optional: false, type: "float" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get frequencyHz(): number {
        return this._frequencyHz;
    }
    public set frequencyHz(v: number) {
        this.setField("frequencyHz", this._frequencyHz, v, (n) => {
            this._frequencyHz = n;
        });
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

    @viewable("number") public get outputSignal(): number {
        return this._out;
    }

    public override reset(_session: ISession): void {
        this.setField("outputSignal", this._out, 0, (n) => {
            this._out = n;
        });
        this._phaseAcc = this._phase;
        this._lastT = -1;
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let inSig = 0,
            freq = this._frequencyHz,
            amp = this._amplitude,
            dt = -1;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "inputSignal") inSig = value;
            else if (slot === "freq") freq = value;
            else if (slot === "amplitude") amp = value;
            else if (slot === "dt") dt = value;
        }
        if (dt < 0) dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        this._lastT = t;

        this._phaseAcc += 2 * Math.PI * freq * dt;
        const out = inSig + amp * Math.sin(this._phaseAcc);

        this.setField("outputSignal", this._out, out, (n) => {
            this._out = n;
        });
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "outputSignal" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, out);
        }
    }
}

export function createFaultModulatorNode(): FaultModulatorNode {
    return new FaultModulatorNode();
}
