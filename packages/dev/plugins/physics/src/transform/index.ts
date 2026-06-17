import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { TransformNode } from "spikypanda-core";

// TransformNode and FaultableNode are CORE primitives (every world object
// across every plugin extends them). They were promoted out of this plugin
// into `spikypanda-core`; re-exported here for the existing physics import
// sites and the sub-plugin registration below.
export { TransformNode, IDENTITY44, isMatrix44, FaultableNode, isFaultDescriptor } from "spikypanda-core";
export type { IFaultDescriptor } from "spikypanda-core";

/** Free-standing factory invoked by the sub-plugin's `activate`. */
export function createTransformNode(): TransformNode {
    return new TransformNode();
}

/**
 * `Physics.Transform` sub-plugin. Exposes a single registrable node,
 * `Physics.Transform:transform`, that composes a local pose with the
 * parent's world transform. The runtime base class it instantiates
 * (TransformNode) now lives in core and is shared by every physical
 * object that needs a world-frame position (motors, sensors, mechanical
 * bodies).
 *
 * Environmental context (gravity, T, P, atmosphere) lives on the session
 * (`ISession.sceneStateView`), populated by the enclosing Sim.Graph from a
 * wired SceneItem (see plugins/physics/src/scene). The TransformNode
 * exposes only `local` + `parent_world` here.
 */
export const transformSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Physics.Transform:transform", () => createTransformNode() as never, {
            label: "Transform",
            category: "Physics.Transform",
            docPath: ctx.assetUrl("docs/physics/transform/transform.md"),
            inputPorts: [...TransformNode.TRANSFORM_INPUT_PORTS],
            outputPorts: [...TransformNode.TRANSFORM_OUTPUT_PORTS],
        });
    },
};
