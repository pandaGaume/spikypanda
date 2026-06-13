import { cloneable, editable, viewable, IChannel, IDeclaresPorts, IOlink, IPortDescriptor, ISession, RuntimeNode, inSlotOf } from "spikypanda-core";
import type { ICartesian, ITensor, Nullable, IHasSampleRateRequirement } from "spikypanda-core";

/**
 * Generic block-based data-acquisition (DAQ) front-end with its OWN
 * sampling clock, decoupled from the session tick rate.
 *
 * Acquisition contract (IEC 61430 / 61407 acquisition profile as
 * specified by the project owner: 10.24 kHz, 200 ms blocks, 2048
 * samples):
 *
 *   - fs = sample_rate_hz  (default 10240 Hz = 2.56 x Fmax with
 *     Fmax = 4 kHz, the classic condition-monitoring anti-alias
 *     margin: fs / 2.56 leaves the analyzer band clear of the AA
 *     filter roll-off);
 *   - N  = block_size      (default 2048 samples);
 *   - block duration = N / fs (default 0.2 s of SIM time);
 *   - spectral resolution of a downstream FFT over one block is
 *     fs / N (default 5 Hz).
 *
 * The node consumes one scalar token per session tick on `value`
 * (zero-order hold between tokens; 0 before the first one) and runs
 * a SIM-TIME sampling clock: the n-th sample is taken at
 * t0 + (n + 1) / fs where t0 is the sim time of the first fire after
 * reset. Whatever rate the session runs at, sample instants, block
 * geometry and block cadence are identical in sim time. When the
 * session ticks SLOWER than fs, several consecutive sampling instants
 * capture the same held value: this is the sub-Nyquist degenerate
 * mode (a staircase signal), documented rather than hidden, because
 * the block geometry downstream must stay invariant.
 *
 * Anti-alias stage: when `anti_alias` is on, a 1-pole low-pass
 * y += k * (v - y) advances once per TICK with
 * k = 1 - exp(-2 pi aa_cutoff_hz dtTick). A single pole is a stand-in
 * for the brick-wall ADC AA filter of a real acquisition card (-20
 * dB/decade instead of a sharp cutoff); it is enough to demonstrate
 * out-of-band rejection in simulation without a filter bank.
 *
 * When a block completes, the node publishes:
 *   - `block`: an ITensor { data: Float32Array COPY, shape: [N] }
 *     (downstream holds frames across ticks, same rationale as
 *     DSP.Stream:buffer);
 *   - `rms`: the scalar block RMS. Block RMS is the natural
 *     regime-gate feature: ripple and noise average out at block
 *     cadence, so a steady-state detector fed by it sees the load
 *     level, not the carrier.
 *
 * Both outputs declare capacity 4: after a large sim-time jump
 * (free-mode catch-up) a single fire can complete several blocks;
 * the burst queues on the channel until downstream drains it. A jump
 * larger than 4 block durations within one fire overflows by design;
 * raise the capacity if your runner free-wheels further than that.
 *
 * No per-sample allocation: the block buffer is preallocated
 * (Float32Array(block_size)) and reallocated only when block_size
 * changes; the hot path writes in place and copies once per block.
 *
 * Editables:
 *   sample_rate_hz  ADC sampling rate fs in Hz          (default 10240)
 *   block_size      samples per published block, >= 8   (default 2048)
 *   anti_alias      enable the 1-pole AA stage          (default true)
 *   aa_cutoff_hz    AA corner = Fmax = fs / 2.56        (default 4000)
 *   required_hz     IHasSampleRateRequirement mirror; computed =
 *                   sample_rate_hz unless the user pins a value
 *
 * Viewables:
 *   block_count       blocks emitted since reset
 *   block_duration_s  derived block_size / sample_rate_hz, read-only
 *   last_rms          RMS of the most recent block
 */
