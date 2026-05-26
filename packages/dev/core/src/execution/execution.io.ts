import { IChannel, IRuntimeNode, ISession, inSlotOf } from "./execution.interfaces";

/**
 * Walk the runtime node's incoming channels (opsc) and override the
 * supplied defaults with any value that is ready on a channel whose
 * slot matches a defaults key. Channels that are disabled, unmatched,
 * or whose link state is not ready are skipped; their corresponding
 * default carries through unchanged.
 *
 * The pattern factorises the "input wins over editable default" idiom
 * shared by Transform, Attitude and any future node that consumes
 * per-slot scalar / vector / quaternion / etc. inputs:
 *
 *     const eff = resolveSlotInputs(session, this, {
 *         yaw:   this._yaw,
 *         pitch: this._pitch,
 *         roll:  this._roll,
 *     });
 *
 * By default the channel value is consumed (one read clears the token).
 * Pass `{ consume: false }` to peek instead — useful when several
 * downstream nodes should see the same upstream value within one tick.
 */
export function resolveSlotInputs<T extends Record<string, unknown>>(
    session: ISession,
    node: IRuntimeNode,
    defaults: T,
    options?: {
        /** Default true: token is removed from the channel after read. */
        consume?: boolean;
        /**
         * Optional per-value type guard. When supplied, slot values
         * that fail the predicate are silently dropped and the default
         * carries through (the channel is still consumed though, so
         * the upstream producer is not stalled).
         */
        validator?: (slot: string, value: unknown) => boolean;
    },
): T {
    const consume = options?.consume !== false;
    const validator = options?.validator;
    const eff: Record<string, unknown> = { ...defaults };
    const incoming = node.opsc<IChannel>();
    for (const ch of incoming) {
        if (!ch.enabled) continue;
        const slot = String(inSlotOf(ch));
        if (!(slot in eff)) continue;
        const idx = session.graph.links.indexOf(ch);
        if (idx < 0 || !session.linkStates[idx].ready) continue;
        const value = consume ? session.consume(idx) : session.peek(idx);
        if (validator && !validator(slot, value)) continue;
        eff[slot] = value;
    }
    return eff as T;
}

/**
 * Publish a single value on the first outgoing channel (onsc) of the
 * node. Returns true on success, false when the node has no output,
 * or when the channel cannot be located in the session's graph.
 */
export function publishToFirstOutput(
    session: ISession,
    node: IRuntimeNode,
    value: unknown,
): boolean {
    const outs = node.onsc<IChannel>();
    if (outs.length === 0) return false;
    const idx = session.graph.links.indexOf(outs[0]);
    if (idx < 0) return false;
    session.publish(idx, value);
    return true;
}
