import type { ILinkRegistry, INodeRegistry } from "spikypanda-core";
import type { EditorRegistry } from "./editor-registry";
import type { IPlugin, IPluginContext, IPluginManifest, ISubPluginManifest } from "./plugin.interfaces";

/**
 * Browser-side plugin loader. Each plugin bundle exposes its module
 * under `window[globalName]` (typically the UMD library name produced
 * by webpack). The loader walks the optional manifest's `subPlugins[]`
 * and `manifestRefs[]`, then invokes `activate(ctx)` once per
 * sub-plugin with a context scoped to that sub-plugin's id.
 *
 * The four-step resolution at activation time (highest priority first):
 *
 *   1. Explicit `manifest` passed in `options` (the host already has it).
 *   2. `plugin.manifest` field attached to the bundle module itself
 *      (an opt-in convenience for plugins that embed their manifest).
 *   3. No manifest → fall back to `Object.keys(plugin.subPlugins ?? {})`,
 *      activating each entry in declaration order. Suitable for simple
 *      V1 plugins that don't need `manifestRefs[]` discovery.
 *   4. No `subPlugins` map either → fall back to a single
 *      `plugin.activate(ctx)` call, the legacy flat-plugin behaviour.
 *
 * Keeping this in the library (rather than in every host's bootstrap
 * script) means the discovery semantics — narrowing, fetch policy,
 * scoped context — stay consistent across hosts (v2 editor, future
 * standalone apps, embedded preview surfaces).
 */

export interface LoadPluginOptions {
    /** The application's NodeRegistry that sub-plugins register into. */
    nodes: INodeRegistry;
    /** The application's LinkRegistry for concrete persisted edge types. */
    links: ILinkRegistry;
    /** The application's EditorRegistry that sub-plugins register into. */
    editors: EditorRegistry;
    /** Resolves a plugin-relative path to an absolute URL. Typically
     *  returns something like `"../bundle/<p>"`. Used for `manifestRefs[]`
     *  fetches and surfaced to each sub-plugin's context. */
    assetUrl: (relativePath: string) => string;
    /** Explicit manifest to drive the activation. When omitted, the
     *  loader probes `plugin.manifest` then falls back to the bare
     *  `subPlugins` map keys. */
    manifest?: IPluginManifest;
}

export interface LoadPluginResult {
    /** Sub-plugin ids that were activated, in declaration order. */
    readonly activated: ReadonlyArray<string>;
    /** Sub-plugin ids listed in the manifest but missing from the
     *  bundle's exported `subPlugins` map. Surfaced for diagnostics. */
    readonly missing: ReadonlyArray<string>;
}

/**
 * Activates the plugin module published under `window[globalName]`,
 * optionally driven by a manifest. Always safe to call multiple times
 * for the same plugin — each call re-runs the activation chain (and
 * sub-plugins' `activate` may dedupe internally if they care).
 *
 * Returns the list of sub-plugins activated (and any missing) so the
 * host can log them. Logging is delegated to the host: this function
 * only `console.warn`s the missing-module case.
 */
export async function loadPlugin(globalName: string, id: string, options: LoadPluginOptions): Promise<LoadPluginResult> {
    const ns = (globalThis as Record<string, unknown>)[globalName] as
        | { default?: IPlugin & { manifest?: IPluginManifest } }
        | (IPlugin & { manifest?: IPluginManifest })
        | undefined;

    if (!ns) {
        console.warn(`[plugin-loader] bundle "${globalName}" is not on window`);
        return { activated: [], missing: [] };
    }

    const plugin = ("default" in ns && ns.default ? ns.default : ns) as IPlugin & { manifest?: IPluginManifest };
    const mkCtx = (subId: string): IPluginContext => ({
        id: subId,
        nodes: options.nodes,
        links: options.links,
        editors: options.editors,
        assetUrl: options.assetUrl,
    });

    // Step 1: optional flat activate, for legacy plugins or plugins that
    // also have root-level setup beyond their sub-plugins.
    if (typeof plugin.activate === "function") {
        await plugin.activate(mkCtx(id));
    }

    // Step 2: resolve the sub-plugin id list.
    const manifest = options.manifest ?? plugin.manifest;
    const subIds = manifest ? (await collectSubPluginEntries(manifest, options.assetUrl)).map((e) => e.id) : Object.keys(plugin.subPlugins ?? {});

    // Step 3: activate each sub-plugin with a scoped context.
    const activated: string[] = [];
    const missing: string[] = [];
    for (const subId of subIds) {
        const sub = plugin.subPlugins?.[subId];
        if (!sub) {
            console.warn(`[plugin-loader] sub-plugin "${subId}" missing in bundle ${globalName}`);
            missing.push(subId);
            continue;
        }
        await sub.activate(mkCtx(subId));
        activated.push(subId);
    }

    return { activated, missing };
}

