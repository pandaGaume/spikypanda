// ═══════════════════════════════════════════════════════════════════════════
// AccelSource : RuntimeNode that emits one 3-axis accelerometer sample
// per fire() as an ITensor of shape [3] (channel-last: ax, ay, az).
//
// Firmware-side node: in production, this wraps the I2C/SPI driver feeding
// raw accel readings. In tests we pre-load a queue of fake samples and
// fire them one per tick.
// ═══════════════════════════════════════════════════════════════════════════

import { IChannel, ISession, ITensor, RuntimeNode } from "spikypanda-core";

export class AccelSource extends RuntimeNode {
    private readonly _samples: number[][];
    private readonly _channels: number;
    private _cursor: number = 0;

    /**
     * @param samples queue of samples to emit, one per fire(). All
     *                samples must share the same channel count (3 for
     *                raw [ax, ay, az] firmware feed, 4 for pre-
     *                formatted [ax, ay, az, |a|] when the firmware
     *                computes the magnitude itself and the NormKernel
     *                is bypassed downstream).
     */
    public constructor(samples: number[][]) {
        super();
        if (samples.length === 0) {
            this._channels = 0;
        } else {
            this._channels = samples[0].length;
            if (this._channels < 1) {
                throw new Error(`AccelSource: samples must have at least 1 channel (got ${this._channels})`);
            }
            for (const s of samples) {
                if (s.length !== this._channels) {
                    throw new Error(`AccelSource: heterogeneous sample lengths (${this._channels} vs ${s.length})`);
                }
            }
        }
        this._samples = samples;
    }

    /** Per-sample channel count (3 = raw accel, 4 = preformatted with magnitude). */
    public get channels(): number {
        return this._channels;
    }

    /** Total number of samples queued. */
    public get sampleCount(): number {
        return this._samples.length;
    }

    /** Whether the queue still has samples to emit. */
    public get hasNext(): boolean {
        return this._cursor < this._samples.length;
    }

    public override isReady(_s: ISession): boolean {
        return this.enabled && this.hasNext;
    }

    public override fire(session: ISession, _t: number): void {
        const s = this._samples[this._cursor++];
        const tensor: ITensor = {
            data: new Float32Array(s),
            shape: [this._channels],
            name: "accel",
        };
        const links = session.graph.links as ReadonlyArray<IChannel>;
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
        this._cursor = 0;
    }
}
