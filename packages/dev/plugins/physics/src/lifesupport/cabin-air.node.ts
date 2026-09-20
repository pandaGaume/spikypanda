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
 * `Physics.LifeSupport:cabin-air`: the CO2 balance of a sealed, well-mixed
 * cabin, in ppm, and the three states the life-support rules read.
 *
 * Physical thesis: in a well-mixed volume the CO2 concentration is one
 * number; it rises with what the crew exhales, falls with what the
 * scrubber removes, and loses a small fraction per minute to leakage
 * (seals, airlock cycles). The absorbent removes in proportion to the
 * excess above a floor (it works on the partial pressure: a cabin near
 * ambient gives it nothing to remove) and to the scrubber's effective
 * rate. With the sources expressed as concentration rates for this
 * volume:
 *
 *     removal      = scrubberRate * max(co2Ppm - removalFloorPpm, 0)                       [ppm/min]
 *     d(co2Ppm)/dt = emissionA + emissionB + emissionC + emissionD - removal - leakPerMinute * co2Ppm
 *
 * clamped between a numerical floor and ceiling. The state is the one
 * integrated variable; the solver of the enclosing scene owns it, and
 * the removal is a continuous function of that state, which is why it
 * is computed here and not in the scrubber node.
 *
 * Three states by two thresholds, the alarm levels of the rules that
 * govern the scrubber (MIN-FLOW forbids a low flow while ELEVATED and
 * forces full flow while CRITICAL):
 *
 *     NOMINAL   co2Ppm <  elevatedPpm
 *     ELEVATED  elevatedPpm <= co2Ppm < criticalPpm
 *     CRITICAL  co2Ppm >= criticalPpm
 *
 * The thresholds are editables here so the twin shows the same states as
 * the device; in the demo they are set from the contract, never typed
 * twice. This is the reference model of the CO2 control sample.
 *
 * Time base: the session runs in seconds; the per-minute rates are
 * converted inside `rhs`.
 */
export const CABIN_STATE_NOMINAL = 0;
export const CABIN_STATE_ELEVATED = 1;
export const CABIN_STATE_CRITICAL = 2;

export class CabinAirNode extends IntegrableRuntimeNode implements IDeclaresPorts, IIntegrable {
    public readonly stateSize = 1;
    public readonly stateNames: ReadonlyArray<string> = ["co2Ppm"];

    @cloneable private _initialPpm: number = 1500;
    @cloneable private _leakPerMinute: number = 0.001;
    @cloneable private _removalFloorPpm: number = 400;
    @cloneable private _floorPpm: number = 300;
    @cloneable private _ceilingPpm: number = 10000;
    @cloneable private _elevatedPpm: number = 3500;
    @cloneable private _criticalPpm: number = 4000;

