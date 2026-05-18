import type { INodeRegistry } from "spikypanda-core";
import type { EditorRegistry } from "./editor-registry";

export interface IPluginContext {
    readonly id: string;
    readonly nodes: INodeRegistry;
    readonly editors: EditorRegistry;
    /** Resolve a plugin-relative path to an absolute URL for asset loading. */
    assetUrl(relativePath: string): string;
}

export interface IPlugin {
    activate(ctx: IPluginContext): void | Promise<void>;
    deactivate?(): void;
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

export interface IPluginManifest {
    id: string;
    version: string;
    displayName: string;
    description?: string;
    category?: string;
    entry: string;
    nodes?: IPluginNodeEntry[];
    editors?: IPluginEditorEntry[];
}
