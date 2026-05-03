/* global NODEEDITOR, ONNX_EDITOR */

import { OPS_V1, findOp, buildNodeDef, generateNodeId, opsByCategory } from "../../js/spikypanda-ops.js";
import { GraphChannel } from "../../js/spikypanda-graph.js";
import { StreamBus } from "../../js/stream-bus.js";
import { GraphExecutor } from "../../js/graph-executor.js";
import { ScopeWidget } from "../../js/scope-widget.js";

(function () {
    "use strict";

    const container = document.getElementById("editor-container");
    const toolbar = document.getElementById("toolbar");
    const editor = new NODEEDITOR.NodeEditor(container);

    // Register ONNX file handler (existing).
    var onnxEditor = new ONNX_EDITOR.OnnxEditor(editor);

    // Register a .spikypanda file handler. The on-disk format is the editor's
    // own v2 JSON; the new extension just signals "this is a SpikyPanda
    // pipeline graph, not a generic node-editor scratchpad". When the v1 op
    // set stabilizes we will wrap the JSON in real ONNX protobuf with a
    // custom domain; until then, JSON keeps the loop short.
    editor.fileHandlers.register({
        extensions: ["spikypanda"],
        mimeTypes: ["application/json"],
        displayName: "SpikyPanda Graph",
        canSave: true,
        load: function (buf, ed) {
            ed.load(new TextDecoder().decode(buf));
        },
        save: function (ed) {
            return {
                data: ed.save(),
                extension: "spikypanda",
                mimeType: "application/json",
            };
        },
    });

    // BroadcastChannel for live snapshots to detail pages. Re-publishes on
    // request so a tab opened mid-session can ask for the current state.
    var graphChannel = new GraphChannel();
    graphChannel.onRequest(function () {
        graphChannel.publishSnapshot(editor.save());
    });

    // ── Build menu bar (one menu per category) ──
    // The toolbar slot becomes a horizontal menu bar. Each category renders
    // a single button + a dropdown list of its ops. Dropdowns close on
    // outside-click or after picking an item.
    let nextX = 80;
    let nextY = 80;

    // After addNode the NodeUI receives its authoritative id (node_N).
    // Sync data.nodeId to that id immediately so the executor, forwarders,
    // and sync poll all agree on the same key.
    function syncNodeId(nodeUI) {
        if (nodeUI && nodeUI.item && nodeUI.item.data) {
            nodeUI.item.data.nodeId = nodeUI.id;
        }
    }

    function spawnNode(op) {
        const worldPos = editor.camera.screenToWorld(
            container.clientWidth / 2,
            container.clientHeight / 2,
        );
        const nodeId = generateNodeId(op.id);
        const def = buildNodeDef(op, nodeId);
        const nodeUI = editor.addNode(def, worldPos.x + (nextX % 200), worldPos.y + (nextY % 200));
        syncNodeId(nodeUI);
        nextX += 40;
        nextY += 30;
    }

    toolbar.classList.add("ne-menubar");
    var openMenu = null; // currently expanded dropdown element, if any
    function closeAllMenus() {
        if (openMenu) {
            openMenu.classList.remove("ne-menu-open");
            openMenu = null;
        }
    }
    document.addEventListener("click", function (e) {
        if (!openMenu) return;
        if (!openMenu.contains(e.target)) closeAllMenus();
    });

    opsByCategory().forEach(function (group) {
        var menu = document.createElement("div");
        menu.className = "ne-menu";
        var btn = document.createElement("button");
        btn.className = "ne-menu-btn";
        btn.type = "button";
        btn.innerHTML = group.name + ' <span class="ne-menu-caret">&#9662;</span>';
        btn.addEventListener("click", function (e) {
            e.stopPropagation();
            var wasOpen = (openMenu === menu);
            closeAllMenus();
            if (!wasOpen) {
                menu.classList.add("ne-menu-open");
                openMenu = menu;
            }
        });
        menu.appendChild(btn);

        var dropdown = document.createElement("div");
        dropdown.className = "ne-menu-dropdown";
        group.ops.forEach(function (op) {
            var item = document.createElement("button");
            item.type = "button";
            item.className = "ne-menu-item";
            item.title = op.id;
            // Color swatch echoes the node header tint so users learn the
            // mapping from category color to actual node appearance.
            item.innerHTML =
                '<span class="ne-menu-swatch" style="background:' + (op.color || "#888") + '"></span>' +
                '<span class="ne-menu-label">' + op.label + '</span>';
            item.addEventListener("click", function (e) {
                e.stopPropagation();
                spawnNode(op);
                closeAllMenus();
            });
            dropdown.appendChild(item);
        });
        menu.appendChild(dropdown);
        toolbar.appendChild(menu);
    });

    // ── Overlay action buttons (on canvas) ──
    var overlay = document.createElement("div");
    overlay.className = "ne-overlay-actions";
    editor.canvas.appendChild(overlay);

    var profileSelect = document.createElement("select");
    profileSelect.className = "ne-overlay-select";
    profileSelect.title = "Color profile";
    var profiles = [
        { value: "dark", label: "Dark" },
        { value: "light", label: "Light" },
        { value: "transparent_dark", label: "Dark (no bg)" },
        { value: "transparent_light", label: "Light (no bg)" },
    ];
    for (var i = 0; i < profiles.length; i++) {
        var opt = document.createElement("option");
        opt.value = profiles[i].value;
        opt.textContent = profiles[i].label;
        profileSelect.appendChild(opt);
    }
    profileSelect.addEventListener("change", function () {
        editor.setProfile(profileSelect.value);
    });
    overlay.appendChild(profileSelect);

    var copyBtn = document.createElement("button");
    copyBtn.className = "ne-overlay-btn";
    copyBtn.title = "Copy graph as SVG (clipboard)";
    copyBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M11 5V3.5A1.5 1.5 0 009.5 2h-6A1.5 1.5 0 002 3.5v6A1.5 1.5 0 003.5 11H5" stroke="currentColor" stroke-width="1.5"/></svg>';
    copyBtn.addEventListener("click", function () {
        var svg = editor.exportSVG();
        navigator.clipboard.writeText(svg).then(function () {
            copyBtn.classList.add("ne-overlay-btn-flash");
            setTimeout(function () { copyBtn.classList.remove("ne-overlay-btn-flash"); }, 600);
        });
    });
    overlay.appendChild(copyBtn);

    var dlBtn = document.createElement("button");
    dlBtn.className = "ne-overlay-btn";
    dlBtn.title = "Download graph as SVG image";
    dlBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v8m0 0l-3-3m3 3l3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12v1.5A1.5 1.5 0 003.5 15h9a1.5 1.5 0 001.5-1.5V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    dlBtn.addEventListener("click", function () {
        var name = prompt("Download SVG as:", "graph.svg");
        if (name) editor.downloadSVG(name);
    });
    overlay.appendChild(dlBtn);

    // ── separator ──
    var sep = document.createElement("div");
    sep.className = "ne-overlay-sep";
    overlay.appendChild(sep);

    // ── Save (floppy disk icon) ──
    // Quick shortcut to save graph as JSON. The Export dropdown to the right
    // covers all other registered formats (.spikypanda, .onnx, ...).
    var saveBtn = document.createElement("button");
    saveBtn.className = "ne-overlay-btn";
    saveBtn.title = "Save graph as JSON";
    saveBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12.5 14h-9A1.5 1.5 0 012 12.5v-9A1.5 1.5 0 013.5 2H10l4 4v6.5a1.5 1.5 0 01-1.5 1.5z" stroke="currentColor" stroke-width="1.5"/><path d="M10 2v4h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><rect x="5" y="9" width="6" height="4" rx="0.5" stroke="currentColor" stroke-width="1"/></svg>';
    saveBtn.addEventListener("click", function () {
        var name = prompt("Save graph as:", "graph.json");
        if (name) editor.downloadSave(name);
    });
    overlay.appendChild(saveBtn);

    // ── Load (unified — auto-detects format by extension) ──
    var loadInput = document.createElement("input");
    loadInput.type = "file";
    loadInput.accept = editor.fileHandlers.getAcceptString();
    loadInput.style.display = "none";
    loadInput.addEventListener("change", function () {
        var file = loadInput.files[0];
        if (!file) return;
        file.arrayBuffer().then(function (buf) {
            try {
                editor.loadFile(buf, file.name);
                // Restore data.nodeId to match the NodeUI's authoritative id
                // assigned during deserialization. The serialized blob may have
                // an op-scoped id that no longer matches the new NodeUI id.
                if (editor.nodes) {
                    editor.nodes.forEach(function (n) { syncNodeId(n); });
                }
            } catch (err) {
                alert("Failed to load: " + err.message);
            }
        });
        loadInput.value = "";
    });
    overlay.appendChild(loadInput);

    var loadBtn = document.createElement("button");
    loadBtn.className = "ne-overlay-btn";
    loadBtn.title = "Load a graph or model (" + editor.fileHandlers.getAcceptString() + ")";
    loadBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1.5 5.5h4l1.5-2h5.5a1 1 0 011 1v7a1 1 0 01-1 1h-11a1 1 0 01-1-1v-6z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    loadBtn.addEventListener("click", function () {
        loadInput.click();
    });
    overlay.appendChild(loadBtn);

    // ── Open-node button is built here but appended LATER so the visual
    // overlay order stays grouped: [SVG visual] | [graph data IO] | [node].
    // For a Source or Sink node, opens the matching detail-page sample in a
    // new tab with the current graph attached as a blob URL. The detail page
    // uses ?nodeId=... to find its node and ?graph=... to read config +
    // edges. Phase 1: the URL is built and the tab opens; Phase 2 wires the
    // detail pages to actually consume those query params.
    var openBtn = document.createElement("button");
    openBtn.className = "ne-overlay-btn";
    openBtn.title = "Open detail page for the selected node";
    // External-link glyph: the page-with-arrow-leaving icon used everywhere
    // for "open in new tab". Same 16x16 stroke style as the other overlay
    // icons so the strip stays visually homogeneous.
    openBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">'
        + '<path d="M11 8.5v3.5a1.5 1.5 0 01-1.5 1.5h-6A1.5 1.5 0 012 12V6a1.5 1.5 0 011.5-1.5H7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
        + '<path d="M9 2h5v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
        + '<path d="M14 2L7.5 8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'
        + '</svg>';
    openBtn.disabled = true;
    openBtn.addEventListener("click", function () {
        var sel = editor.getSelectedNodes();
        if (!sel || sel.size !== 1) return;
        var node = sel.values().next().value;
        var data = node && node.item && node.item.data;
        if (!data || !data.op || !data.nodeId) return;
        var op = findOp(data.op);
        if (!op || !op.detailPage) return;
        var graphJson = editor.save();
        var blob = new Blob([graphJson], { type: "application/json" });
        var graphUrl = URL.createObjectURL(blob);
        // Snapshot the graph on the channel so any tab opened by this click
        // (or refreshed later) can pull it without a server round trip.
        graphChannel.publishSnapshot(graphJson);
        // Editor lives at samples/nodeeditor/, op.detailPage is relative to
        // samples/. So `../<detailPage>` resolves to /samples/<detailPage>.
        var pageUrl = "../" + op.detailPage +
            "?nodeId=" + encodeURIComponent(data.nodeId) +
            "&graph=" + encodeURIComponent(graphUrl);
        window.open(pageUrl, "_blank");
    });

    // Selected-node tracking: enable the Open button only when a single
    // source/sink node is selected. Editor library has no event API yet,
    // so we poll cheaply (250 ms is far below human reaction time).
    function refreshOpenBtn() {
        var sel = editor.getSelectedNodes();
        if (!sel || sel.size !== 1) {
            openBtn.disabled = true;
            return;
        }
        var node = sel.values().next().value;
        var data = node && node.item && node.item.data;
        var op = data && data.op ? findOp(data.op) : null;
        openBtn.disabled = !(op && op.detailPage);
    }
    setInterval(refreshOpenBtn, 250);

    // ── Variadic input reconciler ──
    // For ops declaring `variadicInput: { prefix, type }`, keep exactly one
    // unconnected trailing input (the "+"). Connecting it grows the chain;
    // disconnecting the last one shrinks it. Middle unconnected inputs are
    // left alone so the user's wiring is not disrupted by edits elsewhere.
    function isPortConnected(port) {
        for (var i = 0; i < editor.connections.length; i++) {
            var c = editor.connections[i];
            if (c.from === port || c.to === port) return true;
        }
        return false;
    }
    function reconcileVariadicInputs() {
        var nodes = editor.nodes || [];
        for (var ni = 0; ni < nodes.length; ni++) {
            var node = nodes[ni];
            var data = node && node.item && node.item.data;
            if (!data || !data.op) continue;
            var op = findOp(data.op);
            if (!op || !op.variadicInput) continue;
            var prefix = op.variadicInput.prefix;
            var type = op.variadicInput.type;
            // Only consider input ports whose name starts with the variadic
            // prefix. A node may have non-variadic inputs (none today, but
            // future-proof).
            var variadicPorts = node.inputs.filter(function (p) {
                return p.name.indexOf(prefix) === 0;
            });
            if (!variadicPorts.length) {
                // Empty Sum somehow; seed it with one slot.
                node.addInput(prefix + "0", type);
                continue;
            }
            // Walk from the end: count trailing unconnected ports.
            var trailing = 0;
            for (var i = variadicPorts.length - 1; i >= 0; i--) {
                if (isPortConnected(variadicPorts[i])) break;
                trailing += 1;
            }
            if (trailing === 0) {
                // Last input is connected; add one more slot (the new "+").
                var nextIdx = variadicPorts.length;
                node.addInput(prefix + nextIdx, type);
            } else if (trailing > 1) {
                // Multiple trailing empties; remove all but one.
                var toRemove = trailing - 1;
                for (var k = 0; k < toRemove; k++) {
                    var lastPort = node.inputs[node.inputs.length - 1];
                    // Defensive: bail if this is not a variadic port (e.g.
                    // the user added some other shape; should not happen).
                    if (lastPort.name.indexOf(prefix) !== 0) break;
                    if (typeof editor.removeNodePort === "function") {
                        editor.removeNodePort(node, lastPort);
                    } else {
                        // Older bundle without the API: best effort manual.
                        var idx = node.inputs.indexOf(lastPort);
                        if (idx >= 0) node.inputs.splice(idx, 1);
                        if (lastPort.detach) lastPort.detach();
                    }
                }
            }
        }
    }
    setInterval(reconcileVariadicInputs, 250);

    // ── Export (dropdown of all saveable formats) ──
    var saveable = editor.fileHandlers.getSaveable();
    if (saveable.length > 0) {
        var exportSelect = document.createElement("select");
        exportSelect.className = "ne-overlay-select";
        exportSelect.title = "Export as...";
        var defaultOpt = document.createElement("option");
        defaultOpt.value = "";
        defaultOpt.textContent = "Export...";
        defaultOpt.disabled = true;
        defaultOpt.selected = true;
        exportSelect.appendChild(defaultOpt);
        for (var si = 0; si < saveable.length; si++) {
            var h = saveable[si];
            var opt = document.createElement("option");
            opt.value = h.extensions[0];
            opt.textContent = h.displayName + " (." + h.extensions[0] + ")";
            exportSelect.appendChild(opt);
        }
        exportSelect.addEventListener("change", function () {
            var ext = exportSelect.value;
            if (!ext) return;
            exportSelect.selectedIndex = 0;
            editor.exportAsWithPrompt(ext);
        });
        overlay.appendChild(exportSelect);
    }

    // Separator between graph-IO and node-action groups, then the Open
    // button defined earlier. Visual order: [profile][copy dl] | [save load
    // export] | [open node] | [run graph].
    var openSep = document.createElement("div");
    openSep.className = "ne-overlay-sep";
    overlay.appendChild(openSep);
    overlay.appendChild(openBtn);

    // ── Run graph ──
    // One-click launch of the whole pipeline: opens the graph-runner tab
    // (which loads the graph and starts publishing every node's outputs on
    // the bus) and one detail tab per sink node in the graph (Scope,
    // DatasetCapture, ...) so the user can see / record the data.
    // Run button removed: in-editor Play mode is the canonical preview
    // path now. Standalone runner/scope pages still reachable directly
    // (samples/graph-runner/, samples/scope/) for production-style use.

    // ── Play mode (in-editor preview) ──
    // Two distinct modes for the editor:
    //   - Design mode (default): graph is editable, no execution.
    //   - Play mode: a GraphExecutor runs the live graph; ScopeWidget tabs
    //     in the bottom panel observe the streams; per-source chips toggle
    //     individual sources on/off.
    // A single overlay button (green ▶ → red ⬛) toggles between modes.
    // The Run button (above) is independent: it opens the runner + scope
    // detail pages in external tabs for production-style use.
    var playBus = new StreamBus({ workerUrl: "../../js/registry-worker.js" });
    var playState = {
        executor: null,
        widgets: [],            // [{ nodeId, label, widget, body, tabBtn }]
        activeTabId: null,
        sourceChips: new Map(), // nodeId -> { chip, btn }
        connected: false,
        mode: "design",         // "design" | "play"
    };

    var playPanel = document.getElementById("ne-play-panel");
    var playHeader = document.createElement("div");
    playHeader.className = "ne-play-header";
    playPanel.appendChild(playHeader);

    var playStatus = document.createElement("span");
    playStatus.className = "ne-play-status";
    playStatus.textContent = "Design mode";
    playHeader.appendChild(playStatus);

    // Per-node controls live on the NODE CARDS themselves now, rendered
    // by the editor library when a node's data implements the
    // IRunnableNode (sources) or IToggableNode (faults / env) interface.
    // No more separate chip toolbar floating over the canvas.

    var playTabs = document.createElement("div");
    playTabs.className = "ne-play-tabs";
    playPanel.appendChild(playTabs);

    var playBody = document.createElement("div");
    playBody.className = "ne-play-body";
    playPanel.appendChild(playBody);

    function setPlayStatus(text, cls) {
        playStatus.textContent = text;
        playStatus.className = "ne-play-status" + (cls ? " " + cls : "");
    }

    function showPlayEmpty(msg) {
        playBody.innerHTML = '<div class="ne-play-empty">' + msg + "</div>";
    }

    // ── Per-node runtime sync ──
    // Source data objects implement IRunnableNode (isRunning / setRunning)
    // and Fault / Environment data objects implement IToggableNode
    // (isEnabled / setEnabled). The editor library renders the matching
    // play/stop or enable/disable buttons in each node's header.
    //
    // For the buttons to actually drive the executor in Play mode, we
    // patch each data object's setter at Play start so it forwards the
    // change to executor.setNodeRunning(). On Stop we restore the
    // unwired setter so design-time edits do not crash trying to reach
    // a destroyed executor.
    function liveControllableModelNodes() {
        var json;
        try { json = JSON.parse(editor.save()); } catch (_e) { return []; }
        var modelNodes = (json.model && json.model.nodes) || [];
        return modelNodes.filter(function (mn) {
            if (!mn || !mn.data || !mn.data.op) return false;
            if (mn.data.op === "spk.StartRuntime") return false;
            var op = findOp(mn.data.op);
            if (!op) return false;
            return (op.kind === "source")
                || op.category === "Fault"
                || op.category === "Environment";
        });
    }

    // Walk the editor's live NodeUI list and bind / unbind each
    // controllable node's data-object setters to the executor.
    function bindNodeRuntimeForwarders(executor) {
        if (!editor.nodes) return;
        editor.nodes.forEach(function (n) {
            var data = n && n.item && n.item.data;
            if (!data || !data.op) return;
            if (data.op === "spk.StartRuntime") return;
            var op = findOp(data.op);
            if (!op) return;
            // Use the NodeUI's authoritative id (node_N) which is the key
            // the executor uses in _sourceRunning and _instances.
            var nodeUiId = n.id;
            var isSource = op.kind === "source";
            var isToggable = op.category === "Fault" || op.category === "Environment";
            if (!isSource && !isToggable) return;
            // Sync the node's local flag from the executor's authoritative
            // initial state (sources start paused; the "start" exec input
            // or the on-node play button activates them).
            if (executor) {
                var live = executor.isNodeRunning(nodeUiId);
                if (isSource && data._setRunningLocal) data._setRunningLocal(live);
                if (isToggable && data._setEnabledLocal) data._setEnabledLocal(live);
            }
            // Wire the setter to forward to the executor.
            data._onRuntimeChange = function (running) {
                if (executor) executor.setNodeRunning(nodeUiId, running);
            };
        });
    }

    function unbindNodeRuntimeForwarders() {
        if (!editor.nodes) return;
        editor.nodes.forEach(function (n) {
            var data = n && n.item && n.item.data;
            if (data) data._onRuntimeChange = null;
        });
    }

    function clearPlayBody() {
        playState.widgets.forEach(function (w) {
            try { w.widget.destroy(); } catch (_e) { /* ignore */ }
        });
        playState.widgets = [];
        playState.activeTabId = null;
        playTabs.innerHTML = "";
        playBody.innerHTML = "";
    }

    function activatePlayTab(nodeId) {
        playState.activeTabId = nodeId;
        playState.widgets.forEach(function (w) {
            w.tabBtn.classList.toggle("active", w.nodeId === nodeId);
            w.body.classList.toggle("active", w.nodeId === nodeId);
        });
    }

    // Build the tab strip + ScopeWidget per Scope node in the live graph.
    function mountPlayScopes() {
        clearPlayBody();
        var graph = playState.executor && playState.executor.graph;
        if (!graph) { showPlayEmpty("No graph to preview."); return; }
        var scopeNodes = graph.listNodes().filter(function (n) {
            return n.op === "spk.Scope";
        });
        if (!scopeNodes.length) {
            showPlayEmpty("Add a Scope node to see live signals here.");
            return;
        }
        scopeNodes.forEach(function (n, idx) {
            var streamId = graph.upstreamStreamId(n.id, "in");
            var tab = document.createElement("button");
            tab.type = "button";
            tab.className = "ne-play-tab";
            tab.textContent = n.label || n.id;
            tab.addEventListener("click", function () { activatePlayTab(n.id); });
            playTabs.appendChild(tab);
            var body = document.createElement("div");
            body.className = "ne-play-tab-body";
            playBody.appendChild(body);
            var widget = new ScopeWidget(body, {
                bus: playBus,
                streamId: streamId || null,
                title: n.label,
                timeSpanS: (n.config && n.config.timeSpanS) || 0.04,
                showHeader: true,
            });
            widget.start();
            playState.widgets.push({
                nodeId: n.id, label: n.label, widget: widget,
                body: body, tabBtn: tab,
            });
            if (idx === 0) activatePlayTab(n.id);
        });
    }

    // ── Mode toggle ──
    // Single button. Green ▶ in design (click to enter Play), red ⬛ in
    // play (click to exit). Lives in the canvas overlay so it sits "on
    // top" alongside the other graph-level actions.
    var playToggleBtn = document.createElement("button");
    playToggleBtn.className = "ne-overlay-btn ne-play-toggle";
    playToggleBtn.title = "Enter Play mode";
    playToggleBtn.disabled = true;
    function renderPlayToggle() {
        if (playState.mode === "play") {
            playToggleBtn.classList.add("ne-play-toggle-on");
            playToggleBtn.title = "Exit Play mode (stop)";
            playToggleBtn.innerHTML =
                '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">' +
                '<rect x="3" y="3" width="10" height="10" rx="1.5"/></svg>';
        } else {
            playToggleBtn.classList.remove("ne-play-toggle-on");
            playToggleBtn.title = "Enter Play mode";
            playToggleBtn.innerHTML =
                '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">' +
                '<path d="M4 3l9 5-9 5V3z"/></svg>';
        }
    }
    renderPlayToggle();
    overlay.appendChild(playToggleBtn);

    function enterPlayMode() {
        if (playState.mode === "play") return;
        if (!playState.connected) {
            setPlayStatus("Bus not connected yet", "error");
            return;
        }
        var graphJson = editor.save();
        var executor = new GraphExecutor(graphJson, {
            bus: playBus,
            onError: function (err) {
                setPlayStatus("Error: " + err.message, "error");
                // eslint-disable-next-line no-console
                console.error("[play]", err);
            },
            onLog: function (msg) {
                // eslint-disable-next-line no-console
                console.info("[play]", msg);
            },
            onStreamUpdate: function () { /* could surface a counter later */ },
        });
        var ok;
        try { ok = executor.build(); }
        catch (e) {
            setPlayStatus("Build failed: " + e.message, "error");
            // eslint-disable-next-line no-console
            console.error("[play] build threw:", e);
            return;
        }
        if (!ok) return;
        playState.executor = executor;
        playState.mode = "play";
        // Switch all nodes to Play mode: runtime buttons become interactive.
        if (editor.nodes) {
            editor.nodes.forEach(function (n) {
                if (typeof n.setPlayMode === "function") n.setPlayMode(true);
            });
        }
        // Wire each controllable node's IRunnableNode/IToggableNode setter
        // to the executor so the on-node header buttons drive runtime state.
        bindNodeRuntimeForwarders(executor);
        mountPlayScopes();
        executor.start();
        // Sync button states immediately so each source shows its initial
        // "stopped" state in the Play-mode buttons before the first rAF tick.
        // (Sources only start after the first tick propagates the BeginPlay
        // pulse; the 250ms poll will catch the transition.)
        syncRuntimeButtonsFromExecutor();
        var fs = executor.sampleRateHz;
        playState.widgets.forEach(function (w) { w.widget.setSampleRateHz(fs); });
        setPlayStatus("Play mode (" + fs + " Hz)", "running");
        renderPlayToggle();
    }

    function exitPlayMode() {
        if (playState.mode !== "play") return;
        if (playState.executor) {
            try { playState.executor.stop(); } catch (_e) { /* ignore */ }
            playState.executor = null;
        }
        unbindNodeRuntimeForwarders();
        // Hide all muted LEDs when leaving Play mode.
        if (editor.nodes) {
            editor.nodes.forEach(function (n) {
                var led = n.el && n.el.querySelector(".ne-muted-led");
                if (led) led.style.display = "none";
            });
        }
        // Return all nodes to Design mode: runtime buttons become disabled.
        if (editor.nodes) {
            editor.nodes.forEach(function (n) {
                if (typeof n.setPlayMode === "function") n.setPlayMode(false);
            });
        }
        clearPlayBody();
        playState.mode = "design";
        setPlayStatus("Design mode");
        showPlayEmpty("Hit Play to preview the graph. Scope nodes will appear as tabs here.");
        renderPlayToggle();
    }

    playToggleBtn.addEventListener("click", function () {
        if (playState.mode === "play") exitPlayMode();
        else enterPlayMode();
    });

    playBus.on("connected", function () {
        playState.connected = true;
        playToggleBtn.disabled = false;
    });

    // Initial design-mode state.
    showPlayEmpty("Hit Play to preview the graph. Scope nodes will appear as tabs here.");

    // ── Auto-rename Scope nodes to reflect their inbound wiring ──
    // E.g. "Scope" becomes "Scope: Sensor.out" once the user wires the
    // Sensor's output to it. Updates on every graph-state poll. The
    // editor library does not expose a label setter on NodeUI, so we
    // reach into the title DOM (class .ne-node-title from the library).
    function refreshScopeLabels() {
        if (!editor.nodes) return;
        editor.nodes.forEach(function (n) {
            var data = n && n.item && n.item.data;
            if (!data || data.op !== "spk.Scope") return;
            // Walk the live edges to find what feeds this scope.
            var inboundLabel = null;
            for (var i = 0; i < editor.connections.length; i++) {
                var c = editor.connections[i];
                if (n.inputs.indexOf(c.to) >= 0) {
                    var sourceNode = editor.nodes.find(function (nn) {
                        return nn.outputs.indexOf(c.from) >= 0;
                    });
                    if (sourceNode) {
                        inboundLabel = (sourceNode.label || sourceNode.id) + "." + c.from.name;
                    }
                    break;
                }
            }
            var newTitle = inboundLabel ? "Scope: " + inboundLabel : "Scope";
            // Only touch the DOM if the title actually changed; avoids
            // thrashing on every poll tick.
            var titleEl = n.el && n.el.querySelector(".ne-node-title");
            if (titleEl && titleEl.textContent !== newTitle) {
                titleEl.textContent = newTitle;
                // Reflect in the node's logical label too so save/load
                // round-trips the new name.
                try { n.label = newTitle; } catch (_e) { /* readonly in some bundles */ }
            }
        });
    }

    // Mirror authoritative runtime state from the executor back to each
    // controllable data object, so on-node header buttons stay in sync
    // with effects the user did NOT trigger directly (e.g. StartRuntime
    // fan-out, future event-driven toggles, programmatic API calls).
    function syncRuntimeButtonsFromExecutor() {
        if (!playState.executor || !editor.nodes) return;
        editor.nodes.forEach(function (n) {
            var data = n && n.item && n.item.data;
            if (!data) return;
            // Use the NodeUI's own id: the executor keys _sourceRunning by n.id,
            // not by data.nodeId (which is an op-scoped generated id).
            var nodeUiId = n.id;
            if (typeof data.isRunning === "function" && typeof data._setRunningLocal === "function") {
                var live = playState.executor.isNodeRunning(nodeUiId);
                if (data.isRunning() !== live) {
                    data._setRunningLocal(live);
                    if (typeof n.refreshRuntimeButtons === "function") n.refreshRuntimeButtons();
                }
            } else if (typeof data.isEnabled === "function" && typeof data._setEnabledLocal === "function") {
                var liveE = playState.executor.isNodeRunning(nodeUiId);
                if (data.isEnabled() !== liveE) {
                    data._setEnabledLocal(liveE);
                    if (typeof n.refreshRuntimeButtons === "function") n.refreshRuntimeButtons();
                }
            }
        });
    }

    // Update the per-node muted LED. Called from the 250 ms reconciler.
    // Each runtime node gets a small circle injected into its title bar:
    //   green  = node is producing live data
    //   red    = node output is muted (source stopped, or pause active)
    //   hidden = Design mode / no executor
    function syncMutedLeds() {
        var inPlay = playState.mode === "play" && playState.executor;
        if (!editor.nodes) return;
        editor.nodes.forEach(function (n) {
            var data = n && n.item && n.item.data;
            if (!data || !data.op || data.op === "spk.StartRuntime") return;
            // Find or create the LED span inside the node title.
            var titleEl = n.el && n.el.querySelector(".ne-node-title");
            if (!titleEl) return;
            var led = titleEl.querySelector(".ne-muted-led");
            if (!led) {
                led = document.createElement("span");
                led.className = "ne-muted-led";
                titleEl.appendChild(led);
            }
            if (!inPlay || !playState.executor._nodeMuted.has(n.id)) {
                led.style.display = "none";
                return;
            }
            led.style.display = "inline-block";
            var muted = playState.executor.isNodeMuted(n.id);
            led.classList.toggle("ne-muted-led-red",   muted);
            led.classList.toggle("ne-muted-led-green", !muted);
        });
    }

    // Single 250 ms reconciler tick: Scope auto-rename + runtime state
    // mirror + muted LED. Per-node runtime forwarders are bound lazily at Play start.
    setInterval(function () {
        refreshScopeLabels();
        syncRuntimeButtonsFromExecutor();
        syncMutedLeds();
    }, 250);

    // ── Seed demo: atomic motor pipeline ──
    // Phase 2 hero graph: shows the decomposition explicitly.
    //   MotorDC  ──current──┐
    //            └─kinematics─→ MisalignmentFault ──current─┐
    //                                                       Sum ──→ Sensor ──→ Scope
    // Faults read kinematics from the motor and emit a current contribution;
    // Sum combines all contributions into the analog signal that the Sensor
    // (ADC) samples for the Scope. Adding more faults = drag another fault
    // node, wire kinematics in, wire current to a free Sum input.
    function spawn(opId, x, y) {
        var op = findOp(opId);
        if (!op) return null;
        var nodeUI = editor.addNode(buildNodeDef(op, generateNodeId(opId)), x, y);
        syncNodeId(nodeUI);
        return nodeUI;
    }
    var startN  = spawn("spk.StartRuntime", -160, 200);
    var motorN  = spawn("spk.MotorDC", 60, 200);
    var faultN  = spawn("spk.MisalignmentFault", 320, 80);
    var sumN    = spawn("spk.Sum", 580, 200);
    var sensorN = spawn("spk.Sensor", 820, 200);
    var scopeN  = spawn("spk.Scope", 1060, 200);
    if (startN && motorN && faultN && sumN && sensorN && scopeN) {
        // StartRuntime.started → Motor.start (BeginPlay pulse starts the motor)
        editor.connect(startN.outputs[0], motorN.inputs[0]);
        // motor.kinematics → fault.kinematics
        editor.connect(motorN.outputs[1], faultN.inputs[0]);
        // motor.current → sum.in_0 (Sum starts variadic-empty with one slot)
        editor.connect(motorN.outputs[0], sumN.inputs[0]);
        // The variadic reconciler grows Sum to expose a fresh trailing slot
        // each time a previously-trailing one gets wired. Run it sync so the
        // next connect can target the freshly added in_1.
        reconcileVariadicInputs();
        // fault.current → sum.in_1
        editor.connect(faultN.outputs[0], sumN.inputs[1]);
        reconcileVariadicInputs();
        // sum.out → sensor.in
        editor.connect(sumN.outputs[0], sensorN.inputs[0]);
        // sensor.out → scope.in
        editor.connect(sensorN.outputs[0], scopeN.inputs[0]);
    }
})();
