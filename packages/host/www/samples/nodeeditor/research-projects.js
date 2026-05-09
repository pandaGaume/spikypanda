// research-projects.html bootstrap.
//
// Reads the project list from the admin HTTP server and renders it as a
// table. The Create form posts a new project with name + goal + notes; the
// agent then drives the rest (prerequisites, hypotheses, matrix) from
// MCP. On successful creation, the page redirects to the per-project
// workspace at research-project.html?id=<projectId>.

(function () {
    "use strict";

    var adminPort = parseInt(window.location.port || "80", 10) + 1;
    var adminBase = window.location.protocol + "//" + window.location.hostname + ":" + adminPort;

    var listContainer = document.getElementById("rp-list-container");
    var form          = document.getElementById("rp-create-form");
    var nameInp       = document.getElementById("rp-name");
    var goalInp       = document.getElementById("rp-goal");
    var notesInp      = document.getElementById("rp-notes");
    var feedback      = document.getElementById("rp-feedback");

    function setFeedback(level, message) {
        feedback.className = "rp-feedback " + level;
        feedback.textContent = message;
        feedback.style.display = "";
    }

    function clearFeedback() { feedback.style.display = "none"; feedback.textContent = ""; }

    function progressPercent(p) {
        if (!p || !p.total) return 0;
        var done = (p.pass || 0) + (p.acked || 0);
        return Math.round((done / p.total) * 100);
    }

    function escapeHtml(s) {
        return String(s == null ? "" : s)
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }

    function renderList(items) {
        if (!items || items.length === 0) {
            listContainer.innerHTML = '<div class="rp-table-empty">No project yet. Use the form below to create one.</div>';
            return;
        }
        var rows = items.map(function (it) {
            var pct = progressPercent(it.prereqProgress);
            var p = it.prereqProgress || { total: 0, pass: 0, acked: 0, fail: 0, pending: 0 };
            return ""
                + "<tr>"
                + '<td><a class="proj-link" href="research-project.html?id=' + encodeURIComponent(it.id) + '">'
                + escapeHtml(it.name) + "</a><div style=\"font-size:11px;color:#6e7681;\">" + escapeHtml(it.id) + "</div></td>"
                + '<td><span class="rp-status ' + escapeHtml(it.status) + '">' + escapeHtml(it.status) + "</span></td>"
                + "<td>"
                + '<span class="rp-progress-bar"><span style="width:' + pct + '%;"></span></span>'
                + " " + pct + "% &middot; " + (p.pass + p.acked) + "/" + p.total
                + (p.fail ? ' <span style="color:#f85149;">(' + p.fail + ' fail)</span>' : "")
                + "</td>"
                + "<td>" + (it.runsCompleted || 0) + "</td>"
                + "<td>" + escapeHtml(new Date(it.updatedAt).toLocaleString()) + "</td>"
                + "</tr>";
        }).join("");
        listContainer.innerHTML = ""
            + '<table class="rp-table">'
            + "<thead><tr><th>Project</th><th>Status</th><th>Prereq progress</th><th>Runs</th><th>Updated</th></tr></thead>"
            + "<tbody>" + rows + "</tbody>"
            + "</table>";
    }

    async function loadList() {
        try {
            var r = await fetch(adminBase + "/admin/projects");
            if (!r.ok) throw new Error("HTTP " + r.status);
            var body = await r.json();
            renderList(body.items || []);
        } catch (e) {
            listContainer.innerHTML = '<div class="rp-feedback error">Could not load projects from '
                + escapeHtml(adminBase) + ": " + escapeHtml((e && e.message) || String(e))
                + "<br>Check that <code>npm run server</code> is running.</div>";
        }
    }

    form.addEventListener("submit", async function (ev) {
        ev.preventDefault();
        clearFeedback();
        var name  = (nameInp.value || "").trim();
        var goal  = (goalInp.value || "").trim();
        var notes = (notesInp.value || "").trim();
        if (!name || !goal) {
            setFeedback("error", "name and goal are required.");
            return;
        }
        try {
            var r = await fetch(adminBase + "/admin/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name, goal: goal, notes: notes }),
            });
            var body = await r.json().catch(function () { return {}; });
            if (!r.ok) throw new Error(body.error || ("HTTP " + r.status));
            setFeedback("ok", "Project created: " + body.id + " (redirecting to workspace...)");
            setTimeout(function () {
                window.location.href = "research-project.html?id=" + encodeURIComponent(body.id);
            }, 700);
        } catch (e) {
            setFeedback("error", "Creation failed: " + ((e && e.message) || String(e)));
        }
    });

    void loadList();
})();
