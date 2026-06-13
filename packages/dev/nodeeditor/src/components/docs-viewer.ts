import { marked } from "marked";
import type { INodeMeta, INodeRegistry } from "spikypanda-core";
import { listDocLocales, resolveDocPath } from "spikypanda-core";

export interface DocsViewerOptions {
    /** Registry used to resolve a typeId to its meta (and from there to
     *  the `docPath`). Passing the registry keeps the viewer decoupled
     *  from how the host stores nodes — every host already has one. */
    registry: INodeRegistry;
    /** Header label rendered when nothing is shown. Defaults to "Docs". */
    emptyTitle?: string;
    /** localStorage key used to persist the user-selected locale across
     *  reloads. Defaults to "ne.docs.locale". Pass null to disable
     *  persistence (e.g. private browsing). */
    storageKey?: string | null;
    /** Locale preference list — typically the host's idea of which
     *  language the user reads. Defaults to `navigator.languages` (or
     *  `navigator.language` if the list is empty). The user's explicit
     *  selection in the language menu takes precedence over this. */
    preferredLocales?: ReadonlyArray<string>;
}

const DEFAULT_FALLBACK = "en-US";
const DEFAULT_STORAGE_KEY = "ne.docs.locale";

interface CacheEntry {
    state: "loading" | "ok" | "missing" | "error";
    html?: string;
    error?: string;
}

/**
 * Docs viewer: renders a node type's Markdown documentation in a
 * scrollable host. The DOM shape mirrors Palette / DebugConsole /
 * PropertyEditor — host element + a single body div the component
 * fully controls.
 *
 * Resolution flow:
 *   1. show(typeId)
 *   2. registry.meta(typeId).docPath
 *   3. resolveDocPath(...) picks the locale via the preference chain
 *   4. fetch(url)
 *   5. marked.parse(text)
 *   6. swap into body
 *
 * i18n:
 *   - `docPath` can be a bare string or a `{ locale: url }` map.
 *   - Preference chain: user-pinned (localStorage) → host's
 *     `preferredLocales` (defaults to `navigator.languages`) → "en-US"
 *     → first available entry.
 *   - When ≥ 2 locales are declared for the selected node, the header
 *     renders a small `<select>`. Choosing one persists the choice and
 *     re-renders the panel. The choice applies to ALL future nodes
 *     until the user changes it again.
 *
 * Cache: parsed HTML is kept per (typeId + locale) so flipping between
 * languages on the same node is instant after the first fetch.
 *
 * Errors are surfaced inline (the message is part of the rendered body,
 * not a console.warn) so an author authoring a new doc immediately sees
 * a 404 instead of silently empty docs.
 */
export class DocsViewer {
    public readonly host: HTMLElement;

    private readonly _registry: INodeRegistry;
    private readonly _emptyTitle: string;
    private readonly _bodyEl: HTMLDivElement;
    private readonly _cache = new Map<string, CacheEntry>();
    private readonly _storageKey: string | null;
    private readonly _hostPreferred: ReadonlyArray<string>;

    /** User-pinned locale (from the dropdown or localStorage). Null = no override,
     *  fall back to navigator.languages → en-US. */
    private _userLocale: string | null = null;
    /** The last typeId passed to show(); used by the language selector
     *  to re-render after the user picks a different locale. */
    private _currentTypeId: string | null = null;
    private _currentToken = 0;

    public constructor(host: HTMLElement, options: DocsViewerOptions) {
        this.host = host;
        this._registry = options.registry;
        this._emptyTitle = options.emptyTitle ?? "Docs";
        this._storageKey = options.storageKey === undefined ? DEFAULT_STORAGE_KEY : options.storageKey;
        this._hostPreferred = options.preferredLocales ?? readNavigatorLocales();
        this._userLocale = this._readPersistedLocale();

        host.classList.add("ne-docs-viewer");
        host.innerHTML = "";

        this._bodyEl = document.createElement("div");
        this._bodyEl.className = "ne-docs-viewer-body";
        host.appendChild(this._bodyEl);

        this._renderEmpty("Select a node to read its documentation.");
    }

