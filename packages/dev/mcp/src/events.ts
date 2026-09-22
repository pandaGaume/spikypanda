/**
 * The runtime's event log.
 *
 * A resource is a snapshot: it says what is, not what happened. `spk://graph/state`
 * tells a client where the simulation stands, and a client that reads it every
 * two seconds still cannot tell whether a stage fired twice or not at all in
 * between. Some facts are only expressible as events: a stage was entered, a
 * model was asked, an answer came back in 812 ms and cost 431 tokens. A reader
 * that polls a snapshot misses all of them.
 *
 * So the runtime keeps a log, and publishes it as one more resource.
 *
 * **The protocol is not touched.** No new JSON-RPC method, no new notification
 * kind, no field added to an envelope MCP defines. An event log is a document,
 * and a document behind a URI is what a resource already is; a cursor is a
 * query parameter of an RFC 6570 template, which `McpResourceTemplate` already
 * carries. A client that has never heard of this file talks to the runtime
 * exactly as before, and a client that reads the log uses nothing but
 * `resources/read`.
 *
 * Delivery is therefore pull. When a server implements `resources/subscribe`
 * and `notifications/resources/updated`, both of which are in the MCP
 * specification, a reader is told instead of asking, with no change to this
 * log or to what it holds. Until then a reader polls with its cursor, which is
 * one small read.
 *
 * Two things this log does that a bare array would not:
 *
 *   - `seq` is monotonic and never repeats within a process, so a reader asks
 *     for what it has not seen instead of re-reading everything and guessing
 *     which entries are new;
 *   - `dropped` counts what was evicted before a reader with an old cursor
 *     could read it. **A reader that sees `dropped` grow knows it missed
 *     something**, and can say so rather than showing a gap as if it were a
 *     quiet moment. That distinction is the whole reason for the envelope.
 *
 * What an event must never carry: no key, no token, no authorization header,
 * no system prompt, no raw exchange. A tool result goes to the one caller that
 * asked for it; this log is readable by every client that can reach the
 * runtime. An event carries one line meant for a human and the figures around
 * it. And, as everywhere else in this layer, a fact the runtime does not have
 * is absent rather than guessed.
 */

/** The envelope every event carries, whatever its kind. */
export interface RuntimeEvent {
    /** Strictly increasing within one process, never reused. */
    readonly seq: number;
    /** ISO 8601 with milliseconds. */
    readonly at: string;
    /** Dotted and lowercase, namespaced by what produced it: `model.answered`. */
    readonly kind: string;
    /** Whatever the kind carries. Absent rather than guessed. */
    readonly [field: string]: unknown;
}

/** What `spk://events` contains. */
export interface EventsState {
    /** The sequence number of the most recent event produced, kept or not. */
    readonly seq: number;
    /** How many events are held right now. */
    readonly kept: number;
    /** How many were evicted since the process started. A reader watching this
        grow knows it missed events rather than reading a gap as silence. */
    readonly dropped: number;
    /** Oldest first. Limited to those after `since` when the reader asked. */
    readonly events: ReadonlyArray<RuntimeEvent>;
}

/** Events held before the oldest is evicted. */
const DEFAULT_CAPACITY = 200;

export class EventLog {
    private readonly _capacity: number;
    private _events: RuntimeEvent[] = [];
    private _seq = 0;
    private _dropped = 0;

    public constructor(capacity: number = DEFAULT_CAPACITY) {
        this._capacity = Math.max(1, Math.floor(capacity));
    }

    /** The sequence number of the last event appended. */
    public get seq(): number {
        return this._seq;
    }

    /**
     * Appends one event and returns it with its `seq` and `at` filled.
     *
     * `kind` is the caller's; everything else in `fields` is carried as given,
     * so a kind this package has never heard of costs nothing to emit and a
     * reader that does not know it simply ignores it. That is what keeps the
     * vocabulary additive: a new kind never breaks an existing reader.
     */
    public append(kind: string, fields: Record<string, unknown> = {}): RuntimeEvent {
        const event: RuntimeEvent = { ...fields, seq: ++this._seq, at: new Date().toISOString(), kind };
        this._events.push(event);
        if (this._events.length > this._capacity) {
            this._dropped += this._events.length - this._capacity;
            this._events = this._events.slice(this._events.length - this._capacity);
        }
        return event;
    }

    /**
     * The log, or the part of it a reader has not seen.
     *
     * `since` beyond `seq` returns no events and the current `seq`, which is
     * how a reader catches up after the runtime restarted: its cursor is then
     * higher than `seq`, and seeing that it resets instead of assuming a gap.
     */
    public read(since?: number): EventsState {
        const from = typeof since === "number" && Number.isFinite(since) ? since : null;
        const events = from === null ? [...this._events] : this._events.filter((e) => e.seq > from);
        return { seq: this._seq, kept: this._events.length, dropped: this._dropped, events };
    }

    /** Forgets everything held, keeping the sequence: a reader's cursor stays valid. */
    public clear(): void {
        this._dropped += this._events.length;
        this._events = [];
    }
}
