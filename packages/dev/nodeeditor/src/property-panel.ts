import { getEditorSchema, IDisposable, IEditableField } from "spikypanda-core";
import { EditorRegistry, IEditor } from "./editor-registry";
import { PropertyEntry, UIItemBase } from "./inspectable";

/**
 * Shape the panel duck-checks on a model to decide whether to subscribe
 * to live property changes. Any object exposing an Observable-ish
 * onPropertyChanged with an .add(cb) returning an IDisposable qualifies
 * (GraphItem-derived models do; ad-hoc objects do not).
 */
interface IObservableModel {
    onPropertyChanged: {
        add(callback: (args: { propertyName?: string }) => void): IDisposable | null;
    };
}

/**
 * Decorator kinds the panel can render with the primitive PropertyEntry
 * fallback when no factory is registered for them. Maps the @editable
 * kind to the PropertyEntry.type string the existing createInput()
 * already understands. Keeps the fallback path tiny: unknown kinds
 * become read-only text with a "no editor for kind X" hint.
 */
const PRIMITIVE_KIND_TO_INPUT_TYPE: Record<string, "string" | "number" | "boolean"> = {
    string: "string",
    text: "string",
    number: "number",
    int: "number",
    float: "number",
    boolean: "boolean",
    bool: "boolean",
};

/**
 * One entry in the tab bar. Properties is always present and rendered
 * by the panel itself; the others come from the model's @editor class
 * decorators and are instantiated lazily via the EditorRegistry on
 * first activation. editor is undefined until activated; on tab switch
 * out or on hide() / new item, all instantiated editors are disposed.
 */
interface TabState {
    readonly name: string; // "properties" or the editor kind
    readonly label: string; // user-visible (currently kind verbatim)
    readonly bodyEl: HTMLDivElement;
    readonly buttonEl: HTMLButtonElement;
    readonly isProperties: boolean;
    editor?: IEditor;
}

export class PropertyPanel {
    readonly el: HTMLDivElement;
    private readonly parentEl: HTMLElement;
    private readonly editorRegistry: EditorRegistry;
    private readonly titleEl: HTMLDivElement;
    private readonly tabsBarEl: HTMLDivElement;
    private readonly tabBodiesEl: HTMLDivElement;
    private readonly contentEl: HTMLDivElement;
    private readonly footerEl: HTMLDivElement;
    private readonly applyBtn: HTMLButtonElement;
    private readonly resetBtn: HTMLButtonElement;
    private readonly closeBtn: HTMLButtonElement;
    private visible = false;

    private currentItem: UIItemBase<unknown> | null = null;
    private staged = new Map<string, unknown>();
    private tabs: TabState[] = [];
    private activeTab: TabState | null = null;
    private fieldEditors: IEditor[] = [];
    private modelSubscription: IDisposable | null = null;
    /**
     * Property names of fields the panel rendered via a registered
     * factory in the current frame. Re-render skips events targeting
     * these properties so that an actively-edited sub-editor is not
     * torn down by its own model.onPropertyChanged fire.
     */
    private factoryDrivenFields = new Set<string>();

    onApply: ((item: UIItemBase<unknown>, changes: Map<string, unknown>) => void) | null = null;

