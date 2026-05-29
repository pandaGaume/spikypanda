import { EditorFactory, IEditor } from "../editor-registry";

/**
 * Generic N-component vector editor factory builder. Renders one
 * number input per axis, refreshes from model.onPropertyChanged
 * (if available), writes back by reconstructing a new instance with
 * model[propertyName].constructor so the model's setter fires (a plain
 * mutation of the existing instance would bypass the setter and skip
 * the notification).
 *
 * The factory is kind-agnostic: vector3, vector4, quaternion and any
 * future arity all share this implementation; only the axes list
 * (and therefore the kind name) differ.
 */
function buildVectorFactory(axes: ReadonlyArray<string>): EditorFactory {
    return (host, model, propertyName, _options, editable): IEditor => {
        if (!propertyName) {
            // Defensive: per-property editors require a propertyName.
            // Class-level invocations land here with undefined and are
            // out of scope for a vector input widget.
            return { dispose: () => {} };
        }

        // Decorator options live on _options as a Record. We pick up
        // `unit` to mirror the number editor's behaviour: editables
        // tagged with @editable("vector3", { unit: "m/s²" }) get a
        // trailing greyed-out unit span after the last component.
        const opts = (_options ?? {}) as { unit?: string };

        const wrap = document.createElement("div");
        wrap.style.cssText = "display:flex;gap:4px;align-items:center;width:100%;";
        const inputs: Record<string, HTMLInputElement> = {};

        const getter = () => (model as Record<string, Record<string, number>>)[propertyName];

        for (const axis of axes) {
            const group = document.createElement("label");
            group.style.cssText = "display:flex;flex-direction:column;align-items:flex-start;font-size:0.62em;color:var(--ne-color-text-muted);gap:2px;flex:1;";
            group.textContent = axis.toUpperCase();
            const input = document.createElement("input");
            input.type = "number";
            input.step = "0.1";
            input.style.cssText = "width:100%;font-size:0.82em;padding:2px 4px;";
            input.value = String(getter()[axis] ?? 0);
            input.readOnly = editable === false;
            input.addEventListener("input", () => {
                const cur = getter();
                // cur.constructor types as Function; cast through unknown
                // to construct a fresh instance with the same arity. We
                // reconstruct rather than mutating cur in place because
                // the model's setter only fires onPropertyChanged on
                // reference change, not field mutation.
                const Ctor = cur.constructor as unknown as new (...args: number[]) => unknown;
                const args = axes.map((k) => (k === axis ? Number(input.value) : cur[k]));
                (model as Record<string, unknown>)[propertyName] = new Ctor(...args);
            });
            group.appendChild(input);
            wrap.appendChild(group);
            inputs[axis] = input;
        }

        if (opts.unit) {
            const unit = document.createElement("span");
            unit.textContent = opts.unit;
            // Same approach as the number editor: ellipsis-truncated
            // inline with a hover title for the full text, so long
            // unit strings can't push the vector components off-screen.
            unit.title = opts.unit;
            unit.style.cssText =
                "flex:0 1 auto;max-width:30%;overflow:hidden;text-overflow:ellipsis;"
                + "white-space:nowrap;font-size:0.7em;color:var(--ne-color-text-muted);";
            wrap.appendChild(unit);
        }

        host.appendChild(wrap);

        const refresh = () => {
            const v = getter();
            for (const axis of axes) {
                if (document.activeElement !== inputs[axis]) {
                    inputs[axis].value = String(v[axis] ?? 0);
                }
            }
        };
        refresh();

        let sub: { dispose(): void } | null = null;
        const candidate = model as { onPropertyChanged?: { add(cb: (args: { propertyName?: string }) => void): { dispose(): void } | null } };
        if (candidate.onPropertyChanged && typeof candidate.onPropertyChanged.add === "function") {
            sub = candidate.onPropertyChanged.add((args) => {
                if (args && args.propertyName === propertyName) refresh();
            });
        }

        return {
            dispose: () => {
                if (sub) sub.dispose();
                host.removeChild(wrap);
            },
        };
    };
}

/** Built-in editor for x/y/z component vectors (Cartesian3). */
export const vector3Editor: EditorFactory = buildVectorFactory(["x", "y", "z"]);

/** Built-in editor for x/y/z/w component vectors (Cartesian4). */
export const vector4Editor: EditorFactory = buildVectorFactory(["x", "y", "z", "w"]);

/** Built-in editor for quaternions (x/y/z/w). Structurally identical
 *  to vector4 but kept as a distinct kind for semantic clarity in
 *  decorators and registry lookups. */
export const quaternionEditor: EditorFactory = buildVectorFactory(["x", "y", "z", "w"]);