/**
 * Resolves the final sub-plugin entry list from a manifest:
 *   - inline `subPlugins[]` first
 *   - then each `manifestRefs[]` file fetched via `assetUrl()` and
 *     its `subPlugins[]` appended in declaration order
 *
 * Failures (404, JSON parse, network) are logged and skipped — partial
 * loading is preferred over hard failure for an optional discovery
 * mechanism.
 */
async function collectSubPluginEntries(manifest: IPluginManifest, assetUrl: (rel: string) => string): Promise<ISubPluginManifest[]> {
    const out: ISubPluginManifest[] = [...(manifest.subPlugins ?? [])];
    for (const ref of manifest.manifestRefs ?? []) {
        try {
            const url = /^(https?:)?\/\//.test(ref) || ref.startsWith("/") ? ref : assetUrl(ref);
            const res = await fetch(url);
            if (!res.ok) {
                console.warn(`[plugin-loader] manifestRef ${ref}: HTTP ${res.status}`);
                continue;
            }
            const ext = (await res.json()) as Partial<IPluginManifest>;
            if (Array.isArray(ext.subPlugins)) out.push(...ext.subPlugins);
        } catch (err) {
            console.warn(`[plugin-loader] manifestRef ${ref} failed:`, err);
        }
    }
    return out;
}

/** Where a bundle lives and what global it publishes. */
export interface LoadPluginFromUrlOptions extends LoadPluginOptions {
    /** URL of the bundle, absolute or relative to the document. */
    url: string;
    /**
     * Skip the fetch when the global is already defined. Default true.
     *
     * A script cannot be unloaded once it has run, so re-injecting a bundle
     * leaves the previous classes alive behind any node already built from
     * them. Refusing the second load is the honest default; pass false only
     * when the caller has accepted that cost.
     */
    reuseIfPresent?: boolean;
}

/**
 * Fetch a plugin bundle and activate it into a running editor.
 *
 * A `<script>` element appended to a live document is fetched and executed
 * exactly as one written in the page's HTML is, which is how a catalogue can
 * grow after boot without a reload. The bundle publishes its UMD global, and
 * the rest is the ordinary activation path.
 *
 * Two things the caller inherits from that mechanism and cannot be shielded
 * from. The URL is cache-busted here, because a browser caches by URL and a
 * rebuilt bundle at the same address would serve the previous build. And the
 * page's Content-Security-Policy decides whether the injection is allowed at
 * all: same-origin is fine under `script-src 'self'`, and a nonce-based
 * policy such as a VS Code webview's will reject it.
 */
export async function loadPluginFromUrl(globalName: string, id: string, options: LoadPluginFromUrlOptions): Promise<LoadPluginResult> {
    const present = (globalThis as Record<string, unknown>)[globalName] !== undefined;
    if (!present || options.reuseIfPresent === false) {
        if (present) {
            console.warn(`[plugin-loader] re-injecting "${globalName}"; the previous module stays alive behind existing nodes`);
        }
        await injectScript(options.url);
    }
    if ((globalThis as Record<string, unknown>)[globalName] === undefined) {
        throw new Error(`bundle at "${options.url}" loaded but published no global named "${globalName}"`);
    }
    return loadPlugin(globalName, id, options);
}

function injectScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = url + (url.includes("?") ? "&" : "?") + "t=" + Date.now();
        el.async = false;
        el.onload = () => resolve();
        // The browser gives no reason here, by design, so the message names
        // what the caller can actually check.
        el.onerror = () => reject(new Error(`failed to load "${url}" (missing, blocked by CSP, or cross-origin without CORS)`));
        document.head.appendChild(el);
    });
}
