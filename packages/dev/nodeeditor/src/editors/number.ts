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

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;align-items:center;gap:6px;width:100%;";

    const input = document.createElement("input");
    input.type = "number";
    input.step = opts.step != null ? String(opts.step) : "0.1";
    if (opts.min != null) input.min = String(opts.min);
    if (opts.max != null) input.max = String(opts.max);
    input.readOnly = editable === false;
    input.style.cssText = "flex:1;min-width:0;font-size:0.82em;padding:2px 4px;";

    const getter = (): number => Number((model as Record<string, unknown>)[propertyName]);
    input.value = String(getter());

    input.addEventListener("input", () => {
        const v = Number(input.value);
        if (Number.isFinite(v)) {
            (model as Record<string, unknown>)[propertyName] = v;
        }
    });
    wrap.appendChild(input);

    if (opts.unit) {
        const unit = document.createElement("span");
        unit.textContent = opts.unit;
        unit.style.cssText = "flex:0 0 auto;font-size:0.7em;color:var(--ne-color-text-muted);";
        wrap.appendChild(unit);
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
