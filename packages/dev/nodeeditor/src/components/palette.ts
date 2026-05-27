import type { INodeRegistry, INodeMeta } from "spikypanda-core";
import { Permissions } from "../permissions";
import { StandardsRegistry } from "../standards";

/**
 * Palette: tree view of the types registered in a NodeRegistry.
 *
 * Categories are interpreted as slash-separated paths. The first segment
 * is the plugin (or top-level folder), each subsequent segment is a
 * subfolder, and the registered type is a leaf inside the deepest
 * folder. A node registered without a category goes under "Other".
 *
 * Examples:
 *   category "geometry"     → geometry/Transform
 *   category "onnx"         → onnx/ONNX Model
 *   category "onnx/conv"    → onnx/conv/Conv
 *
 * Folders are collapsible (click on the header toggles open/closed).
 * Collapse state is in-memory per Palette instance; persistence (e.g.
 * localStorage) can be layered on top by reading/writing
 * `.collapsedPaths`.
 *
 * Permissions: hides itself entirely if `perms.write` is denied — the
 * palette is a write-only affordance (its sole action is creating new
 * nodes). The flex layout reflows naturally.
 *
 * Reactivity: refresh() rebuilds the tree from the current registry
 * state. Call it after a plugin activates.
 */
export interface PaletteOptions {
    permissions?: Permissions;
    title?: string;
    /** Folder paths to render expanded on first render. Folders not in
     *  this set default to collapsed. Pass null to expand everything. */
    expandedByDefault?: ReadonlyArray<string> | null;
    /** Resolves standard ids to display info (label, color, glyph) for
     *  the badge rendered next to each entry. */
    standards?: StandardsRegistry;
}

interface TreeNode {
    name: string;
    path: string;
    children: Map<string, TreeNode>;
    leaves: { type: string; meta: INodeMeta }[];
}

export class Palette {
    readonly host: HTMLElement;
    readonly registry: INodeRegistry;
    readonly permissions: Permissions;
    readonly standards: StandardsRegistry;

    private readonly _listEl: HTMLDivElement;
    private readonly _title: string;
    private readonly _defaultExpandAll: boolean;
    private readonly _defaultExpanded: Set<string>;
    private readonly _collapsedPaths = new Set<string>();

    onSelect: ((type: string, meta: INodeMeta) => void) | null = null;

    public constructor(host: HTMLElement, registry: INodeRegistry, options: PaletteOptions = {}) {
        this.host = host;
        this.registry = registry;
        this.permissions = options.permissions ?? Permissions.FULL;
        this.standards = options.standards ?? new StandardsRegistry();
        this._title = options.title ?? "Palette";
        this._defaultExpandAll = options.expandedByDefault === null;
        this._defaultExpanded = new Set(options.expandedByDefault ?? []);

        host.classList.add("ne-palette");
        host.innerHTML = "";

        const titleEl = document.createElement("div");
        titleEl.className = "ne-palette-title";
        titleEl.textContent = this._title;
        host.appendChild(titleEl);

        this._listEl = document.createElement("div");
        this._listEl.className = "ne-palette-list";
        host.appendChild(this._listEl);

        if (!this.permissions.write) {
            host.hidden = true;
        }

        this.refresh();
    }

    /** Read-only snapshot of paths the user has manually collapsed. */
    public get collapsedPaths(): ReadonlySet<string> { return this._collapsedPaths; }

    /** Re-read the registry and rebuild the tree. Preserves collapse state. */
    public refresh(): void {
        this._listEl.innerHTML = "";

        const types = this.registry.types();
        if (types.length === 0) {
            const empty = document.createElement("div");
            empty.className = "ne-palette-empty";
            empty.textContent = "No nodes registered";
            this._listEl.appendChild(empty);
            return;
        }

        const tree = this._buildTree(types);
        for (const child of this._sortedChildren(tree)) {
            this._listEl.appendChild(this._renderFolder(child, 0));
        }
    }

    // ── Tree construction ─────────────────────────────────────────────

