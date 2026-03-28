import { UIItemBase } from "./inspectable.js";

export class PropertyPanel {
    readonly el: HTMLDivElement;
    private readonly parentEl: HTMLElement;
    private readonly titleEl: HTMLDivElement;
    private readonly contentEl: HTMLDivElement;
    private readonly closeBtn: HTMLButtonElement;
    private visible = false;

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

        parent.appendChild(this.el);
        this.el.style.display = "none";
    }

    show(item: UIItemBase<unknown>): void {
        this.contentEl.innerHTML = "";
        this.titleEl.textContent = item.getDisplayName();

        if (item.isInspectable() && item.data.render) {
            item.data.render(this.contentEl);
        } else {
            const entries = item.getProperties();
            for (const entry of entries) {
                const row = document.createElement("div");
                row.className = "ne-pp-row";

                const keyEl = document.createElement("span");
                keyEl.className = "ne-pp-key";
                keyEl.textContent = entry.key;
                row.appendChild(keyEl);

                const valEl = document.createElement("span");
                valEl.className = "ne-pp-value";
                valEl.textContent = this.formatValue(entry.value);
                valEl.title = this.formatValue(entry.value);
                row.appendChild(valEl);

                this.contentEl.appendChild(row);
            }
        }

        this.el.style.display = "";
        this.parentEl.classList.add("ne-panel-open");
        this.visible = true;
    }

    hide(): void {
        this.el.style.display = "none";
        this.parentEl.classList.remove("ne-panel-open");
        this.contentEl.innerHTML = "";
        this.titleEl.textContent = "";
        this.visible = false;
    }

    isVisible(): boolean {
        return this.visible;
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
