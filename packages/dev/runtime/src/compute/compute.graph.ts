// ═══════════════════════════════════════════════════════════════════════════
// ComputeGraph : executes a DAG of compute nodes in topological order
//
// Each call to run():
// 1. Inject external inputs into source nodes
// 2. Walk nodes in topological order
// 3. For each node: gather input tensors from incoming IDataLinks,
//    call execute(), write output tensors to outgoing IDataLinks
// 4. Collect output tensors from sink nodes
//
// The topological order is computed once at construction (or when the
// graph changes) and cached for fast per-frame execution.
// ═══════════════════════════════════════════════════════════════════════════

import { Graph, GraphOLink } from "spikypanda-core";
import {
    IComputeGraph,
    IComputeNode,
    IComputeNodeBag,
    IDataLink,
    ITensor,
} from "./compute.interfaces";

// ─── DataLink implementation ─────────────────────────────────────────────────

/**
 * Concrete data link: a directed edge carrying a tensor.
 */
export class DataLink extends GraphOLink implements IDataLink {
    public tensor: ITensor | null = null;

    public constructor(from?: IComputeNode, to?: IComputeNode) {
        super(from, to);
    }
}

// ─── ComputeGraph implementation ─────────────────────────────────────────────

/**
 * Executable compute graph.
 *
 * Extends `Graph<IComputeNode, IDataLink>` from @spiky-panda/core,
 * adding topological sort and the `run()` execution method.
 *
 * **Usage:**
 * ```typescript
 * const graph = new ComputeGraph(nodes, links);
 * const result = graph.run(new Map([["pose", poseTensor]]));
 * const command = result.get("command");
 * ```
 */
export class ComputeGraph extends Graph<IComputeNode, IDataLink> implements IComputeGraph {
    private _sortedNodes: IComputeNode[] | null = null;

    public constructor(nodes: IComputeNode[], links: IDataLink[]) {
        super(nodes, links);
    }

    /**
     * Execute the full graph in topological order.
     *
     * @param externalInputs  Named tensors injected into source nodes
     *                         (matched by node ID or name tag).
     * @returns                Named tensors from output nodes.
     */
    public run(externalInputs?: Map<string, ITensor>): Map<string, ITensor> {
        const sorted = this._getTopologicalOrder();

        for (const node of sorted) {
            const inputs = this._gatherInputs(node, externalInputs);
            const outputs = node.execute(inputs);
            this._distributeOutputs(node, outputs);
        }

        return this._collectResults();
    }

    /**
     * Execute the full graph asynchronously in topological order.
     *
     * For each node, uses `executeAsync()` if the node provides it,
     * otherwise falls back to synchronous `execute()`.
     * Nodes are awaited sequentially (topological order must be respected).
     *
     * @param externalInputs  Named tensors injected into source nodes.
     * @returns                Promise resolving to named tensors from output nodes.
     */
    public async runAsync(externalInputs?: Map<string, ITensor>): Promise<Map<string, ITensor>> {
        const sorted = this._getTopologicalOrder();

        for (const node of sorted) {
            const inputs = this._gatherInputs(node, externalInputs);

            // Prefer executeAsync when available, fallback to sync execute
            const outputs = node.executeAsync
                ? await node.executeAsync(inputs)
                : node.execute(inputs);

            this._distributeOutputs(node, outputs);
        }

        return this._collectResults();
    }

    /**
     * Invalidate the cached topological order.
     * Call after adding/removing nodes or links.
     */
    public invalidateOrder(): void {
        this._sortedNodes = null;
    }

    // ── Internal helpers ───────────────────────────────────────────────────

    /**
     * Gather input tensors for a node from incoming links or external inputs.
     */
    private _gatherInputs(node: IComputeNode, externalInputs?: Map<string, ITensor>): ITensor[] {
        const incomingLinks = node.opsc<IDataLink>();
        const inputs: ITensor[] = [];

        if (incomingLinks.length === 0 && externalInputs) {
            // Source node: check for external input by ID or tag
            const key = (node.id as string) ?? node.tag;
            if (key) {
                const ext = externalInputs.get(key);
                if (ext) {
                    inputs.push(ext);
                }
            }
        } else {
            // Transform node: read tensors from incoming data links
            for (const link of incomingLinks) {
                if (link.tensor) {
                    inputs.push(link.tensor);
                }
            }
        }

        return inputs;
    }

    /**
     * Cache outputs in the node's bag and write them to outgoing data links.
     */
    private _distributeOutputs(node: IComputeNode, outputs: ITensor[]): void {
        // Cache outputs in the node's bag
        const bag = (node.bag ?? {}) as IComputeNodeBag;
        bag.lastOutputs = outputs;
        node.bag = bag;

        // Write outputs to outgoing data links
        const outgoingLinks = node.onsc<IDataLink>();
        for (let i = 0; i < outgoingLinks.length; i++) {
            // If there are multiple outputs, distribute them; otherwise broadcast
            outgoingLinks[i].tensor = outputs.length > 1 ? (outputs[i] ?? outputs[0]) : (outputs[0] ?? null);
        }
    }

    /**
     * Collect output tensors from sink nodes (nodes with no successors).
     */
    private _collectResults(): Map<string, ITensor> {
        const result = new Map<string, ITensor>();
        for (const node of this.outputs) {
            const bag = node.bag as IComputeNodeBag | undefined;
            if (bag?.lastOutputs) {
                const key = (node.id as string) ?? node.tag ?? node.nodeType;
                for (const tensor of bag.lastOutputs) {
                    result.set(tensor.name ?? key, tensor);
                }
            }
        }
        return result;
    }

    // ── Topological sort (Kahn's algorithm) ──────────────────────────────

    private _getTopologicalOrder(): IComputeNode[] {
        if (this._sortedNodes) return this._sortedNodes;

        const sorted: IComputeNode[] = [];
        const inDegree = new Map<IComputeNode, number>();

        // Initialize in-degrees
        for (const node of this.nodes) {
            inDegree.set(node, node.opsc<IDataLink>().length);
        }

        // Start with source nodes (in-degree = 0)
        const queue: IComputeNode[] = [];
        for (const [node, degree] of inDegree) {
            if (degree === 0) {
                queue.push(node);
            }
        }

        while (queue.length > 0) {
            const node = queue.shift()!;
            sorted.push(node);

            // For each outgoing link, reduce the destination's in-degree
            for (const link of node.onsc<IDataLink>()) {
                const dest = link.ofin as IComputeNode;
                if (dest) {
                    const newDegree = (inDegree.get(dest) ?? 1) - 1;
                    inDegree.set(dest, newDegree);
                    if (newDegree === 0) {
                        queue.push(dest);
                    }
                }
            }
        }

        if (sorted.length !== this.nodes.length) {
            throw new Error(
                `ComputeGraph has a cycle: sorted ${sorted.length} of ${this.nodes.length} nodes. ` +
                `Compute graphs must be DAGs.`
            );
        }

        this._sortedNodes = sorted;
        return sorted;
    }
}
