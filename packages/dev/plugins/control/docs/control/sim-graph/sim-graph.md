# Sub-graph

`Sim.Graph:graph`

Fractal-container RuntimeNode. Wraps an inner `RuntimeGraph` + `Session` (via the `IGraphNodeState` factory that already existed in core) and surfaces two extra contracts on top of vanilla sub-graph embedding:

1. **Scene binding.** A `sceneItemId` editable points at a `Physics.Scene:scene` (SceneItem) on the same canvas. At `reset()`, the editor's `SceneBindingResolver` looks up the SceneItem and builds a live `SceneStateView` plus a list of `ISolverHandle` instances from the scene's wired solvers. The view is written to `innerSession.sceneStateView`; the solver handles are attached to the inner session. Detach-on-rebind is automatic.
2. **Multi-rate sub-stepping.** `fire(parentSession, t)` computes `K = round(innerHz / parentHz)` from the SceneStateView's `effectiveHz` on each side, then runs `innerSession.run()` K times between the parent's previous and current sim-time. Inputs are routed in once before the loop (ZOH semantics on the parent boundary), outputs once after.

Drill-down navigation: double-clicking the node swaps the canvas to the sub-graph's content; `Esc` or `Ctrl + ↑` returns to the parent. A breadcrumb above the canvas shows the navigation stack.

## Equations

For each tick at parent sim-time `t`:

```
1. inner = _routeInputsFromParent(parentSession)      (ZOH inputs from parent → inner)
2. K     = max(1, round(innerHz / parentHz))           (sub-step ratio)
3. dt    = (t − lastT) / K                              (sub-step size)
4. for k in 1..K:
       inner.run(lastT + k × dt)                       (each inner.run does its own integration + dispatch)
5. _routeOutputsToParent(parentSession, inner)         (ZOH outputs from inner → parent)
6. lastT = t
```

Hz lookups (both sides) resolve through the bound `SceneStateView`'s `effectiveHz.getValue(Frequency.Units.Hz)`. When no SceneStateView is bound, the SimGraphNode aggregates `IHasSampleRateRequirement.requiredHz` directly across its inner leaves (`max(leaves) ∨ MIN_EFFECTIVE_HZ`). The legacy `session.simRate` fallback is GONE (dropped 2026-06-09 with task P8): rates are purely declarative now — leaves advertise their requirements, the SimGraphNode picks the max. K defaults to 1 only when neither path yields a usable rate (e.g. a freshly built session with no leaves declaring requiredHz yet).

## Ports

| Direction | Slot | Type | Kind | Notes |
|---|---|---|---|---|
| in (variadic) | indexed by user | any | signal | Pass-through inputs routed from the parent session into the inner. Match by slot name OR positional index (source-order fallback). |
| out (variadic) | indexed by user | any | signal | Pass-through outputs routed from the inner back to the parent. Same matching rules. |

Sub-graph IO is built by the user editing the inner graph: nodes added to the inner `inputs[]` / `outputs[]` lists become external ports on the Sim.Graph wrapper. The pseudo-nodes "INPUTS" / "OUTPUTS" inside the inner canvas (P5b backlog) are how the user wires the boundary explicitly.

The scene wiring is **NOT a runtime port** — it's the editor-only config-link from the SceneItem's `scene_out` anchor to the Sim.Graph node's surface. The editor stores the SceneItem's ID in `sceneItemId`.

## Parameters

| Name | Unit | Default | Meaning |
|---|---|---|---|
| `sceneItemId` | string | empty | ID of the SceneItem this sub-graph is bound to. Set automatically when the user wires a config-link from a `Physics.Scene:scene` node. Empty → falls back to a default Earth-surface view. |
| (inherited) `enabled` | bool | true | Standard control-plane gate. When false, the inner session is not fired. |
| (inherited) `mode` | enum | `dynamic` | Inner scheduler mode (`dynamic` / `static`). Inherited from `RuntimeGraph`. |

## Lazy storage convention

The inner sub-graph is stored on the parent-canvas's NodeUI under `item.data.subGraphJson` (a serialized JSON string produced by `GraphViewer.save()`). The viewer lazy-loads this only when the user drills in:

1. **Enter** — viewer serializes the current canvas, pushes it on `navigationStack` as `parentSnapshot`, deserializes the node's `subGraphJson` (or starts empty if undefined), and loads it.
2. **Leave** — viewer serializes the current (sub-)canvas, pops the stack, writes the inner JSON back to the parent node's `subGraphJson`, and restores the parent snapshot.

At play time the session-builder reads `subGraphJson` directly and materialises the inner `RuntimeGraph` without going through the editor canvas, so a graph saved while the user was inside a sub-graph still plays correctly.

## Wiring example — Habitat with fast-MCSA DC motor sub-graph

```
[Root canvas]
   ├─ HabitatScene (Physics.Scene:scene, isPrimary = true)
   │     scene_out  ──pointillé──►  HabitatProcess.sceneItemId
   │     solver_in_0 ◄──pointillé── RK4 Solver (Process tier, 1 kHz)
   │
   ├─ HabitatAtmoState (Physics.Scene:atmosphere-state)
   │     atmosphere_out ──pointillé──►  HabitatScene.atmosphere_in
   │
   └─ HabitatProcess (Sim.Graph:graph)
        ├─ (sceneItemId = HabitatScene)
        ├─ (innerHz ≈ 1 kHz from HabitatScene.effectiveHz)
        │
        │  (double-click to drill in:)
        │
        ├─ Inside HabitatProcess:
        │  ├─ ScrubberScene (Physics.Scene:scene)
        │  ├─ ScrubberProcess (Sim.Graph:graph, bound to ScrubberScene)
        │  └─ MotorScene (effectiveHz ≈ 100 kHz)
        │     └─ MCSAGraph (Sim.Graph:graph)
        │        K = round(100 kHz / 1 kHz) = 100      ← sub-steps per habitat tick
        │        runs DcMotorDynamic + Inverter + CurrentSensor inside
```

## Pitfalls

- **No scene wired.** When `sceneItemId` is empty (or its lookup fails), the inner session binds a default Earth-surface SceneStateView and the sub-step ratio collapses to K = 1. Useful for quick prototypes; double-check the binding when integrating into a multi-rate hierarchy.
- **Inner Hz lower than parent Hz.** K is clamped to ≥ 1, so a child with a slower effective rate falls back to a single inner.run per parent fire (over-sampling). That's correct for the parent's clock; the inner just sees one larger dt. Intentional consequence of fractal composition.
- **Mode change on a wired solver mid-session.** The `SimGraphNode.reset()` detaches previously-attached solvers via `inner.detachSolver` BEFORE asking the resolver for fresh ones. A topology edit that swaps the SceneItem cleanly tears down old solvers; an in-place edit of a solver's properties does NOT — the user must stop and re-play to rebuild the solver with the new editables.
- **Forgetting drill-down storage.** If the host's app shell discards `node.item.data` between sessions (e.g. by serializing only the layout layer), the inner sub-graph is lost. The host MUST persist `item.data` along with the layout when saving to disk; `GraphViewer.save()` already does this by including `model.nodes[i].data`.
- **Multi-hop breadcrumb pops.** `popNavigationTo(N)` for N <= depth − 2 discards intermediate sub-graph edits (only the top-most level is saved back). V1 limitation; the breadcrumb is fine for single-hop navigation, but the user should leave back one level at a time when in doubt.
