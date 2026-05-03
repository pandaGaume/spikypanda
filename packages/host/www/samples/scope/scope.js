// SpikyPanda Scope sink — thin shell around ScopeWidget.
//
// All the rendering + bus subscription logic lives in
// /js/scope-widget.js so the same code runs both in this standalone page
// and in the editor's Play-mode bottom panel. This file only handles
// page-level concerns: parsing URL params, fetching the graph, resolving
// the upstream stream id, and instantiating one widget.

import { StreamBus } from "../../js/stream-bus.js";
import { SpikypandaGraph, GraphChannel } from "../../js/spikypanda-graph.js";
import { ScopeWidget } from "../../js/scope-widget.js";

(function () {
    "use strict";

    var bus = new StreamBus({ workerUrl: "../../js/registry-worker.js" });
    var graphChannel = new GraphChannel();

    var els = {};
    var state = {
        connected: false,
        nodeId: null,
        graph: null,
        upstreamStreamId: null,
        widget: null,
    };

    function $(id) { return document.getElementById(id); }
    function log(msg) {
        var ts = new Date().toLocaleTimeString();
        els.log.textContent += "[" + ts + "] " + msg + "\n";
        els.log.scrollTop = els.log.scrollHeight;
    }

    // ---- Bind to graph node ---------------------------------------------
    function bindToGraph(graphJsonString) {
        try {
            state.graph = SpikypandaGraph.parse(graphJsonString);
        } catch (e) {
            log("Graph parse failed: " + e.message);
            return false;
        }
        var node = state.graph.getNode(state.nodeId);
        if (!node) {
            log("Node '" + state.nodeId + "' not found in graph.");
            return false;
        }
        var streamId = state.graph.upstreamStreamId(state.nodeId, "in");
        if (!streamId) {
            log("No inbound edge on 'in' port for this Scope; nothing to subscribe to.");
            els.subInfo.textContent = "Scope is not wired. Connect a stream in the editor and re-run.";
            return false;
        }
        state.upstreamStreamId = streamId;
        // Spin up (or retarget) the widget. Title and timeSpan come from
        // the node's stored config.
        var timeSpanS = (node.config && node.config.timeSpanS) || 0.04;
        if (!state.widget) {
            state.widget = new ScopeWidget(els.scopeMount, {
                bus: bus,
                streamId: streamId,
                timeSpanS: timeSpanS,
                title: "Scope: " + node.label,
                showHeader: true,
            });
            state.widget.start();
        } else {
            state.widget.setTitle("Scope: " + node.label);
            state.widget.setTimeSpanS(timeSpanS);
            state.widget.setStream(streamId);
        }
        els.subInfo.innerHTML = "Subscribed to <code>" + streamId + "</code>.";
        log("Bound to node " + state.nodeId + ", subscribing to " + streamId + ".");
        return true;
    }

    // ---- Bus wiring -----------------------------------------------------
    bus.on("connected", function () {
        state.connected = true;
        log("Bus connected.");
        // Subscription happens inside the widget; just ask for the stream
        // list so we can grab the sample rate from upstream's meta.
        bus.listStreams();
    });
    bus.on("streams", function (m) { applyStreamsList(m.streams || []); });
    bus.on("streams-updated", function (m) { applyStreamsList(m.streams || []); });

    function applyStreamsList(list) {
        if (!state.widget || !state.upstreamStreamId) return;
        var s = list.find(function (x) { return x.streamId === state.upstreamStreamId; });
        if (s && s.meta && s.meta.sampleRateHz) {
            state.widget.setSampleRateHz(s.meta.sampleRateHz);
        }
    }

    // ---- Init -----------------------------------------------------------
    function init() {
        els.scopeMount = $("scopeMount");
        els.subInfo = $("subInfo");
        els.log = $("log");

        var params = new URLSearchParams(window.location.search);
        state.nodeId = params.get("nodeId");
        var graphUrl = params.get("graph");

        if (!state.nodeId) {
            els.subInfo.textContent =
                "No nodeId in URL. Open this Scope from the node editor (click Open on a Scope node) or use the editor's Play mode for in-place preview.";
            log("No nodeId; idle.");
            return;
        }
        if (graphUrl) {
            fetch(graphUrl).then(function (r) { return r.text(); }).then(function (txt) {
                bindToGraph(txt);
            }).catch(function (err) {
                log("?graph= fetch failed (" + err.message + "); requesting snapshot.");
                graphChannel.requestSnapshot();
            });
        } else {
            log("?nodeId set but no ?graph= URL; waiting for editor snapshot.");
            graphChannel.requestSnapshot();
        }

        graphChannel.onSnapshot(function (m) {
            if (state.graph || !state.nodeId) return;
            if (m && m.graph) bindToGraph(m.graph);
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
