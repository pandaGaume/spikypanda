// SpikyPanda - Labeled Dataset Capture
//
// Generic consumer of any stream published on the SharedWorker registry.
// User picks a stream, sets a label + window length + count, and records
// N labeled windows for download as CSV or JSON. The page does not know
// or care what produced the stream; it relies on the meta the producer
// registered (sampleRateHz, units, kind, ...). The same flow works for
// motor current, vibration, mox, anything with a numeric scalar payload.
// Relative paths so the dev server's document-root choice does not matter;
// all pages still resolve to the same absolute URL, which is what the
// SharedWorker spec needs to share state across tabs.
import { StreamBus } from "../../js/stream-bus.js";

(function () {
    "use strict";

    var bus = new StreamBus({ workerUrl: "../../js/registry-worker.js" });

    // ---- Strings (single source of truth, future-i18n) ------------------
    var STRINGS = {
        log: {
            connected:        "Connected to stream registry. {0} stream(s) currently live.",
            streamsUpdated:   "Streams updated: {0} live.",
            subscribed:       "Subscribed to '{0}' (sampleRateHz={1}).",
            unsubscribed:     "Unsubscribed from '{0}'.",
            captureStart:     "Capture started: label='{0}', window={1}s, count={2}, fs={3} Hz.",
            captureWindow:    "Window {0}/{1} captured ({2} samples).",
            captureDone:      "Capture complete: {0} window(s).",
            captureStopped:   "Capture stopped at {0}/{1}.",
            downloadDone:     "Downloaded {0} ({1} window(s), {2} bytes).",
            streamGone:       "Subscribed stream '{0}' disappeared from the registry.",
            ready:            "Ready. Pick a stream and hit Subscribe.",
        },
        pickerEmpty:     "(no streams)",
        btnSubscribe:    "Subscribe",
        btnUnsubscribe:  "Unsubscribe",
        subIdle:         "Idle",
        subLive:         "Live · {0} Hz",
        statusIdle:      "Idle",
        statusCapturing: "Capturing {0}/{1} ({2} samples buffered)",
        statusDone:      "Done: {0} window(s)",
        statusStopped:   "Stopped at {0}/{1}",
        statusError:     "Error: {0}",
        validLabel:      "Please enter a label",
        validWindow:     "Invalid window length",
        validCount:      "Invalid count",
        validNoStream:   "Pick a stream first",
        validNotSubbed:  "Subscribe to a stream first",
    };

    // ---- State ----------------------------------------------------------
    // 8192 sample preview ring; same length as the source page so the
    // visual time-domain feel matches.
    var PREVIEW_LEN = 8192;
    var state = {
        connected: false,
        streams: [],                   // last list reported by the registry
        // Selection: what is highlighted in the picker. Subscription: what
        // we are actively getting data from. Decoupled so the user can
        // browse the meta of a stream before committing to subscribe.
        selectedStreamId: null,
        selectedStreamMeta: null,
        subscribedStreamId: null,
        sampleRateHz: 0,               // pulled from the SUBSCRIBED stream meta
        // Live preview ring buffer.
        preview: {
            buffer: new Float32Array(PREVIEW_LEN),
            pos: 0,
            filled: 0,
            lastValue: 0,
        },
        // Capture pipeline. We accumulate raw sample values into `pending`
        // and slice off whole windows of `windowSize` samples at a time.
        capture: {
            active: false,
            label: "",
            windowSize: 0,             // samples per window
            target: 0,                 // total windows wanted
            format: "json",
            pending: [],               // mutable Array of values waiting to fill a window
            pendingFirstT: 0,          // simTime of pending[0]
            dt: 0,                     // sample period
            windows: [],               // [{ firstT, samples }]
            scenarioMeta: null,        // snapshot of stream meta at Start
            streamId: null,            // remember which stream we recorded from
            streamName: null,
        },
    };

    var els = {};

    // ---- Helpers --------------------------------------------------------
    function $(id) { return document.getElementById(id); }
    function fmt(tpl) {
        var a = arguments;
        return tpl.replace(/\{(\d+)\}/g, function (_, i) { return a[+i + 1]; });
    }
    function log(msg) {
        var ts = new Date().toLocaleTimeString();
        els.log.textContent += "[" + ts + "] " + msg + "\n";
        els.log.scrollTop = els.log.scrollHeight;
    }
    function setStatus(msg, cls) {
        els.captureStatus.textContent = msg;
        els.captureStatus.className = "capture-status" + (cls ? " " + cls : "");
    }

    // ---- Stream picker --------------------------------------------------
    // Picker just selects; the Subscribe button is what actually wires the
    // bus subscription. No auto-subscribe to the first available stream.
    function renderPicker() {
        var sel = els.streamPicker;
        var prevSelected = state.selectedStreamId;
        sel.innerHTML = "";
        if (!state.streams.length) {
            var o = document.createElement("option");
            o.value = ""; o.textContent = STRINGS.pickerEmpty;
            sel.appendChild(o);
            sel.disabled = true;
            renderSubscribeBtn();
            return;
        }
        sel.disabled = false;
        // Empty placeholder so "no selection" is a valid first state and the
        // user has to actively pick something.
        var blank = document.createElement("option");
        blank.value = ""; blank.textContent = "(pick a stream...)";
        sel.appendChild(blank);
        state.streams.forEach(function (s) {
            var o = document.createElement("option");
            o.value = s.streamId;
            var rate = (s.meta && s.meta.sampleRateHz) ? s.meta.sampleRateHz + " Hz" : "?";
            var units = (s.meta && s.meta.units) ? s.meta.units : "";
            o.textContent = s.name + " (" + rate + (units ? ", " + units : "") + ")";
            sel.appendChild(o);
        });
        // Keep the previously-selected entry selected if it still exists.
        // Otherwise leave the blank placeholder selected; never auto-subscribe.
        if (prevSelected && state.streams.some(function (s) { return s.streamId === prevSelected; })) {
            sel.value = prevSelected;
        } else {
            sel.value = "";
            state.selectedStreamId = null;
            state.selectedStreamMeta = null;
        }
        renderStreamMeta();
        renderSubscribeBtn();
    }

    function onPickerChange() {
        var newId = els.streamPicker.value;
        if (!newId) {
            state.selectedStreamId = null;
            state.selectedStreamMeta = null;
        } else {
            var s = state.streams.find(function (x) { return x.streamId === newId; });
            state.selectedStreamId = newId;
            state.selectedStreamMeta = (s && s.meta) || {};
        }
        renderStreamMeta();
        renderSubscribeBtn();
    }

    function subscribeSelected() {
        if (!state.selectedStreamId) return;
        // If already subscribed to something else, drop that first so we
        // only ever hold one live subscription per page.
        if (state.subscribedStreamId && state.subscribedStreamId !== state.selectedStreamId) {
            bus.unsubscribe(state.subscribedStreamId);
            log(fmt(STRINGS.log.unsubscribed, state.subscribedStreamId));
        }
        var id = state.selectedStreamId;
        var s = state.streams.find(function (x) { return x.streamId === id; });
        state.subscribedStreamId = id;
        state.sampleRateHz = (s && s.meta && s.meta.sampleRateHz) || 0;
        state.preview.pos = 0;
        state.preview.filled = 0;
        bus.subscribe(id);
        log(fmt(STRINGS.log.subscribed, s ? s.name : id, state.sampleRateHz));
        els.canvasTime.classList.remove("idle");
        renderSubscribeBtn();
        renderStats();
    }

    function unsubscribeCurrent() {
        if (!state.subscribedStreamId) return;
        var id = state.subscribedStreamId;
        bus.unsubscribe(id);
        log(fmt(STRINGS.log.unsubscribed, id));
        state.subscribedStreamId = null;
        state.sampleRateHz = 0;
        els.canvasTime.classList.add("idle");
        // If a capture was running on this subscription, end it cleanly.
        if (state.capture.active) finishCapture(true);
        renderSubscribeBtn();
        renderStats();
    }

    function onSubscribeClick() {
        if (state.subscribedStreamId) {
            unsubscribeCurrent();
        } else {
            subscribeSelected();
        }
    }

    function renderSubscribeBtn() {
        var subbed = !!state.subscribedStreamId;
        // Enabled when: connected AND (subbed OR a non-empty selection).
        var enable = state.connected && (subbed || !!state.selectedStreamId);
        els.btnSubscribe.disabled = !enable;
        els.btnSubscribe.textContent = subbed ? STRINGS.btnUnsubscribe : STRINGS.btnSubscribe;
        if (els.subStatus) {
            if (subbed) {
                els.subStatus.textContent = fmt(STRINGS.subLive, state.sampleRateHz || "?");
                els.subStatus.className = "capture-status capturing";
            } else {
                els.subStatus.textContent = STRINGS.subIdle;
                els.subStatus.className = "capture-status";
            }
        }
    }

    function renderStreamMeta() {
        if (!els.streamMeta) return;
        if (!state.selectedStreamMeta) {
            els.streamMeta.textContent = "(no stream selected)";
            return;
        }
        els.streamMeta.textContent = JSON.stringify(state.selectedStreamMeta, null, 2);
    }

    // ---- Live preview ---------------------------------------------------
    // Stream payload arrives as { samples, firstT, dt }. We drop into a
    // ring buffer and let an rAF loop redraw at ~60 Hz; doing the redraw
    // inside the message handler would tie repaints to the producer rate.
    function ingest(payload) {
        if (!payload || !payload.samples) return;
        var samples = payload.samples;
        var n = samples.length;
        if (state.capture.active) {
            // Append to the capture buffer; slicing into windows happens
            // in flushCaptureWindows() below.
            for (var k = 0; k < n; k++) state.capture.pending.push(samples[k]);
            if (state.capture.pending.length === n) {
                // First chunk of this run; remember the absolute firstT.
                state.capture.pendingFirstT = (payload.firstT || 0);
                state.capture.dt = (payload.dt || 0);
            }
            flushCaptureWindows();
        }
        for (var i = 0; i < n; i++) {
            var v = samples[i];
            state.preview.buffer[state.preview.pos] = v;
            state.preview.pos = (state.preview.pos + 1) % PREVIEW_LEN;
            state.preview.lastValue = v;
        }
        if (state.preview.filled < PREVIEW_LEN) {
            state.preview.filled = Math.min(PREVIEW_LEN, state.preview.filled + n);
        }
    }

    // ---- Time canvas ---------------------------------------------------
    // Same approach as the source page (cheap line plot, autoranged) so
    // the two pages feel identical visually.
    function renderTime() {
        var c = els.canvasTime;
        var w = c.width, h = c.height;
        var ctx = c.getContext("2d");
        ctx.fillStyle = "#0a0a1a";
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = "rgba(255,255,255,0.07)";
        ctx.lineWidth = 1;
        for (var g = 0; g <= 4; g++) {
            var gy = (g / 4) * h;
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
        }
        var n = state.preview.filled;
        if (n < 2) return;
        // Read in chronological order.
        var buf = new Float32Array(n);
        var p = state.preview.pos;
        var start = (p - n + PREVIEW_LEN) % PREVIEW_LEN;
        for (var i = 0; i < n; i++) buf[i] = state.preview.buffer[(start + i) % PREVIEW_LEN];

        var lo = Infinity, hi = -Infinity;
        for (var k = 0; k < n; k++) {
            var v = buf[k];
            if (v < lo) lo = v;
            if (v > hi) hi = v;
        }
        if (!isFinite(lo) || hi - lo < 1e-6) { lo = -1; hi = 1; }
        var pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
        ctx.strokeStyle = "#00d4ff";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (var j = 0; j < n; j++) {
            var x = (j / (n - 1)) * w;
            var y = h - ((buf[j] - lo) / (hi - lo)) * h;
            if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.fillStyle = "#888";
        ctx.font = "10px monospace";
        var units = (state.selectedStreamMeta && state.selectedStreamMeta.units) || "";
        ctx.fillText(hi.toFixed(2) + (units ? " " + units : ""), 4, 11);
        ctx.fillText(lo.toFixed(2) + (units ? " " + units : ""), 4, h - 4);
    }

    function renderStats() {
        var rate = state.sampleRateHz || "?";
        var cap = state.capture.active
            ? " · capturing " + state.capture.windows.length + "/" + state.capture.target
            : "";
        els.signalStats.innerHTML =
            "<span>fs <strong>" + rate + " Hz</strong></span>" +
            "<span>filled <strong>" + state.preview.filled + " / " + PREVIEW_LEN + "</strong></span>" +
            "<span>last <strong>" + state.preview.lastValue.toFixed(3) + "</strong></span>" +
            (cap ? "<span>" + cap + "</span>" : "");
    }

    // ---- Capture --------------------------------------------------------
    // We do not cut the stream itself; we drain whole windows out of the
    // pending buffer as samples arrive. This keeps the capture rate locked
    // to the producer's sample clock without any drift.
    function flushCaptureWindows() {
        var c = state.capture;
        while (c.pending.length >= c.windowSize && c.windows.length < c.target) {
            var samples = c.pending.splice(0, c.windowSize);
            var firstT = c.pendingFirstT;
            // Advance pendingFirstT by the samples consumed.
            c.pendingFirstT = firstT + c.windowSize * c.dt;
            c.windows.push({ firstT: firstT, samples: samples });
            log(fmt(STRINGS.log.captureWindow, c.windows.length, c.target, samples.length));
        }
        renderStats();
        if (state.capture.active) {
            setStatus(fmt(STRINGS.statusCapturing, c.windows.length, c.target, c.pending.length), "capturing");
        }
        if (c.windows.length >= c.target) {
            finishCapture(false);
        }
    }

    function startCapture() {
        if (state.capture.active) return;
        if (!state.subscribedStreamId) { alert(STRINGS.validNotSubbed); return; }
        var label = els.capLabel.value.trim();
        var windowS = parseFloat(els.capWindow.value);
        var count = parseInt(els.capCount.value, 10);
        if (!label) { alert(STRINGS.validLabel); return; }
        if (!isFinite(windowS) || windowS <= 0) { alert(STRINGS.validWindow); return; }
        if (!isFinite(count) || count <= 0) { alert(STRINGS.validCount); return; }
        var fs = state.sampleRateHz;
        if (!fs || fs <= 0) { alert("Stream did not advertise a sample rate."); return; }

        state.capture.active = true;
        state.capture.label = label;
        state.capture.windowSize = Math.max(1, Math.round(windowS * fs));
        state.capture.target = count;
        state.capture.format = els.capFormat.value;
        state.capture.pending = [];
        state.capture.pendingFirstT = 0;
        state.capture.dt = 1 / fs;
        state.capture.windows = [];
        // Snapshot meta from the SUBSCRIBED stream so the capture is
        // self-describing even if the user later switches subscriptions.
        var s = state.streams.find(function (x) { return x.streamId === state.subscribedStreamId; });
        state.capture.scenarioMeta = (s && s.meta) || {};
        state.capture.streamId = state.subscribedStreamId;
        state.capture.streamName = s ? s.name : state.subscribedStreamId;

        els.btnStart.disabled = true;
        els.btnStop.disabled = false;
        els.btnDownload.disabled = true;
        setStatus(fmt(STRINGS.statusCapturing, 0, count, 0), "capturing");
        log(fmt(STRINGS.log.captureStart, label, windowS, count, fs));
    }

    function stopCapture() {
        if (!state.capture.active) return;
        finishCapture(true);
    }

    function finishCapture(stopped) {
        var c = state.capture;
        c.active = false;
        var hasData = c.windows.length > 0;
        els.btnStart.disabled = false;
        els.btnStop.disabled = true;
        els.btnDownload.disabled = !hasData;
        if (stopped) {
            setStatus(fmt(STRINGS.statusStopped, c.windows.length, c.target),
                      hasData ? "done" : null);
            log(fmt(STRINGS.log.captureStopped, c.windows.length, c.target));
        } else {
            setStatus(fmt(STRINGS.statusDone, c.windows.length), "done");
            log(fmt(STRINGS.log.captureDone, c.windows.length));
        }
    }

    // ---- Download -------------------------------------------------------
    // Self-contained format. Every file carries its own meta so downstream
    // consumers can use it without knowing the producer page.
    function buildJson() {
        var c = state.capture;
        return JSON.stringify({
            format: "spikypanda.dataset.v1",
            label: c.label,
            sampleRateHz: state.sampleRateHz,
            streamId: c.streamId,
            streamName: c.streamName,
            streamMeta: c.scenarioMeta,
            windows: c.windows,
            createdAt: new Date().toISOString(),
        }, null, 2);
    }

    function buildCsv() {
        var c = state.capture;
        var lines = [];
        // Header comments carry the meta in a parser-friendly way (lines
        // starting with `#` are commonly skipped by pandas / Excel).
        lines.push("# format=spikypanda.dataset.v1");
        lines.push("# label=" + c.label);
        lines.push("# sampleRateHz=" + state.sampleRateHz);
        lines.push("# streamId=" + c.streamId);
        lines.push("# streamName=" + JSON.stringify(c.streamName));
        lines.push("# streamMeta=" + JSON.stringify(c.scenarioMeta));
        lines.push("windowIdx,sampleIdx,t,value");
        for (var w = 0; w < c.windows.length; w++) {
            var win = c.windows[w];
            for (var i = 0; i < win.samples.length; i++) {
                var t = win.firstT + i * c.dt;
                lines.push(w + "," + i + "," + t.toFixed(6) + "," + win.samples[i]);
            }
        }
        return lines.join("\n");
    }

    function download() {
        var c = state.capture;
        if (!c.windows.length) return;
        var content, mime, ext;
        if (c.format === "json") {
            content = buildJson(); mime = "application/json"; ext = "json";
        } else {
            content = buildCsv(); mime = "text/csv"; ext = "csv";
        }
        var blob = new Blob([content], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = c.label + "." + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        log(fmt(STRINGS.log.downloadDone, a.download, c.windows.length, content.length));
    }

    // ---- Bus wiring -----------------------------------------------------
    bus.on("connected", function () {
        state.connected = true;
        bus.listStreams();
        renderSubscribeBtn();
    });
    bus.on("streams", function (m) {
        state.streams = m.streams || [];
        renderPicker();
        log(fmt(STRINGS.log.connected, state.streams.length));
    });
    bus.on("streams-updated", function (m) {
        state.streams = m.streams || [];
        renderPicker();
        // If the stream we are subscribed to disappeared, drop the sub.
        if (state.subscribedStreamId &&
            !state.streams.some(function (s) { return s.streamId === state.subscribedStreamId; })) {
            log(fmt(STRINGS.log.streamGone, state.subscribedStreamId));
            state.subscribedStreamId = null;
            state.sampleRateHz = 0;
            els.canvasTime.classList.add("idle");
            if (state.capture.active) finishCapture(true);
            renderSubscribeBtn();
        }
    });
    // Forward all stream data into the ingest pipeline. The bus filters by
    // our subscriptions on the worker side so we only get what we asked for.
    bus.onData("*", function (payload) { ingest(payload); });

    // ---- rAF render loop ------------------------------------------------
    function tick() {
        renderTime();
        renderStats();
        requestAnimationFrame(tick);
    }

    // ---- Init -----------------------------------------------------------
    function init() {
        els.canvasTime = $("canvasTime");
        els.signalStats = $("signalStats");
        els.streamPicker = $("streamPicker");
        els.streamMeta = $("streamMeta");
        els.btnRefresh = $("btnRefresh");
        els.btnSubscribe = $("btnSubscribe");
        els.subStatus = $("subStatus");
        els.capLabel = $("capLabel");
        els.capWindow = $("capWindow");
        els.capCount = $("capCount");
        els.capFormat = $("capFormat");
        els.btnStart = $("btnStart");
        els.btnStop = $("btnStop");
        els.btnDownload = $("btnDownload");
        els.captureStatus = $("captureStatus");
        els.log = $("log");

        els.streamPicker.onchange = onPickerChange;
        els.btnRefresh.onclick = function () { bus.listStreams(); };
        els.btnSubscribe.onclick = onSubscribeClick;
        els.btnStart.onclick = startCapture;
        els.btnStop.onclick = stopCapture;
        els.btnDownload.onclick = download;

        renderPicker();
        renderStreamMeta();
        renderSubscribeBtn();
        setStatus(STRINGS.statusIdle);
        els.canvasTime.classList.add("idle");
        log(STRINGS.log.ready);
        requestAnimationFrame(tick);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
