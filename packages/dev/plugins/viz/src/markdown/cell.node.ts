import { marked } from "marked";
import {
    cloneable, editable,
    IDeclaresPorts, IOlink, IPortDescriptor,
    ISession, RuntimeNode,
} from "spikypanda-core";
import type { ICartesian, Nullable } from "spikypanda-core";
import type { IRenderable } from "spikypanda-nodeeditor";

/**
 * Jupyter-style Markdown notebook cell rendered as a Dashboard tile.
 *
 * Purpose: auto-documented research notebooks. The user drops a
 * Viz.Markdown:cell next to their viz tiles, types prose / equations /
 * conclusions in Markdown, and the cell renders inline alongside the
 * live charts. A saved graph round-trips the text verbatim, so the
 * dashboard becomes a self-contained lab notebook with both the data
 * pipeline and the human commentary in one file.
 *
 * UX:
 *   - Default mode is "view": `marked.parse(content)` is dropped into
 *     the tile body as HTML.
 *   - Double-clicking the body switches to "edit": a plain `<textarea>`
 *     replaces the rendered HTML, focused and pre-filled with `content`.
 *   - Blur OR Esc commits the textarea's value back to `content` and
 *     switches back to "view". Ctrl+Enter does the same (matches
 *     Jupyter's "execute the cell" muscle memory).
 *   - While the runner is playing the cell is view-only (Jupyter-style:
 *     prose is documentation, not a live control). If play starts mid-
 *     edit the textarea auto-commits and reverts to rendered view. The
 *     "currently playing" signal comes from `session.running` — a flag
 *     the GraphRunner flips on play/pause/stop. The cell stashes the
 *     session reference on the first fire() of each session lifetime
 *     and reads `running` directly at click time. No timestamps, no
 *     polling: the Session is the source of truth.
 *   - The `locked` editable forces view-only even when idle. Use it on
 *     a presentation graph where the cell must stay frozen.
 *
 * Library choice (V1 minimal):
 *   - `marked` (~30 KB minified) for Markdown → HTML. CommonMark-ish,
 *     fast, zero deps, well-maintained.
 *   - Plain `<textarea>` for the editor. No syntax highlighting, no
 *     toolbar — the V2 upgrade path is CodeMirror or EasyMDE if/when
 *     the prose volume justifies the bundle cost.
 *
 * Ports: none. Markdown cells are pure documentation — they don't
 * consume or emit graph data. The node still receives normal `fire()`
 * calls (no-op) so the runtime lifecycle stays uniform across tiles.
 *
 * Persistence: `content` and `locked` are both @cloneable so they
 * round-trip via GraphItem.serialize/deserialize. The `mode` (view vs
 * edit) is intentionally NOT persisted — it's a UI-level toggle, and
 * a freshly loaded graph should always start in "view" so the user
 * sees rendered prose first.
 */

const DEFAULT_CONTENT =
    "# Notes\n\n" +
    "Double-click to edit.\n\n" +
    "Supports **Markdown**: lists, `code`, [links](https://example.com), and equations.";

type CellMode = "view" | "edit";

export class MarkdownCellNode extends RuntimeNode implements IDeclaresPorts, IRenderable {
    public readonly renderableType = "Viz.Markdown:cell";

    public readonly inputPorts:  ReadonlyArray<IPortDescriptor> = [];
    public readonly outputPorts: ReadonlyArray<IPortDescriptor> = [];

    // ── Editables ──────────────────────────────────────────────────────
    // `content` is intentionally NOT exposed via @editable: the property
    // panel only ships a single-line <input type="text"> for strings,
    // which would mangle multi-line Markdown. The user edits in-place
    // via the tile body's textarea (double-click). The @cloneable tag
    // alone is enough for serialize/deserialize round-trip.
    @cloneable private _content: string = DEFAULT_CONTENT;

    @cloneable private _locked: boolean = false;

    @editable("boolean") public get locked(): boolean { return this._locked; }
    public set locked(v: boolean) {
        this.setField("locked", this._locked, v, (n) => {
            this._locked = n;
            // If we were mid-edit when the user just locked the cell,
            // commit and exit edit mode so the lock takes effect now
            // rather than after the next user gesture.
            if (n && this._mode === "edit") this._commitAndView();
        });
    }

    // ── Mount state (not persisted) ────────────────────────────────────
    private _host: HTMLElement | null = null;
    private _mode: CellMode = "view";
    private _viewEl: HTMLDivElement | null = null;
    private _editEl: HTMLTextAreaElement | null = null;
    private _onDblClick: ((e: MouseEvent) => void) | null = null;
    private _onKeyDown: ((e: KeyboardEvent) => void) | null = null;
    private _onBlur: (() => void) | null = null;

