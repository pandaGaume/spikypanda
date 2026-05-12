import type { ICartesian } from "../geometry";
import { cloneable } from "../graph/graph.interfaces";
import { Graph } from "../graph/graph.graph";
import { Nullable } from "../types";
import {
    IChannel,
    IGraphNodeState,
    INodeState,
    IRuntimeGraph,
    IRuntimeNode,
    ISession,
    SchedulingMode,
} from "./execution.interfaces";
import { Session } from "./execution.session";

/**
 * Concrete IRuntimeGraph. Extends Graph<N, L> for the topology and
 * implements the IRuntimeNode surface so the graph can be embedded as a
 * node inside a parent graph (fractal composition).
 *
 * Top-level use: the caller creates `new Session(graph)` and drives via
 * session.run(t). The graph's own IRuntimeNode methods are unused; the
 * Session it owns is the entry point.
 *
 * Embedded use: the caller wires this graph as a node in a parent graph
 * via channels, providing inputBindings (external slot -> internal
 * channel index) and outputBindings (external slot -> internal channel
 * index). Per-parent-session state (including the internal Session
 * driving this sub-graph) lives in IGraphNodeState within the parent
 * session, so the same IRuntimeGraph instance can be embedded by N
 * concurrent parent sessions without sharing state.
 */
export class RuntimeGraph<N extends IRuntimeNode = IRuntimeNode, L extends IChannel = IChannel>
    extends Graph<N, L>
    implements IRuntimeGraph<N, L>
{
    @cloneable public mode: SchedulingMode;
    @cloneable public enabled: boolean;
    @cloneable public inputBindings: Map<string | number, number>;
    @cloneable public outputBindings: Map<string | number, number>;

    public constructor(
        nodes: N[] = [],
        links: L[] = [],
        mode: SchedulingMode = "dynamic",
        inputBindings: Map<string | number, number> = new Map(),
        outputBindings: Map<string | number, number> = new Map(),
        inputs: Nullable<N[]> = null,
        outputs: Nullable<N[]> = null,
        hiddens: Nullable<N[]> = null,
        position?: ICartesian,
        enabled: boolean = true
    ) {
        super(nodes, links, inputs, outputs, hiddens, null, null, position);
        this.mode = mode;
        this.inputBindings = inputBindings;
        this.outputBindings = outputBindings;
        this.enabled = enabled;
    }

    /**
     * Per-parent-session state factory: allocates an internal Session
     * keyed to this sub-graph. Each parent session calling this gets a
     * distinct internalSession, so concurrent embeddings do not share
     * runtime state.
     */
    public createNodeState(): IGraphNodeState {
        return {
            linksReady: 0,
            internalSession: new Session(this),
        };
    }

    public isReady(parentSession: ISession): boolean {
        if (!this.enabled) {
            return false;
        }
        const incoming = this.opsc<IChannel>();
        for (const link of incoming) {
            if (!link.enabled) {
                continue;
            }
            const state = parentSession.linkStateOf(link);
            if (!state) {
                // Channel belongs to a different parent session (this
                // sub-graph instance is embedded in N parents); skip.
                continue;
            }
            if (!state.ready) {
                return false;
            }
        }
        return true;
    }

    public fire(parentSession: ISession, t: number): void {
        const inner = this._internalSessionIn(parentSession);
        if (!inner) {
            return;
        }

        // 1. Route incoming external channels into internal link states.
        // Use parent.consume to clear-and-decrement the parent counter,
        // then inner.publish to write-and-bump the internal counter.
        const parentLinks = parentSession.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) {
                continue;
            }
            const parentIdx = parentLinks.indexOf(link);
            const internalIdx = this.inputBindings.get(link.slot);
            const parentState = parentSession.linkStateOf(link);
            if (parentIdx < 0 || internalIdx === undefined || !parentState || !parentState.ready) {
                continue;
            }
            const value = parentSession.consume(parentIdx);
            inner.publish(internalIdx, value);
        }

        // 2. Run the internal scheduler.
        inner.run(t);

        // 3. Route internal output link states back to external channels.
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) {
                continue;
            }
            const parentIdx = parentLinks.indexOf(link);
            const internalIdx = this.outputBindings.get(link.slot);
            if (parentIdx < 0 || internalIdx === undefined) {
                continue;
            }
            const internalState = inner.linkStates[internalIdx];
            if (!internalState.ready) {
                continue;
            }
            const value = inner.consume(internalIdx);
            parentSession.publish(parentIdx, value);
        }
    }

    public reset(parentSession: ISession): void {
        // The Session.reset() that triggered this call already zeroed
        // linksReady on every nodeState; we only need to reset our
        // internal session, which cascades to our internal nodes.
        const inner = this._internalSessionIn(parentSession);
        inner?.reset();
    }

    /**
     * Retrieves this sub-graph's internal session from its IGraphNodeState
     * inside the given parent session. Returns undefined when the parent
     * session was not constructed against a graph containing this
     * sub-graph (defensive).
     */
    private _internalSessionIn(parentSession: ISession): ISession | undefined {
        const state = parentSession.nodeStateOf(this) as IGraphNodeState | INodeState | undefined;
        if (state && "internalSession" in state) {
            return state.internalSession;
        }
        return undefined;
    }
}
