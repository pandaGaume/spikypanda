import { IOlink } from "../graph/graph.interfaces";
import {
    IChannel,
    ILinkState,
    INodeState,
    IRuntimeGraph,
    IRuntimeNode,
    ISession,
} from "./execution.interfaces";
import { Scheduler } from "./execution.scheduler";

/**
 * Concrete ISession. Allocates linkStates / nodeStates at construction
 * (one per graph.link, one per graph.node, with node-provided state
 * factories where available), seeds delayed channels with their
 * initialValue on reset, dispatches run(t) through the scheduler that
 * matches the graph's declared mode.
 *
 * No allocation in the hot path: run(t) reuses the pre-allocated state
 * slots; producers write payloads in place, consumers clear them in
 * place. Matches the CyanMycelium MCU-friendly pattern.
 */
export class Session implements ISession {
    public readonly graph: IRuntimeGraph;
    public readonly linkStates: ILinkState[];
    public readonly nodeStates: INodeState[];

    public constructor(graph: IRuntimeGraph) {
        this.graph = graph;
        this.linkStates = graph.links.map(() => ({ ready: false, payload: undefined as unknown }));
        this.nodeStates = graph.nodes.map((n) => {
            if (typeof n.createNodeState === "function") {
                return n.createNodeState();
            }
            return { linksReady: 0 };
        });
        this.reset();
    }

    public setInput(channelIndex: number, value: unknown): void {
        const state = this.linkStates[channelIndex];
        state.payload = value;
        state.ready = true;
    }

    public getOutput(channelIndex: number): unknown {
        return this.linkStates[channelIndex].payload;
    }

    public nodeStateOf(node: IRuntimeNode): INodeState | undefined {
        const idx = (this.graph.nodes as ReadonlyArray<IRuntimeNode>).indexOf(node);
        return idx >= 0 ? this.nodeStates[idx] : undefined;
    }

    public linkStateOf(channel: IOlink): ILinkState | undefined {
        const idx = (this.graph.links as ReadonlyArray<IOlink>).indexOf(channel);
        return idx >= 0 ? this.linkStates[idx] : undefined;
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
        for (const ns of this.nodeStates) {
            ns.linksReady = 0;
        }
        for (const node of this.graph.nodes) {
            node.reset(this);
        }
    }
}
