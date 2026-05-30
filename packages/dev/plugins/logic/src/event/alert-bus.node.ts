import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Severity tag recognised by the bus. Anything else is normalised to
 * `"info"` on ingest so downstream filters and viewables never have to
 * branch on an unbounded string set.
 */
export type AlertSeverity = "info" | "warn" | "error";

/**
 * Canonical, typed event shape circulated on an `AlertBusNode`.
 *
 * Producers may publish either this object or a bare string (treated as
 * an info-level message whose topic IS the string and payload is null);
 * the node normalises both into this shape before fan-out so subscribers
 * see a uniform contract.
 */
export interface IAlertMessage {
    topic: string;
    severity: AlertSeverity;
    payload: unknown;
}

const RING_CAPACITY = 32;

/**
 * Typed pub/sub event bus for the Helios agent runtime.
 *
 * Why a node and not a service: graphs are the unit of execution and
 * snapshot in SpikyPanda. Modeling the bus as a node keeps event
 * routing visible in the editor, makes the filter scope explicit per
 * wire, and lets graph snapshots capture the bus's recent history
 * alongside everything else. It also means multiple bus instances can
 * exist for free if a future graph wants partitioned channels (e.g.
 * one bus per subsystem) — though V1 is intentionally documented as
 * single-instance per graph.
 *
 * Behavior:
 *   - Every tick, every queued token on `publish` is consumed, coerced
 *     into the canonical `IAlertMessage` (string upstreams are wrapped
 *     as `{ topic: <string>, severity: "info", payload: null }`), then
 *     matched against `topicFilter`.
 *   - Matched messages are republished on every wired `subscribe`
 *     channel and appended to a fixed-capacity ring buffer of the last
 *     32 events (overwritten in FIFO order). Non-matching messages are
 *     still counted in `publishedCount` but are not forwarded — the
 *     bus is a passive broker, not a sink.
 *
 * Filter grammar (V1, deliberately minimal):
 *   - `"*"`            matches every topic.
 *   - any other value  exact-string equality with `message.topic`.
 *   - Glob/regex matching is deferred; topic conventions are still in
 *     flux in the wider agent runtime, so locking in a wildcard
 *     dialect now would be premature.
 *
 * Viewables:
 *   - `lastTopic` / `lastSeverity` mirror the most recently FORWARDED
 *     message (i.e. one that passed the filter). They are deliberately
 *     not updated on filtered-out events so the property panel reads
 *     like a tap on what subscribers actually receive.
 *   - `publishedCount` is total ingestions including dropped ones.
 *   - `subscribedCount` is total forwarded (i.e. published on
 *     `subscribe`). The gap between them is the filter's reject rate.
 *
 * Single-instance per graph: V1 contract. Multi-bus topology is a
 * straightforward future evolution (add a `busId` editable + match it
 * against a `busId` field on the message) but is not needed for the
 * initial Helios agent demos.
 */
