import {
    editable,
    cloneable,
    IOlink,
    IDeclaresPorts,
    IPortDescriptor,
    ISession,
    IChannel,
    RuntimeNode,
    publishToFirstOutput,
    inSlotOf,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * UE5-Blueprint-inspired array operations.
 *
 * Model: **immutable**. Every mutating operation (Add / Remove /
 * Insert / Set / Clear / Shuffle / Reverse / Sort) outputs a NEW array
 * rather than mutating the one that arrived on the input. This fits the
 * dataflow scheduler (channels carry values, not references with
 * identity) and avoids surprising downstream consumers that expect
 * their snapshot to stay stable.
 *
 * Element type is `any` because the port system does not yet have
 * generics; equality checks use strict `===` so primitives and the
 * same object reference compare correctly. Deep-equality semantics
 * (e.g. matching two `{x,y,z}` Cartesians) are out of scope for v1.
 *
 * The collection element ports are named `item` (input) and `item`
 * (output) consistently with UE5; index ports are named `index` and
 * default to 0.
 */

// ── Helpers ──────────────────────────────────────────────────────────

function readArray(session: ISession, node: RuntimeNode, slot: string, fallback: unknown[]): unknown[] {
    const links = session.graph.links as ReadonlyArray<IChannel>;
    for (const link of node.opsc<IChannel>()) {
        if (inSlotOf(link) !== slot) continue;
        if (!link.enabled) continue;
        const idx = links.indexOf(link);
        if (idx < 0 || !session.linkStates[idx].ready) continue;
        const v = session.consume(idx);
        return Array.isArray(v) ? (v as unknown[]) : fallback;
    }
    return fallback;
}

function readSlot<T>(session: ISession, node: RuntimeNode, slot: string, fallback: T, validate?: (v: unknown) => boolean): T {
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

// ── MakeArray ────────────────────────────────────────────────────────

/**
 * Variadic constructor: collects every wired `item_N` input into a new
 * array, in slot-index order. Empty when no item is wired.
 */
export class MakeArrayNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "item_0", optional: true, type: "any" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: false, type: "array" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        const items: { idx: number; value: unknown }[] = [];
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (slot.indexOf("item_") !== 0) continue;
            const i = links.indexOf(link);
            if (i < 0 || !session.linkStates[i].ready) continue;
            const slotIdx = Number(slot.slice(5));
            if (!Number.isFinite(slotIdx)) continue;
            items.push({ idx: slotIdx, value: session.consume(i) });
        }
        items.sort((a, b) => a.idx - b.idx);
        publishToFirstOutput(session, this, items.map((x) => x.value));
    }
}

// ── Shared base for unary array → X ──────────────────────────────────

abstract class UnaryArrayNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: true, type: "array" },
    ];
    public abstract outputPorts: ReadonlyArray<IPortDescriptor> ;

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    public override fire(session: ISession, _t: number): void {
        const arr = readArray(session, this, "array", []);
        this._compute(session, arr);
    }

    protected abstract _compute(session: ISession, arr: unknown[]): void;
}

// ── Length ────────────────────────────────────────────────────────────

export class ArrayLengthNode extends UnaryArrayNode {
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "length", optional: false, type: "float" },
    ];
    protected _compute(session: ISession, arr: unknown[]): void {
        publishOnSlot(session, this, "length", arr.length);
    }
}

// ── Clear ─────────────────────────────────────────────────────────────

export class ArrayClearNode extends UnaryArrayNode {
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: false, type: "array" },
    ];
    protected _compute(session: ISession, _arr: unknown[]): void {
        publishOnSlot(session, this, "array", []);
    }
}

// ── Shuffle (Fisher–Yates) ────────────────────────────────────────────

export class ArrayShuffleNode extends UnaryArrayNode {
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: false, type: "array" },
    ];
    protected _compute(session: ISession, arr: unknown[]): void {
        const out = arr.slice();
        for (let i = out.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [out[i], out[j]] = [out[j], out[i]];
        }
        publishOnSlot(session, this, "array", out);
    }
}

// ── Reverse ───────────────────────────────────────────────────────────

export class ArrayReverseNode extends UnaryArrayNode {
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: false, type: "array" },
    ];
    protected _compute(session: ISession, arr: unknown[]): void {
        publishOnSlot(session, this, "array", arr.slice().reverse());
    }
}

// ── Sort (lexicographic; deeper comparators are out of scope for v1) ─

export class ArraySortNode extends UnaryArrayNode {
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: false, type: "array" },
    ];
    protected _compute(session: ISession, arr: unknown[]): void {
        // Numeric sort when all elements are numbers; default sort
        // otherwise. JS default coerces to string and is rarely what
        // the user wants when mixing types.
        const allNum = arr.every((v) => typeof v === "number");
        const out = arr.slice().sort(
            allNum
                ? ((a, b) => (a as number) - (b as number))
                : undefined,
        );
        publishOnSlot(session, this, "array", out);
    }
}

// ── Add (push) ────────────────────────────────────────────────────────

