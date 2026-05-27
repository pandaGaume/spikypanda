import { IOlink } from "../graph/graph.interfaces";
import { isControlSlot } from "./control-ports";
import {
    IChannel,
    ILinkRef,
    ILinkState,
    INodeState,
    IRuntimeGraph,
    IRuntimeNode,
    ISession,
    inSlotOf,
} from "./execution.interfaces";
import { Scheduler } from "./execution.scheduler";
import { StartNode } from "./start.node";
import { StopNode } from "./stop.node";

/**
 * Concrete ISession built on **per-node input buffers**.
 *
 * Each destination node owns one FIFO queue per incoming slot. A
 * `publish(linkIdx, value)` does NOT write into a per-channel slot;
 * it enqueues a `LinkRef { linkIndex, value }` onto the session's
 * scheduler queue. The scheduler drains the queue, alternating
 * between LinkRefs (which append the value into the destination's
 * slot buffer and queue the destination for a fire-check) and node
 * dispatches (which fire when every gating buffer is non-empty,
 * consuming exactly one token per slot per fire).
 *
 * The previous 1-slot `ILinkState` surface is kept as a derived view
 * (`linkStates` proxy), so existing nodes that probe
 * `session.linkStates[idx].ready` keep working transparently.
 *
 * Capacity per slot is sourced from the source port descriptor when
 * available (via {@link IRuntimeNode} declarations) and otherwise
 * defaults to 1, preserving historical 1-slot semantics for nodes that
 * have not been migrated to declare loop-friendly capacities.
 */
export class Session implements ISession {
    public readonly graph: IRuntimeGraph;
    public readonly nodeStates: INodeState[];

    /**
     * Scheduler work queue. Items are either LinkRefs (publish events
     * pending delivery) or IRuntimeNode (ready-check requests). Owned
     * by the Session so `publish()` can append while a node is firing.
     */
    public readonly queue: (ILinkRef | IRuntimeNode)[] = [];

    private _required: number[];
    private _linkStatesProxy: ILinkState[];

    public constructor(graph: IRuntimeGraph) {
        this.graph = graph;
        this.nodeStates = graph.nodes.map((n) => {
            const base = (typeof n.createNodeState === "function")
                ? n.createNodeState()
                : ({ linksReady: 0 } as INodeState);
            // Always materialise the buffer maps; createNodeState
            // subclasses may have omitted them.
            if (!base.inputBuffers)  base.inputBuffers  = new Map();
            if (!base.inputCapacity) base.inputCapacity = new Map();
            return base;
        });
        this._required = this._computeRequiredInputs();
        this._linkStatesProxy = this._buildLinkStatesProxy();
        this._populateCapacities();
        this.reset();
    }

    /**
     * Backwards-compatible view over the per-node input buffers. Each
     * entry exposes `{ ready, payload }` computed lazily from the
     * destination's buffer for that link's destination slot.
     */
    public get linkStates(): ReadonlyArray<ILinkState> {
        return this._linkStatesProxy;
    }

    public setInput(channelIndex: number, value: unknown): void {
        this.publish(channelIndex, value);
    }

    public getOutput(channelIndex: number): unknown {
        return this.peek(channelIndex);
    }

    /**
     * Enqueue a publish event onto the scheduler queue. The actual
     * buffer append happens when the LinkRef is dequeued, so the order
     * of effects within one outer drain stays FIFO across publishes
     * and downstream dispatches.
     */
    public publish(channelIndex: number, value: unknown): void {
        this.queue.push({ kind: "linkRef", linkIndex: channelIndex, value });
    }

    /**
     * Pop the head of the destination's buffer for this channel.
     * Returns undefined when the buffer is empty. Maintains the
     * destination's `linksReady` counter on empty-transitions.
     */
    public consume(channelIndex: number): unknown {
        const link = this._linkAt(channelIndex);
        if (!link) return undefined;
        const buf = this._bufferFor(link);
        if (!buf || buf.length === 0) return undefined;
        const value = buf.shift();
        if (buf.length === 0) {
            this._onSlotEmptied(link);
        }
        return value;
    }

    /**
     * Read the head of the destination's buffer without consuming it.
     * Returns undefined when the buffer is empty.
     */
    public peek(channelIndex: number): unknown {
        const link = this._linkAt(channelIndex);
        if (!link) return undefined;
        const buf = this._bufferFor(link);
        if (!buf || buf.length === 0) return undefined;
        return buf[0];
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
        return idx >= 0 ? this._linkStatesProxy[idx] : undefined;
    }

    public start(): void {
        for (const node of this.graph.nodes) {
            if (node instanceof StartNode) node.arm();
        }
    }

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

    /**
     * Buffer-level publish helper for the scheduler. Appends `value`
     * to the destination's slot buffer for the given channel, enforces
     * the per-slot capacity (throws on overflow), and bumps the
     * destination's `linksReady` on the empty → non-empty transition.
     *
     * This is the public entry point the scheduler uses when it pops a
     * LinkRef off the queue. External callers should use `publish()` so
     * the FIFO ordering with other queue items is preserved.
     */
    public deliverLinkRef(ref: ILinkRef): void {
        const link = this._linkAt(ref.linkIndex);
        if (!link || !link.enabled) return;
        const dst = link.ofin as IRuntimeNode | null;
        if (!dst) return;
        const state = this.nodeStateOf(dst);
        if (!state || !state.inputBuffers || !state.inputCapacity) return;
        const slot = inSlotOf(link);
        let buf = state.inputBuffers.get(slot);
        if (!buf) {
            buf = [];
            state.inputBuffers.set(slot, buf);
        }
        const cap = state.inputCapacity.get(slot) ?? 1;
        if (buf.length >= cap) {
            throw new Error(
                `[Session] channel overflow on slot "${String(slot)}" `
                + `(capacity ${cap}); raise the source port's capacity to allow burst publishes.`,
            );
        }
        const wasEmpty = buf.length === 0;
        buf.push(ref.value);
        if (wasEmpty && !isControlSlot(slot)) {
            state.linksReady++;
        }
    }

