import {
    cloneable,
    editable,
    viewable,
    IChannel,
    IDeclaresPorts,
    IIntegrable,
    IIntegrationInputs,
    IOlink,
    IPortDescriptor,
    ISession,
    IntegrableRuntimeNode,
    inSlotOf,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * `Physics.Electric:battery`: an energy reserve drained by the loads
 * wired into it, reported as a state of charge.
 *
 * Physical thesis: over hours, a battery is a bucket of energy. The
 * chemistry (voltage sag, temperature, internal resistance) matters for
 * seconds and for sizing; for a night's budget what matters is the
 * integral of the power drawn. So:
 *
 *     d(energyUsedWh)/dt = (powerA + powerB + powerC + powerD + otherLoadsW) / 3600     [Wh per second]
 *     stateOfChargePercent = 100 * (capacityWh - energyUsedAtResetWh - energyUsedWh) / capacityWh
 *
 * `otherLoadsW` is everything the graph does not model explicitly, held
 * constant. The state of charge is clamped to [0, 100]: an empty battery
 * stays empty, the node does not go negative.
 *
 * Every constant is an editable so the power budget is reviewable in the
 * panel and in the saved document.
 */
export class BatteryNode extends IntegrableRuntimeNode implements IDeclaresPorts, IIntegrable {
    public readonly stateSize = 1;
    public readonly stateNames: ReadonlyArray<string> = ["energyUsedWh"];

    @cloneable private _capacityWh: number = 40000;
    @cloneable private _initialStateOfChargePercent: number = 100;
    @cloneable private _otherLoadsW: number = 0;

    @cloneable private _energyUsedWh: number = 0;
    @cloneable private _stateOfChargePercent: number = 100;
    @cloneable private _loadW: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "powerA", optional: true, type: "float", kind: "signal" },
        { slot: "powerB", optional: true, type: "float", kind: "signal" },
        { slot: "powerC", optional: true, type: "float", kind: "signal" },
        { slot: "powerD", optional: true, type: "float", kind: "signal" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "stateOfChargePercent", optional: false, type: "float", kind: "signal" },
        { slot: "energyUsedWh", optional: false, type: "float", kind: "signal" },
        { slot: "remainingWh", optional: false, type: "float", kind: "signal" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /** A reserve drains over hours; one sample a minute is enough. */
    protected override computeRequiredHz(): number {
        return 1 / 60;
    }

    @editable("number", { unit: { quantity: "Energy", unit: "Wh" } }) public get capacityWh(): number {
        return this._capacityWh;
    }
    public set capacityWh(v: number) {
        this.setField("capacityWh", this._capacityWh, Math.max(1e-9, v), (n) => (this._capacityWh = n));
    }
    @editable("number") public get initialStateOfChargePercent(): number {
        return this._initialStateOfChargePercent;
    }
    public set initialStateOfChargePercent(v: number) {
        this.setField("initialStateOfChargePercent", this._initialStateOfChargePercent, Math.max(0, Math.min(100, v)), (n) => (this._initialStateOfChargePercent = n));
    }
    @editable("number", { unit: { quantity: "Power", unit: "watt" } }) public get otherLoadsW(): number {
        return this._otherLoadsW;
    }
    public set otherLoadsW(v: number) {
        this.setField("otherLoadsW", this._otherLoadsW, Math.max(0, v), (n) => (this._otherLoadsW = n));
    }

    @viewable("number") public get stateOfChargePercent(): number {
        return this._stateOfChargePercent;
    }
    @viewable("number", { unit: { quantity: "Energy", unit: "Wh" } }) public get energyUsedWh(): number {
        return this._energyUsedWh;
    }
    @viewable("number", { unit: { quantity: "Energy", unit: "Wh" } }) public get remainingWh(): number {
        return (this._stateOfChargePercent / 100) * this._capacityWh;
    }
    /** Total load on the last tick, in watts (the wired powers plus the other loads). */
    @viewable("number", { unit: { quantity: "Power", unit: "watt" } }) public get loadW(): number {
        return this._loadW;
    }

    private _stateOfChargeFor(energyUsedWh: number): number {
        const initialWh = (this._initialStateOfChargePercent / 100) * this._capacityWh;
        const remaining = Math.max(0, initialWh - energyUsedWh);
        return Math.max(0, Math.min(100, (100 * remaining) / this._capacityWh));
    }

    public gatherState(y: Float64Array, offset: number): void {
        y[offset] = this._energyUsedWh;
    }

    public writeState(y: Float64Array, offset: number): void {
        const used = Math.max(0, y[offset]);
        this.setField("energyUsedWh", this._energyUsedWh, used, (n) => (this._energyUsedWh = n));
        this.setField("stateOfChargePercent", this._stateOfChargePercent, this._stateOfChargeFor(used), (n) => (this._stateOfChargePercent = n));
    }

    public rhs(_t: number, _y: Float64Array, offset: number, inputs: IIntegrationInputs, dydt: Float64Array): void {
        // Pure: the load is recomputed from the inputs snapshot, nothing is stored here.
        const load = (inputs.get("powerA") ?? 0) + (inputs.get("powerB") ?? 0) + (inputs.get("powerC") ?? 0) + (inputs.get("powerD") ?? 0) + this._otherLoadsW;
        dydt[offset] = load / 3600;
    }

    public override reset(session: ISession): void {
        super.reset(session);
        this.setField("energyUsedWh", this._energyUsedWh, 0, (n) => (this._energyUsedWh = n));
        this.setField("stateOfChargePercent", this._stateOfChargePercent, this._stateOfChargeFor(0), (n) => (this._stateOfChargePercent = n));
        this._loadW = this._otherLoadsW;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        // The total load, for the panel: the wired powers read as signals, plus the other loads.
        let load = this._otherLoadsW;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            const value = session.readSignal(idx);
            if (typeof value === "number" && Number.isFinite(value) && String(inSlotOf(link)).startsWith("power")) load += value;
        }
        this.setField("loadW", this._loadW, load, (n) => (this._loadW = n));
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "stateOfChargePercent":
                    session.publish(idx, this._stateOfChargePercent);
                    break;
                case "energyUsedWh":
                    session.publish(idx, this._energyUsedWh);
                    break;
                case "remainingWh":
                    session.publish(idx, this.remainingWh);
                    break;
            }
        }
    }
}

export function createBatteryNode(): BatteryNode {
    return new BatteryNode();
}