export class ArrayAddNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: true, type: "array" },
        { slot: "item",  optional: true, type: "any" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: false, type: "array" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    public override fire(session: ISession, _t: number): void {
        const arr = readArray(session, this, "array", []);
        const item = readSlot<unknown>(session, this, "item", undefined);
        publishOnSlot(session, this, "array", arr.concat([item]));
    }
}

// ── Insert (at index) ─────────────────────────────────────────────────

export class ArrayInsertNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _index: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: true, type: "array" },
        { slot: "index", optional: true, type: "float" },
        { slot: "item",  optional: true, type: "any" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: false, type: "array" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number")
    public get index(): number { return this._index; }
    public set index(v: number) { this.setField("index", this._index, v, (n) => { this._index = n; }); }

    public override fire(session: ISession, _t: number): void {
        const arr = readArray(session, this, "array", []);
        const idx = readSlot<number>(session, this, "index", this._index, (v) => typeof v === "number");
        const item = readSlot<unknown>(session, this, "item", undefined);
        const out = arr.slice();
        const clamped = Math.max(0, Math.min(out.length, Math.floor(idx)));
        out.splice(clamped, 0, item);
        publishOnSlot(session, this, "array", out);
    }
}

// ── Set Array Elem (replace at index) ─────────────────────────────────

export class ArraySetNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _index: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: true, type: "array" },
        { slot: "index", optional: true, type: "float" },
        { slot: "item",  optional: true, type: "any" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: false, type: "array" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number")
    public get index(): number { return this._index; }
    public set index(v: number) { this.setField("index", this._index, v, (n) => { this._index = n; }); }

    public override fire(session: ISession, _t: number): void {
        const arr = readArray(session, this, "array", []);
        const idx = readSlot<number>(session, this, "index", this._index, (v) => typeof v === "number");
        const item = readSlot<unknown>(session, this, "item", undefined);
        const out = arr.slice();
        const clamped = Math.floor(idx);
        if (clamped >= 0 && clamped < out.length) out[clamped] = item;
        publishOnSlot(session, this, "array", out);
    }
}

// ── Get (read at index) ───────────────────────────────────────────────

export class ArrayGetNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _index: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: true, type: "array" },
        { slot: "index", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "item", optional: false, type: "any" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number")
    public get index(): number { return this._index; }
    public set index(v: number) { this.setField("index", this._index, v, (n) => { this._index = n; }); }

    public override fire(session: ISession, _t: number): void {
        const arr = readArray(session, this, "array", []);
        const idx = readSlot<number>(session, this, "index", this._index, (v) => typeof v === "number");
        const clamped = Math.floor(idx);
        const v = (clamped >= 0 && clamped < arr.length) ? arr[clamped] : undefined;
        publishOnSlot(session, this, "item", v);
    }
}

// ── Remove (first match by value) ─────────────────────────────────────

export class ArrayRemoveNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: true, type: "array" },
        { slot: "item",  optional: true, type: "any" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: false, type: "array" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    public override fire(session: ISession, _t: number): void {
        const arr = readArray(session, this, "array", []);
        const item = readSlot<unknown>(session, this, "item", undefined);
        const i = arr.indexOf(item);
        const out = arr.slice();
        if (i >= 0) out.splice(i, 1);
        publishOnSlot(session, this, "array", out);
    }
}

// ── Remove Index ──────────────────────────────────────────────────────

export class ArrayRemoveIndexNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _index: number = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: true, type: "array" },
        { slot: "index", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: false, type: "array" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number")
    public get index(): number { return this._index; }
    public set index(v: number) { this.setField("index", this._index, v, (n) => { this._index = n; }); }

    public override fire(session: ISession, _t: number): void {
        const arr = readArray(session, this, "array", []);
        const idx = readSlot<number>(session, this, "index", this._index, (v) => typeof v === "number");
        const out = arr.slice();
        const clamped = Math.floor(idx);
        if (clamped >= 0 && clamped < out.length) out.splice(clamped, 1);
        publishOnSlot(session, this, "array", out);
    }
}

// ── Contains ──────────────────────────────────────────────────────────

export class ArrayContainsNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: true, type: "array" },
        { slot: "item",  optional: true, type: "any" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "result", optional: false, type: "boolean" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    public override fire(session: ISession, _t: number): void {
        const arr = readArray(session, this, "array", []);
        const item = readSlot<unknown>(session, this, "item", undefined);
        publishOnSlot(session, this, "result", arr.indexOf(item) >= 0);
    }
}

// ── Find (index of first match, -1 when not found) ───────────────────

export class ArrayFindNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "array", optional: true, type: "array" },
        { slot: "item",  optional: true, type: "any" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "index", optional: false, type: "float" },
    ];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    public override fire(session: ISession, _t: number): void {
        const arr = readArray(session, this, "array", []);
        const item = readSlot<unknown>(session, this, "item", undefined);
        publishOnSlot(session, this, "index", arr.indexOf(item));
    }
}
