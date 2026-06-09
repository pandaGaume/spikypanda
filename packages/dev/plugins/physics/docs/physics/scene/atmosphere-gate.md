# Atmosphere Gate

`Physics.Scene:atmosphere-gate`

Couples two `Physics.Scene:atmosphere` (or `:atmosphere-layer`) instances by computing a per-species mass flow [kg/s] according to one of three modes (`closed`, `open_passive`, `hvac_forced`) and applying paired `+δ` / `−δ` mass deltas directly on each atmosphere. Mass conservation is native: the same `δ` is added on side B and subtracted on side A in the same `fire()`.

## What changed (2026-06-09 refactor)

Before V1 ship, the gate exposed per-species data channels:

- inputs: `A_pressure`, `A_temperature`, `B_pressure`, `B_temperature`, plus variadic `A_mole_fraction_<species>` / `B_mole_fraction_<species>`
- outputs: variadic `A_delta_<species>` / `B_delta_<species>` to feed the atmospheres' `delta_<species>_<k>` ports

That model was rebuilt around config-link references: the gate now holds two dashed config-link slots `atmosphere_A_in` / `atmosphere_B_in` typed `"atmosphere"`. At session bind, the editor's graph-session-builder resolves each link to the bound atmosphere's `IAtmosphereGateHandle` (a duck-type shared by `AtmosphereLayerNode` and `AtmosphereNode`) and calls `gate.bindAtmosphereA(id, handle)` / `bindAtmosphereB(id, handle)`. The gate reads pressure / temperature / mole fractions through the handle and writes mass deltas via `applyMassDelta(species, deltaKg)`. No more per-species ports, no more dependency on the species schema, no more 10-port-bag explosion when the V1 species set grows.

Side benefits:

- **Composition-driven schema.** The gate iterates the union of `atmosphere.activeSpecies` on the two sides. Adding O3 to a Composition wired to one atmosphere now flows through the gate without any rewiring.
- **No IIntegrable on the gate.** Throughput is now a `@viewable` accumulator updated each `fire()` from `forcedFlow * session.dt` (forward Euler, sufficient at 100 Hz). The gate no longer claims a state slot from the solver.

## Equations

Per species `i` in the species union:

```
ṁ_i = V̇ × ρ_upwind_i                                                  [kg/s]
ρ_upwind_i = P_upwind × x_upwind_i × M_i / (R × T_upwind)              [kg/m³]
```

where `M_i` is the species molar mass read from the bound atmosphere (gas registry), `R = 8.314462618 J/(mol·K)`, and `V̇` is the volumetric flow rate [m³/s] determined by the mode:

| Mode             | `V̇` formula                                       | Upwind side                      |
|------------------|----------------------------------------------------|----------------------------------|
| `closed`         | 0                                                  | (no flux)                        |
| `open_passive`   | `leakCoeff × area × (P_A − P_B)` (linearised)      | A when `ΔP > 0`, else B          |
| `hvac_forced`    | `forcedFlow` (editable)                            | A (unidirectional A → B)         |

The `bidirectional` flag turns `open_passive` into a check-valve: when `false`, flux is zero whenever `P_A < P_B`.

Sign convention: the gate calls

```
A.applyMassDelta(species, -ṁ_i × dt)
B.applyMassDelta(species, +ṁ_i × dt)
```

so positive `V̇` always moves mass A → B regardless of which side is upwind. When B is upwind (negative `V̇` in `open_passive` with `bidirectional = true`), the same machinery flips signs naturally and mass moves B → A.

## Ports

| Direction | Slot                | Type        | Kind        | Notes                                                                                                                                                       |
|-----------|---------------------|-------------|-------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| in        | `atmosphere_A_in`   | atmosphere  | config-link | Dashed cable from any `Physics.Scene:atmosphere` or `:atmosphere-layer`'s `atmosphere_out` / `layer_out`. Resolved at session bind to `bindAtmosphereA`.     |
| in        | `atmosphere_B_in`   | atmosphere  | config-link | Same for side B.                                                                                                                                            |
| out       | `flow_rate`         | float       | signal      | Signed volumetric flow `V̇` [m³/s], positive = A → B, negative = B → A (reverse flow when `bidirectional`). Useful for plotting and downstream rate triggers. |

The gate has only ONE runtime output channel now (`flow_rate`). All the species-level data (deltas applied to atmospheres) goes through the binding, not the link bag.

## Parameters

