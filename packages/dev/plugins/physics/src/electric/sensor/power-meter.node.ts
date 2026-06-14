import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Power / energy meter, three-phase. A real current sensor is rarely
 * alone: paired with voltage taps it becomes a power analyzer. This node
 * takes the three phase voltages AND currents (and, optionally, the dq
 * quantities) and derives the full set of electrical indicators.
 *
 * abc channel (the general wattmeter):
 *   p(t)  = v_a*i_a + v_b*i_b + v_c*i_c          (instantaneous active power)
 *   P     = <p>          active power  [W]   (averaged, 1st-order LPF at averagingHz)
 *   Vrms  = sqrt(mean_k <v_k^2>),  Irms = sqrt(mean_k <i_k^2>)
 *   S     = 3 * Vrms * Irms                      apparent power [VA]
 *   Q     = sqrt(max(0, S^2 - P^2))              reactive power [var] (magnitude)
 *   PF    = P / S                                power factor
 *   E_active   += p * dt                         active energy   [J]
 *   E_reactive += Q * dt                         reactive energy [var.s]
 *
 * dq channel (clean, instantaneous, for a PMSM drive; wire v_d/v_q/i_d/i_q):
 *   P_dq = 1.5 * (v_d*i_d + v_q*i_q)             active power  [W]
 *   Q_dq = 1.5 * (v_q*i_d - v_d*i_q)             reactive power [var], SIGNED
 *
 * `averagingHz` sets the cutoff of the averaging filter; keep it well
 * BELOW the electrical fundamental so the LPF rejects the 2x ripple of
 * instantaneous power and converges to the true mean (default 5 Hz). Set
 * to 0 to bypass averaging (P = instantaneous p). The abc Q is a
 * magnitude (sign undefined from S and P alone); use Q_dq when the sign
 * of the reactive flow matters.
 *
 * Stream inputs (consume + dt from the `dt` input or t - lastT), like the
 * other PMSM-chain nodes. Source/transducer node (RuntimeNode).
 */
