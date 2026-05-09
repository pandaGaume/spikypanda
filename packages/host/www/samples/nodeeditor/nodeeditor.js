/* global NODEEDITOR, ONNX_EDITOR */

import { OPS_V1, findOp, buildNodeDef, generateNodeId, opsByCategory } from "../../js/spikypanda-ops.js";
import { GraphChannel } from "../../js/spikypanda-graph.js";
import { StreamBus } from "../../js/stream-bus.js";
import { GraphExecutor } from "../../js/graph-executor.js";
import { ScopeWidget }     from "../../js/scope-widget.js";
import { PwmWidget }       from "../../js/pwm-widget.js";
import { GaugeWidget }     from "../../js/gauge-widget.js";
import { DatasetWidget }   from "../../js/dataset-widget.js";

(function () {
    "use strict";

    const container = document.getElementById("editor-container");
    const toolbar = document.getElementById("toolbar");
    const editor = new NODEEDITOR.NodeEditor(container);
    window.__spkEditor = editor;

    // Expose the full op registry so the MCP simulation adapter can build
    // tool schemas dynamically from OPS_V1. Adding a new op in
    // spikypanda-ops.js automatically extends every MCP tool that iterates
    // window.__spkOps; no edits to the MCP package are required.
    window.__spkOps = OPS_V1;

    // When a connection is added or removed, notify the target node's data so
    // getProperties() can disable config fields overridden by the wired input.
    // Also refresh the property panel so the change is visible immediately.
    function notifyConnection(conn, connected) {
        const toNode = editor.nodes.find(function (n) { return n.inputs.includes(conn.to); });
        if (toNode && toNode.item && toNode.item.data && typeof toNode.item.data.notifyPortConnected === "function") {
            toNode.item.data.notifyPortConnected(conn.to.name, connected);
        }
        editor.propertyPanel.refresh();
    }
    editor.onConnectionAdded   = function (conn) { notifyConnection(conn, true);  };
    editor.onConnectionRemoved = function (conn) { notifyConnection(conn, false); };

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
            // Re-attach inspectable methods lost during JSON round-trip.
            if (ed.nodes) {
                ed.nodes.forEach(function (n) {
                    syncNodeId(n);
                    reattachNodeMethods(n);
                });
            }
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

    // After loading a graph from a file the editor restores nodes as plain
    // JSON objects { op, domain, opset, nodeId, config } — the closures added
    // by buildNodeDef (getProperties, setProperty, serialize, IRunnableNode, …)
    // are not present, so isInspectable() returns false and the property panel
    // falls back to Object.entries which shows a raw JSON blob.
    //
    // Fix: rebuild a fresh buildNodeDef for each node whose data lacks
    // getProperties, merge the saved config over the op defaults, then replace
    // the UIItemBase's data reference.  All existing NodeUI references remain
    // valid because we only touch item.data (the UIItemBase field).
    // Reconstruct the buildNodeDef closures (getProperties, setProperty,
    // IRunnableNode, …) that are lost during JSON serialization.
    //
    // The "@type" field in the serialized blob is the authoritative op id.
    // Files saved before "@type" was introduced fall back to the "op" field.
    // This is the single point of truth for type-based reconstruction: any
    // code that needs to rebuild a node from a blob should go through here.
    function reattachNodeMethods(nodeUI) {
        var data = nodeUI && nodeUI.item && nodeUI.item.data;
        if (!data) return;
        if (typeof data.getProperties === 'function') return; // already live

        // "@type" is the primary discriminant; "op" is the legacy fallback.
        var typeId = data["@type"] || data.op;
        if (!typeId) return;
        var op = findOp(typeId);
        if (!op) return;

        // buildNodeDef returns a NodeDef { label, color, inputs, outputs, data }.
        // The Inspectable blob with config and closures is at def.data.
        var def      = buildNodeDef(op, data.nodeId || nodeUI.id);
        var freshData = def.data;

        // Merge saved config over the op defaults so user edits survive the
        // round-trip.  Only copy keys that exist in the saved blob; unknown
        // keys (from a future op version) are silently ignored.
        if (data.config && typeof data.config === 'object') {
            Object.keys(data.config).forEach(function (k) {
                freshData.config[k] = data.config[k];
            });
        }

        nodeUI.item.data = freshData;
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
                // Then re-attach the buildNodeDef closures (getProperties,
                // setProperty, IRunnableNode, …) that are lost during JSON
                // round-trip.
                if (editor.nodes) {
                    editor.nodes.forEach(function (n) {
                        syncNodeId(n);
                        reattachNodeMethods(n);
                    });
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

            // Migration: remove legacy ports whose names look like old
            // pre-variadic versions of this slot (e.g. "in" on a node that
            // became variadic "in_*"). Safe criteria:
            //   - not exec
            //   - unconnected
            //   - not declared in the current op.inputs (preserved ports like
            //     "labelIndex" are in op.inputs and must survive)
            //   - name matches the prefix root without the trailing "_"
            //     (e.g. prefix="in_" → legacy root="in")
            var legacyRoot = prefix.replace(/_+$/, "");
            var declaredNames = (op.inputs || []).map(function (p) { return p.name; });
            node.inputs.filter(function (p) {
                return p.type !== "exec"
                    && !isPortConnected(p)
                    && declaredNames.indexOf(p.name) < 0
                    && p.name.indexOf(prefix) !== 0
                    && (p.name === legacyRoot || p.name.indexOf(legacyRoot) === 0);
            }).forEach(function (p) {
                if (typeof editor.removeNodePort === "function") {
                    editor.removeNodePort(node, p);
                } else {
                    var idx = node.inputs.indexOf(p);
                    if (idx >= 0) node.inputs.splice(idx, 1);
                    if (p.detach) p.detach();
                }
            });
            // Re-query after migration removal.
            variadicPorts = node.inputs.filter(function (p) {
                return p.name.indexOf(prefix) === 0;
            });

            if (!variadicPorts.length) {
                // No variadic ports yet; seed with one slot.
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
        layout: "tabs",         // "tabs" | "stack"
    };

    var playPanel = document.getElementById("ne-play-panel");
    var playHeader = document.createElement("div");
    playHeader.className = "ne-play-header";
    playPanel.appendChild(playHeader);

    var playStatus = document.createElement("span");
    playStatus.className = "ne-play-status";
    playStatus.textContent = "Design mode";
    playHeader.appendChild(playStatus);

    // "Record All" / "Stop All" buttons: appear on the right side of the
    // play header when DatasetCapture nodes exist. Clicking either button
    // propagates setStarted(true/false) to every IStartableNode in the graph.
    var playRecordAllDiv = document.createElement("div");
    playRecordAllDiv.className = "ne-play-record-all";

    var recordAllBtn = document.createElement("button");
    recordAllBtn.type = "button";
    recordAllBtn.className = "ne-record-all-btn";
    recordAllBtn.innerHTML = "&#9210; Record All";   // ⏺
    recordAllBtn.disabled = true;
    playRecordAllDiv.appendChild(recordAllBtn);

    var stopAllBtn = document.createElement("button");
    stopAllBtn.type = "button";
    stopAllBtn.className = "ne-record-all-btn";
    stopAllBtn.innerHTML = "&#9209; Stop All";        // ⏹
    stopAllBtn.disabled = true;
    playRecordAllDiv.appendChild(stopAllBtn);

    playHeader.appendChild(playRecordAllDiv);

    // Layout toggle: Tabs (one at a time) vs Stack (all visible, scrollable).
    var layoutToggleDiv = document.createElement("div");
    layoutToggleDiv.className = "ne-layout-toggle";

    var layoutTabsBtn = document.createElement("button");
    layoutTabsBtn.type = "button";
    layoutTabsBtn.className = "ne-layout-btn active";
    layoutTabsBtn.title = "Tab layout: one widget at a time";
    layoutTabsBtn.textContent = "Tabs";

    var layoutStackBtn = document.createElement("button");
    layoutStackBtn.type = "button";
    layoutStackBtn.className = "ne-layout-btn";
    layoutStackBtn.title = "Stack layout: all widgets visible";
    layoutStackBtn.textContent = "Stack";

    layoutToggleDiv.appendChild(layoutTabsBtn);
    layoutToggleDiv.appendChild(layoutStackBtn);
    playHeader.appendChild(layoutToggleDiv);

    function applyPlayLayout() {
        var isStack = playState.layout === "stack";
        playTabs.classList.toggle("layout-hidden", isStack);
        playBody.classList.toggle("stack-layout", isStack);
        layoutTabsBtn.classList.toggle("active", !isStack);
        layoutStackBtn.classList.toggle("active",  isStack);
        // In tab mode, re-activate the current tab so only one is visible.
        if (!isStack && playState.activeTabId) {
            activatePlayTab(playState.activeTabId);
        }
    }

    layoutTabsBtn.addEventListener("click", function () {
        if (playState.layout === "tabs") return;
        playState.layout = "tabs";
        applyPlayLayout();
    });

    layoutStackBtn.addEventListener("click", function () {
        if (playState.layout === "stack") return;
        playState.layout = "stack";
        applyPlayLayout();
    });

    function setAllStarted(started) {
        if (!editor.nodes) return;
        editor.nodes.forEach(function (n) {
            var data = n && n.item && n.item.data;
            if (!data || typeof data.setStarted !== "function") return;
            data.setStarted(started);
            if (typeof n.refreshRuntimeButtons === "function") n.refreshRuntimeButtons();
        });
        syncRecordAllButtons();
    }

    function syncRecordAllButtons() {
        var inPlay = playState.mode === "play";
        var hasStartable = false;
        var anyStarted   = false;
        if (editor.nodes) {
            editor.nodes.forEach(function (n) {
                var data = n && n.item && n.item.data;
                if (data && typeof data.isStarted === "function") {
                    hasStartable = true;
                    if (data.isStarted()) anyStarted = true;
                }
            });
        }
        recordAllBtn.disabled = !inPlay || !hasStartable;
        stopAllBtn.disabled   = !inPlay || !hasStartable;
        recordAllBtn.classList.toggle("ne-recording", inPlay && anyStarted);
    }

    recordAllBtn.addEventListener("click", function () { setAllStarted(true);  });
    stopAllBtn.addEventListener(  "click", function () { setAllStarted(false); });

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
            var isSource    = op.kind === "source";
            var isToggable  = op.category === "Fault" || op.category === "Environment";
            var isStartable = !!op.startable;
            if (!isSource && !isToggable && !isStartable) return;
            // Sync the node's local flag from the executor's authoritative
            // initial state (sources start paused; the "start" exec input
            // or the on-node play button activates them).
            if (executor) {
                var live = executor.isNodeRunning(nodeUiId);
                if (isSource   && data._setRunningLocal) data._setRunningLocal(live);
                if (isToggable && data._setEnabledLocal) data._setEnabledLocal(live);
                // Startable nodes begin in stopped state when Play enters.
                if (isStartable && data._setStartedLocal) data._setStartedLocal(false);
            }
            // Wire IRunnableNode / IToggableNode setter to forward to the executor.
            if (isSource || isToggable) {
                data._onRuntimeChange = function (running) {
                    if (executor) executor.setNodeRunning(nodeUiId, running);
                };
            }
            // Wire IStartableNode setter to call startCapture / stopCapture
            // on the runtime instance. The executor does not own this state;
            // capture is user-driven, not graph-clock-driven.
            if (isStartable && typeof data._onStartChange !== "undefined") {
                data._onStartChange = function (started) {
                    var inst = executor && executor.getNodeInstance(nodeUiId);
                    if (!inst) return;
                    if (started) {
                        if (typeof inst.startCapture === "function") inst.startCapture();
                    } else {
                        if (typeof inst.stopCapture  === "function") inst.stopCapture();
                    }
                };
            }
        });
    }

    function unbindNodeRuntimeForwarders() {
        if (!editor.nodes) return;
        editor.nodes.forEach(function (n) {
            var data = n && n.item && n.item.data;
            if (!data) return;
            data._onRuntimeChange = null;
            if (typeof data._onStartChange !== "undefined") data._onStartChange = null;
            // Reset started state so buttons return to "not recording" in Design mode.
            if (typeof data._setStartedLocal === "function") data._setStartedLocal(false);
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
        // In stack layout all bodies stay visible; only update the tab highlight.
        var isStack = playState.layout === "stack";
        playState.widgets.forEach(function (w) {
            w.tabBtn.classList.toggle("active", w.nodeId === nodeId);
            if (!isStack) w.body.classList.toggle("active", w.nodeId === nodeId);
        });
    }

    // Build the tab strip + widgets for Scope and PWM Driver nodes.
    // Scope nodes get a ScopeWidget (signal view).
    // PWM Driver nodes get a PwmWidget (live duty-cycle + frequency sliders).
    function mountPlayScopes() {
        clearPlayBody();
        var graph = playState.executor && playState.executor.graph;
        if (!graph) { showPlayEmpty("No graph to preview."); return; }

        var widgetNodes = graph.listNodes().filter(function (n) {
            return n.op === "spk.Scope" || n.op === "spk.PWM"
                || n.op === "spk.Gauge" || n.op === "spk.DatasetCapture";
        });
        if (!widgetNodes.length) {
            showPlayEmpty("Add a Scope, Gauge, PWM Driver, or Dataset Capture node to see controls here.");
            return;
        }

        var firstId = null;
        widgetNodes.forEach(function (n) {
            var tab = document.createElement("button");
            tab.type = "button";
            tab.className = "ne-play-tab";
            tab.textContent = n.label || n.id;
            tab.addEventListener("click", function () { activatePlayTab(n.id); });
            playTabs.appendChild(tab);

            var body = document.createElement("div");
            body.className = "ne-play-tab-body";
            playBody.appendChild(body);

            var widget;
            if (n.op === "spk.Scope") {
                var streamId = graph.upstreamStreamId(n.id, "in");
                widget = new ScopeWidget(body, {
                    bus: playBus,
                    streamId: streamId || null,
                    title: (n.config && n.config.label) || n.label,
                    timeSpanS: (n.config && n.config.timeSpanS) || 0.04,
                    autoTrigger: !(n.config && n.config.autoTrigger === false),
                    showHeader: true,
                });
                widget.start();
            } else if (n.op === "spk.DatasetCapture") {
                widget = new DatasetWidget(body, {
                    executor: playState.executor,
                    nodeId:   n.id,
                    label:    (n.config && n.config.label) || n.label || n.id,
                    cfg:      n.config || {},
                });
            } else if (n.op === "spk.Gauge") {
                var gcfg     = n.config || {};
                var streamId = graph.upstreamStreamId(n.id, "in");
                widget = new GaugeWidget(body, {
                    bus:       playBus,
                    streamId:  streamId || null,
                    label:     gcfg.label || n.label || n.id,
                    unit:      gcfg.unit     || "rps",
                    min:       gcfg.min      != null ? gcfg.min      : 0,
                    max:       gcfg.max      != null ? gcfg.max      : 100,
                    decimals:  gcfg.decimals != null ? gcfg.decimals : 1,
                });
            } else {
                // spk.PWM: build slider widget, wire callbacks to live runtime.
                var cfg = n.config || {};
                widget = new PwmWidget(body, {
                    label: n.label || n.id,
                    dutyCycle:   cfg.dutyCycle   != null ? cfg.dutyCycle   : 1.0,
                    frequencyHz: cfg.frequencyHz != null ? cfg.frequencyHz : 10000,
                    onDutyCycle: function (v) {
                        var inst = playState.executor && playState.executor.getNodeInstance(n.id);
                        if (inst && inst.setConfig) inst.setConfig("dutyCycle", v);
                    },
                    onFrequency: function (v) {
                        var inst = playState.executor && playState.executor.getNodeInstance(n.id);
                        if (inst && inst.setConfig) inst.setConfig("frequencyHz", v);
                    },
                });
            }

            playState.widgets.push({
                nodeId: n.id, label: n.label, widget: widget,
                body: body, tabBtn: tab,
            });
            if (!firstId) { firstId = n.id; }
        });

        if (firstId) activatePlayTab(firstId);
        applyPlayLayout();
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
        syncRecordAllButtons();
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
        syncRecordAllButtons();
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
    syncRecordAllButtons();

    // ── Auto-rename Scope nodes to reflect their inbound wiring ──
    // E.g. "Scope" becomes "Scope: Sensor.out" once the user wires the
    // Auto-rename sink nodes (Scope, DatasetCapture, Gauge) to reflect the
    // inbound signal, so the user can quickly identify which node captures
    // which channel without renaming manually. Updates every 250 ms poll.
    // The editor library does not expose a label setter on NodeUI, so we
    // reach into the title DOM (class .ne-node-title from the library).
    function refreshSinkLabels() {
        if (!editor.nodes) return;
        editor.nodes.forEach(function (n) {
            var data = n && n.item && n.item.data;
            if (!data) return;
            var newTitle = null;

            if (data.op === "spk.Scope") {
                // User-set label wins; skip auto-rename.
                if (data.config && data.config.label) {
                    newTitle = data.config.label;
                } else {
                    // Auto-name from the upstream output port ("Scope.i_a", etc.).
                    var inboundPort = null;
                    for (var i = 0; i < editor.connections.length; i++) {
                        var c = editor.connections[i];
                        if (n.inputs.indexOf(c.to) >= 0) {
                            inboundPort = c.from.name;
                            break;
                        }
                    }
                    newTitle = inboundPort ? "Scope." + inboundPort : "Scope";
                }

            } else if (data.op === "spk.Sensor") {
                // Auto-name: "Sensor.{upstream port}" e.g. "Sensor.i_a".
                // User-set label (config.label) wins.
                if (data.config && data.config.label) {
                    newTitle = data.config.label;
                } else {
                    var sensorPort = null;
                    for (var si = 0; si < editor.connections.length; si++) {
                        var sc = editor.connections[si];
                        if (n.inputs.indexOf(sc.to) >= 0) {
                            sensorPort = sc.from.name;
                            break;
                        }
                    }
                    newTitle = sensorPort ? "Sensor." + sensorPort : "Sensor";
                }

            } else if (data.op === "spk.DatasetCapture") {
                // Use the source wired to in_0 (the primary capture channel).
                var in0Port = n.inputs.find(function (p) { return p.name === "in_0"; });
                if (in0Port) {
                    for (var j = 0; j < editor.connections.length; j++) {
                        var conn = editor.connections[j];
                        if (conn.to === in0Port) {
                            var srcNode = editor.nodes.find(function (nn) {
                                return nn.outputs.indexOf(conn.from) >= 0;
                            });
                            if (srcNode) {
                                newTitle = "Dataset: " + (srcNode.label || srcNode.id) + "." + conn.from.name;
                            }
                            break;
                        }
                    }
                }
                if (!newTitle) newTitle = "Dataset Capture";

            } else if (data.op === "spk.Gauge") {
                if (data.config && data.config.label) {
                    newTitle = data.config.label;
                } else {
                    var gaugePort = null;
                    for (var k = 0; k < editor.connections.length; k++) {
                        var gc = editor.connections[k];
                        if (n.inputs.indexOf(gc.to) >= 0) {
                            gaugePort = gc.from.name;
                            break;
                        }
                    }
                    newTitle = gaugePort ? "Gauge." + gaugePort : "Gauge";
                }
            }

            if (newTitle === null) return;
            // Only touch the DOM if the title actually changed; avoids
            // thrashing on every poll tick.
            var titleEl = n.el && n.el.querySelector(".ne-node-title");
            if (titleEl && titleEl.textContent !== newTitle) {
                titleEl.textContent = newTitle;
                // Reflect in the node's logical label so save/load round-trips
                // the auto-assigned name.
                try { n.label = newTitle; } catch (_e) { /* readonly in some bundles */ }
            }
        });
    }

    // Mirror authoritative runtime state from the executor back to each
    // controllable data object, so on-node header buttons stay in sync
    // with effects the user did NOT trigger directly (e.g. StartRuntime
    // fan-out, future event-driven toggles, programmatic API calls).
    // IStartableNode state is mirrored from the runtime instance's
    // isCapturing() so the node card record button stays in sync with the
    // DatasetWidget's own Record button.
    function syncRuntimeButtonsFromExecutor() {
        if (!playState.executor || !editor.nodes) return;
        editor.nodes.forEach(function (n) {
            var data = n && n.item && n.item.data;
            if (!data) return;
            // Use the NodeUI's own id: the executor keys _sourceRunning by n.id,
            // not by data.nodeId (which is an op-scoped generated id).
            var nodeUiId = n.id;
            var changed = false;
            if (typeof data.isRunning === "function" && typeof data._setRunningLocal === "function") {
                var live = playState.executor.isNodeRunning(nodeUiId);
                if (data.isRunning() !== live) {
                    data._setRunningLocal(live);
                    changed = true;
                }
            } else if (typeof data.isEnabled === "function" && typeof data._setEnabledLocal === "function") {
                var liveE = playState.executor.isNodeRunning(nodeUiId);
                if (data.isEnabled() !== liveE) {
                    data._setEnabledLocal(liveE);
                    changed = true;
                }
            }
            // Sync IStartableNode from the runtime instance's isCapturing().
            if (typeof data.isStarted === "function" && typeof data._setStartedLocal === "function") {
                var inst = playState.executor.getNodeInstance(nodeUiId);
                if (inst && typeof inst.isCapturing === "function") {
                    var liveS = inst.isCapturing();
                    if (data.isStarted() !== liveS) {
                        data._setStartedLocal(liveS);
                        changed = true;
                    }
                }
            }
            if (changed && typeof n.refreshRuntimeButtons === "function") {
                n.refreshRuntimeButtons();
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

    // ── StartRuntime is a system anchor : always present in the graph ──
    // Without a StartRuntime, sources never receive their BeginPlay event
    // and the simulation stays paused. We treat it as a singleton system
    // node : if missing (deleted by user, or loaded from a graph that
    // never had one) we recreate it so Play always works.
    function ensureStartRuntime() {
        if (!editor.nodes) return;
        var found = false;
        editor.nodes.forEach(function (n) {
            var d = n && n.item && n.item.data;
            if (!d) return;
            if (d.op === "spk.StartRuntime" || d["@type"] === "spk.StartRuntime") {
                found = true;
            }
        });
        if (!found) {
            // Spawn at a stable location so it does not stack with the
            // user's own nodes. The user is free to drag it.
            spawnRef("spk.StartRuntime", -260, 380);
        }
    }
    // Forward declaration (spawnRef is defined later in this IIFE, after
    // the editor wiring helpers it depends on). The reconciler tick below
    // calls ensureStartRuntime once spawnRef is defined.
    var spawnRef = null;

    // Single 250 ms reconciler tick: sink auto-rename + runtime state
    // mirror + muted LED + record-all button sync + StartRuntime anchor.
    setInterval(function () {
        refreshSinkLabels();
        syncRuntimeButtonsFromExecutor();
        syncMutedLeds();
        syncRecordAllButtons();
        if (spawnRef) ensureStartRuntime();
    }, 250);

    // ── Seed demo: PMSM / BLDC monitoring rig ──
    //
    // Speed control (start-up ramp then steady-state hand-off) :
    //   Ramp(0 → 50 rps over 5 s) ──out───┐
    //                                     ├──→ Switch.a
    //   Constant(50 rps) ─────────────────────→ Switch.b
    //                            Ramp.ended ──→ Switch.select
    //
    //   Switch.out ──speedTarget──→ MotorPMSM
    //
    // Monitoring (3 phases + speed gauge) :
    //   MotorPMSM ──i_a──→ Sensor (ADC) ──→ Scope (phase A)
    //             ──i_b──→ Sensor (ADC) ──→ Scope (phase B)
    //             ──i_c──→ Sensor (ADC) ──→ Scope (phase C)
    //             ──omega→ Gauge (mechanical speed, rad/s)
    //
    // The PMSM source wraps the full simulation : machine (dq state-space),
    // FOC controller, SVPWM modulator, 3-phase inverter, housing mechanics,
    // gravity context (Earth + horizontal by default), env nodes (RotorSag,
    // BearingPreload, MountingCompliance) and any active faults. Configure
    // orientation, gravity field, env enables and faults via the property
    // panel ; the PMSM port outputs surface the consequences directly.
    //
    // Click Play : Ramp drives MotorPMSM up to 50 rps over 5 seconds, then
    // Ramp.ended flips Switch over to Constant and the motor holds its
    // setpoint. The three phase scopes show the i_a / i_b / i_c sinusoids
    // 120 degrees apart and the gauge displays the live mechanical speed.
    function spawn(opId, x, y, overrides) {
        var op = findOp(opId);
        if (!op) return null;
        var nodeUI = editor.addNode(buildNodeDef(op, generateNodeId(opId)), x, y);
        if (overrides && nodeUI && nodeUI.item && nodeUI.item.data && nodeUI.item.data.config) {
            Object.keys(overrides).forEach(function (k) {
                nodeUI.item.data.config[k] = overrides[k];
            });
        }
        syncNodeId(nodeUI);
        return nodeUI;
    }
    // Publish spawn upward so the 250 ms reconciler's ensureStartRuntime()
    // can re-spawn the system anchor on demand.
    spawnRef = spawn;

    // Tight per-phase ADC profile : 5 kHz sample rate (well above PMSM
    // electrical content at 50 Hz fundamental), low noise so the scope
    // shows the clean three-phase shape on the seed run. Increase noiseStd
    // in the property panel if you want a more realistic ADC trace.
    var sensorAdcCfg = { sampleRateHz: 5000, noiseStd: 0.0005, gain: 1, bias: 0 };
    // Time span : 60 ms = 3 mechanical periods at 50 rps. Long enough for
    // the eye to see the 120-degree phase relationship between i_a / i_b / i_c.
    var scopeCfg = { timeSpanS: 0.06 };

    var startN    = spawn("spk.StartRuntime", -260, 380);
    var rampN     = spawn("spk.Ramp",         -260,  20, { start: 0, end: 50, durationS: 5, loop: false });
    var constN    = spawn("spk.Constant",     -260, 200, { value: 50 });
    var switchN   = spawn("spk.Switch",          0, 110, { threshold: 0.5 });
    var motorN    = spawn("spk.MotorPMSM",     220, 110);
    var sensorIaN = spawn("spk.Sensor",        560,  20, sensorAdcCfg);
    var scopeIaN  = spawn("spk.Scope",         780,  20, scopeCfg);
    var sensorIbN = spawn("spk.Sensor",        560, 180, sensorAdcCfg);
    var scopeIbN  = spawn("spk.Scope",         780, 180, scopeCfg);
    var sensorIcN = spawn("spk.Sensor",        560, 340, sensorAdcCfg);
    var scopeIcN  = spawn("spk.Scope",         780, 340, scopeCfg);
    var gaugeN    = spawn("spk.Gauge",         560, 500, { unit: "rad/s", min: 0, max: 400, decimals: 1 });

    if (startN && rampN && constN && switchN && motorN
        && sensorIaN && scopeIaN
        && sensorIbN && scopeIbN
        && sensorIcN && scopeIcN
        && gaugeN) {
        // StartRuntime.started → start input of each runnable source
        // (auto-injected at index [0] when isRunnable). Fires once on
        // entering Play mode so Ramp and MotorPMSM activate together.
        // Constant has noStartStop : it always emits its value, no
        // wiring required.
        editor.connect(startN.outputs[0], rampN.inputs[0]);
        editor.connect(startN.outputs[0], motorN.inputs[0]);
        // Speed-target chain : Ramp.out → Switch.a, Constant.out → Switch.b,
        // Ramp.ended (0.0 -> 1.0 at end) → Switch.select. With the default
        // threshold of 0.5, Switch passes Ramp during the start-up phase
        // then hands off to Constant once the ramp completes.
        editor.connect(rampN.outputs[0],  switchN.inputs[0]);   // a
        editor.connect(constN.outputs[0], switchN.inputs[1]);   // b
        editor.connect(rampN.outputs[1],  switchN.inputs[2]);   // select
        // Switch.out → MotorPMSM.speedTarget. Source nodes have auto-injected
        // start / stop exec inputs at indices [0] and [1] ; user inputs
        // (speedTarget, loadTorque) follow at [2] and [3].
        editor.connect(switchN.outputs[0], motorN.inputs[2]);

        // Motor outputs → 3 phase scopes + 1 speed gauge. MotorPMSM output
        // order : [0]=i_a, [1]=i_b, [2]=i_c, [3]=i_d, [4]=i_q, [5]=omega,
        // [6]=theta, [7]=torque_em, [8..10]=accel_xyz, [11]=v_bus.
        editor.connect(motorN.outputs[0],   sensorIaN.inputs[0]);
        editor.connect(sensorIaN.outputs[0], scopeIaN.inputs[0]);
        editor.connect(motorN.outputs[1],   sensorIbN.inputs[0]);
        editor.connect(sensorIbN.outputs[0], scopeIbN.inputs[0]);
        editor.connect(motorN.outputs[2],   sensorIcN.inputs[0]);
        editor.connect(sensorIcN.outputs[0], scopeIcN.inputs[0]);
        editor.connect(motorN.outputs[5],   gaugeN.inputs[0]);
    }

    // ══════════════════════════════════════════════════════════════════════
    // window.__spk — SpikyPanda Control API
    //
    // Exposes simulation control to external callers: browser console,
    // MCP bridge (McpSpikypandaBehavior), or any LLM agent that has
    // access to a WebSocket tunnel into this tab.
    //
    // All methods are synchronous except run() and reset() which return
    // Promises so callers can await stabilisation before reading results.
    //
    // Usage from console:
    //   await window.__spk.run(3);
    //   window.__spk.toggleGravity(false);
    //   await new Promise(r => setTimeout(r, 3500));
    //   window.__spk.readAmplitudes();
    // ══════════════════════════════════════════════════════════════════════
    window.__spk = (function () {

        // Fault shorthand to full op-id map.
        var FAULT_MAP = {
            'D1': 'spk.FaultPmsm.Imbalance',
            'D2': 'spk.FaultPmsm.Eccentricity',
            'D3': 'spk.FaultPmsm.WindingShort',
            'D4': 'spk.FaultPmsm.BearingWear',
        };

        // ── Node lookup helpers ──────────────────────────────────────────

        function nodeByOp(opId) {
            if (!editor.nodes) return null;
            for (var i = 0; i < editor.nodes.length; i++) {
                var n = editor.nodes[i];
                var d = n && n.item && n.item.data;
                if (d && (d.op === opId || d['@type'] === opId)) return n;
            }
            return null;
        }

        function nodesByOp(opId) {
            if (!editor.nodes) return [];
            return editor.nodes.filter(function (n) {
                var d = n && n.item && n.item.data;
                return d && (d.op === opId || d['@type'] === opId);
            });
        }

        // ── configure(scenario) ──────────────────────────────────────────
        // Apply scenario settings to graph node configs without restarting.
        // If the executor is running, live updates are forwarded to the
        // runtime instances so changes take effect on the next tick.
        //
        // scenario: {
        //   gravityEnabled   : bool
        //   gravityMagnitude : float          (m/s^2, default 9.81)
        //   gravityDir       : { dx, dy, dz } (normalised internally)
        //   speedRpm         : float          (converted to rad/s)
        //   speedTarget      : float          (rad/s, overrides speedRpm)
        //   faults           : [ { id: "D1"|"D2"|"D3"|"D4"|full-op-id,
        //                          severity: 0..1 } ]
        // }
        function configure(scenario) {
            if (!scenario) return false;

            var exec = playState.executor;

            // Gravity vector config.
            var gNode = nodeByOp('spk.WorldGravity');
            if (gNode && gNode.item && gNode.item.data) {
                var gcfg = gNode.item.data.config;
                if (gcfg) {
                    if (scenario.gravityMagnitude !== undefined) gcfg.magnitude = scenario.gravityMagnitude;
                    if (scenario.gravityDir) {
                        if (scenario.gravityDir.dx !== undefined) gcfg.dx = scenario.gravityDir.dx;
                        if (scenario.gravityDir.dy !== undefined) gcfg.dy = scenario.gravityDir.dy;
                        if (scenario.gravityDir.dz !== undefined) gcfg.dz = scenario.gravityDir.dz;
                    }
                }
                // Live gravity toggle: route through executor.setNodeRunning so
                // the muted-vector path in MotorPmsmRuntime takes effect.
                if (scenario.gravityEnabled !== undefined && exec) {
                    exec.setNodeRunning(gNode.id, !!scenario.gravityEnabled);
                }
            }

            // Speed: find the Constant node wired as the steady-state target.
            // In the default demo graph that is the Constant(50 rad/s) connected
            // to Switch.b. We locate any Constant with a positive value.
            var speedTarget = scenario.speedTarget;
            if (speedTarget === undefined && scenario.speedRpm !== undefined) {
                speedTarget = scenario.speedRpm * 2 * Math.PI / 60;
            }
            if (speedTarget !== undefined) {
                var cNodes = nodesByOp('spk.Constant');
                for (var ci = 0; ci < cNodes.length; ci++) {
                    var cData = cNodes[ci].item && cNodes[ci].item.data;
                    if (cData && cData.config && (cData.config.value || 0) > 0) {
                        cData.config.value = speedTarget;
                        var cinst = exec && exec.getNodeInstance(cNodes[ci].id);
                        if (cinst && cinst.setConfig) cinst.setConfig('value', speedTarget);
                        break;
                    }
                }
            }

            // Faults: update config.severity and toggle runtime enable state.
            if (scenario.faults) {
                scenario.faults.forEach(function (f) {
                    var opId = FAULT_MAP[f.id] || f.id;
                    var fNode = nodeByOp(opId);
                    if (!fNode) return;
                    var sev = (f.severity != null) ? f.severity : 0.5;
                    var fData = fNode.item && fNode.item.data;
                    if (fData && fData.config) fData.config.severity = sev;
                    var finst = exec && exec.getNodeInstance(fNode.id);
                    if (finst && finst.setConfig) finst.setConfig('severity', sev);
                    if (exec) exec.setNodeRunning(fNode.id, sev > 0);
                });
            }

            // Generic per-node config path used by the MCP scenario behavior.
            // scenario.nodes is an array of { id?, op?, config } entries; each
            // entry resolves to a single node (id wins, op falls back to the
            // first node with that op id) and merges the supplied keys both
            // into data.config (persisted) and the live runtime instance.
            if (scenario.nodes && scenario.nodes.length) {
                scenario.nodes.forEach(function (spec) {
                    if (!spec || !spec.config) return;
                    var node = null;
                    if (spec.id) {
                        for (var i = 0; i < editor.nodes.length; i++) {
                            if (editor.nodes[i].id === spec.id) { node = editor.nodes[i]; break; }
                        }
                    }
                    if (!node && spec.op) node = nodeByOp(spec.op);
                    if (!node) return;
                    var data = node.item && node.item.data;
                    var inst = exec && exec.getNodeInstance(node.id);
                    Object.keys(spec.config).forEach(function (k) {
                        var v = spec.config[k];
                        if (data && data.config) data.config[k] = v;
                        if (inst && typeof inst.setConfig === 'function') inst.setConfig(k, v);
                    });
                });
            }

            return true;
        }

        // ── run(seconds) ─────────────────────────────────────────────────
        // Enter play mode (if not already in it), wait `seconds` seconds,
        // then resolve. Awaiting this call guarantees the simulation has
        // been running for at least `seconds` seconds when the Promise
        // resolves (motor transients typically settle within 0.3 s; LPF
        // settling adds 1/cutoffHz more — budget 3 s for 5 Hz LPF).
        function run(seconds) {
            return new Promise(function (resolve, reject) {
                if (playState.mode !== 'play') {
                    try {
                        enterPlayMode();
                    } catch (e) {
                        reject(e);
                        return;
                    }
                    if (playState.mode !== 'play') {
                        reject(new Error('enterPlayMode failed — check bus connection'));
                        return;
                    }
                }
                setTimeout(resolve, Math.max(0, (seconds || 0) * 1000));
            });
        }

        // ── readAmplitudes() ─────────────────────────────────────────────
        // Returns a flat object mapping "<node-label>.<port>" to the last
        // sample value for every live float stream in the graph.
        // Muted (zero / stopped) streams are excluded.
        // Useful for reading SyncDetect magnitude/phase outputs.
        function readAmplitudes() {
            var exec = playState.executor;
            if (!exec) return null;
            var result = {};
            exec.streams.forEach(function (s) {
                var allOut = exec._lastOutputs.get(s.nodeId);
                if (!allOut) return;
                var payload = allOut[s.port];
                if (!payload || payload.muted) return;
                if (!payload.samples || !payload.samples.length) return;
                var node = exec.graph && exec.graph.getNode(s.nodeId);
                var label = (node && (node.label || node.id)) || s.nodeId;
                result[label + '.' + s.port] = payload.samples[payload.samples.length - 1];
            });
            return result;
        }

        // ── readFftPeak(channel, freqHz, windowHz) ────────────────────────
        // Searches the FFT node whose label or id contains `channel`, then
        // returns the peak magnitude within +/- (windowHz/2) of freqHz.
        // `windowHz` defaults to 5 Hz.
        function readFftPeak(channel, freqHz, windowHz) {
            var exec = playState.executor;
            if (!exec) return null;
            var targetId = null;
            if (editor.nodes) {
                for (var ni = 0; ni < editor.nodes.length; ni++) {
                    var n = editor.nodes[ni];
                    var d = n && n.item && n.item.data;
                    if (!d || (d.op !== 'spk.FFT' && d['@type'] !== 'spk.FFT')) continue;
                    var lbl = n.label || n.id;
                    if (n.id === channel || lbl === channel || lbl.indexOf(channel) >= 0) {
                        targetId = n.id;
                        break;
                    }
                }
            }
            if (!targetId) return null;
            var allOut = exec._lastOutputs.get(targetId);
            if (!allOut) return null;
            var spec = allOut['spectrum'] || allOut['magnitude'] || allOut['out'];
            if (!spec || !spec.samples || !spec.samples.length) return null;
            var bins   = spec.samples;
            var binHz  = exec.sampleRateHz / (bins.length * 2);
            var half   = ((windowHz != null ? windowHz : 5) / 2);
            var center = Math.round(freqHz / binHz);
            var span   = Math.max(1, Math.ceil(half / binHz));
            var lo     = Math.max(0, center - span);
            var hi     = Math.min(bins.length - 1, center + span);
            var peak   = 0;
            for (var bi = lo; bi <= hi; bi++) {
                if (bins[bi] > peak) peak = bins[bi];
            }
            return peak;
        }

        // ── exportData() ─────────────────────────────────────────────────
        // Returns a JSON string containing the last payload for every stream.
        // Float32Array buffers are serialised as plain arrays for JSON compat.
        function exportData() {
            var exec = playState.executor;
            if (!exec) return null;
            var snap = { timestamp: Date.now(), sampleRateHz: exec.sampleRateHz, streams: {} };
            exec.streams.forEach(function (s) {
                var allOut = exec._lastOutputs.get(s.nodeId);
                if (!allOut) return;
                var payload = allOut[s.port];
                if (!payload) return;
                var node = exec.graph && exec.graph.getNode(s.nodeId);
                var label = (node && (node.label || node.id)) || s.nodeId;
                var key = label + '.' + s.port;
                if (payload.samples) {
                    snap.streams[key] = {
                        type: 'float', muted: !!payload.muted,
                        samples: Array.from(payload.samples),
                    };
                } else if (payload.x !== undefined) {
                    snap.streams[key] = {
                        type: 'vec3', muted: !!payload.muted,
                        x: Array.from(payload.x),
                        y: Array.from(payload.y),
                        z: Array.from(payload.z),
                    };
                }
            });
            return JSON.stringify(snap);
        }

        // ── toggleGravity(enabled) ────────────────────────────────────────
        // Enable or disable the WorldGravity node. When disabled the motor
        // receives a zero gravity vector (microgravity). Instant effect.
        function toggleGravity(enabled) {
            var gNode = nodeByOp('spk.WorldGravity');
            if (!gNode) return false;
            var exec = playState.executor;
            if (exec) exec.setNodeRunning(gNode.id, !!enabled);
            return true;
        }

        // ── setFault(faultId, severity) ───────────────────────────────────
        // faultId: "D1"|"D2"|"D3"|"D4" or full op id (spk.FaultPmsm.*)
        // severity: 0..1  (0 disables the fault node)
        function setFault(faultId, severity) {
            var opId = FAULT_MAP[faultId] || faultId;
            var fNode = nodeByOp(opId);
            if (!fNode) return false;
            var sev = (severity != null) ? severity : 0.5;
            var fData = fNode.item && fNode.item.data;
            if (fData && fData.config) fData.config.severity = sev;
            var exec = playState.executor;
            var finst = exec && exec.getNodeInstance(fNode.id);
            if (finst && finst.setConfig) finst.setConfig('severity', sev);
            if (exec) exec.setNodeRunning(fNode.id, sev > 0);
            return true;
        }

        // ── reset() ───────────────────────────────────────────────────────
        // Exit play mode and return a Promise that resolves once the executor
        // has fully stopped (one animation frame after the RAF cancellation).
        function reset() {
            exitPlayMode();
            return new Promise(function (resolve) { setTimeout(resolve, 100); });
        }

        // ── graphStatus() ─────────────────────────────────────────────────
        // Returns a snapshot of the current mode, sample rate, and per-node
        // running/muted state. Useful for an agent to inspect graph health
        // before reading measurements.
        function graphStatus() {
            var exec = playState.executor;
            var status = {
                mode: playState.mode,
                sampleRateHz: exec ? exec.sampleRateHz : 0,
                nodes: [],
                streams: exec ? exec.streams.map(function (s) {
                    return { nodeId: s.nodeId, port: s.port, count: s.count, subs: s.subs };
                }) : [],
            };
            if (editor.nodes) {
                editor.nodes.forEach(function (n) {
                    var d = n && n.item && n.item.data;
                    status.nodes.push({
                        id:      n.id,
                        label:   n.label || n.id,
                        op:      d ? (d.op || d['@type'] || '') : '',
                        running: exec ? exec.isNodeRunning(n.id) : null,
                        muted:   exec ? exec.isNodeMuted(n.id)   : null,
                        config:  (d && d.config) ? Object.assign({}, d.config) : null,
                    });
                });
            }
            return status;
        }

        return {
            configure:     configure,
            run:           run,
            readAmplitudes: readAmplitudes,
            readFftPeak:   readFftPeak,
            exportData:    exportData,
            toggleGravity: toggleGravity,
            setFault:      setFault,
            reset:         reset,
            graphStatus:   graphStatus,
        };
    })();

})();
