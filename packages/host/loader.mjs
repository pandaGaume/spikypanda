// Custom Node.js ESM resolution hook.
//
// Why : mcp-for-babylon's @dev/core and @dev/tunnel ship dist/ files compiled
// with TypeScript module: ES2020, which emits relative imports without the
// `.js` extension. Under Node 22 strict ESM resolution this throws
// ERR_MODULE_NOT_FOUND. We fall back to appending `.js` (then `/index.js`)
// to bare relative specifiers when the default resolver fails.
//
// The hook only kicks in on lookup failure, so it's a no-op for any package
// that already ships proper ESM-compatible dist files.
//
// Registered by ./loader-register.mjs which is itself attached to the
// process via `node --import ./packages/host/loader-register.mjs server.mjs`.

const RECOVERABLE = new Set(["ERR_MODULE_NOT_FOUND", "ERR_UNSUPPORTED_DIR_IMPORT"]);
const isExtensionless = (s) => s && !/\.(m?js|cjs|json|node)$/.test(s);

export async function resolve(specifier, context, nextResolve) {
    try {
        return await nextResolve(specifier, context);
    } catch (err) {
        if (!err || !RECOVERABLE.has(err.code)) throw err;

        // ERR_UNSUPPORTED_DIR_IMPORT is raised for `import "./folder"` where
        // folder is an actual directory. Append /index.js first in that case;
        // otherwise try .js then /index.js.
        const variants =
            err.code === "ERR_UNSUPPORTED_DIR_IMPORT"
                ? [specifier + "/index.js"]
                : isExtensionless(specifier)
                    ? [specifier + ".js", specifier + "/index.js"]
                    : [];

        for (const v of variants) {
            try {
                return await nextResolve(v, context);
            } catch (inner) {
                if (!inner || !RECOVERABLE.has(inner.code)) throw inner;
            }
        }
        throw err;
    }
}
