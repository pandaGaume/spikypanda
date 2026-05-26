import {
    editable,
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
 * UE5-Blueprint loop family.
 *
 * Two execution modes are used to match the underlying scheduler:
 *
 *   - "Sync" loops (ForLoop, ForEachLoop) publish every iteration's
 *     `body` + `index` token from a single `fire()` call. The runtime
 *     scheduler then drains the bursts in FIFO order within the same
 *     outer Session.run(t). Memory is bounded by `maxIterations` —
 *     the capacity declared on the body/index output ports.
 *
 *   - "Cross-tick" loops (WhileLoop, ForLoopWithBreak,
 *     ForEachLoopWithBreak) publish ONE iteration per `fire()` and
 *     re-arm via the scheduler. Between iterations the downstream
 *     subgraph has time to publish a `_break` trigger (or update the
 *     `condition` of a while), so dynamic exit works at the cost of
 *     one scheduler-cycle per iteration. In Play mode (rAF, 60 Hz)
 *     each iteration takes ~16 ms; in Run Once mode only one
 *     iteration completes.
 *
 * Sync mode caps memory via a static capacity declaration on the
 * output ports. The capacity is derived from `maxIterations` through
 * a getter so adjusting the field rebuilds the session with the right
 * buffer size. Cross-tick mode uses capacity = 1 (one outstanding
 * token at a time, mirrors UE5's "one frame per iter" mental model).
 */

// ── Helpers (mirrors flow.ts but reused here) ────────────────────────

function consumeReady(session: ISession, node: RuntimeNode, slot: string): boolean {
    const links = session.graph.links as ReadonlyArray<IChannel>;
    let triggered = false;
    for (const link of node.opsc<IChannel>()) {
        if (inSlotOf(link) !== slot) continue;
        if (!link.enabled) continue;
        const idx = links.indexOf(link);
        if (idx < 0) continue;
        if (!session.linkStates[idx].ready) continue;
        session.consume(idx);
        triggered = true;
    }
    return triggered;
}

function readSlot<T>(
    session: ISession,
    node: RuntimeNode,
    slot: string,
    fallback: T,
    validate?: (v: unknown) => boolean,
): T {
    const links = session.graph.links as ReadonlyArray<IChannel>;
    for (const link of node.opsc<IChannel>()) {
        if (inSlotOf(link) !== slot) continue;
        if (!link.enabled) continue;
        const idx = links.indexOf(link);
        if (idx < 0 || !session.linkStates[idx].ready) continue;
        const v = session.consume(idx);
        if (validate && !validate(v)) return fallback;
        return v as T;
    }
    return fallback;
}

function publishOnSlot(session: ISession, node: RuntimeNode, slot: string, value: unknown): void {
    const links = session.graph.links as ReadonlyArray<IChannel>;
    for (const link of node.onsc<IChannel>()) {
        if (link.slot !== slot) continue;
        if (!link.enabled) continue;
        const idx = links.indexOf(link);
        if (idx < 0) continue;
        session.publish(idx, value);
    }
}

const isFiniteNumber = (v: unknown): boolean => typeof v === "number" && Number.isFinite(v);

// ── ForLoop (sync) ───────────────────────────────────────────────────

export class ForLoopNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _firstIndex:    number = 0;
    @cloneable private _lastIndex:     number = 4;
    @cloneable private _maxIterations: number = 256;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "in",         optional: true, type: "trigger" },
        { slot: "firstIndex", optional: true, type: "float"   },
        { slot: "lastIndex",  optional: true, type: "float"   },
    ];

    /**
     * Output capacities track `maxIterations` so the per-channel FIFO
     * is sized to absorb the whole burst. Reading via a getter lets
     * the editable field update the resolved capacity at next session
     * rebuild without a class-level redeclaration.
     */
    public get outputPorts(): ReadonlyArray<IPortDescriptor> {
        const cap = Math.max(1, this._maxIterations) + 1; // +1 for `completed`
        return [
            { slot: "body",      optional: false, type: "trigger", capacity: cap },
            { slot: "index",     optional: false, type: "float",   capacity: cap },
            { slot: "completed", optional: false, type: "trigger" },
        ];
    }

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number")
    public get firstIndex(): number { return this._firstIndex; }
    public set firstIndex(v: number) { this.setField("firstIndex", this._firstIndex, v, (n) => { this._firstIndex = n; }); }

    @editable("number")
    public get lastIndex(): number { return this._lastIndex; }
    public set lastIndex(v: number) { this.setField("lastIndex", this._lastIndex, v, (n) => { this._lastIndex = n; }); }

    @editable("number")
    public get maxIterations(): number { return this._maxIterations; }
    public set maxIterations(v: number) { this.setField("maxIterations", this._maxIterations, v, (n) => { this._maxIterations = n; }); }

    public override fire(session: ISession, _t: number): void {
        if (!consumeReady(session, this, "in")) return;
        const first = readSlot<number>(session, this, "firstIndex", this._firstIndex, isFiniteNumber);
        const last  = readSlot<number>(session, this, "lastIndex",  this._lastIndex,  isFiniteNumber);
        const count = Math.floor(last - first + 1);
        if (count <= 0) {
            publishOnSlot(session, this, "completed", true);
            return;
        }
        if (count > this._maxIterations) {
            throw new Error(
                `[ForLoop] count ${count} exceeds maxIterations ${this._maxIterations}; `
                + `raise maxIterations or narrow the range.`,
            );
        }
        for (let i = 0; i < count; i++) {
            const idx = Math.floor(first) + i;
            publishOnSlot(session, this, "body", true);
            publishOnSlot(session, this, "index", idx);
        }
        publishOnSlot(session, this, "completed", true);
    }
}

