import { editable, cloneable, IOlink, IDeclaresPorts, IPortDescriptor, ISession, IChannel, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import { DebugBus } from "spikypanda-nodeeditor";

/**
 * Print + Watch nodes: emit messages on the editor's `DebugBus`, which
 * the console panel renders in the v2 editor footer.
 *
 *   PrintNode  Exec-driven with a data-friendly fallback. On each `in`
 *              trigger, print the `text` port value (or the static
 *              `text` editable) and pulse `then`: UE5 PrintString
 *              semantics. Two tolerances close the classic footgun of
 *              wiring a PAYLOAD into a print and reading an empty line:
 *                - a non-boolean token arriving on `in` (an alarm
 *                  object, a number...) is itself printed when the
 *                  `text` port carries nothing this tick;
 *                - when `in` is UNWIRED, a token landing on `text`
 *                  triggers the print by itself (pure data mode).
 *
 *   WatchNode  Value-driven: every published `value` produces one
 *              bus entry tagged with the user-supplied `label`.
 *              Useful for observing the live state of a wire without
 *              chaining trigger inputs. Pass-through is intentionally
 *              NOT provided — wire to another consumer if you want
 *              tee-style observation, or fan-out the source itself.
 */

function readSlot<T>(session: ISession, node: RuntimeNode, slot: string, fallback: T): T {
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

/** Consume the last ready token on `slot`, reporting whether one arrived. */
function consumeSlot(session: ISession, node: RuntimeNode, slot: string): { hit: boolean; value: unknown } {
    const links = session.graph.links as ReadonlyArray<IChannel>;
    let hit = false;
    let value: unknown;
    for (const link of node.opsc<IChannel>()) {
        if (inSlotOf(link) !== slot) continue;
        if (!link.enabled) continue;
        const idx = links.indexOf(link);
        if (idx < 0 || !session.linkStates[idx].ready) continue;
        value = session.consume(idx);
        hit = true;
    }
    return { hit, value };
}

/** Whether any enabled incoming link targets `slot`. */
function slotWired(node: RuntimeNode, slot: string): boolean {
    for (const link of node.opsc<IChannel>()) {
        if (link.enabled && inSlotOf(link) === slot) return true;
    }
    return false;
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
    @cloneable private _text: string = "";
    @cloneable private _label: string = "Print";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "in", optional: true, type: "trigger" },
        { slot: "text", optional: true, type: "string" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "then", optional: false, type: "trigger" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("string")
    public get text(): string {
        return this._text;
    }
    public set text(v: string) {
        this.setField("text", this._text, v, (s) => {
            this._text = s;
        });
    }

    @editable("string")
    public get label(): string {
        return this._label;
    }
    public set label(v: string) {
        this.setField("label", this._label, v, (s) => {
            this._label = s;
        });
    }

    public override fire(session: ISession, _t: number): void {
        const inTok = consumeSlot(session, this, "in");
        const textTok = consumeSlot(session, this, "text");
        // Exec mode: a token on `in` triggers. Data mode: with `in`
        // unwired, a token on `text` triggers by itself.
        const triggered = inTok.hit || (!slotWired(this, "in") && textTok.hit);
        if (!triggered) return;
        // Payload precedence: wired text token, else a non-trigger
        // payload that arrived on `in` (alarm objects, numbers...),
        // else the static `text` editable.
        const payload = textTok.hit ? textTok.value : inTok.hit && typeof inTok.value !== "boolean" && inTok.value !== undefined ? inTok.value : this._text;
        DebugBus.instance.log("info", this._label || "Print", stringify(payload));
        publishOnSlot(session, this, "then", true);
    }
}

// ── WatchNode ────────────────────────────────────────────────────────

export class WatchNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _label: string = "Watch";
    // Maximum logs per SIM second. Default 30 Hz matches a comfortable
    // refresh rate for human eyes (1 line every ~33 ms of sim time);
    // crank up for fine debugging, down to 1 Hz for slow trends. At
    // 200 kHz sim rate a wide-open watch would dump 200 000 lines per
    // sim second to the DebugBus, freezing the console panel under
    // forced reflows — the throttle is non-negotiable for any sim
    // running at audio / RF rates.
    @cloneable private _maxRateHz: number = 30;
    // Last sim time (seconds) at which we emitted. Compared against the
    // current `t` passed into fire() so the throttle is deterministic
    // wall-time-independent: a paused sim doesn't accidentally release
    // pent-up emissions when it resumes.
    private _lastEmitT: number = -Infinity;
    // Last value emitted. Used to AT LEAST emit when the value changes
    // even if we're under the rate cap — a one-off transient at 1 µs
    // wide between two throttle windows would otherwise be invisible.
    private _lastEmitValue: unknown = undefined;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "value", optional: true, type: "any" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("string")
    public get label(): string {
        return this._label;
    }
    public set label(v: string) {
        this.setField("label", this._label, v, (s) => {
            this._label = s;
        });
    }

    @editable("number", { unit: "Hz", min: 0 })
    public get maxRateHz(): number {
        return this._maxRateHz;
    }
    public set maxRateHz(v: number) {
        // 0 means "unthrottled": user opt-in to the dangerous path
        // (low sim rates, single-step debug). Negative is clamped to 0.
        const next = Number.isFinite(v) && v > 0 ? v : 0;
        this.setField("maxRateHz", this._maxRateHz, next, (n) => {
            this._maxRateHz = n;
        });
    }

    public override reset(_session: ISession): void {
        // Reset throttle state so a fresh session starts emitting from
        // tick 1 instead of waiting for the throttle window to elapse
        // since the previous run's last emit.
        this._lastEmitT = -Infinity;
        this._lastEmitValue = undefined;
    }

    public override fire(session: ISession, t: number): void {
        const v = readSlot<unknown>(session, this, "value", undefined);
        if (v === undefined) return;

        // Two emit conditions, either is enough:
        //   1. enough sim time has passed since the last emit (rate cap);
        //   2. the value changed since the last emit, even within the
        //      rate window — captures transient events that would
        //      otherwise vanish between throttle ticks.
        const rate = this._maxRateHz;
        const minDt = rate > 0 ? 1 / rate : 0;
        const dueByRate = rate <= 0 || t - this._lastEmitT >= minDt;
        const changed = !Object.is(v, this._lastEmitValue);
        if (!dueByRate && !changed) return;

        DebugBus.instance.log("watch", this._label || "Watch", stringify(v));
        this._lastEmitT = t;
        this._lastEmitValue = v;
    }
}
