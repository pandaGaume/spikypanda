// Standalone graph-runner page — thin shell around GraphExecutor.
//
// All build/tick/publish logic lives in /js/graph-executor.js so the
// editor's Play mode can reuse it. This file only handles:
//   - Reading ?graph=<url> or accepting a file drop.
//   - Bootstrapping a StreamBus + GraphExecutor.
//   - Rendering the streams table and Run/Stop buttons.
//
// Per-source motor run/stop control lands in the editor's Play mode
// (Phase 4d). The standalone runner runs every source at full speed.

import { StreamBus } from "../../js/stream-bus.js";
import { GraphChannel } from "../../js/spikypanda-graph.js";
import { GraphExecutor } from "../../js/graph-executor.js";

(function () {
    "use strict";

    var bus = new StreamBus({ workerUrl: "../../js/registry-worker.js" });
    var graphChannel = new GraphChannel();

    var els = {};
    var state = {
        executor: null,
        connected: false,
    };

    function $(id) { return document.getElementById(id); }
    function log(msg) {
        var ts = new Date().toLocaleTimeString();
        els.log.textContent += "[" + ts + "] " + msg + "\n";
        els.log.scrollTop = els.log.scrollHeight;
    }
    function setStatus(msg, cls) {
        els.status.textContent = msg;
        els.status.className = "capture-status" + (cls ? " " + cls : "");
    }

    // ---- Build / Run / Stop ---------------------------------------------
    function buildExecutor(graphJson) {
        if (state.executor) {
            try { state.executor.stop(); } catch (_e) { /* ignore */ }
            state.executor = null;
        }
        state.executor = new GraphExecutor(graphJson, {
            bus: bus,
            onError: function (err) {
                log("Executor error: " + err.message);
                setStatus("Error", "error");
            },
            onLog: function (msg) { log(msg); },
            onStreamUpdate: function (streams) { renderStreamsTable(streams); },
        });
        var ok = state.executor.build();
        if (ok) {
            setStatus("Loaded", "done");
            els.btnRun.disabled = !state.connected;
        }
        return ok;
    }

    function run() {
        if (!state.executor) { setStatus("No graph loaded", "error"); return; }
        if (!state.connected) { setStatus("Bus not connected", "error"); return; }
        if (state.executor.start()) {
            els.btnRun.disabled = true;
            els.btnStop.disabled = false;
            setStatus("Running", "running");
        }
    }

    function stop() {
        if (!state.executor) return;
        state.executor.pause();
        els.btnRun.disabled = false;
        els.btnStop.disabled = true;
        setStatus("Stopped", "done");
    }

    // ---- UI -------------------------------------------------------------
    function renderStreamsTable(streams) {
        var tb = els.streamsTable.querySelector("tbody");
        tb.innerHTML = "";
        var live = state.executor && state.executor.isRunning;
        (streams || []).forEach(function (row) {
            var tr = document.createElement("tr");
            tr.className = live ? "live" : "idle";
            tr.innerHTML =
                "<td><code>" + row.streamId + "</code></td>" +
                "<td>" + row.op + "</td>" +
                "<td>" + row.port + "</td>" +
                "<td class='numeric'>" + row.count.toLocaleString() + "</td>" +
                "<td class='numeric'>" + row.subs + "</td>";
            tb.appendChild(tr);
        });
    }

    // ---- Bus wiring -----------------------------------------------------
    bus.on("connected", function () {
        state.connected = true;
        log("Bus connected.");
        if (state.executor) els.btnRun.disabled = false;
    });

    // ---- Init -----------------------------------------------------------
    function init() {
        els.fileInput = $("fileInput");
        els.btnRun = $("btnRun");
        els.btnStop = $("btnStop");
        els.status = $("status");
        els.streamsTable = $("streamsTable");
        els.log = $("log");

        els.fileInput.addEventListener("change", function () {
            var f = els.fileInput.files[0];
            if (!f) return;
            f.text().then(function (txt) { buildExecutor(txt); });
        });
        els.btnRun.onclick = run;
        els.btnStop.onclick = stop;

        var params = new URLSearchParams(window.location.search);
        var graphUrl = params.get("graph");
        if (graphUrl) {
            fetch(graphUrl).then(function (r) { return r.text(); }).then(function (txt) {
                buildExecutor(txt);
            }).catch(function (err) {
                log("?graph= fetch failed (" + err.message + "); requesting snapshot from editor.");
                graphChannel.requestSnapshot();
            });
        } else {
            graphChannel.requestSnapshot();
        }
        graphChannel.onSnapshot(function (m) {
            if (state.executor) return;
            if (!m || !m.graph) return;
            buildExecutor(m.graph);
        });

        setStatus("Idle");
        log("Runner ready. Pass ?graph=<url>, drop a .spikypanda file, or wait for editor snapshot.");
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
