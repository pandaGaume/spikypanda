import {
    editable,
    viewable,
    cloneable,
    IOlink,
    IDeclaresPorts,
    IPortDescriptor,
    ISession,
    IChannel,
    RuntimeNode,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Publishes `value` on every outgoing channel of `node` matching the
 * source-side slot name. Unlike `publishToFirstOutput`, this fans out
 * to ALL wired destinations — required when a single port has
 * multiple downstream connections (e.g. Clock.t feeding both a Divide
 * AND a comparison).
 */
function broadcast(session: ISession, node: RuntimeNode, slot: string, value: unknown): void {
    const links = session.graph.links as ReadonlyArray<IChannel>;
    for (const link of node.onsc<IChannel>()) {
        if (link.slot !== slot) continue;
        if (!link.enabled) continue;
        const idx = links.indexOf(link);
        if (idx < 0) continue;
        session.publish(idx, value);
    }
}

/**
 * Time sources.
 *
 *   ClockNode      Pure source: publishes the session's `t` (the value
 *                  threaded by Session.run(t)) on its `t` output every
 *                  cycle. In Play mode the GraphRunner advances `t`
 *                  per frame, so downstream sees a monotonically
 *                  increasing clock. In Run Once mode the inferrer
 *                  passes `t = 0` so the clock simply ticks once.
 *
 *   DeltaTimeNode  Stateful: each fire publishes `t - lastT` (i.e. the
 *                  delta since the previous fire). Useful for time-step
 *                  integration. Resets `lastT` to undefined on
 *                  session.reset() so the first dt is `0` and not a
 *                  huge spike inherited from a stale previous session.
 *
 * Both nodes expose `@viewable` getters mirroring their last published
 * value so the design-time LiveBinder can mirror upstream changes
 * (here, the scheduler dispatch itself) to downstream consumers.
 */

export class ClockNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _t: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "t", optional: false, type: "float" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @viewable("number")
    public get t(): number { return this._t; }

    public override reset(_session: ISession): void {
        this.setField("t", this._t, 0, (n) => { this._t = n; });
    }

    public override fire(session: ISession, t: number): void {
        // setField fires onPropertyChanged so the LiveBinder mirrors
        // the new value to anything reading `clock.t` downstream.
        this.setField("t", this._t, t, (n) => { this._t = n; });
        broadcast(session, this, "t", t);
    }
}

export class DeltaTimeNode extends RuntimeNode implements IDeclaresPorts {
    private _lastT:    number  = -1;
    @cloneable private _dt:    number  = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "dt", optional: false, type: "float" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @viewable("number")
    public get dt(): number { return this._dt; }

    public override reset(_session: ISession): void {
        this._lastT = -1;
        this.setField("dt", this._dt, 0, (n) => { this._dt = n; });
    }

    public override fire(session: ISession, t: number): void {
        const dt = this._lastT < 0 ? 0 : t - this._lastT;
        this._lastT = t;
        this.setField("dt", this._dt, dt, (n) => { this._dt = n; });
        broadcast(session, this, "dt", dt);
    }
}

/**
 * Number slider — pure source whose value is set by the user from the
 * property panel. Marked `@editable("slider")` so the editor renders a
 * range input bound to the active min/max/step fields rather than a
 * plain number box. Publishes the current value every cycle so
 * downstream sees the user's drag motion live in Play mode.
 */
export class NumberSliderNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _value: number = 0.5;
    @cloneable private _min:   number = 0;
    @cloneable private _max:   number = 1;
    @cloneable private _step:  number = 0.01;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "value", optional: false, type: "float" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("slider")
    public get value(): number { return this._value; }
    public set value(v: number) { this.setField("value", this._value, v, (n) => { this._value = n; }); }

    @editable("number")
    public get min(): number { return this._min; }
    public set min(v: number) { this.setField("min", this._min, v, (n) => { this._min = n; }); }

    @editable("number")
    public get max(): number { return this._max; }
    public set max(v: number) { this.setField("max", this._max, v, (n) => { this._max = n; }); }

    @editable("number")
    public get step(): number { return this._step; }
    public set step(v: number) { this.setField("step", this._step, v, (n) => { this._step = n; }); }

    public override fire(session: ISession, _t: number): void {
        broadcast(session, this, "value", this._value);
    }
}