    public reset(): void {
        // Drop scheduler queue + every per-slot buffer.
        this.queue.length = 0;
        for (const ns of this.nodeStates) {
            if (ns.inputBuffers) {
                for (const buf of ns.inputBuffers.values()) buf.length = 0;
            }
            ns.linksReady = 0;
        }

        // Pre-seed delayed channels: their initialValue becomes a token
        // on the destination's slot buffer, so the destination can read
        // it on the first cycle and the feedback loop breaks cleanly.
        const links = this.graph.links as ReadonlyArray<IChannel>;
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            if (!link.delayed || link.initialValue === undefined) continue;
            this.deliverLinkRef({ kind: "linkRef", linkIndex: i, value: link.initialValue });
        }

        // Cascade reset to nodes (sub-graphs reset their internal sessions).
        for (const node of this.graph.nodes) node.reset(this);
    }

    // ── Internals ───────────────────────────────────────────────────────

    private _linkAt(channelIndex: number): IChannel | null {
        const link = this.graph.links[channelIndex] as IChannel | undefined;
        return link ?? null;
    }

    private _bufferFor(link: IChannel): unknown[] | undefined {
        const dst = link.ofin as IRuntimeNode | null;
        if (!dst) return undefined;
        const state = this.nodeStateOf(dst);
        if (!state || !state.inputBuffers) return undefined;
        return state.inputBuffers.get(inSlotOf(link));
    }

    private _onSlotEmptied(link: IChannel): void {
        const dst = link.ofin as IRuntimeNode | null;
        if (!dst) return;
        const state = this.nodeStateOf(dst);
        if (!state) return;
        if (isControlSlot(inSlotOf(link))) return;
        if (state.linksReady > 0) state.linksReady--;
    }

    private _computeRequiredInputs(): number[] {
        const links = this.graph.links as ReadonlyArray<IChannel>;
        return (this.graph.nodes as ReadonlyArray<IRuntimeNode>).map((n) => {
            // Use a Set of slot names to handle the case where multiple
            // links target the same slot (variadic ports): each slot
            // counts at most once toward the readiness requirement.
            const slots = new Set<string | number>();
            for (const link of n.opsc<IChannel>()) {
                if (!link.enabled) continue;
                if (links.indexOf(link) < 0) continue;
                const slot = inSlotOf(link);
                if (isControlSlot(slot)) continue;
                slots.add(slot);
            }
            return slots.size;
        });
    }

    private _buildLinkStatesProxy(): ILinkState[] {
        const session = this;
        return this.graph.links.map((_link, idx) => ({
            get ready(): boolean {
                const link = session.graph.links[idx] as IChannel | undefined;
                if (!link) return false;
                const buf = session._bufferFor(link);
                return !!buf && buf.length > 0;
            },
            get payload(): unknown {
                const link = session.graph.links[idx] as IChannel | undefined;
                if (!link) return undefined;
                const buf = session._bufferFor(link);
                return buf && buf.length > 0 ? buf[0] : undefined;
            },
            // Setters are kept off this proxy on purpose. Old code that
            // mutated `linkStates[i].payload = v` directly was bypassing
            // the readiness counter; that path is no longer supported.
        } as ILinkState));
    }

    /**
     * Walk every source port declaration on each node and remember the
     * highest capacity advertised for the destination of each channel.
     * Falls back to 1 per slot when nothing is declared. Capacities are
     * resolved once at construction; subsequent topology changes need
     * the session to be rebuilt anyway.
     */
    private _populateCapacities(): void {
        const links = this.graph.links as ReadonlyArray<IChannel>;
        for (let i = 0; i < links.length; i++) {
            const link = links[i];
            if (!link.enabled) continue;
            const dst = link.ofin as IRuntimeNode | null;
            if (!dst) continue;
            const state = this.nodeStateOf(dst);
            if (!state || !state.inputCapacity) continue;
            const slot = inSlotOf(link);

            // Resolve the capacity advertised by the source port (if any).
            let cap = 1;
            const src = link.oini as IRuntimeNode | null;
            const srcSlot = link.slot;
            const declaredOutputs = (src as unknown as { outputPorts?: ReadonlyArray<{ slot: string | number; capacity?: number }> })?.outputPorts;
            const declaredCtrlOut = (src as unknown as { controlOutputPorts?: ReadonlyArray<{ slot: string | number; capacity?: number }> })?.controlOutputPorts;
            const all = [...(declaredOutputs ?? []), ...(declaredCtrlOut ?? [])];
            for (const p of all) {
                if (p.slot === srcSlot && typeof p.capacity === "number" && p.capacity > 0) {
                    cap = Math.max(cap, p.capacity);
                }
            }

            // A destination port may also advertise a capacity; pick the max.
            const declaredInputs = (dst as unknown as { inputPorts?: ReadonlyArray<{ slot: string | number; capacity?: number }> })?.inputPorts;
            const declaredCtrlIn = (dst as unknown as { controlInputPorts?: ReadonlyArray<{ slot: string | number; capacity?: number }> })?.controlInputPorts;
            const allDst = [...(declaredInputs ?? []), ...(declaredCtrlIn ?? [])];
            for (const p of allDst) {
                if (p.slot === slot && typeof p.capacity === "number" && p.capacity > 0) {
                    cap = Math.max(cap, p.capacity);
                }
            }

            const prev = state.inputCapacity.get(slot) ?? 0;
            if (cap > prev) state.inputCapacity.set(slot, cap);
        }
    }
}
