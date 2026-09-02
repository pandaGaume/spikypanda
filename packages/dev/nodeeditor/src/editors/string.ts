import { unitSymbol, type IFieldOptions } from "spikypanda-core";
import { EditorFactory, IEditor } from "../editor-registry";

/**
 * Built-in editor for scalar string properties.
 *
 * An `@editable` that declares `enum` renders as a `<select>` dropdown;
 * anything else is a plain `<input type="text">`.
 *
 * The dropdown used to be recovered by parsing a pipe-separated legend out
 * of the `unit` string, `"linear | dB"` being a set of admissible values
 * wearing a unit's clothes for want of a field to hold it. `enum` is that
 * field, so the parsing is gone and the declaration says what it means.
 *
 * Refreshes from model.onPropertyChanged when present, so a
 * programmatic mutation (deserialization, sibling field side effect)
 * keeps the widget in sync without a manual repaint.
 */
export const stringEditor: EditorFactory = (host, model, propertyName, options, editable): IEditor => {
    if (!propertyName) return { dispose: () => {} };

    const opts = options && typeof options === "object" ? (options as IFieldOptions) : {};
    const choices = _resolveChoices(opts);
    const readOnly = editable === false;

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;flex-direction:column;gap:2px;width:100%;";

    let input: HTMLInputElement | HTMLSelectElement;
    if (choices && choices.length > 0) {
        // Dropdown: enum-style field. Whatever the current value, also
        // include it as an option even if it isn't in `choices` so a
        // legacy graph with an outdated enum value still shows it (the
        // user can then pick a valid one to upgrade).
        const select = document.createElement("select");
        select.disabled = readOnly;
        select.style.cssText = "width:100%;font-size:0.82em;padding:2px 4px;background:var(--ne-color-input-bg,#222);color:var(--ne-color-text,#ddd);border:1px solid var(--ne-color-border,#444);";
        const current = String((model as Record<string, unknown>)[propertyName] ?? "");
        const seen = new Set<string>();
        for (const c of choices) {
            const opt = document.createElement("option");
            opt.value = c;
            opt.textContent = c;
            select.appendChild(opt);
            seen.add(c);
        }
        if (current && !seen.has(current)) {
            const opt = document.createElement("option");
            opt.value = current;
            opt.textContent = current + " (legacy)";
            select.appendChild(opt);
        }
        select.value = current;
        select.addEventListener("change", () => {
            (model as Record<string, unknown>)[propertyName] = select.value;
        });
        input = select;
    } else {
        const text = document.createElement("input");
        text.type = "text";
        text.readOnly = readOnly;
        if (opts.placeholder) text.placeholder = opts.placeholder;
        text.value = String((model as Record<string, unknown>)[propertyName] ?? "");
        text.style.cssText = "width:100%;font-size:0.82em;padding:2px 4px;";
        text.addEventListener("input", () => {
            (model as Record<string, unknown>)[propertyName] = text.value;
        });
        input = text;
    }
    wrap.appendChild(input);

    // Caption row: when the unit isn't being used as a choices source
    // (i.e. plain text mode AND a unit is set), show it as a small hint
    // below the input. For dropdowns the unit IS the choices legend, so
    // there's no point repeating it.
    const caption = unitSymbol(opts.unit);
    if (caption && !choices) {
        const unit = document.createElement("span");
        unit.textContent = caption;
        unit.title = caption;
        unit.style.cssText = "font-size:0.7em;color:var(--ne-color-text-muted);white-space:normal;word-break:break-word;line-height:1.3;";
        wrap.appendChild(unit);
    }

    host.appendChild(wrap);

    let sub: { dispose(): void } | null = null;
    const candidate = model as { onPropertyChanged?: { add(cb: (args: { propertyName?: string }) => void): { dispose(): void } | null } };
    if (candidate.onPropertyChanged && typeof candidate.onPropertyChanged.add === "function") {
        sub = candidate.onPropertyChanged.add((args) => {
            if (!args || args.propertyName !== propertyName) return;
            if (document.activeElement === input) return;
            const v = String((model as Record<string, unknown>)[propertyName] ?? "");
            input.value = v;
        });
    }

    return {
        dispose: (): void => {
            if (sub) sub.dispose();
            if (wrap.parentNode === host) host.removeChild(wrap);
        },
    };
};

/**
 * The admissible values the dropdown should show, or null for a text input.
 *
 * Titles win over raw values when both are declared and aligned, so a coded
 * enumeration reads as words. The value written back is still the raw one,
 * resolved positionally by the caller.
 */
function _resolveChoices(opts: IFieldOptions): ReadonlyArray<string> | null {
    const values = opts.enum;
    if (!Array.isArray(values) || values.length === 0) return null;
    return values.map(String);
}
