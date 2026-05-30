# Sim Framework v1 — API Design Draft

**Status**: draft for review. NOT implemented.
**Author**: Claude (acting agent), pour Guillaume.
**Date**: 2026-05-30.
**Scope**: TypeScript interfaces for F1 (`ISimNode.rhs`), F2 (`ISimGraph`),
F3 (`ISolver`), F4 (`IChemicalStream`). Implementation comes after sign-off.

This doc proposes concrete TS surfaces and flags the **open questions** where
your design intent (in `helios/isimgraph-v2-notes.fr.md`) admits multiple
valid implementations. Goal: read it in 20 minutes, mark up the open
questions, then I implement against the resolved design without architectural
backtracking.

---

## Design context (recap from your notes)

What `isimgraph-v2-notes.fr.md` already pins down, used as constraints here:

1. **Fractal composition**: `ISimGraph extends ISimNode`. A sub-graph is
   indistinguishable from a leaf node at the parent's port surface.
2. **Typed observation / action ports** on every `ISimNode`. They are the
   contract between Tier 0 (physics) and Tier 1+ (agents); agents read
   observations and write actions, never touch the underlying state.
3. **Solver phasing**: RK4 adaptive (own impl, ~150 lines) → Boost.odeint
   Rosenbrock4 → SUNDIALS IDA. The interface must let us swap without
   refactoring leaf nodes.
4. **Multi-species streams**: every process edge carries `T, P, ṁ,
   composition[H₂O, H₂, O₂, CO₂, CH₄, N₂]`. Composition is a closed mole-fraction
   vector (sums to 1) — invariant to be validated on the edge.
5. **Conservation as graph-level invariant**: per-species mass, per-resource
   energy, total Ni inventory. Checked post-step, not at any individual node.
6. **Determinism via seed**: every RNG explicitly seeded; same graph + same
   config + same seed → bit-exact replay.

What is NOT decided yet, and where this draft makes a proposal you can override:
- exact `rhs` signature (state-vector flattening strategy)
- how the SimGraph's outer state vector is composed from children
- how typed ports relate to runtime channels in the existing scheduler
- where solver lives (host node vs runtime mode vs both)
- how the multi-species composition is enforced at port-connect time

---

## F1 — `ISimNode.rhs` contract

### Proposed interface

```ts
// packages/dev/core/src/sim/sim.interfaces.ts (new file)

import type { ISession, IRuntimeNode } from "../execution/execution.interfaces";

/**
 * A simulation node exposes a continuous-time RHS in addition to the
 * existing event-driven `fire()` from IRuntimeNode. The solver reads
 * `stateSize` to allocate the global state vector, calls `rhs(t, y, dydt)`
 * to fill the derivative, and reads back via the leaf's `gatherState` /
 * `writeState`. RuntimeNode stays the parent interface so a SimNode can
 * also participate in the discrete scheduler (Tier 0 publishes observations
 * to Tier 1 every macro-tick).
 */
export interface ISimNode extends IRuntimeNode {
    /** Size of this node's local state vector. 0 for stateless nodes
     *  (mixers, splitters, pure observers). Solver uses this to compute
     *  the global state layout. */
    readonly stateSize: number;

    /** Names of state-vector entries (length === stateSize). Used by
     *  diagnostic tools (DMD, conservation monitors, linearization)
     *  to label rows. Optional but strongly recommended. */
    readonly stateNames?: ReadonlyArray<string>;

    /** Write this node's current local state into the slice
     *  y[offset..offset+stateSize) of the global state vector.
     *  Called by the solver at the start of every step and at restore. */
    gatherState(y: Float64Array, offset: number): void;

    /** Read this node's state back from y[offset..) into its own fields.
     *  Called by the solver at the end of every accepted step. */
    writeState(y: Float64Array, offset: number): void;

    /** Compute the time derivative of this node's state at time t,
     *  reading inputs from `inputs` (a typed view derived from the
     *  node's observation ports) and writing into the slice
     *  dydt[offset..offset+stateSize). Pure: same args → same output. */
    rhs(t: number, y: Float64Array, offset: number, inputs: ISimInputs, dydt: Float64Array): void;

    /** Sample observation values at time t. Returns a snapshot that
     *  Tier 1 agents can read between solver macro-steps. Cheap;
     *  called once per macro-tick, not per micro-step. */
    sampleObservations(t: number, y: Float64Array, offset: number): ISimObservations;

    /** Receive an action request (typed by port). Implementations
     *  typically just stash the value into a private field that `rhs`
     *  reads on the next step. Multiple agents writing the same action
     *  are merged upstream by an Arbitrator. */
    applyAction(name: string, value: unknown): void;
}

/** Inputs handed to `rhs`: the upstream-node port values that this node
 *  depends on, indexed by input port name. Resolved by the solver from
 *  the graph topology before calling rhs. */
export interface ISimInputs {
    get(portName: string): unknown;
    has(portName: string): boolean;
}

/** Observations are typed values: { portName → snapshot }. The runtime
 *  bridge from sampleObservations() into the existing scheduler's
 *  publish/consume happens once per macro-tick. */
export type ISimObservations = ReadonlyMap<string, unknown>;
```

