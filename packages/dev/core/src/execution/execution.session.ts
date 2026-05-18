import { IOlink } from "../graph/graph.interfaces";
import { isControlSlot } from "./control-ports";
import {
    IChannel,
    ILinkState,
    INodeState,
    IRuntimeGraph,
    IRuntimeNode,
    ISession,
} from "./execution.interfaces";
import { Scheduler } from "./execution.scheduler";
import { StartNode } from "./start.node";
import { StopNode } from "./stop.node";

/**
 * Concrete ISession. Allocates linkStates / nodeStates at construction
 * (one per graph.link, one per graph.node, with node-provided state
 * factories where available), pre-computes the per-node required-inputs
 * count, seeds delayed channels on reset, dispatches run(t) through the
 * scheduler that matches the graph's declared mode.
 *
 * No allocation in the hot path: run(t) reuses the pre-allocated state
 * slots; producers publish payloads in place via publish(), consumers
 * clear them in place via consume(). publish/consume keep linksReady
 * counters up to date so the ready-queue scheduler dispatches in O(N+E)
 * per cycle instead of polling isReady on all nodes.
 */
export class Session implements ISession {
    public readonly graph: IRuntimeGraph;
    public readonly linkStates: ILinkState[];
    public readonly nodeStates: INodeState[];

    private _required: number[];

    public constructor(graph: IRuntimeGraph) {
        this.graph = graph;
        this.linkStates = graph.links.map(() => ({ ready: false, payload: undefined as unknown }));
        this.nodeStates = graph.nodes.map((n) => {
            if (typeof n.createNodeState === "function") {
                return n.createNodeState();
            }
            return { linksReady: 0 };
        });
        this._required = this._computeRequiredInputs();
        this.reset();
    }

    public setInput(channelIndex: number, value: unknown): void {
        this.publish(channelIndex, value);
    }

    public getOutput(channelIndex: number): unknown {
        return this.peek(channelIndex);
    }

    public publish(channelIndex: number, value: unknown): void {
        const state = this.linkStates[channelIndex];
        const wasReady = state.ready;
        state.payload = value;
        state.ready = true;
        if (wasReady) {
            return;
        }
        const link = this.graph.links[channelIndex] as IChannel;
        if (!link.enabled) {
            return;
        }
        const dst = link.ofin as IRuntimeNode | null;
        if (!dst) {
            return;
        }
        const dstState = this.nodeStateOf(dst);
        if (dstState) {
            dstState.linksReady++;
        }
    }

    public consume(channelIndex: number): unknown {
        const state = this.linkStates[channelIndex];
        const wasReady = state.ready;
        const value = state.payload;
        state.payload = undefined;
        state.ready = false;
        if (!wasReady) {
            return value;
        }
        const link = this.graph.links[channelIndex] as IChannel;
        if (!link.enabled) {
            return value;
        }
        const dst = link.ofin as IRuntimeNode | null;
        if (!dst) {
            return value;
        }
        const dstState = this.nodeStateOf(dst);
        if (dstState && dstState.linksReady > 0) {
            dstState.linksReady--;
        }
        return value;
    }

    public peek(channelIndex: number): unknown {
        return this.linkStates[channelIndex].payload;
    }

    public requiredInputsOf(node: IRuntimeNode): number {
        const idx = (this.graph.nodes as ReadonlyArray<IRuntimeNode>).indexOf(node);
        return idx >= 0 ? this._required[idx] : 0;
    }

    public nodeStateOf(node: IRuntimeNode): INodeState | undefined {
        const idx = (this.graph.nodes as ReadonlyArray<IRuntimeNode>).indexOf(node);
        return idx >= 0 ? this.nodeStates[idx] : undefined;
    }

    public linkStateOf(channel: IOlink): ILinkState | undefined {
        const idx = (this.graph.links as ReadonlyArray<IOlink>).indexOf(channel);
        return idx >= 0 ? this.linkStates[idx] : undefined;
    }

    /**
     * Begin-Play entry point. Arms every StartNode in this session's
     * graph; on the next run(t) those nodes fire and publish their
     * _started trigger. Safe to call before run(); no immediate
     * execution happens (the trigger flows through the normal scheduler
     * dispatch).
     */
    public start(): void {
        for (const node of this.graph.nodes) {
            if (node instanceof StartNode) node.arm();
        }
    }

    /** End-Play entry point: arms every StopNode of the graph. */
    public stop(): void {
        for (const node of this.graph.nodes) {
            if (node instanceof StopNode) node.arm();
        }
    }

    public run(t: number): void {
        if (this.graph.mode === "dynamic") {
            Scheduler.RunDynamic(this, t);
            return;
        }
        if (this.graph.mode === "static") {
            Scheduler.RunStatic(this, t);
            return;
        }
        throw new Error(`scheduler not implemented for mode "${this.graph.mode}"`);
    }

    public reset(): void {
        const links = this.graph.links as ReadonlyArray<IChannel>;
        // 1. Reset every linkState; pre-seed delayed channels.
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            const state = this.linkStates[i];
            if (link.delayed && link.initialValue !== undefined) {
                state.payload = link.initialValue;
                state.ready = true;
            } else {
                state.payload = undefined;
                state.ready = false;
            }
        }
        // 2. Zero linksReady counters.
        for (const ns of this.nodeStates) {
            ns.linksReady = 0;
        }
        // 3. Re-seed counters from currently-ready enabled channels.
        for (let i = 0; i < links.length; i++) {
            if (!this.linkStates[i].ready) {
                continue;
            }
            const link = links[i];
            if (!link.enabled) {
                continue;
            }
            const dst = link.ofin as IRuntimeNode | null;
            if (!dst) {
                continue;
            }
            const dstIdx = (this.graph.nodes as ReadonlyArray<IRuntimeNode>).indexOf(dst);
            if (dstIdx >= 0) {
                this.nodeStates[dstIdx].linksReady++;
            }
        }
        // 4. Cascade reset to the nodes (sub-graphs reset their internal sessions here).
        for (const node of this.graph.nodes) {
            node.reset(this);
        }
    }

    /**
     * Pre-compute per-node enabled-incoming count, filtering opsc() to
     * channels that actually belong to this session's graph (a sub-graph
     * instance can be embedded in N parents, so its opsc() aggregates
     * channels from all of them; only the ones in our graph gate us).
     */
    private _computeRequiredInputs(): number[] {
        const links = this.graph.links as ReadonlyArray<IChannel>;
        return (this.graph.nodes as ReadonlyArray<IRuntimeNode>).map((n) => {
            let count = 0;
            for (const link of n.opsc<IChannel>()) {
                if (!link.enabled) {
                    continue;
                }
                if (links.indexOf(link) < 0) {
                    continue;
                }
                // Control-plane channels (_enable, _start, _stop, ...) are
                // optional by contract and must not gate the data-flow
                // readiness counter; otherwise a node with an unwired
                // _enable port would never reach `linksReady >= required`.
                if (isControlSlot(link.slot)) {
                    continue;
                }
                count++;
            }
            return count;
        });
    }
}
