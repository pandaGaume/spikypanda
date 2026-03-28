import { PropertyEntry, UIItemBase } from "./inspectable.js";

export class PropertyPanel {
    readonly el: HTMLDivElement;
    private readonly parentEl: HTMLElement;
    private readonly titleEl: HTMLDivElement;
    private readonly contentEl: HTMLDivElement;
    private readonly footerEl: HTMLDivElement;
    private readonly applyBtn: HTMLButtonElement;
    private readonly resetBtn: HTMLButtonElement;
    private readonly closeBtn: HTMLButtonElement;
    private visible = false;

    private currentItem: UIItemBase<unknown> | null = null;
    private staged = new Map<string, unknown>();

    onApply: ((item: UIItemBase<unknown>, changes: Map<string, unknown>) => void) | null = null;

    constructor(parent: HTMLElement) {
        this.parentEl = parent;
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

        this.contentEl = document.createElement("div");
        this.contentEl.className = "ne-pp-content";
        this.el.appendChild(this.contentEl);

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
        this.currentItem = item;
        this.staged.clear();
        this.render();
        this.updateButtons();
        this.el.style.display = "";
        this.parentEl.classList.add("ne-panel-open");
        this.visible = true;
    }

    hide(): void {
        this.el.style.display = "none";
        this.parentEl.classList.remove("ne-panel-open");
        this.contentEl.innerHTML = "";
        this.titleEl.textContent = "";
        this.footerEl.style.display = "none";
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

    private render(): void {
        if (!this.currentItem) return;
        const item = this.currentItem;

        this.contentEl.innerHTML = "";
        this.titleEl.textContent = item.getDisplayName();

        if (item.isInspectable() && item.data.render) {
            item.data.render(this.contentEl);
            this.footerEl.style.display = "none";
            return;
        }

        const entries = item.getProperties();
        let hasEditable = false;

        for (const entry of entries) {
            const row = document.createElement("div");
            row.className = "ne-pp-row";

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
                valEl.textContent = this.formatValue(entry.value);
                valEl.title = this.formatValue(entry.value);
                row.appendChild(valEl);
            }

            this.contentEl.appendChild(row);
        }

        this.footerEl.style.display = hasEditable ? "" : "none";
    }

    private createInput(entry: PropertyEntry): HTMLElement {
        const type = entry.type ?? (typeof entry.value === "number" ? "number"
            : typeof entry.value === "boolean" ? "boolean" : "string");

        if (type === "boolean") {
            const cb = document.createElement("input");
            cb.type = "checkbox";
            cb.className = "ne-pp-input-checkbox";
            cb.checked = !!entry.value;
            cb.addEventListener("change", () => {
                this.staged.set(entry.key, cb.checked);
                this.updateButtons();
            });
            return cb;
        }

        const input = document.createElement("input");
        input.className = "ne-pp-input";
        input.type = type === "number" ? "number" : "text";
        input.value = String(entry.value ?? "");
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