### Rationale

- **`rhs` takes a slice of the global y, not its own private state vector**.
  Reason: the solver wants ONE contiguous array for SIMD-friendly stepping
  and easy vectorized operations (Jacobian by finite-diff, etc.). The
  `offset` argument is the leaf's known-fixed position in the global layout,
  computed once at graph compile and frozen.
- **`gatherState` / `writeState` separated from `rhs`**: lets the solver
  load state once per macro-step (not per RHS evaluation). RK4 calls
  `rhs` 4 times per step but `writeState` once.
- **`sampleObservations` ≠ `rhs`**: agents and dashboards want observation
  snapshots at macro-rate (10–100 Hz); the solver may take 10000 micro-steps
  per macro-tick. Don't pay for full observation conversion on each micro-step.
- **`applyAction` is a setter, not a port write**: agents publish to action
  ports via the existing scheduler (Tier 1 fires after Tier 0); the SimNode
  just latches the latest value. Keeps the solver path side-effect-free.

### Open questions

- **Q1.1**: should `stateSize` be reactive (change with editable changes,
  e.g. nfft) or frozen at compile? Proposal: frozen. Topology edits trigger
  recompile.
- **Q1.2**: do we need `jacobian(t, y, offset, J)` on the leaf, or always
  finite-difference? Proposal: optional override (`hasAnalyticJacobian:
  boolean`); finite-diff fallback. Important when SUNDIALS arrives.
- **Q1.3**: what's the canonical `ISimInputs` shape? Proposal: `ReadonlyMap`
  for simplicity. Performance escape hatch later if measured a problem.

---

## F2 — `ISimGraph extends ISimNode`

### Proposed interface

```ts
// same file

/**
 * A SimGraph IS a SimNode whose state vector is the concatenation of
 * its children's state vectors, and whose rhs delegates to each child's
 * rhs after threading inputs through the internal topology.
 *
 * From the OUTSIDE (a parent SimGraph or a top-level solver), it is
 * indistinguishable from a leaf node — same ports, same rhs surface,
 * same stateSize.
 *
 * From the INSIDE, it owns child SimNodes + internal channels + a
 * resolved topological order for RHS evaluation.
 */
export interface ISimGraph extends ISimNode {
    /** Read-only view of the contained children. */
    readonly children: ReadonlyArray<ISimNode>;

    /** Read-only view of internal channels (excludes the graph's own
     *  external ports). */
    readonly internalChannels: ReadonlyArray<ISimChannel>;

    /** Map external port → internal target (which child port is it
     *  exposed from). The "port projection" that lets the parent see
     *  this graph as a leaf. */
    portMap(): ReadonlyMap<string, { childIdx: number; childPort: string }>;

    /** Pre-computed topological order for RHS evaluation. The solver
     *  evaluates child rhs's in this order, threading outputs as inputs
     *  along the way. Cycles in input deps require a fixed-point or
     *  DAE solver (deferred to F3 phase 3). */
    readonly evalOrder: ReadonlyArray<number>;
}

/** Internal channel connecting two children's ports inside a SimGraph. */
export interface ISimChannel {
    readonly fromChildIdx: number;
    readonly fromPort: string;
    readonly toChildIdx: number;
    readonly toPort: string;
    /** When set, the channel carries an IChemicalStream payload and the
     *  port-connect guard validated species compatibility. */
    readonly streamType?: "scalar" | "chemical" | "tensor" | "any";
}
```