// ── ForEachLoop (sync) ───────────────────────────────────────────────

export class ForEachLoopNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _maxIterations: number = 256;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "in",    optional: true, type: "trigger" },
        { slot: "array", optional: true, type: "array"   },
    ];

    public get outputPorts(): ReadonlyArray<IPortDescriptor> {
        const cap = Math.max(1, this._maxIterations) + 1;
        return [
            { slot: "body",      optional: false, type: "trigger", capacity: cap },
            { slot: "element",   optional: false, type: "any",     capacity: cap },
            { slot: "index",     optional: false, type: "float",   capacity: cap },
            { slot: "completed", optional: false, type: "trigger" },
        ];
    }

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number")
    public get maxIterations(): number { return this._maxIterations; }
    public set maxIterations(v: number) { this.setField("maxIterations", this._maxIterations, v, (n) => { this._maxIterations = n; }); }

    public override fire(session: ISession, _t: number): void {
        if (!consumeReady(session, this, "in")) return;
        const arr = readSlot<unknown[]>(session, this, "array", [], (v) => Array.isArray(v));
        if (arr.length === 0) {
            publishOnSlot(session, this, "completed", true);
            return;
        }
        if (arr.length > this._maxIterations) {
            throw new Error(
                `[ForEachLoop] array length ${arr.length} exceeds maxIterations ${this._maxIterations}.`,
            );
        }
        for (let i = 0; i < arr.length; i++) {
            publishOnSlot(session, this, "body", true);
            publishOnSlot(session, this, "element", arr[i]);
            publishOnSlot(session, this, "index", i);
        }
        publishOnSlot(session, this, "completed", true);
    }
}

// ── WhileLoop (cross-tick) ───────────────────────────────────────────

/**
 * One iteration per Session.run(t). When the `in` trigger arrives the
 * loop arms; while active, each fire() reads `condition`, publishes
 * `body` when true, and publishes `completed` when false (terminating
 * the loop). Condition can be wired to any upstream boolean (e.g.
 * Equal, Greater) or left to the editable default.
 *
 * Safety: capped by `maxIterations`; reaching the cap forces an exit
 * with `completed` so a runaway condition cannot freeze the runtime.
 */
export class WhileLoopNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _condition:     boolean = false;
    @cloneable private _maxIterations: number  = 10000;

    private _active:   boolean = false;
    private _iter:     number  = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "in",        optional: true, type: "trigger" },
        { slot: "condition", optional: true, type: "boolean" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "body",      optional: false, type: "trigger" },
        { slot: "completed", optional: false, type: "trigger" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("boolean")
    public get condition(): boolean { return this._condition; }
    public set condition(v: boolean) { this.setField("condition", this._condition, v, (b) => { this._condition = b; }); }

    @editable("number")
    public get maxIterations(): number { return this._maxIterations; }
    public set maxIterations(v: number) { this.setField("maxIterations", this._maxIterations, v, (n) => { this._maxIterations = n; }); }

    public override reset(_session: ISession): void {
        this._active = false;
        this._iter = 0;
    }

    public override isReady(session: ISession): boolean {
        // Stay dispatch-eligible as long as we're iterating; the
        // scheduler's "re-enqueue when linksReady >= required" handles
        // the loop driving.
        if (!this.enabled) return false;
        if (this._active) return true;
        // Not yet active: wait for `in` to land in the buffer.
        return super.isReady(session);
    }

    public override fire(session: ISession, _t: number): void {
        if (!this._active) {
            if (!consumeReady(session, this, "in")) return;
            this._active = true;
            this._iter = 0;
        }
        if (this._iter >= this._maxIterations) {
            publishOnSlot(session, this, "completed", true);
            this._active = false;
            return;
        }
        const cond = readSlot<boolean>(session, this, "condition", this._condition, (v) => typeof v === "boolean");
        if (!cond) {
            publishOnSlot(session, this, "completed", true);
            this._active = false;
            return;
        }
        publishOnSlot(session, this, "body", true);
        this._iter++;
    }
}

