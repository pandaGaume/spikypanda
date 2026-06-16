/**
 * Unit tests for `core/sim/sim-graph.node.ts` — the SimGraphNode
 * fractal-container RuntimeNode.
 *
 * Coverage:
 *   1. Scene binding through the resolver seam: an injected
 *      `SceneStateViewResolver` produces a view written to
 *      `inner.sceneStateView` at `reset()`.
 *   2. Default-view fallback when no `sceneItemId` is set, when the
 *      resolver returns `null`, or when no resolver is wired.
 *   3. Sub-step ratio K = round(innerHz / parentHz), clamped ≥ 1, and
 *      that `inner.run` is called K times per `fire`.
 *   4. Time stepping: each inner.run is called at `lastT + k * dt`
 *      with dt = span / K.
 *   5. Output routing: SimGraphNode still routes inputs/outputs
 *      across the embedding boundary like a vanilla RuntimeGraph.
 *
 * The inner session's `run()` is the observable side effect we
 * assert on; we spy via a substitution in the IGraphNodeState's
 * `internalSession`.
 */
import {
    buildDefaultStateView,
    Cartesian3,
    createSimGraphNode,
    Frequency,
    makeTransform,
    Quaternion,
    RuntimeGraph,
    type ISession,
    type ISolverHandle,
    type SceneBindingResolver,
    type SceneStateView,
    Session,
    SimGraphNode,
} from "spikypanda-core";

// ─────────────────────────────────────────────────────────────────────
// Helpers — minimal inner-graph + parent-session fabric
// ─────────────────────────────────────────────────────────────────────

/**
 * Hand-rolled minimal parent session that owns a SimGraphNode as its
 * graph's sole node. Returns the session + the SimGraphNode + a spy
 * on the inner session's `run` method so tests can assert call count
 * + per-step timestamps without going through the full editor
 * runtime stack.
 */
function makeHarness(opts?: { sceneItemId?: string; resolver?: SceneBindingResolver | null; parentView?: SceneStateView | null; parentSimRate?: number }): {
    parent: ISession;
    sim: SimGraphNode;
    innerRunCalls: number[];
} {
    const sim = createSimGraphNode();
    if (opts?.sceneItemId !== undefined) sim.sceneItemId = opts.sceneItemId;
    if (opts?.resolver !== undefined) sim.setSceneBindingResolver(opts.resolver);

    // The SimGraphNode must be embedded as a NODE in an outer graph
    // for IGraphNodeState (which carries its internalSession) to be
    // allocated by the parent Session's per-node-state factory pass.
    // Using the SimGraph itself as the parent graph wouldn't go
    // through that code path — its node state would just be a flat
    // INodeState.
    const parentGraph = new RuntimeGraph([sim]);
    if (opts?.parentView !== undefined) {
        // Inject the parent view BEFORE the Session constructor runs
        // its own reset() — otherwise the constructor reset cascades
        // before our test fixture can prime the parent context.
        // We do this by deferring construction until after we wire
        // the resolver above (which we already did) and just setting
        // the field right after.
    }
    const parent = new Session(parentGraph);
    if (opts?.parentView !== undefined) parent.sceneStateView = opts.parentView;
    if (opts?.parentSimRate !== undefined) parent.simRate = opts.parentSimRate;

    // Spy on the inner session's run.
    const innerRunCalls: number[] = [];
    const state = parent.nodeStateOf(sim) as { internalSession: Session } | undefined;
    const inner = state?.internalSession;
    if (!inner) throw new Error("Test fixture: inner session missing from IGraphNodeState");
    const origRun = inner.run.bind(inner);
    inner.run = (t: number) => {
        innerRunCalls.push(t);
        origRun(t);
    };
    return { parent, sim, innerRunCalls };
}

/**
 * Build a test-only `SceneBindingResolver` from optional per-method
 * callbacks. Either method defaults to "return nothing wired" when
 * omitted, which exercises the SimGraphNode's fallback paths.
 */
