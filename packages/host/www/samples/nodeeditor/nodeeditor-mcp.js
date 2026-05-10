// SpikyPanda MCP bootstrap for the agent-facing nodeeditor-mcp.html page.
//
// Responsibilities:
//   1. Wait for nodeeditor.js to publish window.__spk and window.__spkOps.
//   2. Load the grammar profiles (physics-fr.json, physics-en.json) and
//      register them in an McpGrammarStore.
//   3. Wrap the four behaviors with a logging proxy so every executeTool
//      call is mirrored to the on-page agent log.
//   4. Build an McpServer with WsTunnel transport and start it.
//   5. Poll spk://scenario / spk://simulation / spk://measurement once a
//      second to keep the left-side panels in sync.
//
// The Connect button stays a toggle: a second click stops the server and
// resets the panels.

(function () {
    "use strict";

    var connectBtn   = document.getElementById("mcp-connect-btn");
    var statusBadge  = document.getElementById("mcp-status");
    var providerInp  = document.getElementById("mcp-provider");
    var grammarSel   = document.getElementById("mcp-grammar");
    var researchInp  = document.getElementById("mcp-research-dir");
    var researchBtn  = document.getElementById("mcp-research-apply");
    var loadBtn      = document.getElementById("mcp-load-btn");
    var loadInput    = document.getElementById("mcp-load-input");
    var loadStatus   = document.getElementById("mcp-load-status");
    var graphView    = document.getElementById("graph-view");
    var graphToggle  = document.getElementById("graph-toggle");
    var logEl        = document.getElementById("agent-log");
    var panelScn     = document.getElementById("panel-scenario");
    var panelSim     = document.getElementById("panel-sim");
    var panelMes     = document.getElementById("panel-measure");

    // The admin HTTP server lives on PORT+1. The web page assumes the same
    // hostname as the WsTunnel and increments the port; override via
    // ?adminPort= query string when running on a non-default layout.
    var adminPortOverride = new URLSearchParams(window.location.search).get("adminPort");
    var adminPort = adminPortOverride ? parseInt(adminPortOverride, 10)
                                       : (parseInt(window.location.port || "80", 10) + 1);
    var adminBase = window.location.protocol + "//" + window.location.hostname + ":" + adminPort;

    var server = null;
    var pollTimer = null;
    var grammarStore = null;
    var grammarsLoaded = false;
    var grammarsCache = {};

    // ── Logging ─────────────────────────────────────────────────────

    function log(level, msg) {
        var row = document.createElement("div");
        row.className = "row";
        var ts = new Date().toISOString().slice(11, 19);
        var head = '<span class="ts">[' + ts + ']</span> <span class="lvl-' + level + '">' + level + '</span> ';
        row.innerHTML = head;
        var body = document.createElement("span");
        body.textContent = msg;
        row.appendChild(body);
        logEl.appendChild(row);
        logEl.scrollTop = logEl.scrollHeight;
    }

    // ── Grammar loading ─────────────────────────────────────────────

    async function loadGrammars() {
        if (grammarsLoaded) return;
        var sources = [
            { id: "physics-fr", url: "/bundle/grammars/physics-fr.json" },
            { id: "physics-en", url: "/bundle/grammars/physics-en.json" },
        ];
        for (var i = 0; i < sources.length; i++) {
            var s = sources[i];
            try {
                var r = await fetch(s.url);
                if (!r.ok) throw new Error("HTTP " + r.status);
                grammarsCache[s.id] = await r.json();
                log("info", "Grammar loaded: " + s.id);
            } catch (e) {
                log("warn", "Grammar " + s.id + " not found at " + s.url + " (" + (e && e.message) + ")");
            }
        }
        grammarsLoaded = true;
    }

    function applyGrammars() {
        var McpServerNS = window.McpServer || {};
        var McpGrammar      = McpServerNS.McpGrammar;
        var McpGrammarStore = McpServerNS.McpGrammarStore;
        if (!McpGrammar || !McpGrammarStore) {
            log("warn", "@dev/core grammar classes missing; descriptions stay at fallback.");
            return null;
        }
        var store = new McpGrammarStore();
        Object.keys(grammarsCache).forEach(function (id) {
            store.set(id, McpGrammar.fromJSON(grammarsCache[id]));
        });
        return store;
    }

    // ── Logging proxy around behavior.executeToolAsync ──────────────

    function wrapBehavior(behavior) {
        var original = behavior.executeToolAsync.bind(behavior);
        behavior.executeToolAsync = async function (uri, toolName, args) {
            log("tool", toolName + " " + JSON.stringify(args || {}).slice(0, 240));
            try {
                var res = await original(uri, toolName, args);
                if (res && res.isError) {
                    var msg = "";
                    if (res.content && res.content[0] && res.content[0].type === "text") msg = res.content[0].text;
                    log("error", toolName + " error: " + msg);
                } else {
                    log("ok", toolName + " ok");
                }
                return res;
            } catch (e) {
                log("error", toolName + " threw: " + (e && e.message ? e.message : String(e)));
                throw e;
            }
        };
        return behavior;
    }

    // ── Status polling ──────────────────────────────────────────────

    function renderKv(target, obj) {
        target.innerHTML = "";
        var keys = Object.keys(obj || {});
        if (keys.length === 0) {
            target.innerHTML = '<div class="mcp-empty">empty</div>';
            return;
        }
        var div = document.createElement("div");
        div.className = "mcp-kv";
        keys.forEach(function (k) {
            var kEl = document.createElement("div"); kEl.className = "k"; kEl.textContent = k;
            var vEl = document.createElement("div"); vEl.className = "v";
            var v = obj[k];
            vEl.textContent = (typeof v === "number") ? formatNumber(v) : String(v);
            div.appendChild(kEl); div.appendChild(vEl);
        });
        target.appendChild(div);
    }

    function formatNumber(v) {
        if (!Number.isFinite(v)) return String(v);
        if (Math.abs(v) >= 1000 || (Math.abs(v) < 0.001 && v !== 0)) return v.toExponential(3);
        return v.toFixed(4);
    }

    function pollPanels() {
        var spk = window.__spk;
        if (!spk) return;
        var status = spk.graphStatus();
        if (status) {
            renderKv(panelScn, {
                "mode":         status.mode,
                "sample rate":  status.sampleRateHz != null ? status.sampleRateHz + " Hz" : "(edit)",
                "node count":   status.nodes ? status.nodes.length : 0,
                "stream count": status.streams ? status.streams.length : 0,
            });
            var running = (status.nodes || []).filter(function (n) { return n.running; });
            renderKv(panelSim, {
                "running":     running.length,
                "edit/play":   status.mode,
                "running ids": running.map(function (n) { return n.id; }).join(", ") || "-",
            });
        }
        var amps = spk.readAmplitudes();
        if (amps) renderKv(panelMes, amps);
        else renderKv(panelMes, {});
    }

    function startPolling() { stopPolling(); pollTimer = setInterval(pollPanels, 1000); pollPanels(); }
    function stopPolling()  { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

    // ── Connect / disconnect ────────────────────────────────────────

    function setStatus(state, label) {
        statusBadge.className = "mcp-status-badge " + state;
        statusBadge.textContent = label || state;
    }

    async function connect() {
        if (server) return;
        var McpServerNS = window.McpServer;
        var McpSpikyPanda = window.McpSpikyPanda;
        if (!McpServerNS || !McpSpikyPanda) {
            log("error", "MCP bundles not loaded (window.McpServer or window.McpSpikyPanda missing).");
            return;
        }
        if (!window.__spk || !window.__spkOps) {
            log("warn", "Node editor still booting; window.__spk / window.__spkOps missing. Try again in a moment.");
            return;
        }

        await loadGrammars();
        grammarStore = applyGrammars();
        var grammarKey = grammarSel.value;

        var providerName = (providerInp.value || "nodeeditor").trim();
        var loc = window.location;
        var wsProto = loc.protocol === "https:" ? "wss" : "ws";
        var wsUrl = wsProto + "://" + loc.host + "/provider/" + encodeURIComponent(providerName);

        log("info", "Connecting as provider \"" + providerName + "\" -> " + wsUrl);
        setStatus("connecting", "Connecting");

        var adapter   = new McpSpikyPanda.SpkSimulationAdapter();
        var scenarioB = wrapBehavior(new McpSpikyPanda.SpkScenarioBehavior(adapter));
        var simB      = wrapBehavior(new McpSpikyPanda.SpkSimBehavior(adapter));
        var measureB  = wrapBehavior(new McpSpikyPanda.SpkMeasureBehavior(adapter));

        var builder = new McpServerNS.McpServerBuilder()
            .withName(providerName)
            .withWsUrl(wsUrl)
            .withInitializer({
                initialize: function () {
                    return {
                        protocolVersion: "2024-11-05",
                        serverInfo: { name: providerName, version: "0.1.0" },
                        instructions:
                            "Live SpikyPanda graph executor. Read spk://scenario first, " +
                            "configure nodes via scenario_configure_node, then sim_run, " +
                            "then measure_*. Use grammar profile \"" + grammarKey + "\".",
                    };
                },
            });

        if (grammarStore) builder.withGrammarStore(grammarStore).withGrammarResolver(function () { return grammarKey; });
        if (McpServerNS.McpGrammarBehavior && grammarStore) {
            var grammarB = new McpServerNS.McpGrammarBehavior(grammarStore);
            builder.register(scenarioB, simB, measureB, grammarB);
        } else {
            builder.register(scenarioB, simB, measureB);
        }

        server = builder.build();

        try {
            await server.start();
            setStatus("connected", "Connected");
            connectBtn.textContent = "Disconnect";
            connectBtn.classList.add("disconnect");
            log("ok", "Connected. MCP endpoint: http://" + loc.host + "/" + encodeURIComponent(providerName) + "/mcp");
            startPolling();
        } catch (e) {
            log("error", "Connection failed: " + (e && e.message ? e.message : String(e)));
            setStatus("disconnected", "Disconnected");
            server = null;
        }
    }

    async function disconnect() {
        if (!server) return;
        try { await server.stop(); } catch (_) { /* ignore */ }
        server = null;
        stopPolling();
        setStatus("disconnected", "Disconnected");
        connectBtn.textContent = "Connect";
        connectBtn.classList.remove("disconnect");
        log("warn", "Disconnected.");
    }

    // ── Research dir admin (HTTP on adminPort) ─────────────────────

    async function loadResearchDir() {
        try {
            var r = await fetch(adminBase + "/admin/research-dir");
            if (!r.ok) throw new Error("HTTP " + r.status);
            var body = await r.json();
            researchInp.value = body.path || "";
            researchInp.placeholder = body.path || "";
            log("info", "Research root: " + body.path);
        } catch (e) {
            researchInp.placeholder = "(admin endpoint unreachable on " + adminBase + ")";
            log("warn", "Could not load research root from " + adminBase + ": " + (e && e.message ? e.message : String(e)));
        }
    }

    async function applyResearchDir() {
        var path = (researchInp.value || "").trim();
        if (!path) { log("warn", "Empty research dir; nothing to apply."); return; }
        try {
            researchBtn.disabled = true;
            var r = await fetch(adminBase + "/admin/research-dir", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ path: path }),
            });
            var body = await r.json().catch(function () { return {}; });
            if (!r.ok) throw new Error(body.error || ("HTTP " + r.status));
            researchInp.value = body.path || path;
            log("ok", "Research root updated -> " + (body.path || path));
        } catch (e) {
            log("error", "Apply failed: " + (e && e.message ? e.message : String(e)));
        } finally {
            researchBtn.disabled = false;
        }
    }

    researchBtn.addEventListener("click", function () { void applyResearchDir(); });
    researchInp.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter") { ev.preventDefault(); void applyResearchDir(); }
    });

    // ── Load graph (.spikypanda) ────────────────────────────────────

    function setLoadStatus(level, msg) {
        if (!loadStatus) return;
        var color = level === "ok" ? "#3fb950" : level === "error" ? "#f85149" : "#8b949e";
        loadStatus.style.color = color;
        loadStatus.textContent = msg || "";
    }

    function loadGraphFromText(text, sourceLabel) {
        if (!window.__spk || typeof window.__spk.loadGraph !== "function") {
            setLoadStatus("error", "Editor not ready (window.__spk.loadGraph missing).");
            log("error", "Cannot load: editor not ready.");
            return;
        }
        try {
            window.__spk.loadGraph(text);
            var nodes = window.__spk.graphStatus && window.__spk.graphStatus().nodes;
            var n = nodes ? nodes.length : 0;
            setLoadStatus("ok", "Loaded " + n + " nodes from " + sourceLabel);
            log("ok", "Graph loaded: " + sourceLabel + " (" + n + " nodes)");
        } catch (e) {
            setLoadStatus("error", "Load failed: " + ((e && e.message) || String(e)));
            log("error", "Graph load failed: " + ((e && e.message) || String(e)));
        }
    }

    loadBtn.addEventListener("click", function () { loadInput.click(); });
    loadInput.addEventListener("change", function () {
        var f = loadInput.files && loadInput.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload  = function () { loadGraphFromText(String(reader.result), f.name); };
        reader.onerror = function () { setLoadStatus("error", "FileReader error"); };
        reader.readAsText(f);
        // Reset value so picking the same file twice still triggers change.
        loadInput.value = "";
    });

    // ── Auto-load via ?graph=<name> (looks under /data/graphs/) ─────
    var autoGraph = new URLSearchParams(window.location.search).get("graph");
    if (autoGraph) {
        var url = "/data/graphs/" + encodeURIComponent(autoGraph) + ".spikypanda";
        window.addEventListener("DOMContentLoaded", function () {
            // Wait one frame for nodeeditor.js to install window.__spk.
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    fetch(url).then(function (r) {
                        if (!r.ok) throw new Error("HTTP " + r.status);
                        return r.text();
                    }).then(function (text) {
                        loadGraphFromText(text, "library/" + autoGraph);
                    }).catch(function (e) {
                        setLoadStatus("error", "Auto-load failed: " + ((e && e.message) || String(e)));
                    });
                });
            });
        });
    }

    connectBtn.addEventListener("click", function () {
        (server ? disconnect() : connect()).catch(function (e) {
            log("error", "Toggle failed: " + (e && e.message ? e.message : String(e)));
        });
    });

    graphToggle.addEventListener("click", function () {
        var expanded = graphView.classList.toggle("expanded");
        graphToggle.textContent = (expanded ? "▼" : "▶") + " Graph View "
            + (expanded ? "(click to collapse)" : "(click to expand for screenshots)");
        // The play panel is only useful when the graph is visible.
        var playPanel = document.getElementById("ne-play-panel");
        if (playPanel) playPanel.style.display = expanded ? "" : "none";
    });

    // Auto-connect once the node editor finishes booting. We wait two animation
    // frames so __spk and __spkOps are guaranteed to be installed before the
    // first connect attempt.
    requestAnimationFrame(function () {
        requestAnimationFrame(function () {
            if (window.__spk && window.__spkOps && window.McpServer && window.McpSpikyPanda) {
                connect().catch(function (e) {
                    log("error", "Auto-connect failed: " + (e && e.message ? e.message : String(e)));
                });
            } else {
                log("info", "MCP bundles or __spk not ready; click Connect to retry.");
            }
        });
    });

    log("info", "MCP page ready. Provider: " + providerInp.value + ", grammar: " + grammarSel.value + ".");

    // Load the current research root from the admin endpoint as soon as the
    // page boots; failure is non-fatal (the admin server may be off).
    void loadResearchDir();
})();
