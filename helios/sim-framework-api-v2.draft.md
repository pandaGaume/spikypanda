# Sim Framework v2 — API Design Draft (revised)

**Status**: draft for review. NOT implemented.
**Date**: 2026-05-30.
**Supersedes**: `sim-framework-api-v1.draft.md` — that one reinvented the
fractal-composition wheel. Read this one instead.

## What changed vs v1

v1 proposed a parallel `ISimNode` / `ISimGraph` interface stack. **Wrong.**
The fractal composition pattern is already implemented:

- `RuntimeGraph<N, L> extends Graph<N, L> implements IRuntimeGraph, IRuntimeNode`
  in `packages/dev/core/src/execution/execution.graph.ts`.
- Dangling-endpoint port channels (`oini === null` for inputs, `ofin === null`
  for outputs) define the public port surface of a sub-graph.
- Per-parent-session state via `createNodeState() → IGraphNodeState { internalSession }`,
  so one `RuntimeGraph` can be embedded in N concurrent parent sessions.
- `fire(parentSession, t)` does `_routeInputsFromParent → inner.run(t) →
  _routeOutputsToParent`. End-to-end embedding works today.
- `ComputeGraph extends RuntimeGraph<IKernel, IDataLink>` is the tensor-flow
  specialization. `OnnxGraphExporter` already turns ComputeGraphs into ONNX
  bytes (today: CNN/quantized-CNN; generalization to arbitrary RuntimeGraph
  leaves is per-node-trait work, not framework work).

So **F2 is done** and **F5 is partially done**. The remaining genuine gaps:

| Gap | What's needed |
|-----|---------------|
| F1 (continuous-time `rhs`) | New OPTIONAL interface, layered on top of IRuntimeNode |
| F3 (ISolver) | New host node, walks containing graph for F1-implementors |
| F4 (IChemicalStream port type) | New entry in the port-type union + connect guard |
| F5 (sub-graph→ONNX for non-Compute graphs) | Extend OnnxGraphExporter via per-node `onnxExport` trait |
| F7 (conservation hooks) | Simple observer pattern, no framework change |
| F8 (snapshot/restore session state) | Extend existing serialize/deserialize to cover Session state |
| F9 (multi-rate scheduler) | Wrapper RuntimeGraph that subdivides its parent's tick |

This doc focuses on F1, F3, F4. F5/F7/F8/F9 get sketched at the end with
their natural shape; none need a top-of-stack rewrite.

---

## Design context (what already works)

### Existing stateful-node pattern (DC motor)

Reading `physics/src/electric/motor-dc/dynamic.node.ts`:

```ts
public override fire(session: ISession, t: number): void {
    // ...gather wired inputs V, tau_load, dt...
    let dt = -1;
    for (const link of this.opsc<IChannel>()) {
        const value = session.consume(idx);
        if (slot === "dt") dt = value;
    }
    if (dt < 0) dt = this._lastT < 0 ? 0 : Math.max(0, t - this._lastT);
    this._lastT = t;

    // INLINE Euler step
    if (dt > 0) {
        const dIdt = (V - this._R * this._i - this._Ke * this._omega) / this._L;
        const dWdt = (this._Kt * this._i - this._b * this._omega - tauEff) / this._J;
        newI     = this._i     + dt * dIdt;
        newOmega = this._omega + dt * dWdt;
    }

    this.setField("i", this._i, newI, ...);
    this.setField("omega", this._omega, newOmega, ...);
    // ...broadcast outputs...
}
```

Each stateful node carries its **state as `@cloneable` private fields** and
**fuses integration with I/O inside `fire()`**. This works fine for non-stiff
single-rate systems (motors, oscillators) but has three real limitations:

1. **Forward Euler only.** Swapping in RK4/Rosenbrock requires rewriting
   every leaf node.
2. **No global state vector.** Linearization (∂f/∂y), DMD, conservation
   monitoring across multiple stateful nodes — all impossible because the
   state is scattered across `@cloneable` fields in N different objects.
3. **dt is read per-leaf.** Each motor independently negotiates dt from
   wires + `t - lastT`. Tier-0 substep concept (the solver running 10000
   micro-steps inside one macro-tick) doesn't fit this model.

