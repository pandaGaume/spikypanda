/**
 * A skin is a flat map from CSS custom-property name to value. Keys
 * follow the editor's token contract (e.g. "--ne-color-primary",
 * "--ne-color-surface"); values are valid CSS strings for that token.
 *
 * Skins do not need to define every token: any missing key falls back
 * to the default declared in the editor's .ne-editor { ... } rule
 * block, so a minimal skin may override just a single color.
 */
export type Skin = Readonly<Record<string, string>>;

/**
 * Per-NodeEditor registry of named skins. Apps populate it at startup
 * (built-in skins like "dark", "light", "helios" are pre-registered by
 * NodeEditor) and switch via NodeEditor.setSkin(name). register() is
 * "last wins" on collision, same semantics as the EditorRegistry; use
 * has() before register() to detect overrides.
 */
export class SkinRegistry {
    private readonly _skins = new Map<string, Skin>();

    public register(name: string, skin: Skin): void {
        this._skins.set(name, skin);
    }

    public unregister(name: string): boolean {
        return this._skins.delete(name);
    }

    public getSkin(name: string): Skin | undefined {
        return this._skins.get(name);
    }

    public has(name: string): boolean {
        return this._skins.has(name);
    }

    public names(): ReadonlyArray<string> {
        return Array.from(this._skins.keys());
    }
}
