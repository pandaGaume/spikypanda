import type { ICartesian } from "../geometry";
import { cloneable, IOlink } from "../graph/graph.interfaces";
import { GraphNode } from "../graph/graph.node";
import { Nullable } from "../types";
import { IChannel, IRuntimeNode, ISession } from "./execution.interfaces";

/**
 * Concrete IRuntimeNode base. Provides default isReady (all non-disabled
 * incoming channels are ready in the session) and no-op fire/reset that
 * subclasses override. State lives in the session, not on the node, so
 * one instance is safe across N parallel sessions.
 */
export class RuntimeNode<B = unknown> extends GraphNode<B> implements IRuntimeNode<B> {
    @cloneable public enabled: boolean;

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
}
