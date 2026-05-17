// ═══════════════════════════════════════════════════════════════════════════
// EmbeddingSink : RuntimeNode that captures every embedding tensor it
// receives. Tests inspect `received` to verify the pipeline produced
// outputs; firmware deployments replace this with a node that ships the
// embedding to a downstream classifier / radio / storage.
// ═══════════════════════════════════════════════════════════════════════════

import {
    IChannel,
    ISession,
    ITensor,
    RuntimeNode,
} from "spikypanda-core";

export class EmbeddingSink extends RuntimeNode {
    public received: ITensor[] = [];

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        const incoming = this.opsc<IChannel>();
        for (const link of incoming) {
            if (!link.enabled) {
                continue;
            }
            const idx = links.indexOf(link);
            if (idx < 0) {
                continue;
            }
            const tensor = session.consume(idx) as ITensor | undefined;
            if (tensor) {
                this.received.push(tensor);
            }
        }
    }

    public override reset(_s: ISession): void {
        this.received = [];
    }
}