    /**
     * Drive the panel from outside. Pass null to clear back to the
     * empty state (e.g. when the selection drops to zero or multi).
     * The host typically wires this to GraphViewer.onSelectionChanged.
     */
    public show(typeId: string | null): void {
        this._currentTypeId = typeId;
        if (!typeId) {
            this._renderEmpty("Select a node to read its documentation.");
            return;
        }
        const meta = this._registry.meta(typeId);
        if (!meta) {
            this._renderEmpty(`No registry entry for ${typeId}.`);
            return;
        }
        if (!meta.docPath) {
            this._renderEmpty(`No documentation declared for ${meta.label ?? typeId}.`);
            return;
        }
        const url = resolveDocPath(meta.docPath, this._effectivePreferred());
        if (!url) {
            this._renderEmpty(`No documentation declared for ${meta.label ?? typeId}.`);
            return;
        }
        const cacheKey = `${typeId}|${url}`;
        const cached = this._cache.get(cacheKey);
        if (cached && cached.state === "ok" && cached.html !== undefined) {
            this._renderHtml(meta, cached.html, url);
            return;
        }
        this._loadAndRender(meta, url, cacheKey);
    }

    public hasDocs(typeId: string | null): boolean {
        if (!typeId) return false;
        const meta = this._registry.meta(typeId);
        if (!meta || !meta.docPath) return false;
        return resolveDocPath(meta.docPath, this._effectivePreferred()) !== null;
    }

    /** Currently active locale preference ("" when no override is set). */
    public get userLocale(): string | null {
        return this._userLocale;
    }

    /**
     * Programmatically pin a locale. Pass null to clear back to
     * browser-driven resolution. Re-renders the current node.
     */
    public setUserLocale(locale: string | null): void {
        if (this._userLocale === locale) return;
        this._userLocale = locale;
        this._writePersistedLocale(locale);
        if (this._currentTypeId) this.show(this._currentTypeId);
    }

    public dispose(): void {
        this._cache.clear();
        this.host.innerHTML = "";
        this.host.classList.remove("ne-docs-viewer");
    }

    // ── Internals ──────────────────────────────────────────────────────

    private _effectivePreferred(): ReadonlyArray<string> {
        const out: string[] = [];
        if (this._userLocale) out.push(this._userLocale);
        for (const l of this._hostPreferred) if (!out.includes(l)) out.push(l);
        if (!out.includes(DEFAULT_FALLBACK)) out.push(DEFAULT_FALLBACK);
        return out;
    }

    private async _loadAndRender(meta: INodeMeta, url: string, cacheKey: string): Promise<void> {
        const token = ++this._currentToken;
        this._renderLoading(meta, url);
        try {
            const res = await fetch(url, { cache: "no-cache" });
            if (token !== this._currentToken) return; // user moved on
            if (!res.ok) {
                if (res.status === 404) {
                    this._cache.set(cacheKey, { state: "missing" });
                    this._renderEmpty(`Documentation file not found: ${url}`);
                } else {
                    this._cache.set(cacheKey, { state: "error", error: `HTTP ${res.status}` });
                    this._renderError(meta, `Fetch failed: HTTP ${res.status}`, url);
                }
                return;
            }
            const text = await res.text();
            const html = marked.parse(text, { async: false }) as string;
            this._cache.set(cacheKey, { state: "ok", html });
            this._renderHtml(meta, html, url);
        } catch (err) {
            if (token !== this._currentToken) return;
            const msg = err instanceof Error ? err.message : String(err);
            this._cache.set(cacheKey, { state: "error", error: msg });
            this._renderError(meta, msg, url);
        }
    }

    private _renderHtml(meta: INodeMeta, html: string, url: string): void {
        this._bodyEl.innerHTML = "";
        this._bodyEl.appendChild(this._buildHeader(meta.label ?? meta.type, meta, url));
        const article = document.createElement("article");
        article.className = "ne-docs-viewer-article";
        article.innerHTML = html;
        this._resolveRelativeAssets(article, url);
        this._bodyEl.appendChild(article);
    }

