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
 * Real-time scrolling time-series plot, rendered with uPlot.
 *
 * Data flow:
 *   1. fire(t)  reads the wired `value` input (or 0 if unwired) and
 *               appends `(t, value)` to an internal ring buffer of
 *               at most `maxSamples` points. Fast: zero DOM access.
 *   2. repaint() is called by the Dashboard at ~60 fps. It hands the
 *               current buffer to uPlot via `setData`, which redraws
 *               the canvas. uPlot internally diffs and uses path
 *               batching; we never call setData more than once per frame.
 *
 * This split keeps the runtime hot path independent of the renderer,
 * which matters when the tile is hidden, the window is detached, or
 * the runtime is firing faster than the display refresh.
 *
 * Inputs:
 *   value  scalar to plot (float). Wire it to anything: motor omega,
 *          DSP feature output, sensor reading, etc.
 *
 * Editables:
 *   maxSamples   ring buffer cap (default 500). Higher = longer history,
 *                lower = less GC pressure at high frame rates.
 *   title        display label (default "value"). Shown in the legend.
 *   yAuto        when true, uPlot scales Y automatically; when false,
 *                clamp to [yMin, yMax].
 *   yMin / yMax  manual Y bounds when yAuto is false.
 */
export class UplotLineNode extends RuntimeNode implements IDeclaresPorts, IRenderable {
    /** IRenderable contract: matches the type id in plugin.activate. */
    public readonly renderableType = "Viz.Plot:line";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "value", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];

    // Ring buffer of (t, value) samples; xs[i] aligns with ys[i].
    private _xs: number[] = [];
    private _ys: number[] = [];

    // Render handle + host so repaint() can fast-path noop when
    // the tile is unmounted (between dashboard removeTile and
    // re-add cycles, or before the very first mount).
    private _uplot: uPlot | null = null;
    private _host: HTMLElement | null = null;
    // Tracks the size we last pushed to uPlot — repaint avoids a
    // setSize call on every frame.
    private _lastWidth = 0;
    private _lastHeight = 0;

    // ── Editables ──────────────────────────────────────────────────────
    @cloneable private _maxSamples: number = 500;
    @cloneable private _title:      string = "value";
    @cloneable private _yAuto:      boolean = true;
    @cloneable private _yMin:       number = -1;
    @cloneable private _yMax:       number = 1;
    // Maximum push rate into the ring buffer (Hz, in SIM time). At
    // audio / RF sim rates a 1:1 push hits the array-shift cost
    // (O(maxSamples) per fire) ~200 k times per wall second, freezing
    // the main thread. The default 1 kHz captures up to ~500 Hz of
    // visible content via Nyquist — enough for closed-loop control
    // diagnostics. Set to 0 to disable (full sim rate), e.g. when
    // visualising the PWM ripple directly at simRate=200 kHz.
    @cloneable private _maxPushHz: number = 1000;
    // Sim time of last accepted push. Compared against current `t` so
    // the throttle is reproducible across pause/resume and play-speed
    // changes (matches WatchNode's throttle semantics).
    private _lastPushT: number = -Infinity;

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number", { unit: "samples" })
    public get maxSamples(): number { return this._maxSamples; }
    public set maxSamples(v: number) {
        const next = Math.max(2, Math.floor(v));
        this.setField("maxSamples", this._maxSamples, next, (n) => {
            this._maxSamples = n;
            // Trim the existing buffer if the cap shrank.
            while (this._xs.length > n) { this._xs.shift(); this._ys.shift(); }
        });
    }

    @editable("string") public get title(): string { return this._title; }
    public set title(v: string) {
        this.setField("title", this._title, v, (n) => { this._title = n; });
    }

    @editable("boolean") public get yAuto(): boolean { return this._yAuto; }
    public set yAuto(v: boolean) {
        // Switching auto on/off requires recreating uPlot (the scale
        // mode can't be toggled live without a stale-range glitch).
        this.setField("yAuto", this._yAuto, v, (n) => {
            this._yAuto = n;
            this._rebuildOnNextFrame = true;
        });
    }

    @editable("number") public get yMin(): number { return this._yMin; }
    public set yMin(v: number) {
        // No rebuild on bound change: the scale.range is a closure over
        // `this`, so uPlot's next setData() reads the live value. We DO
        // still auto-flip yAuto off — typing into yMin means "pin the
        // range", and leaving auto on would silently override the user.
        this.setField("yMin", this._yMin, v, (n) => { this._yMin = n; });
        if (this._yAuto) this.yAuto = false;
    }

    @editable("number") public get yMax(): number { return this._yMax; }
    public set yMax(v: number) {
        this.setField("yMax", this._yMax, v, (n) => { this._yMax = n; });
        if (this._yAuto) this.yAuto = false;
    }

    @editable("number", { unit: "Hz", min: 0 })
    public get maxPushHz(): number { return this._maxPushHz; }
    public set maxPushHz(v: number) {
        // 0 disables the throttle. Negative is clamped to 0 (same as
        // disabled) so the field is forgiving on typo.
        const next = Number.isFinite(v) && v > 0 ? v : 0;
        this.setField("maxPushHz", this._maxPushHz, next, (n) => {
            this._maxPushHz = n;
        });
    }

    /** Mirror of the last received value for the property panel. */
    @viewable("number") public get lastValue(): number {
        return this._ys.length > 0 ? this._ys[this._ys.length - 1] : 0;
    }

    /** True when the next repaint should destroy + recreate uPlot to
     *  pick up an editable change that uPlot can't apply live (scale
     *  bounds, axis auto vs clamped). */
    private _rebuildOnNextFrame = false;

    // ── Runtime lifecycle ──────────────────────────────────────────────

    public override reset(_session: ISession): void {
        this._xs = [];
        this._ys = [];
        this._lastPushT = -Infinity;
    }

    public override fire(session: ISession, t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        let value: number | null = null;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            if (slot !== "value") continue;
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const v = session.consume(idx);
            if (typeof v === "number") value = v;
        }
        if (value === null) return; // nothing to plot this tick

        // Sim-time throttle. At simRate ≥ 100 kHz the per-tick array
        // shift below (O(maxSamples)) saturates the main thread when
        // run at full speed. 1 kHz default = 1 ms min between pushes,
        // so 500 samples cover 0.5 s of sim history. Set _maxPushHz=0
        // to disable (matches the pre-throttle behaviour).
        const rate = this._maxPushHz;
        if (rate > 0) {
            const minDt = 1 / rate;
            if (t - this._lastPushT < minDt) return;
        }
        this._lastPushT = t;

        this._xs.push(t);
        this._ys.push(value);
        if (this._xs.length > this._maxSamples) {
            this._xs.shift();
            this._ys.shift();
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
            this._uplot.setData(this._data());
        }
        // Force the Y scale every frame in clamped mode. uPlot's
        // declarative `scales.y.range` (closure or literal) can be
        // silently overridden by auto-fit on incoming data. `setScale`
        // is the imperative escape hatch — bypasses declarative range,
        // writes scale.min/max directly. Cheap (uPlot dedups internally)
        // and the only reliable way to keep a pinned range pinned.
        if (!this._yAuto) {
            this._uplot.setScale("y", { min: this._yMin, max: this._yMax });
        }
    }

    public onResize(width: number, height: number): void {
        this._lastWidth = width;
        this._lastHeight = height;
        if (this._uplot) this._uplot.setSize({ width, height });
    }

    // ── Internals ──────────────────────────────────────────────────────

    private _data(): uPlot.AlignedData {
        // uPlot expects parallel typed arrays; vanilla number[] is fine
        // for ring buffers under ~10k samples (which is well above our
        // V1 cap). We hand the live arrays — uPlot reads, doesn't write.
        return [this._xs, this._ys];
    }

    private _buildOptions(): UplotOptions {
        // Range closure: reads live yMin/yMax on every uPlot query, so
        // bound edits take effect on the next setData() with no rebuild.
        // Tuple form `range: [yMin, yMax]` is unreliable in uPlot 1.6
        // (initial-seed only — data past the bound re-enables autoscale).
        const yRange = (): [number, number] => [this._yMin, this._yMax];
        const opts: UplotOptions = {
            width: Math.max(this._lastWidth, 100),
            height: Math.max(this._lastHeight, 60),
            // X axis is Clock.t in SECONDS, not Unix epoch. Disable
            // uPlot's default time formatting (which would render the
            // first ticks as "1:00 AM 1:01 AM" — bin-as-epoch-seconds).
            scales: this._yAuto
                ? { x: { time: false } }
                : { x: { time: false }, y: { auto: false, range: yRange } },
            series: [
                {},  // x axis (time)
                {
                    label: this._title,
                    stroke: "#E8762D",
                    width: 1.5,
                },
            ],
            // No legend cursor crosshair by default — the tile is small.
            cursor: { show: false },
            axes: [
                { stroke: "#8A8A9A", grid: { stroke: "#3A3A48", width: 0.5 } },
                { stroke: "#8A8A9A", grid: { stroke: "#3A3A48", width: 0.5 } },
            ],
        };
        return opts;
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createUplotLineNode(): UplotLineNode {
    return new UplotLineNode();
}
