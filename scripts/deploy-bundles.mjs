import { existsSync, readdirSync, copyFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

const sources = [
    join(root, "packages/dev/core/bundle"),
    join(root, "packages/dev/runtime/bundle"),
    join(root, "packages/dev/sensors/bundle"),
    join(root, "packages/dev/nodeeditor/bundle"),
    join(root, "packages/dev/onnx-editor/bundle"),
    join(root, "packages/dev/mcp/bundle"),
    join(root, "packages/dev/applications/stereo/bundle"),
];

const dest = join(root, "packages/host/www/bundle");

mkdirSync(dest, { recursive: true });

for (const src of sources) {
    if (!existsSync(src)) {
        console.log(`  skip ${src} (not found)`);
        continue;
    }
    for (const file of readdirSync(src)) {
        if (file.endsWith(".js") || file.endsWith(".js.map")) {
            copyFileSync(join(src, file), join(dest, file));
            console.log(`  ${file} -> ${dest}`);
        }
    }
}

// MCP grammar profiles. The JSON files are authored under
// packages/dev/mcp/grammars/ and consumed by nodeeditor-mcp.js via fetch
// on /bundle/grammars/<profile>.json, so they need to live in the served
// www/bundle tree alongside the JS bundles.
const grammarSrc  = join(root, "packages/dev/mcp/grammars");
const grammarDest = join(dest, "grammars");
if (existsSync(grammarSrc)) {
    mkdirSync(grammarDest, { recursive: true });
    for (const file of readdirSync(grammarSrc)) {
        if (file.endsWith(".json")) {
            copyFileSync(join(grammarSrc, file), join(grammarDest, file));
            console.log(`  grammars/${file} -> ${grammarDest}`);
        }
    }
} else {
    console.log(`  skip grammars (not found at ${grammarSrc})`);
}

console.log("deploy-bundles done.");
