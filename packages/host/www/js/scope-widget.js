// ScopeWidget — embeddable live time-domain viewer.
//
// Self-contained component that renders a live signal trace inside any
// container element. Two integration modes:
//
//   1. Bus-driven (auto): pass `{ bus, streamId }` and the widget
//      subscribes itself. Used by the standalone scope page and by the
//      editor's Play mode.
//   2. Manual feed: omit streamId. Call `widget.feed(payload)` from the
//      host. Useful for piping data through arbitrary code paths (tests,
//      replays, future workers).
//
// The widget owns its DOM (canvas + stats + span dropdown) under the
// container; styling is largely inline so the widget drops cleanly into
// any host without requiring external CSS.

// Compute nice round frequency tick positions for the FFT frequency axis.
function _niceFreqTicks(fMin, fMax, maxCount) {
    const range = fMax - fMin;
    const steps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
    let step = steps[steps.length - 1];
    for (const s of steps) {
        if (range / s <= maxCount) { step = s; break; }
    }
    const out = [];
    for (let f = Math.ceil(fMin / step) * step; f <= fMax + 1e-6; f += step) out.push(f);
    return out;
}

// Format a frequency for axis labels.
function _formatFreq(hz) {
    if (hz >= 1000) return (hz / 1000).toFixed(hz >= 10000 ? 0 : 1) + "k";
    if (hz >= 100)  return hz.toFixed(0);
    if (hz >= 10)   return hz.toFixed(1);
    return hz.toFixed(2);
}

// Format an amplitude value compactly.
function _formatVal(v) {
    if (!isFinite(v)) return "?";
    const a = Math.abs(v);
    if (a === 0) return "0";
    if (a >= 1000 || (a < 0.001 && a > 0)) return v.toExponential(2);
    if (a >= 100) return v.toFixed(1);
    if (a >= 10)  return v.toFixed(2);
    return v.toFixed(3);
}

const DEFAULT_SPAN_OPTIONS = [
    { value: 0.005, label: "5 ms" },
    { value: 0.01,  label: "10 ms" },
    { value: 0.02,  label: "20 ms" },
    { value: 0.04,  label: "40 ms" },
    { value: 0.1,   label: "100 ms" },
    { value: 0.2,   label: "200 ms" },
    { value: 0.5,   label: "500 ms" },
];

const BUF_LEN_DEFAULT = 8192;

export class ScopeWidget {
    /**
     * @param {HTMLElement} container - host element; widget builds its DOM inside.
     * @param {object} [opts]
     * @param {object} [opts.bus]            - StreamBus instance for auto-subscription.
     * @param {string} [opts.streamId]       - stream id to subscribe to.
     * @param {number} [opts.sampleRateHz]   - hint for time-span calculations; can be set later.
     * @param {number} [opts.timeSpanS=0.04] - default visible time window.
     * @param {string} [opts.title]          - shown in the widget header.
     * @param {string} [opts.units]          - rendered next to min/max labels.
     * @param {boolean} [opts.showHeader=true] - hide the title + span dropdown for tighter embeds.
     * @param {number}  [opts.bufLen=8192]   - internal ring-buffer length.
     * @param {boolean} [opts.autoTrigger=true] - align the visible window to a
     *                  rising mid-line zero-crossing so a periodic signal
     *                  appears stationary instead of rolling. Falls back to
     *                  "latest n samples" when no crossing is found in the
     *                  search range (DC, transient, very small window).
     */
    constructor(container, opts = {}) {
        this._container = container;
        this._bus = opts.bus || null;
        this._streamId = opts.streamId || null;
        this._sampleRateHz = opts.sampleRateHz || 0;
        this._timeSpanS = opts.timeSpanS || 0.04;
        this._title = opts.title || "Scope";
        this._units = opts.units || "";
        this._showHeader = opts.showHeader !== false;
        this._bufLen = opts.bufLen || BUF_LEN_DEFAULT;
        this._autoTrigger = opts.autoTrigger !== false;

        // Frame-mode state (set by feed() when payload.frame is true).
        this._frameDt = 0;
        this._isFrameMode = false;

        // Ring buffer (raw scalar samples).
        this._buf = new Float32Array(this._bufLen);
        this._bufPos = 0;
        this._bufFilled = 0;
        this._lastValue = 0;
        this._muted = false;   // true when upstream is paused/silenced

        // Lifecycle.
        this._running = false;
        this._raf = null;

        // Bus subscription handle.
        this._busOff = null;

        this._buildDom();
        if (this._bus && this._streamId) this._wireBus();

        // Register in the global scope-widget registry so a capture tool
        // can look up widgets by title without needing a direct module reference.
        if (this._title) {
            if (!window._spkScopeWidgets) window._spkScopeWidgets = new Map();
            window._spkScopeWidgets.set(this._title, this);
        }
    }

