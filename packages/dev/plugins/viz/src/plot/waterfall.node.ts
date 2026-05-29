import { Application, Sprite, Texture, BaseTexture, SCALE_MODES } from "pixi.js";
import {
    cloneable, editable, viewable,
    IChannel, IDeclaresPorts, IOlink, IPortDescriptor,
    ISession, RuntimeNode, inSlotOf,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import type { IRenderable } from "spikypanda-nodeeditor";

/**
 * Scrolling 2D spectrogram (waterfall plot), rendered with PixiJS.
 *
 * Each `fire()` consumes a magnitude tensor on the `magnitudes` input
 * (typically wired from `SpFFT → SpMagnitude`) and stores it as the
 * newest row in a ring buffer of `historyRows` × `numBins`. Each row
 * is mapped to a colored pixel line via a chosen color map, and the
 * whole image scrolls down over time so the newest frame sits at the
 * top of the tile.
 *
 * Rendering is deferred to `repaint()`, which runs at 60 fps from the
 * Dashboard. We blit the ring buffer into a Uint8ClampedArray (RGBA),
 * upload it to a PixiJS BaseTexture, and stretch a single Sprite to
 * the tile's content area. The CSS pixels-to-bin mapping is bilinear
 * via PixiJS's LINEAR scale mode — looks clean when historyRows is
 * smaller than the tile height.
 *
 * Why PixiJS rather than Canvas2D: validates the multi-library Dashboard
 * architecture (uPlot for line plots, PixiJS for raster/heatmap, future
 * ECharts for charts). WebGL upload + render of a small dynamic texture
 * is the right tool when we later scale to 2048+ bin × 500+ row
 * spectrograms with multiple co-existing tiles.
 *
 * Inputs:
 *   magnitudes  Float32Array | number[] of N positive magnitudes.
 *               When N differs from `numBins` the buffer is rebuilt
 *               on the next repaint with the new width.
 *
 * Editables:
 *   numBins      target FFT bin count (re-allocates the ring buffer)
 *   historyRows  number of past frames kept on screen
 *   colormap     "viridis" | "hot" | "grayscale"
 *   dbScale      when true, magnitudes are converted to dB before mapping
 *   vmin, vmax   dynamic range clamps (after dB, when enabled)
 */

type ColorMap = "viridis" | "hot" | "grayscale";

const DEFAULT_NUM_BINS     = 256;
const DEFAULT_HISTORY_ROWS = 200;

export class PixiWaterfallNode extends RuntimeNode implements IDeclaresPorts, IRenderable {
    public readonly renderableType = "Viz.Plot:waterfall";

    public readonly inputPorts: ReadonlyArray<IPortDescriptor> = [
        { slot: "magnitudes", optional: true, type: "any" },
    ];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];

    // ── Editables ──────────────────────────────────────────────────────
    @cloneable private _numBins:     number  = DEFAULT_NUM_BINS;
    @cloneable private _historyRows: number  = DEFAULT_HISTORY_ROWS;
    @cloneable private _colormap:    ColorMap = "viridis";
    @cloneable private _dbScale:     boolean = true;
    @cloneable private _vmin:        number  = -80;
    @cloneable private _vmax:        number  = 0;
    // Auto-sourced from session.simRate (not editable). The runner is
    // the single source of truth for the sample rate; the tile follows.
    private _sampleRate: number = 0;

    // ── Ring buffer + texture ──────────────────────────────────────────
    // Row-major Float32Array of (rows × cols) magnitudes; oldest row at
    // index 0, newest at end. We rotate by `head` instead of shifting
    // every frame so push is O(cols) instead of O(rows × cols).
    private _ring:       Float32Array | null = null;
    private _ringCols:   number = 0;
    private _ringRows:   number = 0;
    private _head:       number = 0;
    // Indicates we need to re-allocate the ring + RGBA buffer + texture
    // because numBins or historyRows changed.
    private _structureDirty = true;
    // RGBA pixel buffer fed to PixiJS each repaint (one byte per channel,
    // rows × cols × 4). Pre-allocated to avoid per-frame GC.
    private _rgba: Uint8ClampedArray | null = null;

    // ── PixiJS handles ─────────────────────────────────────────────────
    private _app:         Application | null = null;
    private _sprite:      Sprite | null = null;
    private _baseTexture: BaseTexture | null = null;
    private _host:        HTMLElement | null = null;
    private _canvasWrap:  HTMLDivElement | null = null;
    private _axisEl:      HTMLDivElement | null = null;
    private _lastReceivedBins = 0;

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    @editable("number", { unit: "bins" })
    public get numBins(): number { return this._numBins; }
    public set numBins(v: number) {
        const next = Math.max(2, Math.floor(v));
        this.setField("numBins", this._numBins, next, (n) => {
            this._numBins = n;
            this._structureDirty = true;
        });
    }

    @editable("number", { unit: "rows" })
    public get historyRows(): number { return this._historyRows; }
    public set historyRows(v: number) {
        const next = Math.max(2, Math.floor(v));
        this.setField("historyRows", this._historyRows, next, (n) => {
            this._historyRows = n;
            this._structureDirty = true;
        });
    }

    @editable("string")
    public get colormap(): ColorMap { return this._colormap; }
    public set colormap(v: ColorMap) {
        this.setField("colormap", this._colormap, v, (n) => { this._colormap = n; });
    }

    @editable("boolean")
    public get dbScale(): boolean { return this._dbScale; }
    public set dbScale(v: boolean) {
        this.setField("dbScale", this._dbScale, v, (n) => { this._dbScale = n; });
    }

    @editable("number", { unit: "dB" })
    public get vmin(): number { return this._vmin; }
    public set vmin(v: number) { this.setField("vmin", this._vmin, v, (n) => { this._vmin = n; }); }

    @editable("number", { unit: "dB" })
    public get vmax(): number { return this._vmax; }
    public set vmax(v: number) { this.setField("vmax", this._vmax, v, (n) => { this._vmax = n; }); }

    /**
     * Diagnostic: the simulation sample rate the tile currently sees
     * (auto-sourced from `session.simRate` each fire()). 0 = runtime
     * is free-running (no Hz axis).
     */
    @viewable("number") public get sampleRateHz(): number {
        return this._sampleRate;
    }

    /**
     * Diagnostic: the upper bound of the X axis in Hz (Nyquist).
     */
    @viewable("number") public get xAxisMaxHz(): number {
        return this._sampleRate > 0 ? this._sampleRate / 2 : 0;
    }

    /** Read-only viewable: how wide the last received magnitudes vector
     *  was. Useful when wiring: if SpFFT outputs e.g. 513 bins (N/2+1)
     *  the user sees that here and can match `numBins`. */
    @viewable("number") public get lastReceivedBins(): number {
        return this._lastReceivedBins;
    }

    // ── Runtime lifecycle ──────────────────────────────────────────────

    public override reset(_session: ISession): void {
        if (this._ring) this._ring.fill(0);
        this._head = 0;
    }

    public override fire(session: ISession, _t: number): void {
        // Auto-source the sample rate from the session. Re-render the
        // Hz axis strip on change (mode switch free ↔ fixed-realtime,
        // or simRate edit mid-play).
        const sessionRate = session.simRate ?? 0;
        if (sessionRate !== this._sampleRate) {
            this._sampleRate = sessionRate;
            this._rebuildAxis();
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

        this._lastReceivedBins = frame.length;
        this._ensureStructure();
        if (!this._ring) return;

        // Resample / pad the incoming frame to ring width (numBins). For
        // V1 we do nearest-neighbour: incoming bin `i` lands at
        // `i * cols / frame.length`. This handles both upsample (frame
        // smaller than cols) and downsample (frame larger) without
        // crashing on mismatched widths.
        const cols = this._ringCols;
        const rowStart = this._head * cols;
        if (frame.length === cols) {
            for (let i = 0; i < cols; ++i) this._ring[rowStart + i] = frame[i];
        } else {
            const scale = frame.length / cols;
            for (let i = 0; i < cols; ++i) {
                const src = Math.min(frame.length - 1, Math.floor(i * scale));
                this._ring[rowStart + i] = frame[src];
            }
        }
        // Advance head; wraps to 0 once it passes the last row.
        this._head = (this._head + 1) % this._ringRows;
    }

    // ── IRenderable ────────────────────────────────────────────────────

    public mountInto(host: HTMLElement): void {
        this._host = host;
        // Layout: flex column with the canvas on top (stretches) and an
        // optional axis label strip below. Axis is empty / hidden when
        // sampleRate=0, populated with Hz tick labels when > 0.
        host.style.display = "flex";
        host.style.flexDirection = "column";

        this._canvasWrap = document.createElement("div");
        this._canvasWrap.style.cssText = "flex:1 1 auto;min-height:0;position:relative;";
        host.appendChild(this._canvasWrap);

        this._axisEl = document.createElement("div");
        this._axisEl.style.cssText =
            "flex:0 0 auto;height:16px;position:relative;"
            + "font-family:var(--ne-font-mono,monospace);font-size:10px;"
            + "color:var(--ne-color-text-muted,#8A8A9A);"
            + "border-top:1px solid var(--ne-color-border,#3A3A48);";
        host.appendChild(this._axisEl);

        const width  = Math.max(this._canvasWrap.clientWidth, 100);
        const height = Math.max(this._canvasWrap.clientHeight, 60);
        this._app = new Application({
            width, height,
            background: 0x0A0A0F,
            antialias: false,
            autoDensity: true,
        });
        this._canvasWrap.appendChild(this._app.view as HTMLCanvasElement);
        this._sprite = new Sprite();
        this._app.stage.addChild(this._sprite);
        this._structureDirty = true;
        this._app.ticker.stop();
        this._rebuildAxis();
    }

    public unmountFrom(host: HTMLElement): void {
        if (this._sprite) {
            this._sprite.destroy();
            this._sprite = null;
        }
        if (this._baseTexture) {
            this._baseTexture.destroy();
            this._baseTexture = null;
        }
        if (this._app) {
            this._app.destroy(true, { children: true });
            this._app = null;
        }
        if (this._axisEl && this._axisEl.parentNode === host) host.removeChild(this._axisEl);
        if (this._canvasWrap && this._canvasWrap.parentNode === host) host.removeChild(this._canvasWrap);
        this._axisEl = null;
        this._canvasWrap = null;
        host.style.display = "";
        host.style.flexDirection = "";
        this._host = null;
    }

    public repaint(): void {
        if (!this._app || !this._sprite) return;
        this._ensureStructure();
        if (!this._ring || !this._rgba) return;

        // Walk the ring rows from oldest to newest, write into rgba.
        const rows = this._ringRows;
        const cols = this._ringCols;
        const rgba = this._rgba;
        const ring = this._ring;
        const vmin = this._dbScale ? this._vmin : this._vmin;
        const vmax = this._vmax;
        const dbScale = this._dbScale;
        const cmap = this._colormap;

        // The ring's logical "row 0" lives at `head` in the array; we
        // emit visual rows in reverse (newest at top of image) by
        // walking back from head - 1.
        for (let visual = 0; visual < rows; ++visual) {
            // Source row index: newest at visual 0 → ring index head-1
            const src = ((this._head - 1 - visual) + rows * 2) % rows;
            const srcOff = src * cols;
            const dstOff = visual * cols * 4;
            for (let x = 0; x < cols; ++x) {
                let m = ring[srcOff + x];
                if (dbScale) {
                    // 20·log10(|m|), with a tiny epsilon so zero-magnitude
                    // bins clamp to vmin instead of -Infinity.
                    m = 20 * Math.log10(Math.max(Math.abs(m), 1e-12));
                }
                // Normalize [vmin, vmax] → [0, 1]
                let u = (m - vmin) / (vmax - vmin);
                if (u < 0) u = 0; else if (u > 1) u = 1;
                const [r, g, b] = _sampleColormap(cmap, u);
                rgba[dstOff + x * 4 + 0] = r;
                rgba[dstOff + x * 4 + 1] = g;
                rgba[dstOff + x * 4 + 2] = b;
                rgba[dstOff + x * 4 + 3] = 255;
            }
        }

        // Upload rgba to PixiJS texture. From() on a raw resource is the
        // PixiJS v7 way; the BaseTexture.update() pushes the latest
        // pixel data on the GPU each frame.
        if (!this._baseTexture) {
            this._baseTexture = BaseTexture.fromBuffer(rgba, cols, rows, {
                scaleMode: SCALE_MODES.LINEAR,
            });
            this._sprite.texture = new Texture(this._baseTexture);
            this._fitSpriteToStage();
        } else {
            // Push the new pixel data and tell PixiJS to re-upload.
            this._baseTexture.resource.update?.();
            // For the BufferResource specifically the in-place mutation
            // of `rgba` is reflected by calling update() on the resource;
            // not all PixiJS resources expose update(), so we also bump
            // the texture's update id as a fallback.
            this._baseTexture.update();
        }

        this._app.render();
    }

    public onResize(width: number, height: number): void {
        if (!this._app) return;
        // The Dashboard's ResizeObserver gives us the BODY size.
        // Subtract the axis strip height when it's mounted so the
        // canvas itself doesn't overflow.
        const axisH = this._axisEl ? this._axisEl.clientHeight : 0;
        const canvasH = Math.max(40, height - axisH);
        this._app.renderer.resize(width, canvasH);
        this._fitSpriteToStage();
        this._rebuildAxis();
    }

    /**
     * Rebuild the Hz axis label strip. When `sampleRate <= 0` the strip
     * stays empty (just a thin border separator above it). Otherwise we
     * place 5-7 evenly spaced absolute-positioned labels from 0 to
     * Nyquist (= sampleRate / 2). Light implementation — no canvas, no
     * SVG — so it costs almost nothing and reflows for free with the
     * tile's CSS layout.
     */
    private _rebuildAxis(): void {
        if (!this._axisEl) return;
        this._axisEl.innerHTML = "";
        if (this._sampleRate <= 0) return;

        const nyquist = this._sampleRate / 2;
        // Adapt label count to width — too many labels overlap, too few
        // hides useful detail. 6 is a good middle for typical tile widths.
        const labelCount = 6;
        for (let i = 0; i < labelCount; i++) {
            const t = i / (labelCount - 1);              // 0..1
            const hz = t * nyquist;
            const label = document.createElement("span");
            // Edge alignment: leftmost label hugs the left edge,
            // rightmost hugs the right, middle labels center on their
            // x position. Keeps text from clipping at the boundaries.
            const transform = i === 0
                ? "translateX(0)"
                : i === labelCount - 1
                    ? "translateX(-100%)"
                    : "translateX(-50%)";
            label.style.cssText =
                "position:absolute;top:2px;white-space:nowrap;pointer-events:none;"
                + `transform:${transform};`;
            label.style.left = `${(t * 100).toFixed(2)}%`;
            label.textContent = _formatHz(hz);
            this._axisEl.appendChild(label);
        }
    }

    // ── Internals ──────────────────────────────────────────────────────

    private _ensureStructure(): void {
        if (!this._structureDirty
            && this._ring !== null
            && this._ringCols === this._numBins
            && this._ringRows === this._historyRows
        ) {
            return;
        }
        this._ringCols = this._numBins;
        this._ringRows = this._historyRows;
        this._ring = new Float32Array(this._ringRows * this._ringCols);
        this._rgba = new Uint8ClampedArray(this._ringRows * this._ringCols * 4);
        this._head = 0;
        // Throw away the old texture; a fresh one will be created on
        // the next repaint, sized to the new ring dims.
        if (this._baseTexture) {
            this._baseTexture.destroy();
            this._baseTexture = null;
            if (this._sprite) this._sprite.texture = Texture.EMPTY;
        }
        this._structureDirty = false;
    }

    private _fitSpriteToStage(): void {
        if (!this._app || !this._sprite) return;
        this._sprite.x = 0;
        this._sprite.y = 0;
        this._sprite.width  = this._app.renderer.width;
        this._sprite.height = this._app.renderer.height;
    }
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

/**
 * Best-effort coercion of a wire value into an ArrayLike<number> of
 * magnitudes. Accepts:
 *   - Float32Array / Float64Array / Int*Array (typed arrays)
 *   - plain number[]
 *   - tensor-shaped `{ data: TypedArray }` (the SpOnnx output convention)
 * Returns null for anything else (string, object without data, ...).
 */
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

/**
 * Sample one of three small built-in colormaps. Returns [r, g, b] in
 * 0..255. Implementations are cheap polynomial fits — accurate enough
 * for visualization, no LUT table to load.
 */
function _sampleColormap(name: ColorMap, t: number): [number, number, number] {
    if (name === "grayscale") {
        const g = Math.round(t * 255);
        return [g, g, g];
    }
    if (name === "hot") {
        // Black → red → yellow → white, three linear segments.
        let r: number, g: number, b: number;
        if (t < 1 / 3)      { r = t * 3;            g = 0;                  b = 0; }
        else if (t < 2 / 3) { r = 1;                g = (t - 1 / 3) * 3;    b = 0; }
        else                { r = 1;                g = 1;                  b = (t - 2 / 3) * 3; }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    // viridis: polynomial fit from matplotlib's viridis lookup
    const r = 0.267 + t * (-0.105 + t * (1.823 + t * -1.235));
    const g = 0.005 + t * (1.404 + t * (-1.384 + t * 0.971));
    const b = 0.329 + t * (1.385 + t * (-3.090 + t * 1.668));
    return [
        Math.max(0, Math.min(255, Math.round(r * 255))),
        Math.max(0, Math.min(255, Math.round(g * 255))),
        Math.max(0, Math.min(255, Math.round(b * 255))),
    ];
}

/** Compact-format an Hz value for axis labels. < 100 Hz keeps one
 *  decimal, 100-999 Hz integer, 1k-9.9k as "1.2k", > 10k as integer "k".
 *  Output is concise enough to fit in narrow tile axes without crowding. */
function _formatHz(v: number): string {
    if (v >= 1000) return (v / 1000).toFixed(v >= 10000 ? 0 : 1) + "k";
    return v >= 100 ? String(Math.round(v)) : v.toFixed(1);
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createPixiWaterfallNode(): PixiWaterfallNode {
    return new PixiWaterfallNode();
}
