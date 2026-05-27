import { EditorFactory, IEditor } from "../editor-registry";

interface ISliderOptions {
    readonly min?:  number;
    readonly max?:  number;
    readonly step?: number;
}

/**
 * Range-input editor for `@editable("slider")` fields.
 *
 * Renders a native `<input type="range">` paired with a numeric readout
 * showing the current value. The range bounds and step are sourced
 * from the @editable options first (static, decorator-supplied), then
 * from the model's own `min` / `max` / `step` properties if present
 * (dynamic, user-editable). When the model exposes those sibling
 * fields, changing them via the property panel updates the slider's
 * bounds live thanks to a per-field subscription on
 * `model.onPropertyChanged`.
 *
 * Used by `NumberSliderNode` for its `value` field; reusable for any
 * runtime node that wants a bounded scalar widget.
 */
export const sliderEditor: EditorFactory = (host, model, propertyName, options, editable): IEditor => {
    if (!propertyName) return { dispose: () => {} };

    const opts = (options && typeof options === "object") ? (options as ISliderOptions) : {};

    const wrap = document.createElement("div");
    wrap.style.cssText = "display:flex;gap:8px;align-items:center;width:100%;";

    const input = document.createElement("input");
    input.type     = "range";
    input.readOnly = editable === false;
    input.style.cssText = "flex:1;min-width:0;accent-color:var(--ne-color-primary);";

    const readout = document.createElement("span");
    readout.style.cssText =
        "font-family:var(--ne-font-mono);font-size:0.78em;min-width:48px;text-align:right;"
        + "color:var(--ne-color-text);flex-shrink:0;";

    const m = model as Record<string, unknown>;
    const numOr = (v: unknown, fallback: number): number =>
        typeof v === "number" && Number.isFinite(v) ? v : fallback;

    const resolveBounds = (): { min: number; max: number; step: number } => ({
        min:  numOr(opts.min,  numOr(m.min,  0)),
        max:  numOr(opts.max,  numOr(m.max,  1)),
        step: numOr(opts.step, numOr(m.step, 0.01)),
    });

    const fmtStep = (step: number): number => {
        // Choose readout precision based on the step magnitude so the
        // user sees `25.00` for a 0.01 slider and `25` for an int slider.
        if (step >= 1)   return 0;
        if (step >= 0.1) return 1;
        if (step >= 0.01) return 2;
        return 3;
    };

    const refreshBounds = (): void => {
        const { min, max, step } = resolveBounds();
        input.min  = String(min);
        input.max  = String(max);
        input.step = String(step);
    };
    refreshBounds();

    const refreshValue = (): void => {
        const v = numOr(m[propertyName], 0);
        if (document.activeElement !== input) {
            input.value = String(v);
        }
        const step = numOr(opts.step, numOr(m.step, 0.01));
        readout.textContent = v.toFixed(fmtStep(step));
    };
    refreshValue();

    input.addEventListener("input", () => {
        const v = Number(input.value);
        if (Number.isFinite(v)) {
            m[propertyName] = v;
            const step = numOr(opts.step, numOr(m.step, 0.01));
            readout.textContent = v.toFixed(fmtStep(step));
        }
    });

    wrap.appendChild(input);
    wrap.appendChild(readout);
    host.appendChild(wrap);

    // Subscribe so external mutations (LiveBinder, drag from a different
    // panel, programmatic set) keep the widget in sync, and so changing
    // min/max/step from sibling fields adjusts the bounds.
    let sub: { dispose(): void } | null = null;
    const candidate = model as { onPropertyChanged?: { add(cb: (args: { propertyName?: string }) => void): { dispose(): void } | null } };
    if (candidate.onPropertyChanged && typeof candidate.onPropertyChanged.add === "function") {
        sub = candidate.onPropertyChanged.add((args) => {
            if (!args) return;
            const p = args.propertyName;
            if (p === propertyName) refreshValue();
            else if (p === "min" || p === "max" || p === "step") {
                refreshBounds();
                refreshValue();
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
