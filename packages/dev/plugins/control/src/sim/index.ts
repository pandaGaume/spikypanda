import { createSimGraphNode } from "spikypanda-core";
import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { Rk4SolverNode, createRk4SolverNode } from "./rk4-solver.node.js";

export { Rk4SolverNode, createRk4SolverNode };

/**
 * `Control.Sim` — simulation-infrastructure nodes.
 *
 *   rk4-solver   marker for the RK4 Cash-Karp adaptive integrator
 *                (F3 of sim-framework-api-v2). Discovers IIntegrable
 *                leaves at session reset and attaches an
 *                `RK4AdaptiveSolver` to the session.
 *
 * `Sim.Graph:graph` is registered alongside as the fractal sub-graph
 * container: it wraps a RuntimeGraph + inner Session, binds itself to
 * a SceneItem via `sceneItemId`, and sub-steps the inner session at
 * `K = innerHz / parentHz` per parent fire. The class lives in
 * `core/src/sim/sim-graph.node.ts`; we surface it here because the
 * Control sub-plugin is the natural home for sim-infrastructure
 * palette entries.
 *
 * V2 (Helios sprint) adds Rosenbrock4 here for stiff chemistry.
 */
export const controlSimSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Control.Sim:rk4-solver", () => createRk4SolverNode() as never, {
            label: "RK4 Solver",
            category: "Control.Sim",
            inputPorts: [],
            outputPorts: [],
        });
        // Sim.Graph:graph is core-provided; the palette entry shows
        // its variadic IO via the inputs / outputs source-order lists
        // populated by the user when authoring the sub-graph (the
        // empty arrays below are just initial defaults).
        ctx.nodes.register("Sim.Graph:graph", () => createSimGraphNode() as never, {
            label: "Sub-graph",
            category: "Sim.Graph",
            inputPorts: [],
            outputPorts: [],
        });
    },
};
