import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";

/**
 * Feedback channel — unit-delay primitive (Z^-N) used to break cyclic
 * data dependencies into DAG-valid graphs.
 *
 * A closed-loop control graph (DC motor → tachymeter → PI controller →
 * back to motor) is conceptually cyclic, but the runtime scheduler
 * requires a topological sort and refuses cycles. Inserting a Feedback
 * Channel between the tachymeter output and the PI's measurement input
 * turns the cycle into a DAG: at tick t the channel publishes a value
 * stamped with `validAtTick = t + delay`, so the consumer sees that
 * value only at the future tick, not at the current one. The wire that
 * "goes backward" in intent goes forward in time by `delay` ticks.
 *
 * Implementation: the node carries NO ring buffer of its own. Every
 * publish is stamped with a future tick (`validAtTick`) and lives in
 * Session.deferred until its tick arrives. At reset() the node seeds
 * `delay` initial events at validAtTick = 0..delay-1, so the consumer
 * has bootstrap values for the first `delay` ticks before the first
 * real input has come round the loop.
 *
 * Semantics:
 *   delay = 0   passthrough (publish stamps validAtTick = currentTick,
 *               delivered same tick — still useful as a typed re-router
 *               / split-view placeholder, but breaks NO cycle).
 *   delay = 1   classic Z^-1 unit delay. Default.
 *   delay = N   Z^-N. Output at tick t equals input at tick (t - N).
 *
 * Type is `any` so the same node works for floats (motor speeds),
 * vectors (3-axis IMU), arrays, or anything else flowing on the wire.
 * The downstream node's port type drives compatibility checks at the
 * editor layer; the channel itself is type-agnostic.
 *
 * Changing `delay` mid-session: the bootstrap state was set at the
 * previous reset(); existing in-flight deferred events keep their
 * original validAtTick. A subsequent reset() rebuilds the bootstrap
 * to the new depth. Mid-simulation delay tweaks are a design-time
 * experiment, not a control-loop knob.
 *
 * The session builder additionally marks this node's outgoing channels
 * as `delayed: true` so the static scheduler's topo sort excludes them
 * and recognises the cycle break at the channel-graph level. The
 * `initialValue` field of those channels is left undefined: the
 * framework's pre-seed loop skips delayed-but-uninitialised channels,
 * so seeding is entirely owned by this node's reset() via the
 * validAtTick mechanism (single source of truth, no double-seeding).
 */
export class FeedbackChannelNode extends RuntimeNode implements IDeclaresPorts {
    @cloneable private _delay: number = 1;
    @cloneable private _initial: unknown = 0;

