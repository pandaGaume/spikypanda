import { NodeEditor } from "../editor";
import { quaternionEditor, vector3Editor, vector4Editor } from "./vector";

export { vector3Editor, vector4Editor, quaternionEditor } from "./vector";

/**
 * Register every built-in editor that ships with the nodeeditor package
 * onto the given editor's registry. Apps that want the standard set
 * of primitive widgets (vector3, vector4, quaternion) call this once
 * after constructing the editor; granular installation is also
 * possible by calling editor.editors.register(kind, factory) directly
 * with the named exports.
 */
export function installBuiltinEditors(editor: NodeEditor): void {
    editor.editors.register("vector3",    vector3Editor);
    editor.editors.register("vector4",    vector4Editor);
    editor.editors.register("quaternion", quaternionEditor);
}
