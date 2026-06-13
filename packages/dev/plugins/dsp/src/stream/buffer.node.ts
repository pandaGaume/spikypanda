import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, ITensor, Nullable } from "spikypanda-core";

/** Structural guard for a rank-1 ITensor sample arriving on `value`. */
function isTensorSample(v: unknown): v is ITensor {
    if (!v || typeof v !== "object") return false;
    const t = v as Partial<ITensor>;
    return t.data instanceof Float32Array && Array.isArray(t.shape);
}

/**
 * Stream-to-tensor adapter: collects N consecutive samples and emits
 * them as a single tensor frame.
 *
 * Bridges the gap between scalar-stream nodes (Logic.Math:sin, Clock,
 * any per-tick float source) and tensor-consuming DSP ops (SpFrame,
 * SpFFT, SpWindow, ...). Without it, a Sin → SpFFT chain fails at the
 * port-type guard because Sin emits float and SpFFT expects tensor.
 *
 * Two input layouts, fixed by the FIRST sample after reset():
 *   - scalar samples (float)   → frames of shape [frameSize]
 *     (the historical behavior, unchanged).
 *   - rank-1 tensor samples [C] (e.g. from DSP.Stream:mux) → frames
 *     of shape [frameSize, C], row-major: row k is the k-th sample.
 * A later sample whose layout disagrees with the fixed one (scalar vs
 * tensor, or a different C) throws: silently coercing channel counts
 * would corrupt every downstream frame.
 *
 * Behavior:
 *   - Each `fire()` consumes one (or more) samples from `value` and
 *     pushes them into an internal Float32Array of `frameSize` rows.
 *   - When the buffer reaches `frameSize` rows, it publishes a
 *     SNAPSHOT (defensive copy) on `frame` and slides forward by
 *     `hopLength` rows, keeping the trailing (frameSize - hopLength)
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
    // "any": this node ingests scalar floats OR [C] tensor rows (mux
    // output); declaring "float" would flag tensor wires as invalid in
    // the editor even though both layouts are first-class here.
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "value", optional: true, type: "any" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "frame", optional: false, type: "tensor" }];

    @cloneable private _frameSize: number = 256;
    @cloneable private _hopLength: number = 256;
    @cloneable private _frameCount: number = 0;

    // Internal sliding buffer + write head. Reallocated when frameSize
    // or the channel count changes. `_count` tracks how many valid ROWS
    // currently sit between [0, _count); when it hits _frameSize we
    // emit and slide. `_channels` is 0 while the layout is undecided
    // (cold state, no sample seen since reset); the first sample fixes
    // it: 1 for scalar input, C for tensor [C] input. `_tensorInput`
    // disambiguates scalar (frames [frameSize]) from tensor C=1
    // (frames [frameSize, 1]).
    private _buffer: Float32Array = new Float32Array(this._frameSize);
    private _count: number = 0;
    private _channels: number = 0;
    private _tensorInput: boolean = false;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number", { unit: "samples" })
    public get frameSize(): number {
        return this._frameSize;
    }
    public set frameSize(v: number) {
        const next = Math.max(2, Math.floor(v));
        this.setField("frameSize", this._frameSize, next, (n) => {
            this._frameSize = n;
            // Reallocate; drop any in-flight accumulation since the old
            // buffer's size no longer matches the new contract. The
            // channel layout (if already fixed) is preserved.
            this._buffer = new Float32Array(n * Math.max(1, this._channels));
            this._count = 0;
        });
    }

    @editable("number", { unit: "samples" })
    public get hopLength(): number {
        return this._hopLength;
    }
    public set hopLength(v: number) {
        const next = Math.max(1, Math.floor(v));
        this.setField("hopLength", this._hopLength, next, (n) => {
            this._hopLength = n;
        });
    }

    /** Number of frames published since last reset(). Useful for the
     *  property panel to confirm the downstream pipeline is receiving. */
    @viewable("number") public get frameCount(): number {
        return this._frameCount;
    }

    /** Channel count fixed by the first sample after reset (0 while
     *  undecided, 1 for scalar input, C for tensor [C] input). */
    @viewable("number") public get channels(): number {
        return this._channels;
    }

    public override reset(_session: ISession): void {
        this._count = 0;
        this._channels = 0;
        this._tensorInput = false;
        this._buffer.fill(0);
        this.setField("frameCount", this._frameCount, 0, (n) => {
            this._frameCount = n;
        });
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // Pass 1: consume every queued sample on `value` this tick.
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
                if (typeof v === "number") {
                    this._appendScalar(v, session);
                } else if (isTensorSample(v)) {
                    this._appendTensor(v, session);
                }
            }
        }
    }

    /** Append one scalar sample (historical [frameSize] mode). */
    private _appendScalar(value: number, session: ISession): void {
        if (this._channels === 0) {
            this._fixLayout(1, false);
        } else if (this._tensorInput) {
            throw new Error("[ScalarBuffer] scalar sample received after the layout was fixed to tensor " + `[${this._channels}]; reset() before switching input layouts.`);
        }
        this._buffer[this._count++] = value;
        if (this._count >= this._frameSize) this._emitAndSlide(session);
    }

    /** Append one tensor [C] row ([frameSize, C] mode). */
    private _appendTensor(sample: ITensor, session: ISession): void {
        if (sample.shape.length !== 1) {
            throw new Error(`[ScalarBuffer] expects scalar or rank-1 tensor samples; got shape [${sample.shape.join(", ")}].`);
        }
        const c = sample.shape[0];
        if (!Number.isInteger(c) || c < 1 || sample.data.length < c) {
            throw new Error(`[ScalarBuffer] invalid tensor sample: shape [${c}] with ${sample.data.length} values.`);
        }
        if (this._channels === 0) {
            this._fixLayout(c, true);
        } else if (!this._tensorInput) {
            throw new Error("[ScalarBuffer] tensor sample received after the layout was fixed to scalar; " + "reset() before switching input layouts.");
        } else if (c !== this._channels) {
            throw new Error(`[ScalarBuffer] channel-count mismatch: layout fixed at [${this._channels}], got [${c}].`);
        }
        // Copy the row immediately: upstreams (DSP.Stream:mux) may
        // reuse their Float32Array across ticks.
        this._buffer.set(sample.data.subarray(0, c), this._count * c);
        this._count++;
        if (this._count >= this._frameSize) this._emitAndSlide(session);
    }

    /** Fix the layout from the first sample after reset, reallocating
     *  the row storage only when its size actually changes. */
    private _fixLayout(channels: number, tensorInput: boolean): void {
        this._channels = channels;
        this._tensorInput = tensorInput;
        const needed = this._frameSize * channels;
        if (this._buffer.length !== needed) {
            this._buffer = new Float32Array(needed);
        }
        this._count = 0;
    }

    /**
     * The buffer is full: snapshot a Float32Array of `frameSize`
     * rows, publish on `frame`, then slide left by `hopLength` rows.
     * The session reference is threaded through here (instead of
     * stashed on `this`) so the emit path remains explicit and
     * re-entrancy-safe.
     */
    private _emitAndSlide(session: ISession): void {
        const c = this._channels;

        // Snapshot BEFORE sliding: consumers may keep the reference
        // for a few ticks (uPlot tile etc.), so we hand them an
        // independent Float32Array they can read without races.
        const snapshot = new Float32Array(this._buffer);
        const shape = this._tensorInput ? [this._frameSize, c] : [this._frameSize];
        const tensor: ITensor = { data: snapshot, shape };

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

        // Slide left by hopLength rows: keep the trailing (frameSize -
        // hop) rows. When hop >= frameSize the buffer becomes empty
        // (clamped to frameSize so the result is a valid >=0 keep).
        const hop = Math.min(this._hopLength, this._frameSize);
        const keep = this._frameSize - hop;
        if (keep > 0) {
            this._buffer.copyWithin(0, hop * c, this._frameSize * c);
            // Clear the freed tail so partial frames aren't ambiguous
            // if frameSize is later reduced.
            for (let i = keep * c; i < this._frameSize * c; i++) this._buffer[i] = 0;
        }
        this._count = keep;
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createScalarBufferNode(): ScalarBufferNode {
    return new ScalarBufferNode();
}
