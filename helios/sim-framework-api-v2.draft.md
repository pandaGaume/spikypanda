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

## F3 — Solver attached to Session (marker-node pattern)

### Architecture: solver is a Session concern, surfaced via a marker node

Earlier drafts placed the solver as a host node in the graph that did
its integration work in `fire()`. That created an ordering problem
("must fire before sibling IIntegrable leaves") solved by ugly
`_started` wiring or invasive scheduler-priority flags.

The solver is fundamentally NOT a data-flow node:
- It consumes no input tokens (in the standard scheduler sense)
- It publishes no output tokens
- Its job is to drive the **integration phase** *between* dispatches of
  the fire-loop

So it belongs on the **Session**, alongside `simRate` and `running`.
`Session.run(t)` becomes a two-phase orchestration:

1. **Integration phase**: every attached solver advances its owned
   IIntegrable leaves by `dt`, taking N internal adaptive micro-steps.
2. **Dispatch phase**: the normal `Scheduler.RunDynamic` fire-loop. By
   the time IIntegrable leaves' `fire()` runs, their state has already
   been updated by the solver; `fire()` becomes pure I/O (read updated
   state, publish observation outputs, latch action-port writes).

The solver still has a **graph representation** — a marker node —
*purely for editability + serialization*. The marker doesn't perform
integration in its `fire()`; it only registers/unregisters the solver
with the session and publishes diagnostic viewables (rhsEvals,
microSteps, maxError).

### Session API additions

```ts
// packages/dev/core/src/execution/execution.interfaces.ts

export interface ISession {
    // existing
    readonly graph: IRuntimeGraph;
    readonly nodeStates: ReadonlyArray<INodeState>;
    simRate: number;
    running: boolean;
    // ... rest unchanged ...

    // NEW: solver attachment
    readonly solvers: ReadonlyArray<ISolver>;
    attachSolver(solver: ISolver, leaves?: ReadonlyArray<IIntegrable>): void;
    detachSolver(solver: ISolver): void;
}

// Concrete Session.run becomes two-phase:
public run(t: number): void {
    const dt = t - this._lastT;
    this._lastT = t;

    // Phase 1 — integration. Each attached solver advances its owned
    // leaves by dt. Solvers are independent: a Session can carry one
    // RK4 for fast/non-stiff plus one Rosenbrock for stiff Sabatier
    // chemistry, partitioned by leaf typeId filter.
    for (const solver of this._solvers) {
        solver.step(dt, this);
    }

    // Phase 2 — dispatch. Standard data-flow fire-loop. IIntegrable
    // leaves' fire() now sees already-updated state and just publishes
    // their observation outputs.
    if (this.graph.mode === "dynamic") {
        Scheduler.RunDynamic(this, t);
    } else if (this.graph.mode === "static") {
        Scheduler.RunStatic(this, t);
    }
}
```

### Solver interface (simpler than before)

```ts
// packages/dev/core/src/sim/sim.interfaces.ts

export interface ISolverStep {
    readonly t: number;
    readonly microSteps: number;
    readonly maxError: number;
    readonly rhsEvals: number;
}

export interface ISolver {
    readonly name: string;
    readonly supportsJacobian: boolean;

    /** Hook the solver to a session-aware leaf set. Called by
     *  session.attachSolver(). The solver caches each leaf's offset
     *  into its private state vector. */
    initialize(leaves: ReadonlyArray<IIntegrable>, t0: number): void;

    /** Advance the owned state vector by `dt`. Reads inputs by walking
     *  the parent session's linkStates for each leaf. */
    step(dt: number, session: ISession): ISolverStep;

    /** Optional diagnostic accessor: last step's stats, for the marker
     *  node to surface as viewables. */
    readonly lastStep: ISolverStep | null;

    dispose?(): void;
}
```

### The marker node (choice B)

```ts
// packages/dev/plugins/helios/src/sim/rk4-solver.node.ts

@cloneable private _tolerance:  number = 1e-6;
@cloneable private _maxStep:    number = 1e-2;   // 10 ms cap
@cloneable private _leafFilter: string = "*";    // glob on leaf typeId

private _solver: RK4AdaptiveSolver | null = null;

@viewable("number") public get lastMicroSteps(): number { return this._solver?.lastStep?.microSteps ?? 0; }
@viewable("number") public get lastMaxError():  number { return this._solver?.lastStep?.maxError  ?? 0; }
@viewable("number") public get rhsEvalsTotal(): number { return this._rhsEvalsTotal; }

public override reset(session: ISession): void {
    // Discover owned IIntegrable leaves (filtered by _leafFilter glob).
    const owned = (session.graph.nodes as ReadonlyArray<IRuntimeNode>)
        .filter(isIntegrable)
        .filter((n) => matchesGlob(typeIdOf(n), this._leafFilter));

    // Detach previous instance if any (handles reset-mid-session).
    if (this._solver) session.detachSolver(this._solver);

    this._solver = new RK4AdaptiveSolver({
        tolerance: this._tolerance,
        maxStep:   this._maxStep,
    });
    session.attachSolver(this._solver, owned);
}

public override fire(session: ISession, _t: number): void {
    // NO integration here. The Session ran solver.step() in Phase 1,
    // before any node's fire() got dispatched in Phase 2. We're only
    // here to publish live diagnostics to downstream observers.
    if (!this._solver?.lastStep) return;
    const s = this._solver.lastStep;
    this._rhsEvalsTotal += s.rhsEvals;
    // Optional broadcast on a "stats" output port for dashboard tiles.
}

public override dispose(): void {
    // Detach from any still-active sessions.
    if (this._solver) {
        for (const session of this._activeSessions()) session.detachSolver(this._solver);
        this._solver = null;
    }
}
```

**What the marker gives us:**
- **Editability**: `tolerance`, `maxStep`, `leafFilter` in the property panel.
- **Serialization**: solver config round-trips with the graph save.
- **Diagnostics**: `lastMicroSteps`, `lastMaxError`, `rhsEvalsTotal` as
  viewables; the user drops a Time-series Plot tile bound to one of
  these to see the solver's behaviour live.
