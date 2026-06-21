import { getEditorSchema, IEditableField, IEditorSchema } from "spikypanda-core";
import type { NodeUI } from "../node-ui";
import { EditorRegistry, IEditor } from "../editor-registry";
import { Permissions } from "../permissions";
import { StandardsRegistry, renderStandardShields } from "../standards";

export interface PropertyEditorOptions {
    editorRegistry: EditorRegistry;
    standards?: StandardsRegistry;
    permissions?: Permissions;
    /** Header label shown when nothing is selected. Defaults to "Properties". */
    title?: string;
}

interface PresetEnvelope {
    typeId?: string;
    label?: string;
    properties?: Record<string, unknown>;
}

/**
 * Property editor: schema-driven panel that mounts the right widget for
 * the currently-selected node. Matches the component shape of Palette /
 * DebugConsole so a host page just instantiates it once and forwards
 * the GraphViewer's selection events.
 *
 * Rendering rules (in order):
 *   1. zero selection → "Select a node" placeholder.
 *   2. multi-selection → "<N> nodes selected" placeholder.
 *   3. single node with a class-level @editor("kind") registered in
 *      the EditorRegistry → mount that whole-object editor.
 *   4. single node with @editable / @viewable fields → render one row
 *      per field via the per-kind factory.
 *   5. otherwise → "Selected: <label>" placeholder.
 *
 * On top of rendering, the panel offers:
 *   - copy icon: dump @editable fields to clipboard as a preset JSON.
 *   - paste icon: read clipboard JSON and apply matching fields.
 *   - drop zone: drop a .json file onto the panel to apply a preset.
 *     Useful for sharing manufacturer data sheets (motors, sensors)
 *     as reusable presets.
 *
 * The preset envelope shape is:
 *   { typeId?, label?, properties: { fieldName: value, ... } }
 *
 * Applying accepts either the envelope OR a bare flat object of
 * fieldName → value (so a hand-written JSON without the envelope still
 * works). Vector / Quaternion fields are reconstructed via the current
 * value's constructor so the model's setter fires (same pattern as
 * vector.ts).
 */
export class PropertyEditor {
    public readonly host: HTMLElement;
    public readonly editorRegistry: EditorRegistry;
    public readonly standards: StandardsRegistry;
    public readonly permissions: Permissions;

    private readonly _title: string;
    private readonly _bodyEl: HTMLDivElement;

    private _currentNode: NodeUI | null = null;
    private _activeClassEditor: IEditor | null = null;
    private _activeClassEditorHost: HTMLElement | null = null;
    private _activeFieldEditors: IEditor[] = [];
    private _dragDepth = 0;

    public constructor(host: HTMLElement, options: PropertyEditorOptions) {
        this.host = host;
        this.editorRegistry = options.editorRegistry;
        this.standards = options.standards ?? new StandardsRegistry();
        this.permissions = options.permissions ?? Permissions.FULL;
        this._title = options.title ?? "Properties";

        host.classList.add("ne-property-editor");
        host.innerHTML = "";

        this._bodyEl = document.createElement("div");
        this._bodyEl.className = "ne-property-editor-body";
        host.appendChild(this._bodyEl);

        this._installDropZone();
        this._renderEmpty("Select a node", null);
    }

    /**
     * Main entry. Forward the GraphViewer's onSelectionChanged payload.
     * Single node → mount editor; otherwise render a placeholder.
     */
    public setSelection(nodes: ReadonlyArray<NodeUI>): void {
        this._currentNode = nodes.length === 1 ? nodes[0] : null;
        if (nodes.length === 0) {
            this._dispose();
            this._renderEmpty("Select a node", null);
            return;
        }
        if (nodes.length === 1) {
            if (this._mountEditorForNode(nodes[0])) return;
            this._dispose();
            this._renderEmpty(`Selected: ${nodes[0].label} (id ${nodes[0].id})`, nodes[0]);
            return;
        }
        this._dispose();
        this._renderEmpty(`${nodes.length} nodes selected`, null);
    }

    /** Re-mount the current selection. Useful after a model mutation. */
    public refresh(): void {
        const n = this._currentNode;
        if (!n) return;
        this._mountEditorForNode(n);
    }