export class AlertBusNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "publish", optional: true, type: "any" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "subscribe", optional: false, type: "any" }];

    @cloneable private _topicFilter: string = "*";

    // Viewable-backing fields. Kept private + mutated via `setField` so
    // the LiveBinder propagates each tick's update to the property
    // panel without forcing the user to inspect a hidden internal state.
    @cloneable private _lastTopic: string = "";
    @cloneable private _lastSeverity: AlertSeverity = "info";
    @cloneable private _publishedCount: number = 0;
    @cloneable private _subscribedCount: number = 0;

    /**
     * Ring buffer of the last RING_CAPACITY ingested messages. Lives on
     * the instance (not serialised) because it's a runtime diagnostic
     * window, not graph state. Allocated lazily-eagerly here at field
     * init since 32 references is cheap and avoids the `if (!buf)`
     * branch in the hot path.
     */
    private _ring: Array<Nullable<IAlertMessage>> = new Array(RING_CAPACITY).fill(null);
    private _ringHead: number = 0;
    private _ringSize: number = 0;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /**
     * Subscription filter. `"*"` accepts every topic; any other value
     * is exact-string matched against `message.topic`. Kept as a plain
     * string (not enum) so a future glob/regex extension lands as a
     * backwards-compatible syntax upgrade rather than a breaking
     * editable-type change.
     */
    @editable("string")
    public get topicFilter(): string {
        return this._topicFilter;
    }
    public set topicFilter(v: string) {
        const next = typeof v === "string" ? v : "*";
        this.setField("topicFilter", this._topicFilter, next, (n) => {
            this._topicFilter = n;
        });
    }

    /** Topic of the most recently FORWARDED message (post-filter). */
    @viewable("string")
    public get lastTopic(): string {
        return this._lastTopic;
    }

    /** Severity of the most recently FORWARDED message. */
    @viewable("string")
    public get lastSeverity(): AlertSeverity {
        return this._lastSeverity;
    }

    /** Total messages INGESTED on `publish` since last reset, including
     *  those rejected by the filter. */
    @viewable("number")
    public get publishedCount(): number {
        return this._publishedCount;
    }

    /** Total messages FORWARDED on `subscribe` since last reset. */
    @viewable("number")
    public get subscribedCount(): number {
        return this._subscribedCount;
    }

    public override reset(_session: ISession): void {
        this.setField("publishedCount", this._publishedCount, 0, (n) => {
            this._publishedCount = n;
        });
        this.setField("subscribedCount", this._subscribedCount, 0, (n) => {
            this._subscribedCount = n;
        });
        this.setField("lastTopic", this._lastTopic, "", (n) => {
            this._lastTopic = n;
        });
        this.setField("lastSeverity", this._lastSeverity, "info", (n) => {
            this._lastSeverity = n as AlertSeverity;
        });
        for (let i = 0; i < RING_CAPACITY; i++) this._ring[i] = null;
        this._ringHead = 0;
        this._ringSize = 0;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Drain `publish` first so all ingestion accounting (count +
        // ring) reflects this tick before we fan out. A single tick may
        // carry multiple events if upstream is bursty.
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (slot !== "publish") continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                const raw = session.consume(idx);
                const msg = normaliseAlertMessage(raw);
                if (msg === null) continue;
                this._ingest(msg);
                if (matchesFilter(this._topicFilter, msg.topic)) {
                    this._forward(session, msg);
                }
            }
        }
    }

    /** Append to ring + bump published counter. Separated from
     *  `_forward` so we record dropped messages too — handy when
     *  diagnosing "why isn't my subscriber seeing X" by inspecting the
     *  ring vs the forwarded count. */
    private _ingest(msg: IAlertMessage): void {
        this._ring[this._ringHead] = msg;
        this._ringHead = (this._ringHead + 1) % RING_CAPACITY;
        if (this._ringSize < RING_CAPACITY) this._ringSize++;
        this.setField("publishedCount", this._publishedCount, this._publishedCount + 1, (n) => {
            this._publishedCount = n;
        });
    }

    /** Fan out `msg` on every wired `subscribe` channel and update the
     *  last-seen viewables. Mirrors `publishToFirstOutput` but doesn't
     *  use it because we want explicit slot-name keying for clarity in
     *  this multi-purpose bus context. */
    private _forward(session: ISession, msg: IAlertMessage): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "subscribe" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, msg);
        }
        this.setField("subscribedCount", this._subscribedCount, this._subscribedCount + 1, (n) => {
            this._subscribedCount = n;
        });
        this.setField("lastTopic", this._lastTopic, msg.topic, (n) => {
            this._lastTopic = n;
        });
        this.setField("lastSeverity", this._lastSeverity, msg.severity, (n) => {
            this._lastSeverity = n as AlertSeverity;
        });
    }

    /**
     * Read-only snapshot of the most recent up-to-32 ingested events,
     * ordered oldest-first. Exposed as a plain method (not viewable)
     * so external diagnostics tools can walk the ring without coupling
     * to the property-panel kind system.
     */
    public recentEvents(): ReadonlyArray<IAlertMessage> {
        if (this._ringSize === 0) return [];
        const out: IAlertMessage[] = [];
        const start = (this._ringHead - this._ringSize + RING_CAPACITY) % RING_CAPACITY;
        for (let i = 0; i < this._ringSize; i++) {
            const m = this._ring[(start + i) % RING_CAPACITY];
            if (m) out.push(m);
        }
        return out;
    }
}

/** Strict-but-lenient parser. Returns null if `raw` simply cannot be
 *  interpreted as a message (e.g. number, boolean, null). A string is
 *  upgraded to an info-level event whose topic IS the string. An
 *  object is accepted when it carries a string `topic`; missing
 *  severity defaults to "info" and unknown severity values are
 *  clamped to "info" so the downstream type set stays closed. */
function normaliseAlertMessage(raw: unknown): Nullable<IAlertMessage> {
    if (typeof raw === "string") {
        return { topic: raw, severity: "info", payload: null };
    }
    if (raw === null || typeof raw !== "object") return null;
    const obj = raw as { topic?: unknown; severity?: unknown; payload?: unknown };
    const topic = typeof obj.topic === "string" ? obj.topic : null;
    if (topic === null) return null;
    const sev = obj.severity;
    const severity: AlertSeverity = sev === "warn" || sev === "error" ? sev : "info";
    return { topic, severity, payload: obj.payload ?? null };
}

/** Filter predicate. V1 grammar: `"*"` accepts all, anything else is
 *  exact string equality. Keeping this isolated makes a future glob
 *  upgrade a one-function swap. */
function matchesFilter(filter: string, topic: string): boolean {
    if (filter === "*" || filter === "") return true;
    return filter === topic;
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createAlertBusNode(): AlertBusNode {
    return new AlertBusNode();
}
