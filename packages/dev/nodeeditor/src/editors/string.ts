import { EditorFactory, IEditor } from "../editor-registry";

interface IStringOptions {
    readonly unit?: string;
    readonly choices?: ReadonlyArray<string>;
    readonly placeholder?: string;
}

/**
 * Built-in editor for scalar string properties.
 *
 * Convention-over-configuration: if the @editable options carry a
 * `choices` array OR the `unit` string follows the enum-legend pattern
 * (`"linear | dB"`, `"magnitude | power"`, `"line | area | bars"`), the
 * field renders as a `<select>` dropdown. Otherwise a plain text
 * `<input type="text">` is shown.
 *
 * Why the unit-pipe convention: the rest of the editable surface
 * already used `unit: "linear | dB"` as a documentation hint for enums
 * without a dedicated `choices` field. Parsing the same legend turns
 * that hint into a real interactive picker, so legacy `@editable` sites
 * (UplotSpectrumNode.fillStyle, …) become first-class dropdowns
 * without touching the decorator call.
 *
 * Refreshes from model.onPropertyChanged when present, so a
 * programmatic mutation (deserialization, sibling field side effect)
 * keeps the widget in sync without a manual repaint.
 */
export const stringEditor: EditorFactory = (host, model, propertyName, options, editable): IEditor => {
    if (!propertyName) return { dispose: () => {} };

    const opts = options && typeof options === "object" ? (options as IStringOptions) : {};
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
    if (opts.unit && !choices) {
        const unit = document.createElement("span");
        unit.textContent = opts.unit;
        unit.title = opts.unit;
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
 * Resolve the option set the dropdown should show.
 *
 * 1. Explicit `choices` array on the options object wins outright.
 * 2. `unit` strings of the form `"a | b | c"` (two or more pipe-
 *    separated tokens, each non-empty after trim) are treated as an
 *    inline enum legend and parsed into a choices array.
 * 3. Anything else (no choices + no pipe-separated unit) returns null,
 *    which makes the editor fall back to a plain text input.
 */
function _resolveChoices(opts: IStringOptions): ReadonlyArray<string> | null {
    if (Array.isArray(opts.choices) && opts.choices.length > 0) {
        return opts.choices.map(String);
    }
    if (typeof opts.unit === "string" && opts.unit.includes("|")) {
        const parts = opts.unit.split("|").map((s) => s.trim()).filter((s) => s.length > 0);
        if (parts.length >= 2) return parts;
    }
    return null;
}