    constructor(parent: HTMLElement, editorRegistry: EditorRegistry) {
        this.parentEl = parent;
        this.editorRegistry = editorRegistry;
        this.el = document.createElement("div");
        this.el.className = "ne-property-panel";

        const header = document.createElement("div");
        header.className = "ne-pp-header";

        this.titleEl = document.createElement("div");
        this.titleEl.className = "ne-pp-title";
        header.appendChild(this.titleEl);

        this.closeBtn = document.createElement("button");
        this.closeBtn.className = "ne-pp-close";
        this.closeBtn.innerHTML = "&times;";
        this.closeBtn.addEventListener("click", () => this.hide());
        header.appendChild(this.closeBtn);

        this.el.appendChild(header);

        // Tab bar sits between header and tab bodies. Always visible
        // even when a single tab is present, so the visual structure
        // stays consistent as soon as a node has a custom editor.
        this.tabsBarEl = document.createElement("div");
        this.tabsBarEl.className = "ne-pp-tabs";
        this.el.appendChild(this.tabsBarEl);

        this.tabBodiesEl = document.createElement("div");
        this.tabBodiesEl.className = "ne-pp-tab-bodies";
        this.el.appendChild(this.tabBodiesEl);

        // contentEl is the Properties tab's body. It is re-attached to a
        // dedicated tab-body wrapper on each show(); kept as a stable
        // field so render() / createInput() / etc. keep their old shape.
        this.contentEl = document.createElement("div");
        this.contentEl.className = "ne-pp-content";

        this.footerEl = document.createElement("div");
        this.footerEl.className = "ne-pp-footer";
        this.footerEl.style.display = "none";

        this.applyBtn = document.createElement("button");
        this.applyBtn.className = "ne-pp-btn ne-pp-btn-apply ne-pp-btn-disabled";
        this.applyBtn.textContent = "Apply";
        this.applyBtn.addEventListener("click", () => this.applyChanges());
        this.footerEl.appendChild(this.applyBtn);

        this.resetBtn = document.createElement("button");
        this.resetBtn.className = "ne-pp-btn ne-pp-btn-reset ne-pp-btn-disabled";
        this.resetBtn.textContent = "Reset";
        this.resetBtn.addEventListener("click", () => this.resetChanges());
        this.footerEl.appendChild(this.resetBtn);

        this.el.appendChild(this.footerEl);

        parent.appendChild(this.el);
        this.el.style.display = "none";
    }

    show(item: UIItemBase<unknown>): void {
        this.unsubscribeFromModel();
        this.currentItem = item;
        this.staged.clear();
        this.rebuildTabs();
        this.activate(this.tabs[0] ?? null);
        this.subscribeToModel();
        this.el.style.display = "";
        this.parentEl.classList.add("ne-panel-open");
        this.visible = true;
    }

    refresh(): void {
        if (!this.visible || !this.currentItem) return;
        this.staged.clear();
        if (this.activeTab?.isProperties) {
            this.render();
        }
        this.updateButtons();
    }

    hide(): void {
        this.unsubscribeFromModel();
        this.disposeAllCustomEditors();
        this.disposeFieldEditors();
        this.el.style.display = "none";
        this.parentEl.classList.remove("ne-panel-open");
        this.contentEl.innerHTML = "";
        this.titleEl.textContent = "";
        this.footerEl.style.display = "none";
        this.tabsBarEl.innerHTML = "";
        this.tabBodiesEl.innerHTML = "";
        this.tabs = [];
        this.activeTab = null;
        this.currentItem = null;
        this.staged.clear();
        this.visible = false;
    }

    isVisible(): boolean {
        return this.visible;
    }

    private updateButtons(): void {
        const dirty = this.staged.size > 0;
        this.applyBtn.classList.toggle("ne-pp-btn-disabled", !dirty);
        this.resetBtn.classList.toggle("ne-pp-btn-disabled", !dirty);
    }

    private rebuildTabs(): void {
        this.disposeAllCustomEditors();
        this.tabs = [];
        this.activeTab = null;
        this.tabsBarEl.innerHTML = "";
        this.tabBodiesEl.innerHTML = "";

        if (!this.currentItem) return;

        // Tab 1: always-present Properties. The body wraps the existing
        // contentEl so render()/createInput() continue to write into it.
        const propBody = document.createElement("div");
        propBody.className = "ne-pp-tab-body";
        propBody.appendChild(this.contentEl);
        this.tabBodiesEl.appendChild(propBody);
        const propBtn = this.createTabButton("Properties");
        const propTab: TabState = {
            name: "properties",
            label: "Properties",
            bodyEl: propBody,
            buttonEl: propBtn,
            isProperties: true,
        };
        propBtn.addEventListener("click", () => this.activate(propTab));
        this.tabsBarEl.appendChild(propBtn);
        this.tabs.push(propTab);

        // Tabs from the model's @editor declarations, filtered to kinds
        // for which the registry has a factory. Unregistered kinds are
        // silently dropped so the panel never shows a tab the user
        // cannot interact with.
        const model = this.currentItem.data;
        if (typeof model === "object" && model !== null) {
            const schema = getEditorSchema(model);
            for (const kind of schema.classEditors) {
                if (!this.editorRegistry.has(kind)) continue;
                const body = document.createElement("div");
                body.className = "ne-pp-tab-body";
                this.tabBodiesEl.appendChild(body);
                const btn = this.createTabButton(kind);
                const tab: TabState = {
                    name: kind,
                    label: kind,
                    bodyEl: body,
                    buttonEl: btn,
                    isProperties: false,
                };
                btn.addEventListener("click", () => this.activate(tab));
                this.tabsBarEl.appendChild(btn);
                this.tabs.push(tab);
            }
        }
    }