The proposal below introduces the `IIntegrable` opt-in trait that fixes
all three, **without disturbing the existing fire(t) loop for nodes that
don't opt in**. Motors that don't migrate keep working unchanged.

---

## F1 — `IIntegrable` opt-in trait

### Proposed interface

```ts
// packages/dev/core/src/sim/sim.interfaces.ts (new file)

import type { ISession, IRuntimeNode } from "../execution/execution.interfaces";

/**
 * Optional trait a RuntimeNode can implement to participate in
 * continuous-time integration. The trait is ORTHOGONAL to the existing
 * fire(t) contract:
 *
 *   - Nodes that DON'T implement IIntegrable keep their current
 *     fire(session, t) behaviour. Existing motors, oscillators, DSP
 *     ops are unaffected.
 *   - Nodes that DO implement IIntegrable opt out of doing integration
 *     in fire() and instead expose their state vector + rhs to whatever
 *     solver lives in the containing graph. fire() then becomes a pure
 *     I/O routine (consume inputs, publish observation outputs) — the
 *     solver owns the dt/integration loop.
 *
 * A leaf can be migrated in place: keep the existing fire() AND add
 * IIntegrable. The Solver host node detects the trait at session.start()
 * and replaces the leaf's self-integration with solver-driven updates
 * for the duration of the session.
 */
export interface IIntegrable {
    /** Size of this leaf's local state vector. 0 is illegal — non-zero
     *  states only. Stateless nodes don't implement IIntegrable. */
    readonly stateSize: number;

    /** Names of state entries, length === stateSize. Surfaced in the
     *  property panel + diagnostic tiles (DMD, conservation). Strongly
     *  recommended even when stateSize === 1. */
    readonly stateNames?: ReadonlyArray<string>;

    /** Copy this leaf's current state INTO y[offset..offset+stateSize).
     *  Called by the solver at the start of each accepted step and by
     *  Restore. */
    gatherState(y: Float64Array, offset: number): void;

    /** Copy y[offset..offset+stateSize) back INTO this leaf's local
     *  state. Called by the solver at the end of each accepted step
     *  and by Restore. */
    writeState(y: Float64Array, offset: number): void;

    /** Compute dy/dt at time t given y. PURE: must not read or write
     *  any state outside the (y, dydt) slice. Inputs from upstream
     *  nodes are passed via `inputs`, a snapshot the solver assembles
     *  by re-evaluating the leaf's input ports at time t. */
    rhs(
        t: number,
        y: Float64Array,
        offset: number,
        inputs: IIntegrationInputs,
        dydt: Float64Array,
    ): void;

    /** Optional analytic Jacobian d(rhs)/dy for this leaf. Returns a
     *  (stateSize × stateSize) matrix as a flat row-major Float64Array.
     *  When absent, the solver finite-differences it. Important when
     *  implicit solvers arrive (Phase 2+). */
    jacobian?(
        t: number,
        y: Float64Array,
        offset: number,
        inputs: IIntegrationInputs,
        J: Float64Array,
    ): void;
}

/** Inputs handed to rhs: upstream port values, indexed by input port
 *  name. The solver evaluates these from the parent graph's topology
 *  once per RHS call. Read-only. */
export interface IIntegrationInputs {
    get(portName: string): number | undefined;
    has(portName: string): boolean;
}

/** Structural duck-type guard. */
export function isIntegrable(node: unknown): node is IIntegrable {
    if (!node || typeof node !== "object") return false;
    const n = node as Partial<IIntegrable>;
    return typeof n.stateSize === "number"
        && typeof n.gatherState === "function"
        && typeof n.writeState === "function"
        && typeof n.rhs === "function";
}
```

### How an existing motor migrates

Before (DcMotorDynamicNode, current):

```ts
public override fire(session: ISession, t: number): void {
    // ... gather V, tau_load, dt ...
    const dIdt = (V - this._R * this._i - this._Ke * this._omega) / this._L;
    newI     = this._i     + dt * dIdt;
    newOmega = this._omega + dt * dWdt;
    this.setField("i", this._i, newI, ...);
    this.setField("omega", this._omega, newOmega, ...);
    // ... broadcast outputs ...
}
```

After (same node, now opt-in IIntegrable):

