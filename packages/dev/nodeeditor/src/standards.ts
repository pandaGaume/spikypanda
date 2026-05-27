/**
 * Registry of interop standards a node may declare compliance with.
 *
 * A "standard" here is an interchange format or specification — ONNX is
 * the canonical example. When a node's INodeMeta lists "onnx" in its
 * `standards` array, the editor renders the matching badge in the node
 * header and the palette entry, and the export pipeline knows the node
 * can be emitted in that format.
 *
 * Multiple standards may coexist (a node compatible with both ONNX and
 * TFLite carries both badges). The registry is purely descriptive: it
 * maps a standard id to its display metadata (label, color, optional
 * icon). It does NOT validate compliance at runtime — declaring a
 * standard is a contract the plugin author honors.
 *
 * Pre-populated with "onnx". Apps and plugins can add more via
 * register().
 */
export interface IStandardInfo {
    /** Stable identifier used in INodeMeta.standards (lowercase, no spaces). */
    readonly id: string;
    /** Display label shown on the shield's left half and on hover. */
    readonly label: string;
    /** Badge background colour for the left (label) half. Defaults to var(--ne-color-accent) when absent. */
    readonly color?: string;
    /** Single-character glyph (legacy: was used for the now-removed
     *  node-header / palette pill). Kept on the interface so existing
     *  registrations stay valid; readers can ignore it. */
    readonly glyph?: string;
    /** Optional URL to the spec / homepage for tooltips and docs links. */
    readonly homeUrl?: string;
    /** Version label rendered on the shield's right half when a node
     *  declares the standard without its own version (e.g. ONNX 1.18,
     *  Unreal 5.3). Omit to render label-only shields. */
    readonly defaultVersion?: string;
}

/**
 * Per-node standard declaration. Either the bare standard id (the
 * registry's defaultVersion is used) or an object pinning a specific
 * version on this node (overrides the registry default).
 */
export interface IStandardEntry {
    readonly id: string;
    readonly version?: string;
}
export type StandardSpec = string | IStandardEntry;

/** Normalize the union form so renderers can iterate `{ id, version }` uniformly. */
export function normalizeStandardSpec(spec: StandardSpec): IStandardEntry {
    return typeof spec === "string" ? { id: spec } : spec;
}

export class StandardsRegistry {
    private readonly _entries = new Map<string, IStandardInfo>();

    public constructor(populateDefaults = true) {
        if (populateDefaults) {
            this.register({ id: "onnx", label: "ONNX",   color: "#1B3A6B", glyph: "O", homeUrl: "https://onnx.ai",              defaultVersion: "1.18" });
            this.register({ id: "ue5",  label: "Unreal", color: "#3FA9F5", glyph: "U", homeUrl: "https://www.unrealengine.com", defaultVersion: "5.3" });
        }
    }

    public register(info: IStandardInfo): void {
        this._entries.set(info.id, info);
    }

    public unregister(id: string): boolean {
        return this._entries.delete(id);
    }

    public get(id: string): IStandardInfo | undefined {
        return this._entries.get(id);
    }

    public has(id: string): boolean {
        return this._entries.has(id);
    }

    public all(): ReadonlyArray<IStandardInfo> {
        return [...this._entries.values()];
    }
}

/**
 * Render a row of GitHub-style two-tone shields, one per declared
 * standard. The left half carries the standard's brand colour and
 * label; the right half carries the version (per-node override OR the
 * registry's defaultVersion). Shields without any resolved version
 * collapse to label-only.
 *
 * Returns the wrapper element (already appended to `container`) so
 * callers can apply additional styling or remove it later. Returns
 * null when there is nothing to render so callers can branch cleanly.
 */
export function renderStandardShields(
    container: HTMLElement,
    standards: ReadonlyArray<StandardSpec> | undefined,
    registry: StandardsRegistry,
): HTMLDivElement | null {
    if (!standards || standards.length === 0) return null;
    const wrap = document.createElement("div");
    wrap.className = "ne-standard-shields";
    for (const spec of standards) {
        const entry = normalizeStandardSpec(spec);
        const info  = registry.get(entry.id);
        const version = entry.version ?? info?.defaultVersion;

        const shield = document.createElement("span");
        shield.className = `ne-standard-shield ne-standard-shield-${entry.id}`;
        shield.title = info ? `${info.label}${version ? " " + version : ""}` : entry.id;
        if (info?.homeUrl) shield.dataset.homeUrl = info.homeUrl;

        const labelEl = document.createElement("span");
        labelEl.className = "ne-standard-shield__label";
        labelEl.textContent = info?.label ?? entry.id;
        if (info?.color) labelEl.style.backgroundColor = info.color;
        shield.appendChild(labelEl);

        if (version) {
            const versionEl = document.createElement("span");
            versionEl.className = "ne-standard-shield__version";
            versionEl.textContent = version;
            shield.appendChild(versionEl);
        }

        wrap.appendChild(shield);
    }
    container.appendChild(wrap);
    return wrap;
}
