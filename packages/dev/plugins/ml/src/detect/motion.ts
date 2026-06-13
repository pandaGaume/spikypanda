// ═══════════════════════════════════════════════════════════════════════════
// Per-element motion watching: freeze + jump signatures.
//
// Second detection channel next to the open-set clusterer: where the
// clusterer detects by POSITION (cosine distance to centroids), this
// library detects by MOVEMENT. An element that stops moving (freeze)
// or makes an abnormally large step (jump) is reported by index, so
// the alarm localizes the fault to a component of the vector.
//
// FROZEN REFERENCE (symmetric to the cluster's anchor philosophy): the
// first `warmup` vectors establish a per-element typical step scale
// s_e (median of |x_e[t] - x_e[t-1]|) and a baseline window path
// P_e = s_e * window. The reference NEVER updates afterward: it is a
// snapshot of the HEALTHY moving system, not a tracker, so a slow
// degradation cannot absorb itself into the baseline.
//
// PATH, NOT VELOCITY: the freeze test compares the rolling path length
// (sum of |delta| over the last `window` steps) to the baseline path.
// An oscillating element that doubles back keeps a large path even
// though its net displacement is near zero, so it must NOT read as
// frozen; only an element whose per-step motion actually collapses
// drains the path below freezeRatio * P_e. This is deliberate.
// ═══════════════════════════════════════════════════════════════════════════

export interface MotionWatchOptions {
    /** Vectors consumed before the reference freezes (min 8). */
    warmup?: number;
    /** Rolling path window, in steps (min 2). */
    window?: number;
    /** Freeze fires when the rolling path drops below freezeRatio * P_e.
     *  0 disables freeze detection entirely. */
    freezeRatio?: number;
    /** Jump fires when |delta_e| / s_e exceeds this. 0 disables jump
     *  detection entirely. */
    zJump?: number;
}

export interface IMotionEvent {
    kind: "jump" | "freeze";
    /** Index of the vector component that fired. */
    element: number;
    /** jump: z_e = |delta_e| / s_e. freeze: L_e / P_e (path ratio). */
    score: number;
}

export interface MotionResult {
    warmupDone: boolean;
    /** Empty on the (vast majority of) silent steps: the shared empty
     *  array is returned then, a per-element array is allocated only
     *  when at least one signature fired. */
    events: ReadonlyArray<IMotionEvent>;
}

/** Shared silent-step result payload: allocated once, never mutated. */
const NO_EVENTS: ReadonlyArray<IMotionEvent> = [];

/** Last-resort step scale for an element that never moved (or never
 *  produced a finite delta) during warmup: keeps z finite and makes
 *  any later motion of a warmup-dead element scream as a jump. */
const EPS_SCALE = 1e-12;