### Rationale

- **Composition, not inheritance of state arrays**. The SimGraph's state
  vector is *layout* (offsets into a parent-owned buffer), not its own
  array. This keeps allocation centralized at the top-level solver.
- **`portMap` makes "graph as leaf" explicit**. Without it, port projection
  is implicit and changes to a child's port set silently break the parent's
  wiring. With it, the projection is a first-class object the editor can
  validate.
- **`evalOrder` is precomputed**: cheap topological sort at graph compile,
  reused for every solver step. Acyclic graphs only in v1; cycles → DAE
  (phase 3 work).

### Open questions

- **Q2.1**: state-vector layout — should children's slices be **contiguous**
  (cache-friendly, simpler offsets) or **interleaved by tier** (better for
  multi-rate splits)? Proposal: contiguous in v1; revisit when multi-rate
  scheduling lands.
- **Q2.2**: how does a SimGraph package as ONNX (F5)? Proposal: emit the
  flattened RHS as a graph of basic math ops (Add/Mul/Exp/...) — ONNX has
  these. The SimGraph wrapper becomes a `Loop` op for the time-stepping
  and the children's RHS becomes the subgraph body. **Big open question**;
  this might be the right place to use ONNX `Scan` instead. Needs separate
  spike before commitment.
- **Q2.3**: should `ISimGraph` own its own solver? Proposal: NO. The solver
  is a host concern (one per top-level simulation), passed down. A
  SimGraph-as-leaf inherits its parent's solver implicitly.

---

## F3 — `ISolver` abstraction

### Proposed interface

```ts
// same file

export interface ISolverStep {
    /** Accepted step time. */
    t: number;
    /** Wall-clock micro-step size actually taken (≤ requested dt). */
    dtTaken: number;
    /** Estimated local error norm for the accepted step. Mostly for diagnostics. */
    errorEstimate: number;
    /** Number of RHS evaluations spent on this step (RK4 = 4; adaptive
     *  may be 6 + retries). For perf budget tracking. */
    rhsEvals: number;
}

export interface ISolver {
    readonly name: string;

    /** Setup phase: solver allocates internal buffers sized to the graph.
     *  Called once per session start. */
    initialize(graph: ISimGraph, y0: Float64Array, t0: number): void;

    /** Advance the simulation by at most `dt` seconds. Adaptive solvers
     *  may take multiple internal micro-steps; the function returns when
     *  total wall-clock elapsed = `dt` (or less if the solver hit an
     *  error budget cap). Returns the step record for diagnostics.
     *  Writes results into the provided y buffer. */
    step(graph: ISimGraph, y: Float64Array, t: number, dt: number): ISolverStep;

    /** Optional: per-species / per-resource invariant validator hook.
     *  Solver calls every conservation monitor in the graph after each
     *  accepted step; if any throws, the step is rejected and dt halved. */
    setConservationHooks?(hooks: ReadonlyArray<IConservationHook>): void;

    /** Optional analytical Jacobian path — solver asks the graph if any
     *  child has `hasAnalyticJacobian: true`, falls back to finite-diff
     *  for the rest. Only meaningful for implicit / stiff solvers. */
    readonly supportsJacobian: boolean;

    dispose?(): void;
}

export interface IConservationHook {
    /** Human-readable name for the diagnostic display. */
    readonly name: string;
    /** Compute the conserved quantity from the state vector. */
    eval(y: Float64Array, t: number): number;
    /** Tolerance — when |current - initial| > tolerance, the hook fails. */
    readonly tolerance: number;
    /** Comparison mode: absolute drift vs relative drift. */
    readonly mode: "absolute" | "relative";
}

// Three implementations to plan for, ranked by deployment phase:
//
//   RK4Solver         (Phase 1)  ~150 LoC, fixed step or Cash-Karp adaptive
//   RosenbrockSolver  (Phase 2)  Rosenbrock4, wraps Boost.odeint via wasm
//                                or pure-TS implementation (~600 LoC)
//   SundialsSolver    (Phase 3)  C-binding to SUNDIALS IDA, only when
//                                DAE or sensitivity analysis needed
```

