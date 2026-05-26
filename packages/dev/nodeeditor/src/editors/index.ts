import { NodeEditor } from "../editor";
import { EditorRegistry } from "../editor-registry";
import { quaternionEditor, vector3Editor, vector4Editor } from "./vector";
import { numberEditor } from "./number";

export { vector3Editor, vector4Editor, quaternionEditor } from "./vector";
export { numberEditor } from "./number";

/**
 * Register every built-in editor that ships with the nodeeditor package
 * onto the given registry. The primitive kinds covered are:
 *   - "number" / "int" / "float"   scalar input
 *   - "vector3"                    x/y/z triple
 *   - "vector4" / "quaternion"     x/y/z/w quadruple
 *
 * Accepts either a NodeEditor (legacy host) or an EditorRegistry
 * directly (v2 GraphViewer-based hosts), so the call site stays the
 * same whether or not the host wraps a registry.
 */
export function installBuiltinEditors(target: NodeEditor | EditorRegistry): void {
    const registry: EditorRegistry =
        target instanceof EditorRegistry ? target : target.editors;
    registry.register("vector3",    vector3Editor);
    registry.register("vector4",    vector4Editor);
    registry.register("quaternion", quaternionEditor);
    registry.register("number",     numberEditor);
    registry.register("int",        numberEditor);
    registry.register("float",      numberEditor);
}
