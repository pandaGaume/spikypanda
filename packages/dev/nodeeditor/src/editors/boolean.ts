import { EditorFactory, IEditor } from "../editor-registry";

interface IBooleanOptions {
    readonly unit?: string;
}

/**
 * Built-in editor for boolean properties: a checkbox row.
 *
 * Every `@editable("boolean")` field used to be SILENTLY dropped by the
 * property panel because no "boolean" factory was registered (the
 * built-ins covered number / string / vectors only). That hid knobs
 * like the line plot's `yAuto`, the waterfall's `dbScale` or the
 * transpose node's `add_batch_dim` from the panel entirely.
 *
 * Refreshes from model.onPropertyChanged when present, so programmatic
 * mutations (deserialization, sibling-field side effects such as
 * `yMin`/`yMax` flipping `yAuto` off) keep the checkbox in sync.
 */
export const booleanEditor: EditorFactory = (host, model, propertyName, options, editable): IEditor => {
    if (!propertyName) return { dispose: () => {} };

    const opts = options && typeof options === "object" ? (options as IBooleanOptions) : {};
    const readOnly = editable === false;

    const wrap = document.createElement("label");
    wrap.style.cssText = "display:flex;align-items:center;gap:6px;width:100%;cursor:pointer;";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.disabled = readOnly;
    input.checked = Boolean((model as Record<string, unknown>)[propertyName]);
    input.style.cssText = "margin:0;";
    input.addEventListener("change", () => {
        (model as Record<string, unknown>)[propertyName] = input.checked;
    });
    wrap.appendChild(input);

    if (opts.unit) {
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
            input.checked = Boolean((model as Record<string, unknown>)[propertyName]);
        });
    }

    return {
        dispose: (): void => {
            if (sub) sub.dispose();
            if (wrap.parentNode === host) host.removeChild(wrap);
        },
    };
};
