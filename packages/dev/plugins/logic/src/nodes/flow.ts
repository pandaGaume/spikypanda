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
 * UE5-Blueprint-flavoured exec flow control.
 *
 * Convention used here:
 *   - Trigger inputs that **gate** firing live in `inputPorts` with
 *     `type: "trigger"`. They count toward the scheduler's
 *     required-inputs counter, so the node only fires when the upstream
 *     trigger arrives (plus any other declared data inputs).
 *   - Trigger inputs that **only mutate state** (reset, open, close,
 *     toggle) live in the control plane: they are named with the `_`
 *     prefix so `_computeRequiredInputs` skips them, and the node
 *     drains them in `processControlInputs` before `isReady` is
 *     evaluated. Mutation happens on every dispatch, firing happens
 *     only when the gating trigger is ready.
 *   - Trigger outputs publish a boolean `true` token (same payload
 *     contract as StartNode `_started`). Downstream consumers consume
 *     the channel to clear it; otherwise the next tick re-dispatches.
 *
 * Each node consumes its gating inputs inside `fire()` so the
 * linksReady counter drops back to 0; the node fires again on the
 * next arrival.
 */

// ── Helpers ──────────────────────────────────────────────────────────

// Destination-side iteration uses `inSlotOf(link)` so the channel's
// toSlot (set from `conn.to.name` by the editor's session builder) is
// what gets matched against the node's own port name. The legacy
// `link.slot` lookup would compare against the source's output port
// instead — fine when the two endpoints share a name, broken for
// UE5-style wiring like Start._started → Branch.in.
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

// Source-side iteration matches against `link.slot` — that field is
// the source's own output port name (set from `conn.from.name`).
function publishTrigger(session: ISession, node: RuntimeNode, slot: string): void {
    const links = session.graph.links as ReadonlyArray<IChannel>;
    for (const link of node.onsc<IChannel>()) {
        if (link.slot !== slot) continue;
        if (!link.enabled) continue;
        const idx = links.indexOf(link);
        if (idx < 0) continue;
        session.publish(idx, true);
    }
}

function readBoolean(session: ISession, node: RuntimeNode, slot: string, fallback: boolean): boolean {
    const links = session.graph.links as ReadonlyArray<IChannel>;
    for (const link of node.opsc<IChannel>()) {
        if (inSlotOf(link) !== slot) continue;
        if (!link.enabled) continue;
        const idx = links.indexOf(link);
        if (idx < 0) continue;
        if (!session.linkStates[idx].ready) continue;
        return !!session.consume(idx);
    }
    return fallback;
}

// ── Branch ───────────────────────────────────────────────────────────

/**
 * `in` + `condition` → `true` / `false`. Fires exactly one of the
 * outputs based on the boolean condition. Both inputs gate the
 * firing (scheduler waits for both).
 */
export class BranchNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _condition: boolean = false;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "in",        optional: true, type: "trigger" },
        { slot: "condition", optional: true, type: "boolean" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "true",  optional: false, type: "trigger" },
        { slot: "false", optional: false, type: "trigger" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("boolean")
    public get condition(): boolean { return this._condition; }
    public set condition(v: boolean) { this.setField("condition", this._condition, v, (b) => { this._condition = b; }); }

    public override fire(session: ISession, _t: number): void {
        const fired = consumeReady(session, this, "in");
        const cond  = readBoolean(session, this, "condition", this._condition);
        if (!fired) return;
        publishTrigger(session, this, cond ? "true" : "false");
    }
}

// ── Sequence ─────────────────────────────────────────────────────────

/**
 * `in` → `then_0`, `then_1`, `then_2`, ... in declaration order, UE5
 * style: every connected output is fired sequentially inside the
 * single tick that received the trigger. The output set is variadic;
 * the editor's VariadicReconciler grows it as the user wires the
 * trailing slot. The runtime side just iterates every onsc link whose
 * source slot starts with "then_" and sorts them by numeric suffix to
 * preserve the visible declaration order.
 */
