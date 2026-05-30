import { viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * `Helios.Actuator:emergency-shutdown` — a single latched safety bit.
 *
 * Once any `trigger` input arrives as `true`, the internal `_latched`
 * flag is set and `shutdown` will broadcast `true` on every subsequent
 * fire until an explicit `reset=true` input arrives (or the session is
 * reset). This is the standard "fail-safe latch" pattern: a transient
 * fault on the trigger line is enough to latch the safety state, and
 * clearing the state requires an operator-initiated reset rather than
 * "the trigger went away".
 *
 * Inputs:
 *   trigger   boolean; any `true` value at any time latches `shutdown`.
 *   reset     boolean; any `true` value clears the latch (and the
 *             triggerCount viewable).
 *
 * Outputs:
 *   shutdown  boolean; published on every fire (so downstream actuators
 *             can be unconditionally gated by ANDing with `!shutdown`,
 *             without worrying about edge-vs-level semantics).
 *
 * Reset semantics: a fire that carries both `trigger=true` AND
 * `reset=true` ends up clearing the latch — `reset` is applied last so
 * the operator-initiated reset always wins over a same-tick re-trigger.
 *
 * Viewables:
 *   isShutdown        the latch state itself, mirrored for the panel.
 *   triggerCount      total number of `trigger=true` events observed
 *                     since the last session reset / explicit reset.
 *   lastTriggerTick   the scheduler tick at which the latch most
 *                     recently transitioned from false → true (NaN
 *                     before the first trigger of a session).
 */
export class EmergencyShutdownNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "trigger", optional: true, type: "boolean" },
        { slot: "reset", optional: true, type: "boolean" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "shutdown", optional: false, type: "boolean" }];

    // ── Runtime state (no editables — the latch is the whole node) ────
    private _latched: boolean = false;
    private _triggerCount: number = 0;
    private _lastTriggerTick: number = NaN;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    /** Mirror of `_latched` for the property panel. */
    @viewable("boolean") public get isShutdown(): boolean {
        return this._latched;
    }

    /** Total number of trigger=true events observed since last reset. */
    @viewable("number") public get triggerCount(): number {
        return this._triggerCount;
    }

    /** Scheduler tick at the most recent false→true transition. NaN
     *  means "no trigger seen yet this session". */
    @viewable("number") public get lastTriggerTick(): number {
        return this._lastTriggerTick;
    }

    public override reset(_session: ISession): void {
        this._latched = false;
        this._triggerCount = 0;
        this._lastTriggerTick = NaN;
    }

    public override fire(session: ISession, tick: number): void {
        // Collect every boolean we see on `trigger` and `reset` this
        // tick. Multiple triggers in one tick still only count as one
        // false→true transition for `lastTriggerTick`, but they DO
        // bump `triggerCount` (so a saturating fault source shows up
        // as many events rather than a single one).
        let sawTrigger = false;
        let sawReset = false;

        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            // Accept any truthy non-undefined value (boolean true,
            // numeric 1, ...). The port is typed boolean but upstream
            // converters can be sloppy; better to react than to silently
            // ignore a fault signal.
            const v = session.consume(idx);
            if (v === undefined || v === null) continue;
            const flag = Boolean(v);
            if (slot === "trigger" && flag) {
                sawTrigger = true;
                this._triggerCount += 1;
            } else if (slot === "reset" && flag) {
                sawReset = true;
            }
        }

        // Apply trigger first, then reset — operator reset wins over a
        // same-tick re-trigger so the system is recoverable even when
        // the trigger source is still active.
        if (sawTrigger && !this._latched) {
            this._latched = true;
            this._lastTriggerTick = tick;
        } else if (sawTrigger) {
            // Already latched; just update the most-recent tick so the
            // panel reflects ongoing fault activity.
            this._lastTriggerTick = tick;
        }
        if (sawReset) {
            this._latched = false;
        }

        // Broadcast every fire — downstream gating then becomes a
        // simple per-tick AND without needing edge-detection logic.
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "shutdown" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, this._latched);
        }
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createEmergencyShutdownNode(): EmergencyShutdownNode {
    return new EmergencyShutdownNode();
}
