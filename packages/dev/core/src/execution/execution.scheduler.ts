import {
    IChannel,
    IRuntimeGraph,
    IRuntimeNode,
    ISession,
    IStaticEligibility,
    isLinkRef,
    inSlotOf,
} from "./execution.interfaces";
import { isControlSlot } from "./control-ports";
import type { Session } from "./execution.session";

/**
 * Kahn topological order over the subgraph induced by enabled and
 * non-delayed channels. Returns the order plus a (possibly empty) list
 * of reasons explaining any cycle. order is empty when a cycle exists.
 */
function topoSort(graph: IRuntimeGraph): { order: IRuntimeNode[]; reasons: string[] } {
    const nodes = graph.nodes;
    const inDeg = new Map<IRuntimeNode, number>();
    const adj = new Map<IRuntimeNode, IRuntimeNode[]>();

    for (const n of nodes) {
        inDeg.set(n, 0);
        adj.set(n, []);
    }

    const links = graph.links as ReadonlyArray<IChannel>;
    for (const link of links) {
        if (!link.enabled || link.delayed) {
            continue;
        }
        const src = link.oini as IRuntimeNode | null;
        const dst = link.ofin as IRuntimeNode | null;
        if (!src || !dst || !inDeg.has(src) || !inDeg.has(dst)) {
            continue;
        }
        adj.get(src)!.push(dst);
        inDeg.set(dst, inDeg.get(dst)! + 1);
    }

    const queue: IRuntimeNode[] = [];
    const order: IRuntimeNode[] = [];
    for (const n of nodes) {
        if (inDeg.get(n) === 0) {
            queue.push(n);
        }
    }
    while (queue.length > 0) {
        const n = queue.shift()!;
        order.push(n);
        for (const dst of adj.get(n)!) {
            const d = inDeg.get(dst)! - 1;
            inDeg.set(dst, d);
            if (d === 0) {
                queue.push(dst);
            }
        }
    }

    if (order.length !== nodes.length) {
        const remaining = nodes.filter((n) => !order.includes(n));
        const ids = remaining.map((n) => (n.id !== undefined ? String(n.id) : "?")).join(",");
        return {
            order: [],
            reasons: [`cycle through non-delayed channels among nodes [${ids}]; mark one channel as delayed to break it`],
        };
    }
    return { order, reasons: [] };
}

/**
 * Scheduler strategies.
 *
 *   RunDynamic   FIFO drain over the session's queue, which holds
 *                LinkRefs (publish events) and IRuntimeNode entries
 *                (ready-check requests). The drain alternates between
 *                them naturally: a LinkRef delivers its value into the
 *                destination's per-slot buffer and re-queues the
 *                destination; a node entry consumes one token per
 *                gating slot when ready and may re-queue itself if
 *                multiple tokens were buffered (the loop case).
 *
 *   RunStatic    Kahn topological order over the non-delayed enabled-
 *                channel subgraph. Visits each enabled node once in
 *                that order with the same isReady() / processControl
 *                contract. Cheap when applicable but does NOT support
 *                multi-token (loop) bursts; raise a static-ineligible
 *                error if any link has a capacity > 1.
 *
 *   CheckStaticEligible  Validates RunStatic preconditions.
 */
export class Scheduler {
    public static RunDynamic(session: ISession, t: number): void {
        const sess = session as Session;
        const queue = sess.queue;
        const nodes = session.graph.nodes as ReadonlyArray<IRuntimeNode>;

        // Seed: enqueue every node that is already ready (sources with
        // requiredInputs = 0, or nodes whose delayed inputs were pre-
        // seeded into their buffers by Session.reset()).
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (!node.enabled) continue;
            if (session.nodeStates[i].linksReady >= session.requiredInputsOf(node)) {
                queue.push(node);
            }
        }

        while (queue.length > 0) {
            const item = queue.shift()!;

            if (isLinkRef(item)) {
                // Deliver the value into the destination's per-slot
                // buffer and re-queue the destination for a ready-check.
                sess.deliverLinkRef(item);
                const link = session.graph.links[item.linkIndex] as IChannel | undefined;
                if (!link || !link.enabled) continue;
                const dst = link.ofin as IRuntimeNode | null;
                if (!dst || !dst.enabled) continue;
                if (nodes.indexOf(dst) < 0) continue;
                queue.push(dst);
                continue;
            }

            // Node ready-check entry. Drain its control-plane inputs
            // first (e.g. _enable, _start, _stop / _reset) so the
            // enabled/isReady gates see the latest state.
            const node = item;
            node.processControlInputs?.(session);
            if (!node.enabled) continue;

            const required = session.requiredInputsOf(node);
            const state = session.nodeStateOf(node);
            if (!state) continue;
            if (state.linksReady < required) continue;
            if (!node.isReady(session)) continue;

            node.fire(session, t);

            // If the node still has tokens on every gating slot, it's
            // ready to fire again on the next pop. This is what makes
            // loops work: an upstream that published N times left N
            // tokens queued; each fire consumes one and the node
            // refires until the queue is empty.
            //
            // The `linksReady > 0` guard is what stops required=0
            // sources (StartNode, MakeArray, etc.) from re-enqueuing
            // forever: they have no gating inputs (readyCount stays
            // at 0 across fires), so the criterion `0 >= 0` would
            // otherwise create an infinite loop. Loop-mode dispatch
            // (multi-token gating inputs) goes through the > 0 branch
            // because at least one buffer remains non-empty.
            if (state.linksReady > 0 && state.linksReady >= required) {
                queue.push(node);
            }
        }
    }

    public static RunStatic(session: ISession, t: number): void {
        const { order, reasons } = topoSort(session.graph);
        if (reasons.length > 0) {
            throw new Error(`graph is not statically schedulable: ${reasons.join("; ")}`);
        }
        // Static mode: pull-style. Each node is visited exactly once.
        // For each node, drain its publish events from the session
        // queue first (so any seeded delayed channels deliver their
        // tokens into the input buffers) and then attempt fire.
        const sess = session as Session;
        // Flush any LinkRefs that were sitting on the queue (e.g. from
        // Session.reset's delayed-channel seeding).
        const pending = sess.queue.splice(0, sess.queue.length);
        for (const item of pending) {
            if (isLinkRef(item)) sess.deliverLinkRef(item);
        }
        for (const node of order) {
            node.processControlInputs?.(session);
            if (!node.enabled) continue;
            // Drain any LinkRefs published by an earlier node fire.
            const newRefs = sess.queue.splice(0, sess.queue.length);
            for (const item of newRefs) {
                if (isLinkRef(item)) sess.deliverLinkRef(item);
            }
            if (!node.isReady(session)) continue;
            node.fire(session, t);
        }
        // Final drain so the post-last-node publishes land on the
        // input buffers of any consumer (useful for sub-graph ports).
        const tail = sess.queue.splice(0, sess.queue.length);
        for (const item of tail) {
            if (isLinkRef(item)) sess.deliverLinkRef(item);
        }
        // t is read by node.fire; declare it used.
        void t;
    }

    public static CheckStaticEligible(graph: IRuntimeGraph): IStaticEligibility {
        const { reasons } = topoSort(graph);
        return {
            eligible: reasons.length === 0,
            reasons,
        };
    }

    public static GetStaticOrder(graph: IRuntimeGraph): IRuntimeNode[] {
        const { order, reasons } = topoSort(graph);
        if (reasons.length > 0) {
            throw new Error(`graph is not statically schedulable: ${reasons.join("; ")}`);
        }
        return order;
    }
}

// Helpers re-exported for documentation cross-references; not used here directly.
export { isControlSlot, inSlotOf };
