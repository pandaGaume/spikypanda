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
import { DebugBus } from "spikypanda-nodeeditor";

/**
 * Print + Watch nodes: emit messages on the editor's `DebugBus`, which
 * the console panel renders in the v2 editor footer.
 *
 *   PrintNode  Exec-driven: on each `in` trigger, peek `text`,
 *              forward the value to the bus, and pulse `then`.
 *              Equivalent to UE5 PrintString (minus the on-screen
 *              overlay; we only log to the console).
 *
 *   WatchNode  Value-driven: every published `value` produces one
 *              bus entry tagged with the user-supplied `label`.
 *              Useful for observing the live state of a wire without
 *              chaining trigger inputs. Pass-through is intentionally
 *              NOT provided — wire to another consumer if you want
 *              tee-style observation, or fan-out the source itself.
 */

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
): T {
    const links = session.graph.links as ReadonlyArray<IChannel>;
    for (const link of node.opsc<IChannel>()) {
        if (inSlotOf(link) !== slot) continue;
        if (!link.enabled) continue;
        const idx = links.indexOf(link);
        if (idx < 0 || !session.linkStates[idx].ready) continue;
        return session.consume(idx) as T;
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

function stringify(v: unknown): string {
    if (v === undefined) return "undefined";
    if (v === null) return "null";
    if (typeof v === "string") return v;
    if (typeof v === "number" || typeof v === "boolean") return String(v);
    try {
        return JSON.stringify(v);
    } catch (_e) {
        return String(v);
    }
}

// ── PrintNode ────────────────────────────────────────────────────────

export class PrintNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _text:  string = "";
    @cloneable private _label: string = "Print";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "in",   optional: true, type: "trigger" },
        { slot: "text", optional: true, type: "string"  },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "then", optional: false, type: "trigger" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("string")
    public get text(): string { return this._text; }
    public set text(v: string) { this.setField("text", this._text, v, (s) => { this._text = s; }); }

    @editable("string")
    public get label(): string { return this._label; }
    public set label(v: string) { this.setField("label", this._label, v, (s) => { this._label = s; }); }

    public override fire(session: ISession, _t: number): void {
        if (!consumeReady(session, this, "in")) return;
        const text = stringify(readSlot<unknown>(session, this, "text", this._text));
        DebugBus.instance.log("info", this._label || "Print", text);
        publishOnSlot(session, this, "then", true);
    }
}

// ── WatchNode ────────────────────────────────────────────────────────

export class WatchNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _label: string = "Watch";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "value", optional: true, type: "any" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("string")
    public get label(): string { return this._label; }
    public set label(v: string) { this.setField("label", this._label, v, (s) => { this._label = s; }); }

    public override fire(session: ISession, _t: number): void {
        const v = readSlot<unknown>(session, this, "value", undefined);
        if (v === undefined) return;
        DebugBus.instance.log("watch", this._label || "Watch", stringify(v));
    }
}
