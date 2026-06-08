# Composition

`Chemistry.Composition:composition` (+ 5 presets: `:earth-humid-air`, `:earth-dry-air`, `:mars-atmosphere`, `:iss-cabin`, `:vacuum`)

Gas-mixture descriptor. Holds an ordered component list — each component = `{ speciesId, moleFraction, molarMass, gasItemId? }`. Consumed by `Physics.Scene:atmosphere-state` at session bind to size the state vector and seed the initial inventory via ideal gas.

A `GraphItem` (not a RuntimeNode). The variadic `gas_in_<k>` input (config-link "gas") lets the user OPTIONALLY wire `Chemistry.Gas:*` instances to refine a component's metadata (Cp, viscosity, k); presets bake species + mole fraction + molar mass inline so they work standalone with no GasNode on the canvas.

## Anchors (editor-only config-links)

| Direction | Anchor | Type | Notes |
|---|---|---|---|
| in (variadic) | `gas_in_<k>` | gas | Drag a `Chemistry.Gas:*.gas_out` here to refine the matching component's metadata. The session-builder finds the component by `speciesId`; if absent, a new component is appended with zero mole fraction. |
| out | `composition_out` | composition | Dashed config-link to `Physics.Scene:atmosphere-state.composition_in`. Resolved at session bind. |

`composition` is a config-link type (P5a, P9.1), so the wire renders dashed automatically. `arePortTypesCompatible` refuses `any ↔ composition` drops — the editor silently rejects connections that would be type-unsafe at the runtime layer.

## Parameters

| Field | @editable unit | Default | Meaning |
|---|---|---|---|
| `presetId` | string | `"custom"` | Human-readable identifier shown in the property panel. Set automatically by preset factories (`"earthHumidAirSeaLevel"`, `"vacuum"`, …); stays `"custom"` for user-built mixtures. |
| `displayName` | string | `"Composition"` | Header label for the property panel. |
| `referencePressurePa` | Pa | 101325 | Reference total pressure used by the downstream atmosphere to seed initial mass via `n = P V / RT`, then `m_i = x_i × n × M_i`. 0 for the vacuum preset. Accepts `Pressure` Quantity via `referencePressureQ`. |
| `components` | – | `[]` | Ordered list of `{speciesId, moleFraction, molarMass, gasItemId?}`. Manipulated via `setComponents`, `upsertComponent`, `removeComponent`, `bindGas`. |

Viewables:

| Name | Notes |
|---|---|
| `componentCount` | Number of species in the mixture. |
| `totalMoleFraction` | Sum of all `x_i`. Should be ≈ 1 for well-formed mixtures; non-1 surfaces preset drift to the user. |
| `averageMolarMass` | `Σ (x_i × M_i) / Σ x_i` in kg/mol. 0 for the empty (vacuum) mixture. |

## Presets

| typeId | P_ref (Pa) | Species (mole fraction) | Use |
|---|---|---|---|
| `:earth-humid-air` | 101325 | N2 0.7715, O2 0.2072, CO2 0.00042, H2O 0.0116, Ar 0.00928 | Earth surface, 20 °C, ~50% RH |
| `:earth-dry-air` | 101325 | N2 0.78084, O2 0.20946, CO2 0.00042, Ar 0.00928 | U.S. Standard Atmosphere dry air |
| `:mars-atmosphere` | 600 | CO2 0.9532, N2 0.027, Ar 0.0163, O2 0.0013, H2O 0.0003 | Mars Climate Database mean |
| `:iss-cabin` | 101325 | N2 0.781, O2 0.209, CO2 0.003, H2O 0.007 | ECLSS spec, CO2 capped at 3000 ppm |
| `:vacuum` | 0 | (none) | Orbital exterior, no inventory to track |

Molar masses align with the V1 `Chemistry.Gas:*` catalog (P9.1): the preset value for N2 (0.0280134 kg/mol) is identical to `Chemistry.Gas:n2.molarMass`, so a user who wires the gas in OR uses only the preset gets the same numbers.

## Usage pattern

```
[Earth humid air (Chemistry.Composition:earth-humid-air)]                
   composition_out  ───pointillé───►  [Atmosphere].composition_in        
                                          (atmosphere reads components,  
                                           sizes state vector,           
                                           seeds inventory at reset)     
```

Augmenting a preset with custom gases (e.g. add CH4 for greenhouse studies):

```
[Earth humid air composition]
                ▲ gas_in_5
                │ pointillé
                │
[Methane (Chemistry.Gas:ch4)]
   gas_out ────►
```

The session-builder calls `composition.bindGas(gas.id, gas)` — the CH4 component is appended (with a zero mole fraction by default); the user adjusts the fraction in the property panel.

## Pitfalls

- **Custom composition with no components.** A freshly-dropped `Chemistry.Composition:composition` has an empty list and a 101325 Pa reference pressure. The downstream atmosphere consumes this as "no species, atmospheric pressure 101325" — physically inconsistent. The atmosphere will publish zero on every `mass_<species>` slot until the user adds components.
- **Mole fractions don't sum to 1.** The runtime does NOT renormalize. If the user edits a single component and lets the sum drift to e.g. 0.95 or 1.10, the atmosphere derives proportionally fewer or more total moles. The viewable `totalMoleFraction` lets you spot this; clamp at the property-panel level if the user is allowed to edit fractions live.
- **Mismatched molar masses.** A preset can be edited to set a wrong `molarMass` for a species. Cross-check against the `Chemistry.Gas:<species>` catalog if you're authoring custom data — atmosphere ideal-gas formulas assume the molar mass is correct.
- **Vacuum preset + atmosphere.** Dropping a `:vacuum` composition and wiring it to an atmosphere gives a zero-mass / zero-pressure inventory. If the user then sends `delta_<species>_<k>` producers, the atmosphere accumulates from zero. For non-trivial chemistry where you want a "start from earth then add CO2", use an Earth preset rather than vacuum + producers.
- **Wired Gas overrides molarMass; preset fractions stay.** When the user wires `Chemistry.Gas:n2` on top of the Earth humid air preset, the N2 component's `molarMass` and `gasItemId` are refreshed but the existing mole fraction (0.7715) is preserved. Removing the wire does not reset the metadata — the molarMass stays at whatever was last bound. Re-drop the preset to restart from clean values.