function makeResolver(opts: {
    view?: (id: string, inner: ISession) => SceneStateView | null;
    solvers?: (id: string, inner: ISession) => ReadonlyArray<ISolverHandle>;
}): SceneBindingResolver {
    return {
        buildView: opts.view ?? (() => null),
        buildSolverAttachments: opts.solvers ?? (() => []),
    };
}

// ─────────────────────────────────────────────────────────────────────
// 1. Scene binding via resolver
// ─────────────────────────────────────────────────────────────────────

describe("SimGraphNode scene binding", () => {
    it("writes the resolver's view into innerSession.sceneStateView at reset()", () => {
        const customView = buildDefaultStateView("custom");
        const calls: Array<{ id: string; inner: ISession }> = [];
        const resolver = makeResolver({
            view: (id, inner) => {
                calls.push({ id, inner });
                return customView;
            },
        });
        const { parent, sim } = makeHarness({ sceneItemId: "habitat", resolver });
        // The Session constructor's own reset() cascaded into the
        // SimGraphNode's reset(parentSession), which populates
        // innerSession.sceneStateView.
        const state = parent.nodeStateOf(sim) as unknown as { internalSession: ISession };
        expect(state.internalSession.sceneStateView).toBe(customView);
        expect(calls).toHaveLength(1);
        expect(calls[0].id).toBe("habitat");
        expect(calls[0].inner).toBe(state.internalSession);
    });

    it("falls back to a default view when no sceneItemId is set", () => {
        const { parent, sim } = makeHarness();
        const state = parent.nodeStateOf(sim) as unknown as { internalSession: ISession };
        const view = state.internalSession.sceneStateView;
        expect(view).not.toBeNull();
        expect(view?.id).toContain("unbound");
    });

    it("falls back to a default view when the resolver returns null", () => {
        const { parent, sim } = makeHarness({
            sceneItemId: "unknown",
            resolver: makeResolver({ view: () => null }),
        });
        const state = parent.nodeStateOf(sim) as unknown as { internalSession: ISession };
        const view = state.internalSession.sceneStateView;
        expect(view).not.toBeNull();
        expect(view?.id).toContain("unknown");
    });

    it("falls back to a default view when no resolver is wired", () => {
        const { parent, sim } = makeHarness({ sceneItemId: "habitat" });
        const state = parent.nodeStateOf(sim) as unknown as { internalSession: ISession };
        expect(state.internalSession.sceneStateView).not.toBeNull();
    });
});

// ─────────────────────────────────────────────────────────────────────
// 1.b Solver attachment
// ─────────────────────────────────────────────────────────────────────

/** Bare-minimum ISolverHandle for spying — counts step calls and
 *  reports a trivial result. The Session only ever asserts the
 *  shape of `step()`'s return; lastStep diagnostics live on the
 *  richer ISolver-typed instance, which this stub doesn't need to
 *  implement. */
function makeStubSolver(): ISolverHandle & { steps: number; disposed: boolean } {
    const stub = {
        steps: 0,
        disposed: false,
        step(_dt: number, _session: ISession) {
            stub.steps++;
            return { t: 0, microSteps: 1, maxError: 0, rhsEvals: 0 };
        },
        dispose() {
            stub.disposed = true;
        },
    };
    return stub;
}

