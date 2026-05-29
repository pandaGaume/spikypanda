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
 * Stem / discrete-spectrum tile: shows N (frequency, amplitude) pairs as
 * vertical bars on a frequency axis. Reads as an "oracle" of what the
 * pipeline was commanded to inject, designed to sit next to the live
 * `Viz.Plot:spectrum` so the user can compare commanded peaks vs.
 * measured FFT magnitudes at a glance:
 *
 *     ideal (this tile)              FFT measurement (spectrum tile)
 *       │                               │
 *       ▌                               ▌
 *       ▌    ▌      ▌                   ▌    ╱╲      ╱╲
 *     ──┴────┴──────┴──             ────┴───╱──╲────╱──╲──
 *      50   120    200 Hz             50   120    200 Hz
 *
 * Topology — 4 fixed pairs by design:
 *   - The variadic-port reconciler in `spikypanda-nodeeditor` supports
 *     ONE prefix per side, not two. Paired `(f_i, A_i)` ports would
 *     need framework-level extension to handle two parallel variadic
 *     groups, which is out of scope for this V1.
 *   - 4 oscillators covers every MCSA / harmonics demo I've seen — N is
 *     trivially bumpable to 8 by extending the loop bounds, no
 *     framework change needed.
 *
 * Unused pairs (no wire on either f_i or A_i) are skipped silently,
 * so a 1-oscillator setup only draws one stem and the chart auto-fits
 * to it. No "bar of zero amplitude at frequency zero" artefacts.
 *
 * Inputs (8 ports, 4 pairs):
 *   f_0, A_0   first stem (frequency in Hz / linear amplitude)
 *   f_1, A_1   second stem
 *   f_2, A_2   third stem
 *   f_3, A_3   fourth stem
 *
 * Outputs: none. Pure sink, like the other plot tiles.
 *
 * The X axis uses the same sampleRate-driven Hz mapping as the spectrum
 * tile: when `session.simRate > 0` X is bounded to [0, Nyquist] for a
 * direct visual comparison with the FFT tile next to it. In free-run
 * mode the chart auto-fits X to max wired frequency + 10% headroom.
 */

const STEM_PAIRS = 4;

