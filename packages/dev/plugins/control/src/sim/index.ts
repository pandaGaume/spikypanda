import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { Rk4SolverNode, createRk4SolverNode } from "./rk4-solver.node.js";

export { Rk4SolverNode, createRk4SolverNode };

/**
 * `Control.Sim` — simulation-infrastructure nodes.
 *
 *   rk4-solver   marker for the RK4 Cash-Karp adaptive integrator
 *                (F3 of sim-framework-api-v2). Discovers IIntegrable
 *                leaves at session reset and is attached to whichever
 *                Sim.Graph references its enclosing SceneItem.
 *
 * The Sim.Graph:graph fractal-container node was previously registered
 * here for convenience, but it has its own sub-plugin now
 * (`simGraphSubPlugin` in `control/src/sim-graph/`) so the manifest
 * declaration and the runtime activation stay in lock-step. Splitting
 * is required because the loader walks the manifest's sub-plugin list
 * and looks each id up in the plugin's `subPlugins` map — a manifest
 * entry without a matching subPlugins entry never activates and its
 * registrations never reach the palette.
 *
 * V2 (Helios sprint) adds Rosenbrock4 here for stiff chemistry.
 */
export const controlSimSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        ctx.nodes.register("Control.Sim:rk4-solver", () => createRk4SolverNode() as never, {
            label: "RK4 Solver",
            category: "Control.Sim",
            inputPorts: [],
            // The dashed `solver_out` config-link is what the user
            // drags onto a SceneItem's variadic `solver_in_<k>`. The
            // editor's session-builder later inspects this Connection
            // to populate the Scene's `solverItemIds` array; at run
            // time the SimGraphNode that owns the Scene reads the
            // list and attaches each solver to its inner session.
            outputPorts: [{ slot: "solver_out", optional: true, type: "solver" }],
        });
    },
};
