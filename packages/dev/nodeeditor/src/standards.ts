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
    /** Display label shown on hover and in export dialogs. */
    readonly label: string;
    /** Badge background colour. Defaults to var(--ne-color-accent) when absent. */
    readonly color?: string;
    /** Single-character glyph rendered inside the badge (e.g. "O" for ONNX). */
    readonly glyph?: string;
    /** Optional URL to the spec / homepage for tooltips and docs links. */
    readonly homeUrl?: string;
}

export class StandardsRegistry {
    private readonly _entries = new Map<string, IStandardInfo>();

    public constructor(populateDefaults = true) {
        if (populateDefaults) {
            this.register({ id: "onnx",  label: "ONNX",  color: "#005CED", glyph: "O", homeUrl: "https://onnx.ai" });
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