- **Visual presence**: the user SEES which graph regions have solvers
  attached, and which leaf subset each one owns (via `leafFilter`).
- **No scheduling pollution**: the integration phase is Session-level,
  not a node-fire that needs ordering coordination.

### Multi-solver and hierarchical solvers fall out for free

**Multi-solver split by time scale**:

```
Graph
 ├─ RK4Solver        (leafFilter: "Physics.Electric.*")    fast / non-stiff
 ├─ RosenbrockSolver (leafFilter: "Helios.Process.*")      stiff Sabatier kinetics
 └─ EulerSolver      (leafFilter: "Helios.Catalyst:*")     slow aging (days)
```

Three marker nodes in the same graph, each attaches its own solver to
the session with a disjoint leaf subset. The integration phase runs
them in order; non-overlapping leaf sets means they don't fight.

**Hierarchical solvers via fractal sub-graph**:

```
Parent Session
 ├─ attached: RK4Solver  (1 ms macro-step on parent leaves)
 └─ SubGraph (RuntimeGraph)
      └─ Internal Session  (owned by IGraphNodeState, existing infra)
           └─ attached: RosenbrockSolver  (10 µs micro-step on sub-graph leaves)
```

Each child `RuntimeGraph` already has its own `internalSession` via
`IGraphNodeState` (existing infra). Drop a marker in the sub-graph and
it attaches to THAT internal session — no special hierarchical-solver
code path needed.

### Phased implementation (unchanged from v1)

| Phase | Solver | When |
|-------|--------|------|
| 1 | RK4 Cash-Karp / Dormand-Prince (own impl, ~150 LoC) | First Helios sprint. Validates the IIntegrable + Session-attach contract end-to-end. |
| 2 | Rosenbrock4 (own impl ~600 LoC, or pure-TS port of Boost.odeint) | When Sabatier kinetics force stiffness > 10⁴ |
| 3 | SUNDIALS IDA/CVODES (WASM build) | When DAE or sensitivity analysis needed |

### Open questions

| # | Question | Proposal |
|---|----------|----------|
| ~~Q3.1~~ | ~~How does the solver fire before its IIntegrable siblings each macro-tick?~~ | **RESOLVED by Session-level attachment**: the integration phase precedes the dispatch phase; no node-order coordination needed. |
| Q3.2 | How are leaves partitioned across multiple solvers in the same session? | Glob filter on leaf typeId (matches the existing palette `Theme.Sub:node` taxonomy). Marker editable. Default = catch-all `"*"`. Overlapping filters: first-attached wins (deterministic), warn on conflict. |
| Q3.3 | Snapshot of solver internal state? | Only `y` and `lastT`. Adaptive `dt` recommendation reseeds from scratch on restore. |
| Q3.4 | What does the marker node's `fire()` do? | Refresh diagnostic viewables (cheap, idempotent). Optionally broadcast on a `stats` output port for dashboard tiles. NEVER does integration work. |
| Q3.5 | Where does `attachSolver` get persisted in serialize/save? | NOT persisted directly. The marker node IS persisted (via existing GraphItem.serialize), and on session start its `reset()` re-attaches. State is fully derived. |

---

## F4 — `IChemicalStream` port type (industrial-grade)

The v2 draft proposed a thin closed-union (`"H2O" | "H2" | ... | "He"`)
with a single-phase `{ mdot, T, P, composition }` shape. **Superseded.**
A canonical design lands closer to industrial process simulators
(Aspen Plus / ProSim / DWSIM) and removes three structural ceilings:

1. **Open species registry** instead of closed union — research
   extensibility (ISRU adds species, biology adds metabolites,
   electrochemistry adds ions) without core enum churn.
2. **Multi-phase first-class** — `phases: IPhaseState[]`. Knockout
   drum / condenser / cryo trap decompose into N IPhaseState entries
   instead of needing a discriminator flag.
3. **Composition basis** (`molar` / `mass` / `volume`) per phase —
   gas-chromatography sensors emit molar, gravimetric ones emit mass,
   volumetric flow meters emit volume; supporting all three kills the
   bug-prone conversion layer.

### Canonical interface

Lives at `packages/dev/core/src/sim/sim.chemical.ts`. Type-only summary:

```ts
export type ChemicalSpeciesId = string;
export type PhaseKind = "gas" | "liquid" | "solid" | "aqueous"
                      | "plasma" | "supercritical" | "mixed" | "unknown";
export type CompositionBasis = "molar" | "mass" | "volume";
export type PressureBasis = "absolute" | "gauge";

export interface IChemicalSpecies {
    readonly id: ChemicalSpeciesId;
    readonly name: string;
    readonly formula: string;
    readonly molarMass: number;          // kg/mol
    readonly casNumber?: string;
    readonly aliases?: readonly string[];
}

export interface IComposition {
    readonly basis: CompositionBasis;
    readonly fractions: ReadonlyMap<ChemicalSpeciesId, number>;
}

export interface ISpeciesState {
    readonly speciesId: ChemicalSpeciesId;
    // any-subset of the following may be present
    readonly moleFraction?: number;
    readonly massFraction?: number;
    readonly volumeFraction?: number;
    readonly partialPressure?: number;    // Pa
    readonly activity?: number;
    readonly fugacity?: number;            // Pa
    readonly concentration?: number;       // mol/m³
    readonly molality?: number;            // mol/kg
    readonly massFlow?: number;            // kg/s
    readonly molarFlow?: number;           // mol/s
}

export interface IThermodynamicState {
    readonly temperature?: number;         // K
    readonly pressure?: number;            // Pa
    readonly pressureBasis?: PressureBasis;
    readonly density?: number;             // kg/m³
    readonly viscosity?: number;           // Pa·s
    readonly enthalpy?: number;
    readonly entropy?: number;
    readonly internalEnergy?: number;
    readonly energyBasis?: "mass" | "molar";
    readonly vaporFraction?: number;
    readonly liquidFraction?: number;
    readonly solidFraction?: number;
    readonly pH?: number;
    readonly ionicStrength?: number;
    readonly conductivity?: number;
}

export interface IPhaseState {
    readonly id?: string;
    readonly kind: PhaseKind;
    readonly state: IThermodynamicState;
    readonly composition: IComposition;
    readonly species?: ReadonlyMap<ChemicalSpeciesId, ISpeciesState>;
    readonly massFlow?: number;            // kg/s (this phase)
    readonly molarFlow?: number;           // mol/s
    readonly volumetricFlow?: number;      // m³/s
    readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface IChemicalStream {
    readonly id?: string;
    readonly name?: string;
    readonly phases: readonly IPhaseState[];
    readonly totalMassFlow?: number;
    readonly totalMolarFlow?: number;
    readonly totalVolumetricFlow?: number;
    readonly state?: IThermodynamicState;     // mixed-phase aggregate (optional)
    readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface IAtmospherePreset {
    readonly id: string;
    readonly name: string;
    readonly description?: string;
    readonly stream: IChemicalStream;
}
```

