import type { ICartesian } from "../geometry";
import { cloneable } from "../graph/graph.interfaces";
import { Graph } from "../graph/graph.graph";
import { Nullable } from "../types";
import { ISimGraph, ISimLink, ISimNode, SimPhase } from "./sim.interfaces";

/**
 * Concrete ISimGraph. A graph that is itself a sim node, enabling
 * fractal composition. The scheduler that dispatches advance(t, phase)
 * to children lands in a follow-up commit; for now, advance() is a
 * no-op so the structure can be built and tested. reset() already
 * cascades to children.
 */
export class SimGraph<N extends ISimNode, L extends ISimLink> extends Graph<N, L> implements ISimGraph<N, L> {
    @cloneable public phases: ReadonlyArray<SimPhase>;

    public constructor(
        nodes: N[] = [],
        links: L[] = [],
        inputs: Nullable<N[]> = null,
        outputs: Nullable<N[]> = null,
        hiddens: Nullable<N[]> = null,
        onsc: Nullable<L[]> = null,
        opsc: Nullable<L[]> = null,
        position?: ICartesian,
        phases: ReadonlyArray<SimPhase> = [SimPhase.Step]
    ) {
        super(nodes, links, inputs, outputs, hiddens, onsc, opsc, position);
        this.phases = phases;
    }

    public advance(_t: number, _phase: SimPhase): void {
        // Scheduler dispatch to children comes in a follow-up commit.
    }

    public reset(): void {
        for (const n of this.nodes) {
            n.reset();
        }
    }
}
