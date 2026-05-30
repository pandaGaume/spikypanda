import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * RateDividerNode — downsample the firing rate by an integer factor.
 *
 * Helios runs different subsystems at different rates: the fast inner
 * loop (sensor ingest, control) ticks at, say, 1 kHz, while the slow
 * outer loop (planner, conservation monitor, plotting) only needs a
 * 10 Hz update. Wiring everything to the same Clock and using a
 * RateDivider to expose a "every Nth tick" signal keeps the graph
 * simple: one clock source, divider nodes for each cadence.
 *
 * Two output flavours:
 *   value   passthrough of the `value` input, but ONLY on the firing
 *           tick. Wire any upstream stream through this to thin it
 *           out (e.g. plot every 10th sample to avoid drowning the
 *           tile in updates).
 *   tick    a plain boolean (true) emitted on every firing tick. Use
 *           this as a "slow clock" trigger when you don't have a
 *           value to pass through (e.g. firing a snapshot every
 *           1000 ticks).
 *
 * If `value` is not wired, the node still emits `tick`, so this also
 * works as a clock-only divider. If `value` IS wired but the upstream
 * doesn't deliver on the firing tick, we skip the passthrough (no
 * fake-data emission) but still publish `tick` so the cadence is
 * preserved.
 *
 * Editables:
 *   divisor   integer ≥ 1. divisor=1 makes the node a no-op; the
 *             default of 10 is the typical "fast loop to plot rate"
 *             ratio. Setting it to 0 or negative would freeze the
 *             output (counter never reaches the threshold), so we
 *             clamp on write.
 */
export class RateDividerNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "value", optional: true, type: "any" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "value", optional: false, type: "any" },
        { slot: "tick", optional: false, type: "boolean" },
    ];

    @cloneable private _divisor: number = 10;

    // Counter of fire() calls since the last emission. Reaches
    // divisor → emit → reset to 0. Kept as a plain int (not modulo
    // arithmetic on the tick number) so the cadence is robust to
    // a scheduler that doesn't supply a monotonic tick to fire().
    private _counter: number = 0;
    private _emitCount: number = 0;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number")
    public get divisor(): number {
        return this._divisor;
    }
    public set divisor(v: number) {
        // Clamp to ≥1: divisor=0 would never emit (counter starts at
        // 1 after first fire), divisor<0 is nonsensical. Floor to int
        // because half-integer divisors have no defined meaning on
        // a discrete tick stream.
        const next = Math.max(1, Math.floor(v));
        this.setField("divisor", this._divisor, next, (n) => {
            this._divisor = n;
            // Reset the counter so the cadence is predictable after a
            // change: the next emission happens divisor ticks from
            // now, not at whatever the old counter was carrying.
            this._counter = 0;
        });
    }

    /** Lifetime emit count since reset(). Pairs nicely with the
     *  scheduler's tick number: emits / ticks should converge to
     *  1/divisor over time. */
    @viewable("number") public get emitCount(): number {
        return this._emitCount;
    }

    public override reset(_session: ISession): void {
        this._counter = 0;
        this.setField("emitCount", this._emitCount, 0, (n) => {
            this._emitCount = n;
        });
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Drain the value input every tick (even on non-firing ticks)
        // so the channel queue doesn't backlog. We keep the most
        // recent sample for the next firing emission; older samples
        // are dropped, which is the correct semantics for "thin out
        // the stream".
        let havePending = false;
        let pending: unknown = undefined;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (slot !== "value") continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                pending = session.consume(idx);
                havePending = true;
            }
        }

        this._counter += 1;
        if (this._counter < this._divisor) return;
        this._counter = 0;

        // Firing tick. Always emit `tick`; emit `value` only when we
        // have a fresh sample to pass through (skipping the value
        // output on a no-data tick preserves the "passthrough" word
        // in the docs: we never invent data).
        this.setField("emitCount", this._emitCount, this._emitCount + 1, (n) => {
            this._emitCount = n;
        });

        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (link.slot === "tick") {
                session.publish(idx, true);
            } else if (link.slot === "value" && havePending) {
                session.publish(idx, pending);
            }
        }
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createRateDividerNode(): RateDividerNode {
    return new RateDividerNode();
}
