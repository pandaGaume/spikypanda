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
 * `Physics.LifeSupport:scrubber`: the CO2 sink of a cabin, a fan that pulls
 * the air through absorbent beds, with its power draw.
 *
 * Physical thesis: the beds remove CO2 in proportion to the flow the fan
 * pushes through them, and the flow follows the command with a lag:
 * chemical activation and gas transport take minutes, so a scrubber
 * ordered to full command does not remove at full rate at once. This node
 * owns that lag, as a removal RATE in 1/min for the cabin's volume:
 *
 *     target       = rateAtFullCommandPerMinute * command          [1/min], command in 0..1
 *     d(rate)/dt   = (target - rate) / lagTimeConstantMinutes       (the one integrated state)
 *
 * The removal itself, rate * (excess of CO2 above the absorbent's floor),
 * is computed by the cabin node from its own integrated concentration:
 * that keeps the loop cabin -> scrubber -> cabin out of the graph (no
 * feedback channel, no one-tick lag) and lets the solver see the removal
 * as a continuous function of the state.
 *
 * The power draw has the shape of the real motor on the bench, the
 * current-versus-command line the factory's fit job measured, scaled to
 * habitat size:
 *
 *     power = supplyVolts * (interceptAmps + slopeAmps * command) * habitatScale   [W]
 *
 * This is the reference model of the CO2 control sample (removal
 * proportional to the excess, first-order lag), with a continuous command
 * in place of its four levels. Every constant is an editable, reviewable
 * in the panel and in the saved document.
 *
 * Time base: the session runs in seconds; the per-minute constants are
 * converted inside `rhs`, so one story minute is sixty seconds of
 * simulation.
 */
export class ScrubberNode extends IntegrableRuntimeNode implements IDeclaresPorts, IIntegrable {
    public readonly stateSize = 1;
    public readonly stateNames: ReadonlyArray<string> = ["effectiveRatePerMinute"];

    @cloneable private _rateAtFullCommand: number = 0.05;
    @cloneable private _lagTimeConstantMinutes: number = 3.33;
    @cloneable private _supplyVolts: number = 6;
    @cloneable private _interceptAmps: number = 0.0879;
    @cloneable private _slopeAmps: number = 0.1611;
    @cloneable private _habitatScale: number = 300;
    @cloneable private _initialEffectiveRate: number = 0;

    @cloneable private _rate: number = 0;
    @cloneable private _power: number = 0;
    @cloneable private _command: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "command", optional: true, type: "float", kind: "signal" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "power", optional: false, type: "float", kind: "signal" },
        { slot: "effectiveRate", optional: false, type: "float", kind: "signal" },
        { slot: "effectiveFraction", optional: false, type: "float", kind: "signal" },
    ];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /** The lag is minutes long; ten samples per time constant is plenty. */
    protected override computeRequiredHz(): number {
        const tauSeconds = Math.max(1, this._lagTimeConstantMinutes * 60);
        return Math.max(0.01, 10 / tauSeconds);
    }

    @editable("number") public get rateAtFullCommandPerMinute(): number {
        return this._rateAtFullCommand;
    }
    public set rateAtFullCommandPerMinute(v: number) {
        this.setField("rateAtFullCommandPerMinute", this._rateAtFullCommand, Math.max(0, v), (n) => (this._rateAtFullCommand = n));
    }
    @editable("number") public get lagTimeConstantMinutes(): number {
        return this._lagTimeConstantMinutes;
    }
    public set lagTimeConstantMinutes(v: number) {
        this.setField("lagTimeConstantMinutes", this._lagTimeConstantMinutes, Math.max(1e-3, v), (n) => (this._lagTimeConstantMinutes = n));
        this.notifyComputedRequiredHzMayHaveChanged();
    }
    @editable("number", { unit: { quantity: "Voltage", unit: "V" } }) public get supplyVolts(): number {
        return this._supplyVolts;
    }
    public set supplyVolts(v: number) {
        this.setField("supplyVolts", this._supplyVolts, Math.max(0, v), (n) => (this._supplyVolts = n));
    }
    @editable("number", { unit: { quantity: "Current", unit: "A" } }) public get interceptAmps(): number {
        return this._interceptAmps;
    }
    public set interceptAmps(v: number) {
        this.setField("interceptAmps", this._interceptAmps, v, (n) => (this._interceptAmps = n));
    }
    @editable("number", { unit: { quantity: "Current", unit: "A" } }) public get slopeAmps(): number {
        return this._slopeAmps;
    }
    public set slopeAmps(v: number) {
        this.setField("slopeAmps", this._slopeAmps, v, (n) => (this._slopeAmps = n));
    }
    @editable("number") public get habitatScale(): number {
        return this._habitatScale;
    }
    public set habitatScale(v: number) {
        this.setField("habitatScale", this._habitatScale, Math.max(0, v), (n) => (this._habitatScale = n));
    }
    /** Effective rate at reset, in 1/min (0: the scrubber starts cold). */
    @editable("number") public get initialEffectiveRatePerMinute(): number {
        return this._initialEffectiveRate;
    }
    public set initialEffectiveRatePerMinute(v: number) {
        this.setField("initialEffectiveRatePerMinute", this._initialEffectiveRate, Math.max(0, v), (n) => (this._initialEffectiveRate = n));
    }

    /** Effective removal rate right now, in 1/min. */
    @viewable("number") public get effectiveRatePerMinute(): number {
        return this._rate;
    }
    /** Effective rate as a fraction of the full-command rate (0 to 1). */
    @viewable("number") public get effectiveFraction(): number {
        return this._rateAtFullCommand > 0 ? this._rate / this._rateAtFullCommand : 0;
    }
    /** The command read on the last tick (0 to 1). */
    @viewable("number") public get command(): number {
        return this._command;
    }
    /** Electrical power drawn on the last tick, in watts. */
    @viewable("number", { unit: { quantity: "Power", unit: "watt" } }) public get power(): number {
        return this._power;
    }

    /** The power law, exposed for the jobs that plan on energy. */
    public powerAt(command: number): number {
        const u = Math.max(0, Math.min(1, command));
        return this._supplyVolts * (this._interceptAmps + this._slopeAmps * u) * this._habitatScale;
    }

    public gatherState(y: Float64Array, offset: number): void {
        y[offset] = this._rate;
    }

    public writeState(y: Float64Array, offset: number): void {
        this.setField("effectiveRatePerMinute", this._rate, Math.max(0, y[offset]), (n) => (this._rate = n));
    }

    public rhs(_t: number, y: Float64Array, offset: number, inputs: IIntegrationInputs, dydt: Float64Array): void {
        const rate = y[offset];
        const command = Math.max(0, Math.min(1, inputs.get("command") ?? 0));
        const target = this._rateAtFullCommand * command;
        // per second: the time constant is in minutes
        dydt[offset] = (target - rate) / (this._lagTimeConstantMinutes * 60);
    }

    public override reset(session: ISession): void {
        super.reset(session);
        this.setField("effectiveRatePerMinute", this._rate, this._initialEffectiveRate, (n) => (this._rate = n));
        this._power = 0;
        this._command = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let command = 0;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            const value = session.readSignal(idx);
            if (typeof value !== "number" || !Number.isFinite(value)) continue;
            if (slot === "command") command = Math.max(0, Math.min(1, value));
        }
        this.setField("command", this._command, command, (n) => (this._command = n));
        const power = this.powerAt(command);
        this.setField("power", this._power, power, (n) => (this._power = n));
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "effectiveRate":
                    session.publish(idx, this._rate);
                    break;
                case "effectiveFraction":
                    session.publish(idx, this.effectiveFraction);
                    break;
                case "power":
                    session.publish(idx, power);
                    break;
            }
        }
    }
}

export function createScrubberNode(): ScrubberNode {
    return new ScrubberNode();
}
