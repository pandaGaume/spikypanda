import uPlot, { Options as UplotOptions } from "uplot";
import "uplot/dist/uPlot.min.css";
import { cloneable, editable, IChannel, IDeclaresPorts, inSlotOf, IOlink, IPortDescriptor, ISession, RuntimeNode, viewable } from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import type { IRenderable } from "spikypanda-nodeeditor";

/**
 * Generic XY tile: an explicit X vector against up to three Y vectors,
 * rendered with uPlot.
 *
 * Why it exists next to `Viz.Plot:spectrum`: that tile's X axis is
 * frequency in Hz, derived from the session's sample rate, and it takes
 * magnitudes alone. A curve whose X axis is a physical quantity the
 * pipeline computes (wavelength in nanometres, angle, position, voltage
 * sweep) has nowhere to go. This tile takes the axis as DATA, which also
 * means the caller owns the units.
 *
 * Three Y inputs rather than one, because comparing curves on a shared
 * axis is the usual reason to want this tile: a LIBS chain wires the
 * ideal, the instrumented and the measured spectrum into the same frame
 * and reads the instrument's effect off the overlay.
 *
 * Decimation: a spectrometer frame is a few thousand points, and a
 * narrow line can be one or two of them. Stride-based decimation would
 * make such a line blink or vanish. This tile buckets the data and keeps
 * each bucket's PEAK with its own X, so a narrow line survives at any
 * zoom level. The source vectors are never modified: decimation happens
 * on the way to the canvas.
 *
 * Inputs:
 *   x    Float64Array | Float32Array | number[], the shared axis.
 *   y_1  first curve. y_2, y_3 optional.
 *
 * A Y vector shorter or longer than X is drawn over the common length,
 * because a half-published frame should not blank the tile.
 */

type Vector = Float64Array | Float32Array | ReadonlyArray<number>;

const MAX_SERIES = 3;
const SERIES_COLORS = ["#E8762D", "#4DA3FF", "#6ECF68"];

function asVector(v: unknown): Vector | null {
    if (v instanceof Float64Array || v instanceof Float32Array) return v;
    if (Array.isArray(v) && v.every((n) => typeof n === "number")) return v as ReadonlyArray<number>;
    return null;
}