    private createTabButton(label: string): HTMLButtonElement {
        const btn = document.createElement("button");
        btn.className = "ne-pp-tab";
        btn.textContent = label;
        return btn;
    }

    private activate(tab: TabState | null): void {
        if (!tab) return;
        if (this.activeTab === tab) return;

        if (this.activeTab) {
            this.activeTab.bodyEl.classList.remove("ne-pp-tab-body-active");
            this.activeTab.buttonEl.classList.remove("ne-pp-tab-active");
        }
        tab.bodyEl.classList.add("ne-pp-tab-body-active");
        tab.buttonEl.classList.add("ne-pp-tab-active");
        this.activeTab = tab;

        if (tab.isProperties) {
            this.render();
        } else {
            // Footer (Apply / Reset) belongs to Properties only; custom
            // editors push their own controls into their body.
            this.footerEl.style.display = "none";
            this.ensureCustomEditor(tab);
        }
    }

    private ensureCustomEditor(tab: TabState): void {
        if (tab.editor) return;
        if (!this.currentItem) return;
        const factory = this.editorRegistry.getFactory(tab.name);
        if (!factory) return;
        const model = this.currentItem.data;
        if (typeof model !== "object" || model === null) return;
        tab.editor = factory(tab.bodyEl, model);
    }

    private disposeAllCustomEditors(): void {
        for (const tab of this.tabs) {
            if (tab.editor) {
                tab.editor.dispose();
                tab.editor = undefined;
            }
        }
    }

    private render(): void {
        if (!this.currentItem) return;
        const item = this.currentItem;

        // Dispose any sub-editors from a previous render before
        // dropping their DOM, so subscriptions to model events are
        // cleared cleanly.
        this.disposeFieldEditors();

        this.contentEl.innerHTML = "";
        this.titleEl.textContent = item.getDisplayName();

        // Inspectable.render takes precedence: a model that fully
        // owns its rendering opts out of the schema/Inspectable
        // entry rendering entirely.
        if (item.isInspectable() && item.data.render) {
            item.data.render(this.contentEl);
            this.footerEl.style.display = "none";
            return;
        }

        const model = item.data;
        const schema = typeof model === "object" && model !== null ? getEditorSchema(model) : null;

        // Decorator-first: when the model declares any @editable /
        // @viewable, render strictly from that schema. The Inspectable
        // pathway stays as fallback for legacy / undecorated models.
        if (schema && schema.fields.length > 0) {
            this.renderDecoratedFields(model as object, schema.fields);
        } else {
            this.renderInspectableEntries(item.getProperties());
        }
    }

