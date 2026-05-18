import { IChannel, IRuntimeGraph, IRuntimeNode, ISession, IStaticEligibility } from "./execution.interfaces";

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
 * Schedulers for IRuntimeGraph. Static-class container gathering the
 * available scheduling strategies as pure static methods.
 *
 *   RunDynamic           : ready-queue dispatch driven by linksReady
 *                          counters maintained by Session.publish() /
 *                          Session.consume(). A node is queued the
 *                          moment its INodeState.linksReady reaches
 *                          session.requiredInputsOf(node), fired once,
 *                          and its outputs propagate to downstream
 *                          counters automatically. O(N+E) per cycle.
 *
 *   RunStatic            : pre-computed Kahn topological order over
 *                          the non-delayed enabled-channel subgraph,
 *                          fires each enabled node once in order. No
 *                          isReady() check.
 *
 *   CheckStaticEligible  : verifies the graph satisfies the structural
 *                          precondition for RunStatic.
 */
export class Scheduler {
    /**
     * Dynamic (ready-queue) scheduler. Seeds the queue from nodes
     * already eligible at session start (sources, plus nodes whose only
     * inputs are delayed and pre-seeded by reset), drains the queue
     * firing each enabled node once, scans the fired node's outgoing
     * channels to enqueue any newly-eligible downstream nodes.
     */
    public static RunDynamic(session: ISession, t: number): void {
        const nodes = session.graph.nodes as ReadonlyArray<IRuntimeNode>;
        const queue: IRuntimeNode[] = [];
        const fired = new Set<IRuntimeNode>();

        // Seed: nodes whose counter already meets the required count.
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (!node.enabled) {
                continue;
            }
            if (session.nodeStates[i].linksReady >= session.requiredInputsOf(node)) {
                queue.push(node);
            }
        }

        while (queue.length > 0) {
            const node = queue.shift()!;
            if (fired.has(node)) {
                continue;
            }
            // Drain control-plane inputs (_enable / _start / _stop) so
            // the latest lifecycle commands take effect before the
            // enabled/isReady gates are re-evaluated below.
            node.processControlInputs?.(session);
            if (!node.enabled) {
                continue;
            }
            // Defensive isReady: lets nodes refuse to fire even when
            // their counter looks ready (SNN threshold, phase gating).
            if (!node.isReady(session)) {
                continue;
            }
            node.fire(session, t);
            fired.add(node);

            // The node's publish() calls during fire bumped downstream
            // counters; enqueue any downstream that just reached its
            // required count.
            for (const link of node.onsc<IChannel>()) {
                if (!link.enabled) {
                    continue;
                }
                const dst = link.ofin as IRuntimeNode | null;
                if (!dst || fired.has(dst) || !dst.enabled) {
                    continue;
                }
                if (nodes.indexOf(dst) < 0) {
                    continue;
                }
                const dstState = session.nodeStateOf(dst);
                if (!dstState) {
                    continue;
                }
                if (dstState.linksReady >= session.requiredInputsOf(dst)) {
                    queue.push(dst);
                }
            }
        }
    }

    /**
     * Static (Kahn-topo) scheduler. Computes the topological order over
     * the non-delayed enabled-channel subgraph, then visits each enabled
     * node in that order; each visited node is given the same chance to
     * refuse via isReady() as in the dynamic scheduler (a phase-aware
     * node skipping a phase, an SNN below threshold, etc.). The static
     * mode optimisation is only about avoiding the ready-queue
     * book-keeping; the per-node isReady() contract is honored
     * identically in both modes. Throws if a cycle remains; call
     * CheckStaticEligible() before declaring mode="static" on a graph
     * built dynamically.
     */
    public static RunStatic(session: ISession, t: number): void {
        const { order, reasons } = topoSort(session.graph);
        if (reasons.length > 0) {
            throw new Error(`graph is not statically schedulable: ${reasons.join("; ")}`);
        }
        for (const node of order) {
            node.processControlInputs?.(session);
            if (!node.enabled) {
                continue;
            }
            if (!node.isReady(session)) {
                continue;
            }
            node.fire(session, t);
        }
    }

    /**
     * Reports whether the graph satisfies the structural preconditions
     * for RunStatic. eligible=true when the non-delayed enabled-channel
     * subgraph is acyclic; reasons lists every blocker otherwise.
     */
    public static CheckStaticEligible(graph: IRuntimeGraph): IStaticEligibility {
        const { reasons } = topoSort(graph);
        return {
            eligible: reasons.length === 0,
            reasons,
        };
    }

    /**
     * Returns the Kahn topological order over the non-delayed enabled-
     * channel subgraph. Throws when the graph contains a cycle without
     * a delayed channel to break it. Exposed for callers that need to
     * walk nodes themselves (e.g. an async runner that awaits a
     * per-node fireAsync between steps) without going through
     * RunStatic.
     */
    public static GetStaticOrder(graph: IRuntimeGraph): IRuntimeNode[] {
        const { order, reasons } = topoSort(graph);
        if (reasons.length > 0) {
            throw new Error(`graph is not statically schedulable: ${reasons.join("; ")}`);
        }
        return order;
    }
}