    public dispose(): void {
        this._dispose();
        this.host.innerHTML = "";
        this.host.classList.remove("ne-property-editor");
    }

    // ── Rendering ──────────────────────────────────────────────────────

    private _renderEmpty(text: string, node: NodeUI | null): void {
        this._bodyEl.innerHTML = "";
        this._bodyEl.appendChild(this._buildHeader(this._title, node));
        if (node) this._renderShieldsForNode(node);
        const empty = document.createElement("div");
        empty.className = "ne-property-editor-empty";
        empty.textContent = text;
        this._bodyEl.appendChild(empty);
    }

    private _mountEditorForNode(node: NodeUI): boolean {
        this._dispose();
        const data = node && node.item ? (node.item.data as object | null) : null;
        if (!data) return false;
        const schema = getEditorSchema(data);

        // 1. Whole-class editor (e.g. attitude-3d): if any @editor("kind")
        // declared by the class is in the registry, mount it and stop.
        for (const kind of schema.classEditors) {
            const factory = this.editorRegistry.getFactory(kind);
            if (!factory) continue;
            this._bodyEl.innerHTML = "";
            this._bodyEl.appendChild(this._buildHeader(`${node.label} · ${kind}`, node));
            this._renderShieldsForNode(node);
            const editorHost = document.createElement("div");
            editorHost.className = "ne-property-editor-class-host";
            this._bodyEl.appendChild(editorHost);
            this._activeClassEditor = factory(editorHost, data);
            this._activeClassEditorHost = editorHost;
            return true;
        }

        // 2. Schema-driven fallback: render one row per @editable field,
        // then a second read-only group for @viewable mirrors of state
        // (i / angularVelocity / electromagneticTorque on the motor, matrix on Transform, ...).
        // Viewable fields delegate to the same factory pool but pass
        // `editable=false` so factories like vector.ts switch their
        // inputs to readOnly mode.
        if (!schema.fields || schema.fields.length === 0) return false;
        const editables = schema.fields.filter((f) => f.editable);
        const viewables = schema.fields.filter((f) => !f.editable);
        if (editables.length === 0 && viewables.length === 0) return false;

        this._bodyEl.innerHTML = "";
        this._bodyEl.appendChild(this._buildHeader(node.label, node));
        this._renderShieldsForNode(node);

        let rendered = 0;
        if (editables.length > 0) {
            const grid = this._appendFieldGrid();
            rendered += this._renderFieldRows(grid, data, editables);
        }
        if (viewables.length > 0) {
            const subhead = document.createElement("div");
            subhead.className = "ne-property-editor-subhead";
            subhead.textContent = "Live state";
            this._bodyEl.appendChild(subhead);
            const grid = this._appendFieldGrid();
            grid.classList.add("ne-property-editor-grid-readonly");
            rendered += this._renderFieldRows(grid, data, viewables);
        }
        return rendered > 0;
    }

    private _appendFieldGrid(): HTMLDivElement {
        const grid = document.createElement("div");
        grid.className = "ne-property-editor-grid";
        this._bodyEl.appendChild(grid);
        return grid;
    }

    private _renderFieldRows(grid: HTMLDivElement, data: object, fields: ReadonlyArray<IEditableField>): number {
        let rendered = 0;
        for (const field of fields) {
            const factory = this.editorRegistry.getFactory(field.kind);
            if (!factory) continue;
            const row = document.createElement("div");
            row.className = "ne-property-editor-row";
            const label = document.createElement("span");
            label.className = "ne-property-editor-row-label";
            label.textContent = field.propertyName;
            row.appendChild(label);
            const widgetHost = document.createElement("div");
            row.appendChild(widgetHost);
            grid.appendChild(row);
            // `disabledWhen` convention (2026-06-09): an @editable can
            // declare `options.disabledWhen = "is_X_wired"`. The panel
            // looks up that boolean on the model AT RENDER TIME; if
            // truthy, the row downgrades to read-only behavior:
            //   - factory receives editable=false (input.readOnly = true)
            //   - row gets the `ne-property-editor-row-disabled` class
            // so the user sees a visual cue that the value is driven
            // by an upstream wire. The static editable default is still
            // there in the model, just not consumed by the getter.
            const disabledByWire = field.editable && this._isDisabledByWire(field, data);
            if (disabledByWire) {
                row.classList.add("ne-property-editor-row-disabled");
            }
            const effectiveEditable = field.editable && !disabledByWire;
            try {
                const ed = factory(widgetHost, data, field.propertyName, field.options, effectiveEditable);
                if (ed) this._activeFieldEditors.push(ed);
                rendered += 1;
            } catch (e) {
                console.warn("[ne] field editor threw for", field.propertyName, e);
            }
        }
        return rendered;
    }

