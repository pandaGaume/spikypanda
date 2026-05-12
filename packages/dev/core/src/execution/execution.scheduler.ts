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
 *   RunDynamic           : ready-queue dispatch. Walks the graph,
 *                          fires every ready+enabled node, repeats
 *                          until quiescence. Handles cycles (via
 *                          delayed channels), conditional readiness
 *                          (SNN, phase-aware nodes), external-input
 *                          pacing.
 *
 *   RunStatic            : pre-computed Kahn topological order over
 *                          the non-delayed enabled-channel subgraph,
 *                          fires each enabled node once in order. No
 *                          isReady() check; the user opts in to the
 *                          assumption that the graph is statically
 *                          schedulable.
 *
 *   CheckStaticEligible  : verifies the graph satisfies the structural
 *                          precondition for RunStatic (acyclic in the
 *                          non-delayed enabled subgraph). Returns the
 *                          reasons when it does not.
 */
export class Scheduler {
    /**
     * Dynamic (ready-queue) scheduler. One pass per session.run() call:
     * repeatedly walk the graph looking for nodes whose isReady() is
     * true and that have not yet fired this cycle, fire them, repeat
     * until no progress can be made.
     */
    public static RunDynamic(session: ISession, t: number): void {
        const nodes = session.graph.nodes;
        const fired = new Set<IRuntimeNode>();
        let progress = true;
        while (progress) {
            progress = false;
            for (const node of nodes) {
                if (fired.has(node)) {
                    continue;
                }
                if (!node.enabled) {
                    continue;
                }
                if (!node.isReady(session)) {
                    continue;
                }
                node.fire(session, t);
                fired.add(node);
                progress = true;
            }
        }
    }

    /**
     * Static (Kahn-topo) scheduler. Computes the topological order over
     * the non-delayed enabled-channel subgraph and fires each enabled
     * node once in that order. Throws if a cycle remains in the
     * eligible subgraph; call CheckStaticEligible() before declaring
     * mode="static" on a graph built dynamically.
     *
     * v1 recomputes the order on every call (O(N+E)). A future commit
     * caches it on the graph after first call.
     */
    public static RunStatic(session: ISession, t: number): void {
        const { order, reasons } = topoSort(session.graph);
        if (reasons.length > 0) {
            throw new Error(`graph is not statically schedulable: ${reasons.join("; ")}`);
        }
        for (const node of order) {
            if (!node.enabled) {
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
}
