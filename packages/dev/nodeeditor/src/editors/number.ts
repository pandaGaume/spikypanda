import { EditorFactory, IEditor } from "../editor-registry";

interface INumberOptions {
    readonly unit?: string;
    readonly step?: number;
    readonly min?: number;
    readonly max?: number;
}

/**
 * Built-in editor for scalar number / int / float properties.
 *
 * Renders an <input type="number"> bound to model[propertyName]. The
 * factory is shared by the three primitive kinds because their UI is
 * identical; an "int" field could pin step=1 via @editable options.
 *
 * Refreshes from model.onPropertyChanged when the model exposes it, so
 * external mutations (e.g. a drag-to-rotate gizmo) stay in sync with
 * the visible input value.
 */
export const numberEditor: EditorFactory = (host, model, propertyName, options, editable): IEditor => {
    if (!propertyName) return { dispose: () => {} };

    const opts = options && typeof options === "object" ? (options as INumberOptions) : {};

    // Layout strategy: short unit strings (≤ 8 chars, e.g. "K", "Hz",
    // "samples") stay inline next to the input — compact, scans well.
    // Longer descriptive units (enum legends like "0=hann 1=hamm ...")
    // wrap to a second row BELOW the input as a caption — keeps the
    // input full-width and the legend readable instead of squeezing
    // both into one line.
    const unitInline = !opts.unit || opts.unit.length <= 8;

    const wrap = document.createElement("div");
    wrap.style.cssText = unitInline
        ? "display:flex;align-items:center;gap:6px;width:100%;"
        : "display:flex;flex-direction:column;gap:2px;width:100%;";

    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;gap:6px;width:100%;";

    const input = document.createElement("input");
    input.type = "number";
    input.step = opts.step !== null && opts.step !== undefined ? String(opts.step) : "0.1";
    if (opts.min !== null && opts.min !== undefined) input.min = String(opts.min);
    if (opts.max !== null && opts.max !== undefined) input.max = String(opts.max);
    input.readOnly = editable === false;
    // min-width:60 keeps the input usable even when a long inline unit
    // takes most of the row width. The unit's max-width caps its
    // demand so it can't squeeze the input under 60 px.
    input.style.cssText = "flex:1;min-width:60px;font-size:0.82em;padding:2px 4px;";

    const getter = (): number => Number((model as Record<string, unknown>)[propertyName]);
    input.value = String(getter());

    input.addEventListener("input", () => {
        const v = Number(input.value);
        if (Number.isFinite(v)) {
            (model as Record<string, unknown>)[propertyName] = v;
        }
    });
    row.appendChild(input);

    if (opts.unit) {
        const unit = document.createElement("span");
        unit.textContent = opts.unit;
        // Title (tooltip) carries the full text in case truncation
        // hides part of it on narrow panels.
        unit.title = opts.unit;
        if (unitInline) {
            // Inline + truncatable: ellipsis when the panel is narrow,
            // hover for the full text. max-width caps at 60% of the
            // row so the input gets at least 40% real estate.
            unit.style.cssText =
                "flex:0 1 auto;max-width:60%;overflow:hidden;text-overflow:ellipsis;"
                + "white-space:nowrap;font-size:0.7em;color:var(--ne-color-text-muted);";
            row.appendChild(unit);
            wrap.appendChild(row);
        } else {
            // Caption row below the input. Full-width, can wrap.
            unit.style.cssText =
                "font-size:0.7em;color:var(--ne-color-text-muted);"
                + "white-space:normal;word-break:break-word;line-height:1.3;";
            wrap.appendChild(row);
            wrap.appendChild(unit);
        }
    } else {
        wrap.appendChild(row);
    }

    host.appendChild(wrap);

    let sub: { dispose(): void } | null = null;
    const candidate = model as { onPropertyChanged?: { add(cb: (args: { propertyName?: string }) => void): { dispose(): void } | null } };
    if (candidate.onPropertyChanged && typeof candidate.onPropertyChanged.add === "function") {
        sub = candidate.onPropertyChanged.add((args) => {
            if (args && args.propertyName === propertyName && document.activeElement !== input) {
                input.value = String(getter());
            }
        });
    }

    return {
        dispose: (): void => {
            if (sub) sub.dispose();
            if (wrap.parentNode === host) host.removeChild(wrap);
        },
    };
};
