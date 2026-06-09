# Sim Runtime: Integration Traits and Sample-Rate Aggregation

This document covers the sim-layer concepts that sit ON TOP of the generic graph runtime (see [graph-runtime-architecture.md](graph-runtime-architecture.md) for the dataflow / KPN core). The sim layer adds three orthogonal opt-in traits to plain RuntimeNodes:

1. **`IIntegrable`** : the node carries a piece of the continuous-time state vector and exposes `rhs(t, y, inputs, dydt)` for an attached solver to advance.
2. **`IHasSampleRateRequirement`** : the node advertises the sample rate it needs to be stepped at for its physics to be meaningful.
3. **`ISupportsPhasing`** : the node gates itself on the current sim phase (PreStep / Step / PostStep). Predates the work in this document; mentioned for completeness.

Plus a base class, `IntegrableRuntimeNode`, that bundles the most common combination (RuntimeNode + sample-rate scaffolding) and offers a hook for parameter-derived rate computation.

> Code references: `packages/dev/core/src/sim/sim.interfaces.ts` (traits), `packages/dev/core/src/sim/integrable-runtime.node.ts` (base class), `packages/dev/core/src/sim/sim-graph.node.ts` (aggregation).

---

## 1. The traits

### 1.1 `IIntegrable`

```ts
interface IIntegrable {
    readonly stateSize: number;
    readonly stateNames?: ReadonlyArray<string>;
    gatherState(y: Float64Array, offset: number): void;
    writeState(y: Float64Array, offset: number): void;
    rhs(t: number, y: Float64Array, offset: number, inputs: IIntegrationInputs, dydt: Float64Array): void;
    jacobian?(t: number, y: Float64Array, offset: number, inputs: IIntegrationInputs, J: Float64Array): void;
}
```

Opt-in. The session's attached solver (currently `Control.Sim:rk4-solver`, adaptive Cash-Karp RK4) gathers state from every IIntegrable leaf at the start of a macro-step, advances `y` over `dt` with internal micro-stepping, and writes the result back via `writeState`. Implementations co-exist in ONE shared state vector owned by the solver, each leaf addressing its slice `[offset .. offset + stateSize)`.

Examples:

- `AtmosphereLayerNode` : `stateSize = N` per active species (mass [kg] each).
- `DcMotorDynamicNode` : `stateSize = 2`, `stateNames = ["i", "omega"]`.

The `AtmosphereGateNode` was IIntegrable in early V1, but the 2026-06-09 refactor moved it to direct forward-Euler on `session.dt` (no state slot) since it just propagates mass deltas between two atmospheres in the same fire.

### 1.2 `IHasSampleRateRequirement`

```ts
interface IHasSampleRateRequirement {
    readonly requiredHz: number;       // > 0
}
```

Opt-in. The enclosing `SimGraphNode` aggregates `requiredHz` over all opt-in leaves and uses the result to compute the inner session's `effectiveHz`. The trait is ORTHOGONAL to `IIntegrable`: a fast non-integrating node (e.g. a PWM inverter modelled as switched voltage) can opt in just to lift the inner rate, and a slow integrator (chemistry on minute timescales) can opt in to floor the rate down.

Drop of `session.simRate` : pre-V1 the runner had a global `simRate` dropdown that picked the rate for everyone. P8 (2026-06-09) removed that fallback entirely. Rates are now purely declarative: leaves advertise, the SimGraphNode picks the max.

### 1.3 Aggregation

`SimGraphNode._aggregateRequiredHzFromSession(session)` does:

```ts
let max = 0;
for (const node of session.graph.nodes) {
    if (hasSampleRateRequirement(node)) max = Math.max(max, node.requiredHz);
}
return max;     // 0 when no leaf opts in; caller floors at MIN_EFFECTIVE_HZ = 60 Hz
```

Floor: 60 Hz, defined in `core/sim/sim-graph.node.ts` as `MIN_EFFECTIVE_HZ`. Prevents pathological "no leaf opted in → K=0" cases and matches the human-visual baseline.

In the K = inner / parent sub-stepping formula, `effectiveHz` becomes both the inner rate (when the SimGraphNode wraps a sub-graph) and the parent rate (when it is itself wrapped). Fractal composition.

---

## 2. `IntegrableRuntimeNode` base class

```ts
class IntegrableRuntimeNode extends RuntimeNode implements IHasSampleRateRequirement {
    protected _requiredHzValue: number = 0;
    protected _requiredHzUserDefined: boolean = false;

    protected computeRequiredHz(): number { return 100; }       // override

    public get requiredHz(): number {
        return this._requiredHzUserDefined && this._requiredHzValue > 0
            ? this._requiredHzValue
            : this.computeRequiredHz();
    }

    @editable("number", { unit: "Hz" })
    public get required_hz(): number { return this.requiredHz; }
    public set required_hz(v: number) { /* pin if > 0, unpin if ≤ 0 / NaN */ }

    @viewable("boolean")
    public get required_hz_user_defined(): boolean { return this._requiredHzUserDefined; }

    protected notifyComputedRequiredHzMayHaveChanged(): void { /* re-emit when not pinned */ }
}
```

### 2.1 Why bundle the two traits

`IDeclaresPorts` (via RuntimeNode), `IIntegrable` (declared by the subclass when applicable), and `IHasSampleRateRequirement` (concrete in the base) cover the trifecta a physics leaf typically wants. Subclasses get the sample-rate scaffolding for free; if they are also IIntegrable they add `stateSize / gatherState / writeState / rhs` directly.

### 2.2 Why the user-pin

Many nodes have rate requirements that depend on physical parameters: a DC motor's required rate scales with `1 / (L/R)`. Hardcoding a default would force users to recompute the right number every time they touch `L` or `R`. The base class's contract:

