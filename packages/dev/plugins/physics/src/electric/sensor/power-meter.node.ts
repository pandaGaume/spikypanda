import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Power / energy meter, three-phase. A real current sensor is rarely
 * alone: paired with voltage taps it becomes a power analyzer. This node
 * takes the three phase voltages AND currents (and, optionally, the dq
 * quantities) and derives the full set of electrical indicators.
 *
 * abc channel (the general wattmeter):
 *   p(t)  = phaseVoltageA*phaseCurrentA + phaseVoltageB*phaseCurrentB + phaseVoltageC*phaseCurrentC          (instantaneous active power)
 *   activePower     = <p>          active power  [W]   (averaged, 1st-order LPF at averagingFrequencyHz)
 *   Vrms  = sqrt(mean_k <v_k^2>),  Irms = sqrt(mean_k <i_k^2>)
 *   apparentPower     = 3 * Vrms * Irms                      apparent power [VA]
 *   reactivePower     = sqrt(max(0, apparentPower^2 - activePower^2))              reactive power [var] (magnitude)
 *   PF    = activePower / apparentPower                                power factor
 *   activeEnergy   += p * dt                         active energy   [J]
 *   reactiveEnergy += reactivePower * dt                         reactive energy [var.s]
 *
 * dq channel (clean, instantaneous, for a PMSM drive; wire directAxisVoltage/quadratureAxisVoltage/directAxisCurrent/quadratureAxisCurrent):
 *   activePowerDq = 1.5 * (directAxisVoltage*directAxisCurrent + quadratureAxisVoltage*quadratureAxisCurrent)             active power  [W]
 *   reactivePowerDq = 1.5 * (quadratureAxisVoltage*directAxisCurrent - directAxisVoltage*quadratureAxisCurrent)             reactive power [var], SIGNED
 *
 * `averagingFrequencyHz` sets the cutoff of the averaging filter; keep it well
 * BELOW the electrical fundamental so the LPF rejects the 2x ripple of
 * instantaneous power and converges to the true mean (default 5 Hz). Set
 * to 0 to bypass averaging (activePower = instantaneous p). The abc reactivePower is a
 * magnitude (sign undefined from apparentPower and activePower alone); use reactivePowerDq when the sign
 * of the reactive flow matters.
 *
 * Stream inputs (consume + dt from the `dt` input or t - lastT), like the
 * other PMSM-chain nodes. Source/transducer node (RuntimeNode).
 */