export class PowerMeterNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _averagingHz: number = 5;

    @cloneable private _emaP: number = 0;
    @cloneable private _emaVa2: number = 0;
    @cloneable private _emaVb2: number = 0;
    @cloneable private _emaVc2: number = 0;
    @cloneable private _emaIa2: number = 0;
    @cloneable private _emaIb2: number = 0;
    @cloneable private _emaIc2: number = 0;
    @cloneable private _eActive: number = 0;
    @cloneable private _eReactive: number = 0;

    @cloneable private _P: number = 0;
    @cloneable private _Q: number = 0;
    @cloneable private _S: number = 0;
    @cloneable private _pf: number = 0;
    @cloneable private _Pdq: number = 0;
    @cloneable private _Qdq: number = 0;
    private _lastT: number = -1;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "v_a", optional: true, type: "float" },
        { slot: "v_b", optional: true, type: "float" },
        { slot: "v_c", optional: true, type: "float" },
        { slot: "i_a", optional: true, type: "float" },
        { slot: "i_b", optional: true, type: "float" },
        { slot: "i_c", optional: true, type: "float" },
        { slot: "v_d", optional: true, type: "float" },
        { slot: "v_q", optional: true, type: "float" },
        { slot: "i_d", optional: true, type: "float" },
        { slot: "i_q", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "P", optional: false, type: "float" },
        { slot: "Q", optional: false, type: "float" },
        { slot: "S", optional: false, type: "float" },
        { slot: "power_factor", optional: false, type: "float" },
        { slot: "E_active", optional: false, type: "float" },
        { slot: "E_reactive", optional: false, type: "float" },
        { slot: "P_dq", optional: false, type: "float" },
        { slot: "Q_dq", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number", { unit: "Hz" }) public get averagingHz(): number {
        return this._averagingHz;
    }
    public set averagingHz(v: number) {
        const next = v >= 0 ? v : 0;
        this.setField("averagingHz", this._averagingHz, next, (n) => (this._averagingHz = n));
    }

    @viewable("number", { unit: "W" }) public get P(): number {
        return this._P;
    }
    @viewable("number", { unit: "var" }) public get Q(): number {
        return this._Q;
    }
    @viewable("number", { unit: "VA" }) public get S(): number {
        return this._S;
    }
    @viewable("number") public get power_factor(): number {
        return this._pf;
    }
    @viewable("number", { unit: "J" }) public get E_active(): number {
        return this._eActive;
    }
    @viewable("number") public get E_reactive(): number {
        return this._eReactive;
    }
    @viewable("number", { unit: "W" }) public get P_dq(): number {
        return this._Pdq;
    }
    @viewable("number", { unit: "var" }) public get Q_dq(): number {
        return this._Qdq;
    }

    public override reset(_session: ISession): void {
        this._emaP = this._emaVa2 = this._emaVb2 = this._emaVc2 = 0;
        this._emaIa2 = this._emaIb2 = this._emaIc2 = 0;
        this._eActive = this._eReactive = 0;
        this._P = this._Q = this._S = this._pf = this._Pdq = this._Qdq = 0;
        this._lastT = -1;
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let va = 0,
            vb = 0,
            vc = 0,
            ia = 0,
            ib = 0,
            ic = 0,
            vd = 0,
            vq = 0,
            id = 0,
            iq = 0,
            dtIn = -1;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "v_a") va = value;
            else if (slot === "v_b") vb = value;
            else if (slot === "v_c") vc = value;
            else if (slot === "i_a") ia = value;
            else if (slot === "i_b") ib = value;
            else if (slot === "i_c") ic = value;
            else if (slot === "v_d") vd = value;
            else if (slot === "v_q") vq = value;
            else if (slot === "i_d") id = value;
            else if (slot === "i_q") iq = value;
            else if (slot === "dt") dtIn = value;
        }
        const dt = dtIn >= 0 ? dtIn : this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        this._lastT = t;

        // Instantaneous active power and squared signals.
        const p = va * ia + vb * ib + vc * ic;

        // Averaging filter (1st-order LPF). alpha = dt/(tau+dt); 0 Hz bypasses.
        let alpha = 1;
        if (this._averagingHz > 0 && dt > 0) {
            const tau = 1 / (2 * Math.PI * this._averagingHz);
            alpha = dt / (tau + dt);
        }
        this._emaP += alpha * (p - this._emaP);
        this._emaVa2 += alpha * (va * va - this._emaVa2);
        this._emaVb2 += alpha * (vb * vb - this._emaVb2);
        this._emaVc2 += alpha * (vc * vc - this._emaVc2);
        this._emaIa2 += alpha * (ia * ia - this._emaIa2);
        this._emaIb2 += alpha * (ib * ib - this._emaIb2);
        this._emaIc2 += alpha * (ic * ic - this._emaIc2);

        const vrms = Math.sqrt(Math.max(0, (this._emaVa2 + this._emaVb2 + this._emaVc2) / 3));
        const irms = Math.sqrt(Math.max(0, (this._emaIa2 + this._emaIb2 + this._emaIc2) / 3));
        this._P = this._emaP;
        this._S = 3 * vrms * irms;
        this._Q = Math.sqrt(Math.max(0, this._S * this._S - this._P * this._P));
        this._pf = this._S > 1e-12 ? this._P / this._S : 0;

        // Active energy from the true instantaneous power; reactive energy
        // accumulates the (magnitude) reactive power.
        if (dt > 0) {
            this._eActive += p * dt;
            this._eReactive += this._Q * dt;
        }

        // dq channel (instantaneous, signed).
        this._Pdq = 1.5 * (vd * id + vq * iq);
        this._Qdq = 1.5 * (vq * id - vd * iq);

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "P":
                    session.publish(idx, this._P);
                    break;
                case "Q":
                    session.publish(idx, this._Q);
                    break;
                case "S":
                    session.publish(idx, this._S);
                    break;
                case "power_factor":
                    session.publish(idx, this._pf);
                    break;
                case "E_active":
                    session.publish(idx, this._eActive);
                    break;
                case "E_reactive":
                    session.publish(idx, this._eReactive);
                    break;
                case "P_dq":
                    session.publish(idx, this._Pdq);
                    break;
                case "Q_dq":
                    session.publish(idx, this._Qdq);
                    break;
            }
        }
    }
}

export function createPowerMeterNode(): PowerMeterNode {
    return new PowerMeterNode();
}