    private renderDecoratedFields(model: object, fields: ReadonlyArray<IEditableField>): void {
        let hasEditableFallbackInput = false;
        this.factoryDrivenFields.clear();

        for (const field of fields) {
            const row = document.createElement("div");
            row.className = "ne-pp-row";
            // Read-only modifier for @viewable fields. Dims the row
            // and blocks pointer events so a registered factory that
            // forgot to honour the `editable` arg still renders inert.
            if (!field.editable) {
                row.classList.add("ne-pp-row-readonly");
            }
            // Block layout (Blender/CAD-style framed group): opt-in via
            // @editable("vector3", { layout: "block" }). Adds a visible
            // surround with the label as a header and the cell stretched
            // to full width below.
            const optsLayout = (field.options as { layout?: string } | undefined)?.layout;
            if (optsLayout === "block") {
                row.classList.add("ne-pp-row-block");
            }

            const keyEl = document.createElement("span");
            keyEl.className = "ne-pp-key";
            keyEl.textContent = field.propertyName;
            row.appendChild(keyEl);

            const cell = document.createElement("span");
            cell.className = "ne-pp-value";
            // Optional alignement hint: shapes the cell as a flex row
            // (horizontal) or column (vertical) so sub-editors can
            // simply append their children without styling. Useful
            // pairs: { layout: "block", alignement: "horizontal" } for
            // a vector3 with X/Y/Z inline; { alignement: "vertical" }
            // for a list of stacked sub-controls.
            const alignement = (field.options as { alignement?: string } | undefined)?.alignement;
            if (alignement === "horizontal" || alignement === "vertical") {
                cell.classList.add(`ne-pp-value-${alignement}`);
            }
            row.appendChild(cell);

            const factory = this.editorRegistry.getFactory(field.kind);
            if (factory) {
                // Registered factory: hand off to the sub-editor. It
                // is the sub-editor's responsibility to read/write the
                // model directly; the panel does NOT route changes
                // through staged/Apply for registered editors. Mark
                // the field so the model-event handler skips it during
                // re-render and lets the sub-editor refresh itself.
                const editor = factory(cell, model, field.propertyName, field.options, field.editable);
                this.fieldEditors.push(editor);
                this.factoryDrivenFields.add(field.propertyName);
            } else {
                // No factory: fall back to a primitive input when the
                // kind is one of the well-known scalar kinds; otherwise
                // a read-only display with a hint about the missing
                // factory. The staged/Apply pipeline still routes
                // primitive edits through item.setProperty().
                const fallback = this.createPrimitiveFallback(model, field);
                if (fallback.editable) hasEditableFallbackInput = true;
                cell.appendChild(fallback.el);
            }

            this.contentEl.appendChild(row);
        }

        // Footer Apply/Reset is meaningful only for staged primitive
        // edits. Custom sub-editors push their changes straight into
        // the model, so they do not contribute to "dirty" state here.
        this.footerEl.style.display = hasEditableFallbackInput ? "" : "none";
    }

    private renderInspectableEntries(entries: PropertyEntry[]): void {
        let hasEditable = false;

        for (const entry of entries) {
            const row = document.createElement("div");
            row.className = "ne-pp-row";
            if (!entry.editable) {
                row.classList.add("ne-pp-row-readonly");
            }

            const keyEl = document.createElement("span");
            keyEl.className = "ne-pp-key";
            keyEl.textContent = entry.key;
            row.appendChild(keyEl);

            if (entry.editable) {
                hasEditable = true;
                const input = this.createInput(entry);
                row.appendChild(input);
            } else {
                const valEl = document.createElement("span");
                valEl.className = "ne-pp-value";
                if (entry.hint) {
                    valEl.textContent = entry.hint;
                    valEl.style.fontStyle = "italic";
                    valEl.style.opacity = "0.55";
                } else {
                    valEl.textContent = this.formatValue(entry.value);
                    valEl.title = this.formatValue(entry.value);
                }
                row.appendChild(valEl);
            }

            this.contentEl.appendChild(row);
        }

        this.footerEl.style.display = hasEditable ? "" : "none";
    }

    private createPrimitiveFallback(model: object, field: IEditableField): { el: HTMLElement; editable: boolean } {
        const value = (model as Record<string, unknown>)[field.propertyName];

        const primitiveType = PRIMITIVE_KIND_TO_INPUT_TYPE[field.kind];
        if (field.editable && primitiveType) {
            const entry: PropertyEntry = {
                key: field.propertyName,
                value,
                editable: true,
                type: primitiveType,
            };
            return { el: this.createInput(entry), editable: true };
        }

        const valEl = document.createElement("span");
        valEl.className = "ne-pp-value";
        valEl.textContent = this.formatValue(value);
        if (field.editable) {
            // The model wanted this editable but no factory shipped for
            // the kind. Mark visually as inert + explain on hover so
            // the developer sees why nothing happens on click.
            valEl.title = `no editor registered for kind '${field.kind}'`;
            valEl.style.opacity = "0.55";
        } else {
            valEl.title = this.formatValue(value);
        }
        return { el: valEl, editable: false };
    }