    // ---- Public API -----------------------------------------------------

    /** Begin the rAF render loop. Idempotent. */
    start() {
        if (this._running) return;
        this._running = true;
        this._tick();
    }

    /** Enable / disable auto-trigger alignment at runtime. */
    setAutoTrigger(on) {
        this._autoTrigger = !!on;
    }

    /** Stop the render loop; the canvas keeps its last frame. */
    stop() {
        this._running = false;
        if (this._raf) {
            cancelAnimationFrame(this._raf);
            this._raf = null;
        }
    }

    /** Detach from bus, stop rendering, clear DOM. */
    destroy() {
        this.stop();
        if (this._busOff) { this._busOff(); this._busOff = null; }
        if (this._bus && this._streamId) {
            try { this._bus.unsubscribe(this._streamId); } catch (_e) { /* ignore */ }
        }
        if (this._title && window._spkScopeWidgets) window._spkScopeWidgets.delete(this._title);
        this._container.innerHTML = "";
    }

    /**
     * Capture the current canvas frame as a PNG data URL (base64-encoded).
     * Returns null if the canvas has not been rendered yet (zero dimensions).
     * Used by the MCP controller's capture tools to read a scope's window.
     */
    getSnapshot() {
        if (!this._canvas || !this._canvas.width || !this._canvas.height) return null;
        return this._canvas.toDataURL("image/png");
    }