    /** Resolve `options.disabledWhen` on an @editable field: if it
     *  points to a truthy property on the model, the field is treated
     *  as read-only in the panel for this render pass. Reads are best-
     *  effort: malformed options, missing properties, or throwing
     *  getters all degrade silently to "not disabled". */
    private _isDisabledByWire(field: IEditableField, data: object): boolean {
        if (!field.options || typeof field.options !== "object") return false;
        const disabledWhen = (field.options as { disabledWhen?: string }).disabledWhen;
        if (!disabledWhen || typeof disabledWhen !== "string") return false;
        try {
            const v = (data as Record<string, unknown>)[disabledWhen];
            return !!v;
        } catch (_e) {
            return false;
        }
    }

    private _renderShieldsForNode(node: NodeUI): void {
        if (!node || !node.standards || node.standards.length === 0) return;
        renderStandardShields(this._bodyEl, node.standards, this.standards);
    }

    /**
     * Section header with optional copy / paste icon buttons. The icons
     * are appended only when the node has @editable fields. Paste is
     * gated on `permissions.write` so a read-only session cannot mutate
     * the model from clipboard.
     */
    private _buildHeader(label: string, node: NodeUI | null): HTMLElement {
        const wrap = document.createElement("div");
        wrap.className = "ne-property-editor-title";

        const text = document.createElement("span");
        text.textContent = label;
        wrap.appendChild(text);

        if (!node) return wrap;
        const data = node.item ? (node.item.data as object | null) : null;
        if (!data) return wrap;
        const schema = getEditorSchema(data);
        const hasEditables = schema.fields.some((f) => f.editable);
        if (!hasEditables) return wrap;

        const actions = document.createElement("span");
        actions.className = "ne-property-editor-actions";

        const copyBtn = makeIconButton(ICON_COPY, "Copy properties (JSON to clipboard)", async () => {
            try {
                const payload = this._buildPreset(node, schema, data);
                const ok = await writeClipboard(JSON.stringify(payload, null, 2));
                flashIcon(copyBtn, ok ? "ok" : "err");
            } catch (e) {
                console.warn("[ne] copy properties failed:", e);
                flashIcon(copyBtn, "err");
            }
        });
        actions.appendChild(copyBtn);

        if (this.permissions.write) {
            const pasteBtn = makeIconButton(ICON_PASTE, "Paste properties (JSON from clipboard)", async () => {
                try {
                    const text = await readClipboard();
                    if (text === null) return; // user cancelled the fallback prompt
                    const obj = JSON.parse(text);
                    const n = this._applyPreset(schema, data, obj);
                    if (n > 0) {
                        flashIcon(pasteBtn, "ok");
                        this._mountEditorForNode(node);
                    } else {
                        flashIcon(pasteBtn, "err");
                    }
                } catch (e) {
                    console.warn("[ne] paste properties failed:", e);
                    flashIcon(pasteBtn, "err");
                }
            });
            actions.appendChild(pasteBtn);
        }

        wrap.appendChild(actions);
        return wrap;
    }

    // ── Preset (copy / paste / drop) ───────────────────────────────────

    private _buildPreset(node: NodeUI, schema: IEditorSchema, data: object): PresetEnvelope {
        const properties: Record<string, unknown> = {};
        for (const field of schema.fields) {
            if (!field.editable) continue;
            properties[field.propertyName] = serializeValue((data as Record<string, unknown>)[field.propertyName]);
        }
        return {
            typeId: node.typeId,
            label: node.label,
            properties,
        };
    }