```ts
export class DcMotorDynamicNode extends FaultableNode implements IIntegrable {
    readonly stateSize = 2;
    readonly stateNames = ["i", "omega"];

    gatherState(y: Float64Array, offset: number): void {
        y[offset + 0] = this._i;
        y[offset + 1] = this._omega;
    }
    writeState(y: Float64Array, offset: number): void {
        // setField pattern preserved — viewables + livebinder still fire.
        this.setField("i",     this._i,     y[offset + 0], (n) => { this._i = n; });
        this.setField("omega", this._omega, y[offset + 1], (n) => { this._omega = n; });
    }
    rhs(t, y, offset, inputs, dydt): void {
        const i     = y[offset + 0];
        const omega = y[offset + 1];
        const V       = inputs.get("V")        ?? 0;
        const tauLoad = inputs.get("tau_load") ?? 0;
        const tauEff = tauLoad + this.getFault("tau");
        dydt[offset + 0] = (V - this._R * i - this._Ke * omega) / this._L;
        dydt[offset + 1] = (this._Kt * i - this._b * omega - tauEff) / this._J;
    }

    public override fire(session: ISession, t: number): void {
        // Pure I/O now. Integration is solver's job — fire just publishes.
        super.fire(session, t);   // FaultableNode + TransformNode still run
        // ... broadcast outputs (tau_em from this._i × Kt etc.) ...
    }
}
```

Migration is **localized** (one node at a time) and **reversible** (revert
the trait, fire() goes back to inline Euler). No big-bang refactor.

### Open questions

| # | Question | Proposal |
|---|----------|----------|
| Q1.1 | `stateSize` reactive (e.g. nfft change) or frozen at compile? | Frozen. Topology edits → solver rebuild. |
| Q1.2 | Inputs to rhs: pull from session.linkStates each call, or snapshot once per macro-tick? | Snapshot once per macro-tick. Solver caches the input vector and re-uses across micro-steps. Trade-off: inputs frozen during one solver macro-step — fine since the solver runs FAR faster than upstream publish rates. |
| Q1.3 | Migration policy: must all stateful nodes implement IIntegrable, or can the two patterns coexist permanently? | Coexist permanently. IIntegrable is opt-in. Solver only owns nodes that opt in; non-opt-in nodes (existing motors, DSP, viz) self-update in fire() as today. |

---

## F3 — `ISolver` as a host node

### Architecture: solver is a Helios node, not an invisible runtime

The simplest fit with the existing fractal model: the solver is a
`RuntimeNode` you drop into a graph. At session start it discovers every
`IIntegrable` leaf in **its containing graph** (i.e. `parentSession.graph.nodes`,
filtered by `isIntegrable`), allocates the global state vector y, and
each `fire(t)` advances y by exactly the macro-tick dt (composed of N
internal adaptive micro-steps).

### Proposed interface

```ts
// same file

export interface ISolverStep {
    /** Accepted step time at end of macro-tick. */
    readonly t: number;
    /** Number of internal micro-steps the solver took. */
    readonly microSteps: number;
    /** Largest local error estimate observed. */
    readonly maxError: number;
    /** Number of RHS evaluations spent on this macro-tick. */
    readonly rhsEvals: number;
}

export interface ISolver {
    readonly name: string;

    /** True when the solver can use analytic Jacobians (implicit
     *  solvers benefit; explicit ones ignore). */
    readonly supportsJacobian: boolean;

    /** Hook the solver to a specific graph + leaf set. Called once on
     *  session start; the solver caches the offset table from each
     *  IIntegrable to a slice of the global y vector. */
    initialize(
        graph: IRuntimeGraph,
        integrableLeaves: ReadonlyArray<IIntegrable>,
        t0: number,
    ): void;

    /** Advance the simulation by `dt` seconds. Returns step diagnostics.
     *  Mutates the global state in place (each leaf's writeState is
     *  called once at the end of the accepted macro-step). */
    step(dt: number, inputs: SolverInputResolver): ISolverStep;

    /** Drop the cached offset table + buffers. Called on session reset. */
    dispose?(): void;
}

/** The solver calls this once per macro-tick to get a snapshot of each
 *  integrable leaf's current input port values. Concrete implementation
 *  walks `parentSession.linkStates` and resolves names → values. */
export type SolverInputResolver = (leaf: IIntegrable) => IIntegrationInputs;
```

