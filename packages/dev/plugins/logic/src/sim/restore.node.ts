import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

import { getSnapshot } from "./snapshot.node.js";

/**
 * RestoreNode — the read side of the snapshot/restore pair.
 *
 * On the rising edge of `trigger`, publishes the last payload that a
 * SnapshotNode with the matching `slotName` captured. If no snapshot
 * has ever been recorded for that slot, publishes nothing (silent
 * no-op) and the user can detect the miss via the `hasSnapshot`
 * viewable.
 *
 * Rationale for "silent on miss" rather than publishing undefined:
 * downstream consumers are usually typed (e.g. a Plant.setState
 * expects a state object). Pushing undefined would either crash them
 * or silently corrupt state. Better to make the absence visible only
 * in the property panel where the user can act on it.
 *
 * Editables:
 *   slotName   must match the SnapshotNode that captured the value.
 *              Mismatched names is the most common wiring bug; the
 *              `hasSnapshot` viewable surfaces it.
 *
 * Outputs:
 *   payload    the captured value (whatever type the snapshot held).
 *              Emitted only on a successful restore tick.
 */
export class RestoreNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "trigger", optional: true, type: "boolean" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "payload", optional: false, type: "any" }];

    @cloneable private _slotName: string = "default";

    // Rising-edge state, mirrors SnapshotNode for consistent semantics.
    private _prevTrigger: boolean = false;
    private _lastRestoreTick: number = -1;

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

    /** Tick number of the most recent successful restore, or -1 if
     *  never. Pairs with SnapshotNode.lastCaptureTick for a quick
     *  "did the round trip happen?" check in the property panel. */
    @viewable("number") public get lastRestoreTick(): number {
        return this._lastRestoreTick;
    }

    /** True when a SnapshotNode has ever recorded for this slotName.
     *  Recomputed live (cheap Map.has lookup) so the editor reflects
     *  cross-node state without us pushing an event from the snapshot
     *  side. */
    @viewable("boolean") public get hasSnapshot(): boolean {
        return getSnapshot(this._slotName) !== undefined;
    }

    public override reset(_session: ISession): void {
        this._prevTrigger = false;
        this.setField("lastRestoreTick", this._lastRestoreTick, -1, (n) => {
            this._lastRestoreTick = n;
        });
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Drain the trigger queue, keeping the last sampled level.
        // Same reasoning as SnapshotNode: if the upstream is bursting
        // we want the most recent edge, not the oldest queued one.
        let trigger: boolean | null = null;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (slot !== "trigger") continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                const v = session.consume(idx);
                trigger = Boolean(v);
            }
        }

        if (trigger === null) return;
        const rising = trigger && !this._prevTrigger;
        this._prevTrigger = trigger;
        if (!rising) return;

        // Look up the snapshot at restore time (not at fire entry),
        // so a Snapshot fired earlier this same tick is visible to a
        // Restore wired after it in the dataflow. The scheduler
        // guarantees fire-order respects dependency edges, and the
        // registry is synchronous.
        const entry = getSnapshot(this._slotName);
        if (entry === undefined) {
            // Miss: keep silent on the output. The user sees the empty
            // slot via the hasSnapshot viewable.
            return;
        }

        this.setField("lastRestoreTick", this._lastRestoreTick, t, (n) => {
            this._lastRestoreTick = n;
        });

        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "payload" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, entry.payload);
        }
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createRestoreNode(): RestoreNode {
    return new RestoreNode();
}