**Module-level data**:

- `Species` — `{ H2O, H2, O2, ..., Cellulose }` enum-style id table.
  Open: anyone can extend with their own ids.
- `SpeciesRegistry` — `Readonly<Record<string, IChemicalSpecies>>`
  with formula, name, molarMass for ~60 baseline species (atmospheric
  gases, hydrocarbons, NOx/SOx, acids, bases, salts, common ions,
  bio-feedstocks).
- `AtmospherePresets` — `Readonly<Record<string, IAtmospherePreset>>`
  with Earth (dry/humid sea-level), Mars, Venus, Titan, Jupiter.
  Directly composable with `Physics.Scene` presets (see Q4.6 below).

**Helpers** (all in the same file):

```ts
validateComposition(c, tolerance?)         → boolean
getSpeciesFraction(c, speciesId)            → number
getSpeciesMolarMass(speciesId, registry?)   → number | undefined
averageMolarMass(c, registry?)              → number | undefined  // molar basis only
speciesPartialPressure(phase, speciesId)    → number | undefined
speciesMolarFlow(phase, speciesId)          → number | undefined
speciesMassFlow(phase, speciesId, registry?) → number | undefined
makeGasPhaseFromMolarFractions(params)      → IPhaseState  // builder for the common case
```

### Port-type integration

Add `"chemical"` to the `PortType` union. The connect-guard becomes a
**capabilities check**, not a closed-set comparison:

```ts
if (fromPort.type === "chemical" && toPort.type === "chemical") {
    // Receiver must accept every species the producer can emit.
    if (!coversSpecies(toPort.species, fromPort.species)) {
        rejectConnection("receiver missing producer species");
    }
    // Composition basis may differ — auto-converter inserted at runtime.
    // See Q4.5.
}
```

`PortDescriptor` gains:
```ts
readonly species?: ReadonlyArray<ChemicalSpeciesId>;  // declared schema (open)
readonly phases?:  ReadonlyArray<PhaseKind>;          // accepted phase kinds
readonly basis?:   CompositionBasis;                  // preferred composition basis
```

### How it interlocks with the rest of v2

- **F1 IIntegrable**: `ProcessUnitNode.rhs` receives upstream
  `IChemicalStream` snapshots via `IIntegrationInputs.get(portName)`.
  Helpers (`speciesMolarFlow`, `speciesPartialPressure`) read those
  directly — no per-leaf de-structuring boilerplate.
- **F6 meta-node**: `ProcessUnitNode` declares chemical-stream ports
  with `species` + `phases` arrays; mid-tier classes (Reactor /
  Scrubber / HeatExchanger / Separator) operate on `IPhaseState[]`
  natively. Two-phase nodes (KnockoutDrum, Condenser) stop being a
  special case — they just write 2 entries to `phases[]`.
- **F7 conservation hooks**: per-species mass-balance becomes
  per-species across phases (sum `speciesMassFlow` over inputs vs
  outputs across `IPhaseState[]`). Energy-balance reads
  `IThermodynamicState.enthalpy` directly when present, computes
  via species cp tables when absent.
- **Q6.2 (`IHeatStream` separate port?)**: with `IThermodynamicState`
  carrying enthalpy + entropy + internalEnergy + energyBasis, heat
  can be transported INSIDE the chemical stream natively. The
  separate-port question becomes less urgent — defer to Helios Sprint 2
  unless heat-integration network (HEN) optimisation specifically
  requires it.
- **AtmospherePresets ↔ Physics.Scene**: the existing 4 scene presets
  (Earth/Moon/Mars/Orbital) carry `gravity` + `temperature` + `pressure`
  scalars. They should LINK to the matching atmosphere preset for
  composition data when a chemical pipeline needs it. See Q4.6.

### Open questions (revised)

| # | Question | Proposal |
|---|----------|----------|
| ~~Q4.1~~ | ~~Track enthalpy on stream or compute?~~ | **RESOLVED** — `IThermodynamicState.enthalpy` is optional; carry when known, compute when absent. |
| ~~Q4.2~~ | ~~Two-phase support?~~ | **RESOLVED** — `phases: IPhaseState[]` is first-class. No phase flag needed. |
| ~~Q4.3~~ | ~~Stream as immutable per-tick object?~~ | **RESOLVED** — `readonly` everywhere in the interface. |
| Q4.4 | **Species registry extensibility at runtime** — can the user add custom species (Ni, zeolite framework, biology metabolites) without recompiling core? | Yes. `SpeciesRegistry` is `Readonly<Record<string, IChemicalSpecies>>` but a `registerSpecies(spec)` helper plus a user-extensible mirror map gives runtime registration. Helpers take an optional `registry` arg already — user passes their own. |
| Q4.5 | **Composition basis mismatch on connect** — should `molar` ↔ `mass` connections auto-convert via molar mass, or require matching basis? | Auto-convert when both endpoints declare a single basis preference AND molar masses are known for every species. Falls back to "incompatible" otherwise (with diagnostic message naming the missing molarMass entry). |
| Q4.6 | **AtmospherePresets ↔ `Physics.Scene` presets** — should `Physics.Scene:earth` source its atmosphere from `AtmospherePresets.earthHumidAirSeaLevel`, or stay independent? | Source. Add an `atmosphere?: IChemicalStream` field to `IScene` interface; scene preset constants build it from `AtmospherePresets.<id>`. A chemistry pipeline can then read its inlet composition directly off the active scene without manual configuration. |
| Q4.7 | **`IChemicalStream.state` (mixed-phase aggregate)** — when phases is length >1, is `state` mandatory, computed from per-phase states, or left to leaf nodes? | Optional. When present, used by viz tiles as a "bulk" readout. When absent, viz computes mass-weighted avg from `phases[*].state`. Producers fill it when meaningful (single-phase, or stable equilibrium); leave undefined when not (transient two-phase flash). |

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