### The host node

```ts
// packages/dev/plugins/helios/src/sim/rk4-solver.node.ts

@cloneable private _tolerance: number = 1e-6;
@cloneable private _maxStep:   number = 1e-2;   // 10 ms cap

private _solver: RK4AdaptiveSolver | null = null;
private _y:      Float64Array | null = null;
private _leaves: IIntegrable[] = [];

public override reset(parentSession: ISession): void {
    // Discover integrable siblings in the containing graph.
    const nodes = parentSession.graph.nodes as ReadonlyArray<IRuntimeNode>;
    this._leaves = nodes.filter(isIntegrable);
    if (this._leaves.length === 0) {
        // No integrables in this graph — solver is a no-op.
        this._solver = null;
        return;
    }
    const totalSize = this._leaves.reduce((s, l) => s + l.stateSize, 0);
    this._y = new Float64Array(totalSize);
    // Gather initial state from each leaf.
    let off = 0;
    for (const leaf of this._leaves) { leaf.gatherState(this._y, off); off += leaf.stateSize; }
    this._solver = new RK4AdaptiveSolver({ tolerance: this._tolerance, maxStep: this._maxStep });
    this._solver.initialize(parentSession.graph, this._leaves, 0);
}

public override fire(parentSession: ISession, t: number): void {
    if (!this._solver || !this._y) return;
    const dt = t - this._lastT;
    this._lastT = t;
    const inputResolver: SolverInputResolver = (leaf) =>
        this._snapshotInputs(parentSession, leaf);
    this._solver.step(dt, inputResolver);
    // Write y back into each leaf for the viewables + downstream fire().
    let off = 0;
    for (const leaf of this._leaves) { leaf.writeState(this._y, off); off += leaf.stateSize; }
}
```

The solver node **must fire before** the IIntegrable leaves in the parent
graph's scheduler order, so the leaves see the updated state when their
own fire() runs to publish outputs. Concretely: the user wires the solver's
synthetic `tick` output to the leaves' `_enable` or some lightweight
dependency port, or the scheduler is taught to order solver-host nodes
first (option B is cleaner but invasive — propose A for V1).

### Phased implementation (unchanged from v1)

| Phase | Solver | When |
|-------|--------|------|
| 1 | RK4 Cash-Karp / Dormand-Prince (own impl, ~150 LoC) | First Helios sprint. Validates the IIntegrable contract end-to-end. |
| 2 | Rosenbrock4 (own impl ~600 LoC, or pure-TS port of Boost.odeint) | When Sabatier kinetics force stiffness > 10⁴ |
| 3 | SUNDIALS IDA/CVODES (WASM build) | When DAE or sensitivity analysis needed |

### Open questions

| # | Question | Proposal |
|---|----------|----------|
| Q3.1 | How does the solver guarantee it fires before its IIntegrable siblings each macro-tick? | V1: rely on graph node order + user wiring solver's `_started` to leaves' control ports. V2: dedicated solver-priority flag in scheduler. |
| Q3.2 | One solver per graph, or can multiple solvers coexist? | One per RuntimeGraph. A child SimGraph (embedded sub-graph that is itself a RuntimeGraph) can carry its own solver, giving you hierarchical solvers naturally — top-level slow solver wraps a sub-graph with a faster solver. |
| Q3.3 | Snapshot of solver state? | Only `y` and `lastT`. Adaptive solvers' internal `dt` recommendation reseeds from scratch on restore. |

---

## F4 — `IChemicalStream` port type

Unchanged from v1 in spirit. Restated tighter:

```ts
// packages/dev/core/src/sim/sim.chemical.ts (new file)

export interface IChemicalStream {
    readonly mdot: number;       // kg/s
    readonly T:    number;       // K
    readonly P:    number;       // Pa
    readonly composition: ReadonlyMap<ChemicalSpecies, number>;  // mole fractions, sums to 1
}

export type ChemicalSpecies =
    | "H2O" | "H2" | "O2" | "CO2" | "CH4" | "N2" | "Ar" | "He";

export function validateComposition(c: ReadonlyMap<ChemicalSpecies, number>): boolean {
    let s = 0; for (const v of c.values()) { if (v < 0) return false; s += v; }
    return Math.abs(s - 1) < 1e-9;
}
export function speciesFlow(stream: IChemicalStream, sp: ChemicalSpecies): number {
    return (stream.composition.get(sp) ?? 0) * stream.mdot;
}
```

