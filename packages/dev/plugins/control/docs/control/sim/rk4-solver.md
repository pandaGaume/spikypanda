# RK4 Solver

`Control.Sim:rk4-solver`

Parameter descriptor for the adaptive RK4 (Cash-Karp) integrator. A `GraphItem`, NOT a runtime node: it never fires, carries no data ports, and is excluded from the runtime graph by the session builder (same convention as the Scene item). Its job is configuration: drop it on the canvas, wire its dashed `solver_out` config-link to a Scene's variadic `solver_in_<k>`, and every `IIntegrable` leaf in the graph (DC motor, induction motor, any node with continuous state) gets integrated by an RK4 instance built from this descriptor's `tolerance` / `maxStep`.

## How attachment works

1. Wiring `solver_out` to the Scene populates the Scene's `solverItemIds` (via `syncConfigLinksFromCanvas`). Config-links are resolved at session bind; they never carry a runtime payload.
2. At bind, the item's `toSolverDescriptor()` produces `{ kind: "rk4-adaptive", options: { tolerance, maxStep } }` and the attachment helper asks `SOLVER_REGISTRY.create()` to instantiate the actual `RK4AdaptiveSolver`, grouping `IIntegrable` leaves by their `solverKind` (default `"rk4-adaptive"`).
3. The helper calls `bindSolver()` back on the item so the diagnostic viewables stay live during play.

Auto-fill: with a Scene present, leaves whose kind has no wired descriptor are still integrated using the registry defaults for that kind (`tolerance 1e-6`, `maxStep 1e-2`). So the item is optional for default settings; wiring it is how you TUNE the integrator and watch its diagnostics.

No solver attachment path at all (typically: no Scene in the graph, since the Scene is what triggers root-level attachment, or a leaf declaring an unregistered `solverKind`) means the `IIntegrable` leaves are never stepped: motors stay FROZEN at their initial state (omega and currents never move) while the rest of the dataflow runs normally. If a motor plot is a flat line at zero, check the Scene + solver wiring first.

Per-leaf overrides: a leaf's own `solverOptions` merge with the descriptor by tightening (`tolerance` and `maxStep` take the min, `minStep` the max), so one sensitive leaf can demand more accuracy without loosening anyone else.

## Anchors (editor-only config-links)

| Direction | Anchor       | Type   | Notes                                                                                                                  |
| --------- | ------------ | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| out       | `solver_out` | solver | Dashed config-link onto a Scene's variadic `solver_in_<k>`. Resolved at session bind, never carries a runtime payload. |

## Editables

| Name        | Default | Meaning                                                                                                        |
| ----------- | ------- | -------------------------------------------------------------------------------------------------------------- |
| `tolerance` | 1e-6    | Embedded-error threshold per state entry. Non-finite or non-positive values are clamped to 1e-12.              |
| `maxStep`   | 1e-2    | Hard cap on the adaptive step size, in seconds (10 ms). Non-finite or non-positive values are clamped to 1e-6. |

## Viewables (live while playing, via the bound solver)

| Name             | Meaning                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `lastMicroSteps` | Adaptive sub-steps taken inside the previous macro-step.                |
| `lastMaxError`   | L-infinity embedded-error estimate over the accepted state.             |
| `rhsEvalsTotal`  | Running total of rhs evaluations since reset; the cost meter.           |
| `ownedLeaves`    | Meant to be the claimed-leaf count; reads 0 in practice (see Pitfalls). |

## Pitfalls

- Not a runtime node: there is no `fire()`, no data ports, nothing to wire on the signal plane. The only cable it accepts is the dashed `solver_out -> solver_in_<k>` config-link; the editor rejects drops onto non-solver slots.
- Editing `tolerance` / `maxStep` mid-play does NOT retune the live solver: the descriptor is read once per session bind. Stop and re-play to rebuild the integrator with the new values.
- `lastMicroSteps` climbing per macro-step means the dynamics are stiff relative to `maxStep` and `tolerance`; the solver still delivers, but `rhsEvalsTotal` shows the price. A future stiff-aware descriptor (Rosenbrock4) registers under a different kind, same pattern.
- The diagnostics belong to the SOLVER instance, not the item: before the first bind (or after the wiring is cleared) `bindSolver(null)` zeroes them. `ownedLeaves` is currently a stub: the session builder passes a hardcoded 0 for the owned count when it binds (counting would require re-walking the leaves), so the viewable stays at 0 even after a successful attachment; the other three diagnostics are the live ones.