## F6 — Process-unit meta-node hierarchy

The chemistry plant has ~12 leaves (Sabatier reactor, PEM electrolyzer,
amine scrubber, cryo scrubber, condenser, knockout drum, separator, PSA
purifier, mixer, compressor, dryer, buffer). Implementing each from
scratch is ~3 weeks of glue code — chemical-stream I/O, mass balance,
energy balance, holdup state, fault hooks — duplicated N times.

Mirror the existing `RuntimeNode → TransformNode → FaultableNode → Motors`
inheritance the electric domain uses. For chemistry:

```
RuntimeNode
  └─ ProcessUnitNode              IChemicalStream I/O + mass/energy balance
                                  + holdup state + IIntegrable + auto-
                                  registered conservation hooks + FaultableNode-
                                  style variadic `fault_N` slots
        │
        ├─ ReactorNode             catalyst-activity state, Arrhenius helper,
        │                          heat-of-reaction helper, conversion as state
        │     ├─ SabatierReactor    CO₂ + 4 H₂ → CH₄ + 2 H₂O (R-601)
        │     ├─ MethanationReactor CO + 3 H₂ → CH₄ + H₂O
        │     └─ ElectrolyzerReactor H₂O → H₂ + ½ O₂ (E-201)
        │
        ├─ ScrubberNode            sorbent-loading state, breakthrough
        │                          curve, regen-cycle scheduler
        │     ├─ AmineScrubber       CO₂ amine capture (C-301)
        │     ├─ CryoScrubber        CO₂ cryogenic capture (C-302)
        │     └─ DesiccantDryer      H₂O on zeolite/silica (V-201)
        │
        ├─ HeatExchangerNode       UA × LMTD, two-fluid energy balance,
        │                          fouling factor as state
        │     ├─ Condenser           hot-gas → cool-gas + condensate (E-701)
        │     └─ Cooler / Heater     single-fluid presets
        │
        ├─ CompressorNode          polytropic stage, power → ω coupling
        │                          (composes a PMSM via internal sub-graph)
        │     └─ StagedCompressor    K-401 multistage with intercooling
        │
        ├─ SeparatorNode           partition coefficients per species,
        │                          two-phase flash
        │     ├─ KnockoutDrum        liquid/gas (V-701)
        │     ├─ GasSeparator        distillation-like (V-801)
        │     └─ PSAPurifier         pressure-swing adsorption (V-901)
        │
        ├─ MixerNode               stoichiometric blend, ratio control
        │     └─ StoichMixer          H₂ + CO₂ at 4:1 (M-501)
        │
        └─ BufferNode              pressurized holdup tank, autonomy
                                   computation
              └─ GasBuffer            V-202
```

### What each layer carries

| Layer | Provides | Per-leaf override |
|-------|----------|-------------------|
| `ProcessUnitNode` | Chemical port declaration (in/out species sets), IIntegrable `rhs` skeleton calling `computeKinetics` + `computeEnergyBalance`, mass-conservation hook auto-emitted at solver setup, holdup volume state slot, FaultableNode-style `fault_N` slot family for kinetic-parameter faults | — (abstract) |
| `ReactorNode` | Catalyst-activity state, Arrhenius `k(T) = A·exp(−Ea/(R·T))` helper, heat-of-reaction `ΔH(T)` helper, conversion-as-state | `kineticsRateLaw(T, p_species) → r` virtual |
| `ScrubberNode` | Sorbent-loading state (kg sorbent loaded / kg capacity), breakthrough curve, regen scheduler hooks | Sorbent affinity per species, capacity, regen energy |
| `HeatExchangerNode` | Two-fluid energy balance, UA × LMTD driver, fouling-factor state | Geometry preset (counterflow / crossflow / cocurrent) + tube area |
| `CompressorNode` | Polytropic compression law, power-from-rotor input port, intercooler stage helper | Stage count + per-stage pressure ratio |
| `SeparatorNode` | Per-species partition coefficient, two-phase flash | Partition specifics (membrane permeability, PSA cycle time, ...) |
| `MixerNode` | N-stream mass + enthalpy combine, ratio-controlled outlet | Setpoint ratio + tolerance band |
| `BufferNode` | Mass balance vs consumption rate, autonomy = inventory / draw rate viewable | Geometry (cylindrical/spherical for shell stress) |

Result: each concrete leaf becomes ~30–80 lines (just its rate law + a
few constants) instead of ~200–400 (port plumbing + state + I/O +
conservation duplication).

### How it interlocks with the V2 framework

- **`IIntegrable` (F1)**: `ProcessUnitNode` implements IIntegrable so
  every reactor / scrubber / buffer participates in the global state
  vector. Mid-tier classes contribute their state slot (catalyst
  activity for Reactor, sorbent loading for Scrubber, fouling factor
  for HeatExchanger, inventory for Buffer); leaf classes contribute
  reaction-conversion and any custom kinetics state. `rhs` recursion
  is straight: base computes generic part, subclass adds its specifics
  via `super.rhs(...)`.
- **`IChemicalStream` (F4)**: ProcessUnitNode's port declarations
  consume the species-typed port, so the connect-guard catches "wired
  O₂ into a CO₂ inlet" at design time. Every leaf inherits this for
  free.
- **Conservation hooks (F7)**: `ProcessUnitNode` auto-registers one
  per-species mass-balance hook with the containing solver, plus an
  energy-balance hook. The user drops a single
  `Logic.Sim:conservation-monitor` tile and sees per-species drift
  across the whole plant aggregated. Catalyst-deactivation hooks layer
  on top via `ReactorNode`.
