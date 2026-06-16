import { createSimGraphNode } from "spikypanda-core";
import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";

/**
 * `Sim.Graph` sub-plugin — fractal sub-graph container.
 *
 * Hosts a single palette entry, `Sim.Graph:graph`, that wraps an
 * inner RuntimeGraph + Session via `IGraphNodeState`. The class lives
 * in `core/src/sim/sim-graph.node.ts`; we surface it here under a
 * dedicated sub-plugin (rather than tucking it inside `Control.Sim`)
 * so the manifest entry and the runtime activation match — the loader
 * walks the manifest's sub-plugin list and looks each id up in the
 * plugin's `subPlugins` map; the two MUST be in sync for the palette
 * to populate.
 *
 * The Sim.Graph node could eventually live in its own dedicated
 * plugin package (`@spikypanda/plugin-sim`) once we have more sim-
 * infrastructure nodes (rate-divider already in plugin-logic, a future
 * rate-group, hierarchical scheduler markers, etc.). For V1 we bundle
 * it with control so it ships alongside the Cash-Karp RK4 solver — the
 * two are typically wired together (a Sim.Graph's Scene references the
 * solver).
 */
export const simGraphSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Sim.Graph:graph", () => createSimGraphNode() as never, {
            label: "Sub-graph",
            category: "Sim.Graph",
            docPath: ctx.assetUrl("docs/control/sim-graph/sim-graph.md"),
            // Single config-link input: the SceneItem this sub-graph
            // binds to. Dashed cable rendered automatically because
            // the type belongs to the config-link family (P5a). At
            // session bind, the editor writes the resolved SceneItem's
            // ID into `sceneItemId`, then the SimGraphNode's reset()
            // asks the SceneBindingResolver for the live view +
            // solvers. The remaining variadic data-side I/O is grown
            // by the user INSIDE the sub-graph canvas (drill-down via
            // double-click on the node).
            // scene_in: the SceneItem this sub-graph binds to (config
            // link). local: the sub-graph's pose within its enclosing
            // scene (matrix44); a Sim.Graph is itself a world object.
            // The parent frame is the enclosing scene, inherited through
            // the fractal nesting, so there is no `parent_world` port.
            // world: the composed pose, for outer consumers / nesting.
            inputPorts: [
                { slot: "scene_in", optional: true, type: "scene" },
                { slot: "local", optional: true, type: "matrix44" },
            ],
            outputPorts: [{ slot: "world", optional: false, type: "matrix44" }],
        });
    },
};