- `computeRequiredHz()` is virtual : subclasses derive from parameters.
- The `required_hz` editable is two-mode: write a positive value to PIN, write 0 / NaN / negative to UNPIN.
- Pinning is sticky: while pinned, parameter edits don't move the displayed value.
- Unpinning reveals the parameter-derived value and tracks edits live (via `notifyComputedRequiredHzMayHaveChanged()`).
- A viewable `required_hz_user_defined` lets the panel render a "(pinned)" badge.

### 2.3 Which nodes extend it

| Node | Extends `IntegrableRuntimeNode`? | `computeRequiredHz()` strategy |
|------|----------------------------------|-------------------------------|
| `AtmosphereLayerNode` | yes | constant 100 Hz |
| `AtmosphereGateNode` | yes | constant 100 Hz |
| `DcInverterNode` | yes | `20 × fPwm` |
| `BldcInverterNode` | yes | constant 10 kHz (matches 100 µs / 20 kHz carrier assumption) |
| `DcMotorDynamicNode` | NO (FaultableNode chain), boilerplate duplicated | `10 / min(L/R, J/b)` clamped |
| `BldcMotorDynamicNode` | NO, boilerplate duplicated | `max(10/τ_min, 4 × 6f_e@1000 rad/s)` |
| `PmsmMotorDynamicNode` | NO, boilerplate duplicated | `max(10/τ_min, 10 × f_e@1000 rad/s)` |

The motor nodes can't extend `IntegrableRuntimeNode` directly because they already extend `FaultableNode` (for the variadic fault bank) which extends `TransformNode` (for scene-graph placement). The user-pin pattern is copy-pasted instead, with identical semantics. A future mixin refactor could unify them.

---

## 3. `disabledWhen` panel convention

Adjacent to the sample-rate work, V1 introduced a panel-rendering convention to dim editables whose live value comes from a wired source. Pure UX: the runtime layer is unaware.

```ts
@editable("number", { unit: "m/s²", disabledWhen: "is_gravity_wired" })
public get gravity(): number { ... }
public set gravity(v: number) { ... }

@viewable("boolean")
public get is_gravity_wired(): boolean {
    return this._gravitySourceId !== null;
}
```

The PropertyEditor reads `field.options.disabledWhen`, looks up `model[disabledWhen]`, and if truthy renders the field with `editable: false` and a `ne-property-editor-row-disabled` CSS class (leading 2 px teal bar + 0.72 opacity).

The Scene exposes 7 such pairs (`gravity`, `temperature`, `pressure`, `density`, `timeScale`, `localPosition`, `localScale`); the AtmosphereGate uses similar booleans (`isAtmosphereAWired`, `isAtmosphereBWired`) but they currently only drive viewables, not editables. Other nodes can adopt the convention without core changes.

---

## 4. End-to-end: a habitat with a DC motor

```
Root canvas
├─ Scene (Physics.Scene:scene)
│     atmosphere_in ── HabitatAtmosphere     (drives temperature / pressure)
│     solver_in_0   ── RK4Solver             (1 kHz nominal)
│
├─ HabitatAtmosphere (Physics.Scene:atmosphere)
│     layer_in_0    ── HabitatLayer          (100 Hz computeRequiredHz)
│
├─ AirRecircFan (Physics.Scene:atmosphere-gate)
│     atmosphere_A_in ── HabitatAtmosphere
│     atmosphere_B_in ── ScrubberAtmosphere
│     mode = hvac_forced, forcedFlow = 0.005 m³/s
│     (100 Hz computeRequiredHz)
│
└─ HabitatProcess (Sim.Graph:graph)
     bound to Scene
     inside:
       MotorScene (effectiveHz = ?)
        ├─ DcMotor (L=1mH R=1Ω → computed 10 kHz; user did not pin)
        ├─ DcInverter (fPwm = 10 kHz → computed 200 kHz)
        └─ MCSAGraph
```

Aggregation per SimGraphNode:

- The HabitatProcess inner: aggregates the Layer (100 Hz), Gate (100 Hz), and the MotorScene's leaves (motor 10 kHz + inverter 200 kHz). Inner effectiveHz = **200 kHz**.
- The MotorScene inner (Sim.Graph contained inside HabitatProcess if structured that way): aggregates motor (10 kHz) + inverter (200 kHz). Inner effectiveHz = **200 kHz**.
- The root: aggregates HabitatProcess, which forwards 200 kHz. Root effectiveHz = **200 kHz**.

K ratios fall out from this. If the root runs at 60 Hz (display rate), K_root_to_habitat = round(200_000 / 60) ≈ 3333: each root tick the habitat runs 3333 inner micro-ticks. Realistic for a fast MCSA simulation; a habitat-only graph (no motor / inverter) would run at 100 Hz (the Layer / Gate baseline) with K = round(100 / 60) ≈ 2.

---

## 5. Migration history

| Date | Change |
|------|--------|
| pre-V1 | Global `session.simRate` dropdown on every Session. |
| 2026-06-08 | AtmosphereStateNode split into Layer + container. The Layer became the IIntegrable carrier. |
| 2026-06-09 | P8: `IHasSampleRateRequirement` + `MIN_EFFECTIVE_HZ` floor + drop of `session.simRate` fallback in `SimGraphNode._readHz`. |
| 2026-06-09 | AtmosphereGate refactor: dashed config-link refs replace per-species data channels; gate is no longer IIntegrable. |
| 2026-06-09 | `IntegrableRuntimeNode` base class + `computeRequiredHz()` virtual hook + user-pin pattern for `required_hz`. Motor and inverter nodes opt in. |

The boilerplate duplication on motors (FaultableNode chain) is the only outstanding ergonomics debt in this corner. Mixin-based refactor when it becomes painful.