- **`FaultableNode` pattern**: `ProcessUnitNode` mirrors the variadic
  `fault_N` slot mechanism. A "catalyst poisoning" or "scrubber
  contamination" or "fouling onset" fault becomes the same kind of
  injectable signature as a bearing fault on a motor — uniform UX
  across plant + machinery.
- **`OnnxGraphExporter` (F5)**: each mid-tier base class implements
  `IOnnxExportable` once, emitting the canonical ONNX op pattern for
  that unit family (Reactor → Loop-of-Arrhenius, HeatExchanger →
  matrix UA pattern, ...). Leaves inherit. A full Sabatier reactor
  sub-graph → ONNX bundle then comes essentially free.
- **Scenes & atmospheres (F10)**: a process unit that interacts with
  the surrounding room atmosphere (scrubber, leak source, CO2-emitting
  reactor venting trace amounts) does NOT use a special port type. It
  reads atmosphere observables (composition, pressure, T) from the
  `AtmosphereStateNode`'s standard outputs, and writes mass-flow
  contributions back by publishing on its `delta_<species>` input
  ports. The variadic capacity of the input buffers lets N units
  publish concurrently on the same species; the atmosphere's `rhs`
  sums them. See §F10 for full details. This means `ProcessUnitNode`
  does NOT need any scene-aware machinery: room interaction is just
  standard producer/consumer wiring.

### Open questions for this section

| # | Question | My proposal |
|---|----------|-------------|
| Q6.1 | **Catalyst activity** as integrated state (extra slot in IIntegrable `y`) or as separate slow-rate scalar updated outside the solver? | Integrated state. The activity decay is part of the same equation system; separating it would force a manual sync between two time bases and break the conservation-monitor's view of "the full reactor state". Cost: 1 extra row in the Jacobian per reactor — negligible. |
| Q6.2 | **Heat as a separate `IHeatStream` port type** (parallel to `IChemicalStream`) or **carried inside the chemical stream** (T + cp)? | Separate `IHeatStream`. Industrial process simulators (Aspen, ProSim) split heat as its own utility stream so heat-integration networks (HEN) are first-class. Coolant loops, cryo regen energy, reaction heat → all wires that the user can re-route without touching the mass flow. |
| Q6.3 | **CompressorNode reusing PMSM as an internal sub-graph**: does the K-401 compressor leaf BUILD a sub-graph at construction (composing PMSM + bearing + inverter as a `RuntimeGraph`), or does it just declare ports that the user wires externally? | Compose internally. The whole point of fractal composition is that K-401 "is" a process unit even though it's internally a motor sub-graph. User sees one node with chemical and electrical ports. Saves them wiring boilerplate every time. |
| Q6.4 | **Where do meta-node base classes live**? `spikypanda-core` (next to RuntimeNode/IIntegrable) or `@spikypanda/plugin-helios` (closer to their consumers)? | Plugin-helios. They're domain primitives — depend on F4 IChemicalStream which is core but the mid-tier specialization (Reactor/Scrubber/...) is process-engineering knowledge that doesn't belong in core. |

### Implementation order (insert into the global sequence)

After the canary DcMotor migration validates IIntegrable + Solver
end-to-end (step 6 in the existing sequence), insert:

- 6a. `ProcessUnitNode` base + `IChemicalStream` consumption + auto-conservation hook registration.
- 6b. `ReactorNode` mid-tier.
- 6c. `SabatierReactor` leaf — the stiffness test that justifies Phase 2 solver.
- 6d. `ScrubberNode` + `AmineScrubber` leaf — validates non-reactor sorbent state pattern.
- 6e. `HeatExchangerNode` + `Condenser` — validates two-fluid + the IHeatStream decision (Q6.2).
- 6f. Remaining mid-tier classes (Separator/Compressor/Mixer/Buffer) + leaves on demand.

Steps 6a–6e: ~1 sprint. After that, each new chemistry node is a few
hours of leaf-specific code.

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

## F10 — Scenes, atmospheres, and the publish-delta accumulator

The Helios use-case is a closed station with multiple isolatable rooms
(habitat, labs, ECLSS bay, airlock), each with its own atmospheric
composition that evolves over time (crew respiration adds CO2,
scrubbers remove it, leaks couple rooms together, safety agents seal
rooms on contamination). This section pins the architecture for that
class of problem, which generalises beyond Helios to any sim that
models bounded volumes of stuff (chemical streams, fluid loops, even
electrical buses with reservoir capacitors).

Three structural decisions drive the design:

1. **Scenes form a graph, not a tree.** A tree was a projection
   appearance, not a constraint. Real buildings have airlocks
   adjacent to multiple rooms; HVAC ducts cross-cut the hierarchy.
   Trees forced duplicate gates and parent-traversal fictions.
2. **`AtmosphereStateNode` is a separate node from `SceneNode`.**
   The scene carries fixed params (volume, geometry, label); the
   atmosphere carries dynamic state (species inventory). One scene
   may have no atmosphere (pure visual marker); an atmosphere may
   exist without 3D geometry (early-prototype headless sim).
3. **Equipment ↔ atmosphere coupling is plain producer/consumer.**
   No new port type. Equipment publishes `delta_<species>` mass-flow
   contributions on the atmosphere's variadic input ports; the
   atmosphere accumulates via the existing scheduler input-buffer
   mechanism and integrates them as its `rhs`.

### Topology: scenes-as-graph via AtmosphereStateNode wiring

There is no `IScene.parent` pointer or `IScene.children[]` array. The
graph topology of scenes emerges from the wiring between
`AtmosphereStateNode` instances via `SceneGateNode` instances. The
runtime graph IS the scene graph; no parallel data structure.

```
SpaceEnvironment scene (Mars preset, no atmosphere-state, just constants)
   │
   ├── SmallLeakGate (mode: "open passive", area: 1e-6 m²)
   │      └── StationAtmosphere
   │
   ├── StationAtmosphere ── DoorGate (mode: "open passive") ── HabitatAtmosphere
   ├── HabitatAtmosphere  ── HvacGate  (mode: "hvac_forced") ── ECLSS_Atmosphere
   ├── HabitatAtmosphere  ── Lab1Gate  (mode: "open passive") ── Lab1Atmosphere
   ├── Lab1Atmosphere     ── FumeGate  (mode: "hvac_forced") ── ECLSS_Atmosphere
   └── ...
```

