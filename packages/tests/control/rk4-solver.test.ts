/**
 * Unit tests for `Control.Sim:rk4-solver` after the P4 refactor.
 *
 * The new contract:
 *   - `reset(session)` no longer self-attaches the solver. It only
 *     resets diagnostic counters.
 *   - `buildSolverFor(innerGraph)` produces a ready-to-attach
 *     `ISolverHandle` (or `null` when no leaves matched) and stores
 *     the live solver instance so `fire()` can read its `lastStep`
 *     for viewables.
 *   - `resolveOwnedLeaves(innerGraph)` exposes the leaf-filter logic
 *     so the editor's `SceneBindingResolver` can pre-flight which
 *     leaves a solver would claim before invoking `buildSolverFor`.
 */
import {
    cloneable,
    type IIntegrable,
    type IIntegrationInputs,
    type ISession,
    RuntimeGraph,
    RuntimeNode,
    Session,
} from "spikypanda-core";
import { createRk4SolverNode } from "../../dev/plugins/control/src/sim/rk4-solver.node";

// ─────────────────────────────────────────────────────────────────────
// A minimal IIntegrable test fixture
// ─────────────────────────────────────────────────────────────────────

class DummyIntegrable extends RuntimeNode implements IIntegrable {
    public readonly stateSize = 1;
    public readonly stateNames = ["x"];

    @cloneable private _x = 0;

    public gatherState(y: Float64Array, off: number): void {
        y[off] = this._x;
    }
    public writeState(y: Float64Array, off: number): void {
        this._x = y[off];
    }
    public rhs(_t: number, _y: Float64Array, _off: number, _inputs: IIntegrationInputs, dydt: Float64Array): void {
        // dx/dt = -x (exponential decay).
        dydt[_off] = -_y[_off];
    }
    public fire(_session: ISession, _t: number): void {
        /* no-op for this fixture */
    }
}

// ─────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────

describe("Rk4SolverNode after P4 refactor", () => {
    it("reset(session) does NOT auto-attach to the session", () => {
        const solverNode = createRk4SolverNode();
        const integrable = new DummyIntegrable();
        const graph = new RuntimeGraph([solverNode, integrable]);
        const session = new Session(graph);
        // The Session constructor already cascaded reset(); confirm no
        // solver was registered on the session.
        expect(session.solvers).toHaveLength(0);
        // An explicit reset() also leaves the session untouched.
        solverNode.reset(session);
        expect(session.solvers).toHaveLength(0);
    });

    it("buildSolverFor() returns an ISolverHandle that the caller attaches manually", () => {
        const solverNode = createRk4SolverNode();
        const integrable = new DummyIntegrable();
        const innerGraph = new RuntimeGraph([integrable]);
        const innerSession = new Session(innerGraph);

        const handle = solverNode.buildSolverFor(innerGraph);
        expect(handle).not.toBeNull();
        // The caller (SimGraphNode in production) attaches it.
        innerSession.attachSolver(handle!);
        expect(innerSession.solvers).toContain(handle);
    });

    it("buildSolverFor() returns null when no IIntegrable leaf matches the filter", () => {
        const solverNode = createRk4SolverNode();
        solverNode.leafFilter = "NonexistentTypeId";
        const integrable = new DummyIntegrable();
        const innerGraph = new RuntimeGraph([integrable]);
        const handle = solverNode.buildSolverFor(innerGraph);
        expect(handle).toBeNull();
        expect(solverNode.ownedLeaves).toBe(0);
    });

    it("resolveOwnedLeaves() returns the matching IIntegrable leaves without building a solver", () => {
        const solverNode = createRk4SolverNode();
        const integrable = new DummyIntegrable();
        const innerGraph = new RuntimeGraph([integrable]);
        const owned = solverNode.resolveOwnedLeaves(innerGraph);
        expect(owned).toHaveLength(1);
        expect(owned[0]).toBe(integrable);
    });

    it("ownedLeaves viewable reflects the count after buildSolverFor()", () => {
        const solverNode = createRk4SolverNode();
        const a = new DummyIntegrable();
        const b = new DummyIntegrable();
        const innerGraph = new RuntimeGraph([a, b]);
        solverNode.buildSolverFor(innerGraph);
        expect(solverNode.ownedLeaves).toBe(2);
    });
});
