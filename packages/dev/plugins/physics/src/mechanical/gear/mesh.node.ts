import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Gear mesh — produces a sinusoidal gear-mesh component at the meshing
 * frequency f_mesh = n_teeth · f_shaft and, optionally, a narrow
 * once-per-revolution pulse to model a single broken tooth defect:
 *
 *     out = in
 *         + meshAmp · sin(n · θ_shaft)
 *         + toothAmp · gaussianPulse(θ_shaft mod 2π, faultAngle, width)
 *
 * The Gaussian pulse is integrated over each shaft revolution so the
 * spectral signature has the right sideband structure around f_mesh.
 */
export class GearMeshNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _nTeeth: number = 24;
    @cloneable private _meshAmp: number = 0.003;
    @cloneable private _toothAmp: number = 0;
    @cloneable private _faultAngle: number = 0; // [rad] location of the broken tooth
    @cloneable private _pulseWidth: number = 0.05; // [rad] Gaussian σ for the pulse

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
        { slot: "mesh_hz", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get nTeeth(): number {
        return this._nTeeth;
    }
    public set nTeeth(v: number) {
        this.setField("nTeeth", this._nTeeth, v, (n) => {
            this._nTeeth = n;
        });
    }
    @editable("number") public get meshAmp(): number {
        return this._meshAmp;
    }
    public set meshAmp(v: number) {
        this.setField("meshAmp", this._meshAmp, v, (n) => {
            this._meshAmp = n;
        });
    }
    @editable("number") public get toothAmp(): number {
        return this._toothAmp;
    }
    public set toothAmp(v: number) {
        this.setField("toothAmp", this._toothAmp, v, (n) => {
            this._toothAmp = n;
        });
    }
    @editable("number") public get faultAngle(): number {
        return this._faultAngle;
    }
    public set faultAngle(v: number) {
        this.setField("faultAngle", this._faultAngle, v, (n) => {
            this._faultAngle = n;
        });
    }
    @editable("number") public get pulseWidth(): number {
        return this._pulseWidth;
    }
    public set pulseWidth(v: number) {
        this.setField("pulseWidth", this._pulseWidth, v, (n) => {
            this._pulseWidth = n;
        });
    }

    @viewable("number") public get signal_out(): number {
        return this._out;
    }

    public override reset(_session: ISession): void {
        this.setField("signal_out", this._out, 0, (n) => {
            this._out = n;
        });
        this._theta = 0;
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
        const meshHz = (this._nTeeth * Math.abs(omega)) / (2 * Math.PI);

        // Mesh harmonic at n · ω.
        const mesh = this._meshAmp * Math.sin(this._nTeeth * this._theta);

        // Once-per-revolution Gaussian pulse, centered at faultAngle.
        let pulse = 0;
        if (this._toothAmp !== 0 && this._pulseWidth > 0) {
            const TWO_PI = 2 * Math.PI;
            let angleInRev = (((this._theta - this._faultAngle) % TWO_PI) + TWO_PI) % TWO_PI;
            // Wrap into [-π, π] for centered Gaussian.
            if (angleInRev > Math.PI) angleInRev -= TWO_PI;
            const sigma = this._pulseWidth;
            pulse = this._toothAmp * Math.exp(-(angleInRev * angleInRev) / (2 * sigma * sigma));
        }

        const out = inSig + mesh + pulse;

        this.setField("signal_out", this._out, out, (n) => {
            this._out = n;
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
        broadcast("mesh_hz", meshHz);
    }
}

export function createGearMeshNode(): GearMeshNode {
    return new GearMeshNode();
}
