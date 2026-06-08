import { existsSync, readdirSync, copyFileSync, mkdirSync, statSync } from "fs";
import { join, resolve, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

// JS / CSS bundles produced by each package's webpack build. The
// deploy script just flattens them into the host's bundle dir; the
// host picks them up via <script src="bundle/..."> tags.
const bundleSources = [
    join(root, "packages/dev/core/bundle"),
    join(root, "packages/dev/onnx/bundle"),
    join(root, "packages/dev/sensors/bundle"),
    join(root, "packages/dev/nodeeditor/bundle"),
    join(root, "packages/dev/onnx-editor/bundle"),
    join(root, "packages/dev/applications/stereo/bundle"),
    join(root, "packages/dev/plugins/geometry/bundle"),
    join(root, "packages/dev/plugins/logic/bundle"),
    join(root, "packages/dev/plugins/onnx/bundle"),
    join(root, "packages/dev/plugins/dsp/bundle"),
    join(root, "packages/dev/plugins/physics/bundle"),
    join(root, "packages/dev/plugins/control/bundle"),
    join(root, "packages/dev/plugins/chemistry/bundle"),
    join(root, "packages/dev/plugins/viz/bundle"),
    join(root, "packages/dev/plugins/helios/bundle"),
];

// Plugin-owned documentation. Each plugin keeps its node docs under
// its own `docs/` tree (the plugin developer's responsibility per
// convention). The deploy step merges every plugin's `docs/` into
// `host/www/bundle/docs/` preserving the relative directory structure
// the plugin chose — typically `docs/<namespace>/<category>/<node>.md`
// so plugin-A's `docs/foo/...` doesn't collide with plugin-B's.
//
// `ctx.assetUrl("docs/...")` at registration time resolves to the
// same `bundle/docs/...` URL regardless of which plugin owns the doc.
const docSources = [
    join(root, "packages/dev/plugins/geometry/docs"),
    join(root, "packages/dev/plugins/logic/docs"),
    join(root, "packages/dev/plugins/onnx/docs"),
    join(root, "packages/dev/plugins/dsp/docs"),
    join(root, "packages/dev/plugins/physics/docs"),
    join(root, "packages/dev/plugins/control/docs"),
    join(root, "packages/dev/plugins/chemistry/docs"),
    join(root, "packages/dev/plugins/viz/docs"),
    join(root, "packages/dev/plugins/helios/docs"),
];

const dest = join(root, "packages/host/www/bundle");
const docDest = join(dest, "docs");

mkdirSync(dest, { recursive: true });
mkdirSync(docDest, { recursive: true });

// Step 1: flatten JS / CSS bundles.
for (const src of bundleSources) {
    if (!existsSync(src)) {
        console.log(`  skip ${src} (not found)`);
        continue;
    }
    for (const file of readdirSync(src)) {
        if (file.endsWith(".js") || file.endsWith(".js.map") ||
            file.endsWith(".css") || file.endsWith(".css.map")) {
            copyFileSync(join(src, file), join(dest, file));
            console.log(`  ${file} -> ${dest}`);
        }
    }
}

// Step 2: merge plugin docs trees into bundle/docs/.
//
// Recursive walk so a plugin can author arbitrary depths
// (`docs/<namespace>/<subnamespace>/...`). Only `.md` files are
// copied — any sidecar PNG / SVG / video referenced by the markdown
// would need a parallel branch here (deferred until any plugin
// actually needs it).
function mergeDocsRecursive(src, dst) {
    if (!existsSync(src)) return;
    mkdirSync(dst, { recursive: true });
    for (const entry of readdirSync(src)) {
        const srcPath = join(src, entry);
        const dstPath = join(dst, entry);
        const stat = statSync(srcPath);
        if (stat.isDirectory()) {
            mergeDocsRecursive(srcPath, dstPath);
        } else if (entry.endsWith(".md")) {
            copyFileSync(srcPath, dstPath);
            const rel = relative(root, dstPath).split(/[\\/]+/).join("/");
            console.log(`  ${rel} (doc)`);
        }
    }
}
for (const src of docSources) {
    if (!existsSync(src)) {
        console.log(`  skip ${src} (not found)`);
        continue;
    }
    mergeDocsRecursive(src, docDest);
}

console.log("deploy-bundles done.");
