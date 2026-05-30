import uPlot, { Options as UplotOptions } from "uplot";
import "uplot/dist/uPlot.min.css";
import {
    cloneable, viewable,
    IChannel, IDeclaresPorts, IOlink, IPortDescriptor,
    ISession, RuntimeNode, inSlotOf,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import type { IRenderable } from "spikypanda-nodeeditor";

/**
 * Stem / discrete-spectrum tile: shows N (frequency, amplitude) pairs
 * as colored vertical bars on a frequency axis. Reads as an "oracle"
 * of what the pipeline was commanded to inject; sit it next to a live
 * `Viz.Plot:spectrum` to compare commanded peaks vs. measured FFT
 * magnitudes at a glance:
 *
 *     ideal (this tile)              FFT measurement (spectrum tile)
 *       │                               │
 *       ▌    ▌      ▌                   ▌    ╱╲      ╱╲
 *     ──┴────┴──────┴──             ────┴───╱──╲────╱──╲──
 *      50   120    200 Hz             50   120    200 Hz
 *      🟧    🟦      🟩                 (FFT measured magnitudes)
 *
 * Each oscillator gets its own COLOR from the palette below, picked
 * by stem index. Wire osc1's slider to (f_0, A_0), osc2's to (f_1, A_1),
 * etc. — visually clear which stem belongs to which source even when
 * peaks are close together.
 *
 * Topology — TRUE VARIADIC (multi-group):
 *   - The editor's variadic reconciler now supports multiple parallel
 *     groups on the same side. We declare two: prefix `f_` (frequency)
 *     and `A_` (amplitude). Each group auto-grows on connect, so the
 *     port count is unbounded — wire 1 oscillator, 1 stem; wire 10,
 *     10 stems.
 *   - Pairs missing one side (only f_2 wired, A_2 dangling) are
 *     silently skipped in fire(): no half-bars, no NaN artefacts.
 *
 * Outputs: none. Pure sink, like the other plot tiles.
 *
 * The X axis uses the same sampleRate-driven Hz mapping as the spectrum
 * tile: when `session.simRate > 0` X is bounded to [0, Nyquist] so the
 * comparison with the FFT tile is honest. In free-run mode the chart
 * auto-fits X to max wired frequency + 10% headroom.
 */

/**
 * Per-stem color palette. Chosen for distinguishability on the dark
 * dashboard background (no two adjacent indices share a hue family).
 * Wraps when stem count exceeds palette length — V1 ships 8 colors,
 * enough for any realistic MCSA / multi-tone scenario.
 */
const STEM_COLORS = [
    "#E8762D",  // orange (matches the existing spectrum tile)
    "#5BC0EB",  // cyan
    "#9BC53D",  // green
    "#FDE74C",  // yellow
    "#C3423F",  // red
    "#A06CD5",  // purple
    "#FF8FA3",  // pink
    "#7B9EA8",  // slate
];

export class UplotStemNode extends RuntimeNode implements IDeclaresPorts, IRenderable {
    public readonly renderableType = "Viz.Plot:stem";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "f_0", optional: true, type: "float" },
        { slot: "A_0", optional: true, type: "float" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];

    // ── Latched values from the most recent fire() ─────────────────────
    // Keyed on the integer stem index parsed from the slot suffix.
    // Latching (not nulling out untouched slots) is the right model
    // here: a static slider only publishes when its value changes, and
    // we want the bar to stay visible between those updates.
    private _freqs: Map<number, number> = new Map();
    private _amps:  Map<number, number> = new Map();

    private _sampleRate: number = 0;

    @viewable("number") public get sampleRateHz(): number {
        return this._sampleRate;
    }
    @viewable("number") public get xAxisMaxHz(): number {
        return this._sampleRate > 0 ? this._sampleRate / 2 : 0;
    }
    /** Number of stems currently rendered. Drops to 0 when no pair is
     *  fully wired (or amplitudes are all near zero); useful sanity
     *  check in the property panel. */
    @viewable("number") public get visibleStems(): number {
        let n = 0;
        for (const [idx, f] of this._freqs) {
            const a = this._amps.get(idx);
            if (typeof a === "number" && Math.abs(a) > 1e-9 && Number.isFinite(f)) n++;
        }
        return n;
    }

    // ── Render state ───────────────────────────────────────────────────
    private _uplot: uPlot | null = null;
    private _host: HTMLElement | null = null;
    private _lastWidth = 0;
    private _lastHeight = 0;
    private _rebuildOnNextFrame = false;
    /** Smoothed Y top — same model as the spectrum tile. */
    private _yTop = 1;
    /** Cached pixel-space draw list, recomputed each repaint(): one
     *  entry per visible stem with its x position in data space and
     *  its color. The custom paths function reads this to know what
     *  color to fill each bar. */
    private _drawPlan: { xData: number; color: string }[] = [];

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    // ── Runtime ────────────────────────────────────────────────────────

    public override reset(_session: ISession): void {
        this._freqs.clear();
        this._amps.clear();
        this._yTop = 1;
    }

    public override fire(session: ISession, _t: number): void {
        const sessionRate = session.simRate ?? 0;
        if (sessionRate !== this._sampleRate) {
            this._sampleRate = sessionRate;
            this._rebuildOnNextFrame = true;
        }

        // Walk every incoming link, parse its slot name (f_<n> or
        // A_<n>), latch into the matching Map slot.
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const v = session.consume(idx);
            if (typeof v !== "number" || !Number.isFinite(v)) continue;

            if (slot.indexOf("f_") === 0) {
                const i = Number(slot.slice(2));
                if (Number.isFinite(i) && i >= 0) this._freqs.set(i, v);
            } else if (slot.indexOf("A_") === 0) {
                const i = Number(slot.slice(2));
                if (Number.isFinite(i) && i >= 0) this._amps.set(i, v);
            }
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
        // Y top: same smoothing as the spectrum tile.
        const peak = this._currentPeak();
        const target = peak > 0 ? peak * 1.15 : 1;
        if (target > this._yTop) this._yTop = target;
        else this._yTop = this._yTop * 0.995 + target * 0.005;
        this._uplot.setScale("y", { min: 0, max: this._yTop });

        // X range: pin to Nyquist when we have a known sample rate so
        // this tile and the spectrum tile share the exact same X axis;
        // otherwise auto-fit with a touch of right headroom.
        if (this._sampleRate > 0) {
            this._uplot.setScale("x", { min: 0, max: this._sampleRate / 2 });
        } else {
            const xMax = this._currentMaxFreq();
            this._uplot.setScale("x", { min: 0, max: xMax > 0 ? xMax * 1.1 : 1 });
        }
    }

    public onResize(width: number, height: number): void {
        this._lastWidth = width;
        this._lastHeight = height;
        if (this._uplot) this._uplot.setSize({ width, height });
    }

    // ── Internals ──────────────────────────────────────────────────────

    /**
     * Build the uPlot data tuple AND refresh the draw plan that the
     * custom paths function will read. We sort pairs by frequency so
     * uPlot's monotonic-X invariant holds; the per-bar color is
     * indexed by the ORIGINAL stem index (not the sort order), so
     * "oscillator 0 = orange" stays stable even when oscillator 0's
     * frequency moves past oscillator 1's.
     */
    private _data(): uPlot.AlignedData {
        const pairs: { stemIdx: number; f: number; a: number }[] = [];
        for (const [stemIdx, f] of this._freqs) {
            const a = this._amps.get(stemIdx);
            if (typeof a !== "number" || !Number.isFinite(a)) continue;
            if (Math.abs(a) < 1e-9) continue;
            pairs.push({ stemIdx, f, a: Math.abs(a) });
        }
        pairs.sort((x, y) => x.f - y.f);
        const xs = pairs.map((p) => p.f);
        const ys = pairs.map((p) => p.a);
        this._drawPlan = pairs.map((p) => ({
            xData: p.f,
            color: STEM_COLORS[p.stemIdx % STEM_COLORS.length],
        }));

        // uPlot's bars path-builder needs ≥ 2 X samples to compute bar
        // width. With 0 or 1 stems we pad with a sentinel zero at x=0
        // so the chart still renders something sane. The padded entry
        // gets a transparent color so it's invisible.
        if (xs.length < 2) {
            if (xs.length === 0) { xs.push(0); ys.push(0); }
            xs.unshift(0); ys.unshift(0);
            this._drawPlan.unshift({ xData: 0, color: "transparent" });
        }
        return [xs, ys];
    }

    private _currentPeak(): number {
        let p = 0;
        for (const a of this._amps.values()) {
            if (typeof a === "number" && Math.abs(a) > p) p = Math.abs(a);
        }
        return p;
    }

    private _currentMaxFreq(): number {
        let m = 0;
        for (const f of this._freqs.values()) {
            if (typeof f === "number" && f > m) m = f;
        }
        return m;
    }

    private _buildOptions(): UplotOptions {
        // Per-bar coloring via a CUSTOM paths function. uPlot's built-
        // in `paths.bars` returns ONE fill per series — we'd need N
        // series for N colors, with all the bookkeeping (rebuild on
        // count change, NaN-padding for non-owned x positions). The
        // custom function below is simpler: iterate the data, draw a
        // colored rectangle per bar using the cached draw plan.
        const drawPlan = (): typeof this._drawPlan => this._drawPlan;

        const seriesOpts: uPlot.Series = {
            label: "amplitude",
            // Stroke / fill on the series spec are overridden by our
            // custom path painter, but uPlot still uses `stroke` for
            // the legend dot — set it to a neutral color rather than
            // any specific stem's color so the legend isn't misleading.
            stroke: "#8A8A9A",
            width: 0,
            paths: (u, _seriesIdx, idx0, idx1) => {
                const ctx = u.ctx;
                const plan = drawPlan();
                const xs = u.data[0];
                const ys = u.data[1] as ReadonlyArray<number | null>;
                const zero = u.valToPos(0, "y", true);
                // Bar half-width in pixels: 6 px on each side, capped
                // to half the smallest inter-bar distance so adjacent
                // stems don't overlap. Fallback to 4 px when there's
                // only one stem.
                let minDxPx = Infinity;
                for (let i = idx0 + 1; i <= idx1; i++) {
                    const dx = Math.abs(u.valToPos(xs[i] as number, "x", true) -
                                        u.valToPos(xs[i - 1] as number, "x", true));
                    if (dx > 0 && dx < minDxPx) minDxPx = dx;
                }
                const halfW = Math.max(2, Math.min(6, isFinite(minDxPx) ? minDxPx / 2 - 1 : 4));
                for (let i = idx0; i <= idx1; i++) {
                    const y = ys[i];
                    if (y == null || !Number.isFinite(y)) continue;
                    const xPx = u.valToPos(xs[i] as number, "x", true);
                    const yPx = u.valToPos(y as number, "y", true);
                    const color = (plan[i]?.color) ?? "#888";
                    if (color === "transparent") continue;
                    ctx.fillStyle = color;
                    ctx.fillRect(xPx - halfW, yPx, halfW * 2, zero - yPx);
                }
                // Return null: we've drawn directly, uPlot should not
                // also render its default stroke/fill on top.
                return null;
            },
        };

        const isHz = this._sampleRate > 0;
        const xFormat = (v: number | null | undefined): string => {
            if (v == null || !Number.isFinite(v)) return "";
            if (!isHz) return v >= 100 ? String(Math.round(v)) : v.toFixed(1);
            if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k";
            return v >= 100 ? String(Math.round(v)) : v.toFixed(1);
        };

        const opts: UplotOptions = {
            width: Math.max(this._lastWidth, 100),
            height: Math.max(this._lastHeight, 60),
            scales: {
                x: { time: false },
                y: { auto: false, range: [0, this._yTop] },
            },
            series: [
                { value: (_self, raw) => xFormat(raw as number | null) },
                seriesOpts,
            ],
            cursor: { show: false },
            axes: [
                {
                    stroke: "#8A8A9A",
                    grid: { stroke: "#3A3A48", width: 0.5 },
                    values: (_self, ticks) => (ticks as (number | null)[]).map(xFormat),
                    label: isHz ? "Hz" : "Hz (free mode → no Nyquist)",
                    labelSize: 14,
                    labelFont: "10px sans-serif",
                },
                { stroke: "#8A8A9A", grid: { stroke: "#3A3A48", width: 0.5 } },
            ],
        };
        return opts;
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createUplotStemNode(): UplotStemNode {
    return new UplotStemNode();
}