### Rationale

- **`step(graph, y, t, dt)` not `step(graph, dt)`**: state buffer is
  owned by the caller (GraphRunner), passed in. Lets the same solver
  instance run multiple graphs or snapshot/restore between steps.
- **Conservation hooks at solver level**: gives the solver the chance to
  REJECT a step on conservation drift and retry with smaller dt. This is
  the same retry mechanism it already uses for error tolerance — same
  knob, two failure modes.
- **`supportsJacobian` boolean**: lets the solver advertise its needs.
  RK4 doesn't need a Jacobian; SUNDIALS does; pick the right combination
  at runtime.

### Open questions

- **Q3.1**: where does the solver live in the editor — as a runtime "host
  node" (visible in the graph) or as a property of the SimGraph itself
  (invisible)? Proposal: **host node** for v1 (`Helios.Sim:rk4-solver`).
  Pros: solver becomes a first-class editable object (set tolerance,
  max dt, etc. from property panel). Cons: every top-level sim needs to
  drop a solver node. Acceptable cost.
- **Q3.2**: relationship with the existing `GraphRunner.fixed-realtime`
  mode? Proposal: GraphRunner stays the scheduler for discrete-event /
  agent layer; the SOLVER does the continuous integration BETWEEN GraphRunner
  ticks. Every macro-tick = solver runs for `1/simRate` seconds, taking N
  internal adaptive steps.
- **Q3.3**: solver state for snapshot/restore? Proposal: solver state is
  ONLY `y` and `t`. Adaptive solvers' internal `dt` recommendation is
  reset to default on restore — restart is robust to initial step size
  by definition.

---

## F4 — `IChemicalStream` port type

### Proposed type

```ts
// packages/dev/core/src/sim/sim.chemical.ts (new file)

/**
 * Closed-form multi-species stream descriptor. Used as the payload type
 * on every chemical-process channel. Composition is a CLOSED mole-fraction
 * vector — values sum to exactly 1 within tolerance. Enforced at edge
 * construction time and validated by ConservationMonitor at each step.
 */
export interface IChemicalStream {
    /** Mass flow rate (kg/s). */
    readonly mdot: number;
    /** Stream temperature (K). */
    readonly T: number;
    /** Stream pressure (Pa). */
    readonly P: number;
    /** Mole-fraction composition. Map species → fraction in [0, 1].
     *  ALL species this stream is allowed to carry must be present even
     *  if zero — this fixes the species schema at graph compile and lets
     *  the connect-time validator reject mismatched edges. */
    readonly composition: ReadonlyMap<ChemicalSpecies, number>;
}

/** Helios V1 species set. Extensible: ISRU sprint adds more (Ni, zeolite
 *  framework constituents). */
export type ChemicalSpecies = "H2O" | "H2" | "O2" | "CO2" | "CH4" | "N2" | "Ar" | "He";

/** Compile-time mass-balance helper — sums composition × mdot per species.
 *  Used by ConservationMonitor to compute per-species drift across a
 *  closed loop. */
export function speciesFlow(stream: IChemicalStream, species: ChemicalSpecies): number {
    return (stream.composition.get(species) ?? 0) * stream.mdot;
}

/** Validate that composition is a probability distribution.
 *  Strict: |sum - 1| < 1e-9. */
export function validateComposition(composition: ReadonlyMap<ChemicalSpecies, number>): boolean {
    let s = 0;
    for (const v of composition.values()) { if (v < 0) return false; s += v; }
    return Math.abs(s - 1) < 1e-9;
}
```

### Port-type integration

Add `"chemical"` to the existing port-type union (currently `"float" | "tensor" | "vec3" | "vec4" | "matrix44" | "boolean" | "trigger" | "any" | "array"`). The connect-guard in `GraphViewer.connect` extends the type check:

```ts
// rough pseudocode for the new guard
if (fromPort.type === "chemical" && toPort.type === "chemical") {
    // both endpoints declare the SAME species set on their port descriptor
    // (declared at port registration time, e.g. ["H2O", "H2", "CO2", "CH4"])
    if (!speciesSetsCompatible(fromPort.species, toPort.species)) {
        rejectConnection("incompatible species set");
    }
}
```

