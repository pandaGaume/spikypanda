// SpikyPanda MCP server entry point.
//
// Workers running in this process:
//
//   1. WsTunnel on SPK_MCP_PORT (default 8080).
//      Static www/, browser McpServer providers, SSE endpoints for clients.
//
//   2. In-process research provider connected to the tunnel as "research".
//      Filesystem-backed (SpkResearchAdapter); root directory is editable
//      at runtime via /admin/research-dir.
//
//   3. In-process projects provider connected to the tunnel as "projects".
//      Filesystem-backed (SpkProjectAdapter); shares the research root so a
//      single change relocates both surfaces.
//
//   4. Admin HTTP server on SPK_MCP_PORT + 1 (default 8081). Exposes a small
//      CORS-enabled REST surface so the web pages can manage the research
//      root and the projects without going through MCP.
//
// Configuration (env vars):
//   SPK_MCP_PORT         tunnel listening port            (default: 8080)
//   SPK_MCP_HOST         tunnel bind interface            (default: undefined = 0.0.0.0)
//   SPK_MCP_ADMIN_PORT   admin HTTP listening port        (default: SPK_MCP_PORT + 1)
//   SPK_RESEARCH_DIR     initial research root directory  (default: ~/spikypanda-research)
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import { createServer } from "http";
import { createServer as createNetServer } from "net";
import { WsTunnelBuilder } from "@dev/tunnel";
import { McpServerBuilder, McpGrammarBehavior, McpGrammarStore } from "@dev/core";
import { SpkResearchAdapter } from "../dev/mcp/dist/research/spk.research.adapter.js";
import { SpkResearchBehavior } from "../dev/mcp/dist/research/spk.research.behavior.js";
import { SpkProjectAdapter } from "../dev/mcp/dist/projects/spk.project.adapter.js";
import { SpkProjectBehavior } from "../dev/mcp/dist/projects/spk.project.behavior.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT       = parseInt(process.env.SPK_MCP_PORT       ?? "8080", 10);
const HOST       = process.env.SPK_MCP_HOST;
const ADMIN_PORT = parseInt(process.env.SPK_MCP_ADMIN_PORT ?? String(PORT + 1), 10);
const WWW        = resolve(__dirname, "www");
const RESEARCH_DEFAULT = process.env.SPK_RESEARCH_DIR || resolve(homedir(), "spikypanda-research");

// --------------------------------------------------------------------------
// 1. WsTunnel
//
// WsTunnel emits its EADDRINUSE on an asynchronous `error` event, which
// crashes Node with a stack trace the moment the operator is least able to
// read it. We instead probe the port synchronously beforehand and exit with
// an actionable message; same defensive treatment for the admin port.
// --------------------------------------------------------------------------
async function assertPortFree(port, host, label) {
    return new Promise((resolveCheck) => {
        const tester = createNetServer();
        tester.once("error", (e) => {
            if (e && e.code === "EADDRINUSE") {
                console.error(`[server] ${label} port ${port} is already in use.`);
                console.error(`[server] Find and kill the holder, then re-run \`npm run server\`:`);
                console.error(`[server]   Windows:      netstat -ano | findstr :${port}    then    taskkill /PID <pid> /F`);
                console.error(`[server]   macOS/Linux:  lsof -i :${port}    then    kill <pid>`);
                console.error(`[server] Or change the port:  SPK_MCP_PORT=8090 npm run server`);
                process.exit(2);
            }
            console.error(`[server] ${label} port ${port}: ${e && e.message ? e.message : String(e)}`);
            process.exit(2);
        });
        tester.once("listening", () => tester.close(() => resolveCheck()));
        tester.listen(port, host ?? "0.0.0.0");
    });
}

await assertPortFree(PORT, HOST, "Tunnel");
if (ADMIN_PORT > 0) await assertPortFree(ADMIN_PORT, HOST, "Admin");

const tunnelBuilder = new WsTunnelBuilder()
    .withPort(PORT)
    .withStaticMount("/", WWW);
if (HOST) tunnelBuilder.withHost(HOST);
const tunnel = tunnelBuilder.build();
await tunnel.start();

// --------------------------------------------------------------------------
// 2. Research provider (in-process)
// --------------------------------------------------------------------------
const researchAdapter = new SpkResearchAdapter(RESEARCH_DEFAULT);
await researchAdapter.ensureInitialized();

const researchGrammar = new McpGrammarStore();
const researchProviderName = "research";
const researchWsUrl = `ws://localhost:${PORT}/provider/${researchProviderName}`;

