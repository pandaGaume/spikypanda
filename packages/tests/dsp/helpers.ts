/**
 * Tiny runtime-graph test fixtures shared by the DSP suites: a token
 * source that emits one queued token per tick and two collectors (raw
 * tokens / tensor frames). Mirrors the ImuSource + collector pattern
 * from packages/tests/privates/driverv2/driverv2.units.test.ts so the
 * nodes under test receive real scheduler-delivered inputs instead of
 * hand-stubbed sessions.
 */
import { IChannel, ISession, RuntimeNode } from "spikypanda-core";
import type { ITensor } from "spikypanda-core";

/** Emits one queued token per fire() on every outgoing channel. */
export class TokenSource extends RuntimeNode {
    private readonly _tokens: unknown[];
    private _cursor: number = 0;

    public constructor(tokens: unknown[]) {
        super();
        this._tokens = tokens;
    }

    public override isReady(_s: ISession): boolean {
        return this.enabled && this._cursor < this._tokens.length;
    }

    public override fire(session: ISession, _t: number): void {
        const token = this._tokens[this._cursor++];
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx >= 0) session.publish(idx, token);
        }
    }
}

/** Builds a rank-1 ITensor row, the shape DSP.Stream:mux emits. */
export function row(values: number[]): ITensor {
    return { data: Float32Array.from(values), shape: [values.length] };
}

/** Collects every raw token arriving on its (single) input slot. */
export class TokenCollector extends RuntimeNode {
    public readonly tokens: unknown[] = [];

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                this.tokens.push(session.consume(idx));
            }
        }
    }
}

/** Collects tensor frames, snapshotting shape + values at consume time
 *  (producers like the mux REUSE their Float32Array across ticks, so a
 *  late read through `ref` sees the latest frame, not this one). */
export class FrameCollector extends RuntimeNode {
    public readonly frames: { ref: ITensor; shape: number[]; values: number[] }[] = [];

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                const t = session.consume(idx) as ITensor;
                this.frames.push({ ref: t, shape: [...t.shape], values: Array.from(t.data) });
            }
        }
    }
}
