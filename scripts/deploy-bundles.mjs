import { existsSync, readdirSync, copyFileSync, mkdirSync } from "fs";
import { join, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const root = resolve(__dirname, "..");

const sources = [
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
];

const dest = join(root, "packages/host/www/bundle");

mkdirSync(dest, { recursive: true });

for (const src of sources) {
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

console.log("deploy-bundles done.");