    private _buildTree(types: ReadonlyArray<string>): TreeNode {
        const root: TreeNode = { name: "", path: "", children: new Map(), leaves: [] };
        for (const type of types) {
            const meta = this.registry.meta(type);
            if (!meta) continue;
            const segments = (meta.category ?? "Other").split("/").filter(Boolean);
            let node = root;
            const acc: string[] = [];
            for (const seg of segments) {
                acc.push(seg);
                const path = acc.join("/");
                let child = node.children.get(seg);
                if (!child) {
                    child = { name: seg, path, children: new Map(), leaves: [] };
                    node.children.set(seg, child);
                }
                node = child;
            }
            node.leaves.push({ type, meta });
        }
        return root;
    }

    private _sortedChildren(node: TreeNode): TreeNode[] {
        return [...node.children.values()].sort((a, b) => {
            if (a.name === "Other") return 1;
            if (b.name === "Other") return -1;
            return a.name.localeCompare(b.name);
        });
    }

    // ── Rendering ─────────────────────────────────────────────────────

    private _isCollapsed(path: string): boolean {
        if (this._collapsedPaths.has(path)) return true;
        if (this._defaultExpandAll) return false;
        if (this._defaultExpanded.has(path)) return false;
        // Default: expanded for first-level, collapsed for deeper levels.
        return path.includes("/");
    }

    private _toggleFolder(path: string): void {
        if (this._collapsedPaths.has(path)) this._collapsedPaths.delete(path);
        else this._collapsedPaths.add(path);
    }

    private _renderFolder(node: TreeNode, depth: number): HTMLElement {
        const folder = document.createElement("div");
        folder.className = "ne-palette-folder";
        folder.dataset.depth = String(depth);
        folder.dataset.path  = node.path;

        const collapsed = this._isCollapsed(node.path);
        if (collapsed) folder.classList.add("is-collapsed");

        const header = document.createElement("button");
        header.className = "ne-palette-folder-header";
        header.type = "button";
        header.style.paddingLeft = `${10 + depth * 12}px`;

        const arrow = document.createElement("span");
        arrow.className = "ne-palette-folder-arrow";
        arrow.textContent = "▸";
        header.appendChild(arrow);

        const name = document.createElement("span");
        name.className = "ne-palette-folder-name";
        name.textContent = node.name;
        header.appendChild(name);

        const count = node.leaves.length + node.children.size;
        if (count > 0) {
            const badge = document.createElement("span");
            badge.className = "ne-palette-folder-count";
            badge.textContent = String(count);
            header.appendChild(badge);
        }

        header.addEventListener("click", () => {
            this._toggleFolder(node.path);
            folder.classList.toggle("is-collapsed");
        });
        folder.appendChild(header);

        const body = document.createElement("div");
        body.className = "ne-palette-folder-body";

        const sortedLeaves = [...node.leaves].sort((a, b) => a.meta.label.localeCompare(b.meta.label));
        for (const leaf of sortedLeaves) {
            body.appendChild(this._renderEntry(leaf, depth + 1));
        }
        for (const child of this._sortedChildren(node)) {
            body.appendChild(this._renderFolder(child, depth + 1));
        }
        folder.appendChild(body);

        return folder;
    }

    private _renderEntry(entry: { type: string; meta: INodeMeta }, depth: number): HTMLElement {
        const el = document.createElement("button");
        el.className = "ne-palette-entry";
        el.type = "button";
        el.title = entry.type;
        el.style.paddingLeft = `${10 + depth * 12}px`;

        const dot = document.createElement("span");
        dot.className = "ne-palette-entry-dot";
        el.appendChild(dot);

        const label = document.createElement("span");
        label.className = "ne-palette-entry-label";
        label.textContent = entry.meta.label;
        el.appendChild(label);

        // Standards badges (right-aligned). One small pill per declared
        // standard, tooltip explains which standard it is.
        if (entry.meta.standards && entry.meta.standards.length > 0) {
            const badges = document.createElement("span");
            badges.className = "ne-palette-entry-standards";
            for (const id of entry.meta.standards) {
                const info = this.standards.get(id);
                const b = document.createElement("span");
                b.className = `ne-standard-badge ne-standard-${id}`;
                b.textContent = info?.glyph ?? id.slice(0, 1).toUpperCase();
                b.title = info ? info.label : id;
                if (info?.color) b.style.backgroundColor = info.color;
                badges.appendChild(b);
            }
            el.appendChild(badges);
        }

        el.addEventListener("click", () => {
            if (this.onSelect) this.onSelect(entry.type, entry.meta);
        });
        return el;
    }
}
