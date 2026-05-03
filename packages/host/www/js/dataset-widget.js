// DatasetWidget — play-panel control surface for spk.DatasetCapture nodes.
//
// Polls the live DatasetCaptureRuntime once per second to refresh counts
// and the active label. Provides:
//   - Start / Stop capture toggle
//   - Live label display (reflects labelIndex input when wired)
//   - Per-class window count table
//   - Clear, Export JSON, Export CSV buttons

export class DatasetWidget {
    constructor(container, opts) {
        this._container = container;
        this._executor  = opts.executor || null;
        this._nodeId    = opts.nodeId   || null;
        this._label     = opts.label    || "Dataset Capture";
        this._cfg       = opts.cfg      || {};
        this._pollId    = null;
        this._el        = null;

        // DOM refs updated during polling
        this._startStopBtn = null;
        this._activeLabelEl = null;
        this._countEl       = null;
        this._tableEl       = null;

        this._build();
        this._startPoll();
    }

    // ---- Runtime accessor -------------------------------------------------

    _rt() {
        return (this._executor && this._nodeId)
            ? this._executor.getNodeInstance(this._nodeId)
            : null;
    }

    // ---- DOM ---------------------------------------------------------------

    _build() {
        const el = document.createElement("div");
        el.className = "spk-ds-widget";

        // Header
        const hdr = document.createElement("div");
        hdr.className = "spk-ds-header";
        hdr.textContent = this._label;
        el.appendChild(hdr);

        // Active label row (read-only, driven by runtime or labelIndex input)
        const labelRow = document.createElement("div");
        labelRow.className = "spk-ds-row";
        const labelLbl = document.createElement("span");
        labelLbl.className = "spk-ds-label";
        labelLbl.textContent = "Active label";
        const activeLabelEl = document.createElement("span");
        activeLabelEl.className = "spk-ds-active-label";
        activeLabelEl.textContent = this._cfg.label || "healthy";
        this._activeLabelEl = activeLabelEl;
        labelRow.appendChild(labelLbl);
        labelRow.appendChild(activeLabelEl);
        el.appendChild(labelRow);

        // Filename row (informational)
        const fnRow = document.createElement("div");
        fnRow.className = "spk-ds-row";
        const fnLbl = document.createElement("span");
        fnLbl.className = "spk-ds-label";
        fnLbl.textContent = "Filename";
        const fnVal = document.createElement("span");
        fnVal.className = "spk-ds-filename";
        fnVal.textContent = (this._cfg.filename || "dataset") + "_{json|csv}";
        fnRow.appendChild(fnLbl);
        fnRow.appendChild(fnVal);
        el.appendChild(fnRow);

        // Metrics panel (populated by _refreshMetrics once upstream meta available)
        const metricsEl = document.createElement("div");
        metricsEl.className = "spk-ds-metrics";
        this._metricsEl = metricsEl;
        el.appendChild(metricsEl);

        // Window count
        const countEl = document.createElement("div");
        countEl.className = "spk-ds-count";
        countEl.textContent = "0 windows — stopped";
        this._countEl = countEl;
        el.appendChild(countEl);

        // Per-class breakdown
        const tableEl = document.createElement("div");
        tableEl.className = "spk-ds-table";
        this._tableEl = tableEl;
        el.appendChild(tableEl);

        // Button row: Start/Stop | Clear | Export JSON | Export CSV
        const btnRow = document.createElement("div");
        btnRow.className = "spk-ds-btnrow";

        const ssBtn = this._btn("Start", "spk-ds-btn-start", () => this._toggleCapture());
        this._startStopBtn = ssBtn;

        const clearBtn  = this._btn("Clear",       "spk-ds-btn-clear",  () => this._clear());
        const jsonBtn   = this._btn("Export JSON", "spk-ds-btn-export", () => this._exportJSON());
        const csvBtn    = this._btn("Export CSV",  "spk-ds-btn-export", () => this._exportCSV());

        btnRow.appendChild(ssBtn);
        btnRow.appendChild(clearBtn);
        btnRow.appendChild(jsonBtn);
        btnRow.appendChild(csvBtn);
        el.appendChild(btnRow);

        this._el = el;
        this._container.appendChild(el);
    }

