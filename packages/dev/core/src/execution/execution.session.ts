import { IChannel, ILinkState, INodeState, IRuntimeGraph, ISession } from "./execution.interfaces";
import { runDynamic } from "./execution.scheduler.dynamic";

/**
 * Concrete ISession. Allocates linkStates / nodeStates at construction
 * (one slot per graph.link, one per graph.node), seeds delayed channels
 * with their initialValue on reset, dispatches run(t) through the
 * scheduler matching the graph's declared mode.
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
        this.nodeStates = graph.nodes.map(() => ({ linksReady: 0 }));
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

    public run(t: number): void {
        if (this.graph.mode === "dynamic") {
            runDynamic(this, t);
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
