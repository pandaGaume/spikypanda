import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Three-phase voltage source inverter, averaged. Faithful port of the
 * legacy `sensors` ThreePhaseInverter, the validation oracle.
 *
 * Maps the duty cycles (duty_a, duty_b, duty_c) in [0, 1] produced by the
 * SVPWM modulator into line-neutral phase voltages:
 *
 *   v_a = (2*duty_a - duty_b - duty_c) * v_bus / 3
 *   v_b = (-duty_a + 2*duty_b - duty_c) * v_bus / 3
 *   v_c = (-duty_a - duty_b + 2*duty_c) * v_bus / 3
 *
 * This is the average of a 2-level VSI driven by complementary PWM with
 * zero deadtime, referenced to the star neutral: it subtracts the common-
 * mode voltage from the phase-to-bus-negative voltages duty_k * v_bus.
 * Any zero-sequence content injected by the SVPWM cancels here, so the
 * Clarke transform of (v_a, v_b, v_c) recovers the original (V_alpha,
 * V_beta) in the linear range. That round trip is the chain invariant.
 *
 * Phase-1 model: ideal switches, no switching, no deadtime, no on-
 * resistance. The right level of detail for FOC closed-loop validation
 * and MCSA spectrum work; a switching variant (deadtime, on-resistance,
 * free-wheeling diode) is future work behind the same ports.
 *
 * Stateless: each fire reads inputs and computes phase voltages; no
 * integration, no allocation in the hot path. Wire V_a/V_b/V_c to the
 * PMSM machine node.
 */
export class PmsmInverterNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _vBus: number = 24;

    @cloneable private _va: number = 0;
    @cloneable private _vb: number = 0;
    @cloneable private _vc: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "duty_a", optional: true, type: "float" },
        { slot: "duty_b", optional: true, type: "float" },
        { slot: "duty_c", optional: true, type: "float" },
        { slot: "v_bus", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "V_a", optional: false, type: "float" },
        { slot: "V_b", optional: false, type: "float" },
        { slot: "V_c", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ──────────────────────────────────────────────────────
    @editable("number", { unit: "V" }) public get vBus(): number {
        return this._vBus;
    }
    public set vBus(v: number) {
        this.setField("vBus", this._vBus, v, (n) => (this._vBus = n));
    }

    // ── Viewables ──────────────────────────────────────────────────────
    @viewable("number") public get V_a(): number {
        return this._va;
    }
    @viewable("number") public get V_b(): number {
        return this._vb;
    }
    @viewable("number") public get V_c(): number {
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
            vBus = this._vBus;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "duty_a") dutyA = value;
            else if (slot === "duty_b") dutyB = value;
            else if (slot === "duty_c") dutyC = value;
            else if (slot === "v_bus") vBus = value;
        }

        const v = vBus / 3;
        this._va = v * (2 * dutyA - dutyB - dutyC);
        this._vb = v * (-dutyA + 2 * dutyB - dutyC);
        this._vc = v * (-dutyA - dutyB + 2 * dutyC);

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "V_a":
                    session.publish(idx, this._va);
                    break;
                case "V_b":
                    session.publish(idx, this._vb);
                    break;
                case "V_c":
                    session.publish(idx, this._vc);
                    break;
            }
        }
    }
}

export function createPmsmInverterNode(): PmsmInverterNode {
    return new PmsmInverterNode();
}