export class UplotXyNode extends RuntimeNode implements IDeclaresPorts, IRenderable {
    /** IRenderable contract: matches the type id in plugin.activate. */
    public readonly renderableType = "Viz.Plot:xy";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "x", optional: true, type: "any" },
        { slot: "y_1", optional: true, type: "any" },
        { slot: "y_2", optional: true, type: "any" },
        { slot: "y_3", optional: true, type: "any" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];

    @cloneable private _title: string = "xy";
    @cloneable private _xLabel: string = "x";
    @cloneable private _yLabel: string = "y";
    /** Visual decimation target. 0 disables it. */
    @cloneable private _maxPoints: number = 2000;
    /** Legend names, comma separated, in port order. */
    @cloneable private _seriesNames: string = "y1, y2, y3";

    private _x: Vector | null = null;
    private _ys: Array<Vector | null> = [null, null, null];

    private _uplot: uPlot | null = null;
    private _host: HTMLElement | null = null;
    private _lastWidth = 0;
    private _lastHeight = 0;
    private _rebuildOnNextFrame = false;

    public constructor(onsc: Nullable<IOlink[]> = null, opsc: Nullable<IOlink[]> = null, position?: ICartesian) {
        super(onsc, opsc, position);
    }

    // ── Editables ────────────────────────────────────────────────────

    @editable("string") public get title(): string {
        return this._title;
    }
    public set title(v: string) {
        this.setField("title", this._title, v, (n) => {
            this._title = n;
            this._rebuildOnNextFrame = true;
        });
    }

    @editable("string") public get x_label(): string {
        return this._xLabel;
    }
    public set x_label(v: string) {
        this.setField("x_label", this._xLabel, v, (n) => {
            this._xLabel = n;
            this._rebuildOnNextFrame = true;
        });
    }

    @editable("string") public get y_label(): string {
        return this._yLabel;
    }
    public set y_label(v: string) {
        this.setField("y_label", this._yLabel, v, (n) => {
            this._yLabel = n;
            this._rebuildOnNextFrame = true;
        });
    }

    @editable("number") public get max_points(): number {
        return this._maxPoints;
    }
    public set max_points(v: number) {
        const next = Number.isFinite(v) && v >= 0 ? Math.floor(v) : this._maxPoints;
        this.setField("max_points", this._maxPoints, next, (n) => {
            this._maxPoints = n;
        });
    }

    @editable("string") public get series_names(): string {
        return this._seriesNames;
    }
    public set series_names(v: string) {
        this.setField("series_names", this._seriesNames, v, (n) => {
            this._seriesNames = n;
            this._rebuildOnNextFrame = true;
        });
    }

    // ── Viewables ────────────────────────────────────────────────────

    @viewable("number") public get point_count(): number {
        return this._x?.length ?? 0;
    }

    @viewable("number") public get series_count(): number {
        return this._ys.filter((y) => y && y.length > 0).length;
    }

    @viewable("number") public get x_min(): number {
        return this._x && this._x.length > 0 ? Number(this._x[0]) : 0;
    }

    @viewable("number") public get x_max(): number {
        return this._x && this._x.length > 0 ? Number(this._x[this._x.length - 1]) : 0;
    }

    @viewable("number") public get y_peak(): number {
        let peak = Number.NEGATIVE_INFINITY;
        for (const y of this._ys) {
            if (!y) continue;
            for (let i = 0; i < y.length; i++) if (y[i] > peak) peak = y[i];
        }
        return peak === Number.NEGATIVE_INFINITY ? 0 : peak;
    }

    // ── Runtime ──────────────────────────────────────────────────────

    public override reset(_session: ISession): void {
        this._x = null;
        this._ys = [null, null, null];
    }

    public override fire(session: ISession, _t: number): void {
        const links = session.graph.links as ReadonlyArray<IChannel>;
        for (const link of this.opsc<IChannel>()) {
            if (!link.enabled) continue;
            const slot = String(inSlotOf(link));
            const idx = links.indexOf(link);
            if (idx < 0 || !session.linkStates[idx].ready) continue;
            const vec = asVector(session.consume(idx));
            if (!vec) continue;
            if (slot === "x") this._x = vec;
            else if (slot === "y_1") this._ys[0] = vec;
            else if (slot === "y_2") this._ys[1] = vec;
            else if (slot === "y_3") this._ys[2] = vec;
        }
    }

    // ── IRenderable ──────────────────────────────────────────────────

    public mountInto(host: HTMLElement): void {
        this._host = host;
        this._lastWidth = host.clientWidth;
        this._lastHeight = host.clientHeight;
        this._uplot = new uPlot(this._buildOptions(), this._data(), host);
    }

    public unmountFrom(_host: HTMLElement): void {
        this._uplot?.destroy();
        this._uplot = null;
        this._host = null;
    }

    /** GridStack resized the tile: hand the new content size to uPlot. */
    public onResize(width: number, height: number): void {
        this._lastWidth = width;
        this._lastHeight = height;
        if (this._uplot) this._uplot.setSize({ width, height });
    }

    public repaint(): void {
        if (!this._uplot || !this._host) return;
        if (this._rebuildOnNextFrame) {
            this._uplot.destroy();
            this._uplot = new uPlot(this._buildOptions(), this._data(), this._host);
            this._rebuildOnNextFrame = false;
            return;
        }
        const w = this._host.clientWidth;
        const h = this._host.clientHeight;
        if (w !== this._lastWidth || h !== this._lastHeight) {
            this._lastWidth = w;
            this._lastHeight = h;
            this._uplot.setSize({ width: w, height: h });
        }
        this._uplot.setData(this._data());
    }

    /**
     * Bucket the data down to `max_points` and keep each bucket's peak.
     * Returns the uPlot frame: X first, then one array per series.
     */
    private _data(): uPlot.AlignedData {
        const x = this._x;
        const active = this._ys.map((y) => y ?? null);
        if (!x || x.length === 0) {
            return [[], [], [], []] as unknown as uPlot.AlignedData;
        }

        const target = this._maxPoints;
        if (target === 0 || x.length <= target) {
            const xs = Array.from(x, Number);
            const series = active.map((y) => (y ? Array.from({ length: xs.length }, (_, i) => (i < y.length ? Number(y[i]) : null)) : xs.map(() => null)));
            return [xs, ...series] as unknown as uPlot.AlignedData;
        }

        // One bucket per output point. The first series with data drives
        // which sample each bucket keeps, so every curve is read at the
        // same X and the overlay stays honest.
        const driverIndex = active.findIndex((y) => y && y.length > 0);
        const driver = driverIndex >= 0 ? (active[driverIndex] as Vector) : null;
        const bucket = x.length / target;
        const xs: number[] = [];
        const picks: number[] = [];
        for (let b = 0; b < target; b++) {
            const from = Math.floor(b * bucket);
            const to = Math.min(x.length, Math.floor((b + 1) * bucket));
            if (to <= from) continue;
            let pick = from;
            if (driver) {
                let best = Number.NEGATIVE_INFINITY;
                for (let i = from; i < to && i < driver.length; i++) {
                    if (driver[i] > best) {
                        best = driver[i];
                        pick = i;
                    }
                }
            }
            picks.push(pick);
            xs.push(Number(x[pick]));
        }
        const series = active.map((y) => (y ? picks.map((i) => (i < y.length ? Number(y[i]) : null)) : picks.map(() => null)));
        return [xs, ...series] as unknown as uPlot.AlignedData;
    }

    private _buildOptions(): UplotOptions {
        const names = this._seriesNames.split(",").map((s) => s.trim());
        const series: uPlot.Series[] = [{ label: this._xLabel }];
        for (let i = 0; i < MAX_SERIES; i++) {
            series.push({
                label: names[i] && names[i].length > 0 ? names[i] : `y${i + 1}`,
                stroke: SERIES_COLORS[i],
                width: 1.5,
            });
        }
        return {
            title: this._title,
            width: this._host?.clientWidth || 480,
            height: this._host?.clientHeight || 240,
            series,
            axes: [{ label: this._xLabel }, { label: this._yLabel }],
            scales: { x: { time: false } },
            legend: { show: true },
        };
    }
}

/** Factory, as every registered node family in this repo provides. */
export function createUplotXyNode(): UplotXyNode {
    return new UplotXyNode();
}
