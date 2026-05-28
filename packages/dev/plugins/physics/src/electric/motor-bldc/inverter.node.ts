import {
    cloneable, editable, viewable,
    IChannel, IDeclaresPorts, IOlink, IPortDescriptor,
    ISession, RuntimeNode, inSlotOf,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import { hallSector } from "./back-emf.js";

/**
 * 6-step BLDC inverter — produces 3-phase line-to-neutral voltages from
 * a DC bus, a duty (0..1), and the rotor's electrical angle (via Hall
 * sensors in real hardware, simulated here as a direct θ_e input).
 *
 * Standard commutation table indexed by 60° sector (0..5):
 *
 *     sector | V_a       | V_b       | V_c
 *     -------|-----------|-----------|----------
 *     0      | +V        | -V        | 0
 *     1      | +V        | 0         | -V
 *     2      | 0         | +V        | -V
 *     3      | -V        | +V        | 0
 *     4      | -V        | 0         | +V
 *     5      | 0         | -V        | +V
 *
 * where V = duty · V_dc / 2 (line-to-neutral after Y-connection split).
 * PWM is modeled as average voltage (no individual switching cycle —
 * appropriate for a 100 µs sim step against a 20 kHz PWM carrier).
 *
 * Inputs:
 *   V_dc      DC bus voltage [V]
 *   duty      [0..1] (clamped); negative duty reverses rotation
 *   theta_e   electrical angle [rad] — usually fed by the motor's
 *             `theta_m` output multiplied by P (pole pairs). When unwired
 *             defaults to 0, locking the inverter to sector 0.
 *
 * Outputs: V_a, V_b, V_c, sector (informational).
 */
export class BldcInverterNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _VdcDefault: number = 24;

    @cloneable private _Va: number = 0;
    @cloneable private _Vb: number = 0;
    @cloneable private _Vc: number = 0;
    @cloneable private _sector: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "V_dc",    optional: true, type: "float" },
        { slot: "duty",    optional: true, type: "float" },
        { slot: "theta_e", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "V_a",    optional: false, type: "float" },
        { slot: "V_b",    optional: false, type: "float" },
        { slot: "V_c",    optional: false, type: "float" },
        { slot: "sector", optional: false, type: "float" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number") public get V_dc_default(): number { return this._VdcDefault; }
    public set V_dc_default(v: number) { this.setField("V_dc_default", this._VdcDefault, v, (n) => { this._VdcDefault = n; }); }

    @viewable("number") public get V_a(): number    { return this._Va; }
    @viewable("number") public get V_b(): number    { return this._Vb; }
    @viewable("number") public get V_c(): number    { return this._Vc; }
    @viewable("number") public get sector(): number { return this._sector; }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let Vdc = this._VdcDefault, duty = 0, thetaE = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            if (typeof value !== "number") continue;
            if      (slot === "V_dc")    Vdc = value;
            else if (slot === "duty")    duty = value;
            else if (slot === "theta_e") thetaE = value;
        }

        const sector = hallSector(thetaE);
        const sign = duty >= 0 ? 1 : -1;
        const V = (sign * Math.min(Math.abs(duty), 1)) * Vdc / 2;

        let Va = 0, Vb = 0, Vc = 0;
        // 6-step commutation table. Per standard convention:
        // sector 0 (θ_e ∈ [-30°, 30°)):  +A, -B, C floating
        switch (sector) {
            case 0: Va =  V; Vb = -V; Vc =  0; break;
            case 1: Va =  V; Vb =  0; Vc = -V; break;
            case 2: Va =  0; Vb =  V; Vc = -V; break;
            case 3: Va = -V; Vb =  V; Vc =  0; break;
            case 4: Va = -V; Vb =  0; Vc =  V; break;
            case 5: Va =  0; Vb = -V; Vc =  V; break;
        }

        this.setField("V_a",    this._Va,     Va,     (n) => { this._Va = n; });
        this.setField("V_b",    this._Vb,     Vb,     (n) => { this._Vb = n; });
        this.setField("V_c",    this._Vc,     Vc,     (n) => { this._Vc = n; });
        this.setField("sector", this._sector, sector, (n) => { this._sector = n; });

        const broadcast = (slot: string, val: unknown): void => {
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== slot || !link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, val);
            }
        };
        broadcast("V_a",    Va);
        broadcast("V_b",    Vb);
        broadcast("V_c",    Vc);
        broadcast("sector", sector);
    }
}

export function createBldcInverterNode(): BldcInverterNode {
    return new BldcInverterNode();
}
