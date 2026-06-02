import type { IPlugin, IPluginContext } from "spikypanda-nodeeditor";
import { Rk4SolverNode, createRk4SolverNode } from "./rk4-solver.node.js";

export { Rk4SolverNode, createRk4SolverNode };

/**
 * `Control.Sim` — simulation-infrastructure nodes.
 *
 *   rk4-solver   marker for the RK4 Cash-Karp adaptive integrator
 *                (F3 of sim-framework-api-v2). Discovers IIntegrable
 *                leaves at session reset and attaches an
 *                `RK4AdaptiveSolver` to the session. Drives the
 *                integration phase of every `run(t)` BEFORE the
 *                dispatch phase fires its first node — so leaves with
 *                state (DC motor, BLDC, ...) see already-updated values
 *                in their `fire()` and never need a `dt` input port.
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
    },
};
