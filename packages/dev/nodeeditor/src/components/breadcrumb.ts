/**
 * Breadcrumb component for drill-down navigation in the GraphViewer.
 *
 * Renders a horizontal strip of crumbs ("Root > HabitatProcess >
 * ScrubberProcess") that mirrors the `NavigationStack` of the viewer.
 * Clicking a crumb pops the stack down to that level (the viewer's
 * `popNavigationTo()` handles the state swap). The component subscribes
 * to `stack.onChanged` so the rendering stays in sync with whatever
 * triggered the change (double-click, Esc, breadcrumb click).
 *
 * The component is intentionally plain DOM — no framework dependency,
 * so the editor stays buildable as a standalone library. Styling is
 * driven by CSS classes (`ne-breadcrumb`, `ne-breadcrumb-crumb`,
 * `ne-breadcrumb-current`, `ne-breadcrumb-separator`) so skins can
 * override the look via the same `--ne-color-*` token layer they
 * already use for cables / ports.
 */

import type { NavigationStack } from "../navigation-stack";

export class Breadcrumb {
    /** Container element. The caller mounts this anywhere they want
     *  (typically above the GraphViewer's host). */
    public readonly el: HTMLDivElement;

    private readonly stack: NavigationStack;
    private readonly _onChanged = (): void => this._render();
    /** Click handler invoked when the user picks a crumb. Receives
     *  the zero-based index of the clicked crumb (root = 0). The
     *  caller wires this to `GraphViewer.popNavigationTo(index)`. */
    public onCrumbClick: ((index: number) => void) | null = null;

    public constructor(stack: NavigationStack) {
        this.stack = stack;
        this.el = document.createElement("div");
        this.el.className = "ne-breadcrumb";
        // Hidden when at root depth (no drill-down history to display).
        // Toggled on every render so callers don't need a manual
        // visibility pass when the stack flips between 1 and >1.
        this._render();
        this.stack.onChanged = this._onChanged;
    }

    /** Tear down the DOM and unsubscribe. The viewer's dispose() path
     *  calls this on shutdown. Safe to call twice. */
    public dispose(): void {
        if (this.stack.onChanged === this._onChanged) {
            this.stack.onChanged = null;
        }
        this.el.remove();
    }

    /** Re-render the crumb strip. Called automatically on stack
     *  changes; exposed for the rare case a host wants to force a
     *  refresh (e.g. label change without depth change). */
    public refresh(): void {
        this._render();
    }

    private _render(): void {
        // Wipe and rebuild. The crumb count is small (≤ a handful in
        // realistic graphs), so we don't bother diffing.
        this.el.innerHTML = "";
        const levels = this.stack.all;
        // Hide at root depth: no drill-down active, breadcrumb adds
        // visual noise. Mounted callers can still see the empty
        // element via CSS if they really want.
        this.el.style.display = levels.length <= 1 ? "none" : "";
        for (let i = 0; i < levels.length; i++) {
            const isLast = i === levels.length - 1;
            if (i > 0) {
                const sep = document.createElement("span");
                sep.className = "ne-breadcrumb-separator";
                sep.textContent = "›";
                this.el.appendChild(sep);
            }
            const crumb = document.createElement(isLast ? "span" : "a");
            crumb.className = `ne-breadcrumb-crumb${isLast ? " ne-breadcrumb-current" : ""}`;
            crumb.textContent = levels[i].label;
            if (!isLast) {
                crumb.setAttribute("role", "button");
                (crumb as HTMLAnchorElement).href = "#";
                crumb.addEventListener("click", (e) => {
                    e.preventDefault();
                    this.onCrumbClick?.(i);
                });
            }
            this.el.appendChild(crumb);
        }
    }
}
