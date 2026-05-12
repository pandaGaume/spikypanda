import { IRuntimeNode, ISession } from "./execution.interfaces";

/**
 * Dynamic (ready-queue) scheduler. One pass per session.run() call:
 * repeatedly walk the graph looking for nodes whose isReady() is true
 * and that have not yet fired this cycle, fire them, repeat until no
 * progress can be made.
 *
 * Single-slot semantic in v1: each node fires at most once per cycle.
 * The fired set guards against re-firing within the same cycle even
 * when isReady() stays true (e.g. a self-loop with a delayed channel
 * that gets refilled by the same node's fire).
 *
 * Complexity: O(N^2) worst case per cycle. Adequate for v1 POC; will
 * be replaced by a proper ready-queue with per-node linksReady
 * counters before the SNN milestone (Phase B).
 */
export function runDynamic(session: ISession, t: number): void {
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
