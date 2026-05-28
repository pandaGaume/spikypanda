import {
    cloneable, editable, viewable,
    IChannel, IDeclaresPorts, IOlink, IPortDescriptor,
    ISession, RuntimeNode, inSlotOf,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Bearing fault generator — computes the four classical defect
 * characteristic frequencies from bearing geometry and shaft speed,
 * then sums their sinusoidal contributions onto an input signal:
 *
 *     f_r  = ω_shaft / (2π)             (shaft revolution frequency)
 *     BPFO = (N/2) · f_r · (1 - d/D · cos α)    (outer race)
 *     BPFI = (N/2) · f_r · (1 + d/D · cos α)    (inner race)
 *     BSF  = (D/2d) · f_r · (1 - (d/D · cos α)²) (ball spin)
 *     FTF  = (1/2) · f_r · (1 - d/D · cos α)    (cage / fundamental train)
 *
 * where N = number of balls, d = ball diameter, D = pitch diameter,
 * α = contact angle.
 *
 * Each defect frequency carries its own amplitude (set to 0 to disable
 * that component). Useful directly on the motor `tau_load` input or on
 * a measured vibration channel to inject a known bearing signature.
 *
 * Inputs:
 *   signal_in   additive base (default 0)
 *   omega       shaft mechanical speed [rad/s]
 *   dt          integration step (optional, falls back to t-lastT)
 *
 * Output: signal_out (signal_in + sum of active fault sinusoids).
 *
 * Geometry editables: nBalls, ballDiameter, pitchDiameter, contactAngle.
 * Amplitude editables: bpfoAmp, bpfiAmp, bsfAmp, ftfAmp.
 */
export class BearingFaultNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _nBalls:        number = 8;
    @cloneable private _ballDiameter:  number = 7.94e-3;   // [m]
    @cloneable private _pitchDiameter: number = 33.5e-3;   // [m]
    @cloneable private _contactAngle:  number = 0;          // [rad]

    @cloneable private _bpfoAmp: number = 0.005;
    @cloneable private _bpfiAmp: number = 0;
    @cloneable private _bsfAmp:  number = 0;
    @cloneable private _ftfAmp:  number = 0;

    @cloneable private _phaseBpfo: number = 0;
    @cloneable private _phaseBpfi: number = 0;
    @cloneable private _phaseBsf:  number = 0;
    @cloneable private _phaseFtf:  number = 0;
    @cloneable private _out:       number = 0;
    private _lastT: number = -1;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "signal_in", optional: true, type: "float" },
        { slot: "omega",     optional: true, type: "float" },
        { slot: "dt",        optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "signal_out", optional: false, type: "float" },
        { slot: "bpfo_hz",    optional: false, type: "float" },
        { slot: "bpfi_hz",    optional: false, type: "float" },
        { slot: "bsf_hz",     optional: false, type: "float" },
        { slot: "ftf_hz",     optional: false, type: "float" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number") public get nBalls(): number { return this._nBalls; }
    public set nBalls(v: number) { this.setField("nBalls", this._nBalls, v, (n) => { this._nBalls = n; }); }
    @editable("number") public get ballDiameter(): number { return this._ballDiameter; }
    public set ballDiameter(v: number) { this.setField("ballDiameter", this._ballDiameter, v, (n) => { this._ballDiameter = n; }); }
    @editable("number") public get pitchDiameter(): number { return this._pitchDiameter; }
    public set pitchDiameter(v: number) { this.setField("pitchDiameter", this._pitchDiameter, v, (n) => { this._pitchDiameter = n; }); }
    @editable("number") public get contactAngle(): number { return this._contactAngle; }
    public set contactAngle(v: number) { this.setField("contactAngle", this._contactAngle, v, (n) => { this._contactAngle = n; }); }
    @editable("number") public get bpfoAmp(): number { return this._bpfoAmp; }
    public set bpfoAmp(v: number) { this.setField("bpfoAmp", this._bpfoAmp, v, (n) => { this._bpfoAmp = n; }); }
    @editable("number") public get bpfiAmp(): number { return this._bpfiAmp; }
    public set bpfiAmp(v: number) { this.setField("bpfiAmp", this._bpfiAmp, v, (n) => { this._bpfiAmp = n; }); }
    @editable("number") public get bsfAmp(): number { return this._bsfAmp; }
    public set bsfAmp(v: number) { this.setField("bsfAmp", this._bsfAmp, v, (n) => { this._bsfAmp = n; }); }
    @editable("number") public get ftfAmp(): number { return this._ftfAmp; }
    public set ftfAmp(v: number) { this.setField("ftfAmp", this._ftfAmp, v, (n) => { this._ftfAmp = n; }); }

    @viewable("number") public get signal_out(): number { return this._out; }

    public override reset(_session: ISession): void {
        this.setField("signal_out", this._out, 0, (n) => { this._out = n; });
        this._phaseBpfo = this._phaseBpfi = this._phaseBsf = this._phaseFtf = 0;
        this._lastT = -1;
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let inSig = 0, omega = 0, dt = -1;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if      (slot === "signal_in") inSig = value;
            else if (slot === "omega")     omega = value;
            else if (slot === "dt")        dt = value;
        }
        if (dt < 0) dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        this._lastT = t;

        const fr = Math.abs(omega) / (2 * Math.PI);
        const ratio = this._pitchDiameter > 0 ? (this._ballDiameter / this._pitchDiameter) * Math.cos(this._contactAngle) : 0;
        const bpfoHz = (this._nBalls / 2) * fr * (1 - ratio);
        const bpfiHz = (this._nBalls / 2) * fr * (1 + ratio);
        const bsfHz  = this._ballDiameter > 0 ? (this._pitchDiameter / (2 * this._ballDiameter)) * fr * (1 - ratio * ratio) : 0;
        const ftfHz  = 0.5 * fr * (1 - ratio);

        this._phaseBpfo += 2 * Math.PI * bpfoHz * dt;
        this._phaseBpfi += 2 * Math.PI * bpfiHz * dt;
        this._phaseBsf  += 2 * Math.PI * bsfHz  * dt;
        this._phaseFtf  += 2 * Math.PI * ftfHz  * dt;

        const out = inSig
            + this._bpfoAmp * Math.sin(this._phaseBpfo)
            + this._bpfiAmp * Math.sin(this._phaseBpfi)
            + this._bsfAmp  * Math.sin(this._phaseBsf)
            + this._ftfAmp  * Math.sin(this._phaseFtf);

        this.setField("signal_out", this._out, out, (n) => { this._out = n; });
        const broadcast = (slot: string, val: unknown): void => {
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== slot || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, val);
            }
        };
        broadcast("signal_out", out);
        broadcast("bpfo_hz",    bpfoHz);
        broadcast("bpfi_hz",    bpfiHz);
        broadcast("bsf_hz",     bsfHz);
        broadcast("ftf_hz",     ftfHz);
    }
}

export function createBearingFaultNode(): BearingFaultNode {
    return new BearingFaultNode();
}