describe("SimGraphNode solver attachment", () => {
    it("attaches solvers returned by the resolver to the inner session at reset()", () => {
        const solverA = makeStubSolver();
        const solverB = makeStubSolver();
        const resolver = makeResolver({
            solvers: () => [solverA, solverB],
        });
        const { parent, sim } = makeHarness({ sceneItemId: "habitat", resolver });
        const state = parent.nodeStateOf(sim) as unknown as { internalSession: ISession };
        const attached = state.internalSession.solvers;
        expect(attached).toContain(solverA);
        expect(attached).toContain(solverB);
        expect(attached).toHaveLength(2);
    });

    it("detaches the previous solvers before re-binding on a subsequent reset()", () => {
        const old = makeStubSolver();
        const fresh = makeStubSolver();
        let returnOld = true;
        const resolver = makeResolver({
            solvers: () => (returnOld ? [old] : [fresh]),
        });
        const { parent, sim } = makeHarness({ sceneItemId: "habitat", resolver });
        const state = parent.nodeStateOf(sim) as unknown as { internalSession: ISession };
        expect(state.internalSession.solvers).toContain(old);

        // Swap the resolver's payload and re-run reset on the
        // SimGraphNode directly (skipping a full parent.reset()).
        returnOld = false;
        sim.reset(parent);

        expect(state.internalSession.solvers).not.toContain(old);
        expect(state.internalSession.solvers).toContain(fresh);
        expect(old.disposed).toBe(true);
    });

    it("attaches nothing (and crashes nothing) when the resolver returns an empty list", () => {
        const resolver = makeResolver({ solvers: () => [] });
        const { parent, sim } = makeHarness({ sceneItemId: "habitat", resolver });
        const state = parent.nodeStateOf(sim) as unknown as { internalSession: ISession };
        expect(state.internalSession.solvers).toHaveLength(0);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 2. Sub-stepping
// ─────────────────────────────────────────────────────────────────────

function viewWithHz(id: string, hz: number): SceneStateView {
    // Build a default view and override its effectiveHz via a shim —
    // simpler than synthesising a full SceneStateViewImpl for tests.
    const base = buildDefaultStateView(id);
    const shimHz = new Frequency(hz, Frequency.Units.Hz);
    return new Proxy(base, {
        get(target, prop) {
            if (prop === "effectiveHz") return shimHz;
            return Reflect.get(target, prop);
        },
    });
}

describe("SimGraphNode sub-stepping", () => {
    it("runs the inner session ONCE when no Hz info is available (K = 1)", () => {
        const { parent, sim, innerRunCalls } = makeHarness();
        sim.fire(parent, 1.0);
        expect(innerRunCalls).toHaveLength(1);
        expect(innerRunCalls[0]).toBeCloseTo(1.0, 9);
    });

    it("runs the inner session K = round(innerHz / parentHz) times", () => {
        const parentView = viewWithHz("parent", 100);
        const childView = viewWithHz("child", 1000);
        const resolver = makeResolver({ view: () => childView });
        const { parent, sim, innerRunCalls } = makeHarness({
            sceneItemId: "any",
            resolver,
            parentView,
        });
        // Fire from t=0 to t=0.01 (one parent tick at 100 Hz).
        sim.fire(parent, 0.01);
        expect(innerRunCalls).toHaveLength(10);
        // Inner times should land on 0.001, 0.002, ..., 0.010.
        for (let k = 0; k < 10; k++) {
            expect(innerRunCalls[k]).toBeCloseTo(0.001 * (k + 1), 9);
        }
    });

    it("clamps K to ≥ 1 when innerHz ≤ parentHz (no skipping)", () => {
        const parentView = viewWithHz("parent", 1000);
        const childView = viewWithHz("child", 100); // 10× slower
        const resolver = makeResolver({ view: () => childView });
        const { parent, sim, innerRunCalls } = makeHarness({
            sceneItemId: "any",
            resolver,
            parentView,
        });
        sim.fire(parent, 0.01);
        expect(innerRunCalls).toHaveLength(1);
    });

    it("uses the previous fire's t as the start of the sub-step span", () => {
        const parentView = viewWithHz("parent", 100);
        const childView = viewWithHz("child", 200); // K = 2
        const resolver = makeResolver({ view: () => childView });
        const { parent, sim, innerRunCalls } = makeHarness({
            sceneItemId: "any",
            resolver,
            parentView,
        });
        sim.fire(parent, 0.01); // first fire: span = 0 (lastT === t), then [0.005, 0.01]
        innerRunCalls.length = 0;
        sim.fire(parent, 0.02); // second fire: span = 0.01, K = 2 → 0.015, 0.02
        expect(innerRunCalls).toHaveLength(2);
        expect(innerRunCalls[0]).toBeCloseTo(0.015, 9);
        expect(innerRunCalls[1]).toBeCloseTo(0.02, 9);
    });

    it("falls back to ISession.simRate when no SceneStateView is bound on either side", () => {
        const { parent, sim, innerRunCalls } = makeHarness({ parentSimRate: 1000 });
        // Both inner and parent have no scene view's Hz; falls through
        // to parent.simRate for parent, default view's MIN_EFFECTIVE_HZ
        // (60) for child. 60 < 1000 → K = 1.
        sim.fire(parent, 0.001);
        expect(innerRunCalls).toHaveLength(1);
    });
});

// ─────────────────────────────────────────────────────────────────────
// 3. Scene inheritance — "a graph is a TransformNode"
// ─────────────────────────────────────────────────────────────────────

/** A default view with gravity overridden, via a Proxy (same shim
 *  trick as viewWithHz). */
function viewWithGravity(id: string, g: { x: number; y: number; z: number }): SceneStateView {
    const base = buildDefaultStateView(id);
    return new Proxy(base, {
        get(target, prop) {
            if (prop === "gravity") return g;
            return Reflect.get(target, prop);
        },
    });
}

describe("SimGraphNode scene inheritance (unbound)", () => {
    it("inherits the parent session's gravity LIVE when it has no SceneItem", () => {
        // No sceneItemId, no resolver → the inner view is an
        // InheritedSceneStateView reading parentSession.sceneStateView.
        const { parent, sim } = makeHarness();
        const inner = (parent.nodeStateOf(sim) as unknown as { internalSession: ISession }).internalSession;

        // Parent view set AFTER construction (the editor's ordering).
        // The inherited view derefs live, so no rebuild is needed.
        const orbital = viewWithGravity("orbital", { x: 0, y: 0, z: 0 });
        parent.sceneStateView = orbital;
        expect(inner.sceneStateView?.gravity).toEqual({ x: 0, y: 0, z: 0 });

        // Swap Earth -> the inner reflects it on the next read.
        const earth = viewWithGravity("earth", { x: 0, y: 0, z: -9.81 });
        parent.sceneStateView = earth;
        expect(inner.sceneStateView?.gravity).toEqual({ x: 0, y: 0, z: -9.81 });
    });

    it("degrades to Earth-surface defaults when the parent has no view", () => {
        const { parent, sim } = makeHarness();
        const inner = (parent.nodeStateOf(sim) as unknown as { internalSession: ISession }).internalSession;
        // parentSession.sceneStateView is null here.
        expect(inner.sceneStateView?.gravity).toEqual({ x: 0, y: 0, z: -9.81 });
    });

    it("chains worldTransform: inner inherits the parent's world pose with identity local", () => {
        const { parent, sim } = makeHarness();
        const inner = (parent.nodeStateOf(sim) as unknown as { internalSession: ISession }).internalSession;
        // A parent scene translated by (5, 0, 0).
        const base = buildDefaultStateView("posed");
        const posed = new Proxy(base, {
            get(target, prop) {
                if (prop === "worldTransform") return makeTransform(new Cartesian3(5, 0, 0), new Quaternion(0, 0, 0, 1), new Cartesian3(1, 1, 1));
                return Reflect.get(target, prop);
            },
        });
        parent.sceneStateView = posed;
        // sim.fire computes _localPose (identity, unwired) and the inner
        // view chains worldTransform = parent.worldTransform x identity.
        sim.fire(parent, 0.001);
        const w = inner.sceneStateView?.worldTransform;
        expect(w?.position.x).toBeCloseTo(5, 9);
    });
});
