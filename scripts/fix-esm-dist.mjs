// Make a package's `dist/` runnable by Node without a bundler or a loader.
//
// `tsc` copies import specifiers as written. The sources import siblings
// without an extension (`./graph`) and other workspace packages through the
// path aliases of tsconfig (`spikypanda-core`). Both resolve in TypeScript,
// in webpack and in jest; neither resolves in Node's ESM loader, which wants
// `./graph/index.js` and `@spiky-panda/core`. A published package with such
// a dist/ cannot be imported by anyone: the harness had to carry its own
// loader to work around it.
//
// This script rewrites, in place and idempotently, every specifier of every
// `.js` and `.d.ts` file under dist/:
//   - a relative specifier gets `.js`, or `/index.js` for a directory,
//     decided by looking at the files actually emitted next to it;
//   - a path alias becomes the published package name, subpaths pointing at
//     the target's dist/.
// It runs after `tsc -b`, from the repository root:
//
//   node scripts/fix-esm-dist.mjs packages/dev/core packages/dev/plugins/physics ...
//
// It never touches src/ and reports every specifier it could not resolve.
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** tsconfig alias -> published package name. */
const ALIASES = [
    [/^spikypanda-core(\/.*)?$/, "@spiky-panda/core"],
    [/^spikypanda-onnx(\/.*)?$/, "@spiky-panda/onnx"],
    [/^spikypanda-nodeeditor(\/.*)?$/, "@spiky-panda/nodeeditor"],
    [/^spikypanda-mcp(\/.*)?$/, "@spiky-panda/mcp"],
    [/^spikypanda-factory(\/.*)?$/, "@spiky-panda/factory"],
    [/^spikypanda-plugin-([a-z]+)(\/.*)?$/, "@spiky-panda/plugin-$1"],
    [/^spikypanda-applications-([a-z]+)(\/.*)?$/, "@spiky-panda/applications-$1"],
];

/** Matches `from "x"`, `import "x"`, `import("x")`, `require("x")`, `export * from "x"`. */
const SPECIFIER = /(\b(?:from|import|require)\s*\(?\s*)(["'])([^"'\n]+)\2/g;

function isTypes(file) {
    return file.endsWith(".d.ts");
}

/** Resolve a relative specifier against the emitted files: file first, then directory index. */
function relativeTarget(file, spec) {
    const base = path.resolve(path.dirname(file), spec);
    const ext = isTypes(file) ? ".d.ts" : ".js";
    if (/\.(js|mjs|cjs|json|css|scss|svg|png|jpg|html|txt)$/.test(spec)) return spec; // explicit, or an asset a bundler handles
    if (fs.existsSync(base + ext)) return spec + ".js";
    if (fs.existsSync(path.join(base, "index" + ext))) return spec.replace(/\/$/, "") + "/index.js";
    return null;
}

function aliasTarget(spec) {
    for (const [pattern, name] of ALIASES) {
        const m = spec.match(pattern);
        if (!m) continue;
        const sub = m[m.length - 1]; // the optional subpath group is always last
        const pkg = name.replace("$1", m[1] ?? "");
        if (!sub) return pkg;
        // A subpath of a workspace package points at its emitted file.
        const clean = sub.replace(/\.js$/, "");
        return `${pkg}/dist${clean}.js`;
    }
    return null;
}

function fixFile(file, report) {
    const before = fs.readFileSync(file, "utf8");
    const after = before.replace(SPECIFIER, (whole, head, quote, spec) => {
        let target = null;
        if (spec.startsWith("./") || spec.startsWith("../")) {
            target = relativeTarget(file, spec);
            if (target === null) {
                report.unresolved.push(`${path.relative(ROOT, file)}: ${spec}`);
                return whole;
            }
        } else {
            target = aliasTarget(spec);
            if (target === null) return whole; // a real package: untouched
        }
        if (target === spec) return whole;
        report.rewritten++;
        return `${head}${quote}${target}${quote}`;
    });
    if (after !== before) {
        fs.writeFileSync(file, after);
        report.files++;
    }
}

function walk(dir, out) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, out);
        else if (/\.(js|d\.ts)$/.test(entry.name)) out.push(full);
    }
    return out;
}

export function fixPackage(pkgDir) {
    const dist = path.join(pkgDir, "dist");
    if (!fs.existsSync(dist)) throw new Error(`${pkgDir}: no dist/ (run tsc -b first)`);
    const report = { files: 0, rewritten: 0, unresolved: [] };
    for (const file of walk(dist, [])) fixFile(file, report);
    return report;
}

const targets = process.argv.slice(2);
if (targets.length === 0) {
    console.error("usage: node scripts/fix-esm-dist.mjs <package dir> [...]");
    process.exit(2);
}
let failed = false;
for (const t of targets) {
    const dir = path.resolve(t); // relative to the working directory: works from the root and from a package
    const r = fixPackage(dir);
    const name = path.relative(ROOT, dir).split(path.sep).join("/");
    console.error(`${name}: ${r.rewritten} specifier(s) rewritten in ${r.files} file(s)`);
    for (const u of r.unresolved) {
        console.error(`  unresolved: ${u}`);
        failed = true;
    }
}
process.exit(failed ? 1 : 0);
