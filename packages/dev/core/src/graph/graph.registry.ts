import type { IRuntimeNode, IPortDescriptor } from "../execution/execution.interfaces";

export interface INodeMeta {
    readonly type: string;
    readonly label: string;
    readonly category?: string;
    readonly inputPorts: ReadonlyArray<IPortDescriptor>;
    readonly outputPorts: ReadonlyArray<IPortDescriptor>;
    /** Optional control-plane ports the node exposes (default: _enable
     *  in / _enabled out via RuntimeNode; RunnableNode adds _start /
     *  _stop / _started / _stopped). The palette and editor read these
     *  to render control ports in a distinct row. */
    readonly controlInputPorts?: ReadonlyArray<IPortDescriptor>;
    readonly controlOutputPorts?: ReadonlyArray<IPortDescriptor>;
    /** Interop standards this node complies with (e.g. "onnx", "ue5").
     *  Each entry is either a bare id (the standards registry's default
     *  version is used) or `{ id, version }` to pin a specific version
     *  on this node. The property panel renders one GitHub-style shield
     *  per entry; validators iterate ids to decide whether a whole graph
     *  can be exported to a given target. Empty/absent = no interop
     *  guarantee. */
    readonly standards?: ReadonlyArray<string | { readonly id: string; readonly version?: string }>;
    /** Variadic input descriptor: when set, the editor maintains a
     *  growing/shrinking set of input ports `${prefix}0`, `${prefix}1`,
     *  ... so exactly one trailing unconnected port stays available
     *  (the "+" slot).
     *
     *  Accepts an ARRAY of descriptors when a node needs multiple
     *  parallel variadic groups on the same side (e.g. the Stem tile
     *  declares `[{ prefix: "f_" }, { prefix: "A_" }]` for paired
     *  frequency/amplitude inputs). Each group is reconciled
     *  independently by the editor. */
    readonly variadicInput?: { readonly prefix: string; readonly type: string } | ReadonlyArray<{ readonly prefix: string; readonly type: string }>;
    /** Same as `variadicInput` but for the output side (e.g. Sequence's
     *  `then_0`, `then_1`, ...). Also accepts the multi-group array
     *  form for symmetry, although no current node uses it. */
    readonly variadicOutput?: { readonly prefix: string; readonly type: string } | ReadonlyArray<{ readonly prefix: string; readonly type: string }>;
    /**
     * Number of independent anchor widgets the editor should render
     * for this node. Default undefined / 1 → ordinary single-widget
     * node. Values >= 2 turn it into a split-view node: one logical
     * entity drawn as N independently-draggable widgets, with ports
     * routed to widgets via their `IPortDescriptor.anchor` field.
     * The runtime is unaffected — `anchorCount` is editor-only metadata.
     */
    readonly anchorCount?: number;
    /**
     * URL(s) to a Markdown document describing this node — purpose,
     * port semantics, parameter ranges, gotchas. The editor's
     * DocsViewer fetches and renders this whenever the user opens the
     * Docs tab on a node of this type.
     *
     * Two accepted shapes:
     *   - **Bare string**: a single URL, treated as the default-locale
     *     doc. Hosts may surface it without offering a language menu.
     *   - **Locale map** `Record<BCP47, string>`: e.g.
     *     `{ "en-US": ".../dynamic.en.md", "fr-FR": ".../dynamic.fr.md" }`.
     *     The viewer chooses the best match for the user's browser
     *     language (or their persisted preference), and renders a
     *     language selector when ≥ 2 entries are declared.
     *
     * URLs are opaque to the registry: the plugin author resolves them
     * however fits the deployment (typically `ctx.assetUrl("docs/...")`
     * to ship files inside the plugin bundle folder). Absent = no docs
     * available; the Docs tab renders an empty-state hint.
     *
     * Plugin vendors choose freely how many locales to ship — there is
     * no required minimum. The viewer falls back to en-US (then the
     * first available entry) when nothing matches the user's
     * preferences.
     */
    readonly docPath?: string | Readonly<Record<string, string>>;
}

/**
 * Resolve a `docPath` declaration against an ordered list of preferred
 * locales (BCP-47), returning the URL of the best-matching doc — or
 * `null` if none can be served.
 *
 * Matching order (first hit wins):
 *   1. Exact match against any preferred locale (case-insensitive).
 *   2. Prefix match: preferred `en-US` matches available `en`, and
 *      preferred `en` matches available `en-US` — the closest one wins.
 *   3. Fallback to `en-US` if present.
 *   4. Fallback to `en` if present.
 *   5. First entry in declaration order.
 *
 * Bare-string `docPath` always resolves to itself regardless of
 * preferences (it's the no-i18n case).
 */
export function resolveDocPath(
    docPath: string | Readonly<Record<string, string>> | undefined,
    preferred: ReadonlyArray<string>
): string | null {
    if (!docPath) return null;
    if (typeof docPath === "string") return docPath;
    const entries = Object.keys(docPath);
    if (entries.length === 0) return null;
    const lower = new Map(entries.map((k) => [k.toLowerCase(), k]));
    for (const p of preferred) {
        const exact = lower.get(p.toLowerCase());
        if (exact) return docPath[exact];
    }
    for (const p of preferred) {
        const pl = p.toLowerCase();
        const head = pl.split("-")[0];
        for (const [keyLower, keyOriginal] of lower) {
            if (keyLower === head) return docPath[keyOriginal];
            if (keyLower.startsWith(head + "-")) return docPath[keyOriginal];
        }
    }
    const enUs = lower.get("en-us"); if (enUs) return docPath[enUs];
    const en   = lower.get("en");    if (en)   return docPath[en];
    return docPath[entries[0]];
}

/**
 * Return the list of locales declared in a docPath map, in the order
 * the plugin author wrote them. Bare-string docPath is treated as a
 * single anonymous entry — the caller decides how to label it.
 */
export function listDocLocales(docPath: string | Readonly<Record<string, string>> | undefined): ReadonlyArray<string> {
    if (!docPath) return [];
    if (typeof docPath === "string") return [];
    return Object.keys(docPath);
}

export type NodeFactory = (config?: Record<string, unknown>) => IRuntimeNode;

export interface INodeRegistry {
    register(type: string, factory: NodeFactory, meta: Omit<INodeMeta, "type">): void;
    unregister(type: string): boolean;
    create(type: string, config?: Record<string, unknown>): IRuntimeNode | undefined;
    meta(type: string): INodeMeta | undefined;
    types(): ReadonlyArray<string>;
}

export class NodeRegistry implements INodeRegistry {
    private readonly _factories = new Map<string, NodeFactory>();
    private readonly _meta = new Map<string, INodeMeta>();

    public register(type: string, factory: NodeFactory, meta: Omit<INodeMeta, "type">): void {
        this._factories.set(type, factory);
        this._meta.set(type, { ...meta, type });
    }

    public unregister(type: string): boolean {
        this._meta.delete(type);
        return this._factories.delete(type);
    }

    public create(type: string, config?: Record<string, unknown>): IRuntimeNode | undefined {
        return this._factories.get(type)?.(config);
    }

    public meta(type: string): INodeMeta | undefined {
        return this._meta.get(type);
    }

    public types(): ReadonlyArray<string> {
        return Array.from(this._factories.keys());
    }
}
