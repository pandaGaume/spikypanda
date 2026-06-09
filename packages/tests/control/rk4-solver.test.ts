/**
 * Unit tests for `Control.Sim:rk4-solver` after the 2026-06-09
 * solver-as-descriptor refactor.
 *
 * The new contract:
 *   - `RK4SolverItem` is a `GraphItem` (descriptor), NOT a RuntimeNode.
 *     It carries `tolerance / maxStep` editables and the diagnostic
 *     viewables (lastMicroSteps, lastMaxError, rhsEvalsTotal,
 *     ownedLeaves), but has no `fire()` and is not registered with the
 *     scheduler.
 *   - `toSolverDescriptor()` returns `{ kind: "rk4-adaptive", options: {...} }`
 *     for the attachment helper.
 *   - `bindSolver(solver, ownedCount)` receives a reference to the
 *     instance the registry built so the item's viewables stay live.
 *   - The integration plumbing (registry lookup, group-by-kind, merge
 *     of leaf overrides, factory call) lives in core/sim, not here.
 */
import {
    buildSolverAttachmentsForGraph,
    cloneable,
    DEFAULT_SOLVER_KIND,
    type IIntegrable,
    type IIntegrationInputs,
    type ISolverOptions,
    type ISession,
    mergeSolverOptions,
    RuntimeGraph,
    RuntimeNode,
    Session,
    SOLVER_REGISTRY,
} from "spikypanda-core";
import {
    createRK4SolverItem,
    RK4_SOLVER_KIND,
    RK4SolverItem,
} from "../../dev/plugins/control/src/sim/rk4-solver.item";
// Activating the control plugin registers the "rk4-adaptive" factory
// in SOLVER_REGISTRY; we import the sub-plugin and call activate()
// against a minimal fake context to populate the registry for these
// tests.
import { controlSimSubPlugin } from "../../dev/plugins/control/src/sim/index";

// Activate once; idempotent on re-registration.
controlSimSubPlugin.activate({ nodes: { register: () => {} } } as never);

// ─────────────────────────────────────────────────────────────────────
// A minimal IIntegrable test fixture
// ─────────────────────────────────────────────────────────────────────

class DummyIntegrable extends RuntimeNode implements IIntegrable {
    public readonly stateSize = 1;
    public readonly stateNames = ["x"];
    public readonly solverKind?: string;
    public readonly solverOptions?: ISolverOptions;

    @cloneable private _x = 0;

    public constructor(opts?: { solverKind?: string; solverOptions?: ISolverOptions; x0?: number }) {
        super();
        this.solverKind = opts?.solverKind;
        this.solverOptions = opts?.solverOptions;
        if (typeof opts?.x0 === "number") this._x = opts.x0;
    }

    public gatherState(y: Float64Array, off: number): void {
        y[off] = this._x;
    }
    public writeState(y: Float64Array, off: number): void {
        this._x = y[off];
    }
    public rhs(_t: number, y: Float64Array, off: number, _inputs: IIntegrationInputs, dydt: Float64Array): void {
        dydt[off] = -y[off];
    }
    public fire(_session: ISession, _t: number): void {
        /* no-op for this fixture */
    }
}

// ─────────────────────────────────────────────────────────────────────
// 1. RK4SolverItem: descriptor surface
// ─────────────────────────────────────────────────────────────────────

