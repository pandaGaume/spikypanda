// ═══════════════════════════════════════════════════════════════════════════
// ComputeGraph : DAG of compute nodes executed via core/execution.
//
// Thin specialisation of RuntimeGraph<IComputeNode, IDataLink> that
//   - defaults to mode="static" (DAG of pure kernels = Kahn topo),
//   - injects externalInputs onto source nodes' bag.pendingInput before
//     running, so ComputeNodeBase.fire can pick them up,
//   - collects the named-output Map from sink nodes' bag.lastOutputs.
//
// Concrete op nodes (ONNX ops, MLP/CNN/RNN/Conv/Concat/etc.) only
// implement execute(); the fire(session, t) adapter in ComputeNodeBase
// handles the session-side wiring.
// ═══════════════════════════════════════════════════════════════════════════

import { Channel } from "../execution/execution.channel";
import { RuntimeGraph } from "../execution/execution.graph";
import { Scheduler } from "../execution/execution.scheduler";
import { SchedulingMode } from "../execution/execution.interfaces";
import { Session } from "../execution/execution.session";
import { INode } from "../graph/graph.interfaces";
import { IComputeGraph, IComputeNode, IComputeNodeBag, IDataLink, ITensor } from "./compute.interfaces";

// ─── DataLink implementation ─────────────────────────────────────────────────

/**
 * Concrete data link: a directed edge carrying a tensor. Narrows
 * Channel<ITensor> by typing slot as number (the ONNX positional input
 * index). Defaults: not delayed, no initialValue, enabled.
 */
export class DataLink extends Channel<ITensor> implements IDataLink {
    public override readonly slot: number;

    public constructor(from?: IComputeNode, to?: IComputeNode, inputIndex = -1) {
        super(from as INode | undefined, to as INode | undefined, inputIndex);
        this.slot = inputIndex;
    }
}

// ─── ComputeGraph implementation ─────────────────────────────────────────────

/**
 * Executable compute graph.
 *
 * Extends RuntimeGraph<IComputeNode, IDataLink> with the named-input /
 * named-output API expected by callers (MPC, ONNX runtime, samples).
 * Defaults to mode="static" because a compute graph is by construction
 * an acyclic DAG of pure kernels; pass another mode if you have a use
 * case for it.
 *
 * **Usage:**
 * ```typescript
 * const graph = new ComputeGraph(nodes, links);
 * const result = graph.run(new Map([["pose", poseTensor]]));
 * const command = result.get("command");
 * ```
 */
export class ComputeGraph extends RuntimeGraph<IComputeNode, IDataLink> implements IComputeGraph {
    public constructor(nodes: IComputeNode[], links: IDataLink[], mode: SchedulingMode = "static") {
        super(nodes, links, mode);
    }

    /**
     * Execute the full graph synchronously.
     */
    public run(externalInputs?: Map<string, ITensor>): Map<string, ITensor> {
        this._injectExternalInputs(externalInputs);
        const session = new Session(this);
        session.run(0);
        return this._collectResults();
    }

    /**
     * Execute the full graph asynchronously, awaiting per-node
     * fireAsync. Walks the static topological order outside of the
     * scheduler so each node's promise can be awaited in turn.
     */
    public async runAsync(externalInputs?: Map<string, ITensor>): Promise<Map<string, ITensor>> {
        this._injectExternalInputs(externalInputs);
        const session = new Session(this);
        const order = Scheduler.GetStaticOrder(this);
        for (const node of order) {
            if (!node.enabled) {
                continue;
            }
            if (!node.isReady(session)) {
                continue;
            }
            const computeNode = node as IComputeNode;
            if (computeNode.fireAsync) {
                await computeNode.fireAsync(session, 0);
            } else {
                node.fire(session, 0);
            }
        }
        return this._collectResults();
    }

    // ── Internal helpers ───────────────────────────────────────────────────

    /**
     * Pre-inject external tensors onto source nodes' bag.pendingInput.
     * ComputeNodeBase.fire pulls from bag.pendingInput when the node
     * has no incoming channels.
     */
    private _injectExternalInputs(externalInputs?: Map<string, ITensor>): void {
        if (!externalInputs) {
            return;
        }
        for (const node of this.inputs) {
            const key = (node.id as string) ?? node.tag;
            if (key && externalInputs.has(key)) {
                const bag = (node.bag ?? {}) as IComputeNodeBag;
                bag.pendingInput = externalInputs.get(key);
                node.bag = bag;
            }
        }
    }

    /**
     * Collect output tensors from sink nodes' bag.lastOutputs into the
     * named-output Map. Keyed by tensor.name when set, else by sink
     * node id / tag / nodeType.
     */
    private _collectResults(): Map<string, ITensor> {
        const result = new Map<string, ITensor>();
        for (const node of this.outputs) {
            const bag = node.bag as IComputeNodeBag | undefined;
            if (!bag?.lastOutputs) {
                continue;
            }
            const fallbackKey = (node.id as string) ?? node.tag ?? node.nodeType;
            for (const tensor of bag.lastOutputs) {
                result.set(tensor.name ?? fallbackKey, tensor);
            }
        }
        return result;
    }
}