export class SequenceNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "in", optional: true, type: "trigger" },
    ];
    // Start with a single output; the editor adds further slots as
    // they get wired. `outputPorts` is informational only — `fire`
    // does not key off it.
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "then_0", optional: false, type: "trigger" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    public override fire(session: ISession, _t: number): void {
        if (!consumeReady(session, this, "in")) return;
        const links = session.graph.links as ReadonlyArray<IChannel>;
        // Pick every outgoing channel whose source slot starts with
        // "then_", order by the numeric suffix so the user-visible
        // order (set by the editor) is honoured at fire time.
        const ordered: IChannel[] = [];
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = link.slot;
            if (typeof slot !== "string" || slot.indexOf("then_") !== 0) continue;
            ordered.push(link);
        }
        ordered.sort((a, b) => {
            const ai = Number(String(a.slot).slice(5));
            const bi = Number(String(b.slot).slice(5));
            return (Number.isFinite(ai) ? ai : 0) - (Number.isFinite(bi) ? bi : 0);
        });
        for (const link of ordered) {
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, true);
        }
    }
}

// ── DoOnce ───────────────────────────────────────────────────────────

/**
 * `in` → `then` exactly once, then latches until `_reset` arrives.
 * `startClosed` makes the latch start in the "already fired" state,
 * so the first `in` is silently consumed and only post-reset triggers
 * propagate.
 */
export class DoOnceNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _startClosed: boolean = false;
    private _used: boolean = false;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "in", optional: true, type: "trigger" },
    ];
    public override readonly controlInputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "_enable", optional: true, type: "boolean" },
        { slot: "_reset",  optional: true, type: "trigger" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "then", optional: false, type: "trigger" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) {
        super(onsc, opsc, position);
        this._used = this._startClosed;
    }

    @editable("boolean")
    public get startClosed(): boolean { return this._startClosed; }
    public set startClosed(v: boolean) {
        this.setField("startClosed", this._startClosed, v, (b) => { this._startClosed = b; });
    }

    public override reset(_session: ISession): void {
        this._used = this._startClosed;
    }

    public override processControlInputs(session: ISession): void {
        super.processControlInputs(session);
        if (consumeReady(session, this, "_reset")) {
            this._used = false;
        }
    }

    public override fire(session: ISession, _t: number): void {
        if (!consumeReady(session, this, "in")) return;
        if (this._used) return;
        this._used = true;
        publishTrigger(session, this, "then");
    }
}

// ── Gate ─────────────────────────────────────────────────────────────

/**
 * `in` → `then` only when the gate is open. State is mutated by
 * `_open`, `_close`, `_toggle` triggers (control plane, drained in
 * processControlInputs). `startClosed` seeds the initial state at
 * session reset.
 */
export class GateNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _startClosed: boolean = false;
    private _open: boolean = true;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "in", optional: true, type: "trigger" },
    ];
    public override readonly controlInputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "_enable", optional: true, type: "boolean" },
        { slot: "_open",   optional: true, type: "trigger" },
        { slot: "_close",  optional: true, type: "trigger" },
        { slot: "_toggle", optional: true, type: "trigger" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "then", optional: false, type: "trigger" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) {
        super(onsc, opsc, position);
        this._open = !this._startClosed;
    }

    @editable("boolean")
    public get startClosed(): boolean { return this._startClosed; }
    public set startClosed(v: boolean) {
        this.setField("startClosed", this._startClosed, v, (b) => { this._startClosed = b; });
    }

    public override reset(_session: ISession): void {
        this._open = !this._startClosed;
    }

    public override processControlInputs(session: ISession): void {
        super.processControlInputs(session);
        if (consumeReady(session, this, "_open"))   this._open = true;
        if (consumeReady(session, this, "_close"))  this._open = false;
        if (consumeReady(session, this, "_toggle")) this._open = !this._open;
    }

    public override fire(session: ISession, _t: number): void {
        if (!consumeReady(session, this, "in")) return;
        if (!this._open) return;
        publishTrigger(session, this, "then");
    }
}