export class PowerMeterNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _averagingFrequencyHz: number = 5;

    @cloneable private _emaP: number = 0;
    @cloneable private _emaVa2: number = 0;
    @cloneable private _emaVb2: number = 0;
    @cloneable private _emaVc2: number = 0;
    @cloneable private _emaIa2: number = 0;
    @cloneable private _emaIb2: number = 0;
    @cloneable private _emaIc2: number = 0;
    @cloneable private _activeEnergy: number = 0;
    @cloneable private _reactiveEnergy: number = 0;

    @cloneable private _activePower: number = 0;
    @cloneable private _reactivePower: number = 0;
    @cloneable private _apparentPower: number = 0;
    @cloneable private _powerFactor: number = 0;
    @cloneable private _activePowerDq: number = 0;
    @cloneable private _reactivePowerDq: number = 0;
    private _lastT: number = -1;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "phaseVoltageA", optional: true, type: "float" },
        { slot: "phaseVoltageB", optional: true, type: "float" },
        { slot: "phaseVoltageC", optional: true, type: "float" },
        { slot: "phaseCurrentA", optional: true, type: "float" },
        { slot: "phaseCurrentB", optional: true, type: "float" },
        { slot: "phaseCurrentC", optional: true, type: "float" },
        { slot: "directAxisVoltage", optional: true, type: "float" },
        { slot: "quadratureAxisVoltage", optional: true, type: "float" },
        { slot: "directAxisCurrent", optional: true, type: "float" },
        { slot: "quadratureAxisCurrent", optional: true, type: "float" },
        { slot: "dt", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "activePower", optional: false, type: "float" },
        { slot: "reactivePower", optional: false, type: "float" },
        { slot: "apparentPower", optional: false, type: "float" },
        { slot: "powerFactor", optional: false, type: "float" },
        { slot: "activeEnergy", optional: false, type: "float" },
        { slot: "reactiveEnergy", optional: false, type: "float" },
        { slot: "activePowerDq", optional: false, type: "float" },
        { slot: "reactivePowerDq", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number", { unit: { quantity: "Frequency", unit: "Hz" } }) public get averagingFrequencyHz(): number {
        return this._averagingFrequencyHz;
    }
    public set averagingFrequencyHz(v: number) {
        const next = v >= 0 ? v : 0;
        this.setField("averagingFrequencyHz", this._averagingFrequencyHz, next, (n) => (this._averagingFrequencyHz = n));
    }

    @viewable("number", { unit: { quantity: "Power", unit: "watt" } }) public get activePower(): number {
        return this._activePower;
    }
    @viewable("number", { unit: { quantity: "ReactivePower", unit: "var" } }) public get reactivePower(): number {
        return this._reactivePower;
    }
    @viewable("number", { unit: { quantity: "ApparentPower", unit: "VA" } }) public get apparentPower(): number {
        return this._apparentPower;
    }
    @viewable("number") public get powerFactor(): number {
        return this._powerFactor;
    }
    @viewable("number", { unit: { quantity: "Energy", unit: "J" } }) public get activeEnergy(): number {
        return this._activeEnergy;
    }
    @viewable("number") public get reactiveEnergy(): number {
        return this._reactiveEnergy;
    }
    @viewable("number", { unit: { quantity: "Power", unit: "watt" } }) public get activePowerDq(): number {
        return this._activePowerDq;
    }
    @viewable("number", { unit: { quantity: "ReactivePower", unit: "var" } }) public get reactivePowerDq(): number {
        return this._reactivePowerDq;
    }

    public override reset(_session: ISession): void {
        this._emaP = this._emaVa2 = this._emaVb2 = this._emaVc2 = 0;
        this._emaIa2 = this._emaIb2 = this._emaIc2 = 0;
        this._activeEnergy = this._reactiveEnergy = 0;
        this._activePower = this._reactivePower = this._apparentPower = this._powerFactor = this._activePowerDq = this._reactivePowerDq = 0;
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
            if (slot === "phaseVoltageA") va = value;
            else if (slot === "phaseVoltageB") vb = value;
            else if (slot === "phaseVoltageC") vc = value;
            else if (slot === "phaseCurrentA") ia = value;
            else if (slot === "phaseCurrentB") ib = value;
            else if (slot === "phaseCurrentC") ic = value;
            else if (slot === "directAxisVoltage") vd = value;
            else if (slot === "quadratureAxisVoltage") vq = value;
            else if (slot === "directAxisCurrent") id = value;
            else if (slot === "quadratureAxisCurrent") iq = value;
            else if (slot === "dt") dtIn = value;
        }
        const dt = dtIn >= 0 ? dtIn : this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        this._lastT = t;

        // Instantaneous active power and squared signals.
        const p = va * ia + vb * ib + vc * ic;

        // Averaging filter (1st-order LPF). alpha = dt/(tau+dt); 0 Hz bypasses.
        let alpha = 1;
        if (this._averagingFrequencyHz > 0 && dt > 0) {
            const tau = 1 / (2 * Math.PI * this._averagingFrequencyHz);
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
        this._activePower = this._emaP;
        this._apparentPower = 3 * vrms * irms;
        this._reactivePower = Math.sqrt(Math.max(0, this._apparentPower * this._apparentPower - this._activePower * this._activePower));
        this._powerFactor = this._apparentPower > 1e-12 ? this._activePower / this._apparentPower : 0;

        // Active energy from the true instantaneous power; reactive energy
        // accumulates the (magnitude) reactive power.
        if (dt > 0) {
            this._activeEnergy += p * dt;
            this._reactiveEnergy += this._reactivePower * dt;
        }

        // dq channel (instantaneous, signed).
        this._activePowerDq = 1.5 * (vd * id + vq * iq);
        this._reactivePowerDq = 1.5 * (vq * id - vd * iq);

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "activePower":
                    session.publish(idx, this._activePower);
                    break;
                case "reactivePower":
                    session.publish(idx, this._reactivePower);
                    break;
                case "apparentPower":
                    session.publish(idx, this._apparentPower);
                    break;
                case "powerFactor":
                    session.publish(idx, this._powerFactor);
                    break;
                case "activeEnergy":
                    session.publish(idx, this._activeEnergy);
                    break;
                case "reactiveEnergy":
                    session.publish(idx, this._reactiveEnergy);
                    break;
                case "activePowerDq":
                    session.publish(idx, this._activePowerDq);
                    break;
                case "reactivePowerDq":
                    session.publish(idx, this._reactivePowerDq);
                    break;
            }
        }
    }
}

export function createPowerMeterNode(): PowerMeterNode {
    return new PowerMeterNode();
}