    _btn(text, cls, onClick) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "spk-ds-btn " + cls;
        b.textContent = text;
        b.addEventListener("click", onClick);
        return b;
    }

    // ---- Actions ----------------------------------------------------------

    _toggleCapture() {
        const rt = this._rt();
        if (!rt) return;
        if (rt.isCapturing()) {
            rt.stopCapture();
        } else {
            rt.startCapture();
        }
        this._refresh();
    }

    _clear() {
        const rt = this._rt();
        if (rt && rt.clearWindows) { rt.clearWindows(); this._refresh(); }
    }

    // ---- Metrics ----------------------------------------------------------

    // Resolve the primary channel meta from the upstream runtime (in_0).
    // Returns null if the executor or graph is not ready.
    _primaryMeta() {
        const graph = this._executor && this._executor.graph;
        if (!graph || !this._nodeId) return null;
        const edges = graph.getInbound(this._nodeId, "in_0");
        if (!edges || !edges.length) return null;
        const edge = edges[0];
        const inst = this._executor.getNodeInstance(edge.from.nodeId);
        return (inst && typeof inst.getOutputMeta === "function")
            ? inst.getOutputMeta(edge.from.port)
            : null;
    }

    _refreshMetrics() {
        if (!this._metricsEl) return;
        const meta     = this._primaryMeta();
        const maxW     = (this._cfg && this._cfg.maxWindows) || 500;
        const cfg      = this._cfg || {};

        if (!meta) {
            this._metricsEl.innerHTML = "";
            return;
        }

        const rows = [];

        if (meta.kind === "spectrum") {
            // FFT mode: one frame = one row in CSV.
            // When hopSize < fftSize the window slides; frame rate = fs / hopSize.
            const hop     = meta.hopSize || meta.fftSize;
            const winDur  = meta.fftSize && meta.sampleRate
                ? (meta.fftSize / meta.sampleRate * 1000).toFixed(1) + " ms"
                : "—";
            const hopDur  = meta.sampleRate && hop
                ? (hop / meta.sampleRate * 1000).toFixed(1) + " ms"
                : "—";
            const frameHz = meta.sampleRate && hop
                ? (meta.sampleRate / hop).toFixed(2) + " frames/s"
                : "—";
            const capTime = meta.sampleRate && hop
                ? (maxW * hop / meta.sampleRate).toFixed(1) + " s"
                : "—";
            const overlap = (hop < meta.fftSize)
                ? Math.round((1 - hop / meta.fftSize) * 100) + " %"
                : "none";
            rows.push(["Mode",        "FFT frame (1 row/frame)"]);
            rows.push(["Window",      winDur]);
            rows.push(["Hop",         hopDur + "  (overlap: " + overlap + ")"]);
            rows.push(["Frame rate",  frameHz]);
            rows.push(["Resolution",  meta.resolution ? meta.resolution + " Hz/bin" : "—"]);
            rows.push(["Nyquist",     meta.nyquist    ? meta.nyquist    + " Hz"     : "—"]);
            rows.push(["Bins / row",  meta.bins !== undefined ? String(meta.bins)   : "—"]);
            rows.push(["Total time",  capTime]);
            rows.push(["Total rows",  String(maxW)]);
        } else {
            // Time-domain mode
            const winS   = cfg.windowS || 1.0;
            const sr     = meta.sampleRate || 0;
            const samplesPerWin = sr ? Math.round(winS * sr) : "?";
            const capTime = (maxW * winS).toFixed(1) + " s";
            rows.push(["Mode",           "Time-domain"]);
            rows.push(["Window",         winS.toFixed(3) + " s"]);
            rows.push(["Samples / row",  String(samplesPerWin)]);
            rows.push(["Sample rate",    sr ? sr + " Hz" : "—"]);
            rows.push(["Unit",           meta.unit || "—"]);
            rows.push(["Total time",     capTime]);
            rows.push(["Total rows",     String(maxW)]);
        }

        this._metricsEl.innerHTML = rows.map(function (r) {
            return '<div class="spk-ds-metric-row">' +
                '<span class="spk-ds-metric-key">'   + r[0] + '</span>' +
                '<span class="spk-ds-metric-val">'   + r[1] + '</span>' +
                '</div>';
        }).join("");
    }

    // ---- Polling ----------------------------------------------------------

    _startPoll() {
        this._pollId = setInterval(() => this._refresh(), 500);
    }

    _refresh() {
        this._refreshMetrics();
        const rt = this._rt();
        if (!rt) return;

        const capturing = rt.isCapturing ? rt.isCapturing() : false;
        const wins      = rt.getWindows  ? rt.getWindows()  : [];
        const total     = wins.length;
        const lbl       = rt.currentLabel ? rt.currentLabel() : (this._cfg.label || "healthy");

        // Start/Stop button
        if (this._startStopBtn) {
            this._startStopBtn.textContent = capturing ? "Stop" : "Start";
            this._startStopBtn.className   = "spk-ds-btn " + (capturing ? "spk-ds-btn-stop" : "spk-ds-btn-start");
        }

        // Active label (may change live when labelIndex is wired)
        if (this._activeLabelEl) this._activeLabelEl.textContent = lbl;

        // Count + state
        if (this._countEl) {
            this._countEl.textContent =
                total + " window" + (total !== 1 ? "s" : "") +
                (capturing ? " — capturing" : " — stopped");
            this._countEl.className = "spk-ds-count" + (capturing ? " spk-ds-capturing" : "");
        }

        // Per-class breakdown
        if (this._tableEl) {
            const counts = new Map();
            wins.forEach(function (w) {
                counts.set(w.label, (counts.get(w.label) || 0) + 1);
            });
            this._tableEl.innerHTML = "";
            counts.forEach((n, cls) => {
                const row = document.createElement("div");
                row.className = "spk-ds-class-row";
                row.innerHTML =
                    '<span class="spk-ds-class-name">' + cls + '</span>' +
                    '<span class="spk-ds-class-count">' + n + '</span>';
                this._tableEl.appendChild(row);
            });
        }
    }

    // ---- Export -----------------------------------------------------------

    _filename() {
        return (this._cfg && this._cfg.filename) ? String(this._cfg.filename) : "dataset";
    }

    _channelNames() {
        return ((this._cfg && this._cfg.channelNames) || "")
            .split(",").map(function (s) { return s.trim(); });
    }

    // Build per-channel metadata by traversing the graph from the
    // DatasetCapture node's input ports to the upstream runtimes.
    // Each upstream runtime exposes getOutputMeta(portName) which returns a
    // descriptor built from its own configuration (sampleRate, units, label,
    // frequencyAxis for FFT, etc.). No inference from channel shape needed.
    _channelMeta(firstWindow) {
        const graph    = this._executor && this._executor.graph;
        const names    = this._channelNames();

        return firstWindow.channels.map((ch, ci) => {
            const portName   = "in_" + ci;
            const fallback   = names[ci] || ("ch" + ci);
            const numBins    = ch.length;

            // Walk the inbound edge for this port to find the upstream runtime.
            let runtimeMeta = null;
            if (graph) {
                const edges = graph.getInbound(this._nodeId, portName);
                if (edges && edges.length) {
                    const edge = edges[0];
                    const inst = this._executor.getNodeInstance(edge.from.nodeId);
                    if (inst && typeof inst.getOutputMeta === "function") {
                        runtimeMeta = inst.getOutputMeta(edge.from.port);
                    }
                }
            }

            const meta = runtimeMeta || {};
            const name = meta.label || fallback;

            if (meta.kind === "spectrum" && meta.frequencyAxis) {
                return {
                    name,
                    numBins,
                    isSpectrum:  true,
                    unit:        meta.unit        || "magnitude",
                    freqAxis:    meta.frequencyAxis,
                    sampleRate:  meta.sampleRate   || 0,
                    fftSize:     meta.fftSize      || 0,
                    resolution:  meta.resolution   || 0,
                    nyquist:     meta.nyquist      || 0,
                };
            }
            return {
                name,
                numBins,
                isSpectrum: false,
                unit:       meta.unit       || "",
                sampleRate: meta.sampleRate || 0,
                freqAxis:   null,
            };
        });
    }

    // Build flat column names for the CSV header.
    // First three columns are always "label", "t_us" (integer Unix µs, exact),
    // "t_s" (float seconds, human-readable). Then channel data follows.
    // Scalar channels  → one column named after the channel.
    // Spectrum channels → one column per bin: "fft_0.0Hz", "fft_4.9Hz", ...
    _csvColumns(meta) {
        const cols = ["label", "t_us", "t_s"];
        meta.forEach(function (m) {
            if (!m.isSpectrum) {
                cols.push(m.name);
            } else {
                m.freqAxis.forEach(function (f) {
                    cols.push(m.name + "_" + f + "Hz");
                });
            }
        });
        return cols;
    }

    _exportJSON() {
        const rt = this._rt();
        if (!rt) return;
        const wins = rt.getWindows ? rt.getWindows() : [];
        if (!wins.length) { alert("No windows captured yet."); return; }

        const sampleRate = (this._executor && this._executor.sampleRateHz) || 5000;
        const meta       = this._channelMeta(wins[0]);

        const captureStartS  = rt.getCaptureStartEpochS  ? rt.getCaptureStartEpochS()  : 0;
        const captureStartUs = rt.getCaptureStartEpochUs ? rt.getCaptureStartEpochUs() : 0;
        const out = {
            sampleRate:           sampleRate,
            // Absolute wall-clock anchors for cross-file correlation.
            // tUs on each window = integer Unix microseconds of its first sample.
            // At 5 kHz (200 µs/sample) integer µs is exact; float seconds loses
            // sub-sample precision at 10^9 magnitude.
            captureStartEpochUs:  captureStartUs,
            captureStartEpochS:   captureStartS,
            captureStartISO:      new Date(captureStartS * 1000).toISOString(),
            exportedAt:           new Date().toISOString(),
            classes:             rt.getClasses ? rt.getClasses() : [],
            channels:            meta.map(function (m) {
                const ch = { name: m.name, bins: m.numBins };
                if (m.isSpectrum) ch.frequencyAxis = m.freqAxis;
                return ch;
            }),
            windows: wins.map(function (w) {
                return { label: w.label, t: w.t || 0, tUs: w.tUs || 0, channels: w.channels };
            }),
        };
        this._download(
            this._filename() + "_" + Date.now() + ".json",
            JSON.stringify(out, null, 2),
            "application/json",
        );
    }

    _exportCSV() {
        const rt = this._rt();
        if (!rt) return;
        const wins = rt.getWindows ? rt.getWindows() : [];
        if (!wins.length) { alert("No windows captured yet."); return; }

        const sampleRate = (this._executor && this._executor.sampleRateHz) || 5000;
        const meta       = this._channelMeta(wins[0]);
        const cols       = this._csvColumns(meta);
        const rows       = [];

        // Metadata comment block — pandas skips with comment='#',
        // Excel ignores rows starting with #.
        rows.push("# sampleRate=" + sampleRate);
        rows.push("# classes="    + (rt.getClasses ? rt.getClasses().join(",") : ""));
        rows.push("# channels="   + meta.map(function (m) { return m.name; }).join(","));
        meta.forEach(function (m) {
            if (m.isSpectrum) {
                rows.push("# " + m.name + ".bins=" + m.numBins);
                rows.push("# " + m.name + ".nyquist=" + m.freqAxis[m.freqAxis.length - 1] + "Hz");
                rows.push("# " + m.name + ".resolution=" +
                    (m.freqAxis.length > 1
                        ? (m.freqAxis[1] - m.freqAxis[0]).toFixed(2)
                        : "0") + "Hz");
            }
        });
        rows.push("# windowCount=" + wins.length);
        // Capture-start anchor: absolute wall-clock time when Start was pressed.
        // t column in data rows = captureStartEpochS + offset_within_session.
        // Two files with different captureStartEpochS can be correlated via t.
        const captureStartS = rt.getCaptureStartEpochS ? rt.getCaptureStartEpochS() : 0;
        rows.push("# captureStartEpochS=" + captureStartS.toFixed(3));
        rows.push("# captureStartISO="    + new Date(captureStartS * 1000).toISOString());
        rows.push("# exportedAt="         + new Date().toISOString());

        // Data header + rows
        rows.push(cols.join(","));
        wins.forEach(function (w) {
            const parts = [
                w.label,
                w.tUs !== undefined ? String(w.tUs) : "0",            // integer µs — no rounding
                typeof w.t === "number" ? w.t.toFixed(6) : "0.000000", // float s
            ];
            w.channels.forEach(function (ch) {
                ch.forEach(function (v) {
                    parts.push(typeof v === "number" ? v.toFixed(6) : String(v));
                });
            });
            rows.push(parts.join(","));
        });

        this._download(
            this._filename() + "_" + Date.now() + ".csv",
            rows.join("\n"),
            "text/csv",
        );
    }

    _download(filename, text, mimeType) {
        const blob = new Blob([text], { type: mimeType });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    // ---- Lifecycle --------------------------------------------------------

    setSampleRateHz(_fs) {}

    destroy() {
        if (this._pollId) { clearInterval(this._pollId); this._pollId = null; }
        if (this._el && this._el.parentNode) this._el.parentNode.removeChild(this._el);
        this._el = null;
    }
}
