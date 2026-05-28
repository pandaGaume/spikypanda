import type { ICartesian } from "../geometry";
import { cloneable } from "../graph/graph.interfaces";
import { Graph } from "../graph/graph.graph";
import { Nullable } from "../types";
import { CONTROL_PORT_ENABLE, CONTROL_PORT_ENABLED, ENABLE_INPUT_PORT, ENABLED_OUTPUT_PORT, publishControlOutput } from "./control-ports";
import type {
    IChannel,
    IDeclaresControlPorts,
    IDeclaresPorts,
    IGraphNodeState,
    INodeState,
    IPortDescriptor,
    IRuntimeGraph,
    IRuntimeNode,
    ISession,
    SchedulingMode,
} from "./execution.interfaces";
import { Scheduler } from "./execution.scheduler";
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
 * via channels. Routing across the embedding boundary uses the channel
 * slot directly: an internal channel with `oini === null` (a dangling
 * input port) matches an incoming parent channel by slot name; an
 * internal channel with `ofin === null` (a dangling output port)
 * matches an outgoing parent channel by slot name. Per-parent-session
 * state (including the internal Session driving this sub-graph) lives
 * in IGraphNodeState within the parent session, so the same
 * IRuntimeGraph instance can be embedded by N concurrent parent
 * sessions without sharing state.
 */