    @cloneable private _co2Ppm: number = 1500;
    @cloneable private _state: number = CABIN_STATE_NOMINAL;
    @cloneable private _removal: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "scrubberRate", optional: true, type: "float", kind: "signal" },
        { slot: "emissionA", optional: true, type: "float", kind: "signal" },
        { slot: "emissionB", optional: true, type: "float", kind: "signal" },
        { slot: "emissionC", optional: true, type: "float", kind: "signal" },
        { slot: "emissionD", optional: true, type: "float", kind: "signal" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "co2Ppm", optional: false, type: "float", kind: "signal" },
        { slot: "state", optional: false, type: "float", kind: "signal" },
        { slot: "removal", optional: false, type: "float", kind: "signal" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /** The cabin moves in minutes; one sample per six seconds resolves it. */
    protected override computeRequiredHz(): number {
        return 1 / 6;
    }

    @editable("number") public get initialPpm(): number {
        return this._initialPpm;
    }
    public set initialPpm(v: number) {
        this.setField("initialPpm", this._initialPpm, Math.max(0, v), (n) => (this._initialPpm = n));
    }
    @editable("number") public get leakPerMinute(): number {
        return this._leakPerMinute;
    }
    public set leakPerMinute(v: number) {
        this.setField("leakPerMinute", this._leakPerMinute, Math.max(0, v), (n) => (this._leakPerMinute = n));
    }
    /** The absorbent removes in proportion to the excess above this level. */
    @editable("number") public get removalFloorPpm(): number {
        return this._removalFloorPpm;
    }
    public set removalFloorPpm(v: number) {
        this.setField("removalFloorPpm", this._removalFloorPpm, Math.max(0, v), (n) => (this._removalFloorPpm = n));
    }
    @editable("number") public get floorPpm(): number {
        return this._floorPpm;
    }
    public set floorPpm(v: number) {
        this.setField("floorPpm", this._floorPpm, Math.max(0, v), (n) => (this._floorPpm = n));
    }
    @editable("number") public get ceilingPpm(): number {
        return this._ceilingPpm;
    }
    public set ceilingPpm(v: number) {
        this.setField("ceilingPpm", this._ceilingPpm, Math.max(1, v), (n) => (this._ceilingPpm = n));
    }
    @editable("number") public get elevatedPpm(): number {
        return this._elevatedPpm;
    }
    public set elevatedPpm(v: number) {
        this.setField("elevatedPpm", this._elevatedPpm, Math.max(0, v), (n) => (this._elevatedPpm = n));
    }
    @editable("number") public get criticalPpm(): number {
        return this._criticalPpm;
    }
    public set criticalPpm(v: number) {
        this.setField("criticalPpm", this._criticalPpm, Math.max(0, v), (n) => (this._criticalPpm = n));
    }

    /** The cabin CO2 right now, in ppm. */
    @viewable("number") public get co2Ppm(): number {
        return this._co2Ppm;
    }
    /** 0 NOMINAL, 1 ELEVATED, 2 CRITICAL. */
    @viewable("number") public get state(): number {
        return this._state;
    }
    /** CO2 removed by the scrubber on the last tick, in ppm per minute. */
    @viewable("number") public get removal(): number {
        return this._removal;
    }

    /** The removal at a concentration for a scrubber rate, with this node's floor. */
    public removalAt(ppm: number, scrubberRate: number): number {
        return Math.max(0, scrubberRate) * Math.max(ppm - this._removalFloorPpm, 0);
    }

    /** The state a concentration falls in, with this node's thresholds. */
    public stateOf(ppm: number): number {
        if (ppm >= this._criticalPpm) return CABIN_STATE_CRITICAL;
        if (ppm >= this._elevatedPpm) return CABIN_STATE_ELEVATED;
        return CABIN_STATE_NOMINAL;
    }

    private _clamp(ppm: number): number {
        return Math.max(this._floorPpm, Math.min(this._ceilingPpm, ppm));
    }

    public gatherState(y: Float64Array, offset: number): void {
        y[offset] = this._co2Ppm;
    }

    public writeState(y: Float64Array, offset: number): void {
        const ppm = this._clamp(y[offset]);
        this.setField("co2Ppm", this._co2Ppm, ppm, (n) => (this._co2Ppm = n));
        this.setField("state", this._state, this.stateOf(ppm), (n) => (this._state = n));
    }

    public rhs(_t: number, y: Float64Array, offset: number, inputs: IIntegrationInputs, dydt: Float64Array): void {
        const ppm = y[offset];
        const emission = (inputs.get("emissionA") ?? 0) + (inputs.get("emissionB") ?? 0) + (inputs.get("emissionC") ?? 0) + (inputs.get("emissionD") ?? 0);
        const removal = this.removalAt(ppm, inputs.get("scrubberRate") ?? 0);
        const perMinute = emission - removal - this._leakPerMinute * ppm;
        // Sitting on a bound, the balance may only move away from it.
        if ((ppm <= this._floorPpm && perMinute < 0) || (ppm >= this._ceilingPpm && perMinute > 0)) {
            dydt[offset] = 0;
            return;
        }
        dydt[offset] = perMinute / 60;
    }

    public override reset(session: ISession): void {
        super.reset(session);
        const ppm = this._clamp(this._initialPpm);
        this.setField("co2Ppm", this._co2Ppm, ppm, (n) => (this._co2Ppm = n));
        this.setField("state", this._state, this.stateOf(ppm), (n) => (this._state = n));
        this._removal = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        // The removal shown and published is the one at the integrated state and the latest rate signal.
        let scrubberRate = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled || inSlotOf(link) !== "scrubberRate") continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            const value = session.readSignal(idx);
            if (typeof value === "number" && Number.isFinite(value)) scrubberRate = value;
        }
        const removal = this.removalAt(this._co2Ppm, scrubberRate);
        this.setField("removal", this._removal, removal, (n) => (this._removal = n));
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (link.slot === "co2Ppm") session.publish(idx, this._co2Ppm);
            else if (link.slot === "state") session.publish(idx, this._state);
            else if (link.slot === "removal") session.publish(idx, removal);
        }
    }
}

export function createCabinAirNode(): CabinAirNode {
    return new CabinAirNode();
}
