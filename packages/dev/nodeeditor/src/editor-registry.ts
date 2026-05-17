import { IDisposable } from "spikypanda-core";

/**
 * Contract every editor instance (whole-object or per-property) honours.
 * dispose() must release any model subscription AND clear the DOM the
 * editor wrote into its host element. The editor host calls dispose()
 * on the outgoing editor before instantiating the next one, so leaks
 * here surface as growing memory and duplicated UI on tab switches.
 */
export interface IEditor extends IDisposable {}

/**
 * Factory signature an editor implementation registers under a given
 * kind. Parameters:
 *
 *   host          DOM element the editor renders into. Implementations
 *                 append their own root and remove it on dispose. The
 *                 host is owned by the editor host (panel / tab) and
 *                 should NOT be detached or emptied wholesale by the
 *                 factory.
 *   model         The model object backing this editor. Loosely typed
 *                 because the kind contract determines the expected
 *                 shape: a "vector3" factory expects { x, y, z } or a
 *                 setter chain; a "transform-3d" factory expects a
 *                 Transform; etc. Factories duck-check what they need
 *                 (including onPropertyChanged for reactive refresh).
 *   propertyName  Set when invoked for a per-property field (i.e. the
 *                 editor edits model[propertyName]); undefined for
 *                 class-level whole-object editors.
 *   options       The opaque payload passed to @editable / @viewable
 *                 at declaration time (e.g. { min, max, unit }).
 *                 Undefined for class-level editors and for fields
 *                 declared without options.
 *   editable      true for @editable fields (write-allowed), false for
 *                 @viewable fields (read-only visualisation). Undefined
 *                 for class-level editors, which infer their own field
 *                 mutability from the model. Implementations that share
 *                 a kind across both decorators check this to render an
 *                 input vs. a viewer.
 */
export type EditorFactory = (
    host: HTMLElement,
    model: object,
    propertyName?: string,
    options?: unknown,
    editable?: boolean,
) => IEditor;

/**
 * Per-NodeEditor registry mapping editor kind strings to factories.
 * Apps populate it at startup (or lazily) by calling register() for
 * each kind they ship. Consumers (PropertyPanel, custom tabs) resolve
 * a kind through getFactory() and fall back to a primitive renderer
 * when no factory is registered.
 *
 * register() overwrites silently when the same kind is registered
 * twice; "last wins" matches Map.set semantics and avoids surprising
 * the caller in plugin-overlay scenarios. Use has() before register()
 * if you need to detect collisions.
 */
export class EditorRegistry {
    private readonly _factories = new Map<string, EditorFactory>();

    public register(kind: string, factory: EditorFactory): void {
        this._factories.set(kind, factory);
    }

    public unregister(kind: string): boolean {
        return this._factories.delete(kind);
    }

    public getFactory(kind: string): EditorFactory | undefined {
        return this._factories.get(kind);
    }

    public has(kind: string): boolean {
        return this._factories.has(kind);
    }

    public kinds(): ReadonlyArray<string> {
        return Array.from(this._factories.keys());
    }
}
