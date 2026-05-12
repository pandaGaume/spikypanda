import type { ICartesian } from "../geometry";
import { cloneable } from "../graph/graph.interfaces";
import { Graph } from "../graph/graph.graph";
import { Nullable } from "../types";
import { IChannel, IRuntimeGraph, IRuntimeNode, ISession, SchedulingMode } from "./execution.interfaces";

/**
 * Concrete IRuntimeGraph. Extends Graph<N, L> for the topology (inherits
 * nodes / links / inputs / outputs / hiddens / clone), declares the
 * scheduling mode at construction, and implements the IRuntimeNode
 * surface (so the graph can later embed in a parent graph, fractal
 * composition). For v1, the IRuntimeNode methods are stubs: the entry
 * point is Session.run(t), which invokes the scheduler matching the
 * declared mode.
 */
export class RuntimeGraph<N extends IRuntimeNode = IRuntimeNode, L extends IChannel = IChannel>
    extends Graph<N, L>
    implements IRuntimeGraph<N, L>
{
    @cloneable public mode: SchedulingMode;
    @cloneable public enabled: boolean;

    public constructor(
        nodes: N[] = [],
        links: L[] = [],
        mode: SchedulingMode = "dynamic",
        inputs: Nullable<N[]> = null,
        outputs: Nullable<N[]> = null,
        hiddens: Nullable<N[]> = null,
        position?: ICartesian,
        enabled: boolean = true
    ) {
        super(nodes, links, inputs, outputs, hiddens, null, null, position);
        this.mode = mode;
        this.enabled = enabled;
    }

    public isReady(_session: ISession): boolean {
        return this.enabled;
    }

    public fire(_session: ISession, _t: number): void {
        // Fractal embedding (graph as node inside a parent graph) lands
        // in a follow-up commit. For v1, drive the graph via
        // Session.run(t) instead.
    }

    public reset(session: ISession): void {
        for (const n of this.nodes) {
            n.reset(session);
        }
    }
}