**Port-type integration**: add `"chemical"` to the existing `PortType`
union (`packages/dev/core/src/execution/execution.interfaces.ts`). The
`GraphViewer.connect()` guard already enforces type compatibility — add a
species-set sub-check for chemical↔chemical connections:

```ts
// rough shape — actual location: packages/dev/nodeeditor/src/connection.ts
if (fromPort.type === "chemical" && toPort.type === "chemical") {
    if (!speciesSetsCompatible(fromPort.species, toPort.species)) {
        rejectConnection("incompatible species set");
    }
}
```

`PortDescriptor` needs an optional `species?: ReadonlyArray<ChemicalSpecies>`
field for chemical ports to declare their schema.

### Open questions

| # | Question | Proposal |
|---|----------|----------|
| Q4.1 | Track enthalpy on the stream or compute from (T, composition)? | Compute via helper `enthalpy(stream)` backed by a species property table. No denormalization. |
| Q4.2 | Two-phase support? | V1 single-phase gas. Add a `phase` flag only when the knockout drum (V-701) lands. |
| Q4.3 | Stream as immutable per-tick object? | Yes. Cheap; one allocation per process unit per tick. |

---

## F5 — Sub-graph → ONNX export (path, not interface)

`OnnxGraphExporter` already targets `ComputeGraph`. To extend to
arbitrary `RuntimeGraph` agent sub-graphs:

1. Add an optional `IOnnxExportable` trait on RuntimeNode:
   ```ts
   interface IOnnxExportable {
       emitOnnx(ctx: OnnxExportContext, inputs: string[], outputs: string[]): void;
   }
   ```
2. For each leaf in the agent sub-graph, look up its `emitOnnx` trait
   (per-node responsibility, not framework). Leaves without it can't be
   exported — flagged at export time with a clear error.
3. The recursion is free: when a leaf IS itself a RuntimeGraph (fractal
   composition), `OnnxGraphExporter` already handles that via existing
   recursive traversal.

**This is not framework work**; it's per-node export-trait implementation
plus a small extension of the existing exporter to walk arbitrary
RuntimeGraphs (not just ComputeGraph). Targets one chemistry leaf at a
time as Helios needs them.

---

## F7 — Conservation hooks (small, standalone)

A conservation hook is a function `(t, y) → number` whose value should
stay near-constant across solver steps. Bundled as an editable on the
Solver host node:

```ts
public addConservationHook(hook: IConservationHook): void { /* ... */ }

interface IConservationHook {
    readonly name: string;
    readonly tolerance: number;
    readonly mode: "absolute" | "relative";
    eval(y: Float64Array, t: number): number;
}
```

Solver calls every registered hook after each accepted macro-step; if
any fails, it logs to the parent session's alert bus (`Helios.Agent:alert-bus`,
already shipped in v0.1) AND halves dt on the next step (cheap; same
mechanism used for tolerance retries).

This is ~30 lines on the solver side + a `Helios.Sim:conservation-hook`
node that lets the user define a hook from the graph. The
`Helios.Sim:conservation-monitor` node already shipped in v0.1 is the
diagnostic VIEWER; the hook is the SOLVER-LEVEL validator. Different
concerns, similar names — keep both.

---

## F8 — Snapshot / restore session state

Extend the existing `GraphItem.serialize/deserialize` (which already covers
`@cloneable` field round-trip) to ALSO cover Session state:

- `Session.serialize()`: returns `{ inputBuffers: {...}, linksReady: {...},
  graphItemStates: {...} }` keyed by node index. Internal Sessions of
  embedded sub-graphs are recursed via the existing IGraphNodeState path.
- `Session.deserialize(blob)`: re-establishes everything.
- Solver state (y, lastT) is just one more keyed entry — solver host nodes
  participate in the same protocol via `@cloneable`.

**Already shipped in v0.1**: `Helios.Sim:snapshot` / `Helios.Sim:restore`
nodes use a module-level registry as a placeholder. Once
`Session.serialize/deserialize` lands, they swap to using that. The node-
facing API doesn't change.