// ── ForLoopWithBreak (cross-tick) ────────────────────────────────────

export class ForLoopWithBreakNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _firstIndex:    number = 0;
    @cloneable private _lastIndex:     number = 4;

    private _active: boolean = false;
    private _index:  number  = 0;
    private _last:   number  = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "in",         optional: true, type: "trigger" },
        { slot: "firstIndex", optional: true, type: "float"   },
        { slot: "lastIndex",  optional: true, type: "float"   },
    ];
    public override readonly controlInputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "_enable", optional: true, type: "boolean" },
        { slot: "_break",  optional: true, type: "trigger" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "body",      optional: false, type: "trigger" },
        { slot: "index",     optional: false, type: "float"   },
        { slot: "completed", optional: false, type: "trigger" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number")
    public get firstIndex(): number { return this._firstIndex; }
    public set firstIndex(v: number) { this.setField("firstIndex", this._firstIndex, v, (n) => { this._firstIndex = n; }); }

    @editable("number")
    public get lastIndex(): number { return this._lastIndex; }
    public set lastIndex(v: number) { this.setField("lastIndex", this._lastIndex, v, (n) => { this._lastIndex = n; }); }

    public override reset(_session: ISession): void {
        this._active = false;
        this._index = 0;
        this._last = 0;
    }

    public override isReady(session: ISession): boolean {
        if (!this.enabled) return false;
        if (this._active) return true;
        return super.isReady(session);
    }

    public override processControlInputs(session: ISession): void {
        super.processControlInputs(session);
        if (consumeReady(session, this, "_break")) {
            // Break short-circuits the loop. No `completed` fires —
            // that's the UE5 contract: break exits cleanly without
            // signalling completion.
            this._active = false;
        }
    }

    public override fire(session: ISession, _t: number): void {
        if (!this._active) {
            if (!consumeReady(session, this, "in")) return;
            const first = readSlot<number>(session, this, "firstIndex", this._firstIndex, isFiniteNumber);
            const last  = readSlot<number>(session, this, "lastIndex",  this._lastIndex,  isFiniteNumber);
            this._index = Math.floor(first);
            this._last  = Math.floor(last);
            this._active = true;
        }
        if (this._index > this._last) {
            publishOnSlot(session, this, "completed", true);
            this._active = false;
            return;
        }
        publishOnSlot(session, this, "body", true);
        publishOnSlot(session, this, "index", this._index);
        this._index++;
    }
}

// ── ForEachLoopWithBreak (cross-tick) ────────────────────────────────

export class ForEachLoopWithBreakNode extends RuntimeNode implements IDeclaresPorts {
    private _active:  boolean   = false;
    private _array:   unknown[] = [];
    private _index:   number    = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "in",    optional: true, type: "trigger" },
        { slot: "array", optional: true, type: "array"   },
    ];
    public override readonly controlInputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "_enable", optional: true, type: "boolean" },
        { slot: "_break",  optional: true, type: "trigger" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "body",      optional: false, type: "trigger" },
        { slot: "element",   optional: false, type: "any"     },
        { slot: "index",     optional: false, type: "float"   },
        { slot: "completed", optional: false, type: "trigger" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    public override reset(_session: ISession): void {
        this._active = false;
        this._array = [];
        this._index = 0;
    }

    public override isReady(session: ISession): boolean {
        if (!this.enabled) return false;
        if (this._active) return true;
        return super.isReady(session);
    }

    public override processControlInputs(session: ISession): void {
        super.processControlInputs(session);
        if (consumeReady(session, this, "_break")) {
            this._active = false;
            this._array = [];
        }
    }

    public override fire(session: ISession, _t: number): void {
        if (!this._active) {
            if (!consumeReady(session, this, "in")) return;
            const arr = readSlot<unknown[]>(session, this, "array", [], (v) => Array.isArray(v));
            this._array = arr.slice();
            this._index = 0;
            this._active = true;
        }
        if (this._index >= this._array.length) {
            publishOnSlot(session, this, "completed", true);
            this._active = false;
            this._array = [];
            return;
        }
        publishOnSlot(session, this, "body", true);
        publishOnSlot(session, this, "element", this._array[this._index]);
        publishOnSlot(session, this, "index", this._index);
        this._index++;
    }
}
