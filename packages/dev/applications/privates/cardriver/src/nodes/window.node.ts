// ═══════════════════════════════════════════════════════════════════════════
// WindowNode : RuntimeNode that maintains a sliding buffer of the last N
// samples and emits a (N, C) ITensor once the buffer is full.
//
// Stateful: holds an internal ring buffer of N×C floats. Every fire() it
// consumes one incoming sample (shape [C]) and slides the buffer. While
// the buffer is still warming up (fewer than N samples seen), it does not
// publish, so downstream Kernels stay un-armed for that tick.
//
// Firmware-side node: bridges the sample-rate domain (per-tick accel
// readings) with the inference-rate domain (one (N, C) tensor per tick
// once warmed up).
// ═══════════════════════════════════════════════════════════════════════════

import { IChannel, ISession, ITensor, RuntimeNode } from "spikypanda-core";

export class WindowNode extends RuntimeNode {
    private readonly _windowSize: number;
    private readonly _channels: number;
    private readonly _buffer: Float32Array;
    private _filled: number = 0;
    private _writeHead: number = 0;

    /**
     * @param windowSize number of consecutive samples to accumulate
     * @param channels   per-sample channel count (must match input ITensor shape)
     */
    public constructor(windowSize: number, channels: number) {
        super();
        this._windowSize = windowSize;
        this._channels = channels;
        this._buffer = new Float32Array(windowSize * channels);
    }

    public get windowSize(): number {
        return this._windowSize;
    }

    public get channels(): number {
        return this._channels;
    }

    /** Whether the window has accumulated `windowSize` samples. */
    public get isFull(): boolean {
        return this._filled >= this._windowSize;
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        const incoming = this.opsc<IChannel>();

        // Consume the single incoming sample (shape [C]).
        for (const link of incoming) {
            if (!link.enabled) {
                continue;
            }
            const idx = links.indexOf(link);
            if (idx < 0) {
                continue;
            }
            const sample = session.consume(idx) as ITensor | undefined;
            if (!sample) {
                continue;
            }
            if (sample.data.length !== this._channels) {
                throw new Error(`WindowNode: incoming sample length ${sample.data.length} does not match channels ${this._channels}`);
            }
            // Append to ring buffer.
            const off = this._writeHead * this._channels;
            for (let c = 0; c < this._channels; c++) {
                this._buffer[off + c] = sample.data[c];
            }
            this._writeHead = (this._writeHead + 1) % this._windowSize;
            if (this._filled < this._windowSize) {
                this._filled++;
            }
        }

        if (!this.isFull) {
            return;
        }

        // Emit the buffer in chronological order as a fresh tensor (shape
        // [T, C]). We re-linearise the ring so consumers see oldest-to-
        // newest along axis 0. Allocates per tick on purpose: the
        // pipeline is meant for an inference cadence (tens of Hz), not
        // the sample cadence.
        const out = new Float32Array(this._buffer.length);
        for (let i = 0; i < this._windowSize; i++) {
            const src = ((this._writeHead + i) % this._windowSize) * this._channels;
            const dst = i * this._channels;
            for (let c = 0; c < this._channels; c++) {
                out[dst + c] = this._buffer[src + c];
            }
        }
        const tensor: ITensor = {
            data: out,
            shape: [this._windowSize, this._channels],
            name: "window",
        };
        const outgoing = this.onsc<IChannel>();
        for (const link of outgoing) {
            if (!link.enabled) {
                continue;
            }
            const idx = links.indexOf(link);
            if (idx < 0) {
                continue;
            }
            session.publish(idx, tensor);
        }
    }

    public override reset(_s: ISession): void {
        this._filled = 0;
        this._writeHead = 0;
        this._buffer.fill(0);
    }
}
