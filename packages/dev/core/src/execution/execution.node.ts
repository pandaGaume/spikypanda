import type { ICartesian } from "../geometry";
import { cloneable, IOlink } from "../graph/graph.interfaces";
import { GraphNode } from "../graph/graph.node";
import { Nullable } from "../types";
import { CONTROL_PORT_ENABLE, CONTROL_PORT_ENABLED, ENABLE_INPUT_PORT, ENABLED_OUTPUT_PORT, publishControlOutput } from "./control-ports";
import { IChannel, IDeclaresControlPorts, IPortDescriptor, IRuntimeNode, ISession } from "./execution.interfaces";

/**
 * Concrete IRuntimeNode base. Provides default isReady (all non-disabled
 * incoming channels are ready in the session) and no-op fire/reset that
 * subclasses override. State lives in the session, not on the node, so
 * one instance is safe across N parallel sessions.
 */
export class RuntimeNode<B = unknown> extends GraphNode<B> implements IRuntimeNode<B>, IDeclaresControlPorts {
    @cloneable public enabled: boolean;

    /**
     * Default to true: every plain RuntimeNode supports the enable
     * toggle. Always-on subclasses (StartNode, StopNode) override to
     * false to hide the toggle in editors without disturbing the
     * structural IEnabled contract.
     */
    public readonly supportsEnabling: boolean = true;

    /**
     * Default control plane: every RuntimeNode is IEnabled, so it
     * exposes _enable (boolean input) to set the state and _enabled
     * (boolean output) to broadcast it. Subclasses override to extend
     * with start/stop (see RunnableNode) or other lifecycle ports.
     * Override-by-assignment is fine since the property is declared
     * readonly here but reassigned in subclass field initialisers.
     */
    public readonly controlInputPorts:  ReadonlyArray<IPortDescriptor> = [ENABLE_INPUT_PORT];
    public readonly controlOutputPorts: ReadonlyArray<IPortDescriptor> = [ENABLED_OUTPUT_PORT];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
        enabled: boolean = true
    ) {
        super(onsc, opsc, position);
        this.enabled = enabled;
    }

    public isReady(session: ISession): boolean {
        if (!this.enabled) {
            return false;
        }
        const incoming = this.opsc<IChannel>();
        for (const link of incoming) {
            if (!link.enabled) {
                continue;
            }
            const idx = (session.graph.links as ReadonlyArray<IChannel>).indexOf(link);
            if (idx < 0) {
                continue;
            }
            if (!session.linkStates[idx].ready) {
                return false;
            }
        }
        return true;
    }

    public fire(_session: ISession, _t: number): void {
        // Concrete nodes override.
    }

    /**
     * Default async fire: delegates to the sync fire(). Nodes that wrap
     * genuinely async work (GPU, WebWorker, ONNX runtime) override to
     * await their async primitive. RuntimeGraph.runAsync invokes this
     * uniformly without checking which path applies.
     */
    public async fireAsync(session: ISession, t: number): Promise<void> {
        this.fire(session, t);
    }

    public reset(_session: ISession): void {
        // Concrete nodes override.
    }

    /**
     * Default control-input processing. Drains the _enable channel(s)
     * if any; applies the latest received boolean value to this.enabled
     * and broadcasts the new state on the _enabled output (only when it
     * actually changed). Subclasses override to extend (RunnableNode
     * adds _start / _stop trigger handling).
     */
    public processControlInputs(session: ISession): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        const prevEnabled = this.enabled;
        let received = false;
        let nextEnabled = prevEnabled;

        for (const link of this.opsc<IChannel>()) {
            if (link.slot !== CONTROL_PORT_ENABLE) continue;
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (!session.linkStates[idx].ready) continue;
            const value = session.consume(idx);
            received = true;
            nextEnabled = !!value;
        }

        if (received && nextEnabled !== prevEnabled) {
            this.enabled = nextEnabled;
            this.notifyPropertyChanged("enabled", prevEnabled, nextEnabled);
            publishControlOutput(this, session, CONTROL_PORT_ENABLED, nextEnabled);
        }
    }
}