    // Markdown image / link targets are authored relative to the doc
    // file (e.g. `![](foc-chain.svg)` next to the .md). Injected via
    // innerHTML, a relative `src` would otherwise resolve against the
    // editor page URL, not the doc, and 404. Rewrite relative `img[src]`
    // and `a[href]` against the doc's own URL so sidecar assets load.
    private _resolveRelativeAssets(root: HTMLElement, docUrl: string): void {
        const base = new URL(docUrl, location.href);
        const isRelative = (v: string | null): v is string => !!v && !/^([a-z][a-z0-9+.-]*:|\/|#)/i.test(v);
        for (const img of Array.from(root.querySelectorAll("img"))) {
            const src = img.getAttribute("src");
            if (isRelative(src)) img.setAttribute("src", new URL(src, base).href);
        }
        for (const a of Array.from(root.querySelectorAll("a"))) {
            const href = a.getAttribute("href");
            if (isRelative(href)) a.setAttribute("href", new URL(href, base).href);
        }
    }

    private _renderLoading(meta: INodeMeta, url: string): void {
        this._bodyEl.innerHTML = "";
        this._bodyEl.appendChild(this._buildHeader(meta.label ?? meta.type, meta, url));
        const p = document.createElement("div");
        p.className = "ne-docs-viewer-empty";
        p.textContent = "Loading documentation…";
        this._bodyEl.appendChild(p);
    }

    private _renderError(meta: INodeMeta, message: string, url: string): void {
        this._bodyEl.innerHTML = "";
        this._bodyEl.appendChild(this._buildHeader(meta.label ?? meta.type, meta, url));
        const p = document.createElement("div");
        p.className = "ne-docs-viewer-empty ne-docs-viewer-empty-error";
        p.textContent = message;
        this._bodyEl.appendChild(p);
    }

    private _renderEmpty(message: string): void {
        this._bodyEl.innerHTML = "";
        this._bodyEl.appendChild(this._buildHeader(this._emptyTitle, null, null));
        const p = document.createElement("div");
        p.className = "ne-docs-viewer-empty";
        p.textContent = message;
        this._bodyEl.appendChild(p);
    }

    private _buildHeader(label: string, meta: INodeMeta | null, activeUrl: string | null): HTMLElement {
        const wrap = document.createElement("div");
        wrap.className = "ne-docs-viewer-title";
        const labelEl = document.createElement("span");
        labelEl.textContent = label;
        wrap.appendChild(labelEl);

        const right = document.createElement("span");
        right.className = "ne-docs-viewer-title-right";

        // Language selector — only when the node declares ≥ 2 locales.
        const locales = meta ? listDocLocales(meta.docPath) : [];
        if (locales.length >= 2) {
            const select = document.createElement("select");
            select.className = "ne-docs-viewer-lang";
            select.title = "Documentation language";
            const currentUrl = activeUrl;
            for (const loc of locales) {
                const opt = document.createElement("option");
                opt.value = loc;
                opt.textContent = loc;
                if (currentUrl && typeof meta!.docPath === "object" && (meta!.docPath as Record<string, string>)[loc] === currentUrl) {
                    opt.selected = true;
                }
                select.appendChild(opt);
            }
            select.addEventListener("change", () => this.setUserLocale(select.value));
            right.appendChild(select);
        }

        if (meta) {
            const tid = document.createElement("span");
            tid.className = "ne-docs-viewer-typeid";
            tid.textContent = meta.type;
            right.appendChild(tid);
        }
        wrap.appendChild(right);
        return wrap;
    }

    private _readPersistedLocale(): string | null {
        if (!this._storageKey) return null;
        try {
            const v = window.localStorage.getItem(this._storageKey);
            return v && v.length > 0 ? v : null;
        } catch {
            return null;
        }
    }

    private _writePersistedLocale(locale: string | null): void {
        if (!this._storageKey) return;
        try {
            if (locale === null) window.localStorage.removeItem(this._storageKey);
            else window.localStorage.setItem(this._storageKey, locale);
        } catch {
            /* private mode, quota — silent */
        }
    }
}

function readNavigatorLocales(): ReadonlyArray<string> {
    if (typeof navigator === "undefined") return [];
    const langs = navigator.languages && navigator.languages.length > 0 ? Array.from(navigator.languages) : navigator.language ? [navigator.language] : [];
    return langs;
}
