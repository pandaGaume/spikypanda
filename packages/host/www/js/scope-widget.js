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
        this._container.innerHTML = "";
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
        this._title = title || "";
        if (this._titleEl) this._titleEl.textContent = this._title;
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
        canvas.width = 900;
        canvas.height = 200;
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
        const w = c.width, h = c.height;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(0, 0, w, h);

        // Grid lines.
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = 1;
        for (let g = 0; g <= 4; g++) {
            const gy = (g / 4) * h;
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
        }

        const wantedN = this._isFrameMode
            ? this._bufFilled
            : (this._sampleRateHz > 0
                ? Math.round(this._timeSpanS * this._sampleRateHz)
                : this._bufFilled);
        const n = Math.min(this._bufFilled, wantedN, this._bufLen);

        // Muted (source paused): draw a dim flat line at zero centre.
        if (this._muted || n < 2) {
            ctx.strokeStyle = "rgba(0,212,255,0.25)";
            ctx.lineWidth = 1;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(0, h / 2);
            ctx.lineTo(w, h / 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = "rgba(255,255,255,0.3)";
            ctx.font = "11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("— paused —", w / 2, h / 2 - 6);
            ctx.textAlign = "left";
            return;
        }

        // Pull a sliding window large enough to allow the auto-trigger
        // search to look one full window backwards from "newest" without
        // running out of samples. We always render the most recent n
        // samples by default, and shift the start backwards to a rising
        // mid-line crossing when one is available within the search range.
        const searchN = Math.min(this._bufFilled, this._bufLen, 2 * n);
        const searchBuf = new Float32Array(searchN);
        const searchStart = (this._bufPos - searchN + this._bufLen) % this._bufLen;
        for (let i = 0; i < searchN; i++) {
            searchBuf[i] = this._buf[(searchStart + i) % this._bufLen];
        }

        // Auto-trigger : align the visible window to the most recent
        // rising zero-crossing of the AC component, so a periodic signal
        // appears stationary even while the buffer rolls in continuously.
        // Falls back to "render the latest n samples" when disabled, or
        // when no crossing is found (DC, transient, very short window).
        let triggerOffset = -1;
        if (this._autoTrigger) {
            let mean = 0;
            for (let k = 0; k < searchN; k++) mean += searchBuf[k];
            mean /= searchN;
            // Walk backwards from the newest end, looking for the most
            // recent sample that crosses upward through the mean. Stop
            // as soon as we find one whose start-of-window leaves enough
            // room for n samples.
            for (let k = searchN - 2; k > 0; k--) {
                if (searchBuf[k] >= mean && searchBuf[k - 1] < mean) {
                    if (k + n <= searchN) { triggerOffset = k; break; }
                }
            }
        }
        const buf = new Float32Array(n);
        if (triggerOffset >= 0) {
            for (let i = 0; i < n; i++) buf[i] = searchBuf[triggerOffset + i];
        } else {
            // Fallback : latest n samples (the classic rolling window).
            const tailStart = searchN - n;
            for (let i = 0; i < n; i++) buf[i] = searchBuf[tailStart + i];
        }

        let lo = Infinity, hi = -Infinity;
        for (let k = 0; k < n; k++) {
            const v = buf[k];
            if (v < lo) lo = v;
            if (v > hi) hi = v;
        }
        // Flat or empty signal: use a symmetric ±1 range centred on the value.
        if (!isFinite(lo) || hi - lo < 1e-6) {
            const mid = isFinite(lo) ? lo : 0;
            lo = mid - 1; hi = mid + 1;
        }
        const pad = (hi - lo) * 0.08;
        lo -= pad; hi += pad;

        ctx.strokeStyle = "#00d4ff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let j = 0; j < n; j++) {
            const x = (j / (n - 1)) * w;
            const y = h - ((buf[j] - lo) / (hi - lo)) * h;
            if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Y labels: top and bottom amplitude, time span bottom-right.
        ctx.fillStyle = "rgba(160,160,160,0.85)";
        ctx.font = "10px monospace";
        const u = this._units ? " " + this._units : "";
        ctx.fillText(hi.toFixed(3) + u, 4, 11);
        ctx.fillText(lo.toFixed(3) + u, 4, h - 4);
        if (!this._isFrameMode) {
            ctx.fillText(this._timeSpanS.toFixed(3) + " s", w - 60, h - 4);
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
