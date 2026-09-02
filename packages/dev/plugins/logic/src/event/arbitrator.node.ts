import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf, publishToFirstOutput } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Supported arbitration policies. Encoded as a string-literal union so
 * the editable round-trips through JSON serialisation unchanged and the
 * UI can render a free-form text field today, an enum picker tomorrow,
 * without touching the runtime.
 */
export type ArbitratorPolicy = "priority" | "blend" | "vote";

/**
 * Per-request action shape. Either a bare number (priority defaults to
 * 0, treated as "vote-only / fallback") or an explicit
 * `{ priority, value }` object. Producers stay decoupled: a simple
 * controller can publish floats directly; a safety override can publish
 * `{ priority: 999, value: 0 }` and win every tie.
 */
export interface IActionRequest {
    priority: number;
    value: number;
}

interface IParsedRequest {
    index: number;
    priority: number;
    value: number;
}

/**
 * Merge variadic action requests into a single applied action.
 *
 * Why: every Helios actuator is fed by multiple competing controllers
 * (PID, safety override, human pilot input, learned policy). The
 * arbitrator centralises the fusion rule so the actuator stays
 * single-input and the policy choice is a graph-visible editable
 * rather than buried in glue code. Switching from `priority` to
 * `blend` (e.g. when transitioning from teleop to shared autonomy) is
 * a one-click edit, not a re-wire.
 *
 * Variadic protocol:
 *   - Inputs `req_0`, `req_1`, ... are auto-grown by the editor's
 *     variadic reconciler as the user wires them. Slot index parsing
 *     is defensive: a malformed `req_*` name is skipped, not thrown.
 *   - Each request is read as either:
 *       * a number      → `{ priority: 0, value: <n> }`
 *       * an object     → `{ priority: Number(.priority || 0),
 *                            value:    Number(.value) }` if `.value`
 *                         is coercible to a finite number
 *       * anything else → silently dropped (still consumes the token
 *                         so the upstream producer is not stalled)
 *
 * Policies:
 *   - priority: highest `priority` wins; ties broken by lowest input
 *     index. Output `applied = winner.value`, `sourceIdx = winner.index`.
 *     This is the default because it composes well with safety
 *     overrides — an estop publisher at priority=999 always wins.
 *   - blend:    weighted average `Σ(p_i · v_i) / Σ(p_i)`. If every
 *     priority is 0 we fall back to the plain arithmetic mean so the
 *     node still produces a meaningful number (rather than NaN) when
 *     all upstreams omit priority. `sourceIdx` is -1 because no single
 *     source "won".
 *   - vote:     median over values (priorities ignored). Robust to a
 *     single misbehaving controller at the cost of latency for an
 *     even number of inputs (we pick the lower-middle to keep the
 *     output deterministic and tie-free). `sourceIdx` is -1.
 *
 * Viewables expose the last decision so the property panel doubles as
 * a live trace of which controller is currently in command — invaluable
 * when debugging "why is the actuator twitching" without instrumenting
 * downstream.
 */