function medianOf(values: number[]): number {
    const n = values.length;
    if (n === 0) return NaN;
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = n >> 1;
    return n % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function meanOf(values: number[]): number {
    const n = values.length;
    if (n === 0) return NaN;
    let s = 0;
    for (const v of values) s += v;
    return s / n;
}

export class MotionWatch {
    // Mutable like OnlineClusterer's thresholds: freezeRatio and zJump
    // retune live; warmup and window are consumed during the warmup
    // phase (warmup as the call target, window when the reference
    // freezes), so changing them only takes full effect at the next
    // reset() (a re-baseline). A hosting node enforces that.
    public warmup: number;
    public window: number;
    public freezeRatio: number;
    public zJump: number;

    private _dim = -1;
    private _calls = 0;
    private _warmupDone = false;
    /** Window snapshot taken when the reference froze (ring sizing). */
    private _window = 0;

    // Previous finite sample per element. _prevValid tracks whether one
    // exists yet (a non-finite component leaves prev untouched, so the
    // next finite sample produces a delta spanning the gap).
    private _prev: Float64Array = new Float64Array(0);
    private _prevValid: Uint8Array = new Uint8Array(0);

    // Warmup accumulation only: released when the reference freezes.
    private _warmupDeltas: number[][] = [];

    // Frozen reference: per-element typical step and baseline path.
    private _scales: Float64Array = new Float64Array(0);
    private _paths: Float64Array = new Float64Array(0);

    // Post-warmup rolling path: one |delta| ring of `_window` entries
    // per element (flat, element-major), with a running sum so each
    // step costs O(1) per element. A skipped (non-finite) component
    // does not advance its ring.
    private _ring: Float64Array = new Float64Array(0);
    private _ringSum: Float64Array = new Float64Array(0);
    private _ringFill: Int32Array = new Int32Array(0);
    private _ringPos: Int32Array = new Int32Array(0);

    // Rising-edge latches: 1 = armed (may fire), 0 = fired and waiting
    // for the hysteresis re-arm condition. A disarmed freeze latch IS
    // the "currently frozen" state.
    private _jumpArmed: Uint8Array = new Uint8Array(0);
    private _freezeArmed: Uint8Array = new Uint8Array(0);

    public constructor(opts: MotionWatchOptions = {}) {
        this.warmup = Math.max(8, Math.floor(opts.warmup ?? 64));
        this.window = Math.max(2, Math.floor(opts.window ?? 16));
        this.freezeRatio = Math.max(0, opts.freezeRatio ?? 0.1);
        this.zJump = Math.max(0, opts.zJump ?? 6);
    }

    public get warmupDone(): boolean {
        return this._warmupDone;
    }

    /** Number of watched elements (0 before the first step). */
    public get elementCount(): number {
        return this._dim < 0 ? 0 : this._dim;
    }

    /** Copy of the frozen per-element step scales s_e (empty before the
     *  reference freezes). Diagnostics seam, never the live array. */
    public get stepScales(): Float64Array {
        return this._warmupDone ? this._scales.slice() : new Float64Array(0);
    }

    /** Elements NOT currently latched frozen (cheap liveness signal;
     *  during warmup every element counts as moving). */
    public get movingCount(): number {
        if (this._dim < 0) return 0;
        if (!this._warmupDone) return this._dim;
        let n = 0;
        for (let e = 0; e < this._dim; e++) {
            if (this._freezeArmed[e]) n++;
        }
        return n;
    }

    /** Erase everything, back to warmup (the element topology itself is
     *  re-learned from the next vector). */
    public reset(): void {
        this._dim = -1;
        this._calls = 0;
        this._warmupDone = false;
        this._window = 0;
        this._prev = new Float64Array(0);
        this._prevValid = new Uint8Array(0);
        this._warmupDeltas = [];
        this._scales = new Float64Array(0);
        this._paths = new Float64Array(0);
        this._ring = new Float64Array(0);
        this._ringSum = new Float64Array(0);
        this._ringFill = new Int32Array(0);
        this._ringPos = new Int32Array(0);
        this._jumpArmed = new Uint8Array(0);
        this._freezeArmed = new Uint8Array(0);
    }

    /**
     * Consume one vector. Elements are the vector components: the
     * caller decides what an element is (a physical channel from a mux
     * or a latent dimension from an encoder); the representation is
     * upstream's job, no basis is learned here.
     *
     * Fixed topology contract: the vector length is locked by the first
     * call after a reset; any later change throws.
     */
    public step(vector: ArrayLike<number>): MotionResult {
        const n = vector.length;
        if (this._dim < 0) {
            this._initTopology(n);
        } else if (n !== this._dim) {
            throw new Error(`MotionWatch: vector length changed from ${this._dim} to ${n}; the element topology is a fixed contract (reset() to re-baseline on the new shape)`);
        }
        this._calls++;
        if (!this._warmupDone) {
            this._stepWarmup(vector);
            return { warmupDone: this._warmupDone, events: NO_EVENTS };
        }
        return { warmupDone: true, events: this._stepWatch(vector) };
    }

    private _initTopology(dim: number): void {
        this._dim = dim;
        this._prev = new Float64Array(dim);
        this._prevValid = new Uint8Array(dim);
        this._warmupDeltas = Array.from({ length: dim }, () => [] as number[]);
    }

    /** Warmup phase: accumulate per-element |delta| (warmup calls yield
     *  warmup - 1 deltas per element), then freeze the reference. */
    private _stepWarmup(vector: ArrayLike<number>): void {
        for (let e = 0; e < this._dim; e++) {
            const x = vector[e];
            if (!isFinite(x)) continue;
            if (this._prevValid[e]) {
                this._warmupDeltas[e].push(Math.abs(x - this._prev[e]));
            }
            this._prev[e] = x;
            this._prevValid[e] = 1;
        }
        if (this._calls >= Math.max(8, Math.floor(this.warmup))) {
            this._freezeReference();
        }
    }

    /** Freeze the healthy baseline: s_e = median of the warmup |deltas|
     *  (mean fallback when the median is 0, global epsilon last), and
     *  P_e = s_e * window. NEVER updated afterward. */
    private _freezeReference(): void {
        const dim = this._dim;
        const w = Math.max(2, Math.floor(this.window));
        this._window = w;
        this._scales = new Float64Array(dim);
        this._paths = new Float64Array(dim);
        for (let e = 0; e < dim; e++) {
            const deltas = this._warmupDeltas[e];
            let s = medianOf(deltas);
            if (!(s > 0)) s = meanOf(deltas);
            if (!(s > 0)) s = EPS_SCALE;
            this._scales[e] = s;
            this._paths[e] = s * w;
        }
        this._warmupDeltas = []; // release the accumulation buffers
        this._ring = new Float64Array(dim * w);
        this._ringSum = new Float64Array(dim);
        this._ringFill = new Int32Array(dim);
        this._ringPos = new Int32Array(dim);
        this._jumpArmed = new Uint8Array(dim).fill(1);
        this._freezeArmed = new Uint8Array(dim).fill(1);
        this._warmupDone = true;
    }

    /** Post-warmup step: per element, the jump z-test on the raw delta
     *  and the freeze path-test on the rolling window. Both latched on
     *  the rising edge with hysteresis re-arm, so a persistent
     *  condition fires exactly once. */
    private _stepWatch(vector: ArrayLike<number>): ReadonlyArray<IMotionEvent> {
        let events: IMotionEvent[] | null = null;
        const w = this._window;
        for (let e = 0; e < this._dim; e++) {
            const x = vector[e];
            if (!isFinite(x)) continue; // skipped: no stats, no event, ring not advanced
            if (!this._prevValid[e]) {
                // Element was non-finite through the whole warmup: its
                // first finite sample only seeds prev (no delta exists).
                this._prev[e] = x;
                this._prevValid[e] = 1;
                continue;
            }
            const d = Math.abs(x - this._prev[e]);
            this._prev[e] = x;

            // JUMP: abnormal step against the frozen per-element scale.
            // Fire once on z > zJump, re-arm below zJump / 2.
            if (this.zJump > 0) {
                const z = d / this._scales[e];
                if (this._jumpArmed[e]) {
                    if (z > this.zJump) {
                        this._jumpArmed[e] = 0;
                        (events ?? (events = [])).push({ kind: "jump", element: e, score: z });
                    }
                } else if (z < this.zJump / 2) {
                    this._jumpArmed[e] = 1;
                }
            }

            // Rolling path ring: O(1) update via the running sum.
            const slot = e * w + this._ringPos[e];
            if (this._ringFill[e] >= w) {
                this._ringSum[e] -= this._ring[slot];
            } else {
                this._ringFill[e]++;
            }
            this._ring[slot] = d;
            this._ringSum[e] += d;
            this._ringPos[e] = (this._ringPos[e] + 1) % w;

            // FREEZE: path collapse, only once the post-warmup window
            // is full. Fire once on L < freezeRatio * P, re-arm above
            // 2 * freezeRatio * P.
            if (this.freezeRatio > 0 && this._ringFill[e] >= w) {
                const L = this._ringSum[e];
                const thr = this.freezeRatio * this._paths[e];
                if (this._freezeArmed[e]) {
                    if (L < thr) {
                        this._freezeArmed[e] = 0;
                        (events ?? (events = [])).push({ kind: "freeze", element: e, score: L / this._paths[e] });
                    }
                } else if (L > 2 * thr) {
                    this._freezeArmed[e] = 1;
                }
            }
        }
        return events ?? NO_EVENTS;
    }
}