    private disposeFieldEditors(): void {
        for (const editor of this.fieldEditors) {
            editor.dispose();
        }
        this.fieldEditors = [];
        this.factoryDrivenFields.clear();
    }

    /**
     * Subscribe to the current model's onPropertyChanged Observable
     * when present (GraphItem-derived models expose it). On each event,
     * re-render the Properties tab IF it is active AND the changed
     * property is rendered by the primitive fallback path (not by a
     * registered sub-editor). Skipping factory-driven property events
     * prevents a sub-editor from being torn down by its own write.
     */
    private subscribeToModel(): void {
        if (!this.currentItem) return;
        const data = this.currentItem.data;
        if (typeof data !== "object" || data === null) return;
        const obs = (data as Partial<IObservableModel>).onPropertyChanged;
        if (!obs || typeof obs.add !== "function") return;

        this.modelSubscription = obs.add((args) => {
            if (!this.activeTab?.isProperties) return;
            const name = args?.propertyName;
            // No propertyName → fall through to a full re-render
            // (safe but coarse). With a name, skip when a registered
            // sub-editor owns that field.
            if (name && this.factoryDrivenFields.has(name)) return;
            this.render();
        });
    }

    private unsubscribeFromModel(): void {
        this.modelSubscription?.dispose();
        this.modelSubscription = null;
    }

    private createInput(entry: PropertyEntry): HTMLElement {
        const type = entry.type ?? (typeof entry.value === "number" ? "number" : typeof entry.value === "boolean" ? "boolean" : "string");

        // Reads pending edits from the staged map so a re-render
        // (triggered e.g. by another field's onPropertyChanged) does
        // not throw away unconfirmed user input.
        const stagedValue = this.staged.has(entry.key) ? this.staged.get(entry.key) : undefined;
        const displayValue = this.staged.has(entry.key) ? stagedValue : entry.value;

        if (type === "boolean") {
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.className = "ne-pp-input-checkbox";
            cb.checked = !!displayValue;
            cb.addEventListener("change", () => {
                this.staged.set(entry.key, cb.checked);
                this.updateButtons();
            });
            return cb;
        }

        if (type === "select") {
            const sel = document.createElement("select");
            sel.className = "ne-pp-input ne-pp-select";
            const opts = entry.options ?? [];
            for (const opt of opts) {
                const o = document.createElement("option");
                o.value = opt.value;
                o.textContent = opt.label;
                if (opt.value === String(displayValue)) o.selected = true;
                sel.appendChild(o);
            }
            // Fallback: if current value is not in options list, add it as-is.
            if (opts.length === 0 || !opts.find((o) => o.value === String(displayValue))) {
                const o = document.createElement("option");
                o.value = String(displayValue);
                o.textContent = String(displayValue);
                o.selected = true;
                sel.insertBefore(o, sel.firstChild);
            }
            sel.addEventListener("change", () => {
                this.staged.set(entry.key, sel.value);
                this.updateButtons();
            });
            return sel;
        }

        const input = document.createElement("input");
        input.className = "ne-pp-input";
        input.type = type === "number" ? "number" : "text";
        input.value = String(displayValue ?? "");
        input.addEventListener("input", () => {
            const val = type === "number" ? Number(input.value) : input.value;
            this.staged.set(entry.key, val);
            this.updateButtons();
        });
        return input;
    }

    private applyChanges(): void {
        if (!this.currentItem || this.staged.size === 0) return;
        const changes = new Map(this.staged);
        for (const [key, value] of changes) {
            this.currentItem.setProperty(key, value);
        }
        if (this.onApply) {
            this.onApply(this.currentItem, changes);
        }
        this.staged.clear();
        this.render();
        this.updateButtons();
    }

    private resetChanges(): void {
        this.staged.clear();
        this.render();
        this.updateButtons();
    }

    private formatValue(v: unknown): string {
        if (v === null || v === undefined) return String(v);
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
            return String(v);
        }
        try {
            return JSON.stringify(v);
        } catch {
            return String(v);
        }
    }
}
