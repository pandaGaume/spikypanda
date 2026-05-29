import {
    cloneable, editable, viewable,
    IChannel, IDeclaresPorts, IOlink, IPortDescriptor,
    ISession, RuntimeNode, inSlotOf,
} from "spikypanda-core";
import type { ICartesian, ITensor, Nullable } from "spikypanda-core";

/**
 * Stream-to-tensor adapter: collects N consecutive scalar samples and
 * emits them as a single `{ data: Float32Array, shape: [N] }` tensor.
 *
 * Bridges the gap between scalar-stream nodes (Logic.Math:sin, Clock,
 * any per-tick float source) and tensor-consuming DSP ops (SpFrame,
 * SpFFT, SpWindow, ...). Without it, a Sin → SpFFT chain fails at the
 * port-type guard because Sin emits float and SpFFT expects tensor.
 *
 * Behavior:
 *   - Each `fire()` consumes one (or more) scalars from `value` and
 *     pushes them into an internal Float32Array of size `frameSize`.
 *   - When the buffer reaches `frameSize` samples, it publishes a
 *     SNAPSHOT (defensive copy) on `frame` and slides forward by
 *     `hopLength` samples, keeping the trailing (frameSize - hopLength)
 *     for the next emission (overlapping windows).
 *   - With `hopLength === frameSize` (default), frames are
 *     non-overlapping: emit one tensor per N samples accumulated.
 *
 * Editables:
 *   frameSize   number of samples per emitted tensor   (default 256)
 *   hopLength   slide between consecutive emissions    (default = frameSize)
 *
 * Outputs at rate `1 / hopLength` ticks. Downstream FFT pipelines should
 * size their nfft to the same frameSize as here for a clean STFT.
 */
export class ScalarBufferNode extends RuntimeNode implements IDeclaresPorts {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "value", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "frame", optional: false, type: "tensor" },
    ];

    @cloneable private _frameSize: number = 256;
    @cloneable private _hopLength: number = 256;
    @cloneable private _frameCount: number = 0;

    // Internal sliding buffer + write head. Reallocated when frameSize
    // changes. `_count` tracks how many valid samples currently sit
    // between [0, _count) — when it hits _frameSize we emit and slide.
    private _buffer: Float32Array = new Float32Array(this._frameSize);
    private _count: number = 0;

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number", { unit: "samples" })
    public get frameSize(): number { return this._frameSize; }
    public set frameSize(v: number) {
        const next = Math.max(2, Math.floor(v));
        this.setField("frameSize", this._frameSize, next, (n) => {
            this._frameSize = n;
            // Reallocate; drop any in-flight accumulation since the old
            // buffer's size no longer matches the new contract.
            this._buffer = new Float32Array(n);
            this._count = 0;
        });
    }

    @editable("number", { unit: "samples" })
    public get hopLength(): number { return this._hopLength; }
    public set hopLength(v: number) {
        const next = Math.max(1, Math.floor(v));
        this.setField("hopLength", this._hopLength, next, (n) => { this._hopLength = n; });
    }

    /** Number of frames published since last reset(). Useful for the
     *  property panel to confirm the downstream pipeline is receiving. */
    @viewable("number") public get frameCount(): number {
        return this._frameCount;
    }

    public override reset(_session: ISession): void {
        this._count = 0;
        this._buffer.fill(0);
        this.setField("frameCount", this._frameCount, 0, (n) => { this._frameCount = n; });
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Pass 1: consume every queued scalar on `value` this tick.
        // We accept burst (a high-capacity upstream can deliver more
        // than one token per tick); each one is appended and may trigger
        // a frame emit. Tracking emits as a count keeps fire() linear
        // in the number of samples ingested.
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (slot !== "value") continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                const v = session.consume(idx);
                if (typeof v !== "number") continue;
                this._appendOne(v, session);
            }
        }
    }

    /**
     * Append a single sample. When the buffer fills, snapshot a
     * Float32Array of length `frameSize`, publish via the supplied
     * session, then slide left by `hopLength`. The session reference
     * is threaded through here (instead of stashed on `this`) so the
     * emit path remains explicit and re-entrancy-safe.
     */
    private _appendOne(value: number, session: ISession): void {
        this._buffer[this._count++] = value;
        if (this._count < this._frameSize) return;

        // Snapshot BEFORE sliding — consumers may keep the reference
        // for a few ticks (uPlot tile etc.), so we hand them an
        // independent Float32Array they can read without races.
        const snapshot = new Float32Array(this._buffer);
        const tensor: ITensor = { data: snapshot, shape: [this._frameSize] };

        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (link.slot !== "frame" || !link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            session.publish(idx, tensor);
        }
        this.setField("frameCount", this._frameCount, this._frameCount + 1, (n) => {
            this._frameCount = n;
        });

        // Slide left by hopLength: keep the trailing (frameSize - hop)
        // samples. When hop >= frameSize the buffer becomes empty
        // (clamped to frameSize so the result is a valid >=0 keep).
        const hop = Math.min(this._hopLength, this._frameSize);
        const keep = this._frameSize - hop;
        if (keep > 0) {
            this._buffer.copyWithin(0, hop, this._frameSize);
            // Clear the freed tail so partial frames aren't ambiguous
            // if frameSize is later reduced.
            for (let i = keep; i < this._frameSize; i++) this._buffer[i] = 0;
        }
        this._count = keep;
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createScalarBufferNode(): ScalarBufferNode {
    return new ScalarBufferNode();
}