export class UplotStemNode extends RuntimeNode implements IDeclaresPorts, IRenderable {
    public readonly renderableType = "Viz.Plot:stem";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = _buildPairPorts();
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];

    // ── Latched values from the most recent fire() ─────────────────────
    // Indexed by pair number; nulls mark "no value received this tick".
    // Updated by fire(), consumed by repaint() to produce the bar chart.
    private _freqs: (number | null)[] = new Array(STEM_PAIRS).fill(null);
    private _amps:  (number | null)[] = new Array(STEM_PAIRS).fill(null);

    // Auto-sourced from session.simRate. Same model as the spectrum tile:
    // the runtime is the single source of truth for sample rate; the
    // axis follows.
    private _sampleRate: number = 0;

    // ── Editables ──────────────────────────────────────────────────────
    // Bar fill color — the only knob that doesn't have a sensible
    // auto-derived value. Everything else (Y range, X range) is driven
    // by the live data + sampleRate.
    @cloneable private _color: string = "#E8762D";

    @viewable("number") public get sampleRateHz(): number {
        return this._sampleRate;
    }
    @viewable("number") public get xAxisMaxHz(): number {
        return this._sampleRate > 0 ? this._sampleRate / 2 : 0;
    }
    /** Number of stems currently visible. Sanity-check in the panel:
     *  if this drops to 0 the user knows nothing is wired or the
     *  upstream oscillator amplitudes are all zero. */
    @viewable("number") public get visibleStems(): number {
        let n = 0;
        for (let i = 0; i < STEM_PAIRS; i++) {
            if (this._freqs[i] !== null && this._amps[i] !== null && this._amps[i]! > 0) n++;
        }
        return n;
    }

    // ── Render state ───────────────────────────────────────────────────
    private _uplot: uPlot | null = null;
    private _host: HTMLElement | null = null;
    private _lastWidth = 0;
    private _lastHeight = 0;
    private _rebuildOnNextFrame = false;
    /** Smoothed Y top, mirrors the spectrum tile's behaviour: snap up
     *  on a new larger peak, decay slowly on shrink. */
    private _yTop = 1;

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    // ── Runtime ────────────────────────────────────────────────────────

    public override reset(_session: ISession): void {
        this._freqs.fill(null);
        this._amps.fill(null);
        this._yTop = 1;
    }

    public override fire(session: ISession, _t: number): void {
        const sessionRate = session.simRate ?? 0;
        if (sessionRate !== this._sampleRate) {
            this._sampleRate = sessionRate;
            this._rebuildOnNextFrame = true;
        }

        // Walk every wired incoming link, parse its slot (f_<n> or
        // A_<n>), latch the value into the right slot of _freqs/_amps.
        // We DON'T null out untouched slots: latching is the right
        // model here, because the user may wire a static slider that
        // only publishes when its value changes — and we want the bar
        // to stay visible between those updates.
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
                if (Number.isFinite(i) && i >= 0 && i < STEM_PAIRS) this._freqs[i] = v;
            } else if (slot.indexOf("A_") === 0) {
                const i = Number(slot.slice(2));
                if (Number.isFinite(i) && i >= 0 && i < STEM_PAIRS) this._amps[i] = v;
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
        // Y axis: same asymmetric smoothing as the spectrum tile so a
        // newly-louder stem isn't clipped on the frame it appears but
        // the axis doesn't jitter on tiny per-frame noise. Headroom
        // 15% above the running peak.
        const peak = this._currentPeak();
        const target = peak > 0 ? peak * 1.15 : 1;
        if (target > this._yTop) {
            this._yTop = target;
        } else {
            this._yTop = this._yTop * 0.995 + target * 0.005;
        }
        this._uplot.setScale("y", { min: 0, max: this._yTop });

        // X axis: if simRate is known, pin to [0, Nyquist] so this tile
        // and the spectrum tile share the exact same X range and the
        // visual comparison is honest. Otherwise auto-fit to commanded
        // frequencies with a touch of right headroom.
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

    /** Build the uPlot data for the bar chart. We hand uPlot a SORTED
     *  list of stem x-positions plus a parallel y array; uPlot's bars
     *  path-builder draws one vertical bar per (x, y) sample. Sorting
     *  matters because uPlot assumes the x axis is monotonically
     *  increasing — feeding it 200 Hz before 50 Hz produces nothing. */
    private _data(): uPlot.AlignedData {
        const pairs: { f: number; a: number }[] = [];
        for (let i = 0; i < STEM_PAIRS; i++) {
            const f = this._freqs[i];
            const a = this._amps[i];
            if (f === null || a === null) continue;
            // Skip near-zero amplitudes — a zero-height bar at an
            // arbitrary frequency is visually noise.
            if (Math.abs(a) < 1e-9) continue;
            pairs.push({ f, a: Math.abs(a) });
        }
        pairs.sort((x, y) => x.f - y.f);
        const xs = pairs.map((p) => p.f);
        const ys = pairs.map((p) => p.a);
        // uPlot's bars path-builder requires at least 2 X points to
        // compute bar width. With 0 or 1 wired stems we pad with a
        // sentinel zero-amplitude entry at x=0 so the path-builder
        // doesn't NaN out. The bar at x=0 has y=0 and is invisible.
        if (xs.length < 2) {
            if (xs.length === 0) { xs.push(0); ys.push(0); }
            xs.unshift(0); ys.unshift(0);
        }
        return [xs, ys];
    }

    private _currentPeak(): number {
        let p = 0;
        for (let i = 0; i < STEM_PAIRS; i++) {
            const a = this._amps[i];
            if (a !== null && Math.abs(a) > p) p = Math.abs(a);
        }
        return p;
    }

    private _currentMaxFreq(): number {
        let m = 0;
        for (let i = 0; i < STEM_PAIRS; i++) {
            const f = this._freqs[i];
            if (f !== null && f > m) m = f;
        }
        return m;
    }

    private _buildOptions(): UplotOptions {
        // Use uPlot's built-in bars path-builder. `size: [width, max, min]`
        // — width is fraction of the available slot (0.05 = thin stems,
        // matching the discrete-spectrum look), max/min in pixels are
        // belt-and-braces clamps so a single-stem chart doesn't get a
        // huge fat bar.
        const bars = uPlot.paths?.bars?.({ size: [0.05, 24, 2] });
        const seriesOpts: uPlot.Series = {
            label: "amplitude",
            stroke: this._color,
            width: 1.5,
            fill: this._color,
            paths: bars,
            // Skip the line connecting bars (we want discrete stems,
            // not a stair-step continuous line).
            spanGaps: false,
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

/** Build the 8 input ports (4 f, 4 A) at module level so the array is
 *  a stable readonly reference shared by every UplotStemNode instance. */
function _buildPairPorts(): ReadonlyArray<IPortDescriptor> {
    const ports: IPortDescriptor[] = [];
    for (let i = 0; i < STEM_PAIRS; i++) {
        ports.push({ slot: `f_${i}`, optional: true, type: "float" });
        ports.push({ slot: `A_${i}`, optional: true, type: "float" });
    }
    return ports;
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createUplotStemNode(): UplotStemNode {
    return new UplotStemNode();
}
