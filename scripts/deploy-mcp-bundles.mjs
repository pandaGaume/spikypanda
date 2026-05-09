// Copies the prebuilt mcp-core.js / mcp-server.js from the sibling
// mcp-for-babylon repo into packages/host/www/bundle/. SpikyPanda treats
// mcp-for-babylon as an external library, so its browser bundles live in
// the source repo and are mirrored here only when this script runs.
//
// Default location: ../Gaume/mcp-for-babylon (relative to the SpikyPanda
// repo root). Override with the MCP_FOR_BABYLON_DIR environment variable.
import { existsSync, copyFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

const mcpRepo = process.env.MCP_FOR_BABYLON_DIR
    ? resolve(process.env.MCP_FOR_BABYLON_DIR)
    : resolve(root, "..", "Gaume", "mcp-for-babylon");

const src  = join(mcpRepo, "packages", "host", "www", "bundle");
const dest = join(root, "packages", "host", "www", "bundle");

if (!existsSync(src)) {
    console.error(`deploy-mcp-bundles: source not found: ${src}`);
    console.error("Set MCP_FOR_BABYLON_DIR to point at the mcp-for-babylon repo root.");
    process.exit(1);
}

mkdirSync(dest, { recursive: true });

const files = [
    "mcp-core.js",
    "mcp-core.js.map",
    "mcp-server.js",
    "mcp-server.js.map",
];

let copied = 0;
for (const f of files) {
    const from = join(src, f);
    const to   = join(dest, f);
    if (!existsSync(from)) {
        console.warn(`  skip ${f} (not found in ${src})`);
        continue;
    }
    copyFileSync(from, to);
    console.log(`  ${f} -> ${dest}`);
    copied += 1;
}

console.log(`deploy-mcp-bundles done (${copied} file(s)).`);