    /**
     * Stashed session reference. Captured on the first `fire()` of
     * each session lifetime and cleared on `reset()` (the runner calls
     * reset before tearing the session down on stop). The cell reads
     * `_session.running` at click time to decide whether to allow
     * editing — no timestamps, no event subscriptions.
     */
    private _session: ISession | null = null;

    public constructor(
        onsc: Nullable<IOlink[]> = null,
        opsc: Nullable<IOlink[]> = null,
        position?: ICartesian,
    ) { super(onsc, opsc, position); }

    // ── Runtime lifecycle ──────────────────────────────────────────────
    // No data flow: fire/reset are no-ops. Implemented explicitly so
    // future hooks (e.g. computed-from-input templates) have a place to
    // land without changing the IRenderable contract.

    public override reset(_session: ISession): void {
        // Drop the session reference on reset (called by the runner on
        // stop before tearing the session down). Leaving a stale ref
        // around is harmless since `session.running` would be false,
        // but clearing it makes the intent explicit.
        this._session = null;
    }

    public override fire(session: ISession, _t: number): void {
        // Stash the session on first fire of each lifetime. Re-stash
        // unconditionally so a runner that swaps sessions (e.g. rebuild
        // after topology edit) hands us the new one without a reset.
        // If play just started while the user was mid-edit, commit
        // their work and revert to view — `session.running` is true at
        // this point, so the next click would refuse anyway, and we
        // don't want a textarea hanging open behind the rendered prose.
        const wasIdle = !this._session;
        this._session = session;
        if (wasIdle && session.running && this._mode === "edit") {
            this._commitAndView();
        }
    }

    /**
     * True when the GraphRunner is currently playing the graph this
     * cell belongs to. Reads the host-owned flag straight off the
     * Session — no timestamps, no polling, no event plumbing.
     */
    private _isRunnerActive(): boolean {
        return this._session !== null && this._session.running;
    }

    // ── IRenderable ────────────────────────────────────────────────────

    public mountInto(host: HTMLElement): void {
        this._host = host;
        host.classList.add("ne-md-cell");
        // Defensive: tile body should already be empty, but a previous
        // unmount race could leave stale nodes. Clear before re-render.
        host.replaceChildren();
        this._renderView();
    }

    public unmountFrom(host: HTMLElement): void {
        // If the user navigates away mid-edit, save their work — losing
        // prose to a tile remount would be a bad surprise.
        if (this._mode === "edit") this._commitEdit();
        this._teardownListeners();
        host.classList.remove("ne-md-cell");
        host.replaceChildren();
        this._host = null;
        this._viewEl = null;
        this._editEl = null;
    }

    /**
     * Markdown cells don't animate. The render is fully driven by user
     * gestures (double-click, blur) and by content/locked setters; the
     * 60 fps rAF loop has nothing to do here. Cheap no-op so the
     * Dashboard's tile loop can stay uniform.
     */
    public repaint(): void { /* no animation */ }

    public onResize(_width: number, _height: number): void {
        // CSS handles flow (the textarea + rendered HTML both use
        // 100%/auto). No layout work needed on resize.
    }

    // ── Internals ──────────────────────────────────────────────────────

    private _renderView(): void {
        if (!this._host) return;
        this._teardownListeners();
        this._mode = "view";

        const view = document.createElement("div");
        view.className = "ne-md-cell-view";
        // `marked.parse` is synchronous when called without async config;
        // we cast to string to satisfy the public overload that returns
        // string | Promise<string>.
        view.innerHTML = marked.parse(this._content) as string;
        this._host.replaceChildren(view);
        this._viewEl = view;

        // Wire the dblclick listener unconditionally — `_switchToEdit`
        // re-checks the lock/runner-active gates at click time. Wiring
        // here instead of at render time means a Pause click correctly
        // unlocks editing without a re-render (the listener is already
        // attached; it just stops being blocked at the gate).
        this._onDblClick = () => this._switchToEdit();
        view.addEventListener("dblclick", this._onDblClick);
    }