    private _applyPreset(schema: IEditorSchema, data: object, obj: unknown): number {
        const props = unwrapPresetProperties(obj);
        if (!props) return 0;
        let applied = 0;
        for (const field of schema.fields) {
            if (!field.editable) continue;
            if (!(field.propertyName in props)) continue;
            try {
                const current = (data as Record<string, unknown>)[field.propertyName];
                const next = coerceForAssignment(current, props[field.propertyName]);
                (data as Record<string, unknown>)[field.propertyName] = next;
                applied += 1;
            } catch (e) {
                console.warn("[ne] apply property failed for", field.propertyName, e);
            }
        }
        return applied;
    }

    /**
     * Drag-and-drop a manufacturer JSON onto the panel: parse + apply
     * to the current node. Listeners stay alive for the lifetime of
     * the component (no per-render churn).
     */
    private _installDropZone(): void {
        const setActive = (on: boolean) => {
            this.host.classList.toggle("is-drop-active", on);
        };
        this.host.addEventListener("dragenter", (e) => {
            if (!hasFilesInDataTransfer(e.dataTransfer)) return;
            this._dragDepth += 1;
            setActive(true);
        });
        this.host.addEventListener("dragover", (e) => {
            if (!hasFilesInDataTransfer(e.dataTransfer)) return;
            e.preventDefault();
            if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
        });
        this.host.addEventListener("dragleave", () => {
            this._dragDepth = Math.max(0, this._dragDepth - 1);
            if (this._dragDepth === 0) setActive(false);
        });
        this.host.addEventListener("drop", (e) => {
            e.preventDefault();
            this._dragDepth = 0;
            setActive(false);
            void this._handleDrop(e);
        });
    }

    private async _handleDrop(e: DragEvent): Promise<void> {
        if (!this.permissions.write) return;
        const node = this._currentNode;
        if (!node) return;
        const file = e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files[0] : null;
        if (!file) return;
        try {
            const text = await file.text();
            const obj = JSON.parse(text);
            const data = node.item ? (node.item.data as object | null) : null;
            if (!data) return;
            const schema = getEditorSchema(data);
            const applied = this._applyPreset(schema, data, obj);
            console.log(`[ne] preset applied: ${applied} field(s) from ${file.name}`);
            if (applied > 0) this._mountEditorForNode(node);
        } catch (err) {
            console.warn("[ne] preset drop failed:", err);
        }
    }

    // ── Teardown ───────────────────────────────────────────────────────

    private _dispose(): void {
        if (this._activeClassEditor && typeof this._activeClassEditor.dispose === "function") {
            try {
                this._activeClassEditor.dispose();
            } catch (e) {
                console.warn("[ne] class editor dispose threw:", e);
            }
        }
        this._activeClassEditor = null;
        if (this._activeClassEditorHost && this._activeClassEditorHost.parentNode) {
            this._activeClassEditorHost.parentNode.removeChild(this._activeClassEditorHost);
        }
        this._activeClassEditorHost = null;
        while (this._activeFieldEditors.length) {
            const ed = this._activeFieldEditors.pop();
            if (ed && typeof ed.dispose === "function") {
                try {
                    ed.dispose();
                } catch (e) {
                    console.warn("[ne] field editor dispose threw:", e);
                }
            }
        }
    }
}

// ── Helpers (file-scoped, kept out of the class to keep it readable) ───

// Compact outline icons. currentColor inherits the surrounding text so
// the icons follow the active skin without per-skin overrides.
const ICON_COPY =
    '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">' +
    '<rect x="5" y="5" width="9" height="9" rx="1"/>' +
    '<path d="M3 11V3a1 1 0 0 1 1-1h7"/>' +
    "</svg>";

const ICON_PASTE =
    '<svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true">' +
    '<rect x="3" y="4" width="10" height="11" rx="1"/>' +
    '<rect x="5.5" y="2" width="5" height="2.5" rx="0.5" fill="currentColor"/>' +
    "</svg>";

