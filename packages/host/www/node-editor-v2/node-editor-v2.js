/* global NODEEDITOR, SpikypandaCore */

// Node Editor v2 — orchestrator
//
// Pure-vanilla wiring: locates the three host elements (toolbar, viewer,
// property), instantiates GraphViewer in the viewer host, and stubs out
// Palette + NodePropertyEditor (to be replaced by real components in the
// next iteration). All wiring between components goes through public
// events (onSelectionChanged etc.) — no shared state, no framework.

(async function () {
    "use strict";

    const toolbarHost = document.getElementById("nev2-toolbar");
    const viewerHost  = document.getElementById("viewer");
    const propertyHost = document.getElementById("property");

    // ── Permissions ──────────────────────────────────────────────────────
    // SECURITY NOTE — the URL hash is a DEV-only harness, hackable by
    // anyone (just edit the address bar). In production the Permissions
    // instance must come from a trusted source (server-rendered config,
    // signed JWT decoded server-side, app-level auth) and the server
    // must independently enforce every mutation. Client-side gating is
    // UX affordance only — it makes disabled controls look disabled, it
    // does not secure anything.
    const hashMatch = /perms=([rwx-]{3})/.exec(window.location.hash);  // DEV-only
    const perms = new NODEEDITOR.Permissions(hashMatch ? hashMatch[1] : "rwx");

    // Permissions badge in the topbar (right after the brand).
    const permsBadge = document.createElement("span");
    permsBadge.className   = "nev2-perms-badge";
    permsBadge.title       = "Active permissions (read / write / execute)";
    permsBadge.textContent = perms.toString();
    toolbarHost.querySelector(".nev2-brand").after(permsBadge);

    // ── Standards ────────────────────────────────────────────────────────
    // Single instance shared between viewer + palette so badge rendering
    // is consistent (same color/glyph in both places). Pre-populated
    // with ONNX; apps can extend (e.g. TFLite, OpenVINO).
    const standards = new NODEEDITOR.StandardsRegistry();

    // ── GraphViewer ──────────────────────────────────────────────────────
    const viewer = new NODEEDITOR.GraphViewer(viewerHost, perms, standards);
    // Retarget skin application to the whole app shell so every editor
    // component (palette, viewer, property panel, debug console)
    // shares the same set of --ne-color-* tokens. Without this the
    // skin would only reach descendants of #viewer.
    const appShell = document.querySelector(".nev2-app");
    if (appShell) viewer.setSkinTarget(appShell);
    viewer.setSkin("helios");   // default to HELIOS to match the page chrome
    window.__nev2 = { viewer, perms, standards };  // debug handle

    // Design-time data propagation: any connection mirrors the upstream
    // output slot into the downstream input field on every change. The
    // class lives in the nodeeditor package; the sample just wires it.
    new NODEEDITOR.LiveBinder(viewer);

    // Debug console: standalone component owned by the nodeeditor
    // package, identical in spirit to GraphViewer and Palette. The host
    // element below provides a 180-px slot at the bottom of the page;
    // the component renders its header, body, and toolbar inside,
    // styled via the active skin's --ne-color-* tokens.
    const consoleHost = document.getElementById("nev2-console");
    if (consoleHost) {
        const dc = new NODEEDITOR.DebugConsole(consoleHost);
        window.__nev2.debugConsole = dc;
    }
    // Variadic ports: keeps exactly one trailing unconnected port for
    // every NodeUI declaring `variadicInput` / `variadicOutput`.
    // Sequence grows its `then_*` outputs as the user wires them.
    new NODEEDITOR.VariadicReconciler(viewer);

    // ── NodeRegistry + plugin activation ────────────────────────────────
    // The orchestrator owns the registries. Plugins register their types
    // and editors into them. The Palette reads the NodeRegistry to render
    // the picker. The (future) NodePropertyEditor reads the EditorRegistry.
    const nodes   = new NODEEDITOR.NodeRegistry();
    const links   = new NODEEDITOR.LinkRegistry();
    const editors = viewer.editors ?? new NODEEDITOR.EditorRegistry();
    SpikypandaCore.registerSessionSnnTypes(nodes, links);
    viewer.setNodeRegistry(nodes);
    viewer.setLinkRegistry(links);
    // Built-in primitive widgets (number / vector3 / vector4 / quaternion)
    // need to be on the registry before the schema-driven property panel
    // resolves per-field factories. Plugins (geometry, onnx) register
    // their own custom editors on top via ctx.editors.register(...).
    NODEEDITOR.installBuiltinEditors(editors);

    // Plugin loading is implemented in spikypanda-nodeeditor so this
    // sample stays a thin wiring file. NODEEDITOR.loadPlugin handles
    // flat plugins (single activate) AND sub-plugin manifests
    // (subPlugins[] + manifestRefs[]) transparently.
    const loaderOptions = {
        nodes,
        links,
        editors,
        assetUrl: (p) => "../bundle/" + p,
    };
    async function load(globalName, id) {
        const res = await NODEEDITOR.loadPlugin(globalName, id, loaderOptions);
        console.log(`[nev2] plugin ${id} (${res.activated.length} sub-plugin(s))`);
    }

    await load("SpkPluginGeometry", "geometry");
    await load("SpkPluginLogic",    "logic");
    await load("SpkPluginDsp",      "dsp");
    await load("SpkPluginMl",       "ml");
    await load("SpkPluginOnnx",     "onnx");
    await load("SpkPluginPhysics",  "physics");
    await load("SpkPluginControl",  "control");
    await load("SpkPluginChemistry","chemistry");
    await load("SpkPluginViz",      "viz");
    await load("SpkPluginHelios",   "helios");
    await load("SpkPluginIso",      "iso");

    window.__nev2.nodes = nodes;  // debug handle: the real NodeRegistry
    window.__nev2.links = links;  // debug handle: concrete persisted links
    console.log("[nev2] all types:", nodes.types());

    // ── Dashboard panel ─────────────────────────────────────────────────
    // Mounts a GridStack instance in the bottom panel. We auto-add a
    // tile whenever a node implementing IRenderable lands in the graph,
    // so Viz.Plot:* nodes etc. become visible in the dashboard the
    // moment they're dropped from the palette.
    const dashboardHost = document.getElementById("nev2-dashboard");
    const dashboard = new NODEEDITOR.Dashboard(dashboardHost);
    // Hand the dashboard to the viewer so save() emits its layout and
    // load() restores it after the nodes are rebuilt.
    viewer.dashboard = dashboard;

    // ── Live config-link sync (P9.2 follow-up) ──────────────────────────
    // The graph-session-builder syncs config-link Connections (scene ↔
    // sim.graph, gas → composition, atmosphere → scene, ...) into the
    // descriptor item state at session build. For the property panel to
    // reflect the wiring LIVE (the user wires N2 onto a Composition and
    // immediately sees N2 in the components list) we run the same sync
    // function whenever a Connection is added or removed.
    //
    // The VariadicReconciler ALSO installs its own onConnectionAdded /
    // Removed handlers (it grows / trims `gas_in_<k>` slots as the user
    // wires). We chain rather than replace so both run on every event:
    // first the previous handler (VariadicReconciler's), then our sync.
    const prevAdd = viewer.onConnectionAdded;
    const prevRemove = viewer.onConnectionRemoved;
    viewer.onConnectionAdded = (conn) => {
        if (prevAdd) prevAdd(conn);
        NODEEDITOR.syncConfigLinksFromCanvas(viewer);
    };
    viewer.onConnectionRemoved = (conn) => {
        if (prevRemove) prevRemove(conn);
        NODEEDITOR.syncConfigLinksFromCanvas(viewer);
    };

    // ── Splitter: vertical resize of the dashboard panel ────────────────
    // Drives the --nev2-dash-h CSS var so the dashboard host height
    // updates live. Capped so the graph body keeps at least 200px.
    (() => {
        const splitter = document.getElementById("nev2-splitter-dashboard");
        let dragging = false;
        let startY = 0;
        let startH = 0;
        const minH = 80;
        const root = document.documentElement;
        const getH = () => parseFloat(getComputedStyle(root).getPropertyValue("--nev2-dash-h")) || 280;
        const setH = (h) => root.style.setProperty("--nev2-dash-h", `${h}px`);
        splitter.addEventListener("mousedown", (e) => {
            dragging = true;
            startY = e.clientY;
            startH = getH();
            splitter.classList.add("is-dragging");
            document.body.style.userSelect = "none";
        });
        window.addEventListener("mousemove", (e) => {
            if (!dragging) return;
            const dy = startY - e.clientY;
            const maxH = window.innerHeight - 200;
            setH(Math.max(minH, Math.min(maxH, startH + dy)));
        });
        window.addEventListener("mouseup", () => {
            if (!dragging) return;
            dragging = false;
            splitter.classList.remove("is-dragging");
            document.body.style.userSelect = "";
        });
    })();

    // ── Palette ──────────────────────────────────────────────────────────
    const paletteHost = document.getElementById("palette");
    paletteHost.innerHTML = "";  // drop the static placeholder markup
    const palette = new NODEEDITOR.Palette(paletteHost, nodes, { permissions: perms, standards, defaultCollapsed: true });

    // Palette interaction model:
    //   - single click → onPreview: open the entry's doc in the Docs
    //     tab (free, no graph mutation).
    //   - double-click → onSelect: create the node, drop it near the
    //     viewer center.
    //   - drag-drop on the viewer → create the node at the drop
    //     coordinates. Routed through the same instantiation helper.
    function instantiateNodeFromType(type, meta, x, y) {
        if (!perms.write) return null;
        // Runtime binding: ask the registry to instantiate the actual
        // IRuntimeNode and use it as the backing model. NodeUI then
        // sees isEnabled/isRunnable on the real instance and renders
        // the matching header buttons (enable checkbox, play/stop).
        const runtimeNode = nodes.create(type);
        // Source the control-port descriptors from the runtime instance
        // when present (RunnableNode override adds _start/_stop on top
        // of the base _enable, etc.). Fall back to the meta declaration,
        // then to the conservative _enable / _enabled default.
        const defaultCtrlIn  = [{ slot: "_enable",  optional: true, type: "boolean" }];
        const defaultCtrlOut = [{ slot: "_enabled", optional: true, type: "boolean" }];
        const ctrlIn  = runtimeNode?.controlInputPorts  ?? meta.controlInputPorts  ?? defaultCtrlIn;
        const ctrlOut = runtimeNode?.controlOutputPorts ?? meta.controlOutputPorts ?? defaultCtrlOut;
        const def = {
            label: meta.label,
            // The registry id is what GraphViewer.save() records so
            // GraphViewer.load(json, nodes) can rebuild a fresh runtime
            // instance on the way back in.
            typeId: type,
            // Propagate the `anchor` hint per port so split-view nodes
            // (anchorCount >= 2 in the meta) route their input/output
            // ports to the correct visual widget. Ordinary nodes never
            // set this field; routing falls through to anchor 0.
            inputs:  meta.inputPorts .map(p => ({ name: String(p.slot), type: p.type ?? "tensor", anchor: p.anchor })),
            outputs: meta.outputPorts.map(p => ({ name: String(p.slot), type: p.type ?? "tensor", anchor: p.anchor })),
            controlInputs:  ctrlIn .map(p => ({ name: String(p.slot), type: p.type ?? "boolean" })),
            controlOutputs: ctrlOut.map(p => ({ name: String(p.slot), type: p.type ?? "boolean" })),
            color: undefined,
            data:  runtimeNode,
            standards: meta.standards,
            variadicInput:  meta.variadicInput,
            variadicOutput: meta.variadicOutput,
            // Split-view widget count. Undefined / 1 = ordinary node.
            anchorCount: meta.anchorCount,
        };
        const node = viewer.addNode(def, x, y);

        // Auto-mount tile for IRenderable nodes (Viz.Plot:*, future viz
        // tiles). Removing the tile via its × button keeps the node in
        // the graph; user can re-add via the property panel later
        // (planned UI affordance).
        if (NODEEDITOR.isRenderable(runtimeNode)) {
            dashboard.addTile(node);
        }
        return node;
    }

    palette.onSelect = (type, meta) => {
        // Double-click commits: drop near the viewer center with a small
        // random offset so successive dbl-clicks don't stack on the
        // same coords.
        const r = viewerHost.getBoundingClientRect();
        const x = (r.width  / 2) - 70 + (Math.random() * 60 - 30);
        const y = (r.height / 2) - 30 + (Math.random() * 60 - 30);
        instantiateNodeFromType(type, meta, x, y);
    };

    // ── Toolbar (provisional, hard-wired buttons) ────────────────────────
    function addBtn(label, handler) {
        const b = document.createElement("button");
        b.className   = "nev2-tb-btn";
        b.textContent = label;
        b.addEventListener("click", handler);
        toolbarHost.appendChild(b);
        return b;
    }
    function addSep() {
        const s = document.createElement("span");
        s.className = "nev2-tb-sep";
        toolbarHost.appendChild(s);
    }

    // ── Lifecycle nodes (Start / Stop) ─────────────────────────────────
    // Created automatically at boot AND on every "New" so the player
    // cycle always has its entry-points wired. Gated by execute perm:
    // without it there is no Run, so no lifecycle nodes either.
    //
    // They are REGISTRY-BACKED (Core.Lifecycle:start / :stop) so their
    // typeId survives save() and load() rebuilds real StartNode /
    // StopNode instances; without the typeId a reloaded graph lost its
    // lifecycle entry points (plain JSON blobs, nothing armed at play).
    NODEEDITOR.registerLifecycleNodes(nodes);
    function installLifecycleNodes() {
        if (!perms.execute) return;
        viewer.addNode({
            label: "Start",
            typeId: NODEEDITOR.LIFECYCLE_START_TYPE_ID,
            inputs: [], outputs: [],
            controlInputs:  [],
            controlOutputs: [{ name: NODEEDITOR.CONTROL_PORT_STARTED, type: "trigger" }],
            color: "#5A8B5A",
            data:  nodes.create(NODEEDITOR.LIFECYCLE_START_TYPE_ID),
        }, 40, 40);
        viewer.addNode({
            label: "Stop",
            typeId: NODEEDITOR.LIFECYCLE_STOP_TYPE_ID,
            inputs: [], outputs: [],
            controlInputs:  [],
            controlOutputs: [{ name: NODEEDITOR.CONTROL_PORT_STOPPED, type: "trigger" }],
            color: "#B84A3C",
            data:  nodes.create(NODEEDITOR.LIFECYCLE_STOP_TYPE_ID),
        }, 40, 220);
    }

    const newBtn  = addBtn("New",    () => { viewer.clear(); installLifecycleNodes(); });
    const loadBtn = addBtn("Load",   () => {
        // Forward the live NodeRegistry so saved typeIds resolve back to
        // fresh runtime IRuntimeNode instances that play mode can fire.
        viewer.pickAndLoad(nodes, {
            onError: (e) => {
                console.error("[nev2] load failed:", e);
                alert("Load failed: " + (e instanceof Error ? e.message : String(e)));
            },
        });
    });
    addBtn("Save",   () => viewer.downloadSave());
    newBtn.disabled  = !perms.write;
    loadBtn.disabled = !perms.write;
    addSep();

    installLifecycleNodes();   // boot: prime the graph with Start/Stop

    // ── Transport bar (Run Once + Play/Pause/Stop/Step bound to runtime) ─
    // Single .nev2-player segment so the controls read as one transport.
    //   - Run Once : ephemeral session, one wave, dispose. UE5
    //                Construction-Script analogue, no time advance.
    //   - Play     : continuous simulation on rAF, t advances per frame.
    //                UE5 Event-Graph analogue.
    //   - Stop / Step : as on a tape transport.
    // The "once" icon is a filled play triangle butted against a thicker
    // bar so the eye reads it as "play, then stop right away" — visually
    // distinct from the free-running Play arrow.
    const inferrer = new NODEEDITOR.GraphInferrer(viewer);
    const runner = new NODEEDITOR.GraphRunner(viewer);
    window.__nev2.inferrer = inferrer;
    window.__nev2.runner = runner;
    inferrer.onError = (err) => console.error("[nev2/runOnce]", err);

    const player = (() => {
        const wrap = document.createElement("div");
        wrap.className = "nev2-player";

        function mkBtn(content, title, onClick) {
            const b = document.createElement("button");
            b.className   = "nev2-player-btn";
            b.title       = title;
            if (content.startsWith("<")) b.innerHTML = content;
            else                          b.textContent = content;
            b.addEventListener("click", onClick);
            wrap.appendChild(b);
            return b;
        }

        // Filled play triangle butted against a thick vertical bar.
        const ONCE_SVG =
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">'
          + '<path d="M3 2.5L11 8L3 13.5Z"/>'
          + '<rect x="12.2" y="2.5" width="2.3" height="11" rx="0.3"/>'
          + '</svg>';

        const runOnceBtn = mkBtn(ONCE_SVG, "Run Once (one-shot inference)", () => inferrer.runOnce(0));
        const playBtn = mkBtn("▶", "Play / Pause", () => {
            if (runner.state === "playing") runner.pause();
            else                            runner.play();
        });
        const stopBtn = mkBtn("■", "Stop", () => runner.stop());
        const stepBtn = mkBtn("⏭", "Step (one frame)", () => runner.step(1 / 60 * runner.speed));

        const readout = document.createElement("span");
        readout.className = "nev2-player-readout";
        readout.innerHTML = '<span class="dim">t=</span><span id="nev2-tick">0.00</span>';
        wrap.appendChild(readout);

        const speedSel = document.createElement("select");
        speedSel.className = "nev2-player-speed";
        speedSel.title = "Playback speed";
        for (const s of [0.25, 0.5, 1, 2, 4]) {
            const o = document.createElement("option");
            o.value = String(s);
            o.textContent = s + "x";
            if (s === 1) o.selected = true;
            speedSel.appendChild(o);
        }
        speedSel.addEventListener("change", () => runner.setSpeed(parseFloat(speedSel.value)));
        wrap.appendChild(speedSel);

        // Sim-rate readout (REPLACES the legacy dropdown — P8 / 2026-06-09).
        // The runner derives its mode + simRate from the graph's leaves
        // at session bootstrap (max(requiredHz) over IHasSampleRateRequirement
        // opt-ins, floor MIN_EFFECTIVE_HZ). The user no longer picks the
        // rate from the toolbar; they edit per-leaf `required_hz` editables
        // in the property panel and the toolbar reflects what was derived.
        const rateReadout = document.createElement("span");
        rateReadout.className = "nev2-player-rate";
        rateReadout.title = "Sample rate auto-derived from graph leaves (max requiredHz, floor 60 Hz). Edit per-leaf required_hz in the property panel to change it.";
        rateReadout.textContent = "free";
        wrap.appendChild(rateReadout);
        runner.onRateDerived = (mode, simRate) => {
            if (mode === "free") {
                rateReadout.textContent = "free";
            } else if (simRate >= 1_000_000) {
                rateReadout.textContent = (simRate / 1_000_000).toFixed(2).replace(/\.?0+$/, "") + " MHz";
            } else if (simRate >= 1_000) {
                rateReadout.textContent = (simRate / 1_000).toFixed(2).replace(/\.?0+$/, "") + " kHz";
            } else {
                rateReadout.textContent = simRate.toFixed(0) + " Hz";
            }
        };

        // Throttle the readout to a few updates per second; rAF would
        // otherwise repaint at 60 Hz for a value the user can barely
        // read.
        const tickEl = wrap.querySelector("#nev2-tick");
        let lastRender = 0;
        runner.onTime = (t) => {
            const now = performance.now();
            if (now - lastRender < 90) return;
            lastRender = now;
            tickEl.textContent = t.toFixed(2);
        };
        runner.onStateChanged = (state) => {
            playBtn.textContent = state === "playing" ? "⏸" : "▶";
            playBtn.classList.toggle("is-active", state === "playing");
            if (state === "idle") tickEl.textContent = "0.00";
        };
        runner.onError = (err) => {
            console.error("[nev2/player]", err);
            tickEl.textContent = "err";
        };

        // execute permission gates the whole transport.
        if (!perms.execute) {
            runOnceBtn.disabled = playBtn.disabled = stopBtn.disabled = stepBtn.disabled = true;
            speedSel.disabled = true;
            wrap.classList.add("is-disabled");
        }
        return { el: wrap, stopBtn, stepBtn };
    })();
    toolbarHost.appendChild(player.el);

    addSep();
    addBtn("Export SVG",  () => viewer.downloadSVG());
    addBtn("Export Model", () => viewer.downloadExport());

    // Skin selector: switch the editor theme live. The transparent_*
    // skins make the canvas background transparent — that is what you
    // want before "Export SVG", which renders with the active skin so
    // the SVG drops cleanly onto an external page background.
    // setSkin() retargets the whole app shell (see setSkinTarget above).
    addSep();
    const SKIN_LABELS = {
        helios: "Helios",
        dark: "Dark",
        light: "Light",
        transparent_dark: "Transparent (dark)",
        transparent_light: "Transparent (light)",
    };
    // Derive the available skins from the registry when it exposes a
    // listing API; fall back to the known set so the control still works
    // if the API shape differs.
    let skinNames;
    try {
        const sk = viewer.skins;
        const listed = sk && (typeof sk.list === "function" ? sk.list() : typeof sk.names === "function" ? sk.names() : null);
        skinNames = Array.isArray(listed) && listed.length ? listed : Object.keys(SKIN_LABELS);
    } catch {
        skinNames = Object.keys(SKIN_LABELS);
    }
    const skinWrap = document.createElement("label");
    skinWrap.className = "nev2-skin-wrap";
    skinWrap.style.cssText = "display:inline-flex;align-items:center;gap:6px;margin:0 8px;font-size:12px;opacity:0.85;";
    skinWrap.append("Skin");
    const skinSel = document.createElement("select");
    skinSel.className = "nev2-player-speed nev2-skin-select";
    for (const name of skinNames) {
        const o = document.createElement("option");
        o.value = name;
        o.textContent = SKIN_LABELS[name] || name;
        skinSel.appendChild(o);
    }
    try {
        skinSel.value = viewer.getSkinName() || "helios";
    } catch {
        skinSel.value = "helios";
    }
    skinSel.addEventListener("change", () => viewer.setSkin(skinSel.value));
    skinWrap.appendChild(skinSel);
    toolbarHost.appendChild(skinWrap);

    // ── Selection → property editor component ────────────────────────────
    // PropertyEditor is a standalone NODEEDITOR component (like Palette /
    // DebugConsole / Dashboard): hand it the host element, the registries,
    // and forward selection changes. It owns its own rendering, schema
    // resolution, copy / paste icons, and JSON-preset drop-zone.
    const propertyEditor = new NODEEDITOR.PropertyEditor(propertyHost, {
        editorRegistry: editors,
        standards,
        permissions: perms,
    });
    window.__nev2.propertyEditor = propertyEditor;

    // ── DocsViewer + Graph/Docs tab bar ──────────────────────────────────
    // The center column swaps between the graph and the per-node docs.
    // Selecting a node updates the docs body but does NOT auto-switch
    // tabs — the user keeps their wiring focus until they explicitly
    // open Docs. A dot on the Docs tab signals "this selection has a
    // doc available", so users know it's worth clicking.
    const docsHost = document.getElementById("docs");
    const docsViewer = new NODEEDITOR.DocsViewer(docsHost, { registry: nodes });
    window.__nev2.docsViewer = docsViewer;

    const tabsBar = document.getElementById("nev2-center-tabs");
    const graphBody = document.getElementById("viewer");
    const docsBody  = document.getElementById("docs");
    const graphTab  = tabsBar.querySelector('[data-tab="graph"]');
    const docsTab   = tabsBar.querySelector('[data-tab="docs"]');
    function setActiveTab(name) {
        const isGraph = name === "graph";
        graphTab.classList.toggle("is-active", isGraph);
        docsTab .classList.toggle("is-active", !isGraph);
        graphBody.classList.toggle("is-active", isGraph);
        docsBody .classList.toggle("is-active", !isGraph);
    }
    graphTab.addEventListener("click", () => setActiveTab("graph"));
    docsTab .addEventListener("click", () => setActiveTab("docs"));

    viewer.onSelectionChanged = (nodes) => {
        propertyEditor.setSelection(nodes);
        const typeId = (nodes.length === 1 && nodes[0].typeId) ? nodes[0].typeId : null;
        docsViewer.show(typeId);
        docsTab.classList.toggle("has-content", docsViewer.hasDocs(typeId));
    };

    // A persisted link owns an inspectable model just like a node. Clicking
    // a cable exposes the concrete link fields, including SNN synapse weight,
    // delay, and plasticity, in the same property panel.
    viewer.onConnectionSelected = (connection) => {
        propertyEditor.setConnection(connection);
    };

    viewer.onNodeActivated = (node) => {
        console.log("[nev2] node activated (dblclick):", node.label);
        // Double-click is the explicit "I want to read about this node"
        // gesture: switch to the docs tab if a doc exists.
        if (node && node.typeId && docsViewer.hasDocs(node.typeId)) {
            setActiveTab("docs");
        }
    };

    // ── Palette → DocsViewer (single click) ──────────────────────────────
    // Browsing gesture: clicking a palette entry opens its doc in the
    // Docs tab without touching the graph. Auto-switches to the Docs
    // tab — the user just asked for it.
    palette.onPreview = (type, meta) => {
        docsViewer.show(type);
        docsTab.classList.toggle("has-content", docsViewer.hasDocs(type));
        setActiveTab("docs");
    };

    // ── Palette dragstart → force the Graph tab to be visible ────────────
    // Without this, a user who single-clicked a palette entry (which
    // switches to the Docs tab via `palette.onPreview`) and THEN tries
    // to drag a node onto the canvas sees the "not-allowed" cursor: the
    // Docs panel is the only visible body, and it has no drop listener.
    // The viewer host (#viewer) is `display: none` and so cannot receive
    // dragover / drop events at all.
    //
    // Listening on the palette host via event delegation: dragstart
    // bubbles from each palette button. As soon as the user starts a
    // drag, we swap back to the Graph tab so the viewer host is in the
    // layout tree by the time the cursor reaches the center area. The
    // browser's drag session continues uninterrupted.
    paletteHost.addEventListener("dragstart", () => {
        setActiveTab("graph");
    });

    // ── Viewer drop target (palette → graph) ─────────────────────────────
    // Accept drag-drops carrying our private MIME and create the node
    // at the drop coordinates (relative to the viewer host). External
    // drag payloads (text/plain only) are ignored to avoid drops from
    // unrelated sources slipping through.
    //
    // HTML5 drag-and-drop quirk: during `dragover` (and `dragenter`),
    // `dataTransfer.getData(type)` is INTENTIONALLY restricted by the
    // spec for cross-origin security — it always returns `""`. Only the
    // type list (`dataTransfer.types`) is readable. We use two helpers:
    //   - `paletteDragHasMime`  : presence check, safe in dragover.
    //   - `paletteTypeFromDrop` : reads the value, only valid in drop.
    function paletteDragHasMime(e) {
        if (!e.dataTransfer) return false;
        const types = e.dataTransfer.types;
        if (!types) return false;
        // types is a DOMStringList; both .contains and iteration work.
        for (const t of types) {
            if (t === NODEEDITOR.PALETTE_DRAG_MIME) return true;
        }
        return false;
    }
    function paletteTypeFromDrop(e) {
        if (!e.dataTransfer) return null;
        const v = e.dataTransfer.getData(NODEEDITOR.PALETTE_DRAG_MIME);
        return v || null;
    }
    viewerHost.addEventListener("dragover", (e) => {
        if (!paletteDragHasMime(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        viewerHost.classList.add("is-drop-active");
    });
    viewerHost.addEventListener("dragleave", () => {
        viewerHost.classList.remove("is-drop-active");
    });
    viewerHost.addEventListener("drop", (e) => {
        viewerHost.classList.remove("is-drop-active");
        const type = paletteTypeFromDrop(e);
        if (!type) return;
        e.preventDefault();
        const meta = nodes.meta(type);
        if (!meta) return;
        // viewerHost rect → local coords. Subtract a small offset so the
        // node materialises near the cursor, not with its top-left exactly
        // under it (the cursor usually points at the centre-top of the
        // intent).
        const r = viewerHost.getBoundingClientRect();
        const x = e.clientX - r.left - 70;
        const y = e.clientY - r.top  - 20;
        instantiateNodeFromType(type, meta, x, y);
    });

})();