const researchServer = new McpServerBuilder()
    .withName(researchProviderName)
    .withWsUrl(researchWsUrl)
    .withGrammarStore(researchGrammar)
    .withInitializer({
        initialize() {
            return {
                protocolVersion: "2024-11-05",
                serverInfo: { name: researchProviderName, version: "0.1.0" },
                instructions: "SpikyPanda research store: experiments, hypotheses, reports, dataset.",
            };
        },
    })
    .register(
        new SpkResearchBehavior(researchAdapter),
        new McpGrammarBehavior(researchGrammar),
    )
    .build();

await researchServer.start();

// --------------------------------------------------------------------------
// 3. Projects provider (in-process). Shares the research root via getter so
//    /admin/research-dir keeps both surfaces aligned.
// --------------------------------------------------------------------------
const projectAdapter = new SpkProjectAdapter(() => researchAdapter.rootDirectory);
await projectAdapter.ensureProjectsRoot();

const projectGrammar = new McpGrammarStore();
const projectProviderName = "projects";
const projectWsUrl = `ws://localhost:${PORT}/provider/${projectProviderName}`;

const projectServer = new McpServerBuilder()
    .withName(projectProviderName)
    .withWsUrl(projectWsUrl)
    .withGrammarStore(projectGrammar)
    .withInitializer({
        initialize() {
            return {
                protocolVersion: "2024-11-05",
                serverInfo: { name: projectProviderName, version: "0.1.0" },
                instructions:
                    "SpikyPanda research project lifecycle. Create projects, define prerequisites " +
                    "(picking from project_list_check_kinds), record check results, ack manuals, " +
                    "set hypothesis verdicts, drive the experimental matrix.",
            };
        },
    })
    .register(
        new SpkProjectBehavior(projectAdapter),
        new McpGrammarBehavior(projectGrammar),
    )
    .build();

await projectServer.start();

// --------------------------------------------------------------------------
// 4. Admin HTTP (CORS-enabled GET/POST)
// --------------------------------------------------------------------------
let adminServer = null;

const sendJson = (res, status, body) => {
    res.writeHead(status, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS",
    });
    res.end(JSON.stringify(body));
};

const readBody = (req) => new Promise((resolveBody, rejectBody) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
        try { resolveBody(raw ? JSON.parse(raw) : {}); }
        catch (e) { rejectBody(e); }
    });
    req.on("error", rejectBody);
});

