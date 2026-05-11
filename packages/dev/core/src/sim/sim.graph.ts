import type { ICartesian } from "../geometry";
import { cloneable } from "../graph/graph.interfaces";
import { Graph } from "../graph/graph.graph";
import { Nullable } from "../types";
import { ISimGraph, ISimLink, ISimNode, SimPhase } from "./sim.interfaces";

/**
 * Kahn's algorithm over the subgraph induced by `nodes`, using only the
 * data-dependency edges that are active this phase: links that are
 * enabled AND non-delayed AND whose endpoints are both in `nodes`.
 * Disabled links and delayed links are dropped from the precedence
 * graph (delayed links carry the previous-tick value, so they do not
 * constrain the current-tick order). Throws if a cycle remains, which
 * signals that the user must mark a link as delayed to break it.
 */
function topoSortActive<N extends ISimNode, L extends ISimLink>(nodes: ReadonlyArray<N>, links: ReadonlyArray<L>): N[] {
    const active = new Set<N>(nodes);
    const inDeg = new Map<N, number>();
    const adj = new Map<N, N[]>();

    for (const n of nodes) {
        inDeg.set(n, 0);
        adj.set(n, []);
    }

    for (const link of links) {
        if (!link.enabled || link.delayed) {
            continue;
        }
        const src = link.oini as Nullable<N>;
        const dst = link.ofin as Nullable<N>;
        if (!src || !dst || !active.has(src) || !active.has(dst)) {
            continue;
        }
        adj.get(src)!.push(dst);
        inDeg.set(dst, inDeg.get(dst)! + 1);
    }

    const queue: N[] = [];
    const order: N[] = [];
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
        throw new Error("Cycle detected in sim graph; mark one link as delayed to break the feedback loop");
    }
    return order;
}

/**
 * Concrete ISimGraph. A graph that is itself a sim node, enabling
 * fractal composition. The scheduler runs one phase per advance() call:
 * filter children to those enabled and participating in the phase,
 * topo-sort them by their data dependencies (enabled, non-delayed
 * links), then advance them in order. tick() is the convenience that
 * iterates self.phases in declared order; it is meant for the outermost
 * graph, nested graphs are driven phase-by-phase by their parent.
 */
export class SimGraph<N extends ISimNode, L extends ISimLink> extends Graph<N, L> implements ISimGraph<N, L> {
    @cloneable public phases: ReadonlyArray<SimPhase>;
    @cloneable public enabled: boolean;

    public constructor(
        nodes: N[] = [],
        links: L[] = [],
        inputs: Nullable<N[]> = null,
        outputs: Nullable<N[]> = null,
        hiddens: Nullable<N[]> = null,
        onsc: Nullable<L[]> = null,
        opsc: Nullable<L[]> = null,
        position?: ICartesian,
        phases: ReadonlyArray<SimPhase> = [SimPhase.Step],
        enabled: boolean = true
    ) {
        super(nodes, links, inputs, outputs, hiddens, onsc, opsc, position);
        this.phases = phases;
        this.enabled = enabled;
    }

    public advance(t: number, phase: SimPhase): void {
        if (!this.enabled) {
            return;
        }
        if (!this.phases.includes(phase)) {
            return;
        }
        const active = this.nodes.filter((n) => n.enabled && n.phases.includes(phase));
        const order = topoSortActive<N, L>(active, this.links);
        for (const n of order) {
            n.advance(t, phase);
        }
    }

    public tick(t: number): void {
        if (!this.enabled) {
            return;
        }
        for (const phase of this.phases) {
            this.advance(t, phase);
        }
    }

    public reset(): void {
        for (const n of this.nodes) {
            n.reset();
        }
    }
}