export class RuntimeGraph<N extends IRuntimeNode = IRuntimeNode, L extends IChannel = IChannel>
    extends Graph<N, L>
    implements IRuntimeGraph<N, L>, IDeclaresPorts, IDeclaresControlPorts
{
    /** Default control plane mirrors RuntimeNode so an embedded graph
     *  satisfies the same IEnabled wiring as a leaf node. */
    public readonly controlInputPorts: ReadonlyArray<IPortDescriptor> = [ENABLE_INPUT_PORT];
    public readonly controlOutputPorts: ReadonlyArray<IPortDescriptor> = [ENABLED_OUTPUT_PORT];

    /** A composite graph is enable-able by default like a leaf node. */
    public readonly supportsEnabling: boolean = true;

    /**
     * Source-order port descriptors. The i-th input port maps to
     * inputs[i] (the i-th source node), the i-th output port maps to
     * outputs[i]. Slot identifiers are positional indices. Consumed by
     * the editor to render the embedded-graph node, and by the embedded
     * routing fallback (when no named port channel matches the slot).
     */
    public get inputPorts(): ReadonlyArray<IPortDescriptor> {
        return this.inputs.map((_, i) => ({ slot: i, optional: false }));
    }

    public get outputPorts(): ReadonlyArray<IPortDescriptor> {
        return this.outputs.map((_, i) => ({ slot: i, optional: false }));
    }

    @cloneable public mode: SchedulingMode;
    @cloneable public enabled: boolean;

    /**
     * Lazy default Session for autonomous run() / runAsync() calls.
     * Implementation detail, not exposed via the interface. Callers that
     * need explicit Session control pass their own via the optional
     * `session` argument of run/runAsync.
     */
    private _defaultSession?: Session;

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
        const inner = this._routeInputsFromParent(parentSession);
        if (!inner) {
            return;
        }
        inner.run(t);
        this._routeOutputsToParent(parentSession, inner);
    }

    /**
     * Async embedding variant of fire(): same I/O routing but drives
     * the sub-graph's internal topology via this graph's own
     * runAsync() on the internal session, so async nodes inside the
     * sub-graph are awaited rather than skipped.
     */
    public async fireAsync(parentSession: ISession, t: number): Promise<void> {
        const inner = this._routeInputsFromParent(parentSession);
        if (!inner) {
            return;
        }
        await this.runAsync(t, inner);
        this._routeOutputsToParent(parentSession, inner);
    }

    /**
     * Route incoming external channels into the internal session.
     * Returns the internal session (or undefined if this graph is not
     * embedded in the given parent session's graph).
     *
     * Boundary matching: each external incoming link's slot is matched
     * against an internal input port (a channel whose oini is null).
     * Lazily memoized in _portIndex for O(1) subsequent lookups.
     */
    private _routeInputsFromParent(parentSession: ISession): ISession | undefined {
        const inner = this._internalSessionIn(parentSession);
        if (!inner) {
            return undefined;
        }
        const parentLinks = parentSession.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) {
                continue;
            }
            const parentIdx = parentLinks.indexOf(link);
            const parentState = parentSession.linkStateOf(link);
            if (parentIdx < 0 || !parentState || !parentState.ready) {
                continue;
            }
            const internalIdx = this._inputPortIndex(link.slot);
            if (internalIdx >= 0) {
                const value = parentSession.consume(parentIdx);
                inner.publish(internalIdx, value);
                continue;
            }
            // Source-order fallback: slot is a numeric index into inputs[].
            // Writes the value onto the source node's bag.pendingInput,
            // which Kernel-style _gatherInputs picks up for nodes with
            // no incoming channels (the canonical source-node case).
            if (typeof link.slot === "number" && link.slot >= 0 && link.slot < this.inputs.length) {
                const src = this.inputs[link.slot];
                const bag = (src.bag ?? {}) as Record<string, unknown>;
                bag.pendingInput = parentSession.consume(parentIdx);
                src.bag = bag as N["bag"];
            }
        }
        return inner;
    }

    /**
     * Route internal output link states back to external channels in
     * the parent session.
     *
     * Boundary matching: each external outgoing link's slot is matched
     * against an internal output port (a channel whose ofin is null).
     */
    private _routeOutputsToParent(parentSession: ISession, inner: ISession): void {
        const parentLinks = parentSession.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) {
                continue;
            }
            const parentIdx = parentLinks.indexOf(link);
            if (parentIdx < 0) {
                continue;
            }
            const internalIdx = this._outputPortIndex(link.slot);
            if (internalIdx >= 0) {
                const internalState = inner.linkStates[internalIdx];
                if (!internalState.ready) {
                    continue;
                }
                parentSession.publish(parentIdx, inner.consume(internalIdx));
                continue;
            }
            // Source-order fallback: slot is a numeric index into outputs[].
            // Reads the value from the sink node's bag.lastOutputs[0], which
            // Kernel-style _publishOutputs stashes there after execute().
            if (typeof link.slot === "number" && link.slot >= 0 && link.slot < this.outputs.length) {
                const sink = this.outputs[link.slot];
                const bag = sink.bag as { lastOutputs?: ReadonlyArray<unknown> } | undefined;
                const value = bag?.lastOutputs?.[0];
                if (value !== undefined) {
                    parentSession.publish(parentIdx, value);
                }
            }
        }
    }

    // ── Port-channel lookup (memoized) ────────────────────────────────
    //
    // Input ports : internal channels whose oini === null.
    // Output ports: internal channels whose ofin === null.
    // The slot of a port channel is its public name; embedding code
    // matches external link.slot against these.

    private _inputPortMap?: Map<string | number, number>;
    private _outputPortMap?: Map<string | number, number>;

    private _inputPortIndex(slot: string | number): number {
        if (!this._inputPortMap) {
            this._inputPortMap = new Map();
            for (let i = 0; i < this.links.length; i++) {
                const link = this.links[i] as unknown as IChannel;
                if (link.oini == null) {
                    this._inputPortMap.set(link.slot, i);
                }
            }
        }
        const idx = this._inputPortMap.get(slot);
        return idx === undefined ? -1 : idx;
    }

    private _outputPortIndex(slot: string | number): number {
        if (!this._outputPortMap) {
            this._outputPortMap = new Map();
            for (let i = 0; i < this.links.length; i++) {
                const link = this.links[i] as unknown as IChannel;
                if (link.ofin == null) {
                    this._outputPortMap.set(link.slot, i);
                }
            }
        }
        const idx = this._outputPortMap.get(slot);
        return idx === undefined ? -1 : idx;
    }

    /**
     * Same _enable / _enabled control-input handling as RuntimeNode, so
     * an embedded graph behaves like any other IRuntimeNode under the
     * scheduler's control-plane drain. Internal nodes get their own
     * control inputs processed by the inner scheduler when fire() runs.
     */
    public processControlInputs(parentSession: ISession): void {
        const links = parentSession.graph.links as ReadonlyArray<IChannel>;
        const prevEnabled = this.enabled;
        let received = false;
        let nextEnabled = prevEnabled;
        for (const link of this.opsc<IChannel>()) {
            if (link.slot !== CONTROL_PORT_ENABLE || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (!parentSession.linkStates[idx].ready) continue;
            const value = parentSession.consume(idx);
            received = true;
            nextEnabled = !!value;
        }
        if (received && nextEnabled !== prevEnabled) {
            this.enabled = nextEnabled;
            this.notifyPropertyChanged("enabled", prevEnabled, nextEnabled);
            publishControlOutput(this, parentSession, CONTROL_PORT_ENABLED, nextEnabled);
        }
    }

    public reset(parentSession: ISession): void {
        // The Session.reset() that triggered this call already zeroed
        // linksReady on every nodeState; we only need to reset our
        // internal session, which cascades to our internal nodes.
        const inner = this._internalSessionIn(parentSession);
        inner?.reset();
    }

    // ── ITickable: autonomous drive on the default (or caller-provided) session ──

    public run(t: number, session?: ISession): void {
        const target = session ?? this._ensureDefaultSession();
        target.run(t);
    }

    public async runAsync(t: number, session?: ISession): Promise<void> {
        const target = session ?? this._ensureDefaultSession();
        // Walk the static topological order so each node's promise can
        // be awaited in turn. fireAsync is mandatory on IRuntimeNode,
        // so no cast or capability check is needed; nodes with no
        // async work inherit the default (sync) implementation.
        const order = Scheduler.GetStaticOrder(this);
        for (const node of order) {
            node.processControlInputs?.(target);
            if (!node.enabled || !node.isReady(target)) {
                continue;
            }
            await node.fireAsync(target, t);
        }
    }

    /**
     * Reset the default Session if one has been lazily allocated.
     * Class-only convenience; not part of any interface. Callers using
     * their own Session via run(t, session) manage its lifecycle
     * themselves.
     */
    public resetSession(): void {
        this._defaultSession?.reset();
    }

    private _ensureDefaultSession(): Session {
        return (this._defaultSession ??= new Session(this));
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
