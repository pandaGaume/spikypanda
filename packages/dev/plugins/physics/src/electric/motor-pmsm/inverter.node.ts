import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Three-phase voltage source inverter, averaged. Faithful port of the
 * legacy `sensors` ThreePhaseInverter, the validation oracle.
 *
 * Maps the dutyCycle cycles (dutyCycleA, dutyCycleB, dutyCycleC) in [0, 1] produced by the
 * SVPWM modulator into line-neutral phase voltages:
 *
 *   phaseVoltageA = (2*dutyCycleA - dutyCycleB - dutyCycleC) * dcBusVoltage / 3
 *   phaseVoltageB = (-dutyCycleA + 2*dutyCycleB - dutyCycleC) * dcBusVoltage / 3
 *   phaseVoltageC = (-dutyCycleA - dutyCycleB + 2*dutyCycleC) * dcBusVoltage / 3
 *
 * This is the average of a 2-level VSI driven by complementary PWM with
 * zero deadtime, referenced to the star neutral: it subtracts the common-
 * mode voltage from the phase-to-bus-negative voltages duty_k * dcBusVoltage.
 * Any zero-sequence content injected by the SVPWM cancels here, so the
 * Clarke transform of (phaseVoltageA, phaseVoltageB, phaseVoltageC) recovers the original (voltageAlpha,
 * voltageBeta) in the linear range. That round trip is the chain invariant.
 *
 * Phase-1 model: ideal switches, no switching, no deadtime, no on-
 * resistance. The right level of detail for FOC closed-loop validation
 * and MCSA spectrum work; a switching variant (deadtime, on-resistance,
 * free-wheeling diode) is future work behind the same ports.
 *
 * Stateless: each fire reads inputs and computes phase voltages; no
 * integration, no allocation in the hot path. Wire phaseVoltageA/phaseVoltageB/phaseVoltageC to the
 * PMSM machine node.
 */
export class PmsmInverterNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _dcBusVoltage: number = 24;

    @cloneable private _va: number = 0;
    @cloneable private _vb: number = 0;
    @cloneable private _vc: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "dutyCycleA", optional: true, type: "float" },
        { slot: "dutyCycleB", optional: true, type: "float" },
        { slot: "dutyCycleC", optional: true, type: "float" },
        { slot: "dcBusVoltage", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "phaseVoltageA", optional: false, type: "float" },
        { slot: "phaseVoltageB", optional: false, type: "float" },
        { slot: "phaseVoltageC", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
    @editable("number", { unit: { quantity: "Voltage", unit: "volt" } }) public get dcBusVoltage(): number {
        return this._dcBusVoltage;
    }
    public set dcBusVoltage(v: number) {
        this.setField("dcBusVoltage", this._dcBusVoltage, v, (n) => (this._dcBusVoltage = n));
    }

    // ── Viewables ──────────────────────────────────────────────────────
    @viewable("number") public get phaseVoltageA(): number {
        return this._va;
    }
    @viewable("number") public get phaseVoltageB(): number {
        return this._vb;
    }
    @viewable("number") public get phaseVoltageC(): number {
        return this._vc;
    }

    public override reset(_session: ISession): void {
        this._va = 0;
        this._vb = 0;
        this._vc = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        // Idle (no duties wired) parks at the centered point -> zero LN.
        let dutyA = 0.5,
            dutyB = 0.5,
            dutyC = 0.5,
            dcBusVoltage = this._dcBusVoltage;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "dutyCycleA") dutyA = value;
            else if (slot === "dutyCycleB") dutyB = value;
            else if (slot === "dutyCycleC") dutyC = value;
            else if (slot === "dcBusVoltage") dcBusVoltage = value;
        }

        const v = dcBusVoltage / 3;
        this._va = v * (2 * dutyA - dutyB - dutyC);
        this._vb = v * (-dutyA + 2 * dutyB - dutyC);
        this._vc = v * (-dutyA - dutyB + 2 * dutyC);

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "phaseVoltageA":
                    session.publish(idx, this._va);
                    break;
                case "phaseVoltageB":
                    session.publish(idx, this._vb);
                    break;
                case "phaseVoltageC":
                    session.publish(idx, this._vc);
                    break;
            }
        }
    }
}

export function createPmsmInverterNode(): PmsmInverterNode {
    return new PmsmInverterNode();
}