    // Last published value, mirrored into the property panel via the
    // @viewable getter so users can see what the channel currently
    // emits while iterating on `delay` or `initial`. Updated on every
    // fire so the panel reflects the live ring-equivalent.
    @cloneable private _output: unknown = 0;

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "input", optional: true, type: "any" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "output", optional: false, type: "any" }];

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number")
    public get delay(): number {
        return this._delay;
    }
    public set delay(v: number) {
        // Negative or fractional delays don't make sense for Z^-N;
        // clamp to a non-negative integer. Seeding at the new depth
        // happens at the next reset(); we don't retro-rewrite already-
        // scheduled deferred events.
        const next = Math.max(0, Math.floor(v));
        this.setField("delay", this._delay, next, (n) => {
            this._delay = n;
        });
    }

    // `any` typed so it can be a number, vector, or any payload the
    // channel will carry. No @editable because there is no generic
    // editor for `any`; the property panel exposes it via the @viewable
    // getter only. Tweaking `initial` mid-session changes the value the
    // next reset() will seed with, without disturbing in-flight events.
    public get initial(): unknown {
        return this._initial;
    }
    public set initial(v: unknown) {
        this.setField("initial", this._initial, v, (x) => {
            this._initial = x;
        });
    }

    @viewable("any")
    public get output(): unknown {
        return this._output;
    }

    /**
     * Pre-seed the consumer with `delay` initial events so the consumer
     * has bootstrap values for the first `delay` ticks before the first
     * real input has come round the loop.
     *
     * Called at session construction (via session.reset()) and on any
     * later session.reset() call. Standalone fb.reset(session) calls
     * are supported too: in-flight deferred events on this node's
     * outgoing channels are cancelled first, then fresh seeds are
     * scheduled at `currentTick + 1..delay`. Cancelling matters because
     * leaving the previous epoch's events around would interleave with
     * the new seeds and shove extra tokens past the consumer's buffer
     * capacity.
     *
     * For delay=0 we seed nothing — the passthrough degenerate case
     * publishes synchronously when fire() runs, no bootstrap needed.
     */
    public override reset(session: ISession): void {
        this.setField("output", this._output, this._initial, (n) => {
            this._output = n;
        });

        if (this._delay <= 0) return;

        // Locate every outgoing link from this node. We don't filter by
        // source slot ("output") because there's only one output port —
        // any outgoing edge on this node is by construction the FB
        // output. This also matches the legacy publishToFirstOutput
        // semantics and lets tests wire channels with whatever slot
        // label they prefer (the dest slot is what the consumer reads).
        const links = session.graph.links as ReadonlyArray<IChannel>;
        const outputLinks: number[] = [];
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx >= 0) outputLinks.push(idx);
        }
        if (outputLinks.length === 0) return;

        // Cancel any in-flight deferred events targeting our output
        // channels. Access via the concrete Session type — ISession
        // doesn't expose `deferred` because it's an implementation
        // detail of the dynamic scheduler, but mid-session reset is a
        // first-class operation for FB nodes and we own the side effect.
        const sess = session as ISession & { deferred?: { linkIndex: number }[] };
        if (Array.isArray(sess.deferred)) {
            const outputIdxSet = new Set(outputLinks);
            let writeIdx = 0;
            for (let i = 0; i < sess.deferred.length; i++) {
                if (!outputIdxSet.has(sess.deferred[i].linkIndex)) {
                    sess.deferred[writeIdx++] = sess.deferred[i];
                }
            }
            sess.deferred.length = writeIdx;
        }

        // Seed validAtTick = nextTickIndex..(nextTickIndex+delay-1) so
        // the consumer sees `initial` for the next `delay` ticks.
        // session.tickIndex is 0 at session construction; the very
        // first run(t) increments it to 1, so seeding at tickIndex+1
        // means "deliver on the first run()" — exactly what bootstrap
        // wants. Mid-session reset starts from the next tick forward.
        const nextTickIndex = session.tickIndex + 1;
        for (let i = 0; i < this._delay; i++) {
            for (const idx of outputLinks) {
                session.publish(idx, this._initial, { validAtTick: nextTickIndex + i });
            }
        }
    }

    public override fire(session: ISession, _t: number): void {
        // Read whatever is on the (single) input edge for this tick.
        // Same rationale as reset(): only one input port, so iterating
        // incoming edges without slot-filtering is correct and lets
        // tests label channels permissively.
        let input: unknown = undefined;
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            input = session.consume(idx);
            break;
        }

        // Resolve the payload to publish: prefer the freshly-read input;
        // fall back to `initial` when nothing arrived (keeps the output
        // wire never-silent, which is what closed-loop consumers expect).
        const payload = input !== undefined ? input : this._initial;

        // Mirror into the @viewable so the property panel reflects the
        // live in-flight value, not the most recent reset() seed.
        this.setField("output", this._output, payload, (n) => {
            this._output = n;
        });

        // Stamp the publish with a future TICK INDEX (integer):
        //   delay = 0  → validAt = tickIndex   → delivered this tick (passthrough)
        //   delay = N  → validAt = tickIndex+N → deferred N runs
        // session.tickIndex is the integer scheduler-call counter, not
        // sim-time t. Using it here makes the delay semantics
        // independent of the dt granularity (works for both fixed-step
        // sims at 200 kHz and free-running rAF at ~16 ms).
        const validAt = session.tickIndex + this._delay;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, payload, { validAtTick: validAt });
        }
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createFeedbackChannelNode(): FeedbackChannelNode {
    return new FeedbackChannelNode();
}