| Name              | Quantity / Unit       | Default      | Meaning                                                                                                                                                                                        |
|-------------------|-----------------------|--------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `mode`            | enum                  | `open_passive` | One of `closed`, `open_passive`, `hvac_forced`. Switchable live (no IIntegrable means no `stateSize` flip; the change takes effect on the next `fire()`).                                       |
| `area` / `areaQ`  | Area (m²)             | 1 m²         | Throat / passage area. Used by `open_passive`. The Quantity accessor accepts `m²`, `cm²`, `mm²`, `in²`, `ft²`, `ha`, `km²`.                                                                     |
| `leakCoeff`       | dimensionless         | 1e-5         | Linearised leak coefficient. Hairline crack ~1e-6, mm-scale leak ~1e-3, wide-open door ~1.                                                                                                      |
| `forcedFlow`      | VolumetricFlow (m³/s) | 0            | Forced volumetric flow rate. Used by `hvac_forced`. Quantity accessor accepts `m³/s`, `L/s`, `L/min`, `m³/h`, `cfm`, `gpm`.                                                                     |
| `bidirectional`   | bool                  | true         | When false, `open_passive` becomes a check-valve (no back-flow when `P_A < P_B`).                                                                                                               |
| `trackThroughput` | bool                  | false        | When true, `throughput` accumulates `|V̇| × dt` across fires (any mode). Used for filter aging / fan run-time. Off by default to keep the accumulator at 0.                                     |
| `required_hz`     | Frequency (Hz)        | 100 (computed) | Inherited from `IntegrableRuntimeNode`. Parameter-independent baseline at 100 Hz; user can pin a higher value. See [Sample rate](#sample-rate) below.                                            |

Viewables:

| Name                       | Notes                                                                                                              |
|----------------------------|--------------------------------------------------------------------------------------------------------------------|
| `lastVolumetricFlow`       | Signed `V̇` from the previous `fire()` [m³/s]; positive = A → B, negative = B → A.                                  |
| `throughput`               | Cumulative volume moved [m³]. Updates only when `trackThroughput` is true.                                          |
| `isAtmosphereAWired`       | True when `atmosphere_A_in` is resolved. Used by the panel to grey out the linked editables (see [Wiring panel](#wiring-aware-panel)). |
| `isAtmosphereBWired`       | Same for B.                                                                                                        |
| `required_hz_user_defined` | True when the user has pinned a manual `required_hz` value; false when it is auto-derived from `computeRequiredHz()`. |

## Sample rate

The gate is an `IntegrableRuntimeNode` (the `IHasSampleRateRequirement` carrier from `core/sim`). `computeRequiredHz()` returns a parameter-independent 100 Hz baseline, aligned with the typical `AtmosphereLayer` rate so an inner Sim.Graph holding both runs at a coherent `K = inner / parent` ratio. Users can pin a higher value through the `required_hz` editable; entering 0 / NaN / negative unpins back to the computed value.

The enclosing `SimGraphNode` aggregates `requiredHz` via `max(IHasSampleRateRequirement leaves) ∨ MIN_EFFECTIVE_HZ (60 Hz)`. A scene with one Atmosphere + one Gate (both 100 Hz) and one DC motor (computed from L/R, ~10 kHz default) lands at 10 kHz inner rate.

## Wiring example — leak between habitat and space

```
[HabitatAtmosphere]                                     [SpaceAtmosphere]
   atmosphere_out  ─────pointillé─────►   atmosphere_A_in
                                           atmosphere_B_in   ◄─────pointillé───── atmosphere_out
                                          │
                                          ▼
                                   [SmallLeakGate]
                                   mode = open_passive
                                   area = 1e-6 m²        (1 mm² hole)
                                   leakCoeff = 1e-2
                                   bidirectional = true
                                          │
                                          ▼
                                   flow_rate ─► VizLineplot  (optional, for monitoring)
```

For an HVAC fan that always blows ECLSS air from the cabin into the scrubber loop:

```
mode             = hvac_forced
forcedFlow       = 0.005 m³/s    (≈ 300 L/min, typical recirc fan)
trackThroughput  = true          (for filter aging downstream)
```

## Wiring-aware panel

Editables whose value is overridden by a wired source render in a **read-only / dimmed** style in the property panel (`disabledWhen` convention). For the gate, the relevant pairs:

- `atmosphere_A_in` wired → no editable to grey on the gate itself (the bound atmosphere supplies pressure / temperature / composition; nothing is editable to override).
- `atmosphere_B_in` wired → same.

The actual visual feedback shows on the **bound atmosphere's** panel: when an atmosphere is linked to a gate, the atmosphere's `temperature`, `pressure`, `density` editables stay live (they are sources, not sinks) and remain editable.

## Pitfalls

- **Mode change is live.** Unlike the previous version (which flipped `stateSize` and required a session reset), the refactored gate has no IIntegrable surface; toggling `mode` is effective at the next fire. No reset needed.
- **One side not wired.** If only `atmosphere_A_in` is bound (or only B), `fire()` early-returns with `lastVolumetricFlow = 0`. No partial transfer, no error. The panel surfaces this through `isAtmosphereAWired` / `isAtmosphereBWired`.
- **Species union, not intersection.** The gate iterates the union of A's and B's `activeSpecies`. A species present only on A flows OUT of A and INTO B (where B will start to accumulate it from zero). This is correct physics; just be aware that pumping argon from a cabin into a vacuum produces non-zero argon mass on the vacuum side.
- **`forcedFlow < 0`.** The setter clamps negative `forcedFlow` to 0. To reverse the HVAC direction, swap which atmosphere wires to A vs B (the gate is unidirectional A → B by convention).
- **`leakCoeff × area` too aggressive.** The linearised model has no upper bound on flux. If the user sets `area = 1 m²` and `leakCoeff = 1` for a small ΔP, the resulting flux can drain an atmosphere within a few ticks. Use realistic engineering values; for an orifice-correct sqrt-form, prefer V2.
- **No conservation enforcement node needed.** The gate calls `applyMassDelta` with paired `±δ` in the same fire; mass is conserved to float precision by construction. A dedicated `Physics.Scene:conservation-hook` is unnecessary for gates; it would only matter if a node converted species (e.g. a reactor turning CO2 → CO).
- **Atmosphere container vs Atmosphere Layer.** Both satisfy `IAtmosphereGateHandle`. The container aggregates over its layers (sum mass, volume-weighted mole fraction, proportional-by-volume delta distribution). Wiring a multi-layer container into the gate gives the gate access to the composite atmosphere; the individual layers are still updated correctly via `applyMassDelta`.
