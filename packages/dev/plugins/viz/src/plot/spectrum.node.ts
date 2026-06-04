import uPlot, { Options as UplotOptions } from "uplot";
import "uplot/dist/uPlot.min.css";
import {
    cloneable, editable, viewable,
    IChannel, IDeclaresPorts, IOlink, IPortDescriptor,
    ISession, RuntimeNode, inSlotOf,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import type { IRenderable } from "spikypanda-nodeeditor";

/**
 * Static FFT magnitude spectrum, rendered with uPlot.
 *
 * Each `fire()` consumes a magnitude tensor on `magnitudes` and stores
 * the LATEST one as the displayed snapshot. `repaint()` then draws X =
 * frequency (or bin), Y = linear magnitude. No history is kept — every
 * frame fully replaces the chart, giving a live "scope" view of the
 * current spectrum.
 *
 * Display contract (matches every reference instrument: sound level
 * meters, MATLAB FFT plots, RF/audio spectrum analysers):
 *   - Linear mode: Y starts at zero, peak drives the top
 *     (framePeak × 1.15 with 15 % headroom).
 *   - dB mode: Y spans [peak_dB - dBRange, peak_dB + 5 dB]. The floor
 *     follows the peak so a fully quiet signal still shows tick marks
 *     instead of collapsing to a single line at −∞.
 *   - X axis is 0 to Nyquist in Hz when the session publishes a sample
 *     rate, otherwise plain bin index 0..N-1.
 *
 * dB conversion depends on what the upstream pipeline produces. Two
 * editables control this:
 *   - scaleType  "linear" | "dB"           — display mode
 *   - inputType  "magnitude" | "power"     — what the upstream sends
 *                                             (magnitude → 20·log10,
 *                                              power     → 10·log10)
 * Both default sensible: scaleType=linear, inputType=magnitude. With a
 * SpFFT in power mode upstream, flip inputType=power so the dB numbers
 * read as actual dB (not dB doubled).
 *
 * Linear is still the default because a fresh user wiring a Buffer →
 * FFT chain wants to see a peak rise above zero on the first frame, not
 * a flat band at −20 dB they have to interpret. Flip to dB when the DC
 * bin or initial transient drowns out the harmonic content (e.g. MCSA:
 * the carrier sidebands are 40+ dB below the carrier, invisible on a
 * linear scale).
 *
 * Complementary to:
 *   - Viz.Plot:line       — scrolling time-series of a scalar
 *   - Viz.Plot:waterfall  — scrolling 2D heatmap of spectra over time
 *   - Viz.Plot:spectrum   — single-frame freq-domain snapshot (this node)
 *
 * Use it to identify dominant peaks at a glance (MCSA: BPFO/BPFI bin
 * positions, motor harmonics, etc.). Pair with the Waterfall for
 * "current frame zoom-in" vs "time-evolution".
 *
 * Inputs:
 *   magnitudes  Float32Array | number[] of N positive magnitudes.
 *               Length defines the X axis range.
 *
 * Editables:
 *   fillStyle   "line" | "area" | "bars" — visual style.
 *
 * Viewables (diagnostics, read-only):
 *   framePeak       last frame's peak magnitude (sets the Y axis top)
 *   sampleRateHz    auto-sourced from session.simRate
 *   xAxisMaxHz      Nyquist = sampleRateHz / 2
 *   lastReceivedBins length of the incoming magnitudes vector
 */

type FillStyle = "line" | "area" | "bars";
type ScaleType = "linear" | "dB";
type InputType = "magnitude" | "power";

// Hard floor for log10 to avoid −Infinity on a zero bin. Picked low
// enough that any real spectrum bin stays above it; everything below
// reads as the dB floor on the display.
const LOG_EPS = 1e-12;

export class UplotSpectrumNode extends RuntimeNode implements IDeclaresPorts, IRenderable {
    public readonly renderableType = "Viz.Plot:spectrum";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "magnitudes", optional: true, type: "any" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];

    // Latest snapshot. Lazily allocated to match incoming length so we
    // don't need a maxBins editable; the chart auto-sizes to whatever
    // the FFT produces (typically nfft/2+1).
    private _xs: number[] = [];
    // Raw values fed by the upstream FFT (linear magnitude OR power,
    // user picks via inputType). _displayYs is what uPlot actually
    // renders — identical to _ys in linear mode, dB-converted in dB
    // mode. We keep both so a scale flip costs only a recompute, not
    // a re-fetch from upstream.
    private _ys: number[] = [];
    private _displayYs: number[] = [];
    private _bins = 0;
    // Running peak/floor of the most recent frame in DISPLAY units
    // (linear or dB depending on scaleType). Drives the Y axis range.
    private _framePeak = 0;
    private _frameFloor = 0;

    // ── Editables ──────────────────────────────────────────────────────
    @cloneable private _fillStyle:  FillStyle = "area";
    // Linear by default — a user wiring up a fresh Buffer → FFT chain
    // wants to see a peak above zero, not interpret negative dB on the
    // first frame. Flip to dB once the DC/transient dominates and you
    // need to see sidebands 40+ dB below the peak (MCSA, audio
    // analysis, RF).
    @cloneable private _scaleType: ScaleType = "linear";
    // Magnitude is the most common upstream (SpMagnitude after SpFFT).
    // Set to "power" when SpFFT is configured in power mode and feeds
    // straight into this tile — the dB conversion uses 10·log10 instead
    // of 20·log10 so the displayed numbers are real dB.
    @cloneable private _inputType: InputType = "magnitude";
    // Span of the dB Y axis below the peak (default 100 dB ≈ 5 decades
    // of magnitude). 80–120 dB is the conventional range for audio /
    // RF spectrum analysers; MCSA fault sidebands sit at −40 to −60 dB
    // below the fundamental so 100 dB shows them with headroom.
    @cloneable private _dBRange: number = 100;

    // Auto-sourced from session.simRate on every fire(). NOT an
    // editable: forcing the user to keep two numbers in sync invites
    // mismatched-axis bugs (peak at "25 Hz" when it should be 50). The
    // runtime is the single source of truth for the sample rate; the
    // tile follows.
    private _sampleRate: number = 0;

    @editable("string", { unit: "line | area | bars" })
    public get fillStyle(): FillStyle { return this._fillStyle; }
    public set fillStyle(v: FillStyle) {
        this.setField("fillStyle", this._fillStyle, v, (n) => { this._fillStyle = n; this._rebuildOnNextFrame = true; });
    }

    @editable("string", { unit: "linear | dB" })
    public get scaleType(): ScaleType { return this._scaleType; }
    public set scaleType(v: ScaleType) {
        const next: ScaleType = v === "dB" ? "dB" : "linear";
        this.setField("scaleType", this._scaleType, next, (n) => {
            this._scaleType = n;
            // Re-derive _displayYs from the latest _ys immediately so
            // the next repaint() reflects the new scale even if no new
            // FFT frame arrives between now and then (paused runner,
            // slow upstream, etc.).
            this._recomputeDisplay();
            // Hard-reset _yTop because the old value was in the OTHER
            // scale's units. e.g. flipping linear→dB carries a stale
            // _yTop=6000 (linear) into the dB Y axis, which would clamp
            // the range to [5900, 6005] dB — empty band. Seeding with
            // framePeak puts the axis right where it belongs on the
            // very next paint, no decay needed.
            this._yTop = this._framePeak;
            // Force a uPlot rebuild: axis label changes (Hz vs Hz/dB)
            // and the Y scale bounds switch from [0, peak·1.15] to
            // [peak_dB - dBRange, peak_dB + 5], which the declarative
            // scales config doesn't update on a setData() alone.
            this._rebuildOnNextFrame = true;
        });
    }

    @editable("string", { unit: "magnitude | power" })
    public get inputType(): InputType { return this._inputType; }
    public set inputType(v: InputType) {
        const next: InputType = v === "power" ? "power" : "magnitude";
        this.setField("inputType", this._inputType, next, (n) => {
            this._inputType = n;
            this._recomputeDisplay();
            // Y range numbers shift by a factor of 2 in dB mode
            // (10·log10 vs 20·log10); rebuild so the axis ticks are
            // recomputed from the new bounds rather than carrying the
            // old scale internally.
            if (this._scaleType === "dB") this._rebuildOnNextFrame = true;
        });
    }

    @editable("number", { unit: "dB" })
    public get dBRange(): number { return this._dBRange; }
    public set dBRange(v: number) {
        const next = Math.max(20, Math.min(200, Math.floor(v)));
        this.setField("dBRange", this._dBRange, next, (n) => {
            this._dBRange = n;
            if (this._scaleType === "dB") this._rebuildOnNextFrame = true;
        });
    }

    /**
     * Diagnostic: the simulation sample rate the tile currently sees
     * (auto-sourced from `session.simRate` each fire()). 0 means the
     * runtime is in free-running mode (no deterministic rate) and the
     * X axis falls back to bin indices.
     */
    @viewable("number") public get sampleRateHz(): number {
        return this._sampleRate;
    }

    /**
     * Diagnostic: the actual upper bound of the X axis in Hz, which is
     * Nyquist = sampleRate / 2. Exposed so the user can confirm the
     * displayed frequency range matches their pipeline at a glance.
     */
    @viewable("number") public get xAxisMaxHz(): number {
        return this._sampleRate > 0 ? this._sampleRate / 2 : 0;
    }

    /** Read-only mirror of the last frame's peak magnitude. Useful for
     *  choosing a sensible manual `yMax` value: "set yMax to ~1.2 ×
     *  this and the chart pins, with a bit of headroom". */
    @viewable("number") public get framePeak(): number {
        return this._framePeak;
    }

    /** Viewable mirror — last spectrum length, for matching against
     *  numBins on the upstream FFT. Useful when wiring "I expect 257
     *  bins but the source sends 256, off by one". */
    @viewable("number") public get lastReceivedBins(): number {
        return this._bins;
    }

    // ── Rendering state ────────────────────────────────────────────────
    private _uplot: uPlot | null = null;
    private _host: HTMLElement | null = null;
    private _lastWidth = 0;
    private _lastHeight = 0;
    private _rebuildOnNextFrame = false;

    /**
     * Smoothed Y axis top. Tracks `framePeak * 1.15` but is asymmetric:
     *   - grows INSTANTLY (so a new larger peak isn't clipped on the
     *     very frame it appears);
     *   - shrinks SLOWLY (so the axis doesn't jitter on frame-to-frame
     *     peak variation — a stationary tone still shows tiny ripple
     *     in the FFT magnitude due to windowing leakage).
     * Decay rate 0.995/frame → roughly a 1.2 s time constant at 60 fps.
     */
    private _yTop = 1;

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    // ── Runtime lifecycle ──────────────────────────────────────────────

    public override reset(_session: ISession): void {
        this._xs = [];
        this._ys = [];
        this._displayYs = [];
        this._bins = 0;
        this._framePeak = 0;
        this._frameFloor = 0;
        this._yTop = 1;
    }

    public override fire(session: ISession, _t: number): void {
        // Auto-source the sample rate from the session each tick. When
        // the runner switches between free-running and fixed-realtime,
        // or the user changes simRate mid-play, the X axis re-derives
        // on the very next frame — no manual sync needed.
        const sessionRate = session.simRate ?? 0;
        if (sessionRate !== this._sampleRate) {
            this._sampleRate = sessionRate;
            if (this._bins > 0) this._populateXs();
            this._rebuildOnNextFrame = true;
        }

        const links = session.graph.links as ReadonlyArray<IChannel>;
        let frame: ArrayLike<number> | null = null;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (slot !== "magnitudes") continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const v = session.consume(idx);
            frame = _coerceMagnitudes(v);
        }
        if (!frame) return;

        const n = frame.length;
        // Reallocate xs only when bin count changes; ys is recopied
        // every frame regardless.
        if (n !== this._bins) {
            this._bins = n;
            this._xs = new Array(n);
            this._populateXs();
            this._ys = new Array(n);
            this._displayYs = new Array(n);
            this._rebuildOnNextFrame = true;
        }

        // Linear values, taken as |X[k]| defensively in case the
        // upstream produces a signed Re(X) rather than a true magnitude.
        // For a SpMagnitude / SpFFT power output this is a no-op. The
        // raw linear values are cached on _ys so a scaleType / inputType
        // flip can recompute the display without waiting for the next
        // upstream frame.
        for (let i = 0; i < n; ++i) this._ys[i] = Math.abs(frame[i]);
        this._recomputeDisplay();
    }

    /**
     * Repopulate `_displayYs` from `_ys` using the current scaleType
     * and inputType. Tracks the frame's peak/floor in display units so
     * the Y axis range in `repaint()` can pin to those bounds without
     * scanning the array twice. Cheap — single pass, used both on
     * fresh data (fire) and on a scale toggle (no new data needed).
     */
    private _recomputeDisplay(): void {
        const n = this._ys.length;
        if (this._displayYs.length !== n) this._displayYs = new Array(n);
        let peak = -Infinity;
        let floor = +Infinity;
        if (this._scaleType === "linear") {
            for (let i = 0; i < n; ++i) {
                const v = this._ys[i];
                this._displayYs[i] = v;
                if (v > peak) peak = v;
                if (v < floor) floor = v;
            }
        } else {
            // dB. Magnitude → 20·log10, power → 10·log10. Floored at
            // LOG_EPS to avoid −Infinity on a zero bin (clean Y axis,
            // uPlot doesn't choke on a degenerate point).
            const k = this._inputType === "power" ? 10 : 20;
            for (let i = 0; i < n; ++i) {
                const v = Math.max(this._ys[i], LOG_EPS);
                const dB = k * Math.log10(v);
                this._displayYs[i] = dB;
                if (dB > peak) peak = dB;
                if (dB < floor) floor = dB;
            }
        }
        // Empty input → keep last-known values rather than poisoning
        // the axis with ±Infinity sentinels (would surface as NaN in
        // uPlot's scale and freeze the canvas).
        if (n > 0) {
            this._framePeak = peak;
            this._frameFloor = floor;
        }
    }

    /**
     * Fill `_xs` based on current sampleRate + bin count:
     *   sampleRate > 0 → X is frequency in Hz, 0 to Nyquist = sampleRate/2
     *                    The bin spacing is sampleRate / nfft where
     *                    nfft = 2·(N-1) for a real half-spectrum.
     *   sampleRate = 0 → X is plain bin index 0..N-1 (legacy default).
     */
    private _populateXs(): void {
        const n = this._bins;
        if (this._sampleRate > 0 && n > 1) {
            // Bin spacing: sampleRate / nfft with nfft = 2·(N-1).
            // Equivalently: nyquist / (N-1).
            const nyquist = this._sampleRate / 2;
            const step = nyquist / (n - 1);
            for (let i = 0; i < n; ++i) this._xs[i] = i * step;
        } else {
            for (let i = 0; i < n; ++i) this._xs[i] = i;
        }
    }

    // ── IRenderable ────────────────────────────────────────────────────

    public mountInto(host: HTMLElement): void {
        this._host = host;
        this._lastWidth  = host.clientWidth;
        this._lastHeight = host.clientHeight;
        this._uplot = new uPlot(this._buildOptions(), this._data(), host);
    }

    public unmountFrom(_host: HTMLElement): void {
        this._uplot?.destroy();
        this._uplot = null;
        this._host = null;
    }

    public repaint(): void {
        if (!this._uplot || !this._host) return;
        if (this._rebuildOnNextFrame) {
            this._uplot.destroy();
            this._uplot = new uPlot(this._buildOptions(), this._data(), this._host);
            this._rebuildOnNextFrame = false;
        } else {
            // Default setData(data) = setData(data, true). The `true`
            // is what actually triggers uPlot's commit() (redraw) — the
            // `false` path SKIPS commit entirely, so the canvas stays
            // stale even though the internal data array got replaced.
            // The autoscale that happens inside the resetScales=true
            // branch is harmless: our setScale() call right after
            // overrides the Y bounds before the next paint.
            this._uplot.setData(this._data());
        }
        // Pin the Y axis EVERY frame. uPlot's declarative scales.range
        // is not reliably re-evaluated after each setData() in 1.6.x,
        // so setScale is the imperative escape hatch — writes
        // scale.min/max directly, deduped internally.
        //
        // Asymmetric smoothing on the top so the axis is stable:
        //   - target = framePeak ·1.15 (linear) or framePeak + 5 (dB)
        //   - if target > _yTop : snap up INSTANTLY. A new larger peak
        //     must never be clipped on the frame it appears.
        //   - else              : decay slowly toward target (0.5% per
        //     frame, ~1 s time constant at 60 fps). A stationary tone
        //     has tiny frame-to-frame ripple from FFT windowing leakage
        //     — without smoothing, the axis would jitter visibly.
        let yMin: number, yMax: number;
        if (this._scaleType === "dB") {
            // dB mode: top trails framePeak + 5 dB headroom, bottom
            // sits dBRange below the top. This means a quiet signal
            // (peak = −20 dB) still shows a populated Y axis without
            // collapsing to a single line at the floor.
            const target = this._framePeak + 5;
            if (target > this._yTop) this._yTop = target;
            else this._yTop = this._yTop * 0.995 + target * 0.005;
            yMin = this._yTop - this._dBRange;
            yMax = this._yTop;
        } else {
            // Linear mode: bottom always 0, top trails framePeak ·1.15.
            const target = this._framePeak > 0 ? this._framePeak * 1.15 : 1;
            if (target > this._yTop) this._yTop = target;
            else this._yTop = this._yTop * 0.995 + target * 0.005;
            yMin = 0;
            yMax = this._yTop;
        }
        this._uplot.setScale("y", { min: yMin, max: yMax });
    }

    public onResize(width: number, height: number): void {
        this._lastWidth = width;
        this._lastHeight = height;
        if (this._uplot) this._uplot.setSize({ width, height });
    }

    // ── Internals ──────────────────────────────────────────────────────

    private _data(): uPlot.AlignedData {
        return [this._xs, this._displayYs];
    }

    private _buildOptions(): UplotOptions {
        const style = this._fillStyle;
        // Series rendering style:
        //   line  — plain stroke, no fill (cheapest)
        //   area  — stroke + fill below (standard spectrum look)
        //   bars  — uPlot's paths.bars renders a true bar chart
        //           (one rectangle per bin, requires plugin import)
        const seriesOpts: uPlot.Series = {
            label: "magnitude",
            stroke: "#E8762D",
            width: 1.5,
        };
        if (style === "area") {
            seriesOpts.fill = "rgba(232, 118, 45, 0.25)";
        } else if (style === "bars") {
            // uPlot ships a bars path-builder under uPlot.paths.bars; the
            // type signature requires we pass the builder via series.paths.
            const bars = uPlot.paths?.bars?.({ size: [0.9, 100, 1] });
            if (bars) seriesOpts.paths = bars;
            seriesOpts.fill = "rgba(232, 118, 45, 0.6)";
        }
        // X axis: bin indices when sampleRate=0, Hz when sampleRate>0.
        // Either way, disable uPlot's default time-mode formatter
        // (which would format the values as Unix-epoch seconds).
        const isHz = this._sampleRate > 0;
        const xFormat = (v: number | null | undefined): string => {
            // uPlot's axis tick generation can hand us `null` (empty
            // data, no ticks computed yet) or `NaN` (degenerate scale).
            // Guarding here keeps the canvas alive instead of crashing
            // the whole dashboard rAF loop on every paint.
            if (v == null || !Number.isFinite(v)) return "";
            if (!isHz) return String(Math.round(v));
            // Hz: compact-format kHz / Hz with one decimal max for legibility.
            if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k";
            return v >= 100 ? String(Math.round(v)) : v.toFixed(1);
        };

        // Seed the initial Y range so the first paint after a rebuild
        // doesn't briefly flash a stale or zero band before repaint()
        // pins the scale. Numbers match the per-frame pinning logic.
        const isDb = this._scaleType === "dB";
        const yInit: [number, number] = isDb
            ? [this._yTop - this._dBRange, this._yTop]
            : [0, this._yTop];
        const yLabel = isDb
            ? this._inputType === "power" ? "dB (power)" : "dB"
            : "magnitude";

        const opts: UplotOptions = {
            width: Math.max(this._lastWidth, 100),
            height: Math.max(this._lastHeight, 60),
            // Y axis: linear → [0, top]; dB → [top - dBRange, top]. The
            // imperative setScale() in repaint() drives the actual per-
            // frame range; this initial config just avoids a one-frame
            // flash of the default uPlot scale after a rebuild (scale
            // toggle, fillStyle change, simRate change, …).
            scales: {
                x: { time: false },
                y: { auto: false, range: yInit },
            },
            series: [
                {
                    // X axis spec: cursor readout uses the same formatter.
                    value: (_self, rawValue) => xFormat(rawValue as number | null),
                },
                seriesOpts,
            ],
            cursor: { show: false },
            axes: [
                {
                    stroke: "#8A8A9A",
                    grid: { stroke: "#3A3A48", width: 0.5 },
                    // ticks can contain null entries when uPlot's scale
                    // has not converged yet; xFormat handles that.
                    values: (_self, ticks) => (ticks as (number | null)[]).map(xFormat),
                    // Header label below the axis, e.g. "Hz" or "bin".
                    label: isHz ? "Hz" : "bin",
                    labelSize: 14,
                    labelFont: "10px sans-serif",
                },
                {
                    stroke: "#8A8A9A",
                    grid: { stroke: "#3A3A48", width: 0.5 },
                    label: yLabel,
                    labelSize: 14,
                    labelFont: "10px sans-serif",
                },
            ],
        };
        return opts;
    }
}

// ─────────────────────────────────────────────────────────────────────
// Shared coercion: same as waterfall.node.ts. Centralised in a future
// _shared.ts when a third tile type re-uses it.
// ─────────────────────────────────────────────────────────────────────

function _coerceMagnitudes(v: unknown): ArrayLike<number> | null {
    if (v == null) return null;
    if (ArrayBuffer.isView(v) && !(v instanceof DataView)) {
        return v as unknown as ArrayLike<number>;
    }
    if (Array.isArray(v)) return v;
    if (typeof v === "object") {
        const o = v as { data?: unknown };
        if (o.data && ArrayBuffer.isView(o.data) && !(o.data instanceof DataView)) {
            return o.data as unknown as ArrayLike<number>;
        }
        if (Array.isArray(o.data)) return o.data;
    }
    return null;
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createUplotSpectrumNode(): UplotSpectrumNode {
    return new UplotSpectrumNode();
}