    /**
     * Render the current buffer as a self-contained SVG string.
     * Resolution-independent vector equivalent of _renderTime(). Uses a fixed
     * 600x200 viewBox; colours and layout match the canvas renderer exactly.
     * Returns null when there is no data to display.
     */
    getSvg() {
        const W = 600, H = 200;
        const ML = 48, MR = 6, MT = 6;
        const MB = this._isFrameMode ? 22 : 8;
        const PW = W - ML - MR;
        const PH = H - MT - MB;

        const lines = [];
        const e = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

        lines.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
        lines.push(`<rect width="${W}" height="${H}" fill="#0a0a1a"/>`);

        const wantedN = this._isFrameMode
            ? this._bufFilled
            : (this._sampleRateHz > 0
                ? Math.round(this._timeSpanS * this._sampleRateHz)
                : this._bufFilled);
        const n = Math.min(this._bufFilled, wantedN, this._bufLen);

        if (this._muted || n < 2) {
            const cy = MT + PH / 2;
            lines.push(`<line x1="${ML}" y1="${cy}" x2="${ML + PW}" y2="${cy}" stroke="rgba(0,212,255,0.25)" stroke-width="1" stroke-dasharray="6 6"/>`);
            lines.push(`<text x="${ML + PW / 2}" y="${cy - 6}" text-anchor="middle" font-family="sans-serif" font-size="11" fill="rgba(255,255,255,0.3)">— paused —</text>`);
            lines.push(`</svg>`);
            return lines.join("\n");
        }

        // Build display buffer (same logic as _renderTime).
        let buf;
        if (this._isFrameMode) {
            buf = this._buf.subarray(0, n);
        } else {
            const searchN = Math.min(this._bufFilled, this._bufLen, 2 * n);
            const searchBuf = new Float32Array(searchN);
            const searchStart = (this._bufPos - searchN + this._bufLen) % this._bufLen;
            for (let i = 0; i < searchN; i++) {
                searchBuf[i] = this._buf[(searchStart + i) % this._bufLen];
            }
            let triggerOffset = -1;
            if (this._autoTrigger) {
                let mean = 0;
                for (let k = 0; k < searchN; k++) mean += searchBuf[k];
                mean /= searchN;
                for (let k = searchN - 2; k > 0; k--) {
                    if (searchBuf[k] >= mean && searchBuf[k - 1] < mean) {
                        if (k + n <= searchN) { triggerOffset = k; break; }
                    }
                }
            }
            buf = new Float32Array(n);
            const tailStart = searchN - n;
            const src = triggerOffset >= 0 ? triggerOffset : tailStart;
            for (let i = 0; i < n; i++) buf[i] = searchBuf[src + i];
        }

        // Amplitude range with padding.
        let lo = Infinity, hi = -Infinity;
        for (let k = 0; k < n; k++) {
            if (buf[k] < lo) lo = buf[k];
            if (buf[k] > hi) hi = buf[k];
        }
        if (!isFinite(lo) || hi - lo < 1e-6) {
            const mid = isFinite(lo) ? lo : 0;
            lo = mid - 1; hi = mid + 1;
        }
        const pad = (hi - lo) * 0.08;
        lo -= pad; hi += pad;
        const range = hi - lo;
        const u = this._units ? " " + this._units : "";

        // Y axis: 3 labeled levels.
        const yLevels = [hi, (hi + lo) / 2, lo];
        for (const lv of yLevels) {
            const gy = Math.round(MT + PH * (1 - (lv - lo) / range));
            lines.push(`<line x1="${ML}" y1="${gy}" x2="${ML + PW}" y2="${gy}" stroke="rgba(255,255,255,0.07)" stroke-width="1"/>`);
            lines.push(`<line x1="${ML - 4}" y1="${gy}" x2="${ML}" y2="${gy}" stroke="rgba(160,160,160,0.5)" stroke-width="1"/>`);
            const labelY = Math.max(MT + 9, Math.min(H - 2, gy + 4));
            lines.push(`<text x="${ML - 6}" y="${labelY}" text-anchor="end" font-family="monospace" font-size="10" fill="rgba(160,160,160,0.85)">${e(_formatVal(lv) + u)}</text>`);
        }

        // Signal trace.
        const pts = [];
        for (let j = 0; j < n; j++) {
            const x = (ML + (j / (n - 1)) * PW).toFixed(1);
            const y = (MT + PH * (1 - (buf[j] - lo) / range)).toFixed(1);
            pts.push(x + "," + y);
        }
        lines.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="#00d4ff" stroke-width="1.5" stroke-linejoin="round"/>`);

        // Frequency axis (frame / FFT mode).
        if (this._isFrameMode && this._frameDt > 0) {
            const sr = 1 / this._frameDt;
            const fftSize = 2 * (n + 1);
            const fMin = sr / fftSize;
            const fMax = n * sr / fftSize;
            const ticks = _niceFreqTicks(fMin, fMax, 8);
            for (const f of ticks) {
                const xFrac = (f - fMin) / (fMax - fMin);
                if (xFrac < -0.01 || xFrac > 1.01) continue;
                const x = Math.round(ML + xFrac * PW);
                lines.push(`<line x1="${x}" y1="${MT}" x2="${x}" y2="${MT + PH}" stroke="rgba(255,255,255,0.05)" stroke-width="1"/>`);
                lines.push(`<line x1="${x}" y1="${MT + PH}" x2="${x}" y2="${MT + PH + 4}" stroke="rgba(160,160,160,0.5)" stroke-width="1"/>`);
                lines.push(`<text x="${x}" y="${MT + PH + 15}" text-anchor="middle" font-family="monospace" font-size="9" fill="rgba(160,160,160,0.8)">${_formatFreq(f)}</text>`);
            }
            lines.push(`<text x="${W - MR}" y="${H - 2}" text-anchor="end" font-family="monospace" font-size="9" fill="rgba(100,100,100,0.7)">Hz</text>`);
        } else if (!this._isFrameMode) {
            lines.push(`<text x="${W - MR}" y="${H - 2}" text-anchor="end" font-family="monospace" font-size="10" fill="rgba(160,160,160,0.7)">${this._timeSpanS.toFixed(3)} s</text>`);
        }

        lines.push(`</svg>`);
        return lines.join("\n");
    }

    /** Switch to a different stream. Auto-subscribes if a bus is bound. */
    setStream(streamId) {
        if (this._bus && this._streamId && this._streamId !== streamId) {
            try { this._bus.unsubscribe(this._streamId); } catch (_e) { /* ignore */ }
        }
        this._streamId = streamId || null;
        // Reset buffer when the stream changes; old samples would be stale.
        this._bufPos = 0;
        this._bufFilled = 0;
        if (this._bus && this._streamId) {
            try { this._bus.subscribe(this._streamId); } catch (_e) { /* ignore */ }
        }
    }

    setSampleRateHz(rate) { this._sampleRateHz = rate || 0; }
    setTimeSpanS(span) { if (isFinite(span) && span > 0) this._timeSpanS = span; }
    setTitle(title) {
        // Keep the registry in sync when the title changes.
        if (this._title && window._spkScopeWidgets) window._spkScopeWidgets.delete(this._title);
        this._title = title || "";
        if (this._titleEl) this._titleEl.textContent = this._title;
        if (this._title) {
            if (!window._spkScopeWidgets) window._spkScopeWidgets = new Map();
            window._spkScopeWidgets.set(this._title, this);
        }
    }
    setUnits(u) { this._units = u || ""; }

    /**
     * Inject one stream payload manually. Accepts `{ samples, firstT, dt }`
     * (the float-port shape) or any object with a `samples` Float32Array.
     *
     * If the payload carries `frame: true` (e.g. an FFT magnitude frame),
     * the widget REPLACES its buffer with the frame's samples instead of
     * appending. The display then shows that single frame end-to-end —
     * appropriate for spectra and any other "view-the-current-window"
     * data shape.
     */
    feed(payload) {
        if (!payload || !payload.samples) return;
        const samples = payload.samples;
        const n = samples.length;

        // Muted payload: upstream source is paused. Zero the visible window
        // so the display shows a flat centre line rather than stale signal.
        if (payload.muted) {
            if (!this._muted) {
                // Transition to muted: clear the ring buffer immediately.
                this._buf.fill(0);
                this._bufPos = 0;
                this._bufFilled = 0;
                this._lastValue = 0;
                this._muted = true;
            }
            return;
        }
        this._muted = false;

        if (payload.frame) {
            const m = Math.min(n, this._bufLen);
            for (let i = 0; i < m; i++) this._buf[i] = samples[i];
            this._bufPos = m % this._bufLen;
            this._bufFilled = m;
            if (m > 0) this._lastValue = samples[m - 1];
            this._isFrameMode = true;
            // Store the sample interval so _renderTime() can compute frequencies.
            if (payload.dt && payload.dt > 0) this._frameDt = payload.dt;
        } else {
            for (let i = 0; i < n; i++) {
                const v = samples[i];
                this._buf[this._bufPos] = v;
                this._bufPos = (this._bufPos + 1) % this._bufLen;
                this._lastValue = v;
            }
            if (this._bufFilled < this._bufLen) {
                this._bufFilled = Math.min(this._bufLen, this._bufFilled + n);
            }
            this._isFrameMode = false;
        }
        if (!this._sampleRateHz && payload.dt && payload.dt > 0) {
            this._sampleRateHz = Math.round(1 / payload.dt);
        }
    }

    // ---- Internals ------------------------------------------------------

    _buildDom() {
        const root = document.createElement("div");
        root.className = "scope-widget";
        root.style.cssText = "display:flex; flex-direction:column; gap:6px; min-width:0;";

        if (this._showHeader) {
            const header = document.createElement("div");
            header.className = "scope-widget-header";
            header.style.cssText =
                "display:flex; align-items:center; gap:10px; font-size:0.85em;";

            const title = document.createElement("span");
            title.className = "scope-widget-title";
            title.style.cssText = "flex:1; font-weight:600;";
            title.textContent = this._title;
            this._titleEl = title;
            header.appendChild(title);

            const spanLabel = document.createElement("label");
            spanLabel.style.cssText = "display:flex; align-items:center; gap:5px; color:var(--text-muted, #888);";
            spanLabel.appendChild(document.createTextNode("Span"));
            const spanSel = document.createElement("select");
            spanSel.className = "scope-widget-span";
            spanSel.style.cssText =
                "background:var(--input-bg, #111); color:var(--text, #ddd); " +
                "border:1px solid var(--input-border, #333); border-radius:4px; padding:2px 6px;";
            DEFAULT_SPAN_OPTIONS.forEach((o) => {
                const opt = document.createElement("option");
                opt.value = String(o.value);
                opt.textContent = o.label;
                if (Math.abs(o.value - this._timeSpanS) < 1e-6) opt.selected = true;
                spanSel.appendChild(opt);
            });
            spanSel.addEventListener("change", () => {
                const v = parseFloat(spanSel.value);
                if (isFinite(v) && v > 0) this._timeSpanS = v;
            });
            spanLabel.appendChild(spanSel);
            header.appendChild(spanLabel);

            root.appendChild(header);
        }

        const canvas = document.createElement("canvas");
        canvas.className = "scope-widget-canvas";
        // Pixel buffer dimensions are set dynamically by _renderTime() using
        // clientWidth * devicePixelRatio to avoid blur on HiDPI displays.
        canvas.style.cssText =
            "display:block; width:100%; height:200px; " +
            "background:var(--log-bg, #0a0a1a); " +
            "border:1px solid var(--panel-border, #1a1a2e); border-radius:4px;";
        this._canvas = canvas;
        root.appendChild(canvas);

        const stats = document.createElement("div");
        stats.className = "scope-widget-stats";
        stats.style.cssText =
            "display:flex; flex-wrap:wrap; gap:14px; font-size:0.8em; color:var(--text-muted, #888);";
        this._statsEl = stats;
        root.appendChild(stats);

        this._container.appendChild(root);
        this._root = root;
    }

    _wireBus() {
        const self = this;
        this._busOff = this._bus.onData("*", function (payload, msg) {
            if (msg && msg.streamId === self._streamId) self.feed(payload);
        });
        try { this._bus.subscribe(this._streamId); } catch (_e) { /* ignore */ }
    }

    _tick() {
        if (!this._running) return;
        this._renderTime();
        this._renderStats();
        this._raf = requestAnimationFrame(() => this._tick());
    }

    _renderTime() {
        const c = this._canvas;
        const ctx = c.getContext("2d");
        const dpr = window.devicePixelRatio || 1;

        // Resize the canvas pixel buffer to match the CSS layout size * DPR.
        // This prevents bilinear upscaling blur on HiDPI / Retina displays.
        const cssW = c.clientWidth  || 600;
        const cssH = c.clientHeight || 200;
        const bufW = Math.round(cssW * dpr);
        const bufH = Math.round(cssH * dpr);
        if (c.width !== bufW || c.height !== bufH) {
            c.width  = bufW;
            c.height = bufH;
        }

        // All drawing coordinates below are in CSS pixels; the DPR scale is
        // applied once via setTransform so every measurement stays readable.
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const W = cssW, H = cssH;

        // Layout margins. Left is wide enough for Y-axis labels; bottom
        // grows in frame mode to make room for the frequency axis.
        const ML = 48;
        const MR = 6;
        const MT = 6;
        const MB = this._isFrameMode ? 22 : 8;
        const PW = W - ML - MR;   // plot area width  (CSS px)
        const PH = H - MT - MB;   // plot area height (CSS px)

        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(0, 0, W, H);

        const wantedN = this._isFrameMode
            ? this._bufFilled
            : (this._sampleRateHz > 0
                ? Math.round(this._timeSpanS * this._sampleRateHz)
                : this._bufFilled);
        const n = Math.min(this._bufFilled, wantedN, this._bufLen);

        // Muted or no data: draw a dim flat centre line.
        if (this._muted || n < 2) {
            ctx.strokeStyle = "rgba(0,212,255,0.25)";
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(ML, MT + PH / 2);
            ctx.lineTo(ML + PW, MT + PH / 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.font = "11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("— paused —", ML + PW / 2, MT + PH / 2 - 6);
            ctx.textAlign = "left";
            return;
        }

        // Build the display buffer.
        let buf;
        if (this._isFrameMode) {
            // Frame data sits at _buf[0..n-1] with no circular wrapping.
            buf = this._buf.subarray(0, n);
        } else {
            // Rolling mode: optionally align to a rising AC zero-crossing so
            // a periodic signal appears stationary while the buffer rolls.
            const searchN = Math.min(this._bufFilled, this._bufLen, 2 * n);
            const searchBuf = new Float32Array(searchN);
            const searchStart = (this._bufPos - searchN + this._bufLen) % this._bufLen;
            for (let i = 0; i < searchN; i++) {
                searchBuf[i] = this._buf[(searchStart + i) % this._bufLen];
            }

            let triggerOffset = -1;
            if (this._autoTrigger) {
                let mean = 0;
                for (let k = 0; k < searchN; k++) mean += searchBuf[k];
                mean /= searchN;
                for (let k = searchN - 2; k > 0; k--) {
                    if (searchBuf[k] >= mean && searchBuf[k - 1] < mean) {
                        if (k + n <= searchN) { triggerOffset = k; break; }
                    }
                }
            }
            buf = new Float32Array(n);
            if (triggerOffset >= 0) {
                for (let i = 0; i < n; i++) buf[i] = searchBuf[triggerOffset + i];
            } else {
                const tailStart = searchN - n;
                for (let i = 0; i < n; i++) buf[i] = searchBuf[tailStart + i];
            }
        }

        // Compute the visible amplitude range with a small padding.
        let lo = Infinity, hi = -Infinity;
        for (let k = 0; k < n; k++) {
            if (buf[k] < lo) lo = buf[k];
            if (buf[k] > hi) hi = buf[k];
        }
        if (!isFinite(lo) || hi - lo < 1e-6) {
            const mid = isFinite(lo) ? lo : 0;
            lo = mid - 1; hi = mid + 1;
        }
        const pad = (hi - lo) * 0.08;
        lo -= pad; hi += pad;
        const range = hi - lo;

        // Y axis: 3 labeled levels (top / mid / bottom).
        const yLevels = [hi, (hi + lo) / 2, lo];
        const u = this._units ? " " + this._units : "";
        ctx.font = "10px monospace";
        ctx.textAlign = "right";
        for (const lv of yLevels) {
            const gy = Math.round(MT + PH * (1 - (lv - lo) / range));
            // Horizontal grid line spanning the plot area.
            ctx.strokeStyle = "rgba(255,255,255,0.07)";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(ML, gy); ctx.lineTo(ML + PW, gy); ctx.stroke();
            // Short tick mark to the left of the plot.
            ctx.strokeStyle = "rgba(160,160,160,0.5)";
            ctx.beginPath(); ctx.moveTo(ML - 4, gy); ctx.lineTo(ML, gy); ctx.stroke();
            // Label, clamped so it stays within the canvas at the extremes.
            const labelY = Math.max(MT + 9, Math.min(H - 2, gy + 4));
            ctx.fillStyle = "rgba(160,160,160,0.85)";
            ctx.fillText(_formatVal(lv) + u, ML - 6, labelY);
        }
        ctx.textAlign = "left";

        // Signal trace.
        ctx.strokeStyle = "#00d4ff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let j = 0; j < n; j++) {
            const x = ML + (j / (n - 1)) * PW;
            const y = MT + PH * (1 - (buf[j] - lo) / range);
            if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Frequency axis (FFT / frame mode only).
        if (this._isFrameMode && this._frameDt > 0) {
            // SpikyPanda FFT convention: n bins, bin k has frequency (k+1)*sr/fftSize,
            // with fftSize = 2*(n+1). Bin 0 is at fMin, bin n-1 is at fMax.
            const sr = 1 / this._frameDt;
            const fftSize = 2 * (n + 1);
            const fMin = sr / fftSize;
            const fMax = n * sr / fftSize;
            const ticks = _niceFreqTicks(fMin, fMax, 8);

            ctx.font = "9px monospace";
            ctx.textAlign = "center";
            for (const f of ticks) {
                const xFrac = (f - fMin) / (fMax - fMin);
                if (xFrac < -0.01 || xFrac > 1.01) continue;
                const x = Math.round(ML + xFrac * PW);
                // Faint vertical grid line through the plot area.
                ctx.strokeStyle = "rgba(255,255,255,0.05)";
                ctx.lineWidth = 1;
                ctx.beginPath(); ctx.moveTo(x, MT); ctx.lineTo(x, MT + PH); ctx.stroke();
                // Short tick mark below the plot.
                ctx.strokeStyle = "rgba(160,160,160,0.5)";
                ctx.beginPath(); ctx.moveTo(x, MT + PH); ctx.lineTo(x, MT + PH + 4); ctx.stroke();
                // Frequency label.
                ctx.fillStyle = "rgba(160,160,160,0.8)";
                ctx.fillText(_formatFreq(f), x, MT + PH + 15);
            }
            // Unit hint at far right.
            ctx.textAlign = "right";
            ctx.fillStyle = "rgba(100,100,100,0.7)";
            ctx.fillText("Hz", W - MR, H - 2);
            ctx.textAlign = "left";
        } else if (!this._isFrameMode) {
            // Time span label in the bottom-right corner.
            ctx.fillStyle = "rgba(160,160,160,0.7)";
            ctx.font = "10px monospace";
            ctx.textAlign = "right";
            ctx.fillText(this._timeSpanS.toFixed(3) + " s", W - MR, H - 2);
            ctx.textAlign = "left";
        }
    }

    _renderStats() {
        const fs = this._sampleRateHz || "?";
        if (this._muted) {
            this._statsEl.innerHTML =
                "<span>fs <strong>" + fs + " Hz</strong></span>" +
                "<span style='color:#f87171'>source <strong>paused</strong></span>";
            return;
        }
        const filled = this._bufFilled;
        const last = this._lastValue.toFixed(4);
        this._statsEl.innerHTML =
            "<span>fs <strong>" + fs + " Hz</strong></span>" +
            "<span>buf <strong>" + filled + " / " + this._bufLen + "</strong></span>" +
            "<span>last <strong>" + last + "</strong></span>";
    }
}
