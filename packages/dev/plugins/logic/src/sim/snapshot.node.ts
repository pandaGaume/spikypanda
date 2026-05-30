import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Module-level snapshot registry, shared between every SnapshotNode
 * (writer) and RestoreNode (reader) in the same JS runtime.
 *
 * Why a global Map and not an explicit edge between the two nodes?
 *   - The dataflow graph is single-tick: a value published this tick
 *     is consumed by the very next downstream fire(). A snapshot is
 *     intentionally cross-tick (captured now, restored 1000 ticks
 *     later when a fault triggers). Forcing that through a wire would
 *     mean buffering arbitrary payloads on the channel itself, which
 *     the scheduler is not built for.
 *   - The user's mental model is "named slot": you write to slot
 *     'pre-fault' here, you read from slot 'pre-fault' there. A wire
 *     would force a spatial coupling the model deliberately doesn't
 *     have.
 *
 * The registry stores the raw payload by reference; SnapshotNode does
 * NOT defensive-copy on write because we don't know what shape the
 * payload has (could be a plain number, a tensor, a deep object). The
 * caller is responsible for emitting a fresh object if they want
 * immutability across replay. For typical sim use (capture full state,
 * never mutate the captured object), the by-reference contract is
 * fine and avoids the deep-clone cost.
 */
export interface ISnapshotEntry {
    payload: unknown;
    tick: number;
}

const _registry: Map<string, ISnapshotEntry> = new Map();

/** Read-only accessor used by RestoreNode. Exported so other modules
 *  in the Helios package (e.g. a future "snapshot list" UI node) can
 *  enumerate slots without poking at a private symbol. */
export function getSnapshot(slotName: string): ISnapshotEntry | undefined {
    return _registry.get(slotName);
}

/** Write accessor used by SnapshotNode. Kept as a module-level helper
 *  rather than a static class method so RestoreNode imports a value
 *  (not a class), avoiding a circular-import hazard between the two
 *  node files. */
export function setSnapshot(slotName: string, entry: ISnapshotEntry): void {
    _registry.set(slotName, entry);
}

/** Clear all slots. Intended for test harnesses; not wired into the
 *  reset() of either node because clearing on a single-node reset
 *  would race with the matching restore node's reset on the same
 *  scheduler pass. The user explicitly re-snapshots when they want
 *  fresh state. */
export function clearSnapshots(): void {
    _registry.clear();
}

/**
 * SnapshotNode — captures the current value of `payload` into a named
 * slot on the rising edge of `trigger`.
 *
 * Typical wiring:
 *
 *   PlantState ──► payload ┐
 *                          ├── Snapshot(slotName="pre-fault") ──► stored
 *   AlertSignal ──► trigger ┘
 *
 * Later, RestoreNode(slotName="pre-fault") emits the captured payload
 * on its own trigger. The pair is the foundation of the "rewind to
 * last known good" pattern that Helios uses for agent recovery
 * scenarios.
 *
 * Editables:
 *   slotName   string identifier shared with the matching RestoreNode.
 *              Multiple Snapshot/Restore pairs can coexist by picking
 *              distinct names ("pre-fault", "10min-checkpoint", ...).
 *
 * Outputs:
 *   stored     boolean — true on the tick the capture happened,
 *              suitable for a tally counter or LED indicator
 *              downstream. NOT emitted when trigger is false or low.
 */
export class SnapshotNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "trigger", optional: true, type: "boolean" },
        { slot: "payload", optional: true, type: "any" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "stored", optional: false, type: "boolean" }];

    @cloneable private _slotName: string = "default";

    // Edge-detection state: we capture on a low->high transition, not
    // on a sustained high level. Without this, holding `trigger` true
    // for N ticks would re-capture N times, which is rarely what the
    // user wants.
    private _prevTrigger: boolean = false;
    private _lastCaptureTick: number = -1;
    private _snapshotCount: number = 0;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("string")
    public get slotName(): string {
        return this._slotName;
    }
    public set slotName(v: string) {
        this.setField("slotName", this._slotName, String(v), (s) => {
            this._slotName = s;
        });
    }

    /** Tick number of the most recent capture, or -1 if never. The UI
     *  uses this to confirm "yes, the snapshot was actually taken". */
    @viewable("number") public get lastCaptureTick(): number {
        return this._lastCaptureTick;
    }

    /** Lifetime count of captures since reset(). Doubles as a debug
     *  signal: if it never increments, the trigger isn't firing. */
    @viewable("number") public get snapshotCount(): number {
        return this._snapshotCount;
    }

    public override reset(_session: ISession): void {
        this._prevTrigger = false;
        this.setField("lastCaptureTick", this._lastCaptureTick, -1, (n) => {
            this._lastCaptureTick = n;
        });
        this.setField("snapshotCount", this._snapshotCount, 0, (n) => {
            this._snapshotCount = n;
        });
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Collect both inputs in one pass. We grab the LAST value
        // delivered on each slot this tick (consume() is destructive;
        // the loop drains the queue), so if the upstream is bursting
        // we snapshot the most recent state, which matches the user's
        // expectation of "current value at trigger time".
        let trigger: boolean | null = null;
        let payload: unknown = undefined;
        let havePayload = false;

        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                const v = session.consume(idx);
                if (slot === "trigger") {
                    trigger = Boolean(v);
                } else if (slot === "payload") {
                    payload = v;
                    havePayload = true;
                }
            }
        }

        // No trigger this tick: nothing to detect, just remember the
        // current level for the next edge comparison.
        if (trigger === null) {
            // No event; don't update _prevTrigger because we have no
            // new sample. Leaving it alone preserves the previous edge
            // detection state across ticks where the trigger source
            // simply didn't publish.
            return;
        }

        const rising = trigger && !this._prevTrigger;
        this._prevTrigger = trigger;
        if (!rising) return;

        // Rising edge confirmed. Persist into the global registry. If
        // the payload port had no input this tick we still capture
        // (with undefined), because the user may want a marker-only
        // checkpoint; the alternative of silently skipping would hide
        // a wiring bug.
        setSnapshot(this._slotName, {
            payload: havePayload ? payload : undefined,
            tick: t,
        });
        this.setField("lastCaptureTick", this._lastCaptureTick, t, (n) => {
            this._lastCaptureTick = n;
        });
        this.setField("snapshotCount", this._snapshotCount, this._snapshotCount + 1, (n) => {
            this._snapshotCount = n;
        });

        // Tell downstream observers it happened. One-shot true; the
        // user can drive a counter / LED off this without worrying
        // about debouncing the source trigger.
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "stored" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, true);
        }
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createSnapshotNode(): SnapshotNode {
    return new SnapshotNode();
}