---

## F9 — Multi-rate scheduler (wrapper RuntimeGraph)

Multi-rate falls out of fractal composition for free: a sub-graph IS a
RuntimeGraph that internally runs `session.run(t)` once per parent macro-
tick. To run it K× per parent tick, the sub-graph's `fire()` just loops
K times:

```ts
// Helios.Sim:rate-group node — a tiny RuntimeGraph wrapper
@cloneable private _multiplier: number = 10;
public override fire(parentSession: ISession, t: number): void {
    const inner = this._routeInputsFromParent(parentSession);
    if (!inner) return;
    const dt = (t - this._lastT) / this._multiplier;
    for (let k = 1; k <= this._multiplier; k++) {
        inner.run(this._lastT + k * dt);
    }
    this._lastT = t;
    this._routeOutputsToParent(parentSession, inner);
}
```

A `Helios.Sim:rate-divider` (already shipped v0.1) handles the opposite
direction (sub-graph runs slower than parent). Together they cover the
four orders of magnitude of time-scale separation Helios needs.

---

## Open questions summary (just the live ones)

| ID | Question | My proposal |
|----|----------|-------------|
| Q1.1 | `stateSize` reactive or frozen? | Frozen at compile. |
| Q1.2 | rhs inputs: per-call resolve or per-macro-tick snapshot? | Snapshot per macro-tick. |
| Q1.3 | All stateful nodes migrate to IIntegrable, or coexist? | Coexist permanently. |
| Q3.1 | How does solver fire before its sibling integrables? | Wire `_started` → leaf control input in V1; scheduler-priority flag in V2. |
| Q3.2 | One solver per RuntimeGraph? | Yes — hierarchical solvers fall out naturally via sub-graph embedding. |
| Q3.3 | Snapshot of solver internal state? | Only `y` and `lastT`. |
| Q4.1 | Enthalpy on stream or computed? | Computed via helpers. |
| Q4.2 | Two-phase support? | V1 single-phase only. |
| Q4.3 | Stream as immutable per-tick object? | Yes. |

---

## Recommended implementation sequence (revised, smaller scope)

1. `sim.interfaces.ts` (new in core) — `IIntegrable` + `isIntegrable` guard.
   No new behaviour, types only.
2. `sim.chemical.ts` (new in core) — F4 stream type + helpers.
3. Add `"chemical"` to PortType union + connect-guard extension in
   nodeeditor/src/connection.ts.
4. `rk4-adaptive.solver.ts` (new in plugin-helios or core, TBD) — F3
   Phase 1, Cash-Karp adaptive (~150 LoC).
5. `Helios.Sim:rk4-solver` host node — wraps the solver as a graph node.
6. **Canary migration**: port `DcMotorDynamicNode` to `IIntegrable`.
   Side-by-side comparison: same graph run under the existing inline-Euler
   path vs. the new solver-driven path. Numerical equivalence required
   (within RK4 vs Euler accuracy gap — solver should be STRICTLY better).
7. `Helios.Sim:rate-group` node — F9 multiplier (rate-divider already shipped).
8. `Helios.Sim:conservation-hook` node — F7.
9. Then start chemistry: PEM electrolyser is the first IIntegrable leaf.
   Sabatier reactor is the stiffness test that justifies Phase 2 solver.

Steps 1–6: ~3 days. Step 7+8: 1 day. Steps 9+: chemistry sprint scope.

---

## Migration impact summary

| Component | Change | Risk |
|-----------|--------|------|
| `RuntimeGraph` | None (already fractal-capable) | — |
| `Session` | F8: add serialize/deserialize for input buffers + linksReady | Low — additive on existing GraphItem serialize |
| `IRuntimeNode` | None (trait is OPTIONAL via duck typing) | — |
| Existing motors | None unless migrated. Migration is per-motor and reversible. | Low |
| `PortType` union | Add `"chemical"` entry + species sub-check on connect | Low — additive |
| `OnnxGraphExporter` | Generalize from ComputeGraph to RuntimeGraph (separate work) | Medium — touches export pipeline |
| `GraphRunner` | None (solver is a node it dispatches like any other) | — |

The framework changes are surgical. Most work is **per-leaf**:
implementing `IIntegrable` on chemistry nodes as they're written.
