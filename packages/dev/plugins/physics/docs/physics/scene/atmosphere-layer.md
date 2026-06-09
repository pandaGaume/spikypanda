# Atmosphere Layer

`Physics.Scene:atmosphere-layer`

Mass-inventory carrier for the species inside one well-stirred volume. Acts as the *sink* of the producer/consumer atmospheric coupling pattern: every piece of equipment that consumes or produces a chemical species pushes a `delta_<species>_<k>` contribution into the layer's variadic input ports, and the solver integrates them into the per-species mass vector.

A Layer is `IIntegrable + IHasSampleRateRequirement` (via the shared `IntegrableRuntimeNode` base). Its state vector is the per-species mass [kg], in the order frozen at `reset()` from the bound `Chemistry:composition`. Drop a `Control.Sim:rk4-solver` (or wire the scene's `solver_in_<k>`) for the solver to pick it up.

> **Rename history.** Was `Physics.Scene:atmosphere-state` until 2026-06-08, when the Atmosphere class split into a Layer carrier (this node) and a Container facade (`Physics.Scene:atmosphere`, see [atmosphere.md](atmosphere.md)). Single-layer scenes still work transparently: drop an `Atmosphere` container with no Layer wired and a hidden default layer is materialised internally.

## Composition-driven species schema

The Layer no longer hardcodes a species list at the editor level. Wire a `Chemistry:composition` into `composition_in` (dashed cable, type `composition`) and the Layer:

1. Reads `composition.components: { gas, moleFraction }[]` at session bind.
2. Freezes `activeSpecies` + `molarMass` in declaration order.
3. Seeds `_mass` by inverting the ideal gas law at `composition.referencePressurePa` and the Layer's temperature.

When no composition is wired, the Layer falls back to `V1_SPECIES_ORDER` (`[N2, O2, CO2, H2O, Ar]`) and `ATMOSPHERE_PRESETS[initialAtmosphere]` so a freshly dropped node renders sensible mass / pressure / density values without any wiring.

## Equations

For each species `i ∈ activeSpecies`:

```
dm_i/dt = Σ delta_<species_i>_<k>      [kg/s]
```

The right-hand side is purely additive; the Layer adds no chemistry term. All flux comes from producers wired to the variadic input. The solver guarantees the input snapshot is populated from the upstream publish phase before `rhs()` runs.

Aggregate outputs use the ideal gas law `P V = n R T`:

```
n        = Σ (m_i / M_i)
P_total  = n R T / V
ρ        = totalMass / V
P_i      = (m_i / M_i) / n × P_total       (partial pressure)
x_i      = (m_i / M_i) / n                  (mole fraction)
ppm_i    = x_i × 1e6
```

`T` and `V` are Layer-owned editables since the 2026-06-08 refactor (the Layer no longer reads temperature from the SceneStateView). This breaks the prior Atmosphere ↔ Scene cycle and lets a wired Atmosphere drive the Scene's display values via the config-link binding instead.

## Ports

| Direction | Slot                   | Type        | Kind        | Notes                                                                                                                                                                            |
|-----------|------------------------|-------------|-------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| in        | `composition_in`       | composition | config-link | Dashed cable from a `Chemistry:composition`. Drives the species schema and the initial mass at `reset()`. When unwired, V1 fallback species set + `initial_atmosphere_preset` apply. |
| in (variadic, runtime) | `delta_<species>_<k>` | float | signal | Per-species mass-flow contribution from any producer. Allocated dynamically by the runtime when an external channel binds; the editor does not expose these (the species schema is composition-driven). |
| out       | `pressure`             | float       | signal      | Total pressure [Pa] from ideal gas.                                                                                                                                              |
| out       | `temperature`          | float       | signal      | Layer temperature [K] (editable on the Layer).                                                                                                                                   |
| out       | `density`              | float       | signal      | Total mass density [kg/m³].                                                                                                                                                      |
| out       | `layer_out`            | layer       | config-link | Anchor consumed by an `Atmosphere` container's variadic `layer_in_<k>`. Dashed cable.                                                                                             |
| out       | `mass_<species>`       | float       | signal      | (Runtime-only) Current mass of *species* in the volume [kg].                                                                                                                     |
| out       | `mole_fraction_<species>` | float    | signal      | (Runtime-only) Current mole fraction of *species*.                                                                                                                               |
| out       | `partial_pressure_<species>` | float | signal      | (Runtime-only) Partial pressure of *species* [Pa].                                                                                                                               |
| out       | `ppm_<species>`        | float       | signal      | (Runtime-only) Concentration in parts-per-million.                                                                                                                                |

The four `*_<species>` output families are runtime-allocated when a downstream channel binds to them; they are not exposed in the editor's port bag (the species schema is composition-driven, so hardcoding `V1_SPECIES_ORDER` would create phantom ports for absent species).

## Parameters

| Name                          | Unit / Type     | Default                | Meaning                                                                                                                                                                                                       |
|-------------------------------|------------------|------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `volume`                      | m³               | 100                    | Layer volume. Drives ideal-gas conversions and the mass / volume reseeding when changed.                                                                                                                       |
| `temperature_k` / `temperatureQ` | Temperature (K) | 293.15 K (20 °C)       | Layer-owned temperature. Source-of-truth since 2026-06-08; the Layer no longer reads from SceneStateView.                                                                                                       |
| `initial_atmosphere_preset`   | preset key       | `earthHumidAirSeaLevel`| Used only when no composition is wired. One of the entries in `ATMOSPHERE_PRESETS`.                                                                                                                            |
| `required_hz` / inherited     | Frequency (Hz)   | 100 (computed)         | From `IntegrableRuntimeNode`. The Layer's `computeRequiredHz()` returns the parameter-independent baseline of 100 Hz; user can pin a higher value. See [Sample rate](#sample-rate).                              |

Viewables (live diagnostics, read-only):

| Name                          | Notes                                                                                                          |
|-------------------------------|----------------------------------------------------------------------------------------------------------------|
| `total_mass`                  | Sum of `m_i` [kg].                                                                                              |
| `total_pressure`              | Ideal-gas total [Pa] at the Layer's current `T`.                                                                |
| `density`                     | `totalMass / volume` [kg/m³].                                                                                  |
| `bound_composition_components`| Component count of the bound composition (0 when none wired; the V1 fallback is in effect).                     |
| `bound_particulate_count`     | Particulate references carried by the bound composition. V1 records them as metadata only.                      |
| `required_hz_user_defined`    | True when the user has pinned a manual `required_hz`; false when it tracks `computeRequiredHz()`.                |

## Sample rate

100 Hz is the Layer's parameter-independent baseline: ECLSS / habitat-air mass-balance dynamics happen on the sub-second scale, and integrating faster doesn't add accuracy for a well-stirred volume. The user can pin a different value through `required_hz`; entering 0 / NaN / negative unpins to the computed value.

The enclosing `SimGraphNode` aggregates `requiredHz` over its IIntegrable leaves and surfaces the max (floored at `MIN_EFFECTIVE_HZ = 60 Hz`) as the inner session's `effectiveHz`.

## Wiring example

For a habitat with one scrubber and crew respiration:

```
[CrewRespiration]                    [ScrubberA]
   delta_CO2_produced ──┐             delta_CO2_consumed ──┐
                        ▼                                  ▼
                  [HabitatAtmosphereLayer]
                    delta_CO2_0 ◄── (auto-named index 0)
                    delta_CO2_1 ◄── (auto-named index 1)
                        │
                        │ outputs:
                        ├── mass_CO2, ppm_CO2, partial_pressure_CO2  → dashboards / alarms
                        ├── pressure, temperature, density           → diagnostics, gates
                        └── layer_out ── pointillé ──► HabitatAtmosphere.layer_in_0
```

The Layer is the IIntegrable carrier the solver advances. The `Atmosphere` container is a thin facade above it (see [atmosphere.md](atmosphere.md)).

## Pitfalls

- **No solver attached.** Without a `Control.Sim:rk4-solver` (or future Rosenbrock) wired to the Scene, the Layer's mass vector stays frozen at its initial preset values regardless of how many producers wire to `delta_<species>_<k>`. The integration phase is skipped entirely.
- **Composition vs preset confusion.** When `composition_in` is wired, the bound Composition's species + reference pressure win, regardless of `initial_atmosphere_preset`. The preset only seeds when nothing is wired.
- **Negative mass on aggressive removal.** A scrubber that pulls more CO2 than is available drives `m_CO2` negative within one solver step. `writeState` clamps negative or non-finite values to 0, but the solver's intermediate stages may still produce transient negatives. Use a saturation node upstream (`Logic.Math:saturation` style) to clamp `delta_CO2_consumed` to physically reasonable values.
- **Volume / temperature edits don't re-seed the mass vector.** Changing `volume` or `temperature_k` mid-session updates ideal-gas conversions but does NOT re-derive the mass from a preset. To re-initialise, stop and re-play the session.
- **Vacuum preset + non-zero deltas.** Starting from `vacuum` then immediately feeding deltas produces an ill-conditioned ideal-gas calculation in the first few ticks (very low `n`, partial pressures blow up if rounded). Prefer seeding from a non-vacuum preset and zeroing producers until the simulation is settled.
- **Gate-facing API.** A Layer implements the `IAtmosphereGateHandle` duck-type (`getMassKg / getMoleFraction / applyMassDelta / pressurePa / activeSpecies`). Wiring a Layer's `layer_out` directly into a Gate's `atmosphere_A_in` works the same as wiring an `Atmosphere` container; the container just adds layer aggregation on top.