export class ArbitratorNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "req_0", optional: true, type: "any" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "applied", optional: false, type: "float" },
        { slot: "sourceIdx", optional: false, type: "float" },
    ];

    @cloneable private _policy: ArbitratorPolicy = "priority";

    // Viewable-backing fields. Default `lastSourceIdx` to -1 (and not 0)
    // so a freshly-reset arbitrator visibly shows "no decision yet"
    // rather than a misleading "input 0 won".
    @cloneable private _lastApplied: number = 0;
    @cloneable private _lastSourceIdx: number = -1;
    @cloneable private _activeRequests: number = 0;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /** Active arbitration policy. Encoded as a free-form string with a
     *  `unit` hint listing the legal values so the editor's tooltip
     *  serves as an inline cheat-sheet. Invalid inputs clamp to the
     *  default `"priority"` rather than throwing — the node should
     *  never crash a session over a typo. */
    @editable("string", { enum: ["priority", "blend", "vote"] })
    public get policy(): ArbitratorPolicy {
        return this._policy;
    }
    public set policy(v: ArbitratorPolicy) {
        const next: ArbitratorPolicy = v === "blend" || v === "vote" ? v : "priority";
        this.setField("policy", this._policy, next, (n) => {
            this._policy = n as ArbitratorPolicy;
        });
    }

    /** Last value emitted on `applied`. */
    @viewable("number")
    public get lastApplied(): number {
        return this._lastApplied;
    }

    /** Last value emitted on `sourceIdx` (winning input in priority
     *  mode, -1 in blend/vote since no single source dominates). */
    @viewable("number")
    public get lastSourceIdx(): number {
        return this._lastSourceIdx;
    }

    /** Number of `req_*` inputs that produced a usable request on the
     *  most recent fire. Useful at a glance to confirm a controller
     *  rewire didn't silently break the input parse. */
    @viewable("number")
    public get activeRequests(): number {
        return this._activeRequests;
    }

    public override reset(_session: ISession): void {
        this.setField("lastApplied", this._lastApplied, 0, (n) => {
            this._lastApplied = n;
        });
        this.setField("lastSourceIdx", this._lastSourceIdx, -1, (n) => {
            this._lastSourceIdx = n;
        });
        this.setField("activeRequests", this._activeRequests, 0, (n) => {
            this._activeRequests = n;
        });
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        const requests: IParsedRequest[] = [];

        // Walk every incoming channel, take only `req_*` slots, parse
        // the slot index and the payload. We pull each slot at most
        // once per tick (no draining loop) so the arbitrator matches
        // the natural "one request per controller per tick" cadence of
        // a control graph; bursty upstreams that want every value
        // arbitrated should rate-divide on their side first.
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (slot.indexOf("req_") !== 0) continue;
            const slotIdx = Number(slot.slice(4));
            if (!Number.isFinite(slotIdx)) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const raw = session.consume(idx);
            const parsed = parseRequest(raw);
            if (parsed === null) continue;
            requests.push({ index: slotIdx, priority: parsed.priority, value: parsed.value });
        }

        this.setField("activeRequests", this._activeRequests, requests.length, (n) => {
            this._activeRequests = n;
        });

        // No usable requests on this tick: do not publish (so we don't
        // override the actuator's existing setpoint with stale data).
        // Viewables stay at their last value, making the inactivity
        // visible at a glance (activeRequests == 0).
        if (requests.length === 0) return;

        const decision = this._decide(requests);

        this.setField("lastApplied", this._lastApplied, decision.applied, (n) => {
            this._lastApplied = n;
        });
        this.setField("lastSourceIdx", this._lastSourceIdx, decision.sourceIdx, (n) => {
            this._lastSourceIdx = n;
        });

        // `applied` is the first output (declared in inputPorts above)
        // so we can fan it out via the standard helper. `sourceIdx`
        // goes through manual slot lookup since it's the second port.
        publishToFirstOutput(session, this, decision.applied);
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "sourceIdx" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, decision.sourceIdx);
        }
    }

    /** Pure decision function — separated from `fire` so the policy
     *  switch is trivial to unit-test by feeding hand-crafted arrays
     *  without spinning up a session. Sort-by-index ensures
     *  tie-breaking (priority mode) and median selection (vote mode)
     *  are deterministic across runs. */
    private _decide(requests: IParsedRequest[]): { applied: number; sourceIdx: number } {
        // Index-sorted copy is the canonical ordering all policies
        // assume: priority ties pick the LOWEST index, vote median
        // picks the lower-middle on even counts (so the result is
        // reproducible across ticks even if the channel-iteration
        // order ever changes).
        const ordered = requests.slice().sort((a, b) => a.index - b.index);

        switch (this._policy) {
            case "blend": {
                let weightedSum = 0;
                let weightTotal = 0;
                for (const r of ordered) {
                    weightedSum += r.priority * r.value;
                    weightTotal += r.priority;
                }
                if (weightTotal > 0) {
                    return { applied: weightedSum / weightTotal, sourceIdx: -1 };
                }
                // Fallback: every upstream omitted priority. Plain mean
                // is the least-surprise default — at least it still
                // produces a meaningful number.
                let mean = 0;
                for (const r of ordered) mean += r.value;
                return { applied: mean / ordered.length, sourceIdx: -1 };
            }
            case "vote": {
                const values = ordered.map((r) => r.value).sort((a, b) => a - b);
                // Lower-middle for even counts: deterministic and
                // matches the documented contract above.
                const mid = Math.floor((values.length - 1) / 2);
                return { applied: values[mid], sourceIdx: -1 };
            }
            case "priority":
            default: {
                let winner = ordered[0];
                for (let i = 1; i < ordered.length; i++) {
                    const r = ordered[i];
                    // Strict `>` keeps the lowest-index winner on ties
                    // (we walk in index order, so the first occurrence
                    // of the max priority is kept).
                    if (r.priority > winner.priority) winner = r;
                }
                return { applied: winner.value, sourceIdx: winner.index };
            }
        }
    }
}

/** Coerce an opaque token from a `req_*` channel into a canonical
 *  request, or null if it is not interpretable. Numbers become
 *  zero-priority requests so a plain `float` controller upstream still
 *  composes with explicit-priority safety overrides. Objects must
 *  carry a finite-numeric `value`; `priority` defaults to 0 when
 *  missing or non-numeric. */
function parseRequest(raw: unknown): Nullable<IActionRequest> {
    if (typeof raw === "number" && Number.isFinite(raw)) {
        return { priority: 0, value: raw };
    }
    if (raw === null || typeof raw !== "object") return null;
    const obj = raw as { priority?: unknown; value?: unknown };
    const value = typeof obj.value === "number" && Number.isFinite(obj.value) ? obj.value : null;
    if (value === null) return null;
    const priority = typeof obj.priority === "number" && Number.isFinite(obj.priority) ? obj.priority : 0;
    return { priority, value };
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createArbitratorNode(): ArbitratorNode {
    return new ArbitratorNode();
}
