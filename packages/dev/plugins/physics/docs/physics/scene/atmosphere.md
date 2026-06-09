# Atmosphere (container)

`Physics.Scene:atmosphere`

Thin composite facade that holds 1..N `AtmosphereLayer` instances and aggregates them into a single "atmosphere" the rest of the graph can wire to. Drag it in instead of (or alongside) raw Layers when modelling a multi-layer environment (cabin + duct, troposphere + stratosphere, vehicle + cargo bay), or simply use it as the single point of contact between a Scene and the rest of the graph.

> **Where this came from.** Pre-2026-06-08, the atmosphere was a single `Physics.Scene:atmosphere-state` node that combined the IIntegrable mass-carrier role and the editor-facing reference into one class. The split was driven by HVAC + leak-with-different-pressure scenarios where one Atmosphere needs to be modelled as 2-3 stratified layers but consumers (Gate, Scene) only want to wire to ONE atmosphere.

## Two-layer model

```
+------------------------------ AtmosphereNode (container) -----------------------------+
|                                                                                       |
|     volume    = Σ layer.volume                                                        |
|     pressure  = Σ (layer.pressure * layer.volume) / volume        (volume-weighted)   |
|     temperature = Σ (layer.temperature * layer.volume) / volume   (volume-weighted)   |
|     density   = Σ layer.mass / volume                                                 |
|                                                                                       |
|     activeSpecies = ordered union of layer.activeSpecies                              |
|     mass(sp)      = Σ layer.getMassKg(sp)                                             |
|     moleFrac(sp)  = Σ (layer.getMoleFraction(sp) * layer.volume) / volume             |
|     applyMassDelta(sp, dm) = split proportionally by layer volume                     |
|                                                                                       |
|     [Layer 0]   [Layer 1]   [Layer 2]   ...   (variadic layer_in_<k>)                 |
+---------------------------------------------------------------------------------------+
```

The container is NOT itself IIntegrable; each bound Layer is the IIntegrable carrier. The solver picks them up individually. The container exposes the aggregates through `IAtmosphereGateHandle` so an `AtmosphereGateNode` sees one composite atmosphere with the right pressure / mole fractions.

When no Layer is wired, the container materialises a hidden default Layer with V1 fallback config (preset `earthHumidAirSeaLevel`, 100 m³, 20 °C, 1 atm). This is what makes "drop an Atmosphere onto the canvas and play immediately" work for the simple case.

## Ports

| Direction | Slot              | Type        | Kind        | Notes                                                                                                                                                                                            |
|-----------|-------------------|-------------|-------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| in        | `layer_in_<k>`    | layer       | config-link | Variadic dashed cable from one or more `AtmosphereLayer.layer_out`. The hidden default Layer is suppressed as soon as one is wired.                                                              |
| out       | `pressure`        | float       | signal      | Volume-weighted total pressure [Pa].                                                                                                                                                              |
| out       | `temperature`     | float       | signal      | Volume-weighted temperature [K].                                                                                                                                                                  |
| out       | `density`         | float       | signal      | `Σ mass / Σ volume` [kg/m³].                                                                                                                                                                      |
| out       | `atmosphere_out`  | atmosphere  | config-link | Anchor consumed by `SceneItem.atmosphere_in` and by `AtmosphereGateNode.atmosphere_{A,B}_in`. Dashed cable.                                                                                       |

## Parameters

The container itself has no editable physics knobs — all the per-layer physics lives on the Layers. The container only carries:

| Name             | Unit       | Default | Meaning                                                                                                                                                                                            |
|------------------|------------|---------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| (inherited) `enabled` | bool  | true    | Standard control-plane gate. When false, the container's `fire()` no-ops and aggregates report the last computed values.                                                                            |
| `required_hz` / `required_hz_user_defined` | Frequency (Hz) | (forwarded) | The container forwards the max `requiredHz` of its bound Layers as its own `requiredHz`. The user-pin lives on each individual Layer; the container is a passive aggregator.                       |

Editing temperature, pressure, composition, etc. is done on the bound Layers (drill into them through their nodes on the canvas).

Viewables:

| Name                 | Notes                                                                            |
|----------------------|----------------------------------------------------------------------------------|
| `total_mass`         | Sum of all layer masses [kg].                                                    |
| `total_pressure`     | Volume-weighted pressure [Pa].                                                   |
| `density`            | `total_mass / Σ volume` [kg/m³].                                                  |
| `layer_count`        | Number of currently-bound Layers (1 when only the hidden default is in use).      |
| `active_species`     | Newline-joined species union for the bound Layers.                                |

## Wiring example — multi-layer cabin

```
[CabinFloor (Layer)]                       [CabinCeiling (Layer)]
   layer_out ──pointillé─┐                   ┌──pointillé── layer_out
                         ▼                   ▼
                   [CabinAtmosphere (Atmosphere)]
                     layer_in_0   layer_in_1
                         │
                         │  atmosphere_out  ──pointillé──► Scene.atmosphere_in
                         │  atmosphere_out  ──pointillé──► Gate.atmosphere_A_in
                         │
                         └── pressure / temperature / density → dashboards
```

## Pitfalls

- **Mismatched species sets.** When two Layers have different active species (e.g. one is the cabin air with VOCs, the other is dry inert atmosphere), the container's `activeSpecies` is the union. The Gate side that pulls argon from a layer with no argon contributes zero; this is correct but can surprise.
- **Volume-weighted aggregates ≠ thermodynamic mixing.** The pressure aggregate is a weighted average, not a partial-pressure-summed equivalent (which would require treating the container as a single homogeneous gas). For V1 we keep the simple aggregate; users who need true mixing should collapse into a single Layer with the merged composition.
- **applyMassDelta proportional split.** When a Gate writes mass to the container, the delta is split across Layers in proportion to their volume. This is approximate; layered atmospheres with distinct compositions will see species transfer that doesn't account for buoyancy or diffusion. V1 limit, deferred to V3 thermal-coupling work.
- **Hidden default Layer.** Dropping an Atmosphere with no `layer_in_<k>` wired creates a hidden Layer with V1 defaults. The hidden Layer's editables are not surfaced (because there is no node to inspect on the canvas). To customise the atmosphere, wire an explicit `AtmosphereLayer` even if there is only one.