function makeIconButton(svgMarkup: string, title: string, onClick: () => void): HTMLButtonElement {
    const b = document.createElement("button");
    b.className = "ne-property-editor-icon-btn";
    b.title = title;
    b.innerHTML = svgMarkup;
    b.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
    });
    return b;
}

function flashIcon(btn: HTMLButtonElement, kind: "ok" | "err"): void {
    btn.classList.remove("is-ok", "is-err");
    btn.classList.add(kind === "ok" ? "is-ok" : "is-err");
    setTimeout(() => btn.classList.remove("is-ok", "is-err"), 700);
}

function hasFilesInDataTransfer(dt: DataTransfer | null): boolean {
    if (!dt) return false;
    for (const t of Array.from(dt.types ?? [])) {
        if (t === "Files") return true;
    }
    return false;
}

function serializeValue(v: unknown): unknown {
    if (v === null || v === undefined) return v;
    const t = typeof v;
    if (t === "number" || t === "boolean" || t === "string") return v;
    if (t === "object") {
        const out: Record<string, unknown> = {};
        for (const k of Object.keys(v as object)) {
            const child = (v as Record<string, unknown>)[k];
            if (typeof child === "function") continue;
            out[k] = serializeValue(child);
        }
        return out;
    }
    return v;
}

function unwrapPresetProperties(obj: unknown): Record<string, unknown> | null {
    if (!obj || typeof obj !== "object") return null;
    const envelope = obj as PresetEnvelope;
    if (envelope.properties && typeof envelope.properties === "object") {
        return envelope.properties as Record<string, unknown>;
    }
    return obj as Record<string, unknown>;
}

function coerceForAssignment(current: unknown, incoming: unknown): unknown {
    if (current === null || current === undefined) return incoming;
    const t = typeof current;
    if (t === "number") return Number(incoming);
    if (t === "boolean") return Boolean(incoming);
    if (t === "string") return String(incoming);
    if (t === "object" && incoming && typeof incoming === "object") {
        // Reconstruct via constructor so the model's setter fires
        // (same pattern as vector.ts). Detect ordered x/y/z[/w] for the
        // common Cartesian / Quaternion case; otherwise shallow-merge.
        const Ctor = (current as { constructor?: unknown }).constructor as (new (...args: number[]) => unknown) | undefined;
        const ordered = ["x", "y", "z", "w"].filter((k) => k in (current as Record<string, unknown>));
        if (Ctor && ordered.length >= 2) {
            const args = ordered.map((k) => Number((incoming as Record<string, unknown>)[k] ?? (current as Record<string, unknown>)[k]));
            try {
                return new Ctor(...args);
            } catch {
                /* fall through */
            }
        }
        try {
            const fresh = Ctor ? new (Ctor as unknown as new () => object)() : {};
            Object.assign(fresh, current, incoming);
            return fresh;
        } catch {
            return Object.assign({}, current, incoming);
        }
    }
    return incoming;
}

// Public reference kept for callers that want to feed a preset
// programmatically (e.g. unit tests, paste handlers in hosts).
export { serializeValue, unwrapPresetProperties, coerceForAssignment };

/**
 * Robust clipboard write. The async Clipboard API (`navigator.clipboard`) only
 * exists in a SECURE CONTEXT (https or localhost); over plain http on a LAN IP
 * it is `undefined`, which is why the property-panel copy "did nothing". Fall
 * back to a hidden-textarea `execCommand("copy")` so it works everywhere.
 */
async function writeClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // secure-context API present but blocked (permission / focus) — fall through
    }
    try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.top = "-1000px";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}

/**
 * Robust clipboard read. `Clipboard.readText` needs a secure context + a
 * read permission grant; when unavailable, prompt the user to paste the JSON
 * manually (Ctrl+V into the dialog works in any context). Returns null when the
 * user cancels.
 */
async function readClipboard(): Promise<string | null> {
    try {
        if (navigator.clipboard?.readText) {
            return await navigator.clipboard.readText();
        }
    } catch {
        // not permitted / not secure context — fall through to the manual prompt
    }
    return window.prompt("Paste the preset JSON here (Ctrl+V):") ?? null;
}
export type { IEditableField };
