// GaugeWidget — live numeric + arc display for any float stream.
//
// Subscribes to a StreamBus stream and updates a large readout + SVG arc
// on every incoming payload. Designed to sit in a play-panel tab body.
//
// opts:
//   bus          {object}  StreamBus instance
//   streamId     {string}  stream to subscribe to
//   label        {string}  node label (shown in header)
//   unit         {string}  unit suffix (e.g. "rps", "A", "°C")
//   min          {number}  gauge range minimum (default 0)
//   max          {number}  gauge range maximum (default 100)
//   decimals     {number}  decimal places in the readout (default 1)

const ARC_R       = 54;          // arc radius
const ARC_CX      = 70;          // SVG viewBox centre x
const ARC_CY      = 72;          // SVG viewBox centre y (slightly below true centre)
const ARC_START   = 135;         // degrees — bottom-left
const ARC_SWEEP   = 270;         // total degrees of travel
const SVG_SIZE    = 140;

function polarToXY(cx, cy, r, deg) {
    const rad = (deg - 90) * Math.PI / 180;   // 0° = top
    return {
        x: cx + r * Math.cos(rad),
        y: cy + r * Math.sin(rad),
    };
}

function describeArc(cx, cy, r, startDeg, endDeg) {
    const s   = polarToXY(cx, cy, r, startDeg);
    const e   = polarToXY(cx, cy, r, endDeg);
    const large = (endDeg - startDeg) > 180 ? 1 : 0;
    return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

export class GaugeWidget {
    constructor(container, opts) {
        this._container  = container;
        this._bus        = opts.bus        || null;
        this._streamId   = opts.streamId   || null;
        this._label      = opts.label      || "Gauge";
        this._unit       = opts.unit       || "";
        this._min        = opts.min        != null ? opts.min        : 0;
        this._max        = opts.max        != null ? opts.max        : 100;
        this._decimals   = opts.decimals   != null ? opts.decimals   : 1;
        this._value      = this._min;

        this._busOff     = null;
        this._arcFill    = null;   // SVG path element
        this._readout    = null;   // span element
        this._el         = null;

        this._build();
        if (this._bus && this._streamId) this._wireBus();
    }

    // ---- Bus wiring -------------------------------------------------------

    _wireBus() {
        const self = this;
        this._busOff = this._bus.onData("*", function (payload, msg) {
            if (msg && msg.streamId === self._streamId) self._ingest(payload);
        });
        try { this._bus.subscribe(this._streamId); } catch (_e) { /* ignore */ }
    }

    _ingest(payload) {
        if (!payload || !payload.samples || !payload.samples.length) return;
        // Take the last sample of the block as the "current" value.
        this._value = payload.samples[payload.samples.length - 1];
        this._render();
    }

    // ---- DOM --------------------------------------------------------------

    _build() {
        const el = document.createElement("div");
        el.className = "spk-gauge-widget";

        // Header
        const hdr = document.createElement("div");
        hdr.className = "spk-gauge-header";
        hdr.textContent = this._label;
        el.appendChild(hdr);

        // SVG gauge arc
        const svgNS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(svgNS, "svg");
        svg.setAttribute("viewBox", `0 0 ${SVG_SIZE} ${SVG_SIZE}`);
        svg.setAttribute("width",  String(SVG_SIZE));
        svg.setAttribute("height", String(SVG_SIZE));
        svg.classList.add("spk-gauge-svg");

        // Background track
        const bgPath = document.createElementNS(svgNS, "path");
        bgPath.setAttribute("d", describeArc(ARC_CX, ARC_CY, ARC_R, ARC_START, ARC_START + ARC_SWEEP));
        bgPath.classList.add("spk-gauge-track");
        svg.appendChild(bgPath);

        // Filled arc (value)
        const fillPath = document.createElementNS(svgNS, "path");
        fillPath.setAttribute("d", describeArc(ARC_CX, ARC_CY, ARC_R, ARC_START, ARC_START));
        fillPath.classList.add("spk-gauge-fill");
        svg.appendChild(fillPath);
        this._arcFill = fillPath;

        // Centre text (value)
        const valText = document.createElementNS(svgNS, "text");
        valText.setAttribute("x", String(ARC_CX));
        valText.setAttribute("y", String(ARC_CY + 6));
        valText.setAttribute("text-anchor", "middle");
        valText.classList.add("spk-gauge-number");
        svg.appendChild(valText);
        this._readout = valText;

        // Unit label below number
        const unitText = document.createElementNS(svgNS, "text");
        unitText.setAttribute("x", String(ARC_CX));
        unitText.setAttribute("y", String(ARC_CY + 22));
        unitText.setAttribute("text-anchor", "middle");
        unitText.classList.add("spk-gauge-unit");
        unitText.textContent = this._unit;
        svg.appendChild(unitText);
        this._unitEl = unitText;

        // Min / max labels at the arc endpoints
        const minPt = polarToXY(ARC_CX, ARC_CY, ARC_R + 10, ARC_START);
        const maxPt = polarToXY(ARC_CX, ARC_CY, ARC_R + 10, ARC_START + ARC_SWEEP);

        const minText = document.createElementNS(svgNS, "text");
        minText.setAttribute("x", minPt.x.toFixed(1));
        minText.setAttribute("y", minPt.y.toFixed(1));
        minText.setAttribute("text-anchor", "middle");
        minText.classList.add("spk-gauge-minmax");
        minText.textContent = String(this._min);
        svg.appendChild(minText);

        const maxText = document.createElementNS(svgNS, "text");
        maxText.setAttribute("x", maxPt.x.toFixed(1));
        maxText.setAttribute("y", maxPt.y.toFixed(1));
        maxText.setAttribute("text-anchor", "middle");
        maxText.classList.add("spk-gauge-minmax");
        maxText.textContent = String(this._max);
        svg.appendChild(maxText);

        el.appendChild(svg);

        this._el = el;
        this._container.appendChild(el);

        // Initial render at min
        this._render();
    }

    _render() {
        const v       = this._value;
        const range   = this._max - this._min;
        const clamped = range > 0 ? Math.max(0, Math.min(1, (v - this._min) / range)) : 0;
        const endDeg  = ARC_START + clamped * ARC_SWEEP;

        // Avoid degenerate zero-length arc (SVG renders nothing for M p A p with same start/end)
        const actualEnd = clamped < 0.001 ? ARC_START + 0.01 : endDeg;
        this._arcFill.setAttribute("d", describeArc(ARC_CX, ARC_CY, ARC_R, ARC_START, actualEnd));

        // Colour shifts from teal to amber to red as value climbs
        const hue = Math.round(160 - clamped * 150);   // 160 teal → 10 red
        this._arcFill.style.stroke = `hsl(${hue}, 70%, 55%)`;

        this._readout.textContent = v.toFixed(this._decimals);
    }

    // ---- Public API -------------------------------------------------------

    /** Update unit/range/decimals after construction (e.g. from a config change). */
    setConfig(cfg) {
        if (cfg.unit     != null) { this._unit     = cfg.unit;     if (this._unitEl) this._unitEl.textContent = cfg.unit; }
        if (cfg.min      != null)   this._min      = cfg.min;
        if (cfg.max      != null)   this._max      = cfg.max;
        if (cfg.decimals != null)   this._decimals = cfg.decimals;
        this._render();
    }

    // No-op — Gauge doesn't depend on sample rate.
    setSampleRateHz(_fs) {}

    /** Detach bus subscription, tear down DOM. */
    destroy() {
        if (this._busOff) { this._busOff(); this._busOff = null; }
        if (this._bus && this._streamId) {
            try { this._bus.unsubscribe(this._streamId); } catch (_e) { /* ignore */ }
        }
        if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el);
        this._el = null;
    }
}
