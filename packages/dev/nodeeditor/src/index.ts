// reflect-metadata polyfills Reflect.{define,get}Metadata, used by
// core's class-level decorators (e.g. @runnableAffordance). Core has
// the same import at its barrel, but its sideEffects:false manifest
// lets webpack tree-shake the side-effect import when only specific
// named exports are pulled in. Importing here guarantees the polyfill
// lands in the nodeeditor bundle.
import "reflect-metadata";

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
export { PORT_COLORS, EXPORT_PROFILES } from "./types";
export type {
    PortDirection,
    PortType,
    PortDef,
    NodeDef,
    Vec2,
    SerializedGraph,
    SerializedNode,
    SerializedConnection,
    ExportProfile,
} from "./types";
