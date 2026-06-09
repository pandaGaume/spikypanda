import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { RK4AdaptiveSolver, SOLVER_REGISTRY } from "spikypanda-core";
import { createRK4SolverItem, RK4_SOLVER_KIND, RK4SolverItem } from "./rk4-solver.item.js";

export { RK4SolverItem, createRK4SolverItem, RK4_SOLVER_KIND };

/**
 * `Control.Sim` — simulation-infrastructure descriptors + factories.
 *
 *   rk4-solver   parameter descriptor for the RK4 Cash-Karp adaptive
 *                integrator. After the 2026-06-09 refactor this is a
 *                GraphItem (not a RuntimeNode): it carries `tolerance`
 *                and `maxStep` editables, returns an `ISolverDescriptor`
 *                from `toSolverDescriptor()`, and receives a reference
 *                to the live solver instance through `bindSolver()` so
 *                diagnostic viewables stay populated.
 *
 *                The actual integrator is built by the factory function
 *                registered in `SOLVER_REGISTRY` for kind `"rk4-adaptive"`.
 *                IIntegrable leaves declare `solverKind = "rk4-adaptive"`
 *                (or omit it and inherit the default) and the
 *                attachment helper groups + instantiates.
 *
 * The Sim.Graph:graph fractal-container node lives in its own
 * sub-plugin (`simGraphSubPlugin` under `control/src/sim-graph/`).
 *
 * V2 (Helios sprint) adds a Rosenbrock4 descriptor + factory here for
 * stiff chemistry. The pattern is identical: register a kind, register
 * a factory, expose a SolverItem subclass with the relevant editables.
 */
export const controlSimSubPlugin: IPlugin = {
    activate(ctx: IPluginContext): void {
        // Register the factory for kind "rk4-adaptive" in the global
        // SOLVER_REGISTRY. Any IIntegrable leaf declaring this kind
        // (the default) gets integrated by an instance produced here.
        SOLVER_REGISTRY.register(RK4_SOLVER_KIND, {
            factory: (options, leaves) => {
                const tolerance = typeof options.tolerance === "number" ? options.tolerance : 1e-6;
                const maxStep = typeof options.maxStep === "number" ? options.maxStep : 1e-2;
                const solver = new RK4AdaptiveSolver({ tolerance, maxStep });
                solver.initialize(leaves, 0);
                return solver;
            },
            defaults: { tolerance: 1e-6, maxStep: 1e-2 },
        });

        // Register the SolverItem in the node palette. The editor's
        // session-builder excludes it from the runtime graph (no fire()).
        // The dashed `solver_out` config-link is what the user drags
        // onto a SceneItem's variadic `solver_in_<k>`. The Scene's
        // `solverItemIds` array is then populated by syncConfigLinksFromCanvas,
        // and at session bind the attachment helper reads the descriptors
        // and instantiates solvers.
        ctx.nodes.register("Control.Sim:rk4-solver", () => createRK4SolverItem() as never, {
            label: "RK4 Solver",
            category: "Control.Sim",
            inputPorts: [],
            outputPorts: [{ slot: "solver_out", optional: true, type: "solver" }],
        });
    },
};
