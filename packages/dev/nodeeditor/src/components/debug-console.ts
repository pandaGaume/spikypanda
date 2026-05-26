import type { IDisposable } from "spikypanda-core";
import { DebugBus, type IDebugEntry } from "../debug-bus";

export interface DebugConsoleOptions {
    /** Header label rendered in the title chip. Defaults to "Console". */
    title?: string;
    /** Max rows kept in the DOM before old ones are dropped. Defaults to 500;
     *  larger values cost DOM nodes, smaller values cost history. */
    maxRows?: number;
    /** When true, mounts collapsed (only the header strip is visible). */
    startCollapsed?: boolean;
}

/**
 * Editor debug console.
 *
 * Sits at the bottom of a node editor as a passive observer of the
 * process-wide `DebugBus`. Print / Watch nodes (and any future logger)
 * call `DebugBus.instance.log(...)`; the console renders one row per
 * entry with timestamp, level, source, and message.
 *
 * Skin-aware: every visible token uses the `--ne-color-*` palette of
 * the active editor skin so the console adopts the helios / dark /
 * light theme automatically. No local CSS variables.
 *
 * Layout: a 28-px header strip with the title + Clear + collapse
 * toggle, then a scrollable body. Collapsed state hides the body and
 * keeps only the strip, so the editor reclaims vertical space without
 * losing the console's pinned location.
 *
 * Buffer policy: stateless on the bus, capped on the DOM. When the
 * row count exceeds `maxRows`, the oldest rows are dropped. There is
 * no separate retention buffer — once a row scrolls past the cap it
 * is gone.
 */
export class DebugConsole implements IDisposable {
    public readonly host: HTMLElement;

    private readonly _bodyEl:    HTMLDivElement;
    private readonly _emptyEl:   HTMLDivElement;
    private readonly _toggleBtn: HTMLButtonElement;
    private readonly _subscription: IDisposable;
    private readonly _maxRows: number;

    private _rowCount = 0;
    private _disposed = false;

    public constructor(host: HTMLElement, options: DebugConsoleOptions = {}) {
        this.host = host;
        this._maxRows = options.maxRows ?? 500;

        host.classList.add("ne-console");
        host.innerHTML = "";

        // Header
        const header = document.createElement("div");
        header.className = "ne-console-header";
        const titleEl = document.createElement("span");
        titleEl.className = "ne-console-title";
        titleEl.textContent = options.title ?? "Console";
        const spacer = document.createElement("span");
        spacer.className = "ne-console-spacer";
        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.className = "ne-console-btn";
        clearBtn.title = "Clear log";
        clearBtn.textContent = "Clear";
        clearBtn.addEventListener("click", () => this.clear());
        this._toggleBtn = document.createElement("button");
        this._toggleBtn.type = "button";
        this._toggleBtn.className = "ne-console-btn";
        this._toggleBtn.title = "Collapse / expand";
        this._toggleBtn.textContent = "_";
        this._toggleBtn.addEventListener("click", () => this.toggleCollapsed());
        header.appendChild(titleEl);
        header.appendChild(spacer);
        header.appendChild(clearBtn);
        header.appendChild(this._toggleBtn);
        host.appendChild(header);

        // Body
        this._bodyEl = document.createElement("div");
        this._bodyEl.className = "ne-console-body";
        host.appendChild(this._bodyEl);

        this._emptyEl = document.createElement("div");
        this._emptyEl.className = "ne-console-empty";
        this._emptyEl.textContent =
            "No log entries yet. Wire a Print String node and Run Once.";
        this._bodyEl.appendChild(this._emptyEl);

        if (options.startCollapsed) this.setCollapsed(true);

        this._subscription = DebugBus.instance.addHandler((e) => this._append(e));
    }

    public clear(): void {
        this._bodyEl.innerHTML = "";
        this._rowCount = 0;
        this._bodyEl.appendChild(this._emptyEl);
    }

    public setCollapsed(collapsed: boolean): void {
        this.host.classList.toggle("is-collapsed", collapsed);
        this._toggleBtn.textContent = collapsed ? "▴" : "_";
    }

    public toggleCollapsed(): void {
        this.setCollapsed(!this.host.classList.contains("is-collapsed"));
    }

    public dispose(): void {
        if (this._disposed) return;
        this._disposed = true;
        this._subscription.dispose();
        this.host.classList.remove("ne-console");
        this.host.innerHTML = "";
    }

    private _append(entry: IDebugEntry): void {
        if (this._disposed) return;
        if (this._rowCount === 0 && this._emptyEl.parentNode === this._bodyEl) {
            this._bodyEl.removeChild(this._emptyEl);
        }
        const row = document.createElement("div");
        row.className = "ne-console-row";

        const ts = document.createElement("span");
        ts.className = "ne-console-ts";
        ts.textContent = this._fmtTs(entry.ts);

        const lvl = document.createElement("span");
        lvl.className = "ne-console-level ne-console-level-" + entry.level;
        lvl.textContent = entry.level;

        const src = document.createElement("span");
        src.className = "ne-console-source";
        src.textContent = entry.source;

        const msg = document.createElement("span");
        msg.className = "ne-console-msg";
        msg.textContent = entry.message;

        row.appendChild(ts);
        row.appendChild(lvl);
        row.appendChild(src);
        row.appendChild(msg);
        this._bodyEl.appendChild(row);
        this._rowCount++;

        while (this._rowCount > this._maxRows) {
            const first = this._bodyEl.firstChild;
            if (!first) break;
            this._bodyEl.removeChild(first);
            this._rowCount--;
        }

        // Auto-scroll only when the user is already at the bottom.
        const nearBottom = this._bodyEl.scrollHeight - this._bodyEl.scrollTop - this._bodyEl.clientHeight < 40;
        if (nearBottom) this._bodyEl.scrollTop = this._bodyEl.scrollHeight;
    }

    private _fmtTs(ms: number): string {
        const d = new Date(ms);
        const hh  = String(d.getHours()).padStart(2, "0");
        const mm  = String(d.getMinutes()).padStart(2, "0");
        const ss  = String(d.getSeconds()).padStart(2, "0");
        const mss = String(d.getMilliseconds()).padStart(3, "0");
        return hh + ":" + mm + ":" + ss + "." + mss;
    }
}
