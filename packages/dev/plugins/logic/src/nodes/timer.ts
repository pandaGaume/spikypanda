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
    inSlotOf,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Composite ramp / interpolation timer — the UE5-Timeline analogue for
 * linear interpolations.
 *
 * Lifecycle:
 *   - `_start`  resets `elapsed` to 0 and arms the timer (active=true).
 *   - `_reset`  cancels: elapsed=0, active=false, outputs revert to `from`.
 *   - each tick while active, `elapsed += t - lastT`. `progress` is
 *     `clamp(elapsed / duration, 0, 1)`, `value` is `lerp(from, to, progress)`.
 *   - when `progress` first reaches 1, `_completed` pulses ONCE and the
 *     timer keeps publishing `value = to` indefinitely (so downstream
 *     sees the steady-state value during the post-ramp phase).
 *
 * The whole "Clock + Divide + Multiply + Clamp" combo from your earlier
 * graph collapses to a single Timer node when the interpolation is
 * linear; pair with a Select for the manual-handoff pattern.
 *
 * Capacity on `_completed` stays at 1 — UE5 sémantique: completion is
 * a one-shot edge, not a repeating signal. `progress` and `value`
 * keep their default-1 capacity since they publish at most once per
 * outer tick.
 */
export class TimerNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _duration: number = 1;
    @cloneable private _from:     number = 0;
    @cloneable private _to:       number = 1;
    @cloneable private _autoStart: boolean = true;

    private _active:         boolean = false;
    private _wasCompleted:   boolean = false;
    @cloneable private _elapsed: number = 0;
    @cloneable private _progress: number = 0;
    @cloneable private _value:   number = 0;
    private _lastT:           number = -1;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "duration", optional: true, type: "float" },
        { slot: "from",     optional: true, type: "float" },
        { slot: "to",       optional: true, type: "float" },
    ];
    public override readonly controlInputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "_enable", optional: true, type: "boolean" },
        { slot: "_start",  optional: true, type: "trigger" },
        { slot: "_reset",  optional: true, type: "trigger" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "progress", optional: false, type: "float"   },
        { slot: "value",    optional: false, type: "float"   },
    ];
    public override readonly controlOutputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "_enabled",   optional: true, type: "boolean" },
        { slot: "_completed", optional: true, type: "trigger" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number")
    public get duration(): number { return this._duration; }
    public set duration(v: number) { this.setField("duration", this._duration, v, (n) => { this._duration = n; }); }

    @editable("number")
    public get from(): number { return this._from; }
    public set from(v: number) { this.setField("from", this._from, v, (n) => { this._from = n; }); }

    @editable("number")
    public get to(): number { return this._to; }
    public set to(v: number) { this.setField("to", this._to, v, (n) => { this._to = n; }); }

    /**
     * When true (default), the timer arms itself on session start so it
     * begins ticking without an explicit `_start` wire. Disable for the
     * UE5-style "wait for an explicit Begin event" usage.
     */
    @editable("boolean")
    public get autoStart(): boolean { return this._autoStart; }
    public set autoStart(v: boolean) { this.setField("autoStart", this._autoStart, v, (b) => { this._autoStart = b; }); }

    @viewable("number")
    public get progress(): number { return this._progress; }
    @viewable("number")
    public get value(): number { return this._value; }

    public override reset(_session: ISession): void {
        this._active = this._autoStart;
        this._wasCompleted = false;
        this._elapsed = 0;
        this._lastT = -1;
        this.setField("progress", this._progress, 0, (n) => { this._progress = n; });
        this.setField("value", this._value, this._from, (n) => { this._value = n; });
    }

    public override processControlInputs(session: ISession): void {
        super.processControlInputs(session);
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            if (slot === "_start") {
                session.consume(idx);
                this._active = true;
                this._wasCompleted = false;
                this._elapsed = 0;
                this._lastT = -1;
            } else if (slot === "_reset") {
                session.consume(idx);
                this._active = false;
                this._wasCompleted = false;
                this._elapsed = 0;
                this._lastT = -1;
                this.setField("progress", this._progress, 0, (n) => { this._progress = n; });
                this.setField("value", this._value, this._from, (n) => { this._value = n; });
            }
        }
    }

    public override fire(session: ISession, t: number): void {
        // ── Idle until armed ────────────────────────────────────────────
        // Timer is a one-shot, trigger-driven node: it stays silent until
        // either `_start` arrives (via processControlInputs) or autoStart
        // is true. Publishing while inactive would flood downstream slots
        // (capacity 1 by default) with redundant values frame after frame
        // and overflow them once any other path pushed an extra token.
        // UE5 Timeline has the same semantic — no output until Play.
        if (!this._active) {
            this._lastT = -1;
            return;
        }

        // Read possibly-wired duration / from / to (fall back to editables).
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let duration = this._duration, from = this._from, to = this._to;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = inSlotOf(link);
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const v = session.consume(idx);
            if (typeof v !== "number") continue;
            if (slot === "duration") duration = v;
            else if (slot === "from") from = v;
            else if (slot === "to") to = v;
        }

        const dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
        this._lastT = t;
        this._elapsed += dt;

        const denom = Math.max(1e-9, duration);
        const progress = Math.max(0, Math.min(1, this._elapsed / denom));
        const value = from + (to - from) * progress;

        // setField + viewable getters → LiveBinder mirrors downstream
        this.setField("progress", this._progress, progress, (n) => { this._progress = n; });
        this.setField("value",    this._value,    value,    (n) => { this._value = n; });

        // Broadcast on every channel matching the source slot (fan-out safe).
        const broadcast = (slot: string, val: unknown): void => {
            for (const link of this.onsc<IChannel>()) {
                if (link.slot !== slot) continue;
                if (!link.enabled) continue;
                const idx = links.indexOf(link);
                if (idx < 0) continue;
                session.publish(idx, val);
            }
        };
        broadcast("progress", progress);
        broadcast("value",    value);

        if (progress >= 1 && !this._wasCompleted) {
            this._wasCompleted = true;
            broadcast("_completed", true);
        }
    }
}
