import type { ILinkRegistry, INodeRegistry } from "spikypanda-core";
import type { EditorRegistry } from "./editor-registry";

export interface IPluginContext {
    /** Logical identifier scoped to the active plugin (or sub-plugin) that
     *  receives this context. For a sub-plugin activation, this is the
     *  sub-plugin's dot-notation id (e.g. "Physics.Electric.Motor.DC"),
     *  not the root plugin's id. */
    readonly id: string;
    readonly nodes: INodeRegistry;
    readonly links: ILinkRegistry;
    readonly editors: EditorRegistry;
    /** Resolve a plugin-relative path to an absolute URL for asset loading. */
    assetUrl(relativePath: string): string;
}

export interface IPlugin {
    activate(ctx: IPluginContext): void | Promise<void>;
    deactivate?(): void;
    /**
     * Optional map of sub-plugin id → sub-plugin module. Used by the host
     * loader when the manifest declares a `subPlugins[]` (or imports more
     * via `manifestRefs[]`): for each sub-plugin entry, the loader looks
     * up `plugin.subPlugins[entry.id]` and calls its `activate(ctx)` with
     * a scoped context.
     *
     * A plugin can mix flat behaviour (top-level `activate`) and sub-plugin
     * behaviour (entries here); both are fired in order at load time.
     */
    readonly subPlugins?: Record<string, IPlugin>;
}

export interface IPluginPortEntry {
    slot: string;
    type?: string;
    optional?: boolean;
}

export interface IPluginNodeEntry {
    type: string;
    label: string;
    category?: string;
    inputPorts?: IPluginPortEntry[];
    outputPorts?: IPluginPortEntry[];
    defaults?: Record<string, unknown>;
    editors?: string[];
}

export interface IPluginEditorEntry {
    kind: string;
    factory: string;
}

/**
 * A sub-plugin entry inside a root manifest's `subPlugins[]`. Carries the
 * same shape as the root manifest minus the bundle-level fields (`entry`,
 * top-level `version` default, etc.). The sub-plugin's runtime activation
 * is resolved via the parent bundle's `subPlugins[id]` map.
 *
 * Sub-plugin ids use PascalCase dot-notation expressing a thematic
 * hierarchy:
 *   - `"Physics.Electric.Current"`
 *   - `"Physics.Electric.Motor.DC"`
 *   - `"Physics.Mechanical.Spring"`
 *
 * The palette splits the `category` field on both `/` and `.`, so a node
 * with `category: "Physics.Electric.Motor.DC"` lands under four nested
 * folders in the palette tree, mirroring the id structure.
 */
export interface ISubPluginManifest {
    /** Hierarchical identifier in PascalCase dot-notation. */
    id: string;
    /** Human-readable label shown in palette / property panel. */
    displayName: string;
    /** Optional tooltip / documentation summary. */
    description?: string;
    /** Default category for nodes that don't declare their own. Usually
     *  equals `id`, so the palette structure mirrors the id structure. */
    category?: string;
    /** Per-sub-plugin version. Falls back to parent manifest `version`. */
    version?: string;
    /** Interop standards declared by this sub-plugin. Nodes that don't
     *  declare their own `standards` inherit this list. */
    standards?: ReadonlyArray<string | { id: string; version?: string }>;
    nodes?: IPluginNodeEntry[];
    editors?: IPluginEditorEntry[];
}

export interface IPluginManifest {
    id: string;
    version: string;
    displayName: string;
    description?: string;
    category?: string;
    entry: string;
    nodes?: IPluginNodeEntry[];
    editors?: IPluginEditorEntry[];
    /**
     * Sub-plugins declared inline in this manifest. Each is activated
     * eagerly (in declaration order) when the parent bundle loads. The
     * runtime module is resolved via the bundle's exported
     * `subPlugins[id]` map; see {@link IPlugin.subPlugins}.
     */
    subPlugins?: ISubPluginManifest[];
    /**
     * Paths to additional manifest JSON files (relative to this manifest's
     * directory) whose `subPlugins[]` are merged into this manifest's
     * `subPlugins[]` at load time. Useful for splitting a large theme
     * across files or accepting third-party extensions that the host
     * application chooses to discover at boot.
     */
    manifestRefs?: string[];
}
