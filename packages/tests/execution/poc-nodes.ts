import { IChannel, ISession, RuntimeNode } from "spikypanda-core";

/**
 * Shared POC node implementations used across dynamic, static, and
 * nested test files. All three use the new publish/consume Session API
 * so the ready-queue dynamic scheduler can track linksReady counters
 * automatically. The static scheduler runs them in topo order; raw
 * publish/consume is harmless there because the counters are not used.
 */

export class ProducerNode extends RuntimeNode {
    public constructor(public readonly value: number) {
        super();
    }
    public override isReady(_s: ISession): boolean {
        return this.enabled;
    }
    public override fire(session: ISession, _t: number): void {
        const out = this.onsc<IChannel>()[0];
        const idx = (session.graph.links as ReadonlyArray<IChannel>).indexOf(out);
        session.publish(idx, this.value);
    }
}

export class ConsumerNode extends RuntimeNode {
    public received: number[] = [];
    public override fire(session: ISession, _t: number): void {
        const inc = this.opsc<IChannel>()[0];
        const idx = (session.graph.links as ReadonlyArray<IChannel>).indexOf(inc);
        this.received.push(session.consume(idx) as number);
    }
    public override reset(_s: ISession): void {
        this.received = [];
    }
}

export class AddNode extends RuntimeNode {
    public override fire(session: ISession, _t: number): void {
        const ins = this.opsc<IChannel>();
        const links = session.graph.links as ReadonlyArray<IChannel>;
        const a = session.consume(links.indexOf(ins[0])) as number;
        const b = session.consume(links.indexOf(ins[1])) as number;
        const out = this.onsc<IChannel>()[0];
        session.publish(links.indexOf(out), a + b);
    }
}
