// ═══════════════════════════════════════════════════════════════════════════
// Kernel : abstract base for tensor-flow compute nodes.
//
// Adapts the kernel-style `execute(inputs[]):outputs[]` contract to the
// runtime fire(session, t) contract: gathers inputs from opsc channels
// in slot-sorted order, calls execute, stashes outputs on bag.lastOutputs
// (so sink collection by ComputeGraph.run can find them), publishes
// outputs to onsc channels via session.publish. Concrete op subclasses
// only implement execute() (and optionally executeAsync()).
// ═══════════════════════════════════════════════════════════════════════════

import { ISession } from "../execution/execution.interfaces";
import { RuntimeNode } from "../execution/execution.node";
import { IKernel, IKernelBag, IDataLink, ITensor } from "./compute.interfaces";

export abstract class Kernel extends RuntimeNode<IKernelBag> implements IKernel {
    public abstract readonly nodeType: string;
    public abstract readonly outputShapes: number[][];

    public abstract execute(inputs: ITensor[]): ITensor[];
    public executeAsync?(inputs: ITensor[]): Promise<ITensor[]>;

    /**
     * Adapter: gather inputs (consume from session linkStates in slot
     * order, or read bag.pendingInput for source nodes), execute the
     * kernel, stash outputs on bag.lastOutputs, publish outputs to
     * outgoing channels.
     */
    public override fire(session: ISession, _t: number): void {
        const inputs = this._gatherInputs(session);
        const outputs = this.execute(inputs);
        this._publishOutputs(session, outputs);
    }

    /**
     * Async variant of fire(): same gather/publish flow but awaits
     * executeAsync when defined. Falls back to the sync execute path.
     */
    public override async fireAsync(session: ISession, _t: number): Promise<void> {
        const inputs = this._gatherInputs(session);
        const outputs = this.executeAsync ? await this.executeAsync(inputs) : this.execute(inputs);
        this._publishOutputs(session, outputs);
    }

    // ── internal ───────────────────────────────────────────────────────

    private _gatherInputs(session: ISession): ITensor[] {
        const incoming = this.opsc<IDataLink>();

        if (incoming.length === 0) {
            // Source node: pull the pre-injected external tensor from
            // bag.pendingInput. ComputeGraph.run stashes it before
            // running the session.
            const bag = this.bag as IKernelBag | undefined;
            return bag?.pendingInput ? [bag.pendingInput] : [];
        }

        // Transform node: consume each incoming channel in slot order
        // (the ONNX graph builder tags links with their positional
        // input index; arbitrary numeric ordering when not set).
        const links = session.graph.links as ReadonlyArray<IDataLink>;
        const hasSlot = incoming.some((l) => l.slot >= 0);
        const ordered = hasSlot ? [...incoming].sort((a, b) => a.slot - b.slot) : incoming;
        const inputs: ITensor[] = [];
        for (const link of ordered) {
            if (!link.enabled) {
                continue;
            }
            const idx = links.indexOf(link);
            if (idx < 0) {
                continue;
            }
            const tensor = session.consume(idx) as ITensor | undefined;
            if (tensor) {
                inputs.push(tensor);
            }
        }
        return inputs;
    }

    private _publishOutputs(session: ISession, outputs: ITensor[]): void {
        // Stash for sink collection by ComputeGraph._collectResults.
        const bag = (this.bag ?? {}) as IKernelBag;
        bag.lastOutputs = outputs;
        this.bag = bag;

        // Distribute to outgoing channels. With multiple outputs, the
        // i-th output goes to the i-th outgoing link, falling back to
        // outputs[0] when out of range. With a single output, broadcast
        // to all outgoing links (matches the prior ComputeGraph
        // behaviour).
        const outgoing = this.onsc<IDataLink>();
        const links = session.graph.links as ReadonlyArray<IDataLink>;
        for (let i = 0; i < outgoing.length; i++) {
            const link = outgoing[i];
            if (!link.enabled) {
                continue;
            }
            const idx = links.indexOf(link);
            if (idx < 0) {
                continue;
            }
            const tensor = outputs.length > 1 ? (outputs[i] ?? outputs[0]) : outputs[0];
            if (tensor) {
                session.publish(idx, tensor);
            }
        }
    }
}
