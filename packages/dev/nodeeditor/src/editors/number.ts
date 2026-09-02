import { unitSymbol, type IFieldOptions } from "spikypanda-core";
import { EditorFactory, IEditor } from "../editor-registry";

/**
 * Legend for a numerically coded enumeration, e.g. "0=hann 1=hamming".
 *
 * These used to live in the `unit` string, which is where the panel's
 * two-row layout comes from: a legend is far too long to sit inline next to
 * an input. Now that they are declared as `enum` + `enumTitles`, the legend
 * is rebuilt for display instead of being authored as prose.
 */
function enumLegend(opts: IFieldOptions): string | undefined {
    const values = opts.enum;
    const titles = opts.enumTitles;
    if (!values || values.length === 0) return undefined;
    if (!titles || titles.length !== values.length) return values.join(" | ");
    return values.map((v, i) => `${v}=${titles[i]}`).join(" ");
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

    const opts = options && typeof options === "object" ? (options as IFieldOptions) : {};
    // The caption is the unit symbol when there is one, and the enumeration
    // legend otherwise. Never both: a coded enumeration has no unit.
    const caption = unitSymbol(opts.unit) ?? enumLegend(opts);

    // Layout modulationStrategy: short unit strings (≤ 8 chars, e.g. "K", "Hz",
    // "samples") stay inline next to the input — compact, scans well.
    // Longer descriptive units (enum legends like "0=hann 1=hamm ...")
    // wrap to a second row BELOW the input as a caption — keeps the
    // input full-width and the legend readable instead of squeezing
    // both into one line.
    const unitInline = !caption || caption.length <= 8;

    const wrap = document.createElement("div");
    wrap.style.cssText = unitInline ? "display:flex;align-items:center;gap:6px;width:100%;" : "display:flex;flex-direction:column;gap:2px;width:100%;";

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

    if (caption) {
        const unit = document.createElement("span");
        unit.textContent = caption;
        // Title (tooltip) carries the full text in case truncation
        // hides part of it on narrow panels.
        unit.title = caption;
        if (unitInline) {
            // Inline + truncatable: ellipsis when the panel is narrow,
            // hover for the full text. max-width caps at 60% of the
            // row so the input gets at least 40% real estate.
            unit.style.cssText = "flex:0 1 auto;max-width:60%;overflow:hidden;text-overflow:ellipsis;" + "white-space:nowrap;font-size:0.7em;color:var(--ne-color-text-muted);";
            row.appendChild(unit);
            wrap.appendChild(row);
        } else {
            // Caption row below the input. Full-width, can wrap.
            unit.style.cssText = "font-size:0.7em;color:var(--ne-color-text-muted);" + "white-space:normal;word-break:break-word;line-height:1.3;";
            wrap.appendChild(row);
            wrap.appendChild(unit);
        }
    } else {
        wrap.appendChild(row);
    }

    host.appendChild(wrap);

    // rAF-coalesced refresh: at high sim rates (audio / RF, ≥ 100 kHz)
    // a single @viewable can fire onPropertyChanged 1 M+ times per wall
    // second. Setting input.value that often plus the unavoidable
    // String() coercion saturates the main thread and triggers
    // multi-second forced reflows. We buffer the latest value into
    // `pendingValue`, schedule one rAF if none is in flight, and write
    // to the input exactly once per animation frame — capping the UI
    // refresh at ~60 Hz no matter how fast the underlying field
    // changes. Cheap, deterministic, no editable knob to mistune.
    let pendingValue: number | null = null;
    let rafId: number | null = null;
    const flush = (): void => {
        rafId = null;
        if (pendingValue === null) return;
        // Re-check focus AT FLUSH time so a click on the input that
        // landed between notification and rAF doesn't clobber the
        // user's keystrokes with a stale value.
        if (document.activeElement !== input) {
            input.value = String(pendingValue);
        }
        pendingValue = null;
    };
    let sub: { dispose(): void } | null = null;
    const candidate = model as { onPropertyChanged?: { add(cb: (args: { propertyName?: string }) => void): { dispose(): void } | null } };
    if (candidate.onPropertyChanged && typeof candidate.onPropertyChanged.add === "function") {
        sub = candidate.onPropertyChanged.add((args) => {
            if (!args || args.propertyName !== propertyName) return;
            if (document.activeElement === input) return;
            // Capture the value LAZILY: only call getter() when we
            // actually intend to refresh. notifyPropertyChanged carries
            // the new value in args but its type is `unknown` here, so
            // we keep the canonical getter path for type safety. The
            // getter cost itself is negligible vs. the avoided
            // String + DOM write.
            pendingValue = getter();
            if (rafId === null) rafId = requestAnimationFrame(flush);
        });
    }

    return {
        dispose: (): void => {
            if (rafId !== null) cancelAnimationFrame(rafId);
            if (sub) sub.dispose();
            if (wrap.parentNode === host) host.removeChild(wrap);
        },
    };
};
