import type { ICartesian } from "../geometry";
import { IOlink } from "../graph/graph.interfaces";
import { GraphNode } from "../graph/graph.node";
import { cloneable } from "../graph/graph.interfaces";
import { Nullable } from "../types";
import { ISimNode, SimPhase } from "./sim.interfaces";

/**
 * Concrete base class for ISimNode. advance() and reset() are no-ops at
 * this level; concrete simulation nodes (PMSM machine, controllers,
 * env/fault nodes, ONNX compute ops, ...) override them. Constructor
 * argument order follows the GraphNode/NodeConstructor contract (onsc,
 * opsc, position, ...args), so SimNode is usable directly with the
 * existing GraphNodeBuilder via additional args.
 */
export class SimNode extends GraphNode implements ISimNode {
    @cloneable public phases: ReadonlyArray<SimPhase>;

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
        phases: ReadonlyArray<SimPhase> = [SimPhase.Step]
    ) {
        super(onsc, opsc, position);
        this.phases = phases;
    }

    public advance(_t: number, _phase: SimPhase): void {
        // No-op base; concrete nodes override to integrate their state.
    }

    public reset(): void {
        // No-op base; concrete nodes override to restore initial state.
    }
}
