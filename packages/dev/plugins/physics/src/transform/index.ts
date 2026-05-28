import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { createTransformNode, TransformNode } from "./transform.node.js";

export { TransformNode, createTransformNode, IDENTITY44, isMatrix44, mul44 } from "./transform.node.js";

export { FaultableNode, isFaultDescriptor } from "./fault.node.js";
export type { IFaultDescriptor } from "./fault.node.js";

export { DEFAULT_SCENE, isScene, SCENE_SLOT } from "./scene.js";
export type { IScene, IVec3 } from "./scene.js";

/**
 * `Physics.Transform` sub-plugin. Exposes a single registrable node,
 * `Physics.Transform:transform`, that composes a local pose with the
 * parent's world transform. Also acts as the runtime base class shared
 * by every physical object that needs a world-frame position (motors,
 * sensors, mechanical bodies).
 *
 * The node is registered so the user can drop a standalone Transform on
 * the canvas (intermediate frame, marker, debug attach-point) without
 * having to instantiate a motor or a sensor.
 */
export const transformSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        // TRANSFORM_INPUT_PORTS already includes the `scene` port; spreading
        // it gives the palette entry the full pose + env attach surface.
        ctx.nodes.register("Physics.Transform:transform", () => createTransformNode() as never, {
            label: "Transform",
            category: "Physics.Transform",
            inputPorts: [...TransformNode.TRANSFORM_INPUT_PORTS],
            outputPorts: [...TransformNode.TRANSFORM_OUTPUT_PORTS],
        });
    },
};