describe("RK4SolverItem (GraphItem descriptor)", () => {
    it("is not a RuntimeNode (has no fire method)", () => {
        const item = createRK4SolverItem();
        expect(typeof (item as unknown as { fire?: unknown }).fire).toBe("undefined");
    });

    it("toSolverDescriptor returns kind 'rk4-adaptive' + current editable values", () => {
        const item = createRK4SolverItem();
        item.tolerance = 1e-8;
        item.maxStep = 5e-3;
        const desc = item.toSolverDescriptor();
        expect(desc.kind).toBe(RK4_SOLVER_KIND);
        expect(desc.options.tolerance).toBe(1e-8);
        expect(desc.options.maxStep).toBe(5e-3);
    });

    it("editable setters clamp invalid values to safe defaults", () => {
        const item = new RK4SolverItem();
        item.tolerance = 0;
        expect(item.tolerance).toBe(1e-12);
        item.tolerance = -5;
        expect(item.tolerance).toBe(1e-12);
        item.maxStep = 0;
        expect(item.maxStep).toBe(1e-6);
    });

    it("bindSolver(null) clears the diagnostic viewables", () => {
        const item = createRK4SolverItem();
        item.bindSolver(null, 0);
        expect(item.lastMicroSteps).toBe(0);
        expect(item.lastMaxError).toBe(0);
        expect(item.rhsEvalsTotal).toBe(0);
        expect(item.ownedLeaves).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. SOLVER_REGISTRY: factory registration
// ─────────────────────────────────────────────────────────────────────

describe("SOLVER_REGISTRY (factory registration)", () => {
    it("the rk4-adaptive kind is registered after plugin activation", () => {
        expect(SOLVER_REGISTRY.hasKind(RK4_SOLVER_KIND)).toBe(true);
        expect(SOLVER_REGISTRY.hasKind(DEFAULT_SOLVER_KIND)).toBe(true);
    });

    it("defaultOptions returns a sensible bag", () => {
        const defaults = SOLVER_REGISTRY.defaultOptions(RK4_SOLVER_KIND);
        expect(defaults.tolerance).toBeGreaterThan(0);
        expect(defaults.maxStep).toBeGreaterThan(0);
    });

    it("returns null when asked for an unregistered kind", () => {
        const solver = SOLVER_REGISTRY.create("does-not-exist", {}, []);
        expect(solver).toBeNull();
    });

    it("returns null for empty leaves list (no-op solver)", () => {
        const solver = SOLVER_REGISTRY.create(RK4_SOLVER_KIND, { tolerance: 1e-6, maxStep: 1e-2 }, []);
        expect(solver).toBeNull();
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. mergeSolverOptions: tightening rules
// ─────────────────────────────────────────────────────────────────────

describe("mergeSolverOptions", () => {
    it("tolerance takes the min across descriptor + leaves", () => {
        const merged = mergeSolverOptions({ tolerance: 1e-6 }, [{ tolerance: 1e-8 }, { tolerance: 1e-7 }]);
        expect(merged.tolerance).toBe(1e-8);
    });
    it("maxStep takes the min across descriptor + leaves", () => {
        const merged = mergeSolverOptions({ maxStep: 1e-2 }, [{ maxStep: 5e-4 }, { maxStep: 1e-3 }]);
        expect(merged.maxStep).toBe(5e-4);
    });
    it("minStep takes the max across descriptor + leaves", () => {
        const merged = mergeSolverOptions({ minStep: 1e-9 }, [{ minStep: 1e-7 }]);
        expect(merged.minStep).toBe(1e-7);
    });
    it("unknown options use last-write-wins", () => {
        const merged = mergeSolverOptions({ custom: "a" }, [{ custom: "b" }]);
        expect(merged.custom).toBe("b");
    });
    it("returns the base when no overrides are provided", () => {
        const base = { tolerance: 1e-6, maxStep: 1e-3 };
        const merged = mergeSolverOptions(base, []);
        expect(merged).toEqual(base);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 4. buildSolverAttachmentsForGraph: end-to-end
// ─────────────────────────────────────────────────────────────────────

describe("buildSolverAttachmentsForGraph (leaf-centric resolution)", () => {
    it("returns an empty array when the graph has no IIntegrable leaves", () => {
        const graph = new RuntimeGraph([]);
        expect(buildSolverAttachmentsForGraph([], graph)).toHaveLength(0);
    });

    it("auto-fills from the registry default when no descriptor is wired", () => {
        const leaf = new DummyIntegrable();
        const graph = new RuntimeGraph([leaf]);
        const solvers = buildSolverAttachmentsForGraph([], graph);
        expect(solvers).toHaveLength(1);
    });

    it("uses the wired descriptor's tolerance over the registry default", () => {
        const leaf = new DummyIntegrable();
        const graph = new RuntimeGraph([leaf]);
        const descriptors = [{ kind: RK4_SOLVER_KIND, options: { tolerance: 1e-12, maxStep: 1e-4 } }];
        const solvers = buildSolverAttachmentsForGraph(descriptors, graph);
        expect(solvers).toHaveLength(1);
        // We can't inspect tolerance directly through ISolver; we just
        // verify the factory accepted it without crashing. (The actual
        // tolerance flows into the solver's internal state and is unit-
        // tested in the core RK4 solver tests.)
    });

    it("groups by kind: two kinds → two solvers", () => {
        // The default rk4-adaptive will pick up "rk4" + the undefined-kind
        // leaf (which falls back to DEFAULT_SOLVER_KIND, also rk4). To
        // get TWO separate solvers, we declare a fake kind here and
        // register a stub factory just for this test.
        SOLVER_REGISTRY.register("test-stub", {
            factory: () => ({
                name: "stub",
                supportsJacobian: false,
                initialize: () => {},
                step: () => ({ t: 0, microSteps: 1, maxError: 0, rhsEvals: 1 }),
                lastStep: null,
            } as never),
            defaults: {},
        });
        try {
            const a = new DummyIntegrable({ solverKind: RK4_SOLVER_KIND });
            const b = new DummyIntegrable({ solverKind: "test-stub" });
            const graph = new RuntimeGraph([a, b]);
            const solvers = buildSolverAttachmentsForGraph([], graph);
            expect(solvers).toHaveLength(2);
        } finally {
            SOLVER_REGISTRY.unregister("test-stub");
        }
    });

    it("skips leaves whose kind has no registered factory (with a console warning)", () => {
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        try {
            const orphan = new DummyIntegrable({ solverKind: "no-such-kind" });
            const graph = new RuntimeGraph([orphan]);
            const solvers = buildSolverAttachmentsForGraph([], graph);
            expect(solvers).toHaveLength(0);
            expect(warn).toHaveBeenCalled();
        } finally {
            warn.mockRestore();
        }
    });

    it("the returned solver, when attached, integrates the leaf to ~0 (exp decay)", () => {
        const leaf = new DummyIntegrable({ x0: 1 });
        const graph = new RuntimeGraph([leaf]);
        const session = new Session(graph);
        const solvers = buildSolverAttachmentsForGraph([], graph);
        expect(solvers).toHaveLength(1);
        session.attachSolver(solvers[0]);
        // Step the solver enough times to let x decay from 1 → ~e^-1.
        for (let i = 0; i < 100; i++) solvers[0].step(0.01, session);
        const y = new Float64Array(1);
        leaf.gatherState(y, 0);
        // exp(-1) ≈ 0.3679; allow generous tolerance for the integrator.
        expect(y[0]).toBeGreaterThan(0.3);
        expect(y[0]).toBeLessThan(0.4);
    });
});