export class DaqNode extends RuntimeNode implements IDeclaresPorts, IHasSampleRateRequirement {
    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [{ slot: "value", optional: true, type: "float" }];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "block", optional: false, type: "tensor", capacity: 4 },
        { slot: "rms", optional: true, type: "float", capacity: 4 },
    ];

    // ── P8 sample-rate (boilerplate mirror of PmsmMotorDynamicNode) ──
    @cloneable private _requiredHzValue: number = 0;
    @cloneable private _requiredHzUserDefined: boolean = false;

    /** The DAQ asks the session for at least its own ADC rate: a
     *  slower tick would starve the sampling clock into the ZOH
     *  staircase mode. The enclosing aggregation takes the max across
     *  opt-in leaves anyway. Clamped [60, 1e6] like the motor nodes. */
    protected computeRequiredHz(): number {
        const hz = this._sampleRateHz;
        if (!Number.isFinite(hz) || hz <= 0) return 10240;
        return Math.max(60, Math.min(1e6, hz));
    }

    public get requiredHz(): number {
        if (this._requiredHzUserDefined && this._requiredHzValue > 0) {
            return this._requiredHzValue;
        }
        return this.computeRequiredHz();
    }

    @editable("number", { unit: "Hz" })
    public get required_hz(): number {
        return this.requiredHz;
    }
    public set required_hz(v: number) {
        if (!Number.isFinite(v) || v <= 0) {
            if (this._requiredHzUserDefined || this._requiredHzValue !== 0) {
                const prev = this.requiredHz;
                this._requiredHzUserDefined = false;
                this._requiredHzValue = 0;
                this.notifyPropertyChanged("required_hz", prev, this.requiredHz);
            }
            return;
        }
        const prev = this.requiredHz;
        if (this._requiredHzValue !== v || !this._requiredHzUserDefined) {
            this._requiredHzValue = v;
            this._requiredHzUserDefined = true;
            this.notifyPropertyChanged("required_hz", prev, v);
        }
    }

    @viewable("boolean") public get required_hz_user_defined(): boolean {
        return this._requiredHzUserDefined;
    }

    private _notifyRequiredHzMayHaveChanged(): void {
        if (this._requiredHzUserDefined && this._requiredHzValue > 0) return;
        this.notifyPropertyChanged("required_hz", null, this.requiredHz);
    }

    // ── Acquisition parameters ────────────────────────────────────────
    @cloneable private _sampleRateHz: number = 10240;
    @cloneable private _blockSize: number = 2048;
    @cloneable private _antiAlias: boolean = true;
    @cloneable private _aaCutoffHz: number = 4000;
    @cloneable private _blockCount: number = 0;

    // Runtime state. `_held` is the latest raw input (ZOH source, 0
    // before any token); `_filtered` is the AA output the sampler
    // reads; `_filterPrimed` seeds the pole on the first fire so the
    // filter does not relax from 0. `_clockArmed` is the sampling
    // clock: false until the first fire (or after a re-arm) fixes
    // `_t0`; `_n` counts samples taken since `_t0` so the n-th instant
    // is derived as t0 + (n + 1) / fs without cumulative drift.
    // `_fill` is the write head into the preallocated `_block`.
    private _block: Float32Array = new Float32Array(this._blockSize);
    private _fill: number = 0;
    private _held: number = 0;
    private _filtered: number = 0;
    private _filterPrimed: boolean = false;
    private _lastFireT: number | null = null;
    private _clockArmed: boolean = false;
    private _t0: number = 0;
    private _n: number = 0;
    private _lastRms: number = 0;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    @editable("number", { unit: "Hz" })
    public get sample_rate_hz(): number {
        return this._sampleRateHz;
    }
    public set sample_rate_hz(v: number) {
        // Clamp to >= 1 Hz: the sampling-instant math divides by fs.
        const next = Math.max(1, v);
        this.setField("sample_rate_hz", this._sampleRateHz, next, (n) => {
            this._sampleRateHz = n;
            // Re-arm the acquisition: sample instants derive from
            // t0 + (n + 1) / fs, so keeping the old (t0, n) pair under
            // a new fs would either freeze the clock or burst-replay
            // thousands of past instants in a single fire. The partial
            // block is dropped with it (mixed-rate blocks would lie
            // about their duration).
            this._clockArmed = false;
            this._n = 0;
            this._fill = 0;
        });
        this._notifyRequiredHzMayHaveChanged();
    }

    @editable("number", { unit: "samples" })
    public get block_size(): number {
        return this._blockSize;
    }
    public set block_size(v: number) {
        const next = Math.max(8, Math.floor(v));
        this.setField("block_size", this._blockSize, next, (n) => {
            this._blockSize = n;
            // Reallocate; drop any in-flight accumulation since the
            // old buffer no longer matches the new contract (same
            // discipline as DSP.Stream:buffer).
            this._block = new Float32Array(n);
            this._fill = 0;
        });
    }

    @editable("boolean")
    public get anti_alias(): boolean {
        return this._antiAlias;
    }
    public set anti_alias(v: boolean) {
        this.setField("anti_alias", this._antiAlias, v, (n) => {
            this._antiAlias = n;
        });
    }

    @editable("number", { unit: "Hz" })
    public get aa_cutoff_hz(): number {
        return this._aaCutoffHz;
    }
    public set aa_cutoff_hz(v: number) {
        // Strictly positive: cutoff 0 would freeze the pole forever.
        const next = Math.max(1e-6, v);
        this.setField("aa_cutoff_hz", this._aaCutoffHz, next, (n) => {
            this._aaCutoffHz = n;
        });
    }

    /** Number of blocks published since last reset(). */
    @viewable("number") public get block_count(): number {
        return this._blockCount;
    }

    /** Derived block duration in seconds of SIM time (read-only):
     *  block_size / sample_rate_hz, e.g. 2048 / 10240 = 0.2 s. */
    @viewable("number") public get block_duration_s(): number {
        return this._blockSize / this._sampleRateHz;
    }

    /** RMS of the most recent completed block. */
    @viewable("number") public get last_rms(): number {
        return this._lastRms;
    }

    public override reset(_session: ISession): void {
        this._block.fill(0);
        this._fill = 0;
        this._held = 0;
        this._filtered = 0;
        this._filterPrimed = false;
        this._lastFireT = null;
        this._clockArmed = false;
        this._t0 = 0;
        this._n = 0;
        this._lastRms = 0;
        this.setField("block_count", this._blockCount, 0, (n) => {
            this._blockCount = n;
        });
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;

        // 1. Consume the latest analog value queued on `value` this
        // tick (drain bursts, keep the last token). Default: hold the
        // previous value; before any input the line reads 0.
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            if (String(inSlotOf(link)) !== "value") continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            while (session.linkStates[idx].ready) {
                const v = session.consume(idx);
                if (typeof v === "number") this._held = v;
            }
        }

        // 2. Anti-alias stage, advanced once per TICK. The pole is
        // seeded with the first value seen (no relaxation transient
        // from 0); dtTick <= 0 (re-fired same tick, non-monotonic
        // clock) skips the advance to keep k well-defined.
        if (!this._filterPrimed) {
            this._filtered = this._held;
            this._filterPrimed = true;
        } else if (this._antiAlias) {
            const dtTick = this._lastFireT === null ? 0 : t - this._lastFireT;
            if (dtTick > 0) {
                const k = 1 - Math.exp(-2 * Math.PI * this._aaCutoffHz * dtTick);
                this._filtered += k * (this._held - this._filtered);
            }
        } else {
            this._filtered = this._held;
        }
        this._lastFireT = t;

        // 3. SIM-TIME sampling clock: arm t0 on the first fire, then
        // take every sampling instant tNext = t0 + (n + 1) / fs that
        // has elapsed by now. When the session ticks slower than fs,
        // consecutive instants capture the same held value (ZOH
        // staircase, the documented sub-Nyquist degenerate mode); a
        // large t jump completes several blocks within this one fire.
        if (!this._clockArmed) {
            this._t0 = t;
            this._n = 0;
            this._clockArmed = true;
        }
        const fs = this._sampleRateHz;
        while (this._t0 + (this._n + 1) / fs <= t) {
            this._block[this._fill++] = this._filtered;
            this._n++;
            if (this._fill >= this._blockSize) {
                this._emitBlock(session);
            }
        }
    }

    /** The block buffer is full: compute the block RMS, publish a
     *  COPY of the samples on `block` and the scalar RMS on `rms`,
     *  then rewind the write head for the next block. */
    private _emitBlock(session: ISession): void {
        const n = this._blockSize;
        let sumSq = 0;
        for (let i = 0; i < n; i++) {
            sumSq += this._block[i] * this._block[i];
        }
        const rms = Math.sqrt(sumSq / n);
        this._lastRms = rms;

        // Copy BEFORE rewinding: downstream holds frames across ticks
        // (uPlot tiles, FFT pipelines), so it gets an independent
        // Float32Array (same rationale as DSP.Stream:buffer).
        const tensor: ITensor = { data: new Float32Array(this._block), shape: [n] };

        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.onsc<IChannel>()) {
            if (!link.enabled) continue;
            const idx = links.indexOf(link);
            if (idx < 0) continue;
            if (link.slot === "block") {
                session.publish(idx, tensor);
            } else if (link.slot === "rms") {
                session.publish(idx, rms);
            }
        }
        this.setField("block_count", this._blockCount, this._blockCount + 1, (c) => {
            this._blockCount = c;
        });
        this._fill = 0;
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createDaqNode(): DaqNode {
    return new DaqNode();
}