A safety agent toggles `Lab1Gate.mode = "closed"` on contamination
detection. The graph topology is unchanged; only the coupling on one
edge is gated.

### `AtmosphereStateNode` interface

```ts
// packages/dev/plugins/physics/src/scene/atmosphere-state.node.ts

class AtmosphereStateNode extends RuntimeNode implements IDeclaresPorts, IIntegrable {
    // ── Editables ─────────────────────────────────────────────────────
    @cloneable private _volume: number = 100;               // m³
    @cloneable private _temperature: number = 293.15;       // K (V1: imposed)
    @cloneable private _activeSpecies: ReadonlyArray<ChemicalSpeciesId>
        = ["N2", "O2", "CO2", "H2O", "Ar"];                // schema
    @cloneable private _initialAtmosphere: string
        = "earthHumidAirSeaLevel";                          // AtmospherePresets key
    @cloneable private _mass: ReadonlyArray<number> = [];   // initial inventory, kg
                                                            // (auto-derived from preset
                                                            //  if unset)

    // ── Ports (declared dynamically from _activeSpecies) ──────────────
    // Inputs: one variadic group per species — N equipment can each
    // publish a delta_<species> contribution per tick; the input
    // buffer's variadic capacity collects them all for the rhs.
    inputPorts: ReadonlyArray<IPortDescriptor> = this._buildInputPorts();
    variadicInput = this._activeSpecies.map((sp) => ({
        prefix: `delta_${sp}_`, type: "float",
    }));

    // Outputs: per-species observables + aggregates + full
    // IChemicalStream snapshot. Wired to sensors, gates, dashboard,
    // and other equipment that needs to READ the atmosphere.
    outputPorts: ReadonlyArray<IPortDescriptor> = [
        ...this._activeSpecies.flatMap((sp) => [
            { slot: `mass_${sp}`,        type: "float" },  // kg in volume
            { slot: `mole_fraction_${sp}`, type: "float" },
            { slot: `partial_pressure_${sp}`, type: "float" }, // Pa
            { slot: `ppm_${sp}`,         type: "float" },
        ]),
        { slot: "pressure",    type: "float" },             // Pa total
        { slot: "temperature", type: "float" },             // K
        { slot: "density",     type: "float" },             // kg/m³
        { slot: "stream",      type: "chemical" },          // full IChemicalStream
    ];

    // ── IIntegrable ───────────────────────────────────────────────────
    get stateSize(): number { return this._activeSpecies.length; }
    get stateNames(): ReadonlyArray<string> {
        return this._activeSpecies.map((sp) => `m_${sp}`);
    }

    gatherState(y: Float64Array, off: number): void {
        for (let i = 0; i < this.stateSize; i++) y[off + i] = this._mass[i];
    }
    writeState(y: Float64Array, off: number): void {
        for (let i = 0; i < this.stateSize; i++) {
            this.setField(`mass_${this._activeSpecies[i]}`, this._mass[i],
                          y[off + i], (v) => { this._mass[i] = v; });
        }
    }

    rhs(t, y, off, inputs, dydt): void {
        // For each species, sum every delta_<species>_<k> contribution
        // queued in the input buffer this tick. The solver guarantees
        // inputs are populated from the upstream publish phase before
        // rhs is called (Session two-phase orchestration, §F3).
        for (let i = 0; i < this.stateSize; i++) {
            const sp = this._activeSpecies[i];
            dydt[off + i] = inputs.sumPrefix(`delta_${sp}_`);
        }
    }

    fire(session, t): void {
        // Pure I/O: publish observables. Equipment downstream sees
        // the state freshly updated by the solver (Phase 1 ran already).
        const totalMass = this._mass.reduce((s, m) => s + m, 0);
        const totalMoles = this._totalMoles();
        const P = this._computePressure(totalMoles);
        for (let i = 0; i < this.stateSize; i++) {
            const sp = this._activeSpecies[i];
            this.publish(`mass_${sp}`,             this._mass[i]);
            this.publish(`mole_fraction_${sp}`,    this._moleFraction(i, totalMoles));
            this.publish(`partial_pressure_${sp}`, this._partialPressure(i, totalMoles, P));
            this.publish(`ppm_${sp}`,              this._ppm(i, totalMoles));
        }
        this.publish("pressure",    P);
        this.publish("temperature", this._temperature);
        this.publish("density",     totalMass / this._volume);
        this.publish("stream",      this._snapshotStream(P));
    }
}
```

**`inputs.sumPrefix` helper extension** to `IIntegrationInputs`:
collects every input on slots matching a prefix, returns the sum. Used
exactly here for the per-species mass-flow accumulator. Trivial
implementation (a few lines on the inputs resolver), but a first-class
helper because the pattern reappears every time multiple producers
share a destination.

### `SceneGateNode` interface (3 modes)