### Rationale

- **Composition as a closed map** (not an open object): mole fractions sum to 1, missing species are explicit zeros, no "did I forget H2O?" bugs.
- **Species enum is small and stable**: 6–8 species cover everything in your PFD. Open enum (string) would lose the compile-time check; closed union keeps refactoring safe.
- **Port-side schema**: each port declares its species set; connect-time guard checks the species set is compatible. Catches "oh I wired the O2 line into the CO2 inlet" at design time, not at runtime.

### Open questions

- **Q4.1**: enthalpy / specific heat — track on the stream, or compute on
  demand from `T` + composition + a species-property table? Proposal: per
  the latter (don't denormalize). Add `enthalpy(stream)`, `cp(stream)`
  helpers backed by a property table at module level.
- **Q4.2**: what about phase (gas vs liquid vs two-phase)? Proposal: V1
  assumes single-phase gas; two-phase comes with the knockout drum (V-701)
  and may need an explicit `phase: "gas" | "liquid" | "two-phase"` flag
  on the stream then. **Defer to first two-phase node implementation.**
- **Q4.3**: how is `IChemicalStream` produced by an event-driven Source
  node? Proposal: same as any other tensor — node publishes a fresh
  immutable object each tick. Cheap (no big allocation per stream), GC
  pressure manageable.

---

## Open questions summary (answer these to unblock implementation)

| ID | Question | My proposal | Your call |
|----|----------|-------------|-----------|
| Q1.1 | `stateSize` reactive or frozen? | Frozen at compile | |
| Q1.2 | Analytic Jacobian or always finite-diff? | Optional override + FD fallback | |
| Q1.3 | `ISimInputs` shape | `ReadonlyMap` | |
| Q2.1 | State layout contiguous or tier-interleaved? | Contiguous v1 | |
| Q2.2 | ONNX export: `Loop` op or `Scan` op? | Spike needed | |
| Q2.3 | SimGraph owns solver? | No, parent passes | |
| Q3.1 | Solver as host node or invisible? | Host node | |
| Q3.2 | Solver vs GraphRunner roles | Solver between macro-ticks | |
| Q3.3 | Solver state in snapshot? | Only `y, t` | |
| Q4.1 | Enthalpy on stream or computed? | Computed via helpers | |
| Q4.2 | Phase tracking? | Single-phase v1, defer | |
| Q4.3 | Stream as immutable per-tick object? | Yes | |

---

## Recommended implementation sequence after sign-off

1. **`sim.interfaces.ts`** (new) — F1 interfaces. No new behavior; just types.
2. **`sim.chemical.ts`** (new) — F4 stream type + helpers.
3. **Port-type guard extension** in `connection.ts` — F4 connect-time check.
4. **`sim.graph.ts`** (new) — F2 SimGraph wrapper, topological sort, port projection.
5. **`rk4.solver.ts`** (new) — F3 Phase 1 (Cash-Karp adaptive, ~150 LoC).
6. **`Helios.Sim:rk4-solver` host node** registration.
7. **First leaf SimNode** — port one existing motor node (DC motor, you have it) to the new contract as the canary.
8. **End-to-end smoke test**: graph with one DC motor under the RK4 solver, vs the same motor under the legacy fixed-step runner. Numerically equivalent traces required.
9. THEN start chemistry nodes. Sabatier reactor is the first stiff test
   (probably forces Phase 2 solver upgrade).

Steps 1–6 are ~3-5 days. Step 7 is ~1 day. Step 8 catches regressions before chemistry work begins.

---

## Things NOT in this doc that need separate decisions later

- **F5 ONNX export**: depends on Q2.2 spike.
- **F6 Agent runtime layer**: subsumption arbitration policies, agent
  lifecycle, hot-reload semantics. Independent decision tree.
- **F8 Snapshot/Restore**: largely "use existing GraphItem.serialize/deserialize
  on the global y vector plus solver t"; concrete file format to bikeshed.
- **F9 Multi-rate scheduler**: depends on solver maturity. Premature now.

These remain on the roadmap but should not block F1–F4 from landing.
