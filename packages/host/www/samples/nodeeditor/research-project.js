// research-project.html bootstrap.
//
// Loads a single project from the admin endpoint, renders prerequisites,
// hypotheses, matrix and stats. Auto-runs the registered check kinds when
// the user clicks "Run all auto checks", or per-row via the "Run" button.
// Manual prereqs offer an "Ack" action that posts to the admin endpoint.
//
// The project state is reloaded after every mutation so the UI always
// reflects the canonical disk state.

(function () {
    "use strict";

    var adminPort = parseInt(window.location.port || "80", 10) + 1;
    var adminBase = window.location.protocol + "//" + window.location.hostname + ":" + adminPort;

    var qs = new URLSearchParams(window.location.search);
    var projectId = qs.get("id");

    if (!projectId) {
        document.body.innerHTML = '<p style="padding: 24px; color: #f85149;">Missing ?id= query parameter.</p>';
        return;
    }

    var nameEl     = document.getElementById("pj-name");
    var idEl       = document.getElementById("pj-id");
    var statusEl   = document.getElementById("pj-status");
    var goalEl     = document.getElementById("pj-goal");
    var metaEl     = document.getElementById("pj-meta");
    var prereqEl   = document.getElementById("pj-prereqs");
    var hypEl      = document.getElementById("pj-hypotheses");
    var matrixEl   = document.getElementById("pj-matrix");

    var btnRefresh   = document.getElementById("pj-refresh");
    var btnRunAll    = document.getElementById("pj-run-all");
    var btnSetReady  = document.getElementById("pj-set-ready");
    var btnSetActive = document.getElementById("pj-set-active");
    var btnSetClosed = document.getElementById("pj-set-closed");

    var currentProject = null;

    // ── Helpers ─────────────────────────────────────────────────────

    function escapeHtml(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function lampGlyph(status) {
        if (status === "pass")    return { glyph: "&#x2713;", cls: "pass" };
        if (status === "fail")    return { glyph: "&#x2717;", cls: "fail" };
        if (status === "acked")   return { glyph: "&#x2611;", cls: "acked" };
        return { glyph: "&#x25cb;", cls: "pending" };
    }

    async function fetchProject() {
        var r = await fetch(adminBase + "/admin/projects/" + encodeURIComponent(projectId));
        if (r.status === 404) throw new Error("Project not found.");
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
    }

    async function patchProject(patch) {
        var r = await fetch(adminBase + "/admin/projects/" + encodeURIComponent(projectId), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
        });
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
    }

    async function postPrereqResult(prereqId, status, message) {
        var r = await fetch(adminBase + "/admin/projects/" + encodeURIComponent(projectId)
            + "/prereq/" + encodeURIComponent(prereqId), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: status, message: message }),
        });
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
    }

    async function postPrereqAck(prereqId, message) {
        var r = await fetch(adminBase + "/admin/projects/" + encodeURIComponent(projectId)
            + "/prereq/" + encodeURIComponent(prereqId) + "/ack", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ackedBy: "human@page", message: message }),
        });
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
    }

    async function postStatus(status) {
        var r = await fetch(adminBase + "/admin/projects/" + encodeURIComponent(projectId)
            + "/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: status }),
        });
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
    }

    // ── Render ──────────────────────────────────────────────────────

    function renderHeader(p) {
        nameEl.textContent = p.name || p.id;
        idEl.textContent = p.id;
        statusEl.className = "pj-status-badge " + (p.status || "draft");
        statusEl.textContent = p.status || "draft";
        document.title = "SpikyPanda - " + (p.name || p.id);
    }

    function renderGoal(p) {
        goalEl.textContent = p.goal || "(no goal)";
        var t = p.prerequisites ? p.prerequisites.length : 0;
        var pass = (p.prerequisites || []).filter(function (q) { return q.status === "pass"; }).length;
        var ack  = (p.prerequisites || []).filter(function (q) { return q.status === "acked"; }).length;
        var fail = (p.prerequisites || []).filter(function (q) { return q.status === "fail"; }).length;
        metaEl.innerHTML = "<small>" + (pass + ack) + "/" + t + " prereqs ok"
            + (fail ? ' <span style="color:#f85149">(' + fail + ' fail)</span>' : "")
            + " &middot; runs: " + (p.stats ? p.stats.runsCompleted : 0)
            + " &middot; updated: " + escapeHtml(new Date(p.updatedAt).toLocaleString())
            + "</small>";
    }

    function renderPrereqs(p) {
        var list = p.prerequisites || [];
        if (list.length === 0) {
            prereqEl.innerHTML = '<div class="pj-empty">No prerequisite defined yet. Ask the agent to call <code>project_define_prerequisites</code>.</div>';
            return;
        }
        var rows = list.map(function (q) {
            var l = lampGlyph(q.status);
            var detail = "";
            if (q.type === "auto" && q.check) {
                detail = "auto &middot; kind: " + escapeHtml(q.check.kind);
                if (q.check.args) detail += " &middot; args: " + escapeHtml(JSON.stringify(q.check.args));
            } else if (q.type === "manual") {
                detail = "manual &middot; ack required";
                if (q.ackedBy) detail += " &middot; acked by " + escapeHtml(q.ackedBy);
            }
            if (q.message) detail += "<br>msg: " + escapeHtml(q.message);
            if (q.lastRun) detail += " &middot; last: " + escapeHtml(new Date(q.lastRun).toLocaleString());
            var rem = q.remediation ? '<div class="remediation">remediation: ' + escapeHtml(q.remediation) + "</div>" : "";

            var actions = "";
            if (q.type === "auto") {
                actions += '<button data-act="run" data-id="' + escapeHtml(q.id) + '">Run</button> ';
            }
            actions += '<button data-act="ack" data-id="' + escapeHtml(q.id) + '">Ack</button>';

            return ""
                + '<tr><td class="lamp"><span class="lamp ' + l.cls + '">' + l.glyph + "</span></td>"
                + '<td><div class="desc">' + escapeHtml(q.description) + "</div>"
                + '<div class="meta">' + detail + "</div>" + rem + "</td>"
                + '<td class="actions">' + actions + "</td></tr>";
        }).join("");
        prereqEl.innerHTML = '<table class="pj-prereq"><tbody>' + rows + "</tbody></table>";

        // Wire row buttons
        prereqEl.querySelectorAll("button[data-act]").forEach(function (b) {
            b.addEventListener("click", async function () {
                var id = b.getAttribute("data-id");
                var act = b.getAttribute("data-act");
                if (act === "run") return runOnePrereq(id);
                if (act === "ack") return ackOnePrereq(id);
            });
        });
    }

    function renderHypotheses(p) {
        var list = p.hypotheses || [];
        if (list.length === 0) {
            hypEl.innerHTML = '<div class="pj-empty">No hypothesis defined yet.</div>';
            return;
        }
        var rows = list.map(function (h) {
            return ""
                + "<li>"
                + '<div class="stmt">' + escapeHtml(h.statement) + "</div>"
                + '<div class="falsify">falsify if: ' + escapeHtml(h.falsifyIf) + "</div>"
                + '<span class="verdict ' + escapeHtml(h.status) + '">' + escapeHtml(h.status) + "</span>"
                + "</li>";
        }).join("");
        hypEl.innerHTML = '<ul class="pj-hyp">' + rows + "</ul>";
    }

    function renderMatrix(p) {
        var m = p.matrix;
        var stats = p.stats || {};
        if (!m || !m.factors) {
            matrixEl.innerHTML = ""
                + '<div class="pj-empty">No matrix defined yet.</div>'
                + '<div style="margin-top:10px;font-size:11px;color:#8b949e;">'
                + "experiments: " + (stats.runsCompleted || 0) + " &middot; "
                + "dataset: " + (stats.datasetEntries || 0) + " &middot; "
                + "reports: " + (stats.reportCount || 0) + " &middot; "
                + "training: " + (stats.trainingRuns || 0)
                + "</div>";
            return;
        }
        var factorRows = Object.keys(m.factors).map(function (k) {
            var vals = (m.factors[k] || []).map(escapeHtml).join(", ");
            return "<tr><td><strong>" + escapeHtml(k) + "</strong></td><td>" + vals + "</td></tr>";
        }).join("");
        var total = m.totalRuns != null ? m.totalRuns : "(unset)";
        var reps  = m.replicates != null ? m.replicates : "(unset)";
        matrixEl.innerHTML = ""
            + '<table class="pj-matrix-table"><thead><tr><th>Factor</th><th>Values</th></tr></thead>'
            + "<tbody>" + factorRows + "</tbody></table>"
            + '<div style="margin-top:10px;font-size:11px;color:#8b949e;">'
            + "replicates: " + escapeHtml(reps) + " &middot; total runs: " + escapeHtml(total) + " &middot; "
            + "completed: " + (stats.runsCompleted || 0) + " &middot; "
            + "dataset: " + (stats.datasetEntries || 0)
            + "</div>";
    }

    function render(p) {
        currentProject = p;
        renderHeader(p);
        renderGoal(p);
        renderPrereqs(p);
        renderHypotheses(p);
        renderMatrix(p);
    }

    // ── Actions ─────────────────────────────────────────────────────

    async function reload() {
        try {
            var p = await fetchProject();
            render(p);
        } catch (e) {
            document.body.innerHTML = '<p style="padding: 24px; color: #f85149;">Could not load project: '
                + escapeHtml((e && e.message) || String(e))
                + ' &middot; <a href="research-projects.html">back</a></p>';
        }
    }

    async function runOnePrereq(id) {
        var pre = (currentProject && currentProject.prerequisites || []).find(function (q) { return q.id === id; });
        if (!pre) return;
        if (pre.type !== "auto" || !pre.check) {
            alert("This prereq is manual; click Ack to acknowledge it instead.");
            return;
        }
        if (!window.SpkRunPrereqCheck) {
            alert("prereq-checks.js did not load.");
            return;
        }
        var result;
        try {
            result = await window.SpkRunPrereqCheck(pre.check);
        } catch (e) {
            result = { status: "fail", message: "check threw: " + ((e && e.message) || String(e)) };
        }
        try {
            var updated = await postPrereqResult(id, result.status, result.message);
            render(updated);
        } catch (e) {
            alert("Could not record result: " + ((e && e.message) || String(e)));
        }
    }

    async function ackOnePrereq(id) {
        var note = prompt("Ack message (optional, e.g. 'verified manually on 2026-05-09'):", "");
        try {
            var updated = await postPrereqAck(id, note || "");
            render(updated);
        } catch (e) {
            alert("Could not ack: " + ((e && e.message) || String(e)));
        }
    }

    async function runAllAuto() {
        if (!currentProject) return;
        var list = (currentProject.prerequisites || []).filter(function (q) { return q.type === "auto" && q.check; });
        if (list.length === 0) { alert("No auto prereq to run."); return; }
        btnRunAll.disabled = true;
        try {
            for (var i = 0; i < list.length; i++) {
                await runOnePrereq(list[i].id);
            }
        } finally {
            btnRunAll.disabled = false;
        }
    }

    async function setProjectStatus(status) {
        try {
            var updated = await postStatus(status);
            render(updated);
        } catch (e) {
            alert("Could not change status: " + ((e && e.message) || String(e)));
        }
    }

    // ── Wire up ─────────────────────────────────────────────────────

    btnRefresh.addEventListener("click",   function () { void reload(); });
    btnRunAll.addEventListener("click",    function () { void runAllAuto(); });
    btnSetReady.addEventListener("click",  function () { void setProjectStatus("ready"); });
    btnSetActive.addEventListener("click", function () { void setProjectStatus("active"); });
    btnSetClosed.addEventListener("click", function () { void setProjectStatus("closed"); });

    void reload();
})();
