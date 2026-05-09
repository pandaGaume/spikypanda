// Browser-side registry of prerequisite check functions.
//
// Each entry is `kind -> async (args) -> { status: "pass"|"fail", message: string }`.
// Project pages call these by name when running an auto prereq, then post the
// outcome back to the projects admin endpoint via project_set_prereq_result.
//
// New kinds are added by extending window.SpkPrereqChecks. The Node side
// catalogue (BUILT_IN_CHECK_KINDS in spk.project.types.ts) advertises which
// kinds the agent can rely on; if the agent picks an unknown kind, the page
// records a `fail` with an explanatory message instead of throwing.

(function () {
    "use strict";

    function pass(message) { return { status: "pass", message: message || "ok" }; }
    function fail(message) { return { status: "fail", message: message || "fail" }; }

    function getOps() { return (window && window.__spkOps) || []; }
    function getStatus() { return window && window.__spk ? window.__spk.graphStatus() : null; }

    var registry = {

        spk_api_available: async function () {
            return (window && typeof window.__spk === "object") ? pass("window.__spk loaded") : fail("window.__spk missing");
        },

        op_registered: async function (args) {
            var opId = args && args.opId;
            if (!opId) return fail("missing args.opId");
            var ops = getOps();
            return ops.some(function (o) { return o && o.id === opId; })
                ? pass("op " + opId + " registered (" + ops.length + " ops total)")
                : fail("op " + opId + " is NOT in OPS_V1");
        },

        op_in_active_graph: async function (args) {
            var opId = args && args.opId;
            if (!opId) return fail("missing args.opId");
            var st = getStatus();
            if (!st) return fail("graphStatus unavailable");
            var nodes = (st.nodes || []).filter(function (n) { return n && n.op === opId; });
            return nodes.length > 0
                ? pass(nodes.length + " node(s) of op " + opId + " in active graph")
                : fail("no node of op " + opId + " in active graph");
        },

        port_present: async function (args) {
            var opId = args && args.opId;
            var port = args && args.port;
            var direction = (args && args.direction) || "input";
            if (!opId || !port) return fail("missing args.opId or args.port");
            var op = getOps().find(function (o) { return o && o.id === opId; });
            if (!op) return fail("op " + opId + " is NOT in OPS_V1");
            var list = direction === "output" ? (op.outputs || []) : (op.inputs || []);
            return list.some(function (p) { return p && p.name === port; })
                ? pass(port + " is a " + direction + " port of " + opId)
                : fail(port + " is NOT a " + direction + " port of " + opId);
        },

        graph_in_library: async function (args) {
            var name = args && args.name;
            if (!name) return fail("missing args.name");
            try {
                var url = "/data/graphs/" + encodeURIComponent(name) + ".spikypanda";
                var r = await fetch(url, { method: "HEAD" });
                return r.ok ? pass("graph " + name + " present at " + url) : fail("HTTP " + r.status + " for " + url);
            } catch (e) { return fail(String(e && e.message || e)); }
        },

        research_dir_writable: async function () {
            try {
                var port = parseInt(window.location.port || "80", 10) + 1;
                var base = window.location.protocol + "//" + window.location.hostname + ":" + port;
                var r = await fetch(base + "/admin/research-dir");
                if (!r.ok) return fail("admin endpoint HTTP " + r.status);
                var body = await r.json();
                return body && body.path ? pass("writable, root=" + body.path) : fail("admin returned no path");
            } catch (e) { return fail(String(e && e.message || e)); }
        },

        dataset_min_entries: async function (args) {
            var n = args && typeof args.n === "number" ? args.n : 0;
            try {
                // Pull through the research adapter via __spk if exposed; fallback to admin proxy.
                var port = parseInt(window.location.port || "80", 10) + 1;
                var base = window.location.protocol + "//" + window.location.hostname + ":" + port;
                var r = await fetch(base + "/admin/research-dir");
                if (!r.ok) return fail("admin unreachable (HTTP " + r.status + ")");
                // No direct manifest endpoint yet in admin; report indeterminate.
                return fail("dataset_min_entries cannot be evaluated yet (no admin/dataset endpoint)");
                // TODO v2: add /admin/dataset/manifest GET endpoint and check items.length >= n.
                void n;
            } catch (e) { return fail(String(e && e.message || e)); }
        },
    };

    window.SpkPrereqChecks = registry;

    /**
     * Runs one prerequisite check by kind; returns a normalized result.
     * Unknown kinds resolve to a `fail` so the project page does not throw.
     */
    window.SpkRunPrereqCheck = async function (check) {
        if (!check || !check.kind) return fail("missing check.kind");
        var fn = registry[check.kind];
        if (typeof fn !== "function") return fail("unknown check kind: " + check.kind);
        try {
            return await fn(check.args || {});
        } catch (e) {
            return fail("check threw: " + String(e && e.message || e));
        }
    };
})();
