// ═══════════════════════════════════════════════════════════════════════════
// ComputeNodeBase : abstract base class for all compute nodes
// ═══════════════════════════════════════════════════════════════════════════

import { GraphNode } from "spikypanda-core";
import { IComputeNode, ITensor } from "./compute.interfaces";

/**
 * Base class for compute nodes. Extends GraphNode for graph compatibility.
 */
export abstract class ComputeNodeBase extends GraphNode implements IComputeNode {
    public abstract readonly nodeType: string;
    public abstract readonly outputShapes: number[][];
    public abstract execute(inputs: ITensor[]): ITensor[];
}