if (ADMIN_PORT > 0) {
    adminServer = createServer(async (req, res) => {
        try {
            if (req.method === "OPTIONS") return sendJson(res, 204, {});
            const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
            const path = url.pathname;

            // ── /admin/research-dir ──────────────────────────────────
            if (path === "/admin/research-dir" && req.method === "GET") {
                return sendJson(res, 200, { path: researchAdapter.rootDirectory });
            }
            if (path === "/admin/research-dir" && req.method === "POST") {
                const body = await readBody(req);
                const newPath = String(body.path || "").trim();
                if (!newPath) return sendJson(res, 400, { error: "Missing 'path'." });
                await researchAdapter.setRootDirectory(newPath);
                await projectAdapter.ensureProjectsRoot();
                return sendJson(res, 200, { path: researchAdapter.rootDirectory });
            }

            // ── /admin/projects ──────────────────────────────────────
            if (path === "/admin/projects" && req.method === "GET") {
                const items = await projectAdapter.listProjects();
                return sendJson(res, 200, { count: items.length, items });
            }
            if (path === "/admin/projects" && req.method === "POST") {
                const body = await readBody(req);
                const project = await projectAdapter.createProject({
                    id:    body.id, name: body.name, goal: body.goal, notes: body.notes,
                });
                return sendJson(res, 201, project);
            }

            // ── /admin/projects/check-kinds ──────────────────────────
            if (path === "/admin/projects/check-kinds" && req.method === "GET") {
                const { BUILT_IN_CHECK_KINDS } = await import("../dev/mcp/dist/projects/spk.project.types.js");
                return sendJson(res, 200, { count: BUILT_IN_CHECK_KINDS.length, kinds: BUILT_IN_CHECK_KINDS });
            }

            // ── /admin/projects/:id ──────────────────────────────────
            const projectMatch = path.match(/^\/admin\/projects\/([A-Za-z0-9._-]+)(?:\/(.+))?$/);
            if (projectMatch) {
                const projectId = projectMatch[1];
                const sub = projectMatch[2];

                if (!sub && req.method === "GET") {
                    const p = await projectAdapter.getProject(projectId);
                    if (!p) return sendJson(res, 404, { error: "Project not found." });
                    return sendJson(res, 200, p);
                }
                if (!sub && req.method === "PATCH") {
                    const body = await readBody(req);
                    const p = await projectAdapter.updateProject(projectId, body);
                    return sendJson(res, 200, p);
                }
                if (!sub && req.method === "DELETE") {
                    await projectAdapter.deleteProject(projectId);
                    return sendJson(res, 200, { id: projectId, deleted: true });
                }

                // /admin/projects/:id/status
                if (sub === "status" && req.method === "POST") {
                    const body = await readBody(req);
                    const p = await projectAdapter.setStatus(projectId, body.status);
                    return sendJson(res, 200, p);
                }

                // /admin/projects/:id/prereqs
                if (sub === "prereqs" && req.method === "PUT") {
                    const body = await readBody(req);
                    const p = await projectAdapter.definePrerequisites(projectId, body.prerequisites ?? []);
                    return sendJson(res, 200, p);
                }

                // /admin/projects/:id/prereq/:prereqId
                const prereqMatch = sub && sub.match(/^prereq\/([A-Za-z0-9._-]+)(\/.+)?$/);
                if (prereqMatch && req.method === "POST") {
                    const prereqId = prereqMatch[1];
                    const action = prereqMatch[2];
                    const body = await readBody(req);
                    if (action === "/ack") {
                        const p = await projectAdapter.ackPrereq(projectId, prereqId, body.ackedBy, body.message);
                        return sendJson(res, 200, p);
                    }
                    // default: result
                    const p = await projectAdapter.setPrereqResult(projectId, prereqId, body.status, body.message);
                    return sendJson(res, 200, p);
                }

                // /admin/projects/:id/hypotheses
                if (sub === "hypotheses" && req.method === "PUT") {
                    const body = await readBody(req);
                    const p = await projectAdapter.defineHypotheses(projectId, body.hypotheses ?? []);
                    return sendJson(res, 200, p);
                }

                // /admin/projects/:id/hypothesis/:hypothesisId
                const hypMatch = sub && sub.match(/^hypothesis\/([A-Za-z0-9._-]+)$/);
                if (hypMatch && req.method === "POST") {
                    const body = await readBody(req);
                    const p = await projectAdapter.setHypothesisStatus(projectId, hypMatch[1], body.status, body.notes);
                    return sendJson(res, 200, p);
                }

                // /admin/projects/:id/matrix
                if (sub === "matrix" && req.method === "PUT") {
                    const body = await readBody(req);
                    const p = await projectAdapter.setMatrix(projectId, body.matrix ?? null);
                    return sendJson(res, 200, p);
                }
            }

            sendJson(res, 404, { error: "Not found." });
        } catch (err) {
            sendJson(res, 500, { error: err && err.message ? err.message : String(err) });
        }
    });

    await new Promise((resolveListen, rejectListen) => {
        adminServer.once("error", rejectListen);
        adminServer.listen(ADMIN_PORT, () => resolveListen());
    });
}

// --------------------------------------------------------------------------
// Banner
// --------------------------------------------------------------------------
const displayHost = HOST ?? "localhost";
console.log("SpikyPanda MCP server running.");
console.log(`  Static files       http://${displayHost}:${PORT}/`);
console.log(`  Node editor MCP    http://${displayHost}:${PORT}/samples/nodeeditor/nodeeditor-mcp.html`);
console.log(`  Projects list      http://${displayHost}:${PORT}/samples/nodeeditor/research-projects.html`);
console.log(`  Provider socket    ws://${displayHost}:${PORT}/provider/<name>`);
console.log(`  Sim endpoint       http://${displayHost}:${PORT}/nodeeditor/mcp`);
console.log(`  Research endpoint  http://${displayHost}:${PORT}/research/mcp     (root: ${researchAdapter.rootDirectory})`);
console.log(`  Projects endpoint  http://${displayHost}:${PORT}/projects/mcp     (root: ${projectAdapter.projectsRoot})`);
if (adminServer) console.log(`  Admin HTTP         http://${displayHost}:${ADMIN_PORT}/admin/...`);

// --------------------------------------------------------------------------
// Graceful shutdown
// --------------------------------------------------------------------------
const shutdown = async (signal) => {
    console.log(`\nReceived ${signal}, stopping...`);
    try { await projectServer.stop();  } catch { /* ignore */ }
    try { await researchServer.stop(); } catch { /* ignore */ }
    if (adminServer) {
        await new Promise((r) => adminServer.close(() => r()));
    }
    try { await tunnel.stop?.(); } catch { /* ignore */ }
    process.exit(0);
};
process.on("SIGINT",  () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