    private _switchToEdit(): void {
        if (!this._host) return;
        // Three gates, evaluated at click time so a Pause click can
        // unlock the cell without re-rendering:
        //   1. `_locked`        explicit user-set "presentation mode"
        //   2. runner active    Jupyter-style view-only during playback
        // Either blocks edit silently. We don't surface a toast/log —
        // the visual cue (no cursor change, no textarea) is enough.
        if (this._locked || this._isRunnerActive()) return;
        this._teardownListeners();
        this._mode = "edit";

        const ta = document.createElement("textarea");
        ta.className = "ne-md-cell-edit";
        ta.value = this._content;
        ta.spellcheck = false;
        this._host.replaceChildren(ta);
        this._editEl = ta;
        ta.focus();
        // Place caret at end so the user can append without an extra
        // click. Setting selectionStart on a freshly focused element is
        // safe across browsers.
        const len = ta.value.length;
        try { ta.setSelectionRange(len, len); } catch { /* ignore */ }

        // Blur commits — covers "click outside the tile", "Tab away",
        // and "click the property panel". Esc cancels the gesture by
        // committing the existing content (we don't model a separate
        // "revert" state to keep the UX one-mental-model deep).
        this._onBlur = () => this._commitAndView();
        ta.addEventListener("blur", this._onBlur);

        this._onKeyDown = (e: KeyboardEvent): void => {
            if (e.key === "Escape" || (e.key === "Enter" && (e.ctrlKey || e.metaKey))) {
                e.preventDefault();
                this._commitAndView();
            }
        };
        ta.addEventListener("keydown", this._onKeyDown);
    }

    private _commitAndView(): void {
        this._commitEdit();
        this._renderView();
    }

    /** Pull the textarea value into `_content`. Idempotent / safe to
     *  call when not in edit mode (no-op). */
    private _commitEdit(): void {
        if (this._mode !== "edit" || !this._editEl) return;
        const next = this._editEl.value;
        if (next === this._content) return;
        // Route through setField so onPropertyChanged fires (so the
        // GraphItem dirty-flag flips and a subsequent save() captures
        // the new content). Pass a no-op writer arg name for clarity.
        this.setField("content", this._content, next, (n) => { this._content = n; });
    }

    private _teardownListeners(): void {
        if (this._viewEl && this._onDblClick) {
            this._viewEl.removeEventListener("dblclick", this._onDblClick);
        }
        if (this._editEl) {
            if (this._onBlur)    this._editEl.removeEventListener("blur",    this._onBlur);
            if (this._onKeyDown) this._editEl.removeEventListener("keydown", this._onKeyDown);
        }
        this._onDblClick = null;
        this._onBlur = null;
        this._onKeyDown = null;
    }
}

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createMarkdownCellNode(): MarkdownCellNode {
    return new MarkdownCellNode();
}

// ─────────────────────────────────────────────────────────────────────
// Minimal styling injected once on first import. Keeps the plugin a
// single self-contained .js bundle (no separate .css to ship). Styles
// are scoped to .ne-md-cell so they cannot leak into other tiles.
// ─────────────────────────────────────────────────────────────────────

const CELL_CSS = `
.ne-md-cell { width: 100%; height: 100%; overflow: hidden; box-sizing: border-box; }
.ne-md-cell-view {
    width: 100%; height: 100%; overflow: auto; padding: 8px 12px;
    box-sizing: border-box; color: #D8D8E0; font: 13px/1.5 -apple-system, "Segoe UI", sans-serif;
    cursor: text;
}
.ne-md-cell-view h1, .ne-md-cell-view h2, .ne-md-cell-view h3 { color: #FFFFFF; margin: 0.4em 0 0.3em; }
.ne-md-cell-view h1 { font-size: 1.4em; }
.ne-md-cell-view h2 { font-size: 1.2em; }
.ne-md-cell-view h3 { font-size: 1.05em; }
.ne-md-cell-view p { margin: 0.4em 0; }
.ne-md-cell-view a { color: #E8762D; }
.ne-md-cell-view code {
    background: #2A2A36; padding: 1px 5px; border-radius: 3px;
    font: 12px ui-monospace, Consolas, monospace;
}
.ne-md-cell-view pre {
    background: #1E1E28; padding: 8px 10px; border-radius: 4px; overflow: auto;
}
.ne-md-cell-view pre code { background: transparent; padding: 0; }
.ne-md-cell-view ul, .ne-md-cell-view ol { margin: 0.3em 0 0.3em 1.4em; padding: 0; }
.ne-md-cell-view blockquote {
    margin: 0.4em 0; padding: 4px 10px; border-left: 3px solid #E8762D;
    color: #B0B0B8; background: rgba(232, 118, 45, 0.06);
}
.ne-md-cell-edit {
    width: 100%; height: 100%; box-sizing: border-box; resize: none; border: none;
    padding: 8px 12px; background: #1E1E28; color: #E8E8F0;
    font: 12px/1.5 ui-monospace, Consolas, monospace; outline: 1px solid #E8762D;
}
`;

if (typeof document !== "undefined") {
    const tag = "ne-md-cell-styles";
    if (!document.getElementById(tag)) {
        const style = document.createElement("style");
        style.id = tag;
        style.textContent = CELL_CSS;
        document.head.appendChild(style);
    }
}
