// reflect-metadata polyfills Reflect.{define,get}Metadata, used by
// core's class-level decorators (e.g. @runnableAffordance). Core has
// the same import at its barrel, but its sideEffects:false manifest
// lets webpack tree-shake the side-effect import when only specific
// named exports are pulled in. Importing here guarantees the polyfill
// lands in the nodeeditor bundle.
import "reflect-metadata";

// Bundled stylesheet. mini-css-extract-plugin pulls this out of the JS
// bundle into a sibling nodeeditor.css that embedders load via <link>.
// Side-effect import only; nothing is named-exported from this module.
import "./styles/nodeeditor.css";

export { NodeEditor } from "./editor";
export { defaultLayout } from "./auto-layout";
export type { LayoutStrategy } from "./auto-layout";
export { FileHandlerRegistry } from "./file-handler";
export type { FileHandler } from "./file-handler";
export { NodeUI } from "./node-ui";
export { Port } from "./port";
export { Connection, ConnectionPreview } from "./connection";
export { Camera } from "./camera";
export { PropertyPanel } from "./property-panel";
export { UIItemBase, isInspectable, isSerializable } from "./inspectable";
export type { Inspectable, Serializable, PropertyEntry } from "./inspectable";
export { EditorRegistry } from "./editor-registry";
export type { IEditor, EditorFactory } from "./editor-registry";
export {
    installBuiltinEditors,
    vector3Editor,
    vector4Editor,
    quaternionEditor,
} from "./editors";
export { SkinRegistry } from "./skin-registry";
export type { Skin } from "./skin-registry";
export { darkSkin }   from "./styles/skins/dark";
export { lightSkin }  from "./styles/skins/light";
export { heliosSkin } from "./styles/skins/helios";
export { transparentDarkSkin, transparentLightSkin } from "./styles/skins/transparent";

// Re-export the editor-schema authoring helpers from core so apps that
// declare their model classes against the nodeeditor bundle do not
// need a separate dependency on spikypanda-core just for decorators.
export { editor, editable, viewable, getEditorSchema } from "spikypanda-core";
export type { IEditableField, IEditorSchema } from "spikypanda-core";
export { PORT_COLORS } from "./types";
export type {
    PortDirection,
    PortType,
    PortDef,
    NodeDef,
    Vec2,
    SerializedGraph,
    SerializedNode,
    SerializedConnection,
} from "./types";
