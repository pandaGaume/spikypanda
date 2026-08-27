// Minimal static file server for the SpikyPanda host www/ directory.
//
// Replaces the previous MCP-aware server that depended on @dev/tunnel
// and the (now-cleaned) packages/dev/mcp/dist/* providers. MCP routing
// will be re-introduced as a separate concern once the new MCP wiring
// is in place; until then this server only needs to ship the editor
// HTML + bundles to the browser.
//
// Environment:
//   SPK_HTTP_PORT   port to listen on   (default: 8080)
//   SPK_HTTP_HOST   bind interface      (default: 127.0.0.1 — loopback only)

import { createServer } from "http";
import { createReadStream, statSync } from "fs";
import { extname, join, normalize, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const WWW       = resolve(__dirname, "www");
const PORT      = parseInt(process.env.SPK_HTTP_PORT ?? "8080", 10);
const HOST      = process.env.SPK_HTTP_HOST ?? "127.0.0.1";

// Curated mime map covering everything the editor ships (JS bundles,
// CSS, source maps, ONNX models, fonts). Unknown extensions fall back
// to application/octet-stream — the browser handles it correctly for
// any binary that's only ever consumed via fetch().
const MIME = {
    ".html": "text/html; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".mjs":  "application/javascript; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".map":  "application/json; charset=utf-8",
    ".svg":  "image/svg+xml",
    ".png":  "image/png",
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif":  "image/gif",
    ".ico":  "image/x-icon",
    ".woff":  "font/woff",
    ".woff2": "font/woff2",
    ".ttf":   "font/ttf",
    ".onnx":  "application/octet-stream",
    ".wasm":  "application/wasm",
};

function send(res, status, body, headers = {}) {
    res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8", ...headers });
    res.end(body);
}

const server = createServer((req, res) => {
    // Decode + normalise the request path, then resolve against WWW.
    // The startsWith(WWW) guard blocks any `..` traversal that survives
    // normalize on Windows.
    const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    const rel     = normalize(urlPath === "/" ? "/index.html" : urlPath);
    const abs     = join(WWW, rel);
    if (!abs.startsWith(WWW)) { send(res, 403, "forbidden"); return; }

    let stat;
    try { stat = statSync(abs); } catch { send(res, 404, "not found"); return; }
    // Directory request → serve its index.html if present.
    const target = stat.isDirectory() ? join(abs, "index.html") : abs;
    try { statSync(target); } catch { send(res, 404, "not found"); return; }

    const mime = MIME[extname(target).toLowerCase()] ?? "application/octet-stream";
    res.writeHead(200, {
        "Content-Type": mime,
        "Cache-Control": "no-store",
    });
    createReadStream(target).pipe(res);
});

server.listen(PORT, HOST, () => {
    console.log(`[server] static root: ${WWW}`);
    console.log(`[server] listening:   http://${HOST}:${PORT}`);
    console.log(`[server] v2 editor:   http://${HOST}:${PORT}/node-editor-v2/index.html`);
});

// Clean shutdown so re-running the script in dev doesn't leave the
// port stuck in TIME_WAIT longer than needed.
for (const sig of ["SIGINT", "SIGTERM"]) {
    process.on(sig, () => {
        console.log(`\n[server] caught ${sig}, closing`);
        server.close(() => process.exit(0));
        // Hard exit after 2s if a connection stalls the graceful close.
        setTimeout(() => process.exit(0), 2000).unref();
    });
}
