import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IntegrableRuntimeNode, IOlink, IPortDescriptor, ISession, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable, IHasSampleRateRequirement } from "spikypanda-core";
import { hallSector } from "./back-emf.js";

/**
 * 6-step BLDC inverter — produces 3-phase line-to-neutral voltages from
 * a DC bus, a dutyCycle (0..1), and the rotor's electrical angle (via Hall
 * sensors in real hardware, simulated here as a direct θ_e input).
 *
 * Standard commutation table indexed by 60° sector (0..5):
 *
 *     sector | phaseVoltageA       | phaseVoltageB       | phaseVoltageC
 *     -------|-----------|-----------|----------
 *     0      | +V        | -V        | 0
 *     1      | +V        | 0         | -V
 *     2      | 0         | +V        | -V
 *     3      | -V        | +V        | 0
 *     4      | -V        | 0         | +V
 *     5      | 0         | -V        | +V
 *
 * where V = dutyCycle · dcBusVoltage / 2 (line-to-neutral after Y-connection split).
 * PWM is modeled as average voltage (no individual switching cycle —
 * appropriate for a 100 µs sim step against a 20 kHz PWM carrier).
 *
 * Inputs:
 *   dcBusVoltage      DC bus voltage [V]
 *   dutyCycle      [0..1] (clamped); negative dutyCycle reverses rotation
 *   electricalAngle   electrical angle [rad] — usually fed by the motor's
 *             `rotorAngle` output multiplied by polePairs (pole pairs). When unwired
 *             defaults to 0, locking the inverter to sector 0.
 *
 * Outputs: phaseVoltageA, phaseVoltageB, phaseVoltageC, sector (informational).
 */
export class BldcInverterNode extends IntegrableRuntimeNode implements IDeclaresPorts, IHasSampleRateRequirement {
    /** 6-step commutation against a documented 20 kHz PWM carrier:
     *  the average-voltage model assumes we sample at 100 µs against
     *  the 50 µs carrier. We honor 10 kHz as the parameter-independent
     *  baseline; users can pin a higher rate if they model a higher
     *  carrier frequency. */
    protected override computeRequiredHz(): number {
        return 10_000;
    }

    @cloneable private _defaultDcBusVoltage: number = 24;

    @cloneable private _Va: number = 0;
    @cloneable private _Vb: number = 0;
    @cloneable private _Vc: number = 0;
    @cloneable private _sector: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "dcBusVoltage", optional: true, type: "float" },
        { slot: "dutyCycle", optional: true, type: "float" },
        { slot: "electricalAngle", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "phaseVoltageA", optional: false, type: "float" },
        { slot: "phaseVoltageB", optional: false, type: "float" },
        { slot: "phaseVoltageC", optional: false, type: "float" },
        { slot: "sector", optional: false, type: "float" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number") public get defaultDcBusVoltage(): number {
        return this._defaultDcBusVoltage;
    }
    public set defaultDcBusVoltage(v: number) {
        this.setField("defaultDcBusVoltage", this._defaultDcBusVoltage, v, (n) => {
            this._defaultDcBusVoltage = n;
        });
    }

    @viewable("number") public get phaseVoltageA(): number {
        return this._Va;
    }
    @viewable("number") public get phaseVoltageB(): number {
        return this._Vb;
    }
    @viewable("number") public get phaseVoltageC(): number {
        return this._Vc;
    }
    @viewable("number") public get sector(): number {
        return this._sector;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let dcBusVoltage = this._defaultDcBusVoltage,
            dutyCycle = 0,
            thetaE = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if (slot === "dcBusVoltage") dcBusVoltage = value;
            else if (slot === "dutyCycle") dutyCycle = value;
            else if (slot === "electricalAngle") thetaE = value;
        }

        const sector = hallSector(thetaE);
        const sign = dutyCycle >= 0 ? 1 : -1;
        const V = (sign * Math.min(Math.abs(dutyCycle), 1) * dcBusVoltage) / 2;

        let Va = 0,
            Vb = 0,
            Vc = 0;
        // 6-step commutation table. Per standard convention:
        // sector 0 (θ_e ∈ [-30°, 30°)):  +A, -B, C floating
        switch (sector) {
            case 0:
                Va = V;
                Vb = -V;
                Vc = 0;
                break;
            case 1:
                Va = V;
                Vb = 0;
                Vc = -V;
                break;
            case 2:
                Va = 0;
                Vb = V;
                Vc = -V;
                break;
            case 3:
                Va = -V;
                Vb = V;
                Vc = 0;
                break;
            case 4:
                Va = -V;
                Vb = 0;
                Vc = V;
                break;
            case 5:
                Va = 0;
                Vb = -V;
                Vc = V;
                break;
        }

        this.setField("phaseVoltageA", this._Va, Va, (n) => {
            this._Va = n;
        });
        this.setField("phaseVoltageB", this._Vb, Vb, (n) => {
            this._Vb = n;
        });
        this.setField("phaseVoltageC", this._Vc, Vc, (n) => {
            this._Vc = n;
        });
        this.setField("sector", this._sector, sector, (n) => {
            this._sector = n;
        });

        const broadcast = (slot: string, val: unknown): void => {
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== slot || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, val);
            }
        };
        broadcast("phaseVoltageA", Va);
        broadcast("phaseVoltageB", Vb);
        broadcast("phaseVoltageC", Vc);
        broadcast("sector", sector);
    }
}

export function createBldcInverterNode(): BldcInverterNode {
    return new BldcInverterNode();
}
