import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * `Control.Actuator:setpoint` — continuous-value actuator that wraps a
 * requested setpoint with two physical limits every real actuator has:
 *
 *   1. Rate limit (slew). The output cannot change faster than
 *      `maxRatePerSec` units / second. Models valve stem speed, motor
 *      acceleration cap, fluidic inertia, etc.
 *   2. Saturation. The output is clamped to `[min, max]`. Models
 *      mechanical stops, tank capacity, current limits.
 *
 * Together these convert an idealized control-loop output into something
 * the rest of the plant model can react to without going non-physical
 * (negative tank levels, supersonic valve closure, ...).
 *
 * Editables:
 *   min            lower saturation bound                   (default 0)
 *   max            upper saturation bound                   (default 1)
 *   maxRatePerSec  slew limit, units/s; Infinity = none     (default Inf)
 *   initial        value at session start                   (default 0)
 *
 * Inputs:
 *   request  required, the desired setpoint from upstream control logic.
 *   t        optional, sim time in seconds. Used to compute dt for the
 *            rate limit. If absent, falls back to 0.01 s per fire.
 *
 * Outputs:
 *   applied      float; the clamped + rate-limited actual command.
 *   clamped      boolean; true when `applied == min` or `applied == max`.
 *   rateLimited  boolean; true when the slew cap prevented `applied`
 *                from reaching `request` this tick.
 *
 * The two boolean outputs are first-class so a supervisor or
 * alert-bus can react to saturation (which usually indicates the
 * controller is asking for the impossible) without re-computing the
 * limits downstream.
 *
 * Viewables:
 *   lastApplied   most recent applied value (panel sanity check).
 *   lastDt        the dt used at the last fire (debug for time wiring).
 */
export class SetpointNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "request", optional: false, type: "float" },
        { slot: "t", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "applied", optional: false, type: "float" },
        { slot: "clamped", optional: false, type: "boolean" },
        { slot: "rateLimited", optional: false, type: "boolean" },
    ];

    @cloneable private _min: number = 0;
    @cloneable private _max: number = 1;
    @cloneable private _maxRatePerSec: number = Infinity;
    @cloneable private _initial: number = 0;

    private static readonly _FALLBACK_DT_S = 0.01;

    private _lastValue: number = 0;
    private _lastT: number | null = null;
    private _lastDt: number = SetpointNode._FALLBACK_DT_S;
    private _lastApplied: number = 0;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
        this._lastValue = this._initial;
    }

    @editable("number")
    public get min(): number {
        return this._min;
    }
    public set min(v: number) {
        this.setField("min", this._min, v, (n) => {
            this._min = n;
        });
    }

    @editable("number")
    public get max(): number {
        return this._max;
    }
    public set max(v: number) {
        this.setField("max", this._max, v, (n) => {
            this._max = n;
        });
    }

    @editable("number", { unit: { quantity: "Frequency", unit: "unitsps" } })
    public get maxRatePerSec(): number {
        return this._maxRatePerSec;
    }
    public set maxRatePerSec(v: number) {
        // Allow Infinity (and very large numbers) — that's the "no slew
        // limit" mode. Reject negative values: a negative rate would
        // invert the slew direction, which is not physically meaningful.
        const next = v < 0 ? 0 : v;
        this.setField("maxRatePerSec", this._maxRatePerSec, next, (n) => {
            this._maxRatePerSec = n;
        });
    }

    @editable("number")
    public get initial(): number {
        return this._initial;
    }
    public set initial(v: number) {
        this.setField("initial", this._initial, v, (n) => {
            this._initial = n;
            // Re-seed the live state only if we have not started firing
            // yet for this session — otherwise we'd snap the actuator
            // mid-trajectory, which would defeat the rate limit.
            if (this._lastT === null) this._lastValue = n;
        });
    }

    /** Most recent applied command — sanity-check viewable. */
    @viewable("number") public get lastApplied(): number {
        return this._lastApplied;
    }

    /** The dt used at the last fire — useful to confirm `t` wiring. */
    @viewable("number") public get lastDt(): number {
        return this._lastDt;
    }

    public override reset(_session: ISession): void {
        this._lastValue = this._initial;
        this._lastT = null;
        this._lastDt = SetpointNode._FALLBACK_DT_S;
        this._lastApplied = this._initial;
    }

    public override fire(session: ISession, _tick: number): void {
        let request: number | null = null;
        let tIn: number | null = null;

        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const v = session.consume(idx);
            if (typeof v !== "number") continue;
            switch (slot) {
                case "request":
                    request = v;
                    break;
                case "t":
                    tIn = v;
                    break;
            }
        }

        if (request === null) return;

        let dt = SetpointNode._FALLBACK_DT_S;
        if (tIn !== null) {
            if (this._lastT !== null) {
                const candidate = tIn - this._lastT;
                if (candidate > 0) dt = candidate;
            }
            this._lastT = tIn;
        }
        this._lastDt = dt;

        // Rate limit (slew toward request). maxDelta is the largest
        // change allowed this tick. With maxRatePerSec = Infinity the
        // cap is Infinity and we step directly to request — the clamp
        // below handles the math (Math.max/min with Infinity is
        // well-defined and returns the finite operand).
        const desired = request - this._lastValue;
        const maxDelta = this._maxRatePerSec * dt;
        const step = Math.max(-maxDelta, Math.min(maxDelta, desired));
        let current = this._lastValue + step;

        // rateLimited = the slew cap actually prevented us from reaching
        // the requested value this tick. We test |desired| vs maxDelta
        // BEFORE saturation so the flag reflects the slew limit alone,
        // not the saturation limit (which has its own boolean).
        const rateLimited = Math.abs(desired) > maxDelta;

        let clamped = false;
        if (current < this._min) {
            current = this._min;
            clamped = true;
        } else if (current > this._max) {
            current = this._max;
            clamped = true;
        }

        this._lastValue = current;
        this._lastApplied = current;

        // Three separate publish loops to keep each slot's fan-out
        // independent. The hot path is short, so the redundant link
        // iteration is fine vs. the readability cost of a multi-slot
        // dispatch table.
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            switch (link.slot) {
                case "applied":
                    session.publish(idx, current);
                    break;
                case "clamped":
                    session.publish(idx, clamped);
                    break;
                case "rateLimited":
                    session.publish(idx, rateLimited);
                    break;
            }
        }
    }
}

export function createSetpointNode(): SetpointNode {
    return new SetpointNode();
}