```ts
class SceneGateNode extends RuntimeNode implements IIntegrable {
    @cloneable mode: "closed" | "open_passive" | "hvac_forced" = "open_passive";
    @cloneable area:        number = 1.0;                 // m² for open_passive
    @cloneable leakCoeff:   number = 1e-3;                // open_passive
    @cloneable forcedFlow:  number = 0;                   // m³/s for hvac_forced
    @cloneable bidirectional: boolean = true;

    // Inputs: subscribe to both atmospheres' species observables (the
    // upstream concentrations needed to compute the species partition).
    inputPorts = [
        { slot: "A_pressure", type: "float" },
        { slot: "A_temperature", type: "float" },
        { slot: "B_pressure", type: "float" },
        { slot: "B_temperature", type: "float" },
        // plus variadic for A_mole_fraction_<species>, B_mole_fraction_<species>
    ];
    variadicInput = [
        { prefix: "A_mole_fraction_", type: "float" },
        { prefix: "B_mole_fraction_", type: "float" },
    ];

    // Outputs: publish delta_<species> on BOTH atmospheres. Source side
    // gets negative deltas; destination side gets positive deltas.
    // Each output port is named to match the atmosphere's input slot
    // convention exactly (e.g. "delta_CO2_gateX").
    outputPorts = [
        // variadic: A_delta_<species>, B_delta_<species> wired by user
        // to atmospheres' delta_<species>_<gateId> input
    ];
    variadicOutput = [
        { prefix: "A_delta_", type: "float" },
        { prefix: "B_delta_", type: "float" },
    ];

    // IIntegrable when mode = "hvac_forced" with aging:
    get stateSize(): number {
        return this.mode === "hvac_forced" ? 1 : 0;  // fan cumulative throughput
    }

    rhs(t, y, off, inputs, dydt): void {
        if (this.mode === "closed") return;  // no flux
        // open_passive : flux_i = leakCoeff × area × (P_A - P_B) × x_upwind_i
        // hvac_forced  : flux_i = forcedFlow × density_A × x_A_i (downstream A→B)
        // Publishes negative on A_delta_<sp>, positive on B_delta_<sp>.
        // ...
    }

    fire(session, t): void { /* publish A_delta_<sp>, B_delta_<sp> per species */ }
}
```

### Why the publish-delta pattern is the right primitive

It piggybacks on infrastructure that already exists, fully tested:

| Need | Existing mechanism that fits |
|------|------------------------------|
| N producers contributing to one accumulator | Variadic input ports + per-slot input buffers (the same infra that Sum and Stem use) |
| Order independence (which equipment publishes first doesn't matter) | Session two-phase orchestration: all publishes land before any rhs runs |
| Bidirectional read+write | Same node both publishes outputs (atmosphere → world) and accepts inputs (world → atmosphere). Standard duck-typed nodes. |
| Per-tick fresh state without retained references | Each publish carries a fresh value; no caching, no staleness |
| Conservation hook integration (F7) | Solver post-step sums all published deltas and checks against inventory change. Native. |

Cost of inventing a new `IScenePort` mechanism instead: a new port
type (with its connect-guard semantics), a new sampling model
(extract/inject), per-equipment scene reference plumbing,
serialization of scene-references across save/load. The publish-delta
pattern needs ZERO of that.

### Multi-rate partitioning for the Helios use-case

The Helios scrubber + MCSA scenario has four orders of magnitude of
time scales coexisting in one graph. The Session-attached multi-solver
(§F3) handles them via leaf typeId filtering:

| Solver marker | Glob filter | Macro rate | Solver | Justification |
|---------------|-------------|------------|--------|---------------|
| `MCSA / electrical` | `Physics.Electric.*` | ~100 kHz | RK4 fixed | Current harmonics for fault detection (BPFO, BPFI) need Nyquist > 10 kHz. Power switching at 10-20 kHz needs explicit resolution. |
| `Process / flow` | `Helios.Process.*` &#124; `Physics.Mechanical.*` &#124; `Physics.Scene:atmosphere-state` &#124; `Physics.Scene:gate` | ~100 Hz | RK4 adaptive (Phase 2 Rosenbrock for Sabatier stiff zone) | Pump dynamics, compositions, flow control. |
| `Aging / slow` | `Helios.Catalyst:*` &#124; cartridge state | ~1/min | Explicit Euler | Sorbent capacity decay, filter clog accumulation, catalyst sintering. Days-scale aging in minutes-scale wall clock. |

Three marker nodes, three disjoint leaf sets. No coupling glitches
between them because the slow-rate state evolves quasi-statically
from the fast-rate point of view, and the fast electrical signals
average out at the slow time scale.

### Open questions for this section

| # | Question | My proposal |
|---|----------|-------------|
| Q-S1 | `SceneNode` vs `AtmosphereStateNode` separation | Separate. `Physics.Scene:scene` stays light (params + geometry); `Physics.Scene:atmosphere-state` is the IIntegrable carrier. A scene without atmosphere is just a visual marker. |
| Q-S2 | New `IScenePort` type with sample/inject? | **No.** Use publish-delta via standard input/output ports. The variadic input-buffer mechanism already handles the N-to-1 accumulation. |
| Q-S3 | Scene hierarchy as tree or graph? | **Graph.** No `parent` pointer on `IScene`. Topology emerges from gate-node wiring. |
| Q-S4 | Multi-rate solver partitioning for Helios | Three solvers (MCSA / process / aging) split by typeId glob. |
| Q-S5 | How are scenes initialised on Play? | Priority order: (1) restored snapshot, (2) explicit `_initialAtmosphere` editable, (3) `AtmospherePresets[<id>]` from parent gate. |
| Q-S6 | Stratification (heavy gas pools at floor, light at ceiling)? | **Deferred V2.** Bulk model in V1. Refine when "concentration vs altitude" becomes a paper figure. |
| Q-S7 | Thermal coupling between scenes? | **Deferred V2.** V1 leaves `temperature` as imposed editable on `AtmosphereStateNode`. Will require a thermal resistance/capacitance analogue at scene-pair level. |
| Q-S8 | Variadic per-species: `variadicInput[]` with one descriptor per species, OR a single prefix `delta_` with suffix-parsing? | Array form (one per species). Each species gets its own variadic group; the editor reconciler keeps them independent (just like Stem's `f_/A_` groups). Auto-grow on connect per species. |
| Q-S9 | Buffer capacity for `delta_<species>_N` slots | Declared dynamically by `AtmosphereStateNode` based on the number of currently-connected producers, with a floor of 4. Avoids overflow on busy rooms while keeping the default cheap. |
| Q-S10 | Is `SceneGateNode` always IIntegrable? | Conditional. `closed` and `open_passive` are pure algebraic transformations (publish-only, no state). `hvac_forced` becomes IIntegrable when the user wants to track fan cumulative throughput for aging. Toggle drives `stateSize` between 0 and 1. |
| Q-S11 | Species set persistence in snapshots | The `_activeSpecies` editable is `@cloneable` so it round-trips via the existing GraphItem.serialize path. The state vector layout depends on it; restoring a snapshot with a different species set is rejected with a clear diagnostic at load time. |

### Items deliberately deferred to a later doc (flagged for V3)

- **Thermal coupling between scenes (HEN at the building level)**: 
  scene-pair thermal resistance, wall conduction, radiator coupling.
- **Vertical stratification of gases in tall rooms**: heavy CO2 sinks, light H2 rises. Bulk model in V1.
- **Microgravity phase interfaces**: in 0g, no gravitational separation gas/liquid. Knockout drum, condenser, amine scrubber ALL rely on gravity. Surface tension and wicking models required.
- **Biological kinetics**: greenhouse module with biological CO2/O2 cycle parallel to physico-chemical. New species (biomass), new rate laws.

These are V3 territory. Listed here so they aren't forgotten when relevant.

### Implementation order

Land these after the chemistry meta-node hierarchy (steps 6a-6f in §F6):

- **10a.** Extend `IScene` with `atmosphere?: IChemicalStream` field (Q4.6 fulfilment). Additive change, no regression.
- **10b.** `Physics.Scene:atmosphere-state` (the new IIntegrable node).
- **10c.** `IIntegrationInputs.sumPrefix(prefix)` helper (~10 lines on the inputs resolver).
- **10d.** `Physics.Scene:gate` (3 modes, IIntegrable when hvac_forced).
- **10e.** Migrate one Helios.Process leaf (AmineScrubber) to publish-delta wiring against an AtmosphereStateNode. Validates end-to-end accumulation + conservation.
- **10f.** Full scrubber scenario (station + 3 rooms + 2 scrubbers + crew source). Smoke-test the multi-rate partitioning.

Steps 10a-10e: ~3 days. Step 10f: 1-2 days of wiring + dashboard work.

---

## Open questions summary (just the live ones)

| ID | Question | My proposal |
|----|----------|-------------|
| Q1.1 | `stateSize` reactive or frozen? | Frozen at compile. |
| Q1.2 | rhs inputs: per-call resolve or per-macro-tick snapshot? | Snapshot per macro-tick. |
| Q1.3 | All stateful nodes migrate to IIntegrable, or coexist? | Coexist permanently. |
| ~~Q3.1~~ | ~~How does solver fire before sibling integrables?~~ | **RESOLVED** by Session-level attachment (integration phase precedes dispatch phase). |
| Q3.2 | How are leaves partitioned across multiple solvers in the same session? | Glob filter on leaf typeId. Marker editable. |
| Q3.3 | Snapshot of solver internal state? | Only `y` and `lastT`. |
| Q3.4 | What does the marker node's `fire()` do? | Refresh diagnostic viewables only; never integration. |
| Q3.5 | How is solver attachment serialized? | Not directly. Marker node persists; its `reset()` re-attaches. |
| ~~Q4.1~~ | ~~Enthalpy on stream or computed?~~ | **RESOLVED** — `IThermodynamicState.enthalpy` optional. |
| ~~Q4.2~~ | ~~Two-phase support?~~ | **RESOLVED** — `phases: IPhaseState[]` first-class. |
| ~~Q4.3~~ | ~~Stream as immutable per-tick object?~~ | **RESOLVED** — `readonly` everywhere. |
| Q4.4 | Species registry runtime extensibility? | Yes — `registerSpecies` helper + user-extensible mirror map. |
| Q4.5 | Composition basis mismatch on connect — auto-convert or reject? | Auto-convert when molar masses known; reject with diagnostic otherwise. |
| Q4.6 | `AtmospherePresets` ↔ `Physics.Scene` integration? | Source: add `atmosphere?: IChemicalStream` to `IScene`. |
| Q4.7 | `IChemicalStream.state` (mixed-phase aggregate) mandatory? | Optional; viz computes mass-weighted avg when absent. |
| Q6.1 | Catalyst activity: integrated state or separate slow update? | Integrated state. |
| Q6.2 | Heat as separate IHeatStream port or carried inside chemical stream? | Separate IHeatStream. |
| Q6.3 | CompressorNode internal motor sub-graph or external wiring? | Compose internally (fractal). |
| Q6.4 | Meta-node base classes in core or plugin-helios? | Plugin-helios. |
| Q-S1 | `SceneNode` vs `AtmosphereStateNode` separation? | Separate. |
| Q-S2 | New `IScenePort` type or publish-delta? | **Publish-delta** (no new port type). |
| Q-S3 | Scene hierarchy tree or graph? | **Graph.** Topology via gate-node wiring. |
| Q-S4 | Multi-rate partitioning for Helios scrubber+MCSA scenario | Three solvers (MCSA / process / aging) by typeId glob. |
| Q-S5 | Scene initialisation priority order? | Snapshot > explicit editable > preset hérité. |
| Q-S6 | Vertical stratification of gases? | Deferred V2 (bulk model V1). |
| Q-S7 | Thermal coupling between scenes? | Deferred V2 (imposed `temperature` V1). |
| Q-S8 | Variadic per-species: one descriptor per species or single prefix? | Array form (one variadic group per species). |
| Q-S9 | Buffer capacity for `delta_<species>_N`? | Dynamic, floor 4. |
| Q-S10 | `SceneGateNode` always IIntegrable? | Conditional (only when `hvac_forced` with aging). |
| Q-S11 | Species set persistence in snapshots? | Via `@cloneable _activeSpecies`; rejected at load if mismatched. |

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
| `Session` | F3: add `attachSolver` / `detachSolver` / `solvers` + two-phase `run(t)`. F8: add serialize/deserialize for input buffers + linksReady. | Low to medium — additive API; `run()` change is the only behavioural shift but the dispatch phase is the same code path. |
| `IRuntimeNode` | None (trait is OPTIONAL via duck typing) | — |
| Existing motors | None unless migrated. Migration is per-motor and reversible. | Low |
| `PortType` union | Add `"chemical"` entry + species sub-check on connect | Low — additive |
| `OnnxGraphExporter` | Generalize from ComputeGraph to RuntimeGraph (separate work) | Medium — touches export pipeline |
| `GraphRunner` | None — the marker node and the Session-attach happen automatically via `reset(session)`. | — |

The framework changes are surgical. Most work is **per-leaf**:
implementing `IIntegrable` on chemistry nodes as they're written.
