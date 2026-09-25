/**
 * The RK4 solver re-reads its leaves before every macro-step (2026-09-25).
 * A producer that writes a leaf's state directly during the dispatch
 * phase (an atmosphere gate's `applyMassDelta`, a restore) used to see its
 * write erased at the next step: the solver integrated the vector it had
 * kept and wrote it back over the leaf.
 */
import { buildSolverAttachmentsForGraph, Channel, DEFAULT_SOLVER_KIND, IntegrableRuntimeNode, RK4AdaptiveSolver, RuntimeGraphBuilder, RuntimeNode, Session, SOLVER_REGISTRY } from "spikypanda-core";
import type { IIntegrationInputs, ISession, ISolver } from "spikypanda-core";

/** The RK4 kind, registered by the control plugin in the studio; a bare core test registers it itself. */
function ensureRk4(): void {
    if (SOLVER_REGISTRY.hasKind(DEFAULT_SOLVER_KIND)) return;
    SOLVER_REGISTRY.register(DEFAULT_SOLVER_KIND, {
        factory: (options, leaves) => {
            const solver = new RK4AdaptiveSolver({ tolerance: typeof options.tolerance === "number" ? options.tolerance : 1e-6, maxStep: typeof options.maxStep === "number" ? options.maxStep : 1e-2 });
            solver.initialize(leaves, 0);
            return solver;
        },
        defaults: { tolerance: 1e-6, maxStep: 1e-2 },
    });
}

/** One state that grows by one per second; its value can be written from outside. */
class Ramp extends IntegrableRuntimeNode {
    public readonly stateSize = 1;
    public readonly stateNames = ["value"];
    public value = 0;
    public gatherState(y: Float64Array, off: number): void {
        y[off] = this.value;
    }
    public writeState(y: Float64Array, off: number): void {
        this.value = y[off];
    }
    public rhs(_t: number, _y: Float64Array, off: number, _inputs: IIntegrationInputs, dydt: Float64Array): void {
        dydt[off] = 1;
    }
    public override reset(_session: ISession): void {
        this.value = 0;
    }
}

/** Fires after the ramp in the dispatch phase and adds a hundred to its state. */
class Bump extends RuntimeNode {
    public constructor(private readonly ramp: Ramp) {
        super();
    }
    public override fire(): void {
        this.ramp.value += 100;
    }
}

describe("RK4AdaptiveSolver re-reads its leaves before each step", () => {
    it("keeps a write made to a leaf between two steps", () => {
        ensureRk4();
        const ramp = new Ramp();
        const bump = new Bump(ramp);
        const graph = new RuntimeGraphBuilder<RuntimeNode, Channel>().withMode("dynamic").withNodes(ramp, bump).build();
        const session = new Session(graph);
        const solvers = buildSolverAttachmentsForGraph([{ kind: DEFAULT_SOLVER_KIND, options: { tolerance: 1e-9, maxStep: 1 } }], graph);
        expect(solvers).toHaveLength(1);
        for (const solver of solvers) (session as unknown as { attachSolver(s: ISolver): void }).attachSolver(solver);
        session.reset();
        session.run(0); // the first run does not integrate; the bump writes 100
        expect(ramp.value).toBeCloseTo(100, 9);
        session.run(10); // integrate 10 s from the leaf's 100, then bump again
        expect(ramp.value).toBeCloseTo(210, 6);
        session.run(20);
        expect(ramp.value).toBeCloseTo(320, 6);
    });
});
