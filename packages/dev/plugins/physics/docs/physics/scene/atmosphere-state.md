# Atmosphere

`Physics.Scene:atmosphere-state`

Mass-inventory carrier for the species inside a Scene's volume. Acts as the *sink* of the producer/consumer atmospheric coupling pattern: every piece of equipment that consumes or produces a chemical species publishes its `delta_<species>` mass-flow contribution on the atmosphere's variadic input ports, and the solver integrates them into the species inventory.

The atmosphere is `IIntegrable`. Its state vector is the per-species mass (kg) in the canonical V1 species order `[N2, O2, CO2, H2O, Ar]`. Drop a `Control.Sim:rk4-solver` (or wire the scene's `solver_in_<k>`) for the solver to pick it up.

## Equations

For each species `i ∈ {N2, O2, CO2, H2O, Ar}`:

```
dm_i/dt = sum over k of delta_<species_i>_<k>      [kg/s]
```

The right-hand side is *purely additive* — the atmosphere itself adds no chemistry term. All flux comes from producers wired to the variadic inputs. The solver guarantees the inputs snapshot is populated from the upstream publish phase before `rhs()` runs (Session two-phase orchestration, F3).

Aggregate outputs use the ideal gas law `P V = n R T`:

```
n      = sum (m_i / M_i)
P_total = n R T / V
ρ      = totalMass / V
P_i    = (m_i / M_i) / n × P_total       (partial pressure)
x_i    = (m_i / M_i) / n                  (mole fraction)
ppm_i  = x_i × 10⁶
```

Temperature `T` is read from `session.sceneStateView.temperature` — V1 treats T as imposed by the Scene; thermal coupling (Q-S7) is deferred to V3.

## Ports

| Direction | Slot | Type | Kind | Notes |
|---|---|---|---|---|
| in (variadic) | `delta_<species>_<k>` | float | signal | Mass-flow contribution to species *species* from producer *k*. Wired from `AtmosphereGateNode.<A or B>_delta_<species>` and from any equipment node that affects this species. Reconciler auto-grows the index as the user wires more producers. |
| out | `mass_<species>` | float | signal | Current mass of *species* in the volume [kg]. |
| out | `mole_fraction_<species>` | float | signal | Current mole fraction of *species* (dimensionless, 0-1). |
| out | `partial_pressure_<species>` | float | signal | Partial pressure of *species* [Pa]. |
| out | `ppm_<species>` | float | signal | Concentration in parts-per-million (= mole fraction × 10⁶). |
| out | `pressure` | float | signal | Total pressure [Pa], from ideal gas. |
| out | `temperature` | float | signal | Current temperature [K], echoed from the scene state view. |
| out | `density` | float | signal | Total mass density [kg/m³]. |
| out | `atmosphere_out` | atmosphere | config-link | Dashed config-link to the SceneItem's `atmosphere_in` anchor. Resolved at session bind. |

## Parameters

| Name | Unit | Default | Meaning |
|---|---|---|---|
| `volume` | m³ | 100 | Tank volume. Drives ideal-gas conversions. |
| `initialAtmosphere` | preset key | `earthHumidAirSeaLevel` | One of `earthHumidAirSeaLevel`, `earthDryAirSeaLevel`, `marsAtmosphereMean`, `issCabinECLSS`, `vacuum`. Seeds the mass vector at reset by inverting the ideal gas law from the preset's mole fractions, at 1 atm and the scene's temperature (0 Pa for `vacuum`). |
| `activeSpecies` | – | `[N2, O2, CO2, H2O, Ar]` | Frozen at V1. Editing the schema mid-session would re-shape `stateSize` and is explicitly deferred to a later iteration (Q-S11). |

Viewables (live diagnostics, read-only):

| Name | Notes |
|---|---|
| `totalMass` | Sum of `m_i` [kg]. |
| `totalPressure` | Ideal-gas total [Pa] at the scene's current T. |
| `density` | totalMass / volume [kg/m³]. |

## Wiring example

For a habitat with one scrubber and crew respiration:

```
[CrewRespiration]                  [ScrubberA]
  delta_CO2_produced ──┐           delta_CO2_consumed ──┐
                       ▼                                ▼
                 [HabitatAtmoState]
                   delta_CO2_0 ◄── (auto-named 0)
                   delta_CO2_1 ◄── (auto-named 1)
                       │
                       │ outputs:
                       ├── mass_CO2, ppm_CO2, partial_pressure_CO2  → dashboards / alarms
                       ├── pressure, density                         → diagnostics
                       └── atmosphere_out ─── pointillé ──► HabitatScene.atmosphere_in
```

The solver attached via the Scene's `solver_in_<k>` integrates every IIntegrable leaf — including the atmosphere — so the species inventory advances each tick.

## Pitfalls

- **No solver attached.** Without a `Control.Sim:rk4-solver` (or future Rosenbrock) wired to the Scene, the atmosphere's mass vector stays frozen at its initial preset values regardless of how many `delta_<species>_<k>` producers are wired. The integration phase is skipped entirely.
- **Wrong scene wiring.** The atmosphere reads `temperature` from `session.sceneStateView`. If the SceneStateView is null (no Scene bound to the inner session), the atmosphere falls back to 293.15 K silently. Always wire a Scene to the enclosing Sim.Graph.
- **Negative mass on aggressive removal.** A scrubber that pulls more CO2 than is available drives `m_CO2` negative within one solver step. `writeState` clamps negative or non-finite values to 0, but the solver's intermediate stages may still produce transient negatives. Use a saturation node upstream (`Logic.Math:saturation` style) to clamp `delta_CO2_consumed` to physically reasonable values.
- **Preset / volume / pressure mismatch.** Changing `volume` mid-session does NOT re-seed the mass vector — only the initial mass at `reset()` is preset-derived. To re-initialise after a volume edit, stop and re-play.
- **Vacuum preset + non-zero deltas.** Starting from `vacuum` then immediately feeding `delta_<species>_<k>` produces an ill-conditioned ideal-gas calculation in the first few ticks (very low n, partial pressures blow up if rounded). Prefer seeding from a non-vacuum preset and zeroing producers until needed.
